import mongoose, { Schema, type Document } from 'mongoose';

export interface IProxyGroup extends Document {
  _id: string;
  name: string;
  description?: string;
  category: 'residential' | 'datacenter' | 'mobile' | 'static' | 'rotating' | 'custom';
  provider?: {
    name: string;
    plan?: string;
    cost?: number;
    renewalDate?: Date;
    contact?: string;
    apiKey?: string;
  };
  configuration: {
    rotationInterval: number; // minutes
    maxConcurrentUsage: number;
    healthCheckInterval: number; // minutes
    autoRemoveFailedProxies: boolean;
    loadBalancing: 'round-robin' | 'least-used' | 'random' | 'performance';
    preferredCountries?: string[];
    blacklistedCountries?: string[];
  };
  limits: {
    maxProxiesPerGroup: number;
    maxRequestsPerHour: number;
    maxRequestsPerDay: number;
    cooldownPeriod: number; // minutes
  };
  stats: {
    totalProxies: number;
    activeProxies: number;
    inactiveProxies: number;
    failedProxies: number;
    bannedProxies: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    avgReliability: number;
    lastHealthCheck?: Date;
  };
  access: {
    allowedWorkers?: string[]; // worker IDs that can use this group
    allowedProjects?: string[]; // project names that can use this group
    priority: number; // 1-10, higher priority gets better proxies first
    isPublic: boolean; // if true, any worker can use
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    tags: string[];
    notes?: string;
    isActive: boolean;
  };
}

const ProxyGroupSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['residential', 'datacenter', 'mobile', 'static', 'rotating', 'custom'],
    required: true,
    default: 'datacenter'
  },
  provider: {
    name: String,
    plan: String,
    cost: Number,
    renewalDate: Date,
    contact: String,
    apiKey: String
  },
  configuration: {
    rotationInterval: { type: Number, default: 30 }, // 30 minutes
    maxConcurrentUsage: { type: Number, default: 100 },
    healthCheckInterval: { type: Number, default: 15 }, // 15 minutes
    autoRemoveFailedProxies: { type: Boolean, default: false },
    loadBalancing: {
      type: String,
      enum: ['round-robin', 'least-used', 'random', 'performance'],
      default: 'performance'
    },
    preferredCountries: [String],
    blacklistedCountries: [String]
  },
  limits: {
    maxProxiesPerGroup: { type: Number, default: 10000 },
    maxRequestsPerHour: { type: Number, default: 100000 },
    maxRequestsPerDay: { type: Number, default: 1000000 },
    cooldownPeriod: { type: Number, default: 5 } // 5 minutes
  },
  stats: {
    totalProxies: { type: Number, default: 0 },
    activeProxies: { type: Number, default: 0 },
    inactiveProxies: { type: Number, default: 0 },
    failedProxies: { type: Number, default: 0 },
    bannedProxies: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    successfulRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    avgReliability: { type: Number, default: 0 },
    lastHealthCheck: Date
  },
  access: {
    allowedWorkers: [String],
    allowedProjects: [String],
    priority: { type: Number, min: 1, max: 10, default: 5 },
    isPublic: { type: Boolean, default: true }
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: String, required: true },
    tags: [String],
    notes: String,
    isActive: { type: Boolean, default: true }
  }
}, {
  timestamps: { createdAt: 'metadata.createdAt', updatedAt: 'metadata.updatedAt' }
});

// Indexes for performance
ProxyGroupSchema.index({ name: 1 }, { unique: true });
ProxyGroupSchema.index({ category: 1, 'metadata.isActive': 1 });
ProxyGroupSchema.index({ 'access.priority': -1 });
ProxyGroupSchema.index({ 'metadata.createdBy': 1 });

