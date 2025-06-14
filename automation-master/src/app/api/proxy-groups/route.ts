import { type NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import ProxyGroup, { type IProxyGroup } from '@/models/ProxyGroup';
import ProxyModel from '@/models/Proxy';

export async function GET(request: NextRequest) {
  try {
    console.log('[PROXY GROUPS API] Fetching proxy groups');

    // Return mock data for development (MongoDB disabled)
    const mockGroups = [
      {
        _id: '1',
        name: 'Residential Group A',
        description: 'High-quality residential proxies for e-commerce',
        category: 'residential',
        provider: {
          name: 'ProxyProvider Inc',
          plan: 'Premium',
          cost: 299,
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        configuration: {
          rotationInterval: 30,
          maxConcurrentUsage: 100,
          healthCheckInterval: 15,
          autoRemoveFailedProxies: false,
          loadBalancing: 'performance',
          preferredCountries: ['US', 'CA', 'UK'],
          blacklistedCountries: []
        },
        limits: {
          maxProxiesPerGroup: 10000,
          maxRequestsPerHour: 100000,
          maxRequestsPerDay: 1000000,
          cooldownPeriod: 5
        },
        stats: {
          totalProxies: 1000,
          activeProxies: 950,
          inactiveProxies: 30,
          failedProxies: 15,
          bannedProxies: 5,
          totalRequests: 50000,
          successfulRequests: 48500,
          failedRequests: 1500,
          avgResponseTime: 450,
          avgReliability: 97.0,
          lastHealthCheck: new Date()
        },
        access: {
          allowedWorkers: [],
          allowedProjects: [],
          priority: 8,
          isPublic: true
        },
        metadata: {
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          createdBy: 'admin',
          tags: ['premium', 'residential', 'fast'],
          notes: 'Main residential proxy pool for high-priority tasks',
          isActive: true
        }
      },
      {
        _id: '2',
        name: 'Datacenter Group B',
        description: 'Fast datacenter proxies for general automation',
        category: 'datacenter',
        provider: {
          name: 'DataCenter Solutions',
          plan: 'Standard',
          cost: 149,
          renewalDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        },
        configuration: {
          rotationInterval: 15,
          maxConcurrentUsage: 200,
          healthCheckInterval: 10,
          autoRemoveFailedProxies: true,
          loadBalancing: 'round-robin',
          preferredCountries: ['US', 'DE', 'NL'],
          blacklistedCountries: ['CN', 'RU']
        },
        limits: {
          maxProxiesPerGroup: 5000,
          maxRequestsPerHour: 50000,
          maxRequestsPerDay: 500000,
          cooldownPeriod: 3
        },
        stats: {
          totalProxies: 1000,
          activeProxies: 890,
          inactiveProxies: 80,
          failedProxies: 25,
          bannedProxies: 5,
          totalRequests: 75000,
          successfulRequests: 71250,
          failedRequests: 3750,
          avgResponseTime: 180,
          avgReliability: 95.0,
          lastHealthCheck: new Date()
        },
        access: {
          allowedWorkers: [],
          allowedProjects: [],
          priority: 6,
          isPublic: true
        },
        metadata: {
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          createdBy: 'admin',
          tags: ['datacenter', 'fast', 'general'],
          notes: 'General purpose datacenter proxies',
          isActive: true
        }
      }
    ];

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Filter groups
    let filteredGroups = [...mockGroups];

    if (category) {
      filteredGroups = filteredGroups.filter(g => g.category === category);
    }

    if (search) {
      filteredGroups = filteredGroups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedGroups = filteredGroups.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      groups: paginatedGroups,
      pagination: {
        page,
        limit,
        total: filteredGroups.length,
        pages: Math.ceil(filteredGroups.length / limit)
      },
      categories: ['residential', 'datacenter', 'mobile', 'static', 'rotating', 'custom'],
      mock: true
    });

  } catch (error) {
    console.error('[PROXY GROUPS API] Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proxy groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    console.log(`[PROXY GROUPS API] Creating group: ${body.name}`);

    // For now, simulate group creation
    const newGroup = {
      _id: Date.now().toString(),
      name: body.name,
      description: body.description || '',
      category: body.category,
      provider: body.provider || {},
      configuration: {
        rotationInterval: body.configuration?.rotationInterval || 30,
        maxConcurrentUsage: body.configuration?.maxConcurrentUsage || 100,
        healthCheckInterval: body.configuration?.healthCheckInterval || 15,
        autoRemoveFailedProxies: body.configuration?.autoRemoveFailedProxies || false,
        loadBalancing: body.configuration?.loadBalancing || 'performance',
        preferredCountries: body.configuration?.preferredCountries || [],
        blacklistedCountries: body.configuration?.blacklistedCountries || []
      },
      limits: {
        maxProxiesPerGroup: body.limits?.maxProxiesPerGroup || 10000,
        maxRequestsPerHour: body.limits?.maxRequestsPerHour || 100000,
        maxRequestsPerDay: body.limits?.maxRequestsPerDay || 1000000,
        cooldownPeriod: body.limits?.cooldownPeriod || 5
      },
      stats: {
        totalProxies: 0,
        activeProxies: 0,
        inactiveProxies: 0,
        failedProxies: 0,
        bannedProxies: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        avgReliability: 0,
        lastHealthCheck: new Date()
      },
      access: {
        allowedWorkers: body.access?.allowedWorkers || [],
        allowedProjects: body.access?.allowedProjects || [],
        priority: body.access?.priority || 5,
        isPublic: body.access?.isPublic !== false
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: body.createdBy || 'system',
        tags: body.tags || [],
        notes: body.notes || '',
        isActive: true
      }
    };

    return NextResponse.json({
      success: true,
      group: newGroup,
      message: 'Proxy group created successfully'
    });

  } catch (error) {
    console.error('[PROXY GROUPS API] Error creating group:', error);
    return NextResponse.json(
      {
        error: 'Failed to create proxy group',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    console.log(`[PROXY GROUPS API] Deleting group: ${id}`);

    // For now, simulate deletion
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({
      success: true,
      message: 'Proxy group deleted successfully'
    });

  } catch (error) {
    console.error('[PROXY GROUPS API] Error deleting group:', error);
    return NextResponse.json(
      { error: 'Failed to delete proxy group' },
      { status: 500 }
    );
  }
}
