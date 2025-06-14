import { type NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/services/ProfileService';

export async function GET() {
  const data = await ProfileService.getGroups();
  return NextResponse.json({ success: true, data });
}
export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  const doc = await ProfileService.createGroup(body);
  return NextResponse.json({ success: true, data: doc });
}
