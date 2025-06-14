'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Zap,
  Plus,
  Clock,
  Calendar,
  Settings,
  Target,
  Link,
  Copy,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Layers
} from "lucide-react";

export default function BatchJobsPage() {
  const [form, setForm] = useState({
    baseJob: {
      name: 'Daily Website Monitor',
      description: 'Automated monitoring of website content and performance',
      url: 'https://example.com',
      priority: 5,
      intent: 'monitor website changes and performance metrics',
      useAI: true,
      tags: []
    },
    quantity: 100,
    schedule: {
      type: 'recurring',
      interval: 'daily',
      customInterval: { value: 1, unit: 'hours' },
      startDate: new Date().toISOString().slice(0, 16),
      isActive: true
    },
    urlPattern: {
      type: 'sequential',
      pattern: 'https://example.com/page-{number}',
      startNumber: 1
    }
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const createBatchJobs = async () => {
    setLoading(true);
    setResult(null);

    try {
      const batchData = {
        baseJob: {
          ...form.baseJob,
          type: 'scheduled',
          schedule: {
            type: form.schedule.type,
            interval: form.schedule.interval,
            customInterval: form.schedule.interval === 'custom' ? form.schedule.customInterval : undefined,
            startDate: new Date(form.schedule.startDate),
            isActive: form.schedule.isActive
          },
          createdBy: 'batch-creator'
        },
        quantity: form.quantity,
        urlPattern: form.urlPattern
      };

      const response = await fetch('/api/jobs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData)
      });

      const data = await response.json();
      setResult(data);

    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to create batch jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="h-8 w-8 text-purple-600" />
            Batch Job Creator
          </h1>
          <p className="text-gray-600 mt-2">
            Create {form.quantity} scheduled jobs with automatic scheduling
          </p>
        </div>

        <Button
          onClick={createBatchJobs}
          disabled={loading || !form.baseJob.name || !form.baseJob.url}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Create {form.quantity} Jobs
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Job Configuration</CardTitle>
            <CardDescription>Define your batch job settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Job Name Pattern</Label>
              <Input
                id="name"
                value={form.baseJob.name}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  baseJob: { ...prev.baseJob, name: e.target.value }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Number of Jobs</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="1000"
                value={form.quantity}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  quantity: Number.parseInt(e.target.value) || 1
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Base URL</Label>
              <Input
                id="url"
                value={form.baseJob.url}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  baseJob: { ...prev.baseJob, url: e.target.value }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pattern">URL Pattern</Label>
              <Input
                id="pattern"
                placeholder="https://example.com/page-{number}"
                value={form.urlPattern.pattern}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  urlPattern: { ...prev.urlPattern, pattern: e.target.value }
                }))}
              />
              <p className="text-xs text-gray-500">Use {'{number}'} for sequential numbering</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority (1-10)</Label>
              <Select
                value={form.baseJob.priority.toString()}
                onValueChange={(value) => setForm(prev => ({
                  ...prev,
                  baseJob: { ...prev.baseJob, priority: Number.parseInt(value) }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                    <SelectItem key={p} value={p.toString()}>Priority {p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.baseJob.useAI}
                onCheckedChange={(checked) => setForm(prev => ({
                  ...prev,
                  baseJob: { ...prev.baseJob, useAI: checked }
                }))}
              />
              <Label>Use AI Scenarios</Label>
            </div>

            {form.baseJob.useAI && (
              <div className="space-y-2">
                <Label htmlFor="intent">AI Intent</Label>
                <Input
                  id="intent"
                  value={form.baseJob.intent}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    baseJob: { ...prev.baseJob, intent: e.target.value }
                  }))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduling Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scheduling Configuration
            </CardTitle>
            <CardDescription>Set when and how often jobs should run</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Schedule Type</Label>
              <Select
                value={form.schedule.type}
                onValueChange={(value) => setForm(prev => ({
                  ...prev,
                  schedule: { ...prev.schedule, type: value as any }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Run Once</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.schedule.type === 'recurring' && (
              <div className="space-y-2">
                <Label>Interval</Label>
                <Select
                  value={form.schedule.interval}
                  onValueChange={(value) => setForm(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, interval: value as any }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.schedule.type === 'recurring' && form.schedule.interval === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customValue">Value</Label>
                  <Input
                    id="customValue"
                    type="number"
                    min="1"
                    value={form.schedule.customInterval.value}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      schedule: {
                        ...prev.schedule,
                        customInterval: {
                          ...prev.schedule.customInterval,
                          value: Number.parseInt(e.target.value) || 1
                        }
                      }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select
                    value={form.schedule.customInterval.unit}
                    onValueChange={(value) => setForm(prev => ({
                      ...prev,
                      schedule: {
                        ...prev.schedule,
                        customInterval: {
                          ...prev.schedule.customInterval,
                          unit: value as any
                        }
                      }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date & Time</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={form.schedule.startDate}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  schedule: { ...prev.schedule, startDate: e.target.value }
                }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.schedule.isActive}
                onCheckedChange={(checked) => setForm(prev => ({
                  ...prev,
                  schedule: { ...prev.schedule, isActive: checked }
                }))}
              />
              <Label>Schedule is Active</Label>
            </div>

            {/* Preview */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <Label className="text-sm font-medium">Schedule Preview:</Label>
              <div className="mt-2 text-sm text-gray-600">
                <div><strong>Type:</strong> {form.schedule.type === 'once' ? 'Run Once' : 'Recurring'}</div>
                <div><strong>Frequency:</strong> {
                  form.schedule.type === 'once' ? 'Single execution' :
                  form.schedule.interval === 'custom'
                    ? `Every ${form.schedule.customInterval.value} ${form.schedule.customInterval.unit}`
                    : `Every ${form.schedule.interval.replace('ly', '')}`
                }</div>
                <div><strong>Start:</strong> {new Date(form.schedule.startDate).toLocaleString()}</div>
                <div><strong>Jobs:</strong> {form.quantity} total jobs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Examples
          </CardTitle>
          <CardDescription>Common batch job patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start text-left"
              onClick={() => setForm(prev => ({
                ...prev,
                baseJob: {
                  ...prev.baseJob,
                  name: 'Daily E-commerce Monitor',
                  intent: 'monitor product prices and availability'
                },
                quantity: 100,
                schedule: { ...prev.schedule, interval: 'daily' },
                urlPattern: { ...prev.urlPattern, pattern: 'https://store.com/product/{number}' }
              }))}
            >
              <h3 className="font-medium">E-commerce Monitoring</h3>
              <p className="text-sm text-gray-600 mt-1">100 product pages, daily checks</p>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start text-left"
              onClick={() => setForm(prev => ({
                ...prev,
                baseJob: {
                  ...prev.baseJob,
                  name: 'Hourly News Scraper',
                  intent: 'extract latest news headlines and content'
                },
                quantity: 50,
                schedule: { ...prev.schedule, interval: 'hourly' },
                urlPattern: { ...prev.urlPattern, pattern: 'https://news-site.com/page/{number}' }
              }))}
            >
              <h3 className="font-medium">News Monitoring</h3>
              <p className="text-sm text-gray-600 mt-1">50 news pages, hourly updates</p>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start text-left"
              onClick={() => setForm(prev => ({
                ...prev,
                baseJob: {
                  ...prev.baseJob,
                  name: 'API Health Check',
                  intent: 'test API endpoint availability and response times'
                },
                quantity: 20,
                schedule: {
                  ...prev.schedule,
                  interval: 'custom',
                  customInterval: { value: 15, unit: 'minutes' }
                },
                urlPattern: { ...prev.urlPattern, pattern: 'https://api.service.com/v1/endpoint-{number}' }
              }))}
            >
              <h3 className="font-medium">API Monitoring</h3>
              <p className="text-sm text-gray-600 mt-1">20 endpoints, every 15 minutes</p>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Batch Creation Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Successfully created {result.data?.totalCreated || 0} out of {form.quantity} jobs!
                  </AlertDescription>
                </Alert>

                {result.data?.jobs && result.data.jobs.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Sample Created Jobs:</Label>
                    <div className="space-y-1">
                      {result.data.jobs.slice(0, 5).map((job, index) => (
                        <div key={index} className="text-sm p-2 bg-gray-50 rounded flex items-center justify-between">
                          <span>{job.name}</span>
                          <Badge variant="outline">{job.status}</Badge>
                        </div>
                      ))}
                      {result.data.jobs.length > 5 && (
                        <div className="text-sm text-gray-500 p-2">
                          ... and {result.data.jobs.length - 5} more jobs
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {result.error}: {result.details}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
