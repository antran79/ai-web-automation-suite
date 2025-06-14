import "dotenv/config";
import type { WorkerConfig } from "./lib/master-client.js";
import { scenarioCache } from "./lib/scenario-cache.js";
import { AutomationWorker } from "./lib/worker.js";

// Helper function to get network IP
async function getLocalIP(): Promise<string> {
  try {
    const { networkInterfaces } = await import("node:os");
    const nets = networkInterfaces();

    for (const name of Object.keys(nets)) {
      const netInterface = nets[name];
      if (!netInterface) continue;

      for (const net of netInterface) {
        // Skip internal and non-IPv4 addresses
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }

    // Fallback to localhost
    return "127.0.0.1";
  } catch (error) {
    console.warn("[MAIN] Could not determine local IP, using localhost");
    return "127.0.0.1";
  }
}

// Helper function to parse environment variables
function parseEnvConfig(): WorkerConfig {
  const workerType = process.env.WORKER_TYPE as "standalone" | "vps" | "cloud" | undefined;

  const config: WorkerConfig = {
    name: process.env.WORKER_NAME || "Automation Worker",
    type: workerType || "standalone",
    ip: "127.0.0.1", // Will be set below
    maxConcurrentJobs: Number.parseInt(process.env.MAX_CONCURRENT_JOBS || "3"),
    memory: Number.parseInt(process.env.MEMORY_MB || "2048"),
    cpu: Number.parseInt(process.env.CPU_CORES || "2"),
    storage: Number.parseInt(process.env.STORAGE_GB || "20"),
  };

  // Add API key if provided
  if (process.env.MASTER_API_KEY) {
    config.apiKey = process.env.MASTER_API_KEY;
  }

  return config;
}

// Display startup banner
function displayBanner(): void {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║                   🤖 Automation Worker                    ║");
  console.log("║                     v1.0.0                              ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");
}

// Main function
async function main(): Promise<void> {
  try {
    displayBanner();

    // Parse configuration
    const config = parseEnvConfig();

    // Get local IP address
    config.ip = await getLocalIP();

    // Get master URL
    const masterUrl = process.env.MASTER_URL || "http://localhost:3000";

    console.log("📋 Configuration:");
    console.log(`   Worker Name: ${config.name}`);
    console.log(`   Worker Type: ${config.type}`);
    console.log(`   Worker IP: ${config.ip}`);
    console.log(`   Max Jobs: ${config.maxConcurrentJobs}`);
    console.log(`   Memory: ${config.memory}MB`);
    console.log(`   CPU Cores: ${config.cpu}`);
    console.log(`   Master URL: ${masterUrl}`);
    console.log(
      `   Debug Mode: ${process.env.DEBUG === "true" ? "ON" : "OFF"}`,
    );
    console.log(
      `   Headless Browser: ${process.env.HEADLESS === "true" ? "YES" : "NO"}`,
    );

    if (process.env.PROXY_HOST) {
      console.log(
        `   Proxy: ${process.env.PROXY_PROTOCOL}://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`,
      );
    }

    console.log("");

    // Initialize scenario cache if enabled
    if (process.env.AI_SCENARIO_CACHING === "true") {
      console.log("📦 Initializing AI scenario cache...");
      await scenarioCache.initialize();
    }

    // Create and start worker
    const worker = new AutomationWorker(config, masterUrl);

    // Set up status endpoint (simple HTTP server for health checks)
    if (process.env.STATUS_PORT) {
      const port = Number.parseInt(process.env.STATUS_PORT);
      await setupStatusServer(worker, port);
    }

    // Start the worker
    await worker.start();

    // Keep the process running
    process.on("SIGINT", () => {
      console.log("\n[MAIN] Received SIGINT, shutting down gracefully...");
      worker.shutdown().catch(console.error);
    });

    process.on("SIGTERM", () => {
      console.log("\n[MAIN] Received SIGTERM, shutting down gracefully...");
      worker.shutdown().catch(console.error);
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("[MAIN] Uncaught Exception:", error);
      worker.shutdown().catch(() => {
        process.exit(1);
      });
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error(
        "[MAIN] Unhandled Rejection at:",
        promise,
        "reason:",
        reason,
      );
    });
  } catch (error) {
    console.error("[MAIN] ❌ Failed to start worker:", error);
    process.exit(1);
  }
}

// Setup simple HTTP status server
async function setupStatusServer(
  worker: AutomationWorker,
  port: number,
): Promise<void> {
  const { createServer } = await import("node:http");

  const server = createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || "", `http://localhost:${port}`);

    try {
      if (url.pathname === "/status") {
        const status = await worker.getStatus();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, data: status }, null, 2));
      } else if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            status: "healthy",
            timestamp: new Date().toISOString(),
          }),
        );
      } else if (url.pathname === "/metrics") {
        const detailed = await worker.getDetailedStatus();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, data: detailed }, null, 2));
      } else if (url.pathname === "/cache") {
        const cacheStats = await scenarioCache.getStats();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, data: cacheStats }, null, 2));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Not found" }));
      }
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Internal server error",
        }),
      );
    }
  });

  server.listen(port, () => {
    console.log(`[MAIN] Status server listening on port ${port}`);
    console.log(`[MAIN] Health check: http://localhost:${port}/health`);
    console.log(`[MAIN] Status endpoint: http://localhost:${port}/status`);
    console.log(`[MAIN] Metrics endpoint: http://localhost:${port}/metrics`);
    console.log(`[MAIN] Cache stats: http://localhost:${port}/cache`);
  });
}

// CLI Command handling
if (process.argv.length > 2) {
  const command = process.argv[2];

  switch (command) {
    case "test":
      console.log("🧪 Running worker in test mode...");
      // You could add test job execution here
      break;

    case "config": {
      console.log("📋 Worker Configuration:");
      const config = parseEnvConfig();
      console.log(JSON.stringify(config, null, 2));
      process.exit(0);
    }

    case "version":
      console.log("Automation Worker v1.0.0");
      process.exit(0);
    default:
      console.log("Automation Worker Commands:");
      console.log("  bun run dev         - Start worker in development mode");
      console.log("  bun run dev test    - Run worker in test mode");
      console.log("  bun run dev config  - Show configuration");
      console.log("  bun run dev version - Show version");
      console.log("  bun run dev help    - Show this help");
      process.exit(0);
  }
}

// Start the worker
main().catch((error) => {
  console.error("[MAIN] Fatal error:", error);
  process.exit(1);
});
