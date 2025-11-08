import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AdminUsers() {
  const { t } = useLanguage();
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const { data: pendingUsers } = trpc.users.pending.useQuery();
  const updateRoleMutation = trpc.users.updateRole.useMutation();
  const approveMutation = trpc.users.approve.useMutation();
  const updateNameMutation = trpc.users.updateName.useMutation();
  const deleteMutation = trpc.users.delete.useMutation();
  const utils = trpc.useUtils();

  const [editingUser, setEditingUser] = useState<{ id: number; name: string } | null>(null);
  const [newName, setNewName] = useState("");

  const handleRoleChange = async (userId: number, newRole: "admin" | "call_center" | "reception") => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role: newRole });
      toast.success(t('roleUpdated'));
      utils.users.list.invalidate();
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const handleApprove = async (userId: number, role: "admin" | "call_center" | "reception") => {
    try {
      await approveMutation.mutateAsync({ userId, role });
      toast.success(t('userApproved'));
      utils.users.list.invalidate();
      utils.users.pending.invalidate();
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const handleUpdateName = async () => {
    if (!editingUser || !newName.trim()) return;
    
    try {
      await updateNameMutation.mutateAsync({ 
        userId: editingUser.id, 
        displayName: newName.trim() 
      });
      toast.success(t('roleUpdated'));
      utils.users.list.invalidate();
      setEditingUser(null);
      setNewName("");
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const handleDelete = async (userId: number, userName: string) => {
    if (!confirm(`${t('confirmDelete')} ${userName}?`)) return;
    
    try {
      await deleteMutation.mutateAsync({ userId });
      toast.success(t('userDeleted'));
      utils.users.list.invalidate();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      admin: "bg-red-100 text-red-800 border-red-200",
      call_center: "bg-green-100 text-green-800 border-green-200",
      reception: "bg-blue-100 text-blue-800 border-blue-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
    return roleColors[role as keyof typeof roleColors] || "bg-gray-100 text-gray-800";
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: t('admin'),
      call_center: t('callCenter'),
      reception: t('reception'),
      pending: t('pending'),
    };
    return labels[role] || role;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{t('manageUsers')}</h1>
            <p className="text-gray-600 mt-1">{t('usersList')}</p>
          </div>
          <LanguageSwitcher />
        </div>

        {/* المستخدمون المعلقون */}
        {pendingUsers && pendingUsers.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <CardTitle className="text-yellow-900">{t('pendingUsers')}</CardTitle>
              </div>
              <CardDescription>{pendingUsers.length} مستخدم في انتظار الموافقة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between bg-white p-4 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-semibold">{user.displayName || user.name || user.email}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(user.createdAt).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Select onValueChange={(role: any) => handleApprove(user.id, role)}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder={t('approve')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">{t('admin')}</SelectItem>
                          <SelectItem value="call_center">{t('callCenter')}</SelectItem>
                          <SelectItem value="reception">{t('reception')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* جميع المستخدمين */}
        <Card>
          <CardHeader>
            <CardTitle>{t('usersList')}</CardTitle>
            <CardDescription>
              {users?.length || 0} {t('totalUsers')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">{t('loading')}</div>
            ) : !users || users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{t('noUsers')}</div>
            ) : (
              <Table dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{t('userName')}</TableHead>
                    <TableHead className="text-right">{t('email')}</TableHead>
                    <TableHead className="text-right">{t('role')}</TableHead>
                    <TableHead className="text-right">{t('status')}</TableHead>
                    <TableHead className="text-right">{t('registrationDate')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {user.displayName || user.name || "غير محدد"}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingUser({ id: user.id, name: user.displayName || user.name || "" });
                              setNewName(user.displayName || user.name || "");
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadge(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isApproved ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm">موافق عليه</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-yellow-600">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">معلق</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          {user.isApproved && user.role !== 'pending' && (
                            <Select
                              value={user.role}
                              onValueChange={(role: any) => handleRoleChange(user.id, role)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">{t('admin')}</SelectItem>
                                <SelectItem value="call_center">{t('callCenter')}</SelectItem>
                                <SelectItem value="reception">{t('reception')}</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(user.id, user.displayName || user.name || 'User')}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Dialog لتعديل الاسم */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editName')}</DialogTitle>
            <DialogDescription>
              تعديل الاسم المعروض للمستخدم
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="displayName">{t('displayName')}</Label>
              <Input
                id="displayName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('enterYourName')}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleUpdateName} disabled={!newName.trim()}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
