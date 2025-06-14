import { type NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import Worker from '@/models/Worker';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const workerId = params.id;
    const worker = await Worker.findOne({ identifier: workerId })
      .select('-security.apiKey'); // Don't expose API key

    if (!worker) {
      return NextResponse.json(
        {
          success: false,
          error: 'Worker not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: worker
    });

  } catch (error) {
    console.error('Error fetching worker:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch worker',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await request.json();
    const workerId = params.id;

    const worker = await Worker.findOneAndUpdate(
      { identifier: workerId },
      {
        ...body,
        'metadata.updatedAt': new Date(),
        'connection.lastSeen': new Date()
      },
      { new: true }
    ).select('-security.apiKey');

    if (!worker) {
      return NextResponse.json(
        {
          success: false,
          error: 'Worker not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: worker
    });

  } catch (error) {
    console.error('Error updating worker:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update worker',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const workerId = params.id;
    const worker = await Worker.findOneAndDelete({ identifier: workerId });

    if (!worker) {
      return NextResponse.json(
        {
          success: false,
          error: 'Worker not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Worker deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting worker:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete worker',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
