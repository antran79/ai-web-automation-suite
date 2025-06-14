'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import {
  Activity,
  Server,
  Users,
  Zap,
  Plus,
  Globe,
  Shield,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Monitor,
  Wifi,
  WifiOff,
  Settings,
  Copy,
  RefreshCw,
  Trash2,
  Brain,
  Target,
  Layers
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  jobs: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  workers: {
    total: number;
    online: number;
    busy: number;
    offline: number;
  };
  proxies: {
    total: number;
    active: number;
    failed: number;
  };
  system: {
    uptime: string;
    queueSize: number;
    throughput: number;
  };
}

interface Job {
  _id: string;
  name: string;
  url: string;
  status: string;
  priority: number;
  type: string;
  assignedWorker?: string;
  metadata: {
    createdAt: string;
    createdBy: string;
  };
  execution: {
    duration?: number;
    attempts: number;
  };
}

interface Worker {
  _id: string;
  name: string;
  identifier: string;
  type: string;
  status: string;
  connection: {
    ip: string;
    port?: number;
    lastSeen: string;
  };
  capabilities: {
    maxConcurrentJobs: number;
    memory: number;
    cpu: number;
  };
  resources: {
    currentJobs: number;
    totalJobsProcessed: number;
    successRate: number;
  };
}

interface Proxy {
  _id: string;
  name?: string;
  host: string;
  port: number;
  protocol: string;
  status: string;
  quality: {
    speed: number;
    reliability: number;
    anonymity: string;
    location?: {
      country: string;
      city?: string;
    };
  };
  usage: {
    totalRequests: number;
    successfulRequests: number;
    currentlyUsedBy?: string;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    jobs: { total: 0, pending: 0, running: 0, completed: 0, failed: 0 },
    workers: { total: 0, online: 0, busy: 0, offline: 0 },
    proxies: { total: 0, active: 0, failed: 0 },
    system: { uptime: '0h 0m', queueSize: 0, throughput: 0 }
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [isCreateProxyOpen, setIsCreateProxyOpen] = useState(false);

  // Form states
  const [newJob, setNewJob] = useState({
    name: '',
    description: '',
    url: '',
    priority: 5,
    type: 'single'
  });



  const [newProxy, setNewProxy] = useState({
    name: '',
    host: '',
    port: 8080,
    protocol: 'http',
    username: '',
    password: '',
    anonymity: 'anonymous'
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load real stats when APIs are available
      try {
        const statsResponse = await fetch('/api/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.data);
        }
      } catch {
        // Fallback to demo data
        setStats({
          jobs: { total: 156, pending: 12, running: 8, completed: 134, failed: 2 },
          workers: { total: 25, online: 18, busy: 6, offline: 1 },
          proxies: { total: 500, active: 487, failed: 13 },
          system: { uptime: '15d 8h 23m', queueSize: 24, throughput: 145.8 }
        });
      }

      // Load workers
      try {
        const workersResponse = await fetch('/api/workers?limit=10');
        if (workersResponse.ok) {
          const workersData = await workersResponse.json();
          setWorkers(workersData.data.workers);
        }
      } catch {
        // Fallback demo workers
        setWorkers([
          {
            _id: '1',
            name: 'Worker Node 01',
            identifier: 'wn-001',
            type: 'vps',
            status: 'online',
            connection: { ip: '192.168.1.100', port: 3001, lastSeen: new Date().toISOString() },
            capabilities: { maxConcurrentJobs: 3, memory: 2048, cpu: 2 },
            resources: { currentJobs: 1, totalJobsProcessed: 245, successRate: 98.2 }
          },
          {
            _id: '2',
            name: 'Worker Node 02',
            identifier: 'wn-002',
            type: 'cloud',
            status: 'busy',
            connection: { ip: '192.168.1.101', port: 3001, lastSeen: new Date().toISOString() },
            capabilities: { maxConcurrentJobs: 5, memory: 4096, cpu: 4 },
            resources: { currentJobs: 5, totalJobsProcessed: 678, successRate: 97.8 }
          }
        ]);
      }

      // Load proxies
      try {
        const proxiesResponse = await fetch('/api/proxies?limit=10');
        if (proxiesResponse.ok) {
          const proxiesData = await proxiesResponse.json();
          setProxies(proxiesData.data.proxies);
        }
      } catch {
        // Fallback demo proxies
        setProxies([
          {
            _id: '1',
            name: 'Premium US Proxy',
            host: '192.168.1.200',
            port: 8080,
            protocol: 'http',
            status: 'active',
            quality: { speed: 450, reliability: 99.2, anonymity: 'elite', location: { country: 'US', city: 'New York' } },
            usage: { totalRequests: 1250, successfulRequests: 1240, currentlyUsedBy: 'wn-001' }
          },
          {
            _id: '2',
            host: '192.168.1.201',
            port: 1080,
            protocol: 'socks5',
            status: 'active',
            quality: { speed: 320, reliability: 97.5, anonymity: 'anonymous', location: { country: 'UK', city: 'London' } },
            usage: { totalRequests: 890, successfulRequests: 868 }
          }
        ]);
      }

      // Simulate some jobs data
      setJobs([
        {
          _id: '1',
          name: 'Test Website Analysis',
          url: 'https://example.com',
          status: 'completed',
          priority: 5,
          type: 'single',
          metadata: {
            createdAt: new Date().toISOString(),
            createdBy: 'admin'
          },
          execution: {
            duration: 5000,
            attempts: 1
          }
        },
        {
          _id: '2',
          name: 'E-commerce Automation',
          url: 'https://shop.example.com',
          status: 'running',
          priority: 8,
          type: 'batch',
          assignedWorker: 'wn-001',
          metadata: {
            createdAt: new Date(Date.now() - 300000).toISOString(),
            createdBy: 'system'
          },
          execution: {
            attempts: 1
          }
        }
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createJob = async () => {
    try {
      console.log('Creating job:', newJob);
      await new Promise(resolve => setTimeout(resolve, 500));

      const newJobData: Job = {
        _id: Date.now().toString(),
        ...newJob,
        status: 'pending',
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: 'dashboard'
        },
        execution: {
          attempts: 0
        }
      };

      setJobs(prev => [newJobData, ...prev]);
      setIsCreateJobOpen(false);
      setNewJob({ name: '', description: '', url: '', priority: 5, type: 'single' });
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };



  const createProxy = async () => {
    try {
      console.log('Creating proxy:', newProxy);
      await new Promise(resolve => setTimeout(resolve, 500));

      const newProxyData: Proxy = {
        _id: Date.now().toString(),
        name: newProxy.name,
        host: newProxy.host,
        port: newProxy.port,
        protocol: newProxy.protocol,
        status: 'testing',
        quality: {
          speed: 0,
          reliability: 0,
          anonymity: newProxy.anonymity
        },
        usage: {
          totalRequests: 0,
          successfulRequests: 0
        }
      };

      setProxies(prev => [newProxyData, ...prev]);
      setIsCreateProxyOpen(false);
      setNewProxy({ name: '', host: '', port: 8080, protocol: 'http', username: '', password: '', anonymity: 'anonymous' });
    } catch (error) {
      console.error('Error creating proxy:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'online':
      case 'active': return 'bg-green-100 text-green-800';
      case 'running':
      case 'busy': return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'testing': return 'bg-yellow-100 text-yellow-800';
      case 'queued': return 'bg-purple-100 text-purple-800';
      case 'failed':
      case 'offline':
      case 'error': return 'bg-red-100 text-red-800';
      case 'cancelled':
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'running': return <PlayCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'queued': return <PauseCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      case 'online': return <Wifi className="h-4 w-4" />;
      case 'offline': return <WifiOff className="h-4 w-4" />;
      case 'busy': return <Activity className="h-4 w-4" />;
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'testing': return <RefreshCw className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg text-gray-700">Loading Master Node Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Server className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Automation Master</h1>
                  <p className="text-sm text-gray-500">Central Management System</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                ● Online
              </Badge>
              <Dialog open={isCreateJobOpen} onOpenChange={setIsCreateJobOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New Job
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Job</DialogTitle>
                    <DialogDescription>
                      Create a new automation job to be distributed to workers.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Job name"
                      value={newJob.name}
                      onChange={(e) => setNewJob(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      placeholder="Target URL"
                      value={newJob.url}
                      onChange={(e) => setNewJob(prev => ({ ...prev, url: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={newJob.description}
                      onChange={(e) => setNewJob(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Select value={newJob.type} onValueChange={(value) => setNewJob(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="batch">Batch</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={newJob.priority.toString()} onValueChange={(value) => setNewJob(prev => ({ ...prev, priority: Number.parseInt(value) }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Priority 1 (Lowest)</SelectItem>
                          <SelectItem value="3">Priority 3</SelectItem>
                          <SelectItem value="5">Priority 5 (Normal)</SelectItem>
                          <SelectItem value="7">Priority 7</SelectItem>
                          <SelectItem value="10">Priority 10 (Highest)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateJobOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createJob}>
                        Create Job
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Jobs</CardTitle>
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.jobs.total}</div>
              <div className="flex space-x-4 mt-2 text-xs">
                <span className="text-green-600">✓ {stats.jobs.completed}</span>
                <span className="text-blue-600">▶ {stats.jobs.running}</span>
                <span className="text-yellow-600">⏳ {stats.jobs.pending}</span>
                <span className="text-red-600">✗ {stats.jobs.failed}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Workers</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.workers.total}</div>
              <div className="flex space-x-4 mt-2 text-xs">
                <span className="text-green-600">● {stats.workers.online}</span>
                <span className="text-blue-600">⚡ {stats.workers.busy}</span>
                <span className="text-gray-600">○ {stats.workers.offline}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Proxies</CardTitle>
                <Shield className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.proxies.total}</div>
              <div className="flex space-x-4 mt-2 text-xs">
                <span className="text-green-600">✓ {stats.proxies.active}</span>
                <span className="text-red-600">✗ {stats.proxies.failed}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">System</CardTitle>
                <BarChart3 className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.system.throughput}/h</div>
              <div className="flex space-x-4 mt-2 text-xs">
                <span className="text-blue-600">⏱ {stats.system.uptime}</span>
                <span className="text-purple-600">📋 {stats.system.queueSize}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/scenarios">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-purple-200 hover:border-purple-400">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Scenarios</h3>
                    <p className="text-sm text-gray-600">Generate & manage AI browsing scenarios</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/profiles">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-blue-200 hover:border-blue-400">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Fingerprint Profiles</h3>
                    <p className="text-sm text-gray-600">Create & manage browser fingerprints</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Dialog open={isCreateJobOpen} onOpenChange={setIsCreateJobOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-green-200 hover:border-green-400">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Target className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Create Job</h3>
                      <p className="text-sm text-gray-600">Start a new automation task</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
          </Dialog>

          <Link href="/proxy-groups">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-orange-200 hover:border-orange-400">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Shield className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Proxy Groups</h3>
                    <p className="text-sm text-gray-600">Manage proxy pools & import CSV</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/batch-jobs">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-purple-200 hover:border-purple-400">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Layers className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Batch Jobs</h3>
                    <p className="text-sm text-gray-600">Create 100+ scheduled jobs with patterns</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="jobs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="workers">Workers</TabsTrigger>
            <TabsTrigger value="proxies">Proxies</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Jobs</CardTitle>
                <CardDescription>Latest automation jobs in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div key={job._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(job.status)}
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                        <div>
                          <div className="font-medium">{job.name}</div>
                          <div className="text-sm text-gray-500 flex items-center space-x-4">
                            <span className="flex items-center">
                              <Globe className="h-3 w-3 mr-1" />
                              {job.url}
                            </span>
                            <span>Priority: {job.priority}</span>
                            <span>Type: {job.type}</span>
                            {job.assignedWorker && <span>Worker: {job.assignedWorker}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div>{new Date(job.metadata.createdAt).toLocaleDateString()}</div>
                        <div>by {job.metadata.createdBy}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Worker Nodes</CardTitle>
                    <CardDescription>
                      Workers automatically register when deployed on VPS/servers. Deploy automation-worker to see them here.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Wifi className="h-3 w-3 mr-1" />
                      Auto-Discovery
                    </Badge>
                    <Button variant="outline" onClick={loadDashboardData}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {workers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto mb-4 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Server className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Workers Connected</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Deploy the automation-worker on your VPS/servers to see them automatically appear here.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 max-w-lg mx-auto">
                      <h4 className="font-medium mb-2">Quick Deploy Commands:</h4>
                      <div className="text-left space-y-2 text-sm font-mono">
                        <div className="bg-white p-2 rounded border">
                          <span className="text-gray-500"># Clone worker code</span><br />
                          git clone your-repo/automation-worker.git
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <span className="text-gray-500"># Configure master URL</span><br />
                          echo "MASTER_URL=http://your-master-ip:3000" &gt; .env
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <span className="text-gray-500"># Start worker</span><br />
                          bun install && bun run dev
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Worker</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Jobs</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Resources</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workers.map((worker) => (
                        <TableRow key={worker._id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{worker.name}</div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Monitor className="h-3 w-3 mr-1" />
                                {worker.connection.ip}:{worker.connection.port}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(worker.status)}
                              <Badge className={getStatusColor(worker.status)}>
                                {worker.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{worker.resources.currentJobs}/{worker.capabilities.maxConcurrentJobs}</div>
                              <div className="text-gray-500">Total: {worker.resources.totalJobsProcessed}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{worker.resources.successRate.toFixed(1)}% success</div>
                              <div className="text-gray-500">
                                Last seen: {new Date(worker.connection.lastSeen).toLocaleTimeString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{worker.capabilities.memory}MB RAM</div>
                              <div className="text-gray-500">{worker.capabilities.cpu} CPU cores</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => copyToClipboard(worker.identifier)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Settings className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proxies" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Proxy Pool</CardTitle>
                    <CardDescription>Manage proxy resources and rotation</CardDescription>
                  </div>
                  <Dialog open={isCreateProxyOpen} onOpenChange={setIsCreateProxyOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Proxy
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Proxy</DialogTitle>
                        <DialogDescription>
                          Add a proxy to the rotation pool
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Proxy name (optional)"
                          value={newProxy.name}
                          onChange={(e) => setNewProxy(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Host/IP"
                            value={newProxy.host}
                            onChange={(e) => setNewProxy(prev => ({ ...prev, host: e.target.value }))}
                          />
                          <Input
                            type="number"
                            placeholder="Port"
                            value={newProxy.port}
                            onChange={(e) => setNewProxy(prev => ({ ...prev, port: Number.parseInt(e.target.value) }))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Select value={newProxy.protocol} onValueChange={(value) => setNewProxy(prev => ({ ...prev, protocol: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Protocol" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="http">HTTP</SelectItem>
                              <SelectItem value="https">HTTPS</SelectItem>
                              <SelectItem value="socks4">SOCKS4</SelectItem>
                              <SelectItem value="socks5">SOCKS5</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={newProxy.anonymity} onValueChange={(value) => setNewProxy(prev => ({ ...prev, anonymity: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Anonymity" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="transparent">Transparent</SelectItem>
                              <SelectItem value="anonymous">Anonymous</SelectItem>
                              <SelectItem value="elite">Elite</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Username (optional)"
                            value={newProxy.username}
                            onChange={(e) => setNewProxy(prev => ({ ...prev, username: e.target.value }))}
                          />
                          <Input
                            type="password"
                            placeholder="Password (optional)"
                            value={newProxy.password}
                            onChange={(e) => setNewProxy(prev => ({ ...prev, password: e.target.value }))}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsCreateProxyOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={createProxy}>
                            Add Proxy
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proxy</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proxies.map((proxy) => (
                      <TableRow key={proxy._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{proxy.name || 'Unnamed'}</div>
                            <div className="text-sm text-gray-500">
                              {proxy.host}:{proxy.port} ({proxy.protocol})
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(proxy.status)}
                            <Badge className={getStatusColor(proxy.status)}>
                              {proxy.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{proxy.quality.reliability.toFixed(1)}% reliable</div>
                            <div className="text-gray-500">{proxy.quality.speed}ms response</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{proxy.usage.totalRequests} requests</div>
                            <div className="text-gray-500">
                              {proxy.usage.currentlyUsedBy ? `Used by ${proxy.usage.currentlyUsedBy}` : 'Available'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {proxy.quality.location ? (
                              <div>
                                <div>{proxy.quality.location.country}</div>
                                {proxy.quality.location.city && (
                                  <div className="text-gray-500">{proxy.quality.location.city}</div>
                                )}
                              </div>
                            ) : (
                              <div className="text-gray-500">Unknown</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Settings className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Overall system performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>CPU Usage</span>
                    <span className="font-mono">45%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Memory Usage</span>
                    <span className="font-mono">2.3GB / 8GB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Queue Processing</span>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Redis Connection</span>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>MongoDB Connection</span>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Configuration</CardTitle>
                  <CardDescription>System settings and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Auto-scaling</span>
                    <Switch />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Proxy rotation</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Job retry</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Real-time monitoring</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Debug logging</span>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
