import { nanoid } from "nanoid";
import {
  type AutomationScenario,
  type BrowserConfig,
  BrowserEngine,
  type ExecutionResult,
} from "./browser-engine.js";
import {
  type HeartbeatData,
  type Job,
  MasterNodeClient,
  type WorkerConfig,
} from "./master-client.js";

export interface WorkerStats {
  jobsCompleted: number;
  jobsFailed: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  uptime: number;
  startTime: Date;
}

export interface ActiveJob {
  jobId: string;
  url: string;
  startTime: Date;
  browser: BrowserEngine;
}

export class AutomationWorker {
  private config: WorkerConfig;
  private masterClient: MasterNodeClient;
  private isRunning = false;
  private stats: WorkerStats;
  private activeJobs = new Map<string, ActiveJob>();
  private jobQueue: Job[] = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(config: WorkerConfig, masterUrl: string) {
    this.config = config;
    this.masterClient = new MasterNodeClient(masterUrl);
    this.stats = {
      jobsCompleted: 0,
      jobsFailed: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      uptime: 0,
      startTime: new Date(),
    };

    // Set up event handlers
    this.masterClient.onJobAssigned = (job: Job) => {
      this.handleJobAssignment(job);
    };

    this.masterClient.onJobCancelled = (data: { jobId: string }) => {
      this.handleJobCancellation(data.jobId);
    };

    // Handle graceful shutdown
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());
  }

  async start(): Promise<void> {
    try {
      console.log("[WORKER] Starting automation worker...");
      console.log(`[WORKER] Worker: ${this.config.name} (${this.config.type})`);
      console.log(`[WORKER] Master: ${this.masterClient.masterUrl}`);

      // Register with master node
      let registrationResult;

      if (this.config.apiKey) {
        // Use existing API key
        this.masterClient.workerId = process.env.WORKER_ID || nanoid();
        this.masterClient.apiKey = this.config.apiKey;
        console.log("[WORKER] Using existing API key");
      } else {
        // Register new worker
        registrationResult = await this.masterClient.registerWorker(
          this.config,
        );
        console.log(
          `[WORKER] Registered with ID: ${registrationResult.workerId}`,
        );
      }

      // Start services
      await this.masterClient.startHeartbeat(
        Number.parseInt(process.env.HEARTBEAT_INTERVAL || "30000"),
      );

      // For now, skip WebSocket connection until we implement it on master side
      // await this.masterClient.connectWebSocket();

      this.isRunning = true;

      // Start job polling
      this.startJobPolling();

      // Start metrics collection
      this.startMetricsCollection();

      console.log("[WORKER] ✅ Worker started successfully and ready for jobs");
    } catch (error) {
      console.error("[WORKER] ❌ Failed to start worker:", error);
      throw error;
    }
  }

  private startJobPolling(): void {
    const pollIntervalMs = 5000; // Poll every 5 seconds

    this.pollInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        // Check if we can accept more jobs
        if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
          return;
        }

        // Get next job from master
        const job = await this.masterClient.getNextJob();

        if (job) {
          console.log(`[WORKER] Received job: ${job._id} - ${job.name}`);
          this.executeJob(job).catch((error) => {
            console.error(`[WORKER] Job execution error: ${error}`);
          });
        }
      } catch (error) {
        console.error("[WORKER] Error polling for jobs:", error);
      }
    }, pollIntervalMs);

    console.log(`[WORKER] Job polling started (${pollIntervalMs}ms interval)`);
  }

  private startMetricsCollection(): void {
    const metricsIntervalMs = 60000; // Every minute

    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        await this.masterClient.updateMetrics(metrics);
      } catch (error) {
        console.error("[WORKER] Error collecting metrics:", error);
      }
    }, metricsIntervalMs);

    console.log(
      `[WORKER] Metrics collection started (${metricsIntervalMs}ms interval)`,
    );
  }

  private async executeJob(job: Job): Promise<void> {
    const jobId = job._id;
    const startTime = Date.now();

    try {
      // Update status to busy if this is our first job
      if (this.activeJobs.size === 0) {
        await this.masterClient.updateWorkerStatus("busy");
      }

      // Report job start
      await this.masterClient.reportJobStart(jobId);

      // Create browser instance
      const browserConfig: BrowserConfig = {
        headless: process.env.HEADLESS === "true",
        executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined,
        ...job.config.browserConfig,
      };

      // Add proxy configuration if available
      if (process.env.PROXY_HOST && process.env.PROXY_PORT) {
        browserConfig.proxy = {
          host: process.env.PROXY_HOST,
          port: Number.parseInt(process.env.PROXY_PORT),
          username: process.env.PROXY_USERNAME || undefined,
          password: process.env.PROXY_PASSWORD || undefined,
          protocol: (process.env.PROXY_PROTOCOL as any) || "http",
        };
      }

      const browser = new BrowserEngine(browserConfig);

      // Track active job
      this.activeJobs.set(jobId, {
        jobId,
        url: job.url,
        startTime: new Date(),
        browser,
      });

      console.log(`[WORKER] 🚀 Starting job execution: ${job.name}`);

      // Initialize browser
      await browser.initialize();

      // Navigate to target URL
      await browser.navigateToUrl(job.url);

      // Execute automation scenario if provided
      let result: ExecutionResult;

      if (job.config.scenario) {
        console.log(
          `[WORKER] Executing automation scenario: ${job.config.scenario.description}`,
        );
        result = await browser.executeScenario(
          job.config.scenario as AutomationScenario,
        );
      } else {
        // If no scenario, just take a screenshot and basic page info
        console.log(
          "[WORKER] No scenario provided, performing basic page capture",
        );

        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

        const screenshot = await browser.takeScreenshot();
        const pageInfo = await browser.getPageInfo();

        result = {
          success: true,
          screenshot,
          logs: [`Navigated to ${job.url}`, `Page title: ${pageInfo.title}`],
          errors: [],
          metrics: {
            elementsFound: pageInfo.elementCount || 0,
            actionsPerformed: 1,
            errorsEncountered: 0,
            pageLoadTime: 2000,
            executionTime: Date.now() - startTime,
          },
        };
      }

      // Close browser
      await browser.close();

      // Update statistics
      const executionTime = Date.now() - startTime;
      this.updateStats(true, executionTime);

      // Report completion to master
      await this.masterClient.reportJobCompletion(jobId, result);

      console.log(
        `[WORKER] ✅ Job completed successfully: ${job.name} (${executionTime}ms)`,
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateStats(false, executionTime);

      console.error(`[WORKER] ❌ Job failed: ${job.name} - ${error}`);

      // Try to close browser if it exists
      const activeJob = this.activeJobs.get(jobId);
      if (activeJob?.browser) {
        try {
          await activeJob.browser.close();
        } catch (closeError) {
          console.error(
            "[WORKER] Error closing browser after job failure:",
            closeError,
          );
        }
      }

      // Report error to master
      await this.masterClient.reportJobError(jobId, String(error));
    } finally {
      // Remove from active jobs
      this.activeJobs.delete(jobId);

      // Update status to online if no more active jobs
      if (this.activeJobs.size === 0) {
        await this.masterClient.updateWorkerStatus("online");
      }
    }
  }

  private updateStats(success: boolean, executionTime: number): void {
    if (success) {
      this.stats.jobsCompleted++;
    } else {
      this.stats.jobsFailed++;
    }

    this.stats.totalExecutionTime += executionTime;
    const totalJobs = this.stats.jobsCompleted + this.stats.jobsFailed;
    this.stats.averageExecutionTime =
      totalJobs > 0 ? this.stats.totalExecutionTime / totalJobs : 0;
    this.stats.uptime = Date.now() - this.stats.startTime.getTime();
  }

  private async collectMetrics(): Promise<any> {
    const process = await import("node:process");
    const memUsage = process.memoryUsage();

    return {
      jobsCompleted: this.stats.jobsCompleted,
      jobsFailed: this.stats.jobsFailed,
      averageResponseTime: this.stats.averageExecutionTime,
      memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      cpuUsage: 0, // Would need actual CPU monitoring
      uptime: Math.round(this.stats.uptime / 1000), // seconds
      activeJobs: this.activeJobs.size,
      queuedJobs: this.jobQueue.length,
    };
  }

  private handleJobAssignment(job: Job): void {
    console.log(`[WORKER] Received job assignment via WebSocket: ${job._id}`);
    this.jobQueue.push(job);
  }

  private async handleJobCancellation(jobId: string): Promise<void> {
    console.log(`[WORKER] Received job cancellation: ${jobId}`);

    // Remove from queue if present
    this.jobQueue = this.jobQueue.filter((job) => job._id !== jobId);

    // Cancel active job if running
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      try {
        await activeJob.browser.close();
        this.activeJobs.delete(jobId);
        console.log(`[WORKER] Cancelled active job: ${jobId}`);
      } catch (error) {
        console.error(`[WORKER] Error cancelling job ${jobId}:`, error);
      }
    }
  }

  async getStatus(): Promise<any> {
    return {
      isRunning: this.isRunning,
      config: this.config,
      stats: this.stats,
      activeJobs: Array.from(this.activeJobs.keys()),
      queuedJobs: this.jobQueue.length,
      isConnected: this.masterClient.isConnected(),
      uptime: this.stats.uptime,
    };
  }

  async getDetailedStatus(): Promise<any> {
    const status = await this.getStatus();
    const metrics = await this.collectMetrics();

    return {
      ...status,
      metrics,
      activeJobDetails: Array.from(this.activeJobs.values()).map((job) => ({
        jobId: job.jobId,
        url: job.url,
        startTime: job.startTime,
        duration: Date.now() - job.startTime.getTime(),
      })),
    };
  }

  async shutdown(): Promise<void> {
    console.log("[WORKER] 🛑 Shutting down worker...");
    this.isRunning = false;

    // Stop polling and metrics
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Cancel all active jobs
    console.log(`[WORKER] Cancelling ${this.activeJobs.size} active jobs...`);
    for (const [jobId, activeJob] of this.activeJobs) {
      try {
        await activeJob.browser.close();
        await this.masterClient.reportJobError(jobId, "Worker shutdown");
      } catch (error) {
        console.error(
          `[WORKER] Error cancelling job ${jobId} during shutdown:`,
          error,
        );
      }
    }

    // Disconnect from master
    await this.masterClient.disconnect();

    console.log("[WORKER] ✅ Worker shutdown complete");
    process.exit(0);
  }

  // Method to manually process a job (for testing)
  async processJob(job: Job): Promise<ExecutionResult> {
    console.log(`[WORKER] 🧪 Manual job processing: ${job.name}`);

    const browserConfig: BrowserConfig = {
      headless: process.env.HEADLESS === "true",
      ...job.config.browserConfig,
    };

    const browser = new BrowserEngine(browserConfig);

    try {
      await browser.initialize();
      await browser.navigateToUrl(job.url);

      let result: ExecutionResult;

      if (job.config.scenario) {
        result = await browser.executeScenario(
          job.config.scenario as AutomationScenario,
        );
      } else {
        const screenshot = await browser.takeScreenshot();
        const pageInfo = await browser.getPageInfo();

        result = {
          success: true,
          screenshot,
          logs: [`Navigated to ${job.url}`],
          errors: [],
          metrics: {
            elementsFound: pageInfo.elementCount || 0,
            actionsPerformed: 1,
            errorsEncountered: 0,
            pageLoadTime: 1000,
            executionTime: 5000,
          },
        };
      }

      return result;
    } finally {
      await browser.close();
    }
  }
}
