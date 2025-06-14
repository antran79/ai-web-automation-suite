import axios, { type AxiosInstance } from "axios";
import WebSocket from "ws";

export interface WorkerConfig {
  name: string;
  type: "standalone" | "vps" | "cloud";
  ip: string;
  port?: number;
  maxConcurrentJobs: number;
  memory: number;
  cpu: number;
  storage: number;
  apiKey?: string;
}

export interface Job {
  _id: string;
  name: string;
  url: string;
  type: string;
  priority: number;
  config: {
    scenario?: {
      steps: any[];
      totalDuration: number;
      description: string;
    };
    browserConfig?: any;
  };
  status: string;
}

export interface HeartbeatData {
  status: "online" | "busy" | "offline";
  currentJobs: number;
  metrics: {
    memoryUsage: number;
    cpuUsage: number;
    jobsCompleted: number;
    jobsFailed: number;
    averageResponseTime: number;
  };
}

export class MasterNodeClient {
  private httpClient: AxiosInstance;
  private wsClient: WebSocket | null = null;
  private workerId: string | null = null;
  private apiKey: string | null = null;
  private masterUrl: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(masterUrl: string) {
    this.masterUrl = masterUrl;
    this.httpClient = axios.create({
      baseURL: masterUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "AutomationWorker/1.0.0",
      },
    });

