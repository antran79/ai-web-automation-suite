import { type NextRequest, NextResponse } from 'next/server';
import { ScenarioService } from '@/services/ScenarioService';

export async function GET() {
  const domains = await ScenarioService.getDomains();
  return NextResponse.json({ success: true, data: domains });
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  if (!data.domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 });
  const doc = await ScenarioService.createDomain(data);
  return NextResponse.json({ success: true, data: doc });
}
