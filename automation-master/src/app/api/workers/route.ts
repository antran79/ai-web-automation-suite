import { type NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import Worker, { type IWorker } from '@/models/Worker';

export async function GET(request: NextRequest) {
  try {
    console.log('[WORKERS API] Fetching workers');

    // Return mock data for development (MongoDB disabled)
    const mockWorkers = [
      {
        _id: '1',
        name: 'Worker Node US-East-1',
        identifier: 'wn-us-east-1',
        type: 'vps',
        status: 'online',
        connection: {
          ip: '192.168.1.100',
          port: 3001,
          lastSeen: new Date(),
          connectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          userAgent: 'AutomationWorker/1.0'
        },
        capabilities: {
          maxConcurrentJobs: 3,
          supportedBrowsers: ['chrome', 'firefox'],
          memory: 4096,
          cpu: 4,
          storage: 100,
          bandwidth: 1000,
          features: ['stealth', 'fingerprinting', 'ai-scenarios']
        },
        resources: {
          currentJobs: 1,
          totalJobsProcessed: 245,
          successRate: 98.2,
          averageJobDuration: 45000,
          lastJobCompletedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          performance: {
            cpuUsage: 25.5,
            memoryUsage: 1842,
            diskUsage: 45,
            networkUsage: 150
          }
        },
        configuration: {
          priorityFilter: { min: 1, max: 10 },
          autoAcceptJobs: true,
          maxJobDuration: 300000,
          proxyRotationInterval: 1800000,
          enableMonitoring: true,
          logLevel: 'info'
        },
        proxyAssignments: [
          {
            groupId: '1',
            groupName: 'Residential Group A',
            assignedAt: new Date(),
            currentProxy: '192.168.1.200:8080',
            totalProxies: 10,
            successRate: 95.5
          }
        ],
        metadata: {
          registeredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          lastHeartbeat: new Date(Date.now() - 30 * 1000), // 30 seconds ago
          version: '1.2.3',
          region: 'us-east-1',
          tags: ['production', 'high-priority', 'residential'],
          notes: 'Primary worker for US-based automation tasks',
          isActive: true,
          maintenanceMode: false
        }
      },
      {
        _id: '2',
        name: 'Worker Node EU-West-1',
        identifier: 'wn-eu-west-1',
        type: 'cloud',
        status: 'busy',
        connection: {
          ip: '192.168.1.101',
          port: 3001,
          lastSeen: new Date(),
          connectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          userAgent: 'AutomationWorker/1.0'
        },
        capabilities: {
          maxConcurrentJobs: 5,
          supportedBrowsers: ['chrome'],
          memory: 8192,
          cpu: 8,
          storage: 200,
          bandwidth: 2000,
          features: ['stealth', 'fingerprinting', 'ai-scenarios', 'video-recording']
        },
        resources: {
          currentJobs: 5,
          totalJobsProcessed: 678,
          successRate: 97.8,
          averageJobDuration: 38000,
          lastJobCompletedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          performance: {
            cpuUsage: 85.2,
            memoryUsage: 6834,
            diskUsage: 78,
            networkUsage: 420
          }
        },
        configuration: {
          priorityFilter: { min: 5, max: 10 },
          autoAcceptJobs: true,
          maxJobDuration: 600000,
          proxyRotationInterval: 3600000,
          enableMonitoring: true,
          logLevel: 'debug'
        },
        proxyAssignments: [
          {
            groupId: '2',
            groupName: 'Datacenter Group B',
            assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            currentProxy: '192.168.1.201:1080',
            totalProxies: 15,
            successRate: 98.1
          }
        ],
        metadata: {
          registeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
          lastHeartbeat: new Date(Date.now() - 15 * 1000), // 15 seconds ago
          version: '1.2.3',
          region: 'eu-west-1',
          tags: ['production', 'high-capacity', 'datacenter'],
          notes: 'High-capacity worker for European automation tasks',
          isActive: true,
          maintenanceMode: false
        }
      },
      {
        _id: '3',
        name: 'Worker Node Asia-1',
        identifier: 'wn-asia-1',
        type: 'standalone',
        status: 'offline',
        connection: {
          ip: '192.168.1.102',
          port: 3001,
          lastSeen: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
          connectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          userAgent: 'AutomationWorker/1.1.8'
        },
        capabilities: {
          maxConcurrentJobs: 2,
          supportedBrowsers: ['chrome'],
          memory: 2048,
          cpu: 2,
          storage: 50,
          bandwidth: 500,
          features: ['stealth', 'fingerprinting']
        },
        resources: {
          currentJobs: 0,
          totalJobsProcessed: 89,
          successRate: 94.4,
          averageJobDuration: 52000,
          lastJobCompletedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
          performance: {
            cpuUsage: 0,
            memoryUsage: 0,
            diskUsage: 23,
            networkUsage: 0
          }
        },
        configuration: {
          priorityFilter: { min: 1, max: 5 },
          autoAcceptJobs: false,
          maxJobDuration: 180000,
          proxyRotationInterval: 900000,
          enableMonitoring: true,
          logLevel: 'warn'
        },
        proxyAssignments: [],
        metadata: {
          registeredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          lastHeartbeat: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
          version: '1.1.8',
          region: 'asia-1',
          tags: ['testing', 'low-priority'],
          notes: 'Testing worker for Asian region',
          isActive: false,
          maintenanceMode: true
        }
      }
    ];

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const region = searchParams.get('region');

    // Filter workers
    let filteredWorkers = [...mockWorkers];

    if (status) {
      filteredWorkers = filteredWorkers.filter(w => w.status === status);
    }

    if (region) {
      filteredWorkers = filteredWorkers.filter(w => w.metadata.region === region);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedWorkers = filteredWorkers.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      workers: paginatedWorkers,
      pagination: {
        page,
        limit,
        total: filteredWorkers.length,
        pages: Math.ceil(filteredWorkers.length / limit)
      },
      summary: {
        total: mockWorkers.length,
        online: mockWorkers.filter(w => w.status === 'online').length,
        busy: mockWorkers.filter(w => w.status === 'busy').length,
        offline: mockWorkers.filter(w => w.status === 'offline').length,
        totalJobs: mockWorkers.reduce((sum, w) => sum + w.resources.currentJobs, 0),
        totalCapacity: mockWorkers.reduce((sum, w) => sum + w.capabilities.maxConcurrentJobs, 0),
        avgSuccessRate: mockWorkers.reduce((sum, w) => sum + w.resources.successRate, 0) / mockWorkers.length
      },
      mock: true
    });

  } catch (error) {
    console.error('[WORKERS API] Error fetching workers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.ip) {
      return NextResponse.json(
        { error: 'Name and IP address are required' },
        { status: 400 }
      );
    }

    console.log(`[WORKERS API] Registering worker: ${body.name}`);

    // Simulate worker registration
    const newWorker = {
      _id: Date.now().toString(),
      name: body.name,
      identifier: `wn-${Date.now().toString().slice(-6)}`,
      type: body.type || 'vps',
      status: 'online',
      connection: {
        ip: body.ip,
        port: body.port || 3001,
        lastSeen: new Date(),
        connectedAt: new Date(),
        userAgent: 'AutomationWorker/1.0'
      },
      capabilities: {
        maxConcurrentJobs: body.maxConcurrentJobs || 3,
        supportedBrowsers: body.supportedBrowsers || ['chrome'],
        memory: body.memory || 4096,
        cpu: body.cpu || 4,
        storage: body.storage || 100,
        bandwidth: body.bandwidth || 1000,
        features: body.features || ['stealth', 'fingerprinting']
      },
      resources: {
        currentJobs: 0,
        totalJobsProcessed: 0,
        successRate: 0,
        averageJobDuration: 0,
        lastJobCompletedAt: null,
        performance: {
          cpuUsage: 0,
          memoryUsage: 0,
          diskUsage: 0,
          networkUsage: 0
        }
      },
      configuration: {
        priorityFilter: { min: 1, max: 10 },
        autoAcceptJobs: true,
        maxJobDuration: 300000,
        proxyRotationInterval: 1800000,
        enableMonitoring: true,
        logLevel: 'info'
      },
      proxyAssignments: [],
      metadata: {
        registeredAt: new Date(),
        lastHeartbeat: new Date(),
        version: '1.0.0',
        region: body.region || 'unknown',
        tags: body.tags || [],
        notes: body.notes || '',
        isActive: true,
        maintenanceMode: false
      }
    };

    return NextResponse.json({
      success: true,
      worker: newWorker,
      message: 'Worker registered successfully'
    });

  } catch (error) {
    console.error('[WORKERS API] Error registering worker:', error);
    return NextResponse.json(
      {
        error: 'Failed to register worker',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
