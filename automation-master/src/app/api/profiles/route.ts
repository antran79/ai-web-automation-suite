import { type NextRequest, NextResponse } from 'next/server';
import { FingerprintService, type FingerprintProfile } from '@/services/FingerprintService';

interface CreateProfileRequest {
  name: string;
  description?: string;
  region?: string;
  userAgent?: string;
  viewport?: { width: number; height: number };
  language?: string;
  timezone?: string;
  tags?: string[];
}

interface StoredProfile {
  id: string;
  name: string;
  description?: string;
  profile: FingerprintProfile;
  region?: string;
  tags: string[];
  createdAt: string;
  usageCount: number;
  lastUsed?: string;
}

// Mock storage - in real app this would be in database
const profileStorage: StoredProfile[] = [
  {
    id: '1',
    name: 'US Desktop Chrome',
    description: 'Standard US desktop Chrome profile',
    profile: FingerprintService.generateFingerprintForRegion('us'),
    region: 'us',
    tags: ['desktop', 'chrome', 'us'],
    createdAt: new Date().toISOString(),
    usageCount: 15,
    lastUsed: new Date().toISOString()
  },
  {
    id: '2',
    name: 'EU Mobile Safari',
    description: 'European mobile Safari profile',
    profile: FingerprintService.generateFingerprintForRegion('eu'),
    region: 'eu',
    tags: ['mobile', 'safari', 'eu'],
    createdAt: new Date().toISOString(),
    usageCount: 8,
    lastUsed: new Date().toISOString()
  }
];

export async function POST(request: NextRequest) {
  try {
    const body: CreateProfileRequest = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Profile name is required' },
        { status: 400 }
      );
    }

    console.log(`[PROFILES API] Creating profile: ${body.name}`);

    // Generate fingerprint profile
    let fingerprintProfile: FingerprintProfile;

    if (body.region) {
      fingerprintProfile = FingerprintService.generateFingerprintForRegion(body.region);
    } else {
      fingerprintProfile = FingerprintService.generateRandomFingerprint();
    }

    // Override specific properties if provided
    if (body.userAgent) {
      fingerprintProfile.userAgent = body.userAgent;
    }
    if (body.viewport) {
      fingerprintProfile.viewport = body.viewport;
    }
    if (body.language) {
      fingerprintProfile.language = body.language;
    }
    if (body.timezone) {
      fingerprintProfile.timezone = body.timezone;
    }

    // Create stored profile
    const storedProfile: StoredProfile = {
      id: `profile_${Date.now()}`,
      name: body.name,
      description: body.description,
      profile: fingerprintProfile,
      region: body.region,
      tags: body.tags || [],
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    // Add to storage
    profileStorage.push(storedProfile);

    FingerprintService.logFingerprintInfo(fingerprintProfile);

    return NextResponse.json({
      success: true,
      profile: {
        id: storedProfile.id,
        name: storedProfile.name,
        description: storedProfile.description,
        region: storedProfile.region,
        tags: storedProfile.tags,
        createdAt: storedProfile.createdAt,
        usageCount: storedProfile.usageCount,
        fingerprint: {
          userAgent: fingerprintProfile.userAgent,
          viewport: fingerprintProfile.viewport,
          language: fingerprintProfile.language,
          timezone: fingerprintProfile.timezone,
          platform: fingerprintProfile.platform
        }
      },
      message: 'Profile created successfully'
    });

  } catch (error) {
    console.error('[PROFILES API] Error creating profile:', error);
    return NextResponse.json(
      {
        error: 'Failed to create profile',
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
    const region = searchParams.get('region');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');

    // Filter profiles
    let filteredProfiles = [...profileStorage];

    if (region) {
      filteredProfiles = filteredProfiles.filter(p => p.region === region);
    }

    if (tag) {
      filteredProfiles = filteredProfiles.filter(p => p.tags.includes(tag));
    }

    if (search) {
      filteredProfiles = filteredProfiles.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProfiles = filteredProfiles.slice(startIndex, endIndex);

    // Return summary data (not full fingerprint profiles for performance)
    const profileSummaries = paginatedProfiles.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      region: p.region,
      tags: p.tags,
      createdAt: p.createdAt,
      usageCount: p.usageCount,
      lastUsed: p.lastUsed,
      fingerprint: {
        userAgent: p.profile.userAgent.substring(0, 50) + '...',
        viewport: p.profile.viewport,
        language: p.profile.language,
        timezone: p.profile.timezone,
        platform: p.profile.platform
      }
    }));

    return NextResponse.json({
      success: true,
      profiles: profileSummaries,
      pagination: {
        page,
        limit,
        total: filteredProfiles.length,
        pages: Math.ceil(filteredProfiles.length / limit)
      },
      filters: {
        regions: ['us', 'eu', 'asia'],
        tags: Array.from(new Set(profileStorage.flatMap(p => p.tags)))
      }
    });

  } catch (error) {
    console.error('[PROFILES API] Error fetching profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
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
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    const profileIndex = profileStorage.findIndex(p => p.id === id);

    if (profileIndex === -1) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const deletedProfile = profileStorage.splice(profileIndex, 1)[0];

    return NextResponse.json({
      success: true,
      message: `Profile "${deletedProfile.name}" deleted successfully`
    });

  } catch (error) {
    console.error('[PROFILES API] Error deleting profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    );
  }
}
