"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Import, Export, Trash2, RefreshCw, Move, Folder } from "lucide-react";

// Types
interface Domain {
  _id: string;
  domain: string;
  description?: string;
}
interface Group {
  _id: string;
  name: string;
  description?: string;
  domain: string;
}
interface Scenario {
  _id: string;
  title: string;
  intent: string;
  description?: string;
  steps?: any[];
  group: string;
}

export default function ScenarioManagerPage() {
  // State
  const [domains, setDomains] = useState<Domain[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dialog state (CRUD domain, group, scenario, import/export/delete batch)
  const [dialog, setDialog] = useState<null | "domain" | "group" | "scenario" | "import" | "export" | "move" | "delete">(null);

  // Fetch all domains
  useEffect(() => {
    fetch("/api/scenarios/domain")
      .then((res) => res.json())
      .then((data) => setDomains(data.data || []));
  }, []);

  // Fetch groups when domain changes
  useEffect(() => {
    if (!selectedDomain) {
      setGroups([]);
      setSelectedGroup(null);
      setScenarios([]);
      return;
    }
    setLoading(true);
    fetch(`/api/scenarios/group?domainId=${selectedDomain}`)
      .then((res) => res.json())
      .then((data) => {
        setGroups(data.data || []);
        setLoading(false);
        setSelectedGroup(null);
        setScenarios([]);
      });
  }, [selectedDomain]);

  // Fetch scenarios when group changes
  useEffect(() => {
    if (!selectedGroup) {
      setScenarios([]);
      return;
    }
    setLoading(true);
    fetch(`/api/scenarios/group/${selectedGroup}/scenarios`)
      .then((res) => res.json())
      .then((data) => {
        setScenarios(data.data || []);
        setLoading(false);
      });
  }, [selectedGroup]);

  // UI Functionality
  const handleSelectDomain = (id: string) => setSelectedDomain(id);
  const handleSelectGroup = (id: string) => setSelectedGroup(id);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Domains & Groups */}
      <aside className="w-72 bg-white border-r h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-bold flex gap-1 items-center"><Folder className="h-5 w-5 text-purple-500" /> Domains</h2>
          <Button size="icon" variant="ghost" onClick={() => setDialog("domain")}> <Plus /> </Button>
        </div>
        <div className="overflow-auto flex-1">
          {domains.length === 0 && (
            <div className="p-6 text-center text-gray-500">No domains.<br />Create one.</div>
          )}
          {domains.map((domain) => (
            <div key={domain._id}>
              <button onClick={() => handleSelectDomain(domain._id)}
                className={`w-full text-left px-4 py-2 hover:bg-purple-50 flex items-center gap-2 ${
                  selectedDomain === domain._id ? "bg-purple-100 font-semibold" : ""
                }`}>
                <span>{domain.domain}</span>
              </button>
              {/* Groups for selected domain */}
              {selectedDomain === domain._id && (
                <div className="pl-4">
                  <div className="flex justify-between items-center pr-2 mb-1">
                    <span className="text-xs text-gray-400">Groups</span>
                    <Button size="icon" variant="ghost" onClick={() => setDialog("group")}> <Plus className="h-3 w-3" /> </Button>
                  </div>
                  {groups.length === 0 ? (
                    <div className="text-xs text-gray-400 pl-2 py-1">No group</div>
                  ) : groups.map((g) => (
                    <button
                      key={g._id}
                      onClick={() => handleSelectGroup(g._id)}
                      className={`text-left w-full px-3 py-1.5 rounded hover:bg-purple-50 ${selectedGroup === g._id ? "bg-purple-200 font-medium" : ""}`}
                    >{g.name}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Folder className="h-6 w-6 text-purple-500" />
              Scenario Manager
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Quản lý kịch bản AI theo domain & group. Tạo/lưu hàng loạt kịch bản, import/export, chuyển group dễ dàng.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDialog("import")}><Import className="h-4 w-4 mr-1" />Import</Button>
            <Button variant="outline" onClick={() => setDialog("export")}><Export className="h-4 w-4 mr-1" />Export</Button>
          </div>
        </div>

        {selectedGroup ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Kịch bản trong Group</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => setDialog("scenario")}> <Plus className="h-4 w-4" /> New </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDialog("move")}> <Move className="h-4 w-4" /> Move</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDialog("delete")}> <Trash2 className="h-4 w-4" /> Delete</Button>
                  <Button size="sm" variant="ghost" onClick={() => setLoading(true)}><RefreshCw className={loading ? 'animate-spin h-4 w-4' : 'h-4 w-4'} /> </Button>
                </div>
              </div>
              <CardDescription>Danh sách kịch bản trong group và các batch thao tác.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-purple-500 font-bold">Loading...</div>
              ) : scenarios.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No scenario in group.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="min-w-full border mt-2">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-2 py-1 text-left text-xs">Title</th>
                        <th className="px-2 py-1 text-left text-xs">Intent</th>
                        <th className="px-2 py-1 text-left text-xs">#Steps</th>
                        <th className="px-2 py-1 text-left text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map((s) => (
                        <tr key={s._id} className="border-b hover:bg-purple-50">
                          <td className="px-2 py-1 font-medium max-w-xs truncate">{s.title}</td>
                          <td className="px-2 py-1 text-xs text-gray-600">{s.intent}</td>
                          <td className="px-2 py-1 text-xs">{s.steps?.length || 0}</td>
                          <td className="px-2 py-1 flex gap-2">
                            <Button size="icon" variant="ghost"><Export className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-6">
            <CardContent className="py-8 text-center text-gray-400">
              <div className="text-2xl mb-2">Chọn group để xem hoặc quản lý kịch bản</div>
              <div className="text-gray-400">(Bấm vào domain → group ở sidebar)</div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialog + Modal placeholder */}
      <Dialog open={dialog !== null} onOpenChange={() => setDialog(null)}>
        {dialog && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialog === "domain" ? "Thêm Domain"
                : dialog === "group" ? "Thêm Group cho Domain"
                : dialog === "scenario" ? "Thêm Kịch bản mới"
                : dialog === "import" ? "Import Kịch bản"
                : dialog === "export" ? "Export Kịch bản"
                : dialog === "delete" ? "Xoá hàng loạt kịch bản"
                : dialog === "move" ? "Chuyển group cho kịch bản"
                : null}
              </DialogTitle>
              <DialogDescription>
                {dialog === "import" && "Nhập file JSON hoặc dán batch kịch bản để thêm nhanh vào group."}
                {dialog === "export" && "Bạn có thể export toàn bộ hoặc các kịch bản đã chọn ra file JSON."}
                {(dialog === "domain" || dialog === "group") && "Tên và mô tả là bắt buộc."}
                {dialog === "delete" && "Chọn các kịch bản để xoá hàng loạt khỏi group."}
                {dialog === "move" && "Chọn group đích để chuyển những kịch bản đã chọn."}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-[80px] flex flex-col items-center justify-center text-gray-400">(UI chi tiết sẽ được bổ sung tiếp ở các bước sau)</div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
