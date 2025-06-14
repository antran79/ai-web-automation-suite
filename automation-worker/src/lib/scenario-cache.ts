import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { AIScenario, PageContext } from "./ai-scenario-generator.js";

export interface CachedScenario {
  scenario: AIScenario;
  pageContext: PageContext;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  successRate: number;
  avgExecutionTime: number;
}

export interface ScenarioMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  avgExecutionTime: number;
  lastExecuted: Date;
}

export class ScenarioCache {
  private cache = new Map<string, CachedScenario>();
  private cacheDir: string;
  private maxCacheSize: number;
  private ttlHours: number;

  constructor(
    cacheDir = ".scenario-cache",
    maxCacheSize = 1000,
    ttlHours = 24,
  ) {
    this.cacheDir = cacheDir;
    this.maxCacheSize = maxCacheSize;
    this.ttlHours = ttlHours;
  }

  async initialize(): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      await fs.mkdir(this.cacheDir, { recursive: true });

      // Load existing cache from disk
      await this.loadFromDisk();

      console.log(
        `[SCENARIO CACHE] Initialized with ${this.cache.size} cached scenarios`,
      );
    } catch (error) {
      console.error("[SCENARIO CACHE] Failed to initialize:", error);
    }
  }

  async getScenario(
    pageContext: PageContext,
    intent?: string,
  ): Promise<AIScenario | null> {
    const cacheKey = this.generateCacheKey(pageContext, intent);
    const cached = this.cache.get(cacheKey);

    if (cached && !this.isExpired(cached)) {
      // Update usage statistics
      cached.lastUsed = new Date();
      cached.usageCount++;

      console.log(
        `[SCENARIO CACHE] Cache hit for ${pageContext.url} (used ${cached.usageCount} times)`,
      );

      // Save updated cache
      await this.saveToDisk();

      return cached.scenario;
    }

    if (cached && this.isExpired(cached)) {
      console.log(
        `[SCENARIO CACHE] Expired cache entry removed for ${pageContext.url}`,
      );
      this.cache.delete(cacheKey);
    }

    return null;
  }

  async cacheScenario(
    pageContext: PageContext,
    scenario: AIScenario,
    intent?: string,
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(pageContext, intent);

    const cachedItem: CachedScenario = {
      scenario,
      pageContext,
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 1,
      successRate: 1.0,
      avgExecutionTime: scenario.totalDuration,
    };

    this.cache.set(cacheKey, cachedItem);

    // Cleanup old entries if cache is too large
    await this.cleanup();

    // Save to disk
    await this.saveToDisk();

    console.log(
      `[SCENARIO CACHE] Cached scenario for ${pageContext.url} (${scenario.steps.length} steps)`,
    );
  }

  async updateScenarioMetrics(
    pageContext: PageContext,
    metrics: ScenarioMetrics,
    intent?: string,
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(pageContext, intent);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      cached.successRate =
        metrics.successfulExecutions / metrics.totalExecutions;
      cached.avgExecutionTime = metrics.avgExecutionTime;
      cached.lastUsed = metrics.lastExecuted;

      await this.saveToDisk();

      console.log(
        `[SCENARIO CACHE] Updated metrics for ${pageContext.url} (${(cached.successRate * 100).toFixed(1)}% success rate)`,
      );
    }
  }

  async getSimilarScenarios(
    pageContext: PageContext,
    limit = 5,
  ): Promise<CachedScenario[]> {
    const similar: Array<{ scenario: CachedScenario; similarity: number }> = [];

    for (const [key, cached] of this.cache.entries()) {
      if (this.isExpired(cached)) continue;

      const similarity = this.calculateSimilarity(
        pageContext,
        cached.pageContext,
      );
      if (similarity > 0.3) {
        // Minimum similarity threshold
        similar.push({ scenario: cached, similarity });
      }
    }

    return similar
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((item) => item.scenario);
  }

  private generateCacheKey(pageContext: PageContext, intent?: string): string {
    const keyData = {
      url: this.normalizeUrl(pageContext.url),
      pageType: pageContext.pageType,
      elementCount: {
        links: pageContext.elements.links.length,
        buttons: pageContext.elements.buttons.length,
        forms: pageContext.elements.forms.length,
      },
      intent: intent || "general",
    };

    const keyString = JSON.stringify(keyData, Object.keys(keyData).sort());
    return crypto
      .createHash("sha256")
      .update(keyString)
      .digest("hex")
      .substring(0, 16);
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove query parameters and fragments for better caching
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return url;
    }
  }

  private calculateSimilarity(ctx1: PageContext, ctx2: PageContext): number {
    let score = 0;
    let factors = 0;

    // URL similarity (domain + path structure)
    if (this.normalizeUrl(ctx1.url) === this.normalizeUrl(ctx2.url)) {
      score += 0.4;
    } else if (new URL(ctx1.url).hostname === new URL(ctx2.url).hostname) {
      score += 0.2;
    }
    factors += 0.4;

    // Page type similarity
    if (ctx1.pageType === ctx2.pageType) {
      score += 0.3;
    }
    factors += 0.3;

    // Element structure similarity
    const elem1 = ctx1.elements;
    const elem2 = ctx2.elements;

    const linkDiff = Math.abs(elem1.links.length - elem2.links.length);
    const buttonDiff = Math.abs(elem1.buttons.length - elem2.buttons.length);
    const formDiff = Math.abs(elem1.forms.length - elem2.forms.length);

    const structuralSimilarity = 1 - (linkDiff + buttonDiff + formDiff) / 50; // Normalize by expected max diff
    score += Math.max(0, structuralSimilarity) * 0.2;
    factors += 0.2;

    // Content similarity (keywords)
    const keywords1 = new Set(ctx1.content.keywords);
    const keywords2 = new Set(ctx2.content.keywords);
    const intersection = new Set(
      [...keywords1].filter((k) => keywords2.has(k)),
    );
    const union = new Set([...keywords1, ...keywords2]);

    if (union.size > 0) {
      const keywordSimilarity = intersection.size / union.size;
      score += keywordSimilarity * 0.1;
    }
    factors += 0.1;

    return score / factors;
  }

  private isExpired(cached: CachedScenario): boolean {
    const now = new Date();
    const ageHours =
      (now.getTime() - cached.createdAt.getTime()) / (1000 * 60 * 60);
    return ageHours > this.ttlHours;
  }

  private async cleanup(): Promise<void> {
    if (this.cache.size <= this.maxCacheSize) return;

    // Remove expired entries first
    const expiredKeys: string[] = [];
    for (const [key, cached] of this.cache.entries()) {
      if (this.isExpired(cached)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    // If still over limit, remove least used entries
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries()).sort((a, b) => {
        // Sort by success rate and usage count
        const scoreA = a[1].successRate * Math.log(a[1].usageCount + 1);
        const scoreB = b[1].successRate * Math.log(b[1].usageCount + 1);
        return scoreA - scoreB; // Ascending (remove worst first)
      });

      const toRemove = entries.slice(0, this.cache.size - this.maxCacheSize);
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }

      console.log(
        `[SCENARIO CACHE] Cleaned up ${expiredKeys.length + toRemove.length} cache entries`,
      );
    }
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const cacheFile = path.join(this.cacheDir, "scenarios.json");
      const data = await fs.readFile(cacheFile, "utf-8");
      const cacheData = JSON.parse(data);

      for (const [key, item] of Object.entries(cacheData)) {
        const cached = item as any;
        cached.createdAt = new Date(cached.createdAt);
        cached.lastUsed = new Date(cached.lastUsed);

        if (!this.isExpired(cached)) {
          this.cache.set(key, cached);
        }
      }
    } catch (error) {
      // Cache file doesn't exist or is corrupted, start fresh
      console.log("[SCENARIO CACHE] No existing cache found, starting fresh");
    }
  }

  private async saveToDisk(): Promise<void> {
    try {
      const cacheFile = path.join(this.cacheDir, "scenarios.json");
      const cacheData = Object.fromEntries(this.cache.entries());
      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.error("[SCENARIO CACHE] Failed to save cache to disk:", error);
    }
  }

  async getStats(): Promise<{
    totalCached: number;
    totalUsages: number;
    avgSuccessRate: number;
    topDomains: Array<{ domain: string; count: number }>;
  }> {
    const stats = {
      totalCached: this.cache.size,
      totalUsages: 0,
      avgSuccessRate: 0,
      topDomains: new Map<string, number>(),
    };

    let totalSuccessRate = 0;

    for (const cached of this.cache.values()) {
      stats.totalUsages += cached.usageCount;
      totalSuccessRate += cached.successRate;

      try {
        const domain = new URL(cached.pageContext.url).hostname;
        stats.topDomains.set(domain, (stats.topDomains.get(domain) || 0) + 1);
      } catch {
        // Invalid URL, skip
      }
    }

    stats.avgSuccessRate =
      this.cache.size > 0 ? totalSuccessRate / this.cache.size : 0;

    const topDomains = Array.from(stats.topDomains.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));

    return {
      ...stats,
      topDomains,
    };
  }

  async clear(): Promise<void> {
    this.cache.clear();
    try {
      const cacheFile = path.join(this.cacheDir, "scenarios.json");
      await fs.unlink(cacheFile);
    } catch {
      // File doesn't exist, ignore
    }
    console.log("[SCENARIO CACHE] Cache cleared");
  }
}

// Global cache instance
export const scenarioCache = new ScenarioCache();
