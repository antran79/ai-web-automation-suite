# Worker Tracking System - Giải thích chi tiết

## 📊 Tổng quan hệ thống Master-Worker Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MASTER NODE (Port 3000)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Dashboard     │  │   Job Queue     │  │  Worker Pool    │  │
│  │   (Web UI)      │  │   Management    │  │   Tracking      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                     │                     │         │
│           └─────────────────────┼─────────────────────┘         │
│                                 │                               │
└─────────────────────────────────┼─────────────────────────────────┘
                                  │ HTTP APIs + WebSocket
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼──────┐         ┌────────▼────────┐         ┌──────▼──────┐
│ WORKER #1    │         │ WORKER #2       │         │ WORKER #3   │
│ (Port 3002)  │         │ (Port 3003)     │         │ (Port 3004) │
│              │         │                 │         │             │
│ - Heartbeat  │         │ - Heartbeat     │         │ - Heartbeat │
│ - Job Status │         │ - Job Status    │         │ - Job Status│
│ - Metrics    │         │ - Metrics       │         │ - Metrics   │
└──────────────┘         └─────────────────┘         └─────────────┘
```

## 🔄 Workflow của Worker Tracking

### 1. Worker Registration (Đăng ký Worker)

```javascript
// Worker gửi POST request đến Master khi khởi động
POST /api/workers/register
{
  "name": "Worker Node US-East-1",
  "type": "vps",
  "ip": "192.168.1.100",
  "port": 3002,
  "capabilities": {
    "maxConcurrentJobs": 3,
    "memory": 4096,
    "cpu": 4,
    "supportedBrowsers": ["chrome", "firefox"]
  }
}

// Master response với worker ID
{
  "success": true,
  "workerId": "wn-us-east-1",
  "apiKey": "worker-api-key-123"
}
```

### 2. Heartbeat System (Theo dõi sức khỏe)

```javascript
// Worker gửi heartbeat mỗi 30 giây
POST /api/workers/{workerId}/heartbeat
{
  "status": "online",  // online | busy | offline
  "currentJobs": 2,
  "metrics": {
    "memoryUsage": 1842,     // MB
    "cpuUsage": 25.5,        // %
    "diskUsage": 45,         // %
    "networkUsage": 150,     // Mbps
    "jobsCompleted": 245,
    "jobsFailed": 5,
    "averageResponseTime": 450  // ms
  },
  "performance": {
    "successRate": 98.2,
    "averageJobDuration": 45000  // ms
  }
}
```

### 3. Job Assignment & Tracking

```javascript
// Master assign job cho worker
POST /api/workers/{workerId}/jobs
{
  "jobId": "job-123",
  "priority": 5,
  "config": {
    "url": "https://example.com",
    "scenario": { /* AI scenario steps */ },
    "fingerprint": { /* browser fingerprint */ },
    "proxy": { /* proxy config */ }
  }
}

// Worker báo cáo job progress
POST /api/jobs/{jobId}/progress
{
  "status": "running",
  "progress": 65,      // %
  "currentStep": "extracting data",
  "metrics": {
    "responseTime": 450,
    "dataExtracted": 150,
    "errorsCount": 0
  }
}

// Worker báo cáo job completion
POST /api/jobs/{jobId}/complete
{
  "status": "completed",
  "result": {
    "success": true,
    "dataExtracted": 250,
    "screenshots": ["screenshot1.png"],
    "logs": ["step1 completed", "step2 completed"]
  },
  "metrics": {
    "totalDuration": 45000,
    "responseTime": 380,
    "memoryUsed": 1200
  }
}
```

## 📈 Data Collection Methods

### Method 1: Real-time Heartbeat
```javascript
// Worker tự báo cáo metrics mỗi 30s
setInterval(async () => {
  const metrics = await getSystemMetrics();
  await reportToMaster(metrics);
}, 30000);

function getSystemMetrics() {
  return {
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
    cpuUsage: await getCPUUsage(),
    currentJobs: this.activeJobs.length,
    jobsCompleted: this.completedJobsCount,
    jobsFailed: this.failedJobsCount
  };
}
```

### Method 2: Job-based Reporting
```javascript
// Mỗi khi job start/complete, worker báo cáo
class JobExecutor {
  async executeJob(job) {
    // Start job
    await this.reportJobStart(job.id);

    try {
      const result = await this.runAutomation(job);

      // Complete job
      await this.reportJobComplete(job.id, result);
    } catch (error) {
      // Failed job
      await this.reportJobFailed(job.id, error);
    }
  }
}
```

### Method 3: Performance Monitoring
```javascript
// Worker track performance của từng job
class PerformanceMonitor {
  trackJobPerformance(jobId) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    return {
      end: () => {
        const duration = Date.now() - startTime;
        const memoryUsed = process.memoryUsage().heapUsed - startMemory;

        this.reportMetrics(jobId, {
          duration,
          memoryUsed,
          cpuUsage: this.getCurrentCPU()
        });
      }
    };
  }
}
```

## 🎯 Master Node Data Aggregation

### Worker Status Tracking
```javascript
// Master lưu trữ worker data
class WorkerManager {
  private workers = new Map();

