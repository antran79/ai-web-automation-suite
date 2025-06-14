import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Master node is running',
    timestamp: new Date().toISOString(),
    services: {
      ai: !!process.env.OPENAI_API_KEY || !!process.env.GEMINI_API_KEY,
      database: !!process.env.MONGODB_URI,
      redis: !!process.env.REDIS_URL
    }
  });
}
