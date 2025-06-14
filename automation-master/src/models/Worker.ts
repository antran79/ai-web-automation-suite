import mongoose, { Schema, type Document } from 'mongoose';

export interface IWorker extends Document {
  _id: string;
  name: string;
  identifier: string; // unique worker ID
  type: 'standalone' | 'vps' | 'cloud';
  status: 'online' | 'offline' | 'busy' | 'maintenance' | 'error';
  connection: {
    ip: string;
    port?: number;
    lastSeen: Date;
    heartbeatInterval: number;
    connectionId?: string;
  };
  capabilities: {
    maxConcurrentJobs: number;
    supportedBrowsers: string[];
    supportedFeatures: string[];
    memory: number; // MB
    cpu: number; // cores
    storage: number; // GB
  };
  resources: {
    currentJobs: number;
    totalJobsProcessed: number;
    successRate: number;
    averageJobDuration: number;
    memoryUsage?: number;
    cpuUsage?: number;
    storageUsage?: number;
  };
  configuration: {
    autoAcceptJobs: boolean;
    maxJobDuration: number; // minutes
    priorityFilter: {
      min: number;
      max: number;
    };
    allowedDomains?: string[];
    blockedDomains?: string[];
    proxySettings?: {
      enabled: boolean;
      autoRotate: boolean;
    };
  };
  deployment: {
    vpsInfo?: {
      provider: string;
      region: string;
      size: string;
      cost: number; // per hour
    };
    dockerInfo?: {
      containerId: string;
      image: string;
      version: string;
    };
    autoScaling?: {
      enabled: boolean;
      minInstances: number;
      maxInstances: number;
      scaleUpThreshold: number;
      scaleDownThreshold: number;
    };
  };
  security: {
    apiKey: string;
    lastAuth: Date;
    trustedIPs?: string[];
    rateLimits: {
      requestsPerMinute: number;
      jobsPerHour: number;
    };
  };
  monitoring: {
    healthChecks: {
      timestamp: Date;
      status: 'healthy' | 'warning' | 'critical';
      checks: {
        browserConnection: boolean;
        memoryUsage: boolean;
        diskSpace: boolean;
        networkConnectivity: boolean;
      };
      details?: any;
    }[];
    errors: {
      timestamp: Date;
      type: 'connection' | 'job_execution' | 'resource' | 'system';
      message: string;
      details?: any;
      resolved: boolean;
    }[];
    metrics: {
      timestamp: Date;
      data: {
        jobsCompleted: number;
        jobsFailed: number;
        averageResponseTime: number;
        memoryUsage: number;
        cpuUsage: number;
      };
    }[];
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    registeredBy: string;
    tags?: string[];
    notes?: string;
  };
}

const WorkerSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  identifier: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['standalone', 'vps', 'cloud'],
    required: true
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'busy', 'maintenance', 'error'],
    default: 'offline'
  },
  connection: {
    ip: { type: String, required: true },
    port: Number,
    lastSeen: { type: Date, default: Date.now },
    heartbeatInterval: { type: Number, default: 30000 }, // 30 seconds
    connectionId: String
  },
  capabilities: {
    maxConcurrentJobs: { type: Number, default: 1 },
    supportedBrowsers: [{ type: String, default: ['chromium'] }],
    supportedFeatures: [String],
    memory: { type: Number, default: 1024 }, // MB
    cpu: { type: Number, default: 1 },
    storage: { type: Number, default: 10 } // GB
  },
  resources: {
    currentJobs: { type: Number, default: 0 },
    totalJobsProcessed: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    averageJobDuration: { type: Number, default: 0 },
    memoryUsage: Number,
    cpuUsage: Number,
    storageUsage: Number
  },
  configuration: {
    autoAcceptJobs: { type: Boolean, default: true },
    maxJobDuration: { type: Number, default: 60 }, // minutes
    priorityFilter: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 10 }
    },
    allowedDomains: [String],
    blockedDomains: [String],
    proxySettings: {
      enabled: { type: Boolean, default: false },
      autoRotate: { type: Boolean, default: true }
    }
  },
  deployment: {
    vpsInfo: {
      provider: String,
      region: String,
      size: String,
      cost: Number
    },
    dockerInfo: {
      containerId: String,
      image: String,
      version: String
    },
    autoScaling: {
      enabled: { type: Boolean, default: false },
      minInstances: { type: Number, default: 1 },
      maxInstances: { type: Number, default: 5 },
      scaleUpThreshold: { type: Number, default: 80 },
      scaleDownThreshold: { type: Number, default: 20 }
    }
  },
  security: {
    apiKey: { type: String, required: true },
    lastAuth: Date,
    trustedIPs: [String],
    rateLimits: {
      requestsPerMinute: { type: Number, default: 60 },
      jobsPerHour: { type: Number, default: 100 }
    }
  },
  monitoring: {
    healthChecks: [{
      timestamp: { type: Date, default: Date.now },
      status: { type: String, enum: ['healthy', 'warning', 'critical'] },
      checks: {
        browserConnection: Boolean,
        memoryUsage: Boolean,
        diskSpace: Boolean,
        networkConnectivity: Boolean
      },
      details: Schema.Types.Mixed
    }],
    errors: [{
      timestamp: { type: Date, default: Date.now },
      type: { type: String, enum: ['connection', 'job_execution', 'resource', 'system'] },
      message: String,
      details: Schema.Types.Mixed,
      resolved: { type: Boolean, default: false }
    }],
    metrics: [{
      timestamp: { type: Date, default: Date.now },
      data: {
        jobsCompleted: { type: Number, default: 0 },
        jobsFailed: { type: Number, default: 0 },
        averageResponseTime: { type: Number, default: 0 },
        memoryUsage: { type: Number, default: 0 },
        cpuUsage: { type: Number, default: 0 }
      }
    }]
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    registeredBy: { type: String, required: true },
    tags: [String],
    notes: String
  }
}, {
  timestamps: { createdAt: 'metadata.createdAt', updatedAt: 'metadata.updatedAt' }
});

