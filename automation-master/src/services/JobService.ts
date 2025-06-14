import { nanoid } from 'nanoid';
import Job, { type IJob } from '@/models/Job';
import Worker, { type IWorker } from '@/models/Worker';
import ProxyModel, { type IProxy } from '@/models/Proxy';
// import { jobQueue, pubsub } from '@/lib/redis';
import { connectDB } from '@/lib/database';

// Mock implementations for development
const jobQueue = {
  add: async () => ({ id: 'mock-job-id' }),
  process: () => {},
};

const pubsub = {
  publish: async () => 1,
};
import { AIScenarioService, type PageContext, type AIScenario } from './AIScenarioService';
import { FingerprintService, type FingerprintProfile } from './FingerprintService';

export interface CreateJobData {
  name: string;
  description?: string;
  url: string;
  type?: 'single' | 'batch' | 'scheduled';
  priority?: number;
  config?: JobConfig;
  schedule?: JobSchedule;
  createdBy: string;
  tags?: string[];
  intent?: string; // User intent for AI scenario generation
  fingerprintRegion?: string; // Region for fingerprint generation
  useAI?: boolean; // Whether to use AI for scenario generation
}

export interface JobConfig {
  timeout?: number;
  retries?: number;
  proxyGroupId?: string;
  fingerprintProfileId?: string;
  useAIScenarios?: boolean;
  scenarioComplexity?: 'simple' | 'medium' | 'complex';
  humanLikeness?: number; // 1-10 scale
  customHeaders?: Record<string, string>;
  waitBetweenActions?: {min: number; max: number};
}

export interface JobSchedule {
  type: 'once' | 'recurring';
  startDate?: Date;
  endDate?: Date;
  interval?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  customInterval?: {
    value: number;
    unit: 'minutes' | 'hours' | 'days' | 'weeks';
  };
  timezone?: string;
  cronExpression?: string;
  maxExecutions?: number;
  isActive?: boolean;
}

export interface BatchJobCreationData {
  baseJob: CreateJobData;
  quantity: number;
  urlPattern?: {
    type: 'sequential' | 'list' | 'pattern';
    urls?: string[];
    baseUrl?: string;
    startNumber?: number;
    endNumber?: number;
    pattern?: string; // e.g., "https://example.com/page-{number}"
  };
  namePattern?: {
    type: 'sequential' | 'custom';
    prefix?: string;
    suffix?: string;
    customNames?: string[];
  };
  scheduling?: {
    distributeOverTime?: boolean;
    intervalBetweenJobs?: number; // seconds
    randomizeInterval?: boolean;
    maxConcurrentJobs?: number;
  };
  variations?: {
    priorities?: number[];
    regions?: string[];
    intents?: string[];
    tags?: string[][];
  };
}

export interface JobFilters {
  status?: string[];
  type?: string;
  priority?: number[];
  assignedWorker?: string;
  createdBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

export class JobService {
  private static aiScenarioService = new AIScenarioService();

  static async createJob(jobData: CreateJobData): Promise<IJob> {
    await connectDB();

    // Generate unique job ID
    const jobId = nanoid();

    // Create new job
    const job = new Job({
      _id: jobId,
      name: jobData.name,
      description: jobData.description,
      url: jobData.url,
      type: jobData.type || 'single',
      priority: jobData.priority || 5,
      config: {
        retryConfig: {
          maxRetries: 3,
          retryDelay: 5000
        },
        browserConfig: {
          headless: true,
          viewport: { width: 1366, height: 768 }
        },
        ...jobData.config
      },
      schedule: jobData.schedule,
      execution: {
        attempts: 0,
        logs: []
      },
      metadata: {
        createdBy: jobData.createdBy,
        tags: jobData.tags || []
      }
    });

    await job.save();

    // If it's a single job, queue it immediately
    if (job.type === 'single') {
      await this.queueJob(job._id);
    }

    // Publish job creation event
    await pubsub.publish('job:created', {
      jobId: job._id,
      name: job.name,
      status: job.status,
      createdBy: job.metadata.createdBy
    });

    await job.addLog('info', 'Job created successfully');

    return job;
  }

