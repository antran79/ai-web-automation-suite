import { type NextRequest, NextResponse } from 'next/server';
import JobService from '@/services/JobService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workerId = searchParams.get('workerId');

    if (!workerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Worker ID is required'
        },
        { status: 400 }
      );
    }

    // Get next available job for this worker
    const job = await JobService.getNextJobForWorker(workerId);

    if (!job) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No jobs available'
      });
    }

    // Assign job to worker
    await JobService.assignJobToWorker(job._id, workerId);

    return NextResponse.json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('Error getting next job:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get next job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
