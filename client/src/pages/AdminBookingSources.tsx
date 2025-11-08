import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function AdminBookingSources() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<any>(null);
  const [newSource, setNewSource] = useState({ name: "" });

  const { data: sources, isLoading, refetch } = trpc.bookingSources.list.useQuery();
  const createMutation = trpc.bookingSources.create.useMutation();
  const updateMutation = trpc.bookingSources.update.useMutation();
  const deleteMutation = trpc.bookingSources.delete.useMutation();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'admin')) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, user, setLocation]);

  const handleCreate = async () => {
    if (!newSource.name.trim()) {
      toast.error("الرجاء إدخال اسم المصدر");
      return;
    }

    try {
      await createMutation.mutateAsync(newSource);
      toast.success("تم إضافة المصدر بنجاح");
      setIsAddDialogOpen(false);
      setNewSource({ name: "" });
      refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء إضافة المصدر");
    }
  };

  const handleUpdate = async () => {
    if (!editingSource?.name?.trim()) {
      toast.error("الرجاء إدخال اسم المصدر");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingSource.id,
        name: editingSource.name,
        isActive: editingSource.isActive,
      });
      toast.success("تم تحديث المصدر بنجاح");
      setIsEditDialogOpen(false);
      setEditingSource(null);
      refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء تحديث المصدر");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المصدر؟")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("تم حذف المصدر بنجاح");
      refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء حذف المصدر");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">إدارة مصادر الحجز</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                إضافة مصدر جديد
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right">إضافة مصدر حجز جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>اسم المصدر</Label>
                  <Input
                    value={newSource.name}
                    onChange={(e) => setNewSource({ name: e.target.value })}
                    placeholder="مثال: إعلانات سناب شات"
                  />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                  إضافة
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة مصادر الحجز</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : sources && sources.length > 0 ? (
              <Table dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم المصدر</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${source.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {source.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingSource(source);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(source.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                لا توجد مصادر حجز مسجلة
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">تعديل مصدر الحجز</DialogTitle>
            </DialogHeader>
            {editingSource && (
              <div className="space-y-4 py-4">
                <div>
                  <Label>اسم المصدر</Label>
                  <Input
                    value={editingSource.name}
                    onChange={(e) => setEditingSource({ ...editingSource, name: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>نشط</Label>
                  <Switch
                    checked={editingSource.isActive}
                    onCheckedChange={(checked) => setEditingSource({ ...editingSource, isActive: checked })}
                  />
                </div>
                <Button onClick={handleUpdate} className="w-full" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                  حفظ التغييرات
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
