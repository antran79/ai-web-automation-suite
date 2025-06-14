import mongoose, { Schema, type Document } from 'mongoose';

export interface IProxy extends Document {
  _id: string;
  name?: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  groupId?: string; // Reference to ProxyGroup
  groupName?: string; // Denormalized group name for easier queries
  authentication?: {
    username: string;
    password: string;
  };
  status: 'active' | 'inactive' | 'testing' | 'failed' | 'banned';
  quality: {
    speed: number; // response time in ms
    reliability: number; // success rate 0-100
    anonymity: 'transparent' | 'anonymous' | 'elite';
    location?: {
      country: string;
      city?: string;
      region?: string;
      timezone?: string;
    };
  };
  usage: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    lastUsed?: Date;
    currentlyUsedBy?: string; // worker ID
    usageCount: number;
  };
  limits: {
    maxConcurrentConnections: number;
    maxRequestsPerHour: number;
    maxRequestsPerDay: number;
    rotationInterval?: number; // minutes
  };
  monitoring: {
    lastCheck: Date;
    healthChecks: {
      timestamp: Date;
      responseTime: number;
      success: boolean;
      error?: string;
      ipDetected?: string;
    }[];
    errors: {
      timestamp: Date;
      type: 'connection' | 'timeout' | 'authentication' | 'banned' | 'other';
      message: string;
      details?: any;
    }[];
  };
  provider: {
    name?: string;
    plan?: string;
    cost?: number; // per month/request
    renewalDate?: Date;
    contact?: string;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    addedBy: string;
    tags?: string[];
    notes?: string;
  };
}

const ProxySchema: Schema = new Schema({
  name: {
    type: String,
    trim: true,
    maxlength: 255
  },
  host: {
    type: String,
    required: true,
    trim: true
  },
  port: {
    type: Number,
    required: true,
    min: 1,
    max: 65535
  },
  protocol: {
    type: String,
    enum: ['http', 'https', 'socks4', 'socks5'],
    required: true
  },
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'ProxyGroup',
    index: true
  },
  groupName: {
    type: String,
    trim: true,
    index: true
  },
  authentication: {
    username: String,
    password: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'testing', 'failed', 'banned'],
    default: 'testing'
  },
  quality: {
    speed: { type: Number, default: 0 }, // ms
    reliability: { type: Number, default: 0, min: 0, max: 100 },
    anonymity: { type: String, enum: ['transparent', 'anonymous', 'elite'], default: 'anonymous' },
    location: {
      country: String,
      city: String,
      region: String,
      timezone: String
    }
  },
  usage: {
    totalRequests: { type: Number, default: 0 },
    successfulRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    lastUsed: Date,
    currentlyUsedBy: String, // worker ID
    usageCount: { type: Number, default: 0 }
  },
  limits: {
    maxConcurrentConnections: { type: Number, default: 10 },
    maxRequestsPerHour: { type: Number, default: 100 },
    maxRequestsPerDay: { type: Number, default: 1000 },
    rotationInterval: Number // minutes
  },
  monitoring: {
    lastCheck: { type: Date, default: Date.now },
    healthChecks: [{
      timestamp: { type: Date, default: Date.now },
      responseTime: Number,
      success: Boolean,
      error: String,
      ipDetected: String
    }],
    errors: [{
      timestamp: { type: Date, default: Date.now },
      type: { type: String, enum: ['connection', 'timeout', 'authentication', 'banned', 'other'] },
      message: String,
      details: Schema.Types.Mixed
    }]
  },
  provider: {
    name: String,
    plan: String,
    cost: Number,
    renewalDate: Date,
    contact: String
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    addedBy: { type: String, required: true },
    tags: [String],
    notes: String
  }
}, {
  timestamps: { createdAt: 'metadata.createdAt', updatedAt: 'metadata.updatedAt' }
});

// Compound indexes for performance
ProxySchema.index({ host: 1, port: 1 }, { unique: true });
ProxySchema.index({ status: 1, 'quality.reliability': -1 });
ProxySchema.index({ 'usage.currentlyUsedBy': 1 });
ProxySchema.index({ 'monitoring.lastCheck': -1 });