  static async createJobWithAI(jobData: CreateJobData): Promise<IJob> {
    await connectDB();

    // Generate fingerprint profile first
    const fingerprintProfile = jobData.fingerprintRegion
      ? FingerprintService.generateFingerprintForRegion(jobData.fingerprintRegion)
      : FingerprintService.generateRandomFingerprint();

    console.log(`[JOB SERVICE] Generated fingerprint for job: ${jobData.name}`);
    FingerprintService.logFingerprintInfo(fingerprintProfile);

    // Enhanced job config with fingerprint
    const enhancedConfig = {
      retryConfig: {
        maxRetries: 3,
        retryDelay: 5000
      },
      browserConfig: {
        headless: true,
        viewport: fingerprintProfile.viewport,
        userAgent: fingerprintProfile.userAgent,
        fingerprint: fingerprintProfile
      },
      automationConfig: {
        useAI: jobData.useAI || false,
        intent: jobData.intent,
        aiScenario: null as AIScenario | null,
        fingerprintScript: FingerprintService.generateFingerprintScript(fingerprintProfile)
      },
      ...jobData.config
    };

    // Generate unique job ID
    const jobId = nanoid();

    // Create new job with enhanced config
    const job = new Job({
      _id: jobId,
      name: jobData.name,
      description: jobData.description,
      url: jobData.url,
      type: jobData.type || 'single',
      priority: jobData.priority || 5,
      config: enhancedConfig,
      schedule: jobData.schedule,
      execution: {
        attempts: 0,
        logs: []
      },
      metadata: {
        createdBy: jobData.createdBy,
        tags: jobData.tags || [],
        aiGenerated: jobData.useAI || false,
        fingerprintRegion: jobData.fingerprintRegion
      }
    });

    await job.save();

    // Generate AI scenario if requested
    if (jobData.useAI) {
      try {
        await job.addLog('info', 'Generating AI browsing scenario...');

        // Create basic page context for AI generation
        const pageContext: PageContext = {
          url: jobData.url,
          title: "Unknown Page", // Will be extracted by worker
          pageType: "general",
          elements: {
            links: [],
            buttons: [],
            forms: [],
            images: [],
            navigation: []
          },
          content: {
            headings: [],
            paragraphs: [],
            keywords: []
          }
        };

        const aiScenario = await this.aiScenarioService.generateScenario(
          pageContext,
          jobData.intent
        );

        // Update job config with AI scenario
        job.config.automationConfig.aiScenario = aiScenario;
        await job.save();

        await job.addLog('info',
          `AI scenario generated: ${aiScenario.steps.length} steps, ` +
          `${aiScenario.totalDuration}ms duration, ` +
          `complexity: ${aiScenario.complexity}/10`
        );

        console.log(`[JOB SERVICE] Generated AI scenario with ${aiScenario.steps.length} steps for ${jobData.url}`);
      } catch (error) {
        console.error('[JOB SERVICE] Failed to generate AI scenario:', error);
        await job.addLog('warning', `AI scenario generation failed: ${error}. Will use fallback automation.`);
      }
    }

    // If it's a single job, queue it immediately
    if (job.type === 'single') {
      await this.queueJob(job._id);
    }

    // Publish job creation event
    await pubsub.publish('job:created', {
      jobId: job._id,
      name: job.name,
      status: job.status,
      createdBy: job.metadata.createdBy,
      aiGenerated: job.metadata.aiGenerated
    });

    await job.addLog('info', 'Enhanced job created successfully with AI and fingerprint capabilities');

    return job;
  }