// Methods
ProxyGroupSchema.methods.updateStats = async function() {
  const ProxyModel = mongoose.model('Proxy');

  const stats = await ProxyModel.aggregate([
    { $match: { groupId: this._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgSpeed: { $avg: '$quality.speed' },
        avgReliability: { $avg: '$quality.reliability' },
        totalRequests: { $sum: '$usage.totalRequests' },
        successfulRequests: { $sum: '$usage.successfulRequests' },
        failedRequests: { $sum: '$usage.failedRequests' }
      }
    }
  ]);

  // Reset stats
  this.stats.totalProxies = 0;
  this.stats.activeProxies = 0;
  this.stats.inactiveProxies = 0;
  this.stats.failedProxies = 0;
  this.stats.bannedProxies = 0;
  this.stats.totalRequests = 0;
  this.stats.successfulRequests = 0;
  this.stats.failedRequests = 0;

  let totalSpeed = 0;
  let totalReliability = 0;
  let proxyCount = 0;

  stats.forEach((stat: any) => {
    this.stats.totalProxies += stat.count;

    switch (stat._id) {
      case 'active':
        this.stats.activeProxies = stat.count;
        break;
      case 'inactive':
        this.stats.inactiveProxies = stat.count;
        break;
      case 'failed':
        this.stats.failedProxies = stat.count;
        break;
      case 'banned':
        this.stats.bannedProxies = stat.count;
        break;
    }

    this.stats.totalRequests += stat.totalRequests || 0;
    this.stats.successfulRequests += stat.successfulRequests || 0;
    this.stats.failedRequests += stat.failedRequests || 0;

    if (stat.avgSpeed) {
      totalSpeed += stat.avgSpeed * stat.count;
      proxyCount += stat.count;
    }
    if (stat.avgReliability) {
      totalReliability += stat.avgReliability * stat.count;
    }
  });

  this.stats.avgResponseTime = proxyCount > 0 ? totalSpeed / proxyCount : 0;
  this.stats.avgReliability = this.stats.totalProxies > 0 ? totalReliability / this.stats.totalProxies : 0;
  this.stats.lastHealthCheck = new Date();

  return this.save();
};

ProxyGroupSchema.methods.getNextProxy = async function(excludeProxies: string[] = []) {
  const ProxyModel = mongoose.model('Proxy');

  const query: any = {
    groupId: this._id,
    status: 'active',
    'quality.reliability': { $gte: 70 }
  };

  if (excludeProxies.length > 0) {
    query._id = { $nin: excludeProxies };
  }

  // Apply country filters
  if (this.configuration.preferredCountries?.length > 0) {
    query['quality.location.country'] = { $in: this.configuration.preferredCountries };
  }
  if (this.configuration.blacklistedCountries?.length > 0) {
    query['quality.location.country'] = { $nin: this.configuration.blacklistedCountries };
  }

  let sortOrder: any;
  switch (this.configuration.loadBalancing) {
    case 'least-used':
      sortOrder = { 'usage.usageCount': 1, 'quality.reliability': -1 };
      break;
    case 'performance':
      sortOrder = { 'quality.reliability': -1, 'quality.speed': 1 };
      break;
    case 'random':
      // MongoDB doesn't have a built-in random sort, so we'll use sample
      return ProxyModel.aggregate([
        { $match: query },
        { $sample: { size: 1 } }
      ]).then(results => results[0] || null);
    case 'round-robin':
    default:
      sortOrder = { 'usage.lastUsed': 1, 'quality.reliability': -1 };
      break;
  }

  return ProxyModel.findOne(query).sort(sortOrder).exec();
};

ProxyGroupSchema.methods.checkAccess = function(workerId?: string, projectName?: string) {
  if (!this.metadata.isActive) {
    return false;
  }

  // Public groups are accessible to everyone
  if (this.access.isPublic) {
    return true;
  }

  // Check worker access
  if (workerId && this.access.allowedWorkers?.includes(workerId)) {
    return true;
  }

  // Check project access
  if (projectName && this.access.allowedProjects?.includes(projectName)) {
    return true;
  }

  return false;
};

