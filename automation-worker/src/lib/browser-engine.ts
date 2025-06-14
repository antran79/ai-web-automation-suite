import puppeteer, { type Browser, type Page } from "puppeteer";
import { addExtra } from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Page Context Interface
export interface PageContext {
  url: string;
  title: string;
  forms: Array<{
    id?: string;
    action?: string;
    method?: string;
    inputs: Array<{
      type: string;
      name?: string;
      id?: string;
      placeholder?: string;
      required?: boolean;
    }>;
  }>;
  buttons: Array<{
    text: string;
    type?: string;
    id?: string;
    className?: string;
  }>;
  links: Array<{
    text: string;
    href: string;
  }>;
}

// Import types only, no longer generating locally
export interface AIScenario {
  steps: AIScenarioStep[];
  totalDuration: number;
  description: string;
  intent: string;
  complexity: number;
  humanLikeness: number;
  aiProvider: "chatgpt" | "gemini";
}

export interface AIScenarioStep {
  type: "scroll" | "click" | "hover" | "wait" | "type" | "navigate";
  target?: string;
  value?: string;
  duration: number;
  description: string;
  reasoning: string;
  humanLikeness: number;
}

export interface FingerprintProfile {
  userAgent: string;
  viewport: { width: number; height: number };
  screen: { width: number; height: number; colorDepth: number };
  timezone: string;
  language: string;
  platform: string;
  webgl: {
    vendor: string;
    renderer: string;
  };
  canvas: {
    fingerprint: string;
  };
  audio: {
    fingerprint: string;
  };
  fonts: string[];
  plugins: Array<{ name: string; filename: string; description: string }>;
  hardwareConcurrency: number;
  deviceMemory: number;
}

// Add stealth plugin to puppeteer
const puppeteerStealth = addExtra(puppeteer);
puppeteerStealth.use(StealthPlugin());

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: "http" | "https" | "socks4" | "socks5";
}

export interface AutomationScenario {
  steps: AutomationStep[];
  totalDuration: number;
  description: string;
}

export interface AutomationStep {
  type:
    | "navigate"
    | "click"
    | "type"
    | "scroll"
    | "wait"
    | "screenshot"
    | "hover";
  target?: string;
  value?: string;
  duration?: number;
  description: string;
}

export interface PageInfo {
  title: string;
  url: string;
  elementCount: number;
}

export interface BrowserConfig {
  headless?: boolean;
  proxy?: ProxyConfig;
  viewport?: { width: number; height: number };
  userAgent?: string;
  executablePath?: string;
  fingerprintProfile?: FingerprintProfile;
  fingerprintScript?: string; // Pre-generated fingerprint script from master
  aiScenario?: AIScenario; // Pre-generated AI scenario from master
}

export interface ExecutionResult {
  success: boolean;
  screenshot?: string;
  logs: string[];
  errors: string[];
  metrics: {
    elementsFound: number;
    actionsPerformed: number;
    errorsEncountered: number;
    pageLoadTime: number;
    executionTime: number;
  };
  fingerprintProfile?: FingerprintProfile;
  aiScenario?: AIScenario;
  pageContext?: PageContext;
}

export class BrowserEngine {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private logs: string[] = [];
  private errors: string[] = [];
  private config: BrowserConfig;
  private fingerprintProfile: FingerprintProfile | null = null;

  constructor(config: BrowserConfig = {}) {
    this.config = {
      headless: true,
      viewport: { width: 1366, height: 768 },
      ...config,
    };
  }

