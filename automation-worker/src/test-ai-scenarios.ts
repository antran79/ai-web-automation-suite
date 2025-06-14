import "dotenv/config";
import { AIScenarioGenerator } from "./lib/ai-scenario-generator.js";
import { BrowserEngine } from "./lib/browser-engine.js";
import { scenarioCache } from "./lib/scenario-cache.js";

async function testAIScenarios(): Promise<void> {
  console.log("🧪 Testing AI Scenario Generation System");
  console.log("=".repeat(50));

  // Initialize scenario cache
  await scenarioCache.initialize();

  // Test URLs
  const testUrls = [
    "https://example.com",
    "https://news.ycombinator.com",
    "https://github.com",
    "https://wikipedia.org",
  ];

  const browser = new BrowserEngine({
    headless: true,
    randomizeFingerprint: true,
    useAIScenarios: true,
    userIntent: "Explore the website and understand its content",
  });

  try {
    await browser.initialize();

    for (const url of testUrls) {
      console.log(`\n🌐 Testing URL: ${url}`);
      console.log("-".repeat(40));

      try {
        // Test the full AI analyze and execute pipeline
        const result = await browser.analyzeAndExecute(url);

        console.log("✅ Execution completed successfully");
        console.log("📊 Metrics:");
        console.log(`   - Elements found: ${result.metrics.elementsFound}`);
        console.log(
          `   - Actions performed: ${result.metrics.actionsPerformed}`,
        );
        console.log(
          `   - Errors encountered: ${result.metrics.errorsEncountered}`,
        );
        console.log(`   - Execution time: ${result.metrics.executionTime}ms`);

        if (result.aiScenario) {
          console.log("🤖 AI Scenario Details:");
          console.log(`   - Steps: ${result.aiScenario.steps.length}`);
          console.log(
            `   - Total duration: ${result.aiScenario.totalDuration}ms`,
          );
          console.log(
            `   - Human likeness: ${result.aiScenario.humanLikeness}/10`,
          );
          console.log(`   - Complexity: ${result.aiScenario.complexity}/10`);
          console.log(`   - Provider: ${result.aiScenario.aiProvider}`);
          console.log(`   - Intent: ${result.aiScenario.intent}`);
        }

        if (result.fingerprintProfile) {
          console.log("🔐 Fingerprint Applied:");
          console.log(`   - Platform: ${result.fingerprintProfile.platform}`);
          console.log(
            `   - Viewport: ${result.fingerprintProfile.viewport.width}x${result.fingerprintProfile.viewport.height}`,
          );
          console.log(`   - Timezone: ${result.fingerprintProfile.timezone}`);
        }

        if (result.pageContext) {
          console.log("📄 Page Analysis:");
          console.log(`   - Page type: ${result.pageContext.pageType}`);
          console.log(`   - Title: ${result.pageContext.title}`);
          console.log(
            `   - Links: ${result.pageContext.elements.links.length}`,
          );
          console.log(
            `   - Buttons: ${result.pageContext.elements.buttons.length}`,
          );
          console.log(
            `   - Forms: ${result.pageContext.elements.forms.length}`,
          );
        }

        console.log("📝 Logs (last 3):");
        result.logs.slice(-3).forEach((log) => console.log(`   ${log}`));

        if (result.errors.length > 0) {
          console.log("❌ Errors:");
          result.errors.forEach((error) => console.log(`   ${error}`));
        }
      } catch (error) {
        console.error(`❌ Failed to process ${url}:`, error);
      }

      // Add delay between tests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Test cache statistics
    console.log("\n📦 Cache Statistics:");
    console.log("-".repeat(40));
    const cacheStats = await scenarioCache.getStats();
    console.log(`   - Total cached scenarios: ${cacheStats.totalCached}`);
    console.log(`   - Total cache usages: ${cacheStats.totalUsages}`);
    console.log(
      `   - Average success rate: ${(cacheStats.avgSuccessRate * 100).toFixed(1)}%`,
    );
    console.log("   - Top domains:");
    cacheStats.topDomains
      .slice(0, 5)
      .forEach((domain) =>
        console.log(`     • ${domain.domain}: ${domain.count} scenarios`),
      );
  } finally {
    await browser.close();
  }

  console.log("\n✅ AI Scenario Testing Complete!");
}

async function testScenarioGeneration(): Promise<void> {
  console.log("🧠 Testing Individual Scenario Generation");
  console.log("=".repeat(50));

  const generator = new AIScenarioGenerator();

  // Mock page context for testing
  const mockPageContext = {
    url: "https://example.com",
    title: "Example Domain",
    description: "This domain is for use in illustrative examples",
    pageType: "homepage",
    elements: {
      links: [
        {
          text: "More information...",
          href: "https://www.iana.org/domains/example",
          visible: true,
        },
      ],
      buttons: [{ text: "Learn More", type: "button", visible: true }],
      forms: [],
      images: [],
      navigation: [
        { text: "Home", href: "/" },
        { text: "About", href: "/about" },
      ],
    },
    content: {
      headings: ["Example Domain"],
      paragraphs: [
        "This domain is for use in illustrative examples in documents.",
      ],
      keywords: ["example", "domain", "illustration", "documentation"],
    },
  };

  try {
    console.log(`🎯 Generating scenario for: ${mockPageContext.url}`);

    const scenario = await generator.generateScenario(
      mockPageContext,
      "Explore the website to understand what it offers",
    );

    console.log("\n📋 Generated Scenario:");
    console.log(`   - Description: ${scenario.description}`);
    console.log(`   - Intent: ${scenario.intent}`);
    console.log(`   - Total steps: ${scenario.steps.length}`);
    console.log(`   - Total duration: ${scenario.totalDuration}ms`);
    console.log(`   - Complexity: ${scenario.complexity}/10`);
    console.log(`   - Human likeness: ${scenario.humanLikeness}/10`);
    console.log(`   - AI Provider: ${scenario.aiProvider}`);

    console.log("\n🎬 Scenario Steps:");
    scenario.steps.forEach((step, index) => {
      console.log(
        `   ${index + 1}. ${step.type.toUpperCase()}: ${step.description}`,
      );
      console.log(`      • Duration: ${step.duration}ms`);
      console.log(`      • Reasoning: ${step.reasoning}`);
      console.log(`      • Human likeness: ${step.humanLikeness}/10`);
      if (step.target) console.log(`      • Target: ${step.target}`);
      if (step.value) console.log(`      • Value: ${step.value}`);
      console.log("");
    });
  } catch (error) {
    console.error("❌ Scenario generation failed:", error);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const testType = args[0] || "all";

  try {
    switch (testType) {
      case "scenarios":
        await testScenarioGeneration();
        break;
      case "browser":
        await testAIScenarios();
        break;
      default:
        await testScenarioGeneration();
        console.log("\n");
        await testAIScenarios();
        break;
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Handle command line execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testAIScenarios, testScenarioGeneration };
