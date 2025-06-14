# 🤖 Automation Worker Node

A distributed worker node for the Web Automation AI system. This worker connects to the Master Node to receive and execute web automation jobs with real human-like behavior.

## Features

- 🔗 **Master Node Integration**: Seamless connection to the Master Node for job distribution
- 🌐 **Advanced Browser Automation**: Puppeteer with stealth plugins and anti-detection
- 🤖 **AI-Powered Scenarios**: ChatGPT and Gemini integration for intelligent browsing patterns
- 🧬 **Fingerprint Randomization**: Dynamic browser fingerprint generation and spoofing
- 🛡️ **Security & Anti-Detection**: User agent rotation, proxy support, natural behavior simulation
- 📊 **Real-time Monitoring**: System metrics, job statistics, and health reporting
- ⚡ **High Performance**: Concurrent job execution with resource management
- 🔄 **Auto-recovery**: Automatic reconnection and graceful error handling
- 💾 **Intelligent Caching**: AI scenario caching for performance optimization

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Master Node   │────│  Worker Node    │────│   Web Browser   │
│   (Job Queue)   │    │  (Executor)     │    │   (Automation)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### 1. Installation

```bash
# Clone and install dependencies
bun install

# Copy environment configuration
cp .env.example .env
```

### 2. Configuration

Edit `.env` file with your settings:

```env
# Worker Configuration
WORKER_NAME=Worker Node 01
WORKER_TYPE=vps
MAX_CONCURRENT_JOBS=3

# Master Node Connection
MASTER_URL=http://localhost:3000
MASTER_API_KEY=your-api-key-here

# Browser Configuration
HEADLESS=true
BROWSER_EXECUTABLE_PATH=/path/to/chrome

# Proxy Configuration (optional)
PROXY_HOST=proxy.example.com
PROXY_PORT=8080
PROXY_USERNAME=user
PROXY_PASSWORD=pass
```

### 3. Start Worker

```bash
# Development mode
bun run dev

# Production mode
bun run build
bun run start

# With status server
STATUS_PORT=3001 bun run dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKER_NAME` | `Automation Worker` | Display name for the worker |
| `WORKER_TYPE` | `standalone` | Worker type: `standalone`, `vps`, `cloud` |
| `WORKER_ID` | *auto-generated* | Unique worker identifier |
| `MASTER_URL` | `http://localhost:3000` | Master Node API URL |
| `MASTER_API_KEY` | - | Authentication key for Master Node |
| `MAX_CONCURRENT_JOBS` | `3` | Maximum concurrent job execution |
| `MEMORY_MB` | `2048` | Available memory in MB |
| `CPU_CORES` | `2` | Available CPU cores |
| `STORAGE_GB` | `20` | Available storage in GB |
| `HEADLESS` | `true` | Run browser in headless mode |
| `BROWSER_EXECUTABLE_PATH` | - | Custom Chrome/Chromium path |
| `OPENAI_API_KEY` | - | OpenAI API key for ChatGPT scenarios |
| `GEMINI_API_KEY` | - | Google Gemini API key for AI scenarios |
| `ENABLE_AI_SCENARIOS` | `true` | Enable AI-powered scenario generation |
| `AI_SCENARIO_CACHING` | `true` | Enable scenario caching for performance |
| `HEARTBEAT_INTERVAL` | `30000` | Heartbeat interval in ms |
| `JOB_TIMEOUT` | `300000` | Job timeout in ms |
| `STATUS_PORT` | - | Port for status HTTP server |
| `DEBUG` | `false` | Enable debug logging |

## CLI Commands

```bash
# Start worker
bun run dev

# Show configuration
bun run dev config

# Show version
bun run dev version

# Show help
bun run dev help

# Test mode
bun run dev test

# Test AI scenarios
bun run test:ai

# Test only scenario generation
bun run test:ai:scenarios

# Test full browser automation
bun run test:ai:browser
```

## API Endpoints (Status Server)

When `STATUS_PORT` is set, the worker exposes these endpoints:

- `GET /health` - Health check
- `GET /status` - Worker status and statistics
- `GET /metrics` - Detailed metrics and performance data
- `GET /cache` - AI scenario cache statistics

Example:
```bash
curl http://localhost:3001/status
curl http://localhost:3001/cache
```

## Worker Capabilities

