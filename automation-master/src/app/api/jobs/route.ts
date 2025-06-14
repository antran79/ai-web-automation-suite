import { type NextRequest, NextResponse } from 'next/server';
import JobService, { type CreateJobData, type JobFilters } from '@/services/JobService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters from query parameters
    const filters: JobFilters = {};

    const status = searchParams.get('status');
    if (status) {
      filters.status = status.split(',');
    }

    const type = searchParams.get('type');
    if (type) {
      filters.type = type;
    }

    const priority = searchParams.get('priority');
    if (priority) {
      filters.priority = priority.split(',').map(Number);
    }

    const assignedWorker = searchParams.get('assignedWorker');
    if (assignedWorker) {
      filters.assignedWorker = assignedWorker;
    }

    const createdBy = searchParams.get('createdBy');
    if (createdBy) {
      filters.createdBy = createdBy;
    }

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    const tags = searchParams.get('tags');
    if (tags) {
      filters.tags = tags.split(',');
    }

    // Pagination
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '20');

    const result = await JobService.getJobs(filters, page, limit);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and URL are required'
        },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid URL format'
        },
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
      createdBy: body.createdBy || 'system',
      tags: body.tags || []
    };

    const job = await JobService.createJob(jobData);

    return NextResponse.json({
      success: true,
      data: job
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