ProxyGroupSchema.methods.addProxiesFromCSV = async function(csvData: string, userId: string) {
  const ProxyModel = mongoose.model('Proxy');
  const lines = csvData.trim().split('\n');
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

  const results = {
    imported: 0,
    duplicates: 0,
    errors: 0,
    errorDetails: [] as string[]
  };

  // Find required columns
  const requiredColumns = {
    host: headers.findIndex(h => h.includes('host') || h.includes('ip')),
    port: headers.findIndex(h => h.includes('port')),
    username: headers.findIndex(h => h.includes('user') || h.includes('username')),
    password: headers.findIndex(h => h.includes('pass') || h.includes('password')),
    protocol: headers.findIndex(h => h.includes('protocol') || h.includes('type')),
    country: headers.findIndex(h => h.includes('country') || h.includes('location')),
    city: headers.findIndex(h => h.includes('city')),
    name: headers.findIndex(h => h.includes('name') || h.includes('title'))
  };

  if (requiredColumns.host === -1 || requiredColumns.port === -1) {
    throw new Error('CSV must contain host and port columns');
  }

  // Process each proxy line
  for (let i = 1; i < lines.length; i++) {
    try {
      const columns = lines[i].split(',').map(c => c.trim());

      if (columns.length < 2) continue; // Skip empty lines

      const host = columns[requiredColumns.host];
      const port = Number.parseInt(columns[requiredColumns.port]);

      if (!host || !port || isNaN(port)) {
        results.errors++;
        results.errorDetails.push(`Line ${i + 1}: Invalid host or port`);
        continue;
      }

      // Check for duplicates
      const existing = await ProxyModel.findOne({ host, port });
      if (existing) {
        results.duplicates++;
        continue;
      }

      // Create new proxy
      const proxyData: any = {
        host,
        port,
        protocol: columns[requiredColumns.protocol] || 'http',
        groupId: this._id,
        groupName: this.name,
        status: 'testing',
        quality: {
          speed: 0,
          reliability: 0,
          anonymity: 'anonymous'
        },
        usage: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          usageCount: 0
        },
        limits: {
          maxConcurrentConnections: 10,
          maxRequestsPerHour: 100,
          maxRequestsPerDay: 1000
        },
        monitoring: {
          lastCheck: new Date(),
          healthChecks: [],
          errors: []
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          addedBy: userId,
          tags: [`group:${this.name}`]
        }
      };

      // Add authentication if provided
      if (requiredColumns.username !== -1 && requiredColumns.password !== -1) {
        const username = columns[requiredColumns.username];
        const password = columns[requiredColumns.password];
        if (username && password) {
          proxyData.authentication = { username, password };
        }
      }

      // Add location if provided
      if (requiredColumns.country !== -1) {
        const country = columns[requiredColumns.country];
        if (country) {
          proxyData.quality.location = { country };
          if (requiredColumns.city !== -1) {
            const city = columns[requiredColumns.city];
            if (city) {
              proxyData.quality.location.city = city;
            }
          }
        }
      }

      // Add name if provided
      if (requiredColumns.name !== -1) {
        const name = columns[requiredColumns.name];
        if (name) {
          proxyData.name = name;
        }
      }

      await ProxyModel.create(proxyData);
      results.imported++;

    } catch (error) {
      results.errors++;
      results.errorDetails.push(`Line ${i + 1}: ${error}`);
    }
  }

  // Update group stats
  await this.updateStats();

  return results;
};

// Static methods
ProxyGroupSchema.statics.getGroupsByUser = function(userId: string) {
  return this.find({
    $or: [
      { 'metadata.createdBy': userId },
      { 'access.isPublic': true }
    ],
    'metadata.isActive': true
  }).sort({ 'access.priority': -1, name: 1 });
};

ProxyGroupSchema.statics.getGroupStats = function() {
  return this.aggregate([
    { $match: { 'metadata.isActive': true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalProxies: { $sum: '$stats.totalProxies' },
        activeProxies: { $sum: '$stats.activeProxies' },
        avgReliability: { $avg: '$stats.avgReliability' }
      }
    }
  ]);
};

export default mongoose.models.ProxyGroup || mongoose.model<IProxyGroup>('ProxyGroup', ProxyGroupSchema);