  async initialize(): Promise<void> {
    try {
      this.log("Initializing browser engine...");

      const launchOptions: any = {
        headless: this.config.headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
        ],
      };

      // Add proxy configuration if provided
      if (this.config.proxy) {
        const proxyUrl = `${this.config.proxy.protocol}://${this.config.proxy.host}:${this.config.proxy.port}`;
        launchOptions.args.push(`--proxy-server=${proxyUrl}`);
      }

      // Use custom executable path if provided
      if (this.config.executablePath) {
        launchOptions.executablePath = this.config.executablePath;
      }

      // Launch browser with stealth
      this.browser = await puppeteerStealth.launch(launchOptions);
      this.page = await this.browser.newPage();

      // Apply fingerprint from master node if provided
      if (this.config.fingerprintProfile) {
        this.fingerprintProfile = this.config.fingerprintProfile;
        console.log('[WORKER] Applying fingerprint profile from master node');
      }

      // Apply fingerprint script from master if provided
      if (this.config.fingerprintScript) {
        await this.page.evaluateOnNewDocument(this.config.fingerprintScript);
        console.log('[WORKER] Applied fingerprint script from master');
      }

      // Set custom user agent if provided
      if (this.config.userAgent) {
        await this.page.setUserAgent(this.config.userAgent);
      }

      // Set viewport
      if (this.config.viewport) {
        await this.page.setViewport(this.config.viewport);
      }

      // Set up proxy authentication if needed
      if (this.config.proxy?.username && this.config.proxy.password) {
        await this.page.authenticate({
          username: this.config.proxy.username,
          password: this.config.proxy.password,
        });
      }

      this.log("Browser engine initialized successfully");
    } catch (error) {
      this.error(`Failed to initialize browser: ${error}`);
      throw error;
    }
  }

  async analyzeAndExecute(url: string): Promise<ExecutionResult> {
    if (!this.page) throw new Error("Browser not initialized");

    try {
      // Navigate to the page first
      await this.navigateToUrl(url);

      // Extract page context for AI analysis
      // Use AI scenario from master node if provided
      if (this.config.aiScenario) {
        this.log("Executing AI scenario from master node...");
        console.log(
          `[WORKER] AI Scenario: ${this.config.aiScenario.steps.length} steps, ${this.config.aiScenario.totalDuration}ms total, provider: ${this.config.aiScenario.aiProvider}`,
        );
        console.log(`[WORKER] Scenario Intent: ${this.config.aiScenario.intent}`);
        console.log(
          `[WORKER] Human Likeness: ${this.config.aiScenario.humanLikeness}/10`,
        );

        // Execute the AI scenario from master
        const result = await this.executeAIScenario(this.config.aiScenario);

        return {
          ...result,
          aiScenario: this.config.aiScenario,
        };
      } else {
        // Execute basic scenario if no AI scenario provided
        this.log("No AI scenario provided from master, executing basic automation...");
        return await this.executeBasicScenario(url);
      }
    } catch (error) {
      this.error(`Analysis and execution failed: ${error}`);
      throw error;
    }
  }

  private async executeAIScenario(
    scenario: AIScenario,
  ): Promise<ExecutionResult> {
    if (!this.page) throw new Error("Browser not initialized");

    const startTime = Date.now();
    let actionsPerformed = 0;
    let errorsEncountered = 0;

    this.log(`Starting AI scenario: ${scenario.description}`);
    this.log(`Scenario intent: ${scenario.intent}`);

    for (const [index, step] of scenario.steps.entries()) {
      try {
        this.log(`[${index + 1}/${scenario.steps.length}] ${step.description}`);
        console.log(
          `[AI STEP] ${step.type.toUpperCase()}: ${step.description} (${step.duration}ms) - ${step.reasoning}`,
        );

        await this.executeAIStep(step);
        actionsPerformed++;

        // Log human likeness score for this step
        if (step.humanLikeness >= 8) {
          this.log(
            `High human-likeness step completed (${step.humanLikeness}/10)`,
          );
        }
      } catch (error) {
        errorsEncountered++;
        this.error(`AI step failed: ${step.description} - ${error}`);

        // For AI scenarios, continue with other steps even if one fails
        console.log("[AI STEP] Continuing with next step despite error");
      }
    }

    const executionTime = Date.now() - startTime;
    this.log(
      `AI scenario completed in ${executionTime}ms (planned: ${scenario.totalDuration}ms)`,
    );

    // Take final screenshot
    const screenshot = await this.takeScreenshot();

    // Count elements found
    const elementsFound = await this.page.$$eval(
      "*",
      (elements) => elements.length,
    );

    return {
      success: errorsEncountered === 0,
      screenshot,
      logs: [...this.logs],
      errors: [...this.errors],
      metrics: {
        elementsFound,
        actionsPerformed,
        errorsEncountered,
        pageLoadTime: 0,
        executionTime,
      },
      fingerprintProfile: this.fingerprintProfile || undefined,
    };
  }

  private async executeAIStep(step: any): Promise<void> {
    if (!this.page) return;

    switch (step.type) {
      case "wait":
        await new Promise((resolve) => setTimeout(resolve, step.duration));
        break;

      case "scroll":
        await this.executeAIScroll(step);
        break;

      case "click":
        if (step.target) {
          await this.executeAIClick(step);
        }
        break;

      case "hover":
        if (step.target) {
          await this.executeAIHover(step);
        }
        break;

      case "type":
        if (step.target && step.value) {
          await this.executeAIType(step);
        }
        break;

      case "navigate":
        if (step.value) {
          await this.navigateToUrl(step.value);
        }
        break;
    }

    // Add natural random delay after each action (AI scenarios include this)
    const extraDelay = Math.random() * 500 + 200;
    await new Promise((resolve) => setTimeout(resolve, extraDelay));
  }

  private async executeAIScroll(step: any): Promise<void> {
    if (!this.page) return;

    // AI-enhanced scrolling with more natural behavior
    const scrollSteps = Math.max(3, Math.floor(step.duration / 1000));
    const stepDelay = step.duration / scrollSteps;

    for (let i = 0; i < scrollSteps; i++) {
      // Variable scroll amounts for more natural behavior
      const scrollAmount = 150 + Math.random() * 400;

      await this.page.evaluate((amount) => {
        window.scrollBy({
          top: amount,
          behavior: "smooth",
        });
      }, scrollAmount);

      // Variable delays between scrolls
      const delay = stepDelay + (Math.random() - 0.5) * stepDelay * 0.3;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  private async executeAIClick(step: any): Promise<void> {
    if (!this.page) return;

    try {
      // Enhanced element finding for AI scenarios
      const target = step.target.toLowerCase();

      // Try to find element by various strategies
      let element = null;

      // Strategy 1: Direct selector
      try {
        element = await this.page.$(step.target);
      } catch {}

      // Strategy 2: Text content matching
      if (!element) {
        try {
          element = await this.page.evaluateHandle((text) => {
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              null
            );

            let node;
            while ((node = walker.nextNode())) {
              const parentElement = node.parentElement;
              if (
                parentElement &&
                (parentElement.tagName === "A" ||
                  parentElement.tagName === "BUTTON" ||
                  parentElement.onclick ||
                  parentElement.getAttribute("role") === "button") &&
                node.textContent?.toLowerCase().includes(text.toLowerCase())
              ) {
                return parentElement;
              }
            }
            return null;
          }, target);

          // Check if element is valid
          try {
            const isValid = await element.asElement();
            if (!isValid) {
              element = null;
            }
          } catch {
            element = null;
          }
        } catch {}
      }

      // Strategy 3: Attribute matching
      if (!element && (target.includes("nav") || target.includes("menu"))) {
        try {
          element = await this.page.$(
            'nav a, .nav a, .menu a, [role="navigation"] a',
          );
        } catch {}
      }

      if (element) {
        // Natural mouse movement and click
        const box = await (element as any).boundingBox();
        if (box) {
          // Add some randomness to click position
          const x =
            box.x +
            box.width / 2 +
            (Math.random() - 0.5) * Math.min(box.width * 0.3, 20);
          const y =
            box.y +
            box.height / 2 +
            (Math.random() - 0.5) * Math.min(box.height * 0.3, 20);

          // Move mouse naturally
          await this.page.mouse.move(x, y, { steps: 10 });

          // Brief pause before clicking (human-like hesitation)
          await new Promise((resolve) =>
            setTimeout(resolve, 100 + Math.random() * 300),
          );

          await this.page.mouse.click(x, y);

          this.log(`Successfully clicked on element: ${step.target}`);
        }
      } else {
        // If element not found, just scroll a bit (recover gracefully)
        await this.page.evaluate(() => {
          window.scrollBy(0, 200 + Math.random() * 200);
        });
        this.log(`Element not found: ${step.target}, performed scroll instead`);
      }
    } catch (error) {
      this.log(`Click failed for ${step.target}: ${error}`);
    }
  }

  private async executeAIHover(step: any): Promise<void> {
    if (!this.page) return;

    try {
      // Similar element finding strategy as click
      let element = await this.page.$(step.target);

      if (!element && step.target.includes("nav")) {
        element = await this.page.$('nav, .nav, .menu, [role="navigation"]');
      }

      if (element) {
        const box = await element.boundingBox();
        if (box) {
          const x = box.x + box.width / 2 + (Math.random() - 0.5) * 10;
          const y = box.y + box.height / 2 + (Math.random() - 0.5) * 10;

          await this.page.mouse.move(x, y, { steps: 8 });

          // Hold hover for the specified duration
          await new Promise((resolve) => setTimeout(resolve, step.duration));

          this.log(`Hovered over element: ${step.target}`);
        }
      }
    } catch (error) {
      this.log(`Hover failed for ${step.target}: ${error}`);
    }
  }

  private async executeAIType(step: any): Promise<void> {
    if (!this.page) return;

    try {
      // Try to find input field
      let input = await this.page.$(step.target);

      if (!input) {
        input = await this.page.$(
          'input[type="text"], input[type="search"], textarea',
        );
      }

      if (input) {
        await input.focus();

        // Natural typing with variable delays
        const text = step.value;
        for (const char of text) {
          await input.type(char, {
            delay: 80 + Math.random() * 120, // Variable typing speed
          });
        }

        this.log(`Typed "${text}" into ${step.target}`);
      }
    } catch (error) {
      this.log(`Type failed for ${step.target}: ${error}`);
    }
  }

  private async executeBasicScenario(_url: string): Promise<ExecutionResult> {
    // Basic scenario when no AI scenario is provided from master
    this.log("Executing basic automation scenario...");

    const startTime = Date.now();

    // Basic browsing behavior
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await this.naturalScroll(4000);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const executionTime = Date.now() - startTime;
    const screenshot = await this.takeScreenshot();
    const elementsFound = await this.page?.$eval(
      "*",
      (elements) => elements.length,
    );

    return {
      success: true,
      screenshot,
      logs: [...this.logs],
      errors: [...this.errors],
      metrics: {
        elementsFound: elementsFound || 0,
        actionsPerformed: 2,
        errorsEncountered: 0,
        pageLoadTime: 0,
        executionTime,
      },
      fingerprintProfile: this.fingerprintProfile || undefined,
    };
  }

  // Update the existing executeScenario method to include AI features
  async executeScenario(
    scenario: AutomationScenario,
  ): Promise<ExecutionResult> {
    // This maintains backward compatibility with the original interface
    if (!this.page) throw new Error("Browser not initialized");

    const startTime = Date.now();
    let actionsPerformed = 0;
    let errorsEncountered = 0;

    this.log(`Starting scenario: ${scenario.description}`);

    for (const step of scenario.steps) {
      try {
        await this.executeStep(step);
        actionsPerformed++;
        this.log(`Completed step: ${step.description}`);
      } catch (error) {
        errorsEncountered++;
        this.error(`Failed step: ${step.description} - ${error}`);
      }
    }

    const executionTime = Date.now() - startTime;
    this.log(`Scenario completed in ${executionTime}ms`);

    const screenshot = await this.takeScreenshot();
    const elementsFound = await this.page.$$eval(
      "*",
      (elements) => elements.length,
    );

    return {
      success: errorsEncountered === 0,
      screenshot,
      logs: [...this.logs],
      errors: [...this.errors],
      metrics: {
        elementsFound,
        actionsPerformed,
        errorsEncountered,
        pageLoadTime: 0,
        executionTime,
      },
      fingerprintProfile: this.fingerprintProfile || undefined,
    };
  }

  async navigateToUrl(url: string): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    try {
      this.log(`Navigating to: ${url}`);

      await this.page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait for page to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 2000));

      this.log(`Successfully navigated to: ${url}`);
    } catch (error) {
      this.error(`Failed to navigate to ${url}: ${error}`);
      throw error;
    }
  }

  async getPageInfo(): Promise<PageInfo> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    try {
      const info = await this.page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          elementCount: document.querySelectorAll("*").length,
        };
      });

      return info;
    } catch (error) {
      this.error(`Failed to get page info: ${error}`);
      throw error;
    }
  }

  async takeScreenshot(fullPage = false): Promise<string> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    try {
      const screenshot = await this.page.screenshot({
        encoding: "base64",
        fullPage,
      });

      this.log("Screenshot captured successfully");
      return screenshot as string;
    } catch (error) {
      this.error(`Failed to take screenshot: ${error}`);
      throw error;
    }
  }

  async naturalScroll(duration = 3000): Promise<void> {
    if (!this.page) return;

    const scrollSteps = Math.max(3, Math.floor(duration / 1000));
    const stepDelay = duration / scrollSteps;

    for (let i = 0; i < scrollSteps; i++) {
      const scrollAmount = 150 + Math.random() * 400;

      await this.page.evaluate((amount) => {
        window.scrollBy({
          top: amount,
          behavior: "smooth",
        });
      }, scrollAmount);

      const delay = stepDelay + (Math.random() - 0.5) * stepDelay * 0.3;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.log(`Natural scroll completed over ${duration}ms`);
  }

  async executeStep(step: AutomationStep): Promise<void> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    this.log(`Executing step: ${step.description}`);

    try {
      switch (step.type) {
        case "navigate":
          if (step.value) {
            await this.navigateToUrl(step.value);
          }
          break;

        case "click":
          if (step.target) {
            await this.page.click(step.target);
          }
          break;

        case "type":
          if (step.target && step.value) {
            await this.page.type(step.target, step.value);
          }
          break;

        case "scroll":
          await this.naturalScroll(step.duration || 3000);
          break;

        case "wait":
          await new Promise(resolve => setTimeout(resolve, step.duration || 1000));
          break;

        case "screenshot":
          await this.takeScreenshot();
          break;

        case "hover":
          if (step.target) {
            await this.page.hover(step.target);
          }
          break;

        default:
          this.log(`Unknown step type: ${step.type}`);
      }

      // Add natural delay after each action
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 800));
    } catch (error) {
      this.error(`Step execution failed: ${step.description} - ${error}`);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      this.log("Browser closed successfully");
    } catch (error) {
      this.error(`Failed to close browser: ${error}`);
    }
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    this.logs.push(logMessage);

    if (process.env.DEBUG === "true") {
      console.log(`[BROWSER] ${message}`);
    }
  }

  private error(message: string): void {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message}`;
    this.errors.push(errorMessage);
    console.error(`[BROWSER] ${message}`);
  }

  // Getter methods for logs and errors
  getLogs(): string[] {
    return [...this.logs];
  }

  getErrors(): string[] {
    return [...this.errors];
  }
}
