'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus,
  Shield,
  Upload,
  Trash2,
  Eye,
  Activity,
  Clock,
  TrendingUp,
  Server,
  Globe
} from "lucide-react";

interface ProxyGroup {
  _id: string;
  name: string;
  description?: string;
  category: string;
  stats: {
    totalProxies: number;
    activeProxies: number;
    failedProxies: number;
    avgReliability: number;
    avgResponseTime: number;
    lastHealthCheck?: Date;
  };
  metadata: {
    tags: string[];
  };
}

export default function ProxyGroupsPage() {
  const [groups, setGroups] = useState<ProxyGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/proxy-groups');
      const data = await response.json();

      if (data.success) {
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Failed to fetch proxy groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'residential': return 'bg-green-100 text-green-800';
      case 'datacenter': return 'bg-blue-100 text-blue-800';
      case 'mobile': return 'bg-purple-100 text-purple-800';
      case 'static': return 'bg-gray-100 text-gray-800';
      case 'rotating': return 'bg-orange-100 text-orange-800';
      case 'custom': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateHealthScore = (group: ProxyGroup) => {
    const reliability = group.stats.avgReliability || 0;
    const activeRatio = group.stats.totalProxies > 0 ?
      (group.stats.activeProxies / group.stats.totalProxies) * 100 : 0;
    const speedScore = group.stats.avgResponseTime < 500 ? 100 :
      Math.max(0, 100 - (group.stats.avgResponseTime - 500) / 10);

    return Math.round((reliability * 0.5 + activeRatio * 0.3 + speedScore * 0.2));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Proxy Groups Manager
          </h1>
          <p className="text-gray-600 mt-2">
            Organize and manage your proxy pools with advanced grouping and import features
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>

          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Groups</p>
                <p className="text-2xl font-bold">{groups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Total Proxies</p>
                <p className="text-2xl font-bold">{groups.reduce((sum, g) => sum + g.stats.totalProxies, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Active Proxies</p>
                <p className="text-2xl font-bold">{groups.reduce((sum, g) => sum + g.stats.activeProxies, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Avg Reliability</p>
                <p className="text-2xl font-bold">
                  {groups.length > 0 ?
                    Math.round(groups.reduce((sum, g) => sum + g.stats.avgReliability, 0) / groups.length) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Proxy Groups
          </CardTitle>
          <CardDescription>
            Manage your proxy groups and monitor their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading proxy groups...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No proxy groups found. Create your first group to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Details</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Proxies</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Health Score</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{group.name}</div>
                        {group.description && (
                          <div className="text-sm text-gray-500 truncate max-w-[200px]">
                            {group.description}
                          </div>
                        )}
                        <div className="flex gap-1 mt-1">
                          {group.metadata.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(group.category)}>
                        {group.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{group.stats.totalProxies} total</div>
                        <div className="text-green-600">{group.stats.activeProxies} active</div>
                        <div className="text-red-600">{group.stats.failedProxies} failed</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{group.stats.avgReliability.toFixed(1)}% reliability</div>
                        <div className="text-gray-500">{Math.round(group.stats.avgResponseTime)}ms avg</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              calculateHealthScore(group) >= 80 ? 'bg-green-500' :
                              calculateHealthScore(group) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${calculateHealthScore(group)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{calculateHealthScore(group)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Upload className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
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
    </div>
  );
}
