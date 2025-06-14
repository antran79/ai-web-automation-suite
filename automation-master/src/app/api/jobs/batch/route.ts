import { type NextRequest, NextResponse } from 'next/server';
import { JobService, type BatchJobCreationData } from '@/services/JobService';

export async function POST(request: NextRequest) {
  try {
    const batchData: BatchJobCreationData = await request.json();

    console.log(`[BATCH JOBS API] Creating ${batchData.quantity} batch jobs`);

    // Validate input
    if (!batchData.baseJob.name || !batchData.baseJob.url) {
      return NextResponse.json(
        { error: 'Base job name and URL are required' },
        { status: 400 }
      );
    }

    if (batchData.quantity < 1 || batchData.quantity > 1000) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 1000' },
        { status: 400 }
      );
    }

    // Create batch jobs
    const result = await JobService.createBatchJobs(batchData);

    return NextResponse.json({
      success: result.success,
      data: {
        totalCreated: result.totalCreated,
        totalRequested: batchData.quantity,
        jobs: result.jobs.map(job => ({
          _id: job._id,
          name: job.name,
          url: job.url,
          status: job.status,
          priority: job.priority,
          type: job.type,
          schedule: job.schedule,
          createdAt: job.metadata.createdAt
        })),
        errors: result.errors
      },
      message: `Successfully created ${result.totalCreated} out of ${batchData.quantity} jobs`
    });

  } catch (error) {
    console.error('[BATCH JOBS API] Error creating batch jobs:', error);
    return NextResponse.json(
      {
        error: 'Failed to create batch jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get batch job templates
export async function GET(request: NextRequest) {
  try {
    const templates = [
      {
        id: 'ecommerce-daily',
        name: 'E-commerce Daily Monitoring',
        description: 'Monitor product pages daily for price and availability changes',
        baseJob: {
          name: 'Product Monitor',
          description: 'Daily product page monitoring',
          url: 'https://example-store.com/products',
          type: 'scheduled',
          priority: 5,
          schedule: {
            type: 'recurring',
            interval: 'daily',
            startDate: new Date(),
            isActive: true
          },
          useAI: true,
          intent: 'monitor product pricing and availability'
        },
        urlPattern: {
          type: 'pattern',
          pattern: 'https://example-store.com/products/{number}'
        },
        namePattern: {
          type: 'sequential',
          prefix: 'Product Monitor',
          suffix: 'Daily Check'
        }
      },
      {
        id: 'news-hourly',
        name: 'News Sites Hourly Scraping',
        description: 'Scrape news websites every hour for new articles',
        baseJob: {
          name: 'News Scraper',
          description: 'Hourly news content extraction',
          url: 'https://news-site.com',
          type: 'scheduled',
          priority: 7,
          schedule: {
            type: 'recurring',
            interval: 'hourly',
            startDate: new Date(),
            isActive: true
          },
          useAI: true,
          intent: 'extract latest news articles and headlines'
        },
        urlPattern: {
          type: 'list',
          urls: [
            'https://news-site-1.com',
            'https://news-site-2.com',
            'https://news-site-3.com'
          ]
        }
      },
      {
        id: 'social-media',
        name: 'Social Media Monitoring',
        description: 'Monitor social media pages for engagement metrics',
        baseJob: {
          name: 'Social Monitor',
          description: 'Track social media engagement',
          url: 'https://social-platform.com',
          type: 'scheduled',
          priority: 6,
          schedule: {
            type: 'recurring',
            customInterval: {
              value: 4,
              unit: 'hours'
            },
            startDate: new Date(),
            isActive: true
          },
          useAI: true,
          intent: 'monitor social media engagement and interactions'
        }
      },
      {
        id: 'api-testing',
        name: 'API Endpoint Testing',
        description: 'Test API endpoints for availability and response times',
        baseJob: {
          name: 'API Test',
          description: 'Automated API endpoint testing',
          url: 'https://api.example.com',
          type: 'scheduled',
          priority: 8,
          schedule: {
            type: 'recurring',
            customInterval: {
              value: 15,
              unit: 'minutes'
            },
            startDate: new Date(),
            isActive: true
          },
          useAI: false,
          intent: 'test API endpoint availability and performance'
        },
        variations: {
          priorities: [8, 9, 10],
          intents: [
            'test API response time',
            'validate API data format',
            'check API authentication'
          ]
        }
      }
    ];

    return NextResponse.json({
      success: true,
      templates,
      totalTemplates: templates.length
    });

  } catch (error) {
    console.error('[BATCH JOBS API] Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch job templates' },
      { status: 500 }
    );
  }
}
