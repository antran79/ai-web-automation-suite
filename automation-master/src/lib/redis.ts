// import Redis from 'ioredis';

// Redis configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Create Redis client (disabled for now)
// export const redis = new Redis({
//   host: REDIS_HOST,
//   port: REDIS_PORT,
//   password: REDIS_PASSWORD,
//   retryDelayOnFailover: 100,
//   maxRetriesPerRequest: 3,
// });

// Mock Redis for development
export const redis = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 1,
  lpush: async () => 1,
  brpop: async () => null,
  llen: async () => 0,
  publish: async () => 1,
  subscribe: async () => {},
  on: () => {},
};

// Redis connection events
// redis.on('connect', () => {
//   console.log('✅ Connected to Redis');
// });

// redis.on('error', (err) => {
//   console.error('❌ Redis connection error:', err);
// });

console.log('⚠️ Redis disabled - using mock implementation');

// Simple job queue implementation using Redis lists
export class SimpleJobQueue {
  private queueName: string;

  constructor(queueName: string) {
    this.queueName = queueName;
  }

  async add(jobType: string, data: any, options: any = {}) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      type: jobType,
      data,
      options,
      createdAt: new Date().toISOString(),
      status: 'queued'
    };

    await redis.lpush(this.queueName, JSON.stringify(job));
    return job;
  }

  async process(callback: (job: any) => Promise<any>) {
    // Simple polling-based job processing
    setInterval(async () => {
      try {
        const jobData = await redis.brpop(this.queueName, 1);
        if (jobData && jobData[1]) {
          const job = JSON.parse(jobData[1]);
          try {
            await callback(job);
          } catch (error) {
            console.error('Job processing error:', error);
          }
        }
      } catch (error) {
        console.error('Queue processing error:', error);
      }
    }, 1000);
  }

  on(event: string, callback: (job: any, result?: any) => void) {
    // Simplified event handling
    console.log(`Event handler registered for: ${event}`);
  }
}

// Create job queues
export const jobQueue = new SimpleJobQueue('automation:jobs');
export const resultQueue = new SimpleJobQueue('automation:results');

// Cache utilities
export class CacheManager {
  static async set(key: string, value: any, ttl = 3600) {
    return redis.setex(key, ttl, JSON.stringify(value));
  }

  static async get(key: string) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  static async del(key: string) {
    return redis.del(key);
  }

  static async exists(key: string) {
    return redis.exists(key);
  }

  static async incr(key: string) {
    return redis.incr(key);
  }

  static async expire(key: string, seconds: number) {
    return redis.expire(key, seconds);
  }
}

// Mock PubSub for development (Redis disabled)
export class PubSubManager {
  constructor() {
    console.log('⚠️ PubSub disabled - using mock implementation');
  }

  async subscribe(channel: string, callback: (message: string) => void) {
    console.log(`[MOCK PUBSUB] Subscribed to channel: ${channel}`);
    return Promise.resolve();
  }

  async publish(channel: string, message: any) {
    console.log(`[MOCK PUBSUB] Published to ${channel}:`, message);
    return Promise.resolve(1);
  }

  async unsubscribe(channel: string) {
    console.log(`[MOCK PUBSUB] Unsubscribed from channel: ${channel}`);
    return Promise.resolve();
  }
}

export const pubsub = new PubSubManager();
