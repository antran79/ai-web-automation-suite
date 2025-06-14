import { type NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/services/ProfileService';

export async function GET(request: NextRequest, { params }: { params: { id: string }}) {
  const groupId = params.id;
  const profiles = await ProfileService.getProfilesInGroup(groupId);
  return NextResponse.json({ success: true, data: profiles });
}

export async function POST(request: NextRequest, { params }: { params: { id: string }}) {
  const groupId = params.id;
  const body = await request.json();
  if (!body || !groupId) return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  if (Array.isArray(body)) {
    // batch
    const docs = [];
    for (const profile of body) {
      const doc = await ProfileService.createProfile({ ...profile, group: groupId });
      docs.push(doc);
    }
    return NextResponse.json({ success: true, data: docs });
  } else {
    // single
    const doc = await ProfileService.createProfile({ ...body, group: groupId });
    return NextResponse.json({ success: true, data: doc });
  }
}
