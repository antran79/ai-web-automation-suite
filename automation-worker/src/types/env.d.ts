declare namespace NodeJS {
  interface ProcessEnv {
    // Worker Configuration
    WORKER_NAME?: string;
    WORKER_TYPE?: 'standalone' | 'vps' | 'cloud';
    WORKER_ID?: string;

    // Master Node Connection
    MASTER_URL?: string;
    MASTER_API_KEY?: string;

    // Worker Capabilities
    MAX_CONCURRENT_JOBS?: string;
    MEMORY_MB?: string;
    CPU_CORES?: string;
    STORAGE_GB?: string;

    // Browser Configuration
    HEADLESS?: string;
    BROWSER_EXECUTABLE_PATH?: string;

    // Proxy Configuration
    PROXY_HOST?: string;
    PROXY_PORT?: string;
    PROXY_USERNAME?: string;
    PROXY_PASSWORD?: string;
    PROXY_PROTOCOL?: string;

    // AI Configuration
    OPENAI_API_KEY?: string;
    GEMINI_API_KEY?: string;
    ENABLE_AI_SCENARIOS?: string;
    AI_SCENARIO_CACHING?: string;

    // Advanced Settings
    HEARTBEAT_INTERVAL?: string;
    JOB_TIMEOUT?: string;
    AUTO_ACCEPT_JOBS?: string;
    DEBUG?: string;
    STATUS_PORT?: string;

    // Security
    TRUSTED_IPS?: string;
    RATE_LIMIT_REQUESTS_PER_MINUTE?: string;
    RATE_LIMIT_JOBS_PER_HOUR?: string;

    // Node.js Standard
    NODE_ENV?: 'development' | 'production' | 'test';
    PORT?: string;
  }
}
