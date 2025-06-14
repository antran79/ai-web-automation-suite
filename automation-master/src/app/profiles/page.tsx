"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Import, Export, Trash2, RefreshCw, Move, Users } from "lucide-react";

interface ProfileGroup {
  _id: string;
  name: string;
  description?: string;
}
interface Profile {
  _id: string;
  name: string;
  userAgent: string;
  region?: string;
  group: string;
}

export default function ProfileManagerPage() {
  const [groups, setGroups] = useState<ProfileGroup[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<null | "group" | "profile" | "import" | "export" | "move" | "delete">(null);

  useEffect(() => {
    fetch("/api/profiles/group")
      .then((res) => res.json())
      .then((data) => setGroups(data.data || []));
  }, []);

  useEffect(() => {
    if (!selectedGroup) {
      setProfiles([]);
      return;
    }
    setLoading(true);
    fetch(`/api/profiles/group/${selectedGroup}/profiles`)
      .then((res) => res.json())
      .then((data) => {
        setProfiles(data.data || []);
        setLoading(false);
      });
  }, [selectedGroup]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar: Profile Groups */}
      <aside className="w-72 bg-white border-r h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-bold flex gap-1 items-center"><Users className="h-5 w-5 text-green-600" /> Profile Groups</h2>
          <Button size="icon" variant="ghost" onClick={() => setDialog("group")}> <Plus /> </Button>
        </div>
        <div className="overflow-auto flex-1">
          {groups.length === 0 && (
            <div className="p-6 text-center text-gray-500">No groups.<br />Create one.</div>
          )}
          {groups.map((g) => (
            <button
              key={g._id}
              onClick={() => setSelectedGroup(g._id)}
              className={`w-full text-left px-4 py-2 hover:bg-green-50 flex items-center gap-2 ${selectedGroup === g._id ? "bg-green-100 font-semibold" : ""}`}
            >
              <span>{g.name}</span>
              {g.description && <span className="ml-2 text-xs text-gray-400">{g.description}</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-green-600" />
              Profile Manager
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Quản lý profile trình duyệt ảo theo group. Tạo, import/export, xoá lô, di chuyển profile siêu linh động.</p>
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
                <CardTitle>Profile trong Nhóm</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => setDialog("profile")}> <Plus className="h-4 w-4" /> New </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDialog("move")}> <Move className="h-4 w-4" /> Move</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDialog("delete")}> <Trash2 className="h-4 w-4" /> Delete</Button>
                  <Button size="sm" variant="ghost" onClick={() => setLoading(true)}><RefreshCw className={loading ? 'animate-spin h-4 w-4' : 'h-4 w-4'} /> </Button>
                </div>
              </div>
              <CardDescription>Danh sách profile trong nhóm, thao tác lô.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-green-600 font-bold">Loading...</div>
              ) : profiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No profile in group.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="min-w-full border mt-2">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-2 py-1 text-left text-xs">Name</th>
                        <th className="px-2 py-1 text-left text-xs">User-Agent</th>
                        <th className="px-2 py-1 text-left text-xs">Region</th>
                        <th className="px-2 py-1 text-left text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((p) => (
                        <tr key={p._id} className="border-b hover:bg-green-50">
                          <td className="px-2 py-1 font-medium max-w-xs truncate">{p.name}</td>
                          <td className="px-2 py-1 text-xs text-gray-600 truncate max-w-[250px]">{p.userAgent?.slice(0, 50) || '-'}</td>
                          <td className="px-2 py-1 text-xs">{p.region || '-'}</td>
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
              <div className="text-2xl mb-2">Chọn group để xem hoặc quản lý profiles</div>
              <div className="text-gray-400">(Bấm vào group ở sidebar)</div>
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
                {dialog === "group" ? "Thêm Group profile"
                : dialog === "profile" ? "Thêm Profile mới"
                : dialog === "import" ? "Import Profiles"
                : dialog === "export" ? "Export Profiles"
                : dialog === "delete" ? "Xoá hàng loạt profiles"
                : dialog === "move" ? "Chuyển group cho profiles"
                : null}
              </DialogTitle>
              <DialogDescription>
                {dialog === "import" && "Nhập file JSON/CSV hoặc dán batch profiles để thêm nhanh vào group."}
                {dialog === "export" && "Bạn có thể export toàn bộ hoặc các profiles đã chọn ra file."}
                {dialog === "group" && "Tên/ghi chú group bắt buộc."}
                {dialog === "delete" && "Chọn các profiles muốn xoá lô khỏi group."}
                {dialog === "move" && "Chọn group đích để chuyển profiles đã chọn."}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-[80px] flex flex-col items-center justify-center text-gray-400">(UI chi tiết sẽ được bổ sung tiếp ở các bước sau)</div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
