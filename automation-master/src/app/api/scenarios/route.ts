import { type NextRequest, NextResponse } from 'next/server';
import { AIScenarioService, type PageContext, type AIScenario } from '@/services/AIScenarioService';

interface BatchScenarioRequest {
  url: string;
  count: number;
  intent: string;
  requirements?: string[];
  pageType?: string;
  complexity?: number;
  provider?: 'chatgpt' | 'gemini' | 'auto';
}

const aiService = new AIScenarioService();

export async function POST(request: NextRequest) {
  try {
    const body: BatchScenarioRequest = await request.json();

    // Validate required fields
    if (!body.url || !body.count || body.count < 1 || body.count > 10) {
      return NextResponse.json(
        { error: 'Invalid request. URL required and count must be between 1-10' },
        { status: 400 }
      );
    }

    console.log(`[SCENARIOS API] Generating ${body.count} scenarios for ${body.url}`);

    // Create base page context
    const pageContext: PageContext = {
      url: body.url,
      title: "Website Analysis",
      pageType: body.pageType || "general",
      elements: {
        links: [],
        buttons: [],
        forms: [],
        images: [],
        navigation: []
      },
      content: {
        headings: [],
        paragraphs: [],
        keywords: []
      }
    };

    const scenarios: AIScenario[] = [];
    const errors: string[] = [];

    // Generate multiple scenarios with variations
    for (let i = 0; i < body.count; i++) {
      try {
        // Add variation to intent for diversity
        const variedIntent = body.intent + (i > 0 ? ` - Variation ${i + 1}` : '');

        const scenario = await aiService.generateScenario(pageContext, variedIntent);

        scenarios.push({
          ...scenario,
          description: `${scenario.description} (Scenario ${i + 1}/${body.count})`
        });

        // Add small delay between generations to avoid rate limiting
        if (i < body.count - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        const errorMsg = `Failed to generate scenario ${i + 1}: ${error}`;
        console.error('[SCENARIOS API]', errorMsg);
        errors.push(errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      scenarios,
      errors,
      summary: {
        total: body.count,
        generated: scenarios.length,
        failed: errors.length,
        url: body.url,
        intent: body.intent
      }
    });

  } catch (error) {
    console.error('[SCENARIOS API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate scenarios',
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
    const url = searchParams.get('url');
    const provider = searchParams.get('provider');

    // For now, return mock data since we don't have a database storage for scenarios
    // In a real implementation, you'd fetch from database
    const mockScenarios = [
      {
        id: '1',
        url: 'https://example.com',
        intent: 'Browse and explore website',
        createdAt: new Date().toISOString(),
        provider: 'chatgpt',
        steps: 8,
        duration: 45000,
        complexity: 7,
        humanLikeness: 8
      },
      {
        id: '2',
        url: 'https://shop.example.com',
        intent: 'Find and purchase product',
        createdAt: new Date().toISOString(),
        provider: 'gemini',
        steps: 12,
        duration: 67000,
        complexity: 6,
        humanLikeness: 9
      }
    ];

    // Filter by URL if provided
    const filteredScenarios = url
      ? mockScenarios.filter(s => s.url.includes(url))
      : mockScenarios;

    return NextResponse.json({
      success: true,
      scenarios: filteredScenarios,
      pagination: {
        page,
        limit,
        total: filteredScenarios.length,
        pages: Math.ceil(filteredScenarios.length / limit)
      }
    });

  } catch (error) {
    console.error('[SCENARIOS API] Error fetching scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}