  updateWorkerStatus(workerId, data) {
    const worker = this.workers.get(workerId);

    // Update basic info
    worker.status = data.status;
    worker.currentJobs = data.currentJobs;
    worker.lastSeen = new Date();

    // Update metrics
    worker.metrics = {
      ...worker.metrics,
      memoryUsage: data.metrics.memoryUsage,
      cpuUsage: data.metrics.cpuUsage,
      successRate: this.calculateSuccessRate(worker),
      averageJobDuration: this.calculateAvgDuration(worker)
    };

    // Save to database
    this.saveWorkerData(worker);
  }

  calculateSuccessRate(worker) {
    const total = worker.jobsCompleted + worker.jobsFailed;
    return total > 0 ? (worker.jobsCompleted / total) * 100 : 0;
  }
}
```

### Real-time Dashboard Updates
```javascript
// Dashboard receive real-time updates
class DashboardManager {
  updateWorkerDisplay() {
    const workers = this.getActiveWorkers();

    workers.forEach(worker => {
      // Update UI với worker metrics
      this.updateWorkerCard(worker.id, {
        status: worker.status,
        currentJobs: `${worker.currentJobs}/${worker.maxJobs}`,
        performance: {
          cpu: `${worker.metrics.cpuUsage}%`,
          memory: `${worker.metrics.memoryUsage}MB`,
          successRate: `${worker.metrics.successRate.toFixed(1)}%`
        },
        lastSeen: this.formatTime(worker.lastSeen)
      });
    });
  }
}
```

## 🔍 Practical Example - Worker Lifecycle

### Step 1: Worker Startup
```bash
# Worker khởi động
cd automation-worker
bun run dev

# Output:
📋 Configuration:
   Worker Name: Worker Node Demo 01
   Worker Type: vps
   Worker IP: 172.31.5.19
   Max Jobs: 3
   Memory: 4096MB

[MASTER CLIENT] Registering worker with master node...
[WORKER] Successfully registered with master: wn-demo-01
[WORKER] Starting heartbeat interval...
```

### Step 2: Master Tracking
```javascript
// Master dashboard hiển thị:
{
  name: "Worker Node Demo 01",
  status: "online",
  connection: {
    ip: "172.31.5.19",
    lastSeen: "2024-01-15T10:30:00Z"
  },
  resources: {
    currentJobs: 0,
    totalJobsProcessed: 0,
    performance: {
      cpuUsage: 15.2,
      memoryUsage: 512,
      successRate: 0
    }
  }
}
```

### Step 3: Job Assignment
```javascript
// Master assign job
const job = {
  id: "job-001",
  url: "https://example.com",
  priority: 5
};

await workerClient.assignJob("wn-demo-01", job);

// Worker nhận job và update status
worker.status = "busy";
worker.currentJobs = 1;
```

### Step 4: Job Execution Tracking
```javascript
// Trong quá trình chạy job
setInterval(() => {
  // Worker báo cáo progress
  reportJobProgress("job-001", {
    progress: 45,
    currentStep: "extracting data",
    metrics: {
      responseTime: 450,
      memoryUsage: 1200
    }
  });
}, 5000);
```

### Step 5: Completion & Metrics Update
```javascript
// Job hoàn thành
await reportJobComplete("job-001", {
  success: true,
  duration: 45000,
  dataExtracted: 150
});

// Worker update metrics
worker.currentJobs = 0;
worker.totalJobsProcessed = 1;
worker.successRate = 100;
worker.status = "online";
```

## 🎛️ Cách xem Worker Tracking

### 1. Master Dashboard
- Truy cập: `http://localhost:3000`
- Tab "Workers" để xem tất cả workers
- Real-time status, metrics, performance

### 2. Worker Status Endpoint
```bash
# Xem worker status trực tiếp
curl http://localhost:3002/status

# Response:
{
  "status": "online",
  "currentJobs": 1,
  "totalProcessed": 245,
  "successRate": 98.2,
  "uptime": "2h 15m",
  "performance": {
    "cpu": 25.5,
    "memory": 1842,
    "disk": 45
  }
}
```

### 3. Master Workers API
```bash
# Xem tất cả workers từ master
curl http://localhost:3000/api/workers

# Response:
{
  "success": true,
  "workers": [
    {
      "id": "wn-demo-01",
      "name": "Worker Node Demo 01",
      "status": "online",
      "currentJobs": 1,
      "maxJobs": 3,
      "performance": { ... }
    }
  ]
}
```

## 🚀 Kết luận

Worker tracking hoạt động thông qua:

1. **Registration**: Worker tự đăng ký với Master khi start
2. **Heartbeat**: Gửi metrics mỗi 30 giây
3. **Job Reporting**: Báo cáo job progress và completion
4. **Performance Monitoring**: Track CPU, memory, success rate
5. **Real-time Dashboard**: Master hiển thị tất cả data real-time

Tất cả metrics được thu thập tự động và hiển thị trong Master dashboard để bạn có thể monitor toàn bộ worker pool!
