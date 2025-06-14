import axios from "axios";

export interface PageContext {
  url: string;
  title: string;
  description?: string;
  pageType: string;
  elements: {
    links: Array<{ text: string; href: string; visible: boolean }>;
    buttons: Array<{ text: string; type: string; visible: boolean }>;
    forms: Array<{
      action: string;
      fields: Array<{ name: string; type: string; required: boolean }>;
    }>;
    images: Array<{ alt: string; src: string; visible: boolean }>;
    navigation: Array<{ text: string; href: string }>;
  };
  content: {
    headings: string[];
    paragraphs: string[];
    keywords: string[];
  };
}

export interface AIScenarioStep {
  type: "scroll" | "click" | "hover" | "wait" | "type" | "navigate";
  target?: string;
  value?: string;
  duration: number;
  description: string;
  reasoning: string;
  humanLikeness: number; // 1-10 scale
}

export interface AIScenario {
  steps: AIScenarioStep[];
  totalDuration: number;
  description: string;
  intent: string;
  complexity: number;
  humanLikeness: number;
  aiProvider: "chatgpt" | "gemini";
}

export class AIScenarioService {
  private openaiApiKey: string | null = null;
  private geminiApiKey: string | null = null;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || null;
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
  }

  async generateScenario(
    pageContext: PageContext,
    intent?: string,
  ): Promise<AIScenario> {
    const useProvider = this.selectBestProvider();

    console.log(
      `[AI SERVICE] Using ${useProvider} to generate scenario for: ${pageContext.url}`,
    );

    let scenario: AIScenario;

    if (useProvider === "chatgpt" && this.openaiApiKey) {
      scenario = await this.generateWithChatGPT(pageContext, intent);
    } else if (useProvider === "gemini" && this.geminiApiKey) {
      scenario = await this.generateWithGemini(pageContext, intent);
    } else {
      console.warn(
        "[AI SERVICE] No API keys available, falling back to rule-based generation",
      );
      scenario = this.generateFallbackScenario(pageContext, intent);
    }

    return scenario;
  }

  private selectBestProvider(): "chatgpt" | "gemini" {
    // Prefer ChatGPT for complex scenarios, Gemini for faster responses
    if (this.openaiApiKey && this.geminiApiKey) {
      return Math.random() > 0.5 ? "chatgpt" : "gemini";
    }
    if (this.openaiApiKey) {
      return "chatgpt";
    }
    return "gemini";
  }

  private async generateWithChatGPT(
    pageContext: PageContext,
    intent?: string,
  ): Promise<AIScenario> {
    try {
      const prompt = this.buildChatGPTPrompt(pageContext, intent);

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini", // Use more cost-effective model
          messages: [
            {
              role: "system",
              content:
                "You are an expert in web automation and human behavior simulation. Your task is to create realistic browsing scenarios that mimic how real users interact with websites. Focus on natural timing, realistic user goals, and human-like patterns.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      const aiResponse = response.data.choices[0].message.content;
      return this.parseAIResponse(aiResponse, "chatgpt", pageContext);
    } catch (error) {
      console.error("[AI SERVICE] ChatGPT API error:", error);
      return this.generateFallbackScenario(pageContext, intent);
    }
  }

  private async generateWithGemini(
    pageContext: PageContext,
    intent?: string,
  ): Promise<AIScenario> {
    try {
      const prompt = this.buildGeminiPrompt(pageContext, intent);

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      return this.parseAIResponse(aiResponse, "gemini", pageContext);
    } catch (error) {
      console.error("[AI SERVICE] Gemini API error:", error);
      return this.generateFallbackScenario(pageContext, intent);
    }
  }

  private buildChatGPTPrompt(
    pageContext: PageContext,
    intent?: string,
  ): string {
    return `
Analyze this website and create a realistic browsing scenario that mimics human behavior:

**Website Information:**
- URL: ${pageContext.url}
- Title: ${pageContext.title}
- Page Type: ${pageContext.pageType}
- Description: ${pageContext.description || "N/A"}

**Available Elements:**
- Links: ${pageContext.elements.links
      .slice(0, 10)
      .map((l) => l.text)
      .join(", ")}
- Buttons: ${pageContext.elements.buttons
      .slice(0, 5)
      .map((b) => b.text)
      .join(", ")}
- Forms: ${pageContext.elements.forms.length} form(s) available
- Navigation: ${pageContext.elements.navigation
      .slice(0, 5)
      .map((n) => n.text)
      .join(", ")}

**Content Overview:**
- Main headings: ${pageContext.content.headings.slice(0, 3).join(", ")}
- Key topics: ${pageContext.content.keywords.slice(0, 5).join(", ")}

**User Intent:** ${intent || "General browsing and exploration"}

**Task:** Create a JSON response with a realistic browsing scenario. The scenario should:
1. Mimic natural human behavior (reading patterns, exploration, hesitation)
2. Include realistic timing (humans don't click instantly)
3. Show genuine interest in content (scrolling to read, hovering over interesting elements)
4. Include some randomness and imperfection
5. Be appropriate for the page type and user intent

**Required JSON Format:**
{
  "intent": "Description of user's browsing goal",
  "steps": [
    {
      "type": "wait|scroll|click|hover|type",
      "target": "element selector or description",
      "value": "text to type (if applicable)",
      "duration": 2000,
      "description": "What the user is doing",
      "reasoning": "Why a human would do this",
      "humanLikeness": 8
    }
  ],
  "description": "Overall scenario description",
  "complexity": 7,
  "humanLikeness": 8
}

**Important Guidelines:**
- Duration should be realistic (reading = 3-8 seconds, clicking = 1-2 seconds)
- Include natural pauses and reading time
- Add some exploration behaviors (hovering, scrolling back)
- Make it feel like a real person browsing
- Total scenario should be 30-120 seconds
- Include 8-15 steps maximum
`;
  }

  private buildGeminiPrompt(pageContext: PageContext, intent?: string): string {
    return `
Create a realistic web browsing scenario for this page that mimics natural human behavior:

Website: ${pageContext.url}
Title: ${pageContext.title}
Type: ${pageContext.pageType}
Intent: ${intent || "Casual browsing"}

Available elements:
- Links: ${pageContext.elements.links
      .slice(0, 8)
      .map((l) => l.text)
      .join(", ")}
- Buttons: ${pageContext.elements.buttons
      .slice(0, 5)
      .map((b) => b.text)
      .join(", ")}
- Headings: ${pageContext.content.headings.slice(0, 3).join(", ")}

Create a JSON scenario with realistic human browsing patterns including:
- Natural reading times (3-8 seconds)
- Exploration behaviors (scrolling, hovering)
- Realistic click timing (1-2 seconds)
- Some hesitation and backtracking
- 8-12 steps, 30-90 seconds total

Format:
{
  "intent": "user goal",
  "steps": [
    {
      "type": "scroll|click|hover|wait",
      "target": "element description",
      "duration": 3000,
      "description": "user action",
      "reasoning": "why human would do this",
      "humanLikeness": 8
    }
  ],
  "description": "scenario summary",
  "complexity": 6,
  "humanLikeness": 8
}

Make it feel authentic and human-like.
`;
  }

  private parseAIResponse(
    aiResponse: string,
    provider: "chatgpt" | "gemini",
    pageContext: PageContext,
  ): AIScenario {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and enhance the response
      const steps: AIScenarioStep[] = parsed.steps.map((step: any) => ({
        type: step.type || "wait",
        target: step.target,
        value: step.value,
        duration: Math.max(500, Math.min(15000, step.duration || 2000)),
        description: step.description || "User action",
        reasoning: step.reasoning || "Natural browsing behavior",
        humanLikeness: Math.max(1, Math.min(10, step.humanLikeness || 7)),
      }));

      const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

      return {
        steps,
        totalDuration,
        description:
          parsed.description ||
          `AI-generated browsing scenario for ${pageContext.pageType}`,
        intent: parsed.intent || "Browse and explore website content",
        complexity: Math.max(1, Math.min(10, parsed.complexity || 5)),
        humanLikeness: Math.max(1, Math.min(10, parsed.humanLikeness || 7)),
        aiProvider: provider,
      };
    } catch (error) {
      console.error(
        `[AI SERVICE] Failed to parse ${provider} response:`,
        error,
      );
      return this.generateFallbackScenario(pageContext);
    }
  }

  private generateFallbackScenario(
    pageContext: PageContext,
    intent?: string,
  ): AIScenario {
    console.log("[AI SERVICE] Generating fallback rule-based scenario");

    const steps: AIScenarioStep[] = [];

    // Initial wait and page assessment
    steps.push({
      type: "wait",
      duration: this.randomDuration(2000, 4000),
      description: "User lands on page and takes a moment to assess content",
      reasoning:
        "Humans need time to visually process and understand a new page",
      humanLikeness: 9,
    });

    // Scroll to see more content
    steps.push({
      type: "scroll",
      duration: this.randomDuration(3000, 6000),
      description: "Scroll down to explore page content",
      reasoning:
        "Natural exploration behavior to see what content is available",
      humanLikeness: 8,
    });

    // Page-type specific behaviors
    if (pageContext.pageType === "homepage") {
      this.addHomepageBehaviors(steps, pageContext);
    } else if (pageContext.pageType === "article") {
      this.addArticleBehaviors(steps, pageContext);
    } else if (pageContext.pageType === "product") {
      this.addProductBehaviors(steps, pageContext);
    } else if (pageContext.pageType === "search") {
      this.addSearchBehaviors(steps, pageContext);
    } else {
      this.addGenericBehaviors(steps, pageContext);
    }

    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

    return {
      steps,
      totalDuration,
      description: `Rule-based browsing scenario for ${pageContext.pageType}`,
      intent: intent || "Explore and understand website content",
      complexity: 5,
      humanLikeness: 6,
      aiProvider: "chatgpt", // Default fallback
    };
  }

  private addHomepageBehaviors(
    steps: AIScenarioStep[],
    context: PageContext,
  ): void {
    // Look at navigation
    if (context.elements.navigation.length > 0) {
      steps.push({
        type: "hover",
        target: "navigation-menu",
        duration: this.randomDuration(1500, 3000),
        description: "Hover over main navigation to see options",
        reasoning:
          "Users often explore navigation to understand site structure",
        humanLikeness: 8,
      });
    }

    // Check out main content areas
    steps.push({
      type: "scroll",
      duration: this.randomDuration(4000, 7000),
      description: "Scroll through main content sections",
      reasoning:
        "Homepage browsing involves getting an overview of all sections",
      humanLikeness: 8,
    });
  }

  private addArticleBehaviors(
    steps: AIScenarioStep[],
    context: PageContext,
  ): void {
    // Reading behavior - multiple scrolls with pauses
    for (let i = 0; i < 3; i++) {
      steps.push({
        type: "scroll",
        duration: this.randomDuration(3000, 6000),
        description: `Read article content - section ${i + 1}`,
        reasoning:
          "Article reading involves steady scrolling with pauses to read",
        humanLikeness: 9,
      });

      steps.push({
        type: "wait",
        duration: this.randomDuration(5000, 10000),
        description: "Pause to read and comprehend content",
        reasoning: "Humans need time to process and understand written content",
        humanLikeness: 9,
      });
    }
  }

  private addProductBehaviors(
    steps: AIScenarioStep[],
    context: PageContext,
  ): void {
    // Look at product images
    steps.push({
      type: "click",
      target: "product-image",
      duration: this.randomDuration(1500, 3000),
      description: "Click to view product images in detail",
      reasoning: "Visual inspection is crucial for product evaluation",
      humanLikeness: 8,
    });

    // Read product details
    steps.push({
      type: "scroll",
      duration: this.randomDuration(4000, 8000),
      description: "Scroll through product specifications and details",
      reasoning:
        "Buyers need to understand product features and specifications",
      humanLikeness: 8,
    });
  }

  private addSearchBehaviors(
    steps: AIScenarioStep[],
    context: PageContext,
  ): void {
    // Look at search results
    steps.push({
      type: "scroll",
      duration: this.randomDuration(3000, 5000),
      description: "Scroll through search results",
      reasoning: "Users scan search results to find relevant information",
      humanLikeness: 8,
    });
  }

  private addGenericBehaviors(
    steps: AIScenarioStep[],
    context: PageContext,
  ): void {
    // Generic exploration
    steps.push({
      type: "scroll",
      duration: this.randomDuration(3000, 6000),
      description: "Continue exploring page content",
      reasoning: "General exploration to understand page purpose and content",
      humanLikeness: 7,
    });
  }

  private randomDuration(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Helper method to determine page type from URL and title
  static determinePageType(
    url: string,
    title: string,
    elements: any,
  ): string {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    if (
      urlLower === "/" ||
      urlLower.includes("/home") ||
      titleLower.includes("home")
    ) {
      return "homepage";
    }
    if (
      urlLower.includes("/article") ||
      urlLower.includes("/blog") ||
      urlLower.includes("/news")
    ) {
      return "article";
    }
    if (
      urlLower.includes("/product") ||
      urlLower.includes("/item") ||
      titleLower.includes("buy")
    ) {
      return "product";
    }
    if (
      urlLower.includes("/search") ||
      titleLower.includes("search") ||
      elements.forms.length > 0
    ) {
      return "search";
    }
    if (urlLower.includes("/about")) {
      return "about";
    }
    if (urlLower.includes("/contact")) {
      return "contact";
    }

    return "general";
  }
}