    // Add request interceptor to include API key
    this.httpClient.interceptors.request.use((config) => {
      if (this.apiKey) {
        config.headers.Authorization = `Bearer ${this.apiKey}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error("[MASTER CLIENT] HTTP Error:", error.message);
        if (error.response?.status === 401) {
          console.error(
            "[MASTER CLIENT] Authentication failed - invalid API key",
          );
        }
        return Promise.reject(error);
      },
    );
  }

  async registerWorker(
    config: WorkerConfig,
  ): Promise<{ workerId: string; apiKey: string }> {
    try {
      console.log("[MASTER CLIENT] Registering worker with master node...");

      const response = await this.httpClient.post("/api/workers", {
        name: config.name,
        type: config.type,
        ip: config.ip,
        port: config.port || 3001,
        maxConcurrentJobs: config.maxConcurrentJobs,
        memory: config.memory,
        cpu: config.cpu,
        storage: config.storage,
        registeredBy: "worker-auto-registration",
      });

      if (response.data.success) {
        this.workerId = response.data.data.identifier;
        this.apiKey = response.data.data.security.apiKey;

        console.log(
          `[MASTER CLIENT] Worker registered successfully: ${this.workerId}`,
        );
        return {
          workerId: this.workerId,
          apiKey: this.apiKey,
        };
      }
      throw new Error(response.data.error || "Registration failed");
    } catch (error) {
      console.error("[MASTER CLIENT] Worker registration failed:", error);
      throw error;
    }
  }

  async connectWebSocket(): Promise<void> {
    if (!this.workerId || !this.apiKey) {
      throw new Error("Worker not registered - cannot connect WebSocket");
    }

    const wsUrl = `${this.masterUrl.replace("http", "ws")}/ws/worker/${this.workerId}`;

    try {
      this.wsClient = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      this.wsClient.on("open", () => {
        console.log("[MASTER CLIENT] WebSocket connected");
        this.reconnectAttempts = 0;
      });

      this.wsClient.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error(
            "[MASTER CLIENT] Error parsing WebSocket message:",
            error,
          );
        }
      });

      this.wsClient.on("close", () => {
        console.log("[MASTER CLIENT] WebSocket disconnected");
        this.scheduleReconnect();
      });

      this.wsClient.on("error", (error) => {
        console.error("[MASTER CLIENT] WebSocket error:", error);
      });
    } catch (error) {
      console.error("[MASTER CLIENT] WebSocket connection failed:", error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);

      console.log(
        `[MASTER CLIENT] Reconnecting WebSocket in ${delay}ms (attempt ${this.reconnectAttempts})`,
      );

      setTimeout(() => {
        this.connectWebSocket().catch(console.error);
      }, delay);
    } else {
      console.error("[MASTER CLIENT] Max reconnection attempts reached");
    }
  }

  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case "job_assignment":
        console.log(
          "[MASTER CLIENT] Received job assignment:",
          message.data.jobId,
        );
        this.onJobAssigned?.(message.data);
        break;

      case "job_cancellation":
        console.log(
          "[MASTER CLIENT] Received job cancellation:",
          message.data.jobId,
        );
        this.onJobCancelled?.(message.data);
        break;

      case "system_message":
        console.log("[MASTER CLIENT] System message:", message.data.message);
        break;

      case "health_check":
        this.sendHealthCheck();
        break;

      default:
        console.log("[MASTER CLIENT] Unknown message type:", message.type);
    }
  }

  async startHeartbeat(intervalMs = 30000): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.sendHeartbeat();
      } catch (error) {
        console.error("[MASTER CLIENT] Heartbeat failed:", error);
      }
    }, intervalMs);

    console.log(`[MASTER CLIENT] Heartbeat started (${intervalMs}ms interval)`);
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.workerId) return;

    try {
      // Get current system metrics
      const process = await import("node:process");
      const memUsage = process.memoryUsage();

      const heartbeatData: HeartbeatData = {
        status: "online", // This would be determined by actual worker state
        currentJobs: 0, // This would be tracked by the worker
        metrics: {
          memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024),
          cpuUsage: 0, // Would need actual CPU monitoring
          jobsCompleted: 0, // Would be tracked by worker
          jobsFailed: 0, // Would be tracked by worker
          averageResponseTime: 0, // Would be calculated from job execution times
        },
      };

      const response = await this.httpClient.post(
        `/api/workers/${this.workerId}/heartbeat`,
        heartbeatData,
      );

      if (response.data.success) {
        console.log(`[MASTER CLIENT] ❤️ Heartbeat sent - Status: ${heartbeatData.status}, Jobs: ${heartbeatData.currentJobs}`);

        // Log global stats from master response
        if (response.data.stats) {
          const stats = response.data.stats;
          console.log(`[MASTER CLIENT] 📊 Global: ${stats.onlineWorkers}/${stats.globalWorkerCount} workers online, ${stats.totalActiveJobs} total jobs`);
        }

        // Log calculated worker stats
        if (response.data.calculated) {
          const calc = response.data.calculated;
          console.log(`[MASTER CLIENT] 🎯 Worker Health: ${calc.healthScore}%, Efficiency: ${calc.efficiency}%`);
        }
      }
    } catch (error) {
      // Don't log heartbeat errors too frequently
      if (Math.random() < 0.1) {
        console.error("[MASTER CLIENT] Heartbeat error:", error);
      }
    }
  }

  private async sendHealthCheck(): Promise<void> {
    if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) return;

    try {
      const healthData = {
        timestamp: new Date().toISOString(),
        status: "healthy",
        checks: {
          browserConnection: true, // Would check actual browser status
          memoryUsage: true,
          diskSpace: true,
          networkConnectivity: true,
        },
      };

      this.wsClient.send(
        JSON.stringify({
          type: "health_check_response",
          data: healthData,
        }),
      );
    } catch (error) {
      console.error("[MASTER CLIENT] Health check failed:", error);
    }
  }

  async getNextJob(): Promise<Job | null> {
    if (!this.workerId) {
      throw new Error("Worker not registered");
    }

    try {
      const response = await this.httpClient.get(
        `/api/jobs/next?workerId=${this.workerId}`,
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.error("[MASTER CLIENT] Error fetching next job:", error);
      return null;
    }
  }

  async reportJobStart(jobId: string): Promise<void> {
    try {
      await this.httpClient.put(`/api/jobs/${jobId}`, {
        status: "running",
        assignedWorker: this.workerId,
        workerInfo: {
          id: this.workerId,
          startedAt: new Date().toISOString(),
        },
      });

      console.log(`[MASTER CLIENT] Reported job start: ${jobId}`);
    } catch (error) {
      console.error("[MASTER CLIENT] Error reporting job start:", error);
    }
  }

  async reportJobCompletion(jobId: string, result: any): Promise<void> {
    try {
      await this.httpClient.put(`/api/jobs/${jobId}`, {
        status: result.success ? "completed" : "failed",
        execution: {
          endTime: new Date().toISOString(),
          results: {
            screenshot: result.screenshot,
            metrics: result.metrics,
            logs: result.logs,
            errors: result.errors,
          },
        },
      });

      console.log(
        `[MASTER CLIENT] Reported job completion: ${jobId} (${result.success ? "success" : "failed"})`,
      );
    } catch (error) {
      console.error("[MASTER CLIENT] Error reporting job completion:", error);
    }
  }

  async reportJobError(jobId: string, error: string): Promise<void> {
    try {
      await this.httpClient.put(`/api/jobs/${jobId}`, {
        status: "failed",
        execution: {
          endTime: new Date().toISOString(),
          logs: [`Job failed with error: ${error}`],
        },
      });

      console.log(`[MASTER CLIENT] Reported job error: ${jobId}`);
    } catch (error) {
      console.error("[MASTER CLIENT] Error reporting job error:", error);
    }
  }

  async updateWorkerStatus(
    status: "online" | "busy" | "offline" | "maintenance",
  ): Promise<void> {
    if (!this.workerId) return;

    try {
      await this.httpClient.put(`/api/workers/${this.workerId}`, {
        status,
        connection: {
          lastSeen: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("[MASTER CLIENT] Error updating worker status:", error);
    }
  }

  // Event handlers (to be set by the worker)
  onJobAssigned?: (job: Job) => void;
  onJobCancelled?: (data: { jobId: string }) => void;

  async disconnect(): Promise<void> {
    console.log("[MASTER CLIENT] Disconnecting from master node...");

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Update worker status to offline
    await this.updateWorkerStatus("offline");

    // Close WebSocket
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }

    console.log("[MASTER CLIENT] Disconnected from master node");
  }

  // Helper method to check if connected
  isConnected(): boolean {
    return !!(
      this.workerId &&
      this.apiKey &&
      this.wsClient &&
      this.wsClient.readyState === WebSocket.OPEN
    );
  }

  // Get worker configuration from master
  async getWorkerConfig(): Promise<any> {
    if (!this.workerId) {
      throw new Error("Worker not registered");
    }

    try {
      const response = await this.httpClient.get(
        `/api/workers/${this.workerId}`,
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.error || "Failed to get worker config");
    } catch (error) {
      console.error("[MASTER CLIENT] Error getting worker config:", error);
      throw error;
    }
  }

  // Update worker metrics
  async updateMetrics(metrics: any): Promise<void> {
    if (!this.workerId) return;

    try {
      await this.httpClient.put(`/api/workers/${this.workerId}/metrics`, {
        metrics: {
          timestamp: new Date().toISOString(),
          data: metrics,
        },
      });
    } catch (error) {
      console.error("[MASTER CLIENT] Error updating metrics:", error);
    }
  }
}