// Indexes for performance
WorkerSchema.index({ identifier: 1 }, { unique: true });
WorkerSchema.index({ status: 1 });
WorkerSchema.index({ 'connection.lastSeen': -1 });
WorkerSchema.index({ 'capabilities.maxConcurrentJobs': 1 });

// Methods
WorkerSchema.methods.updateHeartbeat = function() {
  this.connection.lastSeen = new Date();
  this.status = 'online';
  return this.save();
};

WorkerSchema.methods.addHealthCheck = function(checks: any, status = 'healthy') {
  this.monitoring.healthChecks.push({
    timestamp: new Date(),
    status,
    checks,
    details: {}
  });

  // Keep only last 100 health checks
  if (this.monitoring.healthChecks.length > 100) {
    this.monitoring.healthChecks = this.monitoring.healthChecks.slice(-100);
  }

  return this.save();
};

WorkerSchema.methods.addError = function(type: string, message: string, details?: any) {
  this.monitoring.errors.push({
    timestamp: new Date(),
    type,
    message,
    details,
    resolved: false
  });

  // Keep only last 500 errors
  if (this.monitoring.errors.length > 500) {
    this.monitoring.errors = this.monitoring.errors.slice(-500);
  }

  return this.save();
};

WorkerSchema.methods.updateMetrics = function(metrics: any) {
  this.monitoring.metrics.push({
    timestamp: new Date(),
    data: metrics
  });

  // Keep only last 1000 metrics (roughly 24h if collected every minute)
  if (this.monitoring.metrics.length > 1000) {
    this.monitoring.metrics = this.monitoring.metrics.slice(-1000);
  }

  // Update resource usage
  this.resources.memoryUsage = metrics.memoryUsage;
  this.resources.cpuUsage = metrics.cpuUsage;

  return this.save();
};

WorkerSchema.methods.assignJob = function() {
  this.resources.currentJobs += 1;
  if (this.resources.currentJobs >= this.capabilities.maxConcurrentJobs) {
    this.status = 'busy';
  }
  return this.save();
};

WorkerSchema.methods.completeJob = function(success = true, duration = 0) {
  this.resources.currentJobs = Math.max(0, this.resources.currentJobs - 1);
  this.resources.totalJobsProcessed += 1;

  // Update success rate
  const totalJobs = this.resources.totalJobsProcessed;
  const currentSuccessRate = this.resources.successRate;
  const newSuccessCount = (currentSuccessRate * (totalJobs - 1)) + (success ? 1 : 0);
  this.resources.successRate = newSuccessCount / totalJobs;

  // Update average duration
  const currentAvg = this.resources.averageJobDuration;
  this.resources.averageJobDuration = ((currentAvg * (totalJobs - 1)) + duration) / totalJobs;

  // Update status
  if (this.resources.currentJobs < this.capabilities.maxConcurrentJobs) {
    this.status = 'online';
  }

  return this.save();
};

// Static methods
WorkerSchema.statics.getAvailableWorkers = function() {
  return this.find({
    status: { $in: ['online'] },
    'resources.currentJobs': { $lt: mongoose.model('Worker').schema.path('capabilities.maxConcurrentJobs') }
  }).sort({ 'resources.currentJobs': 1, 'resources.successRate': -1 });
};

WorkerSchema.statics.getWorkerStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalJobs: { $sum: '$resources.currentJobs' },
        avgSuccessRate: { $avg: '$resources.successRate' }
      }
    }
  ]);
};

// Check for offline workers (haven't sent heartbeat in 2 minutes)
WorkerSchema.statics.markOfflineWorkers = function() {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  return this.updateMany(
    {
      'connection.lastSeen': { $lt: twoMinutesAgo },
      status: { $ne: 'offline' }
    },
    {
      $set: { status: 'offline' }
    }
  );
};

export default mongoose.models.Worker || mongoose.model<IWorker>('Worker', WorkerSchema);