### Browser Automation
- **Stealth Mode**: Advanced anti-detection measures
- **User Agent Rotation**: Random, realistic user agents
- **Proxy Support**: HTTP, HTTPS, SOCKS4, SOCKS5 proxies
- **Natural Behavior**: Human-like mouse movements and timing
- **Screenshot Capture**: High-quality page screenshots

### AI-Powered Scenarios
- **Intelligent Analysis**: Automatic page context extraction and analysis
- **Natural Browsing**: AI-generated human-like browsing patterns
- **Multi-Provider Support**: ChatGPT and Google Gemini integration
- **Scenario Caching**: Performance optimization through intelligent caching
- **Adaptive Learning**: Scenarios improve based on execution success rates

### Job Execution
- **Concurrent Processing**: Multiple jobs simultaneously
- **Priority Handling**: Respect job priority levels
- **Retry Logic**: Automatic retry on failures
- **Progress Reporting**: Real-time status updates
- **Resource Management**: Memory and CPU monitoring

### System Monitoring
- **Performance Metrics**: CPU, memory, disk usage
- **Job Statistics**: Success rates, execution times
- **Health Checks**: Automated system health monitoring
- **Error Reporting**: Detailed error logs and recovery

## Security Features

### Anti-Detection
- **Stealth Plugins**: Puppeteer stealth mode
- **Fingerprint Spoofing**: Browser fingerprint randomization
- **Request Blocking**: Block unnecessary resources
- **Timing Randomization**: Natural human-like delays

### Network Security
- **Proxy Rotation**: Automatic proxy switching
- **SSL/TLS Support**: Secure connections
- **Rate Limiting**: Request throttling
- **IP Whitelisting**: Trusted IP restrictions

## Development

### Project Structure
```
automation-worker/
├── src/
│   ├── lib/
│   │   ├── browser-engine.ts    # Browser automation engine
│   │   ├── master-client.ts     # Master Node API client
│   │   └── worker.ts           # Main worker logic
│   └── main.ts                 # Entry point
├── .env                        # Environment configuration
└── package.json               # Dependencies and scripts
```

### Key Components

#### BrowserEngine
Handles all browser automation:
- Puppeteer initialization with stealth plugins
- Page navigation and interaction
- Screenshot capture and data extraction
- Natural human-like behavior simulation

#### MasterClient
Manages communication with Master Node:
- Worker registration and authentication
- Job polling and status reporting
- Heartbeat and health monitoring
- WebSocket communication (future)

#### AutomationWorker
Orchestrates the entire worker:
- Job queue management
- Concurrent execution handling
- System metrics collection
- Graceful shutdown handling

## Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### VPS Deployment
```bash
# Install dependencies
curl -fsSL https://bun.sh/install | bash
git clone <repository>
cd automation-worker
bun install

# Configure environment
cp .env.example .env
nano .env

# Start with PM2
pm2 start bun --name "automation-worker" -- run start
pm2 save
pm2 startup
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: automation-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: automation-worker
  template:
    metadata:
      labels:
        app: automation-worker
    spec:
      containers:
      - name: worker
        image: automation-worker:latest
        env:
        - name: MASTER_URL
          value: "http://master-service:3000"
        - name: WORKER_TYPE
          value: "cloud"
```

## Monitoring & Troubleshooting

### Health Monitoring
```bash
# Check worker status
curl http://localhost:3001/health

# Get detailed metrics
curl http://localhost:3001/metrics

# View logs
tail -f worker.log
```

### Common Issues

**Connection Failed**
- Check Master Node URL and availability
- Verify API key authentication
- Check network connectivity

**Browser Launch Failed**
- Install Chrome/Chromium
- Check executable path in config
- Verify system dependencies

**Job Execution Errors**
- Check target website accessibility
- Verify proxy configuration
- Review job parameters

## Performance Tuning

### Resource Optimization
- Adjust `MAX_CONCURRENT_JOBS` based on system resources
- Use headless mode for better performance
- Block unnecessary resources (images, CSS)
- Configure appropriate timeouts

### Network Optimization
- Use high-quality proxies
- Configure proxy rotation
- Set reasonable request delays
- Monitor bandwidth usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide
- Contact the development team

---

**Note**: This worker is designed to work with the Automation Master Node system. Make sure you have a running Master Node instance before starting workers.
