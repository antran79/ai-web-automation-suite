import { type NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import Job from '@/models/Job';
import Worker from '@/models/Worker';
import ProxyModel from '@/models/Proxy';
import { CacheManager } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    console.log('[STATS API] Returning mock data (MongoDB disabled)');

    // Return mock stats data for development
    const stats = {
      jobs: {
        total: 247,
        pending: 12,
        queued: 8,
        running: 3,
        completed: 198,
        failed: 24,
        cancelled: 2
      },
      workers: {
        total: 5,
        online: 3,
        offline: 1,
        busy: 2,
        maintenance: 0,
        error: 0
      },
      proxies: {
        total: 15,
        active: 12,
        inactive: 2,
        testing: 1,
        failed: 0,
        banned: 0
      },
      system: {
        uptime: '5d 12h 34m',
        queueSize: 20,
        throughput: 45,
        lastUpdated: new Date().toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      data: stats,
      cached: false,
      mock: true
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
