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

export class FingerprintService {
  private static readonly COMMON_VIEWPORTS = [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1280, height: 720 },
    { width: 1600, height: 900 },
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
  ];

  private static readonly COMMON_SCREENS = [
    { width: 1366, height: 768, colorDepth: 24 },
    { width: 1920, height: 1080, colorDepth: 24 },
    { width: 1440, height: 900, colorDepth: 24 },
    { width: 1536, height: 864, colorDepth: 24 },
    { width: 2560, height: 1440, colorDepth: 24 },
    { width: 1600, height: 900, colorDepth: 24 },
    { width: 1280, height: 1024, colorDepth: 24 },
  ];

  private static readonly TIMEZONES = [
    "America/New_York",
    "America/Los_Angeles",
    "America/Chicago",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Seoul",
    "Australia/Sydney",
  ];

  private static readonly LANGUAGES = [
    "en-US",
    "en-GB",
    "zh-CN",
    "es-ES",
    "fr-FR",
    "de-DE",
    "ja-JP",
    "ko-KR",
    "pt-BR",
    "ru-RU",
  ];

  private static readonly WEBGL_VENDORS = [
    "Intel Inc.",
    "NVIDIA Corporation",
    "AMD",
    "Apple Inc.",
    "Qualcomm",
  ];

  private static readonly WEBGL_RENDERERS = [
    "Intel Iris OpenGL Engine",
    "NVIDIA GeForce GTX 1060",
    "AMD Radeon RX 580",
    "Apple M1",
    "ANGLE (Intel, Intel(R) HD Graphics 630 Direct3D11 vs_5_0 ps_5_0)",
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)",
  ];

  private static readonly COMMON_FONTS = [
    "Arial",
    "Arial Black",
    "Comic Sans MS",
    "Courier New",
    "Georgia",
    "Impact",
    "Times New Roman",
    "Trebuchet MS",
    "Verdana",
    "Helvetica",
    "Calibri",
    "Cambria",
    "Consolas",
    "Lucida Console",
    "Segoe UI",
    "Tahoma",
  ];

  private static readonly BROWSER_PLUGINS = [
    {
      name: "Chrome PDF Plugin",
      filename: "internal-pdf-viewer",
      description: "Portable Document Format",
    },
    {
      name: "Chrome PDF Viewer",
      filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
      description: "",
    },
    {
      name: "Native Client",
      filename: "internal-nacl-plugin",
      description: "",
    },
  ];

  private static readonly USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
  ];

  static generateRandomFingerprint(): FingerprintProfile {
    const userAgent = FingerprintService.getRandomElement(FingerprintService.USER_AGENTS);
    const viewport = FingerprintService.getRandomElement(
      FingerprintService.COMMON_VIEWPORTS,
    );
    const screen = FingerprintService.getRandomElement(
      FingerprintService.COMMON_SCREENS,
    );
    const timezone = FingerprintService.getRandomElement(
      FingerprintService.TIMEZONES,
    );
    const language = FingerprintService.getRandomElement(
      FingerprintService.LANGUAGES,
    );

    // Extract platform from user agent
    const platform = FingerprintService.extractPlatformFromUA(userAgent);

    return {
      userAgent,
      viewport,
      screen,
      timezone,
      language,
      platform,
      webgl: {
        vendor: FingerprintService.getRandomElement(
          FingerprintService.WEBGL_VENDORS,
        ),
        renderer: FingerprintService.getRandomElement(
          FingerprintService.WEBGL_RENDERERS,
        ),
      },
      canvas: {
        fingerprint: FingerprintService.generateCanvasFingerprint(),
      },
      audio: {
        fingerprint: FingerprintService.generateAudioFingerprint(),
      },
      fonts: FingerprintService.getRandomFonts(),
      plugins: [...FingerprintService.BROWSER_PLUGINS],
      hardwareConcurrency: FingerprintService.getRandomInt(2, 16),
      deviceMemory: FingerprintService.getRandomElement([2, 4, 8, 16, 32]),
    };
  }

  private static getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private static getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private static extractPlatformFromUA(userAgent: string): string {
    if (userAgent.includes("Windows")) return "Win32";
    if (userAgent.includes("Macintosh")) return "MacIntel";
    if (userAgent.includes("Linux")) return "Linux x86_64";
    if (userAgent.includes("Android")) return "Linux armv7l";
    return "Win32"; // Default fallback
  }

  private static generateCanvasFingerprint(): string {
    // Generate a pseudo-random canvas fingerprint
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private static generateAudioFingerprint(): string {
    // Generate a pseudo-random audio fingerprint
    const chars = "0123456789abcdef";
    let result = "";
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private static getRandomFonts(): string[] {
    const numFonts = FingerprintService.getRandomInt(
      10,
      FingerprintService.COMMON_FONTS.length,
    );
    const shuffled = [...FingerprintService.COMMON_FONTS].sort(
      () => 0.5 - Math.random(),
    );
    return shuffled.slice(0, numFonts);
  }

  // Generate fingerprint with specific characteristics
  static generateFingerprintForRegion(region: string): FingerprintProfile {
    const baseProfile = FingerprintService.generateRandomFingerprint();

    // Adjust language and timezone based on region
    switch (region.toLowerCase()) {
      case "us":
        baseProfile.language = "en-US";
        baseProfile.timezone = FingerprintService.getRandomElement([
          "America/New_York",
          "America/Los_Angeles",
          "America/Chicago"
        ]);
        break;
      case "eu":
        baseProfile.language = FingerprintService.getRandomElement([
          "en-GB", "fr-FR", "de-DE", "es-ES"
        ]);
        baseProfile.timezone = FingerprintService.getRandomElement([
          "Europe/London",
          "Europe/Paris",
          "Europe/Berlin"
        ]);
        break;
      case "asia":
        baseProfile.language = FingerprintService.getRandomElement([
          "zh-CN", "ja-JP", "ko-KR"
        ]);
        baseProfile.timezone = FingerprintService.getRandomElement([
          "Asia/Shanghai",
          "Asia/Tokyo",
          "Asia/Seoul"
        ]);
        break;
    }

    return baseProfile;
  }

  static logFingerprintInfo(profile: FingerprintProfile): void {
    console.log("[FINGERPRINT SERVICE] Generated fingerprint profile:");
    console.log(`  Platform: ${profile.platform}`);
    console.log(`  User Agent: ${profile.userAgent}`);
    console.log(
      `  Viewport: ${profile.viewport.width}x${profile.viewport.height}`,
    );
    console.log(`  Screen: ${profile.screen.width}x${profile.screen.height}`);
    console.log(`  Language: ${profile.language}`);
    console.log(`  Timezone: ${profile.timezone}`);
    console.log(`  Hardware Concurrency: ${profile.hardwareConcurrency}`);
    console.log(`  Device Memory: ${profile.deviceMemory}GB`);
    console.log(`  WebGL Vendor: ${profile.webgl.vendor}`);
    console.log(`  WebGL Renderer: ${profile.webgl.renderer}`);
    console.log(`  Fonts: ${profile.fonts.length} fonts available`);
  }

  // Generate script to apply fingerprint (for sending to worker)
  static generateFingerprintScript(profile: FingerprintProfile): string {
    return `
      // Apply fingerprint profile to page
      (function(profile) {
        // Override basic navigator properties
        Object.defineProperty(navigator, 'platform', {
          get: () => profile.platform,
        });

        Object.defineProperty(navigator, 'language', {
          get: () => profile.language,
        });

        Object.defineProperty(navigator, 'languages', {
          get: () => [profile.language, profile.language.split('-')[0]],
        });

        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => profile.hardwareConcurrency,
        });

        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => profile.deviceMemory,
        });

        // Override screen properties
        Object.defineProperties(screen, {
          width: { get: () => profile.screen.width },
          height: { get: () => profile.screen.height },
          availWidth: { get: () => profile.screen.width },
          availHeight: { get: () => profile.screen.height - 40 },
          colorDepth: { get: () => profile.screen.colorDepth },
          pixelDepth: { get: () => profile.screen.colorDepth },
        });

        // Override timezone
        const originalDateTimeFormat = Intl.DateTimeFormat;
        Intl.DateTimeFormat = ((locales, options) =>
          new originalDateTimeFormat(locales, {
            ...options,
            timeZone: profile.timezone,
          }));

        // Override Date.prototype.getTimezoneOffset
        const timezoneOffsets = {
          "America/New_York": 300,
          "America/Los_Angeles": 480,
          "America/Chicago": 360,
          "Europe/London": 0,
          "Europe/Paris": -60,
          "Europe/Berlin": -60,
          "Asia/Tokyo": -540,
          "Asia/Shanghai": -480,
          "Asia/Seoul": -540,
          "Australia/Sydney": -660,
        };
        Date.prototype.getTimezoneOffset = () => {
          return timezoneOffsets[profile.timezone] || 0;
        };

        // Override WebGL properties
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter) {
          if (parameter === 37445) {
            return profile.webgl.vendor;
          }
          if (parameter === 37446) {
            return profile.webgl.renderer;
          }
          return getParameter.call(this, parameter);
        };

        // Override canvas fingerprinting
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function (type) {
          const context = this.getContext('2d');
          if (context) {
            const imageData = context.getImageData(0, 0, this.width, this.height);
            const data = imageData.data;

            // Add minimal noise
            for (let i = 0; i < 4; i++) {
              const randomIndex = Math.floor(Math.random() * data.length);
              data[randomIndex] = Math.floor(Math.random() * 256);
            }

            context.putImageData(imageData, 0, 0);
          }
          return originalToDataURL.call(this, type);
        };

        // Override webdriver detection
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // Override chrome runtime
        Object.defineProperty(window, 'chrome', {
          get: () => ({
            runtime: {},
            loadTimes: () => {},
            csi: () => {},
            app: {},
          }),
        });

        console.log('[FINGERPRINT] Applied fingerprint profile');
      })(${JSON.stringify(profile)});
    `;
  }
}
