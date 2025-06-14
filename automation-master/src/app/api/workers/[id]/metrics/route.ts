import { type NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import Worker from '@/models/Worker';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await request.json();
    const workerId = params.id;

    const worker = await Worker.findOne({ identifier: workerId });

    if (!worker) {
      return NextResponse.json(
        {
          success: false,
          error: 'Worker not found'
        },
        { status: 404 }
      );
    }

    // Add metrics to worker monitoring
    if (body.metrics) {
      await worker.updateMetrics(body.metrics.data);
    }

    return NextResponse.json({
      success: true,
      message: 'Metrics updated'
    });

  } catch (error) {
    console.error('Error updating metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
