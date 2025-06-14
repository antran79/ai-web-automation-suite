import { type NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import ProxyModel from '@/models/Proxy';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const protocol = searchParams.get('protocol');
    const country = searchParams.get('country');
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '20');

    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (protocol) {
      query.protocol = protocol;
    }
    if (country) {
      query['quality.location.country'] = country;
    }

    const skip = (page - 1) * limit;

    const [proxies, total] = await Promise.all([
      ProxyModel.find(query)
        .sort({ 'quality.reliability': -1, 'monitoring.lastCheck': -1 })
        .skip(skip)
        .limit(limit)
        .select('-authentication.password') // Don't expose passwords
        .exec(),
      ProxyModel.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        proxies,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching proxies:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch proxies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validate required fields
    if (!body.host || !body.port || !body.protocol) {
      return NextResponse.json(
        {
          success: false,
          error: 'Host, port, and protocol are required'
        },
        { status: 400 }
      );
    }

    // Check if proxy already exists
    const existingProxy = await ProxyModel.findOne({
      host: body.host,
      port: body.port
    });

    if (existingProxy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Proxy with this host and port already exists'
        },
        { status: 409 }
      );
    }

    const proxy = new ProxyModel({
      name: body.name,
      host: body.host,
      port: body.port,
      protocol: body.protocol,
      authentication: body.authentication,
      quality: {
        speed: 0,
        reliability: 0,
        anonymity: body.anonymity || 'anonymous',
        location: body.location
      },
      limits: {
        maxConcurrentConnections: body.maxConcurrentConnections || 10,
        maxRequestsPerHour: body.maxRequestsPerHour || 100,
        maxRequestsPerDay: body.maxRequestsPerDay || 1000,
        rotationInterval: body.rotationInterval
      },
      provider: body.provider,
      metadata: {
        addedBy: body.addedBy || 'admin',
        tags: body.tags || [],
        notes: body.notes
      }
    });

    await proxy.save();

    // Test the proxy connection
    try {
      await proxy.testConnection();
    } catch (error) {
      console.log('Initial proxy test failed:', error);
    }

    return NextResponse.json({
      success: true,
      data: proxy
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating proxy:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create proxy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
