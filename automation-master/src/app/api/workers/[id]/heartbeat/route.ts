import { type NextRequest, NextResponse } from 'next/server';

interface HeartbeatData {
  status: 'online' | 'busy' | 'offline';
  currentJobs: number;
  metrics: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkUsage: number;
    jobsCompleted: number;
    jobsFailed: number;
    averageResponseTime: number;
  };
  performance: {
    successRate: number;
    averageJobDuration: number;
  };
  capabilities?: {
    maxConcurrentJobs: number;
    supportedBrowsers: string[];
    memory: number;
    cpu: number;
  };
}

// In-memory worker tracking (trong production sẽ dùng database)
const workerRegistry = new Map<string, any>();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: workerId } = params;
    const heartbeatData: HeartbeatData = await request.json();

    console.log(`[HEARTBEAT] Received from worker ${workerId}:`, {
      status: heartbeatData.status,
      currentJobs: heartbeatData.currentJobs,
      cpu: heartbeatData.metrics.cpuUsage,
      memory: heartbeatData.metrics.memoryUsage
    });

    // Update worker data in registry
    const existingWorker = workerRegistry.get(workerId) || {};
    const updatedWorker = {
      ...existingWorker,
      id: workerId,
      status: heartbeatData.status,
      lastSeen: new Date(),
      currentJobs: heartbeatData.currentJobs,
      metrics: {
        ...heartbeatData.metrics,
        lastUpdated: new Date()
      },
      performance: {
        ...heartbeatData.performance,
        totalJobsProcessed: heartbeatData.metrics.jobsCompleted,
        totalJobsFailed: heartbeatData.metrics.jobsFailed
      },
      capabilities: heartbeatData.capabilities || existingWorker.capabilities || {}
    };

    workerRegistry.set(workerId, updatedWorker);

    // Calculate aggregated stats
    const stats = calculateWorkerStats(updatedWorker);

    // Log significant changes
    if (heartbeatData.status === 'offline') {
      console.log(`[HEARTBEAT] ⚠️ Worker ${workerId} went offline`);
    } else if (heartbeatData.currentJobs > (existingWorker.currentJobs || 0)) {
      console.log(`[HEARTBEAT] 📈 Worker ${workerId} job count increased to ${heartbeatData.currentJobs}`);
    } else if (heartbeatData.currentJobs < (existingWorker.currentJobs || 0)) {
      console.log(`[HEARTBEAT] 📉 Worker ${workerId} job count decreased to ${heartbeatData.currentJobs}`);
    }

    // Response với instructions cho worker (nếu cần)
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      instructions: {
        // Master có thể gửi instructions cho worker
        maxConcurrentJobs: heartbeatData.capabilities?.maxConcurrentJobs || 3,
        reportingInterval: 30000, // 30 seconds
        healthCheckInterval: 300000, // 5 minutes
      },
      stats: {
        globalWorkerCount: workerRegistry.size,
        onlineWorkers: Array.from(workerRegistry.values()).filter(w => w.status === 'online').length,
        totalActiveJobs: Array.from(workerRegistry.values()).reduce((sum, w) => sum + (w.currentJobs || 0), 0)
      },
      calculated: stats
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[HEARTBEAT] Error processing heartbeat:', error);
    return NextResponse.json(
      {
        error: 'Failed to process heartbeat',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint để xem worker status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: workerId } = params;
    const worker = workerRegistry.get(workerId);

    if (!worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Check if worker is stale (no heartbeat in last 60 seconds)
    const lastSeenMs = worker.lastSeen ? new Date(worker.lastSeen).getTime() : 0;
    const isStale = Date.now() - lastSeenMs > 60000;

    if (isStale && worker.status !== 'offline') {
      worker.status = 'offline';
      console.log(`[WORKER STATUS] Worker ${workerId} marked as offline (stale heartbeat)`);
    }

    const stats = calculateWorkerStats(worker);

    return NextResponse.json({
      success: true,
      worker: {
        id: workerId,
        status: worker.status,
        lastSeen: worker.lastSeen,
        isStale,
        currentJobs: worker.currentJobs || 0,
        metrics: worker.metrics || {},
        performance: worker.performance || {},
        capabilities: worker.capabilities || {},
        uptime: worker.lastSeen ? formatUptime(new Date(worker.lastSeen)) : 'Unknown',
        calculated: stats
      }
    });

  } catch (error) {
    console.error('[WORKER STATUS] Error getting worker status:', error);
    return NextResponse.json(
      { error: 'Failed to get worker status' },
      { status: 500 }
    );
  }
}

function calculateWorkerStats(worker: any) {
  const metrics = worker.metrics || {};
  const performance = worker.performance || {};

  return {
    healthScore: calculateHealthScore(worker),
    efficiency: calculateEfficiency(worker),
    resourceUtilization: {
      cpu: metrics.cpuUsage || 0,
      memory: metrics.memoryUsage || 0,
      disk: metrics.diskUsage || 0,
      network: metrics.networkUsage || 0
    },
    jobStats: {
      total: (performance.totalJobsProcessed || 0) + (performance.totalJobsFailed || 0),
      completed: performance.totalJobsProcessed || 0,
      failed: performance.totalJobsFailed || 0,
      successRate: performance.successRate || 0,
      averageDuration: performance.averageJobDuration || 0
    }
  };
}

function calculateHealthScore(worker: any): number {
  const metrics = worker.metrics || {};
  const performance = worker.performance || {};

  // Health score based on multiple factors
  let score = 100;

  // CPU usage impact (high CPU = lower score)
  const cpuPenalty = Math.max(0, (metrics.cpuUsage || 0) - 80) * 2;
  score -= cpuPenalty;

  // Memory usage impact (high memory = lower score)
  const memoryPenalty = Math.max(0, (metrics.memoryUsage || 0) - 3000) / 100;
  score -= memoryPenalty;

  // Success rate impact
  const successRate = performance.successRate || 100;
  if (successRate < 95) {
    score -= (95 - successRate) * 2;
  }

  // Connectivity impact
  if (worker.status === 'offline') {
    score = 0;
  } else if (worker.status === 'online') {
    score += 10; // Bonus for being online
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateEfficiency(worker: any): number {
  const currentJobs = worker.currentJobs || 0;
  const maxJobs = worker.capabilities?.maxConcurrentJobs || 3;
  const successRate = worker.performance?.successRate || 100;

  // Efficiency = (Current utilization + Success rate) / 2
  const utilization = maxJobs > 0 ? (currentJobs / maxJobs) * 100 : 0;
  const efficiency = (utilization + successRate) / 2;

  return Math.round(efficiency);
}

function formatUptime(lastSeen: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours % 24}h ${diffMins % 60}m`;
  } else if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m`;
  } else {
    return `${diffMins}m`;
  }
}

// Export worker registry for other endpoints to access
export function getWorkerRegistry() {
  return workerRegistry;
}

// Get all workers
export function getAllWorkers() {
  return Array.from(workerRegistry.values());
}
