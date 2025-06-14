import { type NextRequest, NextResponse } from 'next/server';
import { ScenarioService } from '@/services/ScenarioService';

export async function GET(request: NextRequest) {
  const domainId = request.nextUrl.searchParams.get('domainId');
  if (!domainId) return NextResponse.json({ error: 'Missing domainId' }, { status: 400 });
  const groups = await ScenarioService.getScenarioGroups(domainId);
  return NextResponse.json({ success: true, data: groups });
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  if (!data.name || !data.domain) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const doc = await ScenarioService.createScenarioGroup(data);
  return NextResponse.json({ success: true, data: doc });
}
