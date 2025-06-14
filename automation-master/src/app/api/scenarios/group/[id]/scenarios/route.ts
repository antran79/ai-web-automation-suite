import { type NextRequest, NextResponse } from 'next/server';
import { ScenarioService } from '@/services/ScenarioService';

export async function GET(request: NextRequest, { params }: { params: { id: string }}) {
  const groupId = params.id;
  const scenarios = await ScenarioService.getScenariosInGroup(groupId);
  return NextResponse.json({ success: true, data: scenarios });
}

export async function POST(request: NextRequest, { params }: { params: { id: string }}) {
  const groupId = params.id;
  const body = await request.json();
  if (!body || !groupId) return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  const doc = await ScenarioService.createScenario({ ...body, group: groupId });
  return NextResponse.json({ success: true, data: doc });
}
