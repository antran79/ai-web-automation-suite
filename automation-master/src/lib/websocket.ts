import type { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { nanoid } from 'nanoid';
import type { IWorker } from '@/models/Worker';
import type { IJob } from '@/models/Job';

export interface WebSocketMessage {
  type: 'job_assignment' | 'job_cancellation' | 'worker_status_update' | 'system_message' | 'health_check' | 'dashboard_update';
  data: any;
  timestamp: string;
  messageId: string;
}

export interface ConnectedWorker {
  workerId: string;
  ws: WebSocket;
  connectionId: string;
  connectedAt: Date;
  lastPing: Date;
  authenticated: boolean;
}

export interface ConnectedDashboard {
  connectionId: string;
  ws: WebSocket;
  connectedAt: Date;
  subscriptions: string[];
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private connectedWorkers = new Map<string, ConnectedWorker>();
  private connectedDashboards = new Map<string, ConnectedDashboard>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws'
    });

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const path = url.pathname;
      const connectionId = nanoid();

      console.log(`[WEBSOCKET] New connection: ${path} (${connectionId})`);

      if (path.startsWith('/ws/worker/')) {
        this.handleWorkerConnection(ws, path, connectionId);
      } else if (path.startsWith('/ws/dashboard')) {
        this.handleDashboardConnection(ws, connectionId);
      } else {
        console.log(`[WEBSOCKET] Unknown path: ${path}`);
        ws.close(1000, 'Unknown endpoint');
      }
    });

    console.log('[WEBSOCKET] WebSocket server initialized');
  }

  private handleWorkerConnection(ws: WebSocket, path: string, connectionId: string): void {
    const workerId = path.split('/').pop();

    if (!workerId) {
      ws.close(1000, 'Invalid worker ID');
      return;
    }

    const workerConnection: ConnectedWorker = {
      workerId,
      ws,
      connectionId,
      connectedAt: new Date(),
      lastPing: new Date(),
      authenticated: false
    };

    this.connectedWorkers.set(workerId, workerConnection);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleWorkerMessage(workerId, message);
      } catch (error) {
        console.error(`[WEBSOCKET] Invalid message from worker ${workerId}:`, error);
      }
    });

    ws.on('close', () => {
      console.log(`[WEBSOCKET] Worker ${workerId} disconnected`);
      this.connectedWorkers.delete(workerId);
      this.broadcastToDashboard({
        type: 'worker_status_update',
        data: { workerId, status: 'offline', connected: false },
        timestamp: new Date().toISOString(),
        messageId: nanoid()
      });
    });

    ws.on('error', (error) => {
      console.error(`[WEBSOCKET] Worker ${workerId} error:`, error);
    });

    // Send welcome message
    this.sendToWorker(workerId, {
      type: 'system_message',
      data: { message: 'Connected to Master Node', connectionId },
      timestamp: new Date().toISOString(),
      messageId: nanoid()
    });

    // Notify dashboard
    this.broadcastToDashboard({
      type: 'worker_status_update',
      data: { workerId, status: 'online', connected: true },
      timestamp: new Date().toISOString(),
      messageId: nanoid()
    });
  }

  private handleDashboardConnection(ws: WebSocket, connectionId: string): void {
    const dashboardConnection: ConnectedDashboard = {
      connectionId,
      ws,
      connectedAt: new Date(),
      subscriptions: ['all'] // Default to all subscriptions
    };

    this.connectedDashboards.set(connectionId, dashboardConnection);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleDashboardMessage(connectionId, message);
      } catch (error) {
        console.error(`[WEBSOCKET] Invalid message from dashboard ${connectionId}:`, error);
      }
    });

    ws.on('close', () => {
      console.log(`[WEBSOCKET] Dashboard ${connectionId} disconnected`);
      this.connectedDashboards.delete(connectionId);
    });

    ws.on('error', (error) => {
      console.error(`[WEBSOCKET] Dashboard ${connectionId} error:`, error);
    });

    // Send initial data
    this.sendToDashboard(connectionId, {
      type: 'system_message',
      data: {
        message: 'Connected to Master Node',
        connectionId,
        connectedWorkers: Array.from(this.connectedWorkers.keys())
      },
      timestamp: new Date().toISOString(),
      messageId: nanoid()
    });
  }

  private handleWorkerMessage(workerId: string, message: any): void {
    const worker = this.connectedWorkers.get(workerId);
    if (!worker) return;

    switch (message.type) {
      case 'auth':
        this.authenticateWorker(workerId, message.data);
        break;

      case 'status_update':
        worker.lastPing = new Date();
        this.broadcastToDashboard({
          type: 'worker_status_update',
          data: { workerId, ...message.data },
          timestamp: new Date().toISOString(),
          messageId: nanoid()
        });
        break;

      case 'job_completed':
        this.broadcastToDashboard({
          type: 'dashboard_update',
          data: {
            type: 'job_completed',
            workerId,
            jobId: message.data.jobId,
            result: message.data.result
          },
          timestamp: new Date().toISOString(),
          messageId: nanoid()
        });
        break;

      case 'health_check_response':
        worker.lastPing = new Date();
        console.log(`[WEBSOCKET] Health check response from worker ${workerId}`);
        break;

      case 'ping':
        worker.lastPing = new Date();
        this.sendToWorker(workerId, {
          type: 'system_message',
          data: { message: 'pong' },
          timestamp: new Date().toISOString(),
          messageId: nanoid()
        });
        break;

      default:
        console.log(`[WEBSOCKET] Unknown message type from worker ${workerId}:`, message.type);
    }
  }

  private handleDashboardMessage(connectionId: string, message: any): void {
    const dashboard = this.connectedDashboards.get(connectionId);
    if (!dashboard) return;

    switch (message.type) {
      case 'subscribe':
        if (message.data.channels) {
          dashboard.subscriptions = message.data.channels;
        }
        break;

      case 'request_worker_list':
        this.sendToDashboard(connectionId, {
          type: 'dashboard_update',
          data: {
            type: 'worker_list',
            workers: Array.from(this.connectedWorkers.entries()).map(([id, worker]) => ({
              workerId: id,
              connectionId: worker.connectionId,
              connectedAt: worker.connectedAt,
              lastPing: worker.lastPing,
              authenticated: worker.authenticated
            }))
          },
          timestamp: new Date().toISOString(),
          messageId: nanoid()
        });
        break;

      case 'ping':
        this.sendToDashboard(connectionId, {
          type: 'system_message',
          data: { message: 'pong' },
          timestamp: new Date().toISOString(),
          messageId: nanoid()
        });
        break;

      default:
        console.log(`[WEBSOCKET] Unknown message type from dashboard ${connectionId}:`, message.type);
    }
  }

  private authenticateWorker(workerId: string, authData: any): void {
    const worker = this.connectedWorkers.get(workerId);
    if (!worker) return;

    // TODO: Implement proper authentication with API key validation
    // For now, accept all connections
    worker.authenticated = true;

    this.sendToWorker(workerId, {
      type: 'system_message',
      data: { message: 'Authentication successful' },
      timestamp: new Date().toISOString(),
      messageId: nanoid()
    });

    console.log(`[WEBSOCKET] Worker ${workerId} authenticated`);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHealthChecks();
      this.cleanupStaleConnections();
    }, 30000); // Every 30 seconds

    console.log('[WEBSOCKET] Heartbeat started');
  }

  private sendHealthChecks(): void {
    const message: WebSocketMessage = {
      type: 'health_check',
      data: { timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      messageId: nanoid()
    };

    for (const [workerId] of this.connectedWorkers) {
      this.sendToWorker(workerId, message);
    }
  }

  private cleanupStaleConnections(): void {
    const now = new Date();
    const staleThreshold = 2 * 60 * 1000; // 2 minutes

    for (const [workerId, worker] of this.connectedWorkers) {
      if (now.getTime() - worker.lastPing.getTime() > staleThreshold) {
        console.log(`[WEBSOCKET] Removing stale worker connection: ${workerId}`);
        worker.ws.close();
        this.connectedWorkers.delete(workerId);
      }
    }

    for (const [connectionId, dashboard] of this.connectedDashboards) {
      if (dashboard.ws.readyState === WebSocket.CLOSED) {
        console.log(`[WEBSOCKET] Removing closed dashboard connection: ${connectionId}`);
        this.connectedDashboards.delete(connectionId);
      }
    }
  }

  // Public methods for sending messages

  public sendToWorker(workerId: string, message: WebSocketMessage): boolean {
    const worker = this.connectedWorkers.get(workerId);
    if (!worker || worker.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      worker.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`[WEBSOCKET] Error sending to worker ${workerId}:`, error);
      return false;
    }
  }

  public sendToDashboard(connectionId: string, message: WebSocketMessage): boolean {
    const dashboard = this.connectedDashboards.get(connectionId);
    if (!dashboard || dashboard.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      dashboard.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`[WEBSOCKET] Error sending to dashboard ${connectionId}:`, error);
      return false;
    }
  }

  public broadcastToWorkers(message: WebSocketMessage, excludeWorker?: string): number {
    let sent = 0;
    for (const [workerId] of this.connectedWorkers) {
      if (excludeWorker && workerId === excludeWorker) continue;
      if (this.sendToWorker(workerId, message)) {
        sent++;
      }
    }
    return sent;
  }

  public broadcastToDashboard(message: WebSocketMessage): number {
    let sent = 0;
    for (const [connectionId] of this.connectedDashboards) {
      if (this.sendToDashboard(connectionId, message)) {
        sent++;
      }
    }
    return sent;
  }

  public assignJobToWorker(workerId: string, job: IJob): boolean {
    return this.sendToWorker(workerId, {
      type: 'job_assignment',
      data: {
        jobId: job._id,
        job: job
      },
      timestamp: new Date().toISOString(),
      messageId: nanoid()
    });
  }

  public cancelJobForWorker(workerId: string, jobId: string, reason?: string): boolean {
    return this.sendToWorker(workerId, {
      type: 'job_cancellation',
      data: {
        jobId,
        reason: reason || 'Job cancelled by master'
      },
      timestamp: new Date().toISOString(),
      messageId: nanoid()
    });
  }

  public notifyJobUpdate(job: IJob): void {
    this.broadcastToDashboard({
      type: 'dashboard_update',
      data: {
        type: 'job_update',
        job: job
      },
      timestamp: new Date().toISOString(),
      messageId: nanoid()
    });
  }

  public notifyWorkerUpdate(worker: IWorker): void {
    this.broadcastToDashboard({
      type: 'worker_status_update',
      data: {
        workerId: worker.identifier,
        worker: worker
      },
      timestamp: new Date().toISOString(),
      messageId: nanoid()
    });
  }

  // Utility methods

  public getConnectedWorkers(): string[] {
    return Array.from(this.connectedWorkers.keys());
  }

  public getConnectedDashboards(): string[] {
    return Array.from(this.connectedDashboards.keys());
  }

  public isWorkerConnected(workerId: string): boolean {
    const worker = this.connectedWorkers.get(workerId);
    return worker?.ws.readyState === WebSocket.OPEN;
  }

  public getConnectionStats(): {
    connectedWorkers: number;
    connectedDashboards: number;
    authenticatedWorkers: number;
  } {
    const authenticatedWorkers = Array.from(this.connectedWorkers.values())
      .filter(worker => worker.authenticated).length;

    return {
      connectedWorkers: this.connectedWorkers.size,
      connectedDashboards: this.connectedDashboards.size,
      authenticatedWorkers
    };
  }

  public shutdown(): void {
    console.log('[WEBSOCKET] Shutting down WebSocket server...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    for (const [workerId, worker] of this.connectedWorkers) {
      worker.ws.close(1000, 'Server shutdown');
    }

    for (const [connectionId, dashboard] of this.connectedDashboards) {
      dashboard.ws.close(1000, 'Server shutdown');
    }

    this.wss.close();
    console.log('[WEBSOCKET] WebSocket server shutdown complete');
  }
}

// Global WebSocket manager instance
let wsManager: WebSocketManager | null = null;

export function initializeWebSocketManager(server: HTTPServer): WebSocketManager {
  if (wsManager) {
    return wsManager;
  }

  wsManager = new WebSocketManager(server);
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}