// Methods
ProxySchema.methods.updateHealthCheck = function(responseTime: number, success: boolean, error?: string, ipDetected?: string) {
  this.monitoring.healthChecks.push({
    timestamp: new Date(),
    responseTime,
    success,
    error,
    ipDetected
  });

  // Keep only last 100 health checks
  if (this.monitoring.healthChecks.length > 100) {
    this.monitoring.healthChecks = this.monitoring.healthChecks.slice(-100);
  }

  // Update quality metrics
  const recentChecks = this.monitoring.healthChecks.slice(-10); // Last 10 checks
  const successCount = recentChecks.filter(check => check.success).length;
  this.quality.reliability = (successCount / recentChecks.length) * 100;

  const avgSpeed = recentChecks
    .filter(check => check.success && check.responseTime)
    .reduce((sum, check) => sum + check.responseTime, 0) / recentChecks.length;

  if (avgSpeed > 0) {
    this.quality.speed = avgSpeed;
  }

  // Update status based on reliability
  if (this.quality.reliability >= 90) {
    this.status = 'active';
  } else if (this.quality.reliability >= 50) {
    this.status = 'inactive';
  } else {
    this.status = 'failed';
  }

  this.monitoring.lastCheck = new Date();
  return this.save();
};

ProxySchema.methods.addError = function(type: string, message: string, details?: any) {
  this.monitoring.errors.push({
    timestamp: new Date(),
    type,
    message,
    details
  });

  // Keep only last 100 errors
  if (this.monitoring.errors.length > 100) {
    this.monitoring.errors = this.monitoring.errors.slice(-100);
  }

  return this.save();
};

ProxySchema.methods.recordUsage = function(success: boolean, workerId?: string) {
  this.usage.totalRequests += 1;
  if (success) {
    this.usage.successfulRequests += 1;
  } else {
    this.usage.failedRequests += 1;
  }

  this.usage.lastUsed = new Date();
  this.usage.usageCount += 1;

  if (workerId) {
    this.usage.currentlyUsedBy = workerId;
  }

  return this.save();
};

ProxySchema.methods.releaseUsage = function() {
  this.usage.currentlyUsedBy = undefined;
  return this.save();
};

ProxySchema.methods.checkLimits = function() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // These would need to be tracked in a separate collection for accurate rate limiting
  // For now, we'll use simple counters
  const hourlyUsage = this.usage.usageCount; // Simplified
  const dailyUsage = this.usage.usageCount; // Simplified

  return {
    hourlyLimitReached: hourlyUsage >= this.limits.maxRequestsPerHour,
    dailyLimitReached: dailyUsage >= this.limits.maxRequestsPerDay,
    concurrentLimitReached: false // Would need real-time tracking
  };
};

// Static methods
ProxySchema.statics.getActiveProxies = function(excludeUsedBy?: string[]) {
  const query: any = {
    status: 'active',
    'quality.reliability': { $gte: 70 }
  };

  if (excludeUsedBy && excludeUsedBy.length > 0) {
    query['usage.currentlyUsedBy'] = { $nin: excludeUsedBy };
  }

  return this.find(query)
    .sort({ 'quality.reliability': -1, 'quality.speed': 1, 'usage.usageCount': 1 })
    .exec();
};

ProxySchema.statics.getProxyStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgReliability: { $avg: '$quality.reliability' },
        avgSpeed: { $avg: '$quality.speed' }
      }
    }
  ]);
};

ProxySchema.statics.getProxiesByLocation = function(country?: string) {
  const query: any = { status: 'active' };
  if (country) {
    query['quality.location.country'] = country;
  }

  return this.find(query).exec();
};

ProxySchema.statics.rotateProxies = function() {
  // Mark proxies for rotation based on usage count and time
  return this.updateMany(
    {
      status: 'active',
      $or: [
        { 'usage.usageCount': { $gte: 100 } }, // Heavy usage
        { 'usage.lastUsed': { $lt: new Date(Date.now() - 30 * 60 * 1000) } } // Not used in 30 min
      ]
    },
    {
      $unset: { 'usage.currentlyUsedBy': 1 },
      $set: { 'usage.usageCount': 0 }
    }
  );
};

// Test a proxy connection
ProxySchema.methods.testConnection = async function() {
  // This would typically use a real HTTP client to test the proxy
  // For now, we'll simulate it
  const testResult = {
    responseTime: Math.random() * 2000 + 500,
    success: Math.random() > 0.1, // 90% success rate simulation
    error: Math.random() > 0.9 ? 'Connection timeout' : undefined
  };

  await this.updateHealthCheck(
    testResult.responseTime,
    testResult.success,
    testResult.error
  );

  return testResult;
};

export default mongoose.models.Proxy || mongoose.model<IProxy>('Proxy', ProxySchema);
