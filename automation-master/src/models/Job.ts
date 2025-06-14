import mongoose, { Schema, type Document } from 'mongoose';

export interface IJob extends Document {
  _id: string;
  name: string;
  description?: string;
  url: string;
  type: 'single' | 'batch' | 'scheduled';
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  config: {
    pageType?: string;
    scenario?: {
      steps: {
        type: string;
        target?: string;
        value?: string;
        duration: number;
        description: string;
      }[];
      totalDuration: number;
      description: string;
    };
    browserConfig?: {
      headless?: boolean;
      proxy?: {
        host: string;
        port: number;
        username?: string;
        password?: string;
        protocol: string;
      };
      viewport?: {
        width: number;
        height: number;
      };
      userAgent?: string;
    };
    retryConfig?: {
      maxRetries: number;
      retryDelay: number;
    };
  };
  assignedWorker?: string;
  workerInfo?: {
    id: string;
    name: string;
    ip: string;
    assignedAt: Date;
  };
  schedule?: {
    type: 'once' | 'recurring';
    startTime: Date;
    endTime?: Date;
    interval?: number; // in minutes
    cron?: string;
  };
  execution: {
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    attempts: number;
    lastAttempt?: Date;
    logs: {
      timestamp: Date;
      level: 'info' | 'warn' | 'error' | 'debug';
      message: string;
      data?: any;
    }[];
    results?: {
      screenshot?: string;
      data?: any;
      metrics?: {
        elementsFound: number;
        actionsPerformed: number;
        errorsEncountered: number;
        pageLoadTime: number;
      };
    };
  };
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    tags?: string[];
  };
}

const JobSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: (v: string) => {
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid URL format'
    }
  },
  type: {
    type: String,
    enum: ['single', 'batch', 'scheduled'],
    default: 'single'
  },
  status: {
    type: String,
    enum: ['pending', 'queued', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  config: {
    pageType: String,
    scenario: {
      steps: [{
        type: { type: String, required: true },
        target: String,
        value: String,
        duration: { type: Number, required: true },
        description: { type: String, required: true }
      }],
      totalDuration: Number,
      description: String
    },
    browserConfig: {
      headless: { type: Boolean, default: true },
      proxy: {
        host: String,
        port: Number,
        username: String,
        password: String,
        protocol: { type: String, enum: ['http', 'https', 'socks4', 'socks5'] }
      },
      viewport: {
        width: { type: Number, default: 1366 },
        height: { type: Number, default: 768 }
      },
      userAgent: String
    },
    retryConfig: {
      maxRetries: { type: Number, default: 3 },
      retryDelay: { type: Number, default: 5000 }
    }
  },
  assignedWorker: {
    type: String,
    index: true
  },
  workerInfo: {
    id: String,
    name: String,
    ip: String,
    assignedAt: Date
  },
  schedule: {
    type: { type: String, enum: ['once', 'recurring'] },
    startTime: Date,
    endTime: Date,
    interval: Number,
    cron: String
  },
  execution: {
    startTime: Date,
    endTime: Date,
    duration: Number,
    attempts: { type: Number, default: 0 },
    lastAttempt: Date,
    logs: [{
      timestamp: { type: Date, default: Date.now },
      level: { type: String, enum: ['info', 'warn', 'error', 'debug'] },
      message: String,
      data: Schema.Types.Mixed
    }],
    results: {
      screenshot: String,
      data: Schema.Types.Mixed,
      metrics: {
        elementsFound: Number,
        actionsPerformed: Number,
        errorsEncountered: Number,
        pageLoadTime: Number
      }
    }
  },
  metadata: {
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    tags: [String]
  }
}, {
  timestamps: { createdAt: 'metadata.createdAt', updatedAt: 'metadata.updatedAt' }
});

// Indexes for performance
JobSchema.index({ status: 1, priority: -1 });
JobSchema.index({ 'metadata.createdAt': -1 });
JobSchema.index({ assignedWorker: 1 });
JobSchema.index({ url: 1 });

// Methods
JobSchema.methods.addLog = function(level: string, message: string, data?: any) {
  this.execution.logs.push({
    timestamp: new Date(),
    level,
    message,
    data
  });
  return this.save();
};

JobSchema.methods.updateStatus = function(status: string, data?: any) {
  this.status = status;
  this.metadata.updatedAt = new Date();

  if (status === 'running') {
    this.execution.startTime = new Date();
    this.execution.attempts += 1;
    this.execution.lastAttempt = new Date();
  } else if (status === 'completed' || status === 'failed') {
    this.execution.endTime = new Date();
    if (this.execution.startTime) {
      this.execution.duration = this.execution.endTime.getTime() - this.execution.startTime.getTime();
    }
  }

  if (data) {
    this.execution.results = { ...this.execution.results, ...data };
  }

  return this.save();
};

// Static methods
JobSchema.statics.getNextJob = function(workerId?: string) {
  const query: any = { status: 'queued' };
  if (workerId) {
    query.$or = [
      { assignedWorker: { $exists: false } },
      { assignedWorker: null },
      { assignedWorker: workerId }
    ];
  }

  return this.findOne(query)
    .sort({ priority: -1, 'metadata.createdAt': 1 })
    .exec();
};

JobSchema.statics.getJobStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        stats: {
          $push: {
            status: '$_id',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    }
  ]);
};

export default mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