  static async createBatchJobs(batchData: BatchJobCreationData): Promise<{
    success: boolean;
    jobs: any[];
    totalCreated: number;
    errors: string[];
  }> {
    await connectDB();

    const { baseJob, quantity, urlPattern, namePattern, scheduling, variations } = batchData;
    const createdJobs: any[] = [];
    const errors: string[] = [];

    console.log(`[JOB SERVICE] Creating ${quantity} batch jobs...`);

    // Generate URLs
    const urls = this.generateUrls(quantity, urlPattern, baseJob.url);

    // Generate names
    const names = this.generateNames(quantity, namePattern, baseJob.name);

    // Create jobs
    for (let i = 0; i < quantity; i++) {
      try {
        const jobData: CreateJobData = {
          ...baseJob,
          name: names[i],
          url: urls[i],
          type: 'scheduled', // All batch jobs are scheduled
          priority: this.getVariation(variations?.priorities, i, baseJob.priority || 5),
          fingerprintRegion: this.getVariation(variations?.regions, i, baseJob.fingerprintRegion),
          intent: this.getVariation(variations?.intents, i, baseJob.intent),
          tags: [
            ...(baseJob.tags || []),
            'batch-job',
            `batch-${Date.now()}`,
            ...(this.getVariation(variations?.tags, i, []) || [])
          ]
        };

        // Apply scheduling distribution if enabled
        if (scheduling?.distributeOverTime && baseJob.schedule) {
          jobData.schedule = this.calculateScheduleForBatchJob(
            baseJob.schedule,
            i,
            quantity,
            scheduling
          );
        }

        const job = await this.createJob(jobData);
        createdJobs.push(job);

        // Add delay between job creation if specified
        if (scheduling?.intervalBetweenJobs && i < quantity - 1) {
          const delay = scheduling.randomizeInterval
            ? scheduling.intervalBetweenJobs + (Math.random() * scheduling.intervalBetweenJobs * 0.5)
            : scheduling.intervalBetweenJobs;

          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }

      } catch (error) {
        const errorMsg = `Failed to create job ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`[JOB SERVICE] ${errorMsg}`);
      }
    }

    console.log(`[JOB SERVICE] Batch creation completed: ${createdJobs.length}/${quantity} jobs created`);

    return {
      success: errors.length === 0,
      jobs: createdJobs,
      totalCreated: createdJobs.length,
      errors
    };
  }

  private static generateUrls(quantity: number, urlPattern: any, baseUrl: string): string[] {
    const urls: string[] = [];

    if (!urlPattern || urlPattern.type === 'sequential') {
      const startNum = urlPattern?.startNumber || 1;
      const pattern = urlPattern?.pattern || `${baseUrl}?page={number}`;

      for (let i = 0; i < quantity; i++) {
        const url = pattern.replace('{number}', (startNum + i).toString());
        urls.push(url);
      }
    } else if (urlPattern.type === 'list' && urlPattern.urls) {
      for (let i = 0; i < quantity; i++) {
        const url = urlPattern.urls[i % urlPattern.urls.length];
        urls.push(url);
      }
    } else {
      // Default: use base URL for all
      for (let i = 0; i < quantity; i++) {
        urls.push(baseUrl);
      }
    }

    return urls;
  }

  private static generateNames(quantity: number, namePattern: any, baseName: string): string[] {
    const names: string[] = [];

    if (!namePattern || namePattern.type === 'sequential') {
      const prefix = namePattern?.prefix || baseName;
      const suffix = namePattern?.suffix || '';

      for (let i = 0; i < quantity; i++) {
        names.push(`${prefix} ${i + 1}${suffix ? ' ' + suffix : ''}`);
      }
    } else if (namePattern.type === 'custom' && namePattern.customNames) {
      for (let i = 0; i < quantity; i++) {
        const name = namePattern.customNames[i % namePattern.customNames.length];
        names.push(name);
      }
    } else {
      // Default: sequential numbering
      for (let i = 0; i < quantity; i++) {
        names.push(`${baseName} ${i + 1}`);
      }
    }

    return names;
  }

  private static getVariation<T>(variations: T[] | undefined, index: number, defaultValue: T): T {
    if (!variations || variations.length === 0) {
      return defaultValue;
    }
    return variations[index % variations.length];
  }

  private static calculateScheduleForBatchJob(
    baseSchedule: JobSchedule,
    jobIndex: number,
    totalJobs: number,
    scheduling: any
  ): JobSchedule {
    const schedule: JobSchedule = { ...baseSchedule };

    if (scheduling.distributeOverTime) {
      const startDate = baseSchedule.startDate || new Date();
      const intervalMs = scheduling.intervalBetweenJobs * 1000 || 60000; // Default 1 minute

      // Distribute jobs over time
      const jobStartTime = new Date(startDate.getTime() + (jobIndex * intervalMs));
      schedule.startDate = jobStartTime;

      // Add some randomization if enabled
      if (scheduling.randomizeInterval) {
        const randomOffset = (Math.random() - 0.5) * intervalMs * 0.3; // ±30% randomization
        schedule.startDate = new Date(jobStartTime.getTime() + randomOffset);
      }
    }

    return schedule;
  }

  static async queueJob(jobId: string, delay = 0): Promise<void> {
    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Update job status
    await job.updateStatus('queued');

    // Add to job queue
    const queueOptions: any = {
      priority: job.priority,
      delay,
      attempts: job.config.retryConfig?.maxRetries || 3,
      backoff: {
        type: 'exponential',
        delay: job.config.retryConfig?.retryDelay || 5000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    };

    await jobQueue.add('execute-automation', {
      jobId: job._id,
      url: job.url,
      config: job.config
    }, queueOptions);

    await job.addLog('info', 'Job queued for execution');

    // Publish queue event
    await pubsub.publish('job:queued', {
      jobId: job._id,
      priority: job.priority
    });
  }

  static async assignJobToWorker(jobId: string, workerId?: string): Promise<IWorker | null> {
    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    let worker: IWorker | null = null;

    if (workerId) {
      // Assign to specific worker
      worker = await Worker.findOne({
        identifier: workerId,
        status: 'online',
        'resources.currentJobs': { $lt: '$capabilities.maxConcurrentJobs' }
      });
    } else {
      // Find best available worker
      const availableWorkers = await Worker.find({
        status: 'online',
        'resources.currentJobs': { $lt: '$capabilities.maxConcurrentJobs' },
        'configuration.priorityFilter.min': { $lte: job.priority },
        'configuration.priorityFilter.max': { $gte: job.priority }
      }).sort({
        'resources.currentJobs': 1,
        'resources.successRate': -1,
        'resources.averageJobDuration': 1
      });

      worker = availableWorkers[0] || null;
    }

    if (worker) {
      // Assign job to worker
      job.assignedWorker = worker.identifier;
      job.workerInfo = {
        id: worker.identifier,
        name: worker.name,
        ip: worker.connection.ip,
        assignedAt: new Date()
      };

      await job.save();
      await worker.assignJob();

      await job.addLog('info', `Job assigned to worker: ${worker.name} (${worker.identifier})`);

      // Publish assignment event
      await pubsub.publish('job:assigned', {
        jobId: job._id,
        workerId: worker.identifier,
        workerName: worker.name
      });
    }

    return worker;
  }

  static async allocateProxy(jobId: string, workerId?: string): Promise<IProxy | null> {
    await connectDB();

    const job = await Job.findById(jobId);
    if (!job || !job.config.browserConfig?.proxy) {
      return null;
    }

    // Get available proxies
    const excludeUsedBy = workerId ? [workerId] : [];
    const availableProxies = await ProxyModel.find({
      status: 'active',
      'quality.reliability': { $gte: 70 },
      'usage.currentlyUsedBy': { $nin: excludeUsedBy }
    }).sort({
      'quality.reliability': -1,
      'usage.usageCount': 1
    }).limit(1);

    const proxy = availableProxies[0] || null;

    if (proxy && workerId) {
      await proxy.recordUsage(true, workerId);

      // Update job config with proxy info
      job.config.browserConfig.proxy = {
        host: proxy.host,
        port: proxy.port,
        username: proxy.authentication?.username,
        password: proxy.authentication?.password,
        protocol: proxy.protocol
      };

      await job.save();
      await job.addLog('info', `Proxy allocated: ${proxy.host}:${proxy.port}`);
    }

    return proxy;
  }

  static async getJobs(filters: JobFilters = {}, page = 1, limit = 20): Promise<{
    jobs: IJob[];
    total: number;
    pages: number;
  }> {
    await connectDB();

    const query: any = {};

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query.status = { $in: filters.status };
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.priority && filters.priority.length > 0) {
      query.priority = { $in: filters.priority };
    }

    if (filters.assignedWorker) {
      query.assignedWorker = filters.assignedWorker;
    }

    if (filters.createdBy) {
      query['metadata.createdBy'] = filters.createdBy;
    }

    if (filters.dateRange) {
      query['metadata.createdAt'] = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end
      };
    }

    if (filters.tags && filters.tags.length > 0) {
      query['metadata.tags'] = { $in: filters.tags };
    }

    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .sort({ 'metadata.createdAt': -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Job.countDocuments(query)
    ]);

    return {
      jobs,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  static async getJobById(jobId: string): Promise<IJob | null> {
    await connectDB();
    return Job.findById(jobId).exec();
  }

  static async updateJob(jobId: string, updates: Partial<IJob>): Promise<IJob | null> {
    await connectDB();

    const job = await Job.findByIdAndUpdate(
      jobId,
      { ...updates, 'metadata.updatedAt': new Date() },
      { new: true }
    );

    if (job) {
      await pubsub.publish('job:updated', {
        jobId: job._id,
        status: job.status,
        updates
      });
    }

    return job;
  }

  static async cancelJob(jobId: string, reason?: string): Promise<boolean> {
    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) {
      return false;
    }

    // Remove from queue if queued
    if (job.status === 'queued') {
      // Note: In a real implementation, you'd need to remove from Bull queue
      // This would require storing the Bull job ID
    }

    await job.updateStatus('cancelled');
    await job.addLog('info', `Job cancelled: ${reason || 'No reason provided'}`);

    // Release worker if assigned
    if (job.assignedWorker) {
      const worker = await Worker.findOne({ identifier: job.assignedWorker });
      if (worker) {
        await worker.completeJob(false, 0);
      }
    }

    await pubsub.publish('job:cancelled', {
      jobId: job._id,
      reason
    });

    return true;
  }

  static async retryJob(jobId: string): Promise<boolean> {
    await connectDB();

    const job = await Job.findById(jobId);
    if (!job || job.status !== 'failed') {
      return false;
    }

    // Reset job status and queue again
    job.status = 'pending';
    job.assignedWorker = undefined;
    job.workerInfo = undefined;
    await job.save();

    await this.queueJob(jobId);
    await job.addLog('info', 'Job manually retried');

    return true;
  }

  static async getJobStats(): Promise<any> {
    await connectDB();

    const [statusStats, dailyStats] = await Promise.all([
      Job.getJobStats(),
      this.getDailyJobStats()
    ]);

    return {
      statusStats: statusStats[0]?.stats || [],
      total: statusStats[0]?.total || 0,
      dailyStats
    };
  }

  private static async getDailyJobStats(): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return Job.aggregate([
      {
        $match: {
          'metadata.createdAt': { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$metadata.createdAt'
            }
          },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
  }

  static async getNextJobForWorker(workerId: string): Promise<IJob | null> {
    await connectDB();

    // First check if worker exists and is available
    const worker = await Worker.findOne({
      identifier: workerId,
      status: { $in: ['online', 'busy'] },
      'resources.currentJobs': { $lt: '$capabilities.maxConcurrentJobs' }
    });

    if (!worker) {
      console.log(`Worker ${workerId} not available for jobs`);
      return null;
    }

    // Find next available job that matches worker capabilities
    const job = await Job.findOne({
      status: 'queued',
      $or: [
        { assignedWorker: { $exists: false } },
        { assignedWorker: null },
        { assignedWorker: workerId }
      ],
      priority: {
        $gte: worker.configuration.priorityFilter.min,
        $lte: worker.configuration.priorityFilter.max
      }
    }).sort({
      priority: -1,
      'metadata.createdAt': 1
    }).exec();

    return job;
  }

  static async processScheduledJobs(): Promise<void> {
    await connectDB();

    const now = new Date();

    // Find scheduled jobs that should be executed
    const scheduledJobs = await Job.find({
      type: 'scheduled',
      status: 'pending',
      'schedule.startTime': { $lte: now }
    });

    for (const job of scheduledJobs) {
      if (job.schedule?.type === 'once') {
        await this.queueJob(job._id);
      } else if (job.schedule?.type === 'recurring' && job.schedule.interval) {
        await this.queueJob(job._id);

        // Schedule next execution
        const nextExecution = new Date(now.getTime() + job.schedule.interval * 60000);
        job.schedule.startTime = nextExecution;
        await job.save();
      }
    }
  }
}

// Initialize job queue processing
jobQueue.process('execute-automation', async (job) => {
  const { jobId, url, config } = job.data;

  try {
    // This would typically communicate with worker nodes
    // For now, we'll simulate job processing
    console.log(`Processing job ${jobId} for URL: ${url}`);

    const automationJob = await Job.findById(jobId);
    if (automationJob) {
      await automationJob.updateStatus('running');

      // Simulate job execution
      await new Promise(resolve => setTimeout(resolve, 5000));

      await automationJob.updateStatus('completed', {
        screenshot: 'base64-encoded-screenshot',
        metrics: {
          elementsFound: 25,
          actionsPerformed: 8,
          errorsEncountered: 0,
          pageLoadTime: 2300
        }
      });

      // Release resources
      if (automationJob.assignedWorker) {
        const worker = await Worker.findOne({ identifier: automationJob.assignedWorker });
        if (worker) {
          await worker.completeJob(true, 5000);
        }
      }
    }

    return { success: true, jobId };
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);

    const automationJob = await Job.findById(jobId);
    if (automationJob) {
      await automationJob.updateStatus('failed');
      await automationJob.addLog('error', `Job execution failed: ${error}`);

      if (automationJob.assignedWorker) {
        const worker = await Worker.findOne({ identifier: automationJob.assignedWorker });
        if (worker) {
          await worker.completeJob(false, 0);
        }
      }
    }

    throw error;
  }
});

export default JobService;
