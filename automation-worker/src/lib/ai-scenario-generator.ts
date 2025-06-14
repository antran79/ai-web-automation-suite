import axios from "axios";
import { scenarioCache } from "./scenario-cache.js";

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

export class AIScenarioGenerator {
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
    // Check cache first if enabled
    if (process.env.AI_SCENARIO_CACHING === "true") {
      const cached = await scenarioCache.getScenario(pageContext, intent);
      if (cached) {
        console.log(
          `[AI GENERATOR] Using cached scenario for ${pageContext.url}`,
        );
        return cached;
      }
    }

    const useProvider = this.selectBestProvider();

    console.log(
      `[AI GENERATOR] Using ${useProvider} to generate scenario for: ${pageContext.url}`,
    );

    let scenario: AIScenario;

    if (useProvider === "chatgpt" && this.openaiApiKey) {
      scenario = await this.generateWithChatGPT(pageContext, intent);
    } else if (useProvider === "gemini" && this.geminiApiKey) {
      scenario = await this.generateWithGemini(pageContext, intent);
    } else {
      console.warn(
        "[AI GENERATOR] No API keys available, falling back to rule-based generation",
      );
      scenario = this.generateFallbackScenario(pageContext, intent);
    }

    // Cache the generated scenario if enabled
    if (process.env.AI_SCENARIO_CACHING === "true") {
      await scenarioCache.cacheScenario(pageContext, scenario, intent);
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
          model: "gpt-4",
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
      console.error("[AI GENERATOR] ChatGPT API error:", error);
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
      console.error("[AI GENERATOR] Gemini API error:", error);
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
        `[AI GENERATOR] Failed to parse ${provider} response:`,
        error,
      );
      return this.generateFallbackScenario(pageContext);
    }
  }

  private generateFallbackScenario(
    pageContext: PageContext,
    intent?: string,
  ): AIScenario {
    console.log("[AI GENERATOR] Generating fallback rule-based scenario");

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

    // Add some random exploration
    if (Math.random() > 0.6) {
      steps.push({
        type: "scroll",
        duration: this.randomDuration(2000, 4000),
        description: "Scroll back up to re-examine something",
        reasoning: "Users often scroll back to double-check information",
        humanLikeness: 7,
      });
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

    // Maybe click on something interesting
    if (context.elements.links.length > 0 && Math.random() > 0.5) {
      const interestingLink = context.elements.links.find(
        (l) =>
          l.text.includes("about") ||
          l.text.includes("services") ||
          l.text.includes("products"),
      );

      if (interestingLink) {
        steps.push({
          type: "click",
          target: interestingLink.text,
          duration: this.randomDuration(1000, 2000),
          description: `Click on "${interestingLink.text}" link`,
          reasoning: "Users often click on main sections to learn more",
          humanLikeness: 7,
        });
      }
    }
  }

  private addArticleBehaviors(
    steps: AIScenarioStep[],
    _context: PageContext,
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

    // Maybe hover over interesting elements
    if (Math.random() > 0.7) {
      steps.push({
        type: "hover",
        target: "related-articles",
        duration: this.randomDuration(2000, 4000),
        description: "Look at related articles or links",
        reasoning: "Users often check related content for further reading",
        humanLikeness: 7,
      });
    }
  }

  private addProductBehaviors(
    steps: AIScenarioStep[],
    _context: PageContext,
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

    // Check reviews if available
    if (Math.random() > 0.6) {
      steps.push({
        type: "click",
        target: "reviews-tab",
        duration: this.randomDuration(2000, 4000),
        description: "Click to read customer reviews",
        reasoning: "Reviews are important for purchase decisions",
        humanLikeness: 8,
      });
    }

    // Maybe check price or add to cart
    if (Math.random() > 0.8) {
      steps.push({
        type: "hover",
        target: "add-to-cart",
        duration: this.randomDuration(1000, 2000),
        description: "Hover over add to cart button",
        reasoning: "Users often hesitate before making purchase decisions",
        humanLikeness: 7,
      });
    }
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

    // Maybe click on a result
    if (context.elements.links.length > 0 && Math.random() > 0.5) {
      steps.push({
        type: "click",
        target: "search-result",
        duration: this.randomDuration(1000, 2000),
        description: "Click on a search result that looks relevant",
        reasoning:
          "Users click on results that seem to match their search intent",
        humanLikeness: 8,
      });
    }

    // Maybe refine search
    if (Math.random() > 0.7) {
      steps.push({
        type: "click",
        target: "search-box",
        duration: this.randomDuration(1000, 2000),
        description: "Click search box to refine search",
        reasoning:
          "Users often refine searches if initial results are not satisfactory",
        humanLikeness: 7,
      });
    }
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

    // Random interaction
    if (context.elements.links.length > 0 && Math.random() > 0.6) {
      const randomLink =
        context.elements.links[
          Math.floor(Math.random() * Math.min(5, context.elements.links.length))
        ];
      steps.push({
        type: "hover",
        target: randomLink.text,
        duration: this.randomDuration(1500, 3000),
        description: `Hover over "${randomLink.text}" link`,
        reasoning: "Users often hover over links to see where they lead",
        humanLikeness: 6,
      });
    }
  }

  private randomDuration(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Utility method to extract page context from a page
  static async extractPageContext(
    page: any,
    url: string,
  ): Promise<PageContext> {
    try {
      const context = await page.evaluate(() => {
        const title = document.title;
        const description =
          document
            .querySelector('meta[name="description"]')
            ?.getAttribute("content") || "";

        // Extract links
        const links = Array.from(document.querySelectorAll("a"))
          .map((a) => ({
            text: a.textContent?.trim() || "",
            href: a.href,
            visible: a.offsetParent !== null,
          }))
          .filter((l) => l.text && l.href);

        // Extract buttons
        const buttons = Array.from(
          document.querySelectorAll(
            'button, input[type="button"], input[type="submit"]',
          ),
        )
          .map((b) => ({
            text: b.textContent?.trim() || (b as HTMLInputElement).value || "",
            type: (b as HTMLInputElement).type || "button",
            visible: (b as HTMLElement).offsetParent !== null,
          }))
          .filter((b) => b.text);

        // Extract forms
        const forms = Array.from(document.querySelectorAll("form")).map(
          (form) => ({
            action: form.action,
            fields: Array.from(
              form.querySelectorAll("input, textarea, select"),
            ).map((field) => ({
              name: (field as HTMLInputElement).name || "",
              type: (field as HTMLInputElement).type || "text",
              required: (field as HTMLInputElement).required,
            })),
          }),
        );

        // Extract images
        const images = Array.from(document.querySelectorAll("img")).map(
          (img) => ({
            alt: img.alt,
            src: img.src,
            visible: img.offsetParent !== null,
          }),
        );

        // Extract navigation
        const navigation = Array.from(
          document.querySelectorAll("nav a, .nav a, .menu a"),
        )
          .map((a) => ({
            text: a.textContent?.trim() || "",
            href: (a as HTMLAnchorElement).href,
          }))
          .filter((n) => n.text);

        // Extract content
        const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
          .map((h) => h.textContent?.trim() || "")
          .filter((h) => h);
        const paragraphs = Array.from(document.querySelectorAll("p"))
          .map((p) => p.textContent?.trim() || "")
          .filter((p) => p && p.length > 20);

        // Simple keyword extraction
        const allText = document.body.textContent?.toLowerCase() || "";
        const words = allText.split(/\s+/).filter((w) => w.length > 4);
        const wordCount: Record<string, number> = {};
        words.forEach((word) => {
          wordCount[word] = (wordCount[word] || 0) + 1;
        });
        const keywords = Object.entries(wordCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([word]) => word);

        return {
          title,
          description,
          elements: { links, buttons, forms, images, navigation },
          content: { headings, paragraphs, keywords },
        };
      });

      // Determine page type
      const pageType = AIScenarioGenerator.determinePageType(
        url,
        context.title,
        context.elements,
      );

      return {
        url,
        title: context.title,
        description: context.description,
        pageType,
        elements: context.elements,
        content: context.content,
      };
    } catch (error) {
      console.error("[AI GENERATOR] Error extracting page context:", error);
      return {
        url,
        title: "Unknown Page",
        pageType: "unknown",
        elements: {
          links: [],
          buttons: [],
          forms: [],
          images: [],
          navigation: [],
        },
        content: { headings: [], paragraphs: [], keywords: [] },
      };
    }
  }

  private static determinePageType(
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
