import { type NextRequest, NextResponse } from 'next/server';
import JobService, { type CreateJobData } from '@/services/JobService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.url || !body.createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: name, url, createdBy' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const jobData: CreateJobData = {
      name: body.name,
      description: body.description,
      url: body.url,
      type: body.type || 'single',
      priority: body.priority || 5,
      config: body.config || {},
      schedule: body.schedule,
      createdBy: body.createdBy,
      tags: body.tags || [],
      intent: body.intent || 'Browse and explore website content',
      fingerprintRegion: body.fingerprintRegion || 'us',
      useAI: body.useAI !== false // Default to true for this endpoint
    };

    console.log(`[API] Creating AI-enhanced job: ${jobData.name} for ${jobData.url}`);

    const job = await JobService.createJobWithAI(jobData);

    return NextResponse.json({
      success: true,
      job: {
        id: job._id,
        name: job.name,
        url: job.url,
        status: job.status,
        priority: job.priority,
        aiGenerated: job.metadata.aiGenerated,
        fingerprintRegion: job.metadata.fingerprintRegion,
        createdAt: job.metadata.createdAt
      },
      message: 'AI-enhanced job created successfully'
    });

  } catch (error) {
    console.error('[API] Error creating AI job:', error);

    return NextResponse.json(
      {
        error: 'Failed to create job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '20');

    // Get AI-generated jobs only
    const result = await JobService.getJobs(
      { tags: ['ai-generated'] },
      page,
      limit
    );

    return NextResponse.json({
      success: true,
      jobs: result.jobs.map(job => ({
        id: job._id,
        name: job.name,
        url: job.url,
        status: job.status,
        priority: job.priority,
        aiGenerated: job.metadata.aiGenerated,
        fingerprintRegion: job.metadata.fingerprintRegion,
        createdAt: job.metadata.createdAt,
        scenario: job.config.automationConfig?.aiScenario ? {
          steps: job.config.automationConfig.aiScenario.steps.length,
          duration: job.config.automationConfig.aiScenario.totalDuration,
          complexity: job.config.automationConfig.aiScenario.complexity,
          aiProvider: job.config.automationConfig.aiScenario.aiProvider
        } : null
      })),
      pagination: {
        page,
        limit,
        total: result.total,
        pages: result.pages
      }
    });

  } catch (error) {
    console.error('[API] Error fetching AI jobs:', error);

    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
