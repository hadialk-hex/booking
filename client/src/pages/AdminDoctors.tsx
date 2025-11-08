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

export default function AdminDoctors() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [newDoctor, setNewDoctor] = useState({ name: "", specialization: "" });

  const { data: doctors, isLoading, refetch } = trpc.doctors.list.useQuery();
  const createMutation = trpc.doctors.create.useMutation();
  const updateMutation = trpc.doctors.update.useMutation();
  const deleteMutation = trpc.doctors.delete.useMutation();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'admin')) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, user, setLocation]);

  const handleCreate = async () => {
    if (!newDoctor.name.trim()) {
      toast.error("الرجاء إدخال اسم الطبيب");
      return;
    }

    try {
      await createMutation.mutateAsync(newDoctor);
      toast.success("تم إضافة الطبيب بنجاح");
      setIsAddDialogOpen(false);
      setNewDoctor({ name: "", specialization: "" });
      refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء إضافة الطبيب");
    }
  };

  const handleUpdate = async () => {
    if (!editingDoctor?.name?.trim()) {
      toast.error("الرجاء إدخال اسم الطبيب");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingDoctor.id,
        name: editingDoctor.name,
        specialization: editingDoctor.specialization,
        isActive: editingDoctor.isActive,
      });
      toast.success("تم تحديث الطبيب بنجاح");
      setIsEditDialogOpen(false);
      setEditingDoctor(null);
      refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء تحديث الطبيب");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطبيب؟")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("تم حذف الطبيب بنجاح");
      refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء حذف الطبيب");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">إدارة الأطباء</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 ml-2" />
                إضافة طبيب جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة طبيب جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">اسم الطبيب *</Label>
                  <Input
                    id="name"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    placeholder="د. أحمد محمد"
                  />
                </div>
                <div>
                  <Label htmlFor="specialization">التخصص</Label>
                  <Input
                    id="specialization"
                    value={newDoctor.specialization}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                    placeholder="طب الأسنان"
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
            <CardTitle>قائمة الأطباء ({doctors?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : doctors && doctors.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>التخصص</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">{doctor.name}</TableCell>
                      <TableCell>{doctor.specialization || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${doctor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {doctor.isActive ? "نشط" : "غير نشط"}
                        </span>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingDoctor(doctor);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(doctor.id)}
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
                لا يوجد أطباء مسجلين. قم بإضافة طبيب جديد للبدء.
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل بيانات الطبيب</DialogTitle>
            </DialogHeader>
            {editingDoctor && (
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="edit-name">اسم الطبيب *</Label>
                  <Input
                    id="edit-name"
                    value={editingDoctor.name}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-specialization">التخصص</Label>
                  <Input
                    id="edit-specialization"
                    value={editingDoctor.specialization || ""}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, specialization: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-active">نشط</Label>
                  <Switch
                    id="edit-active"
                    checked={editingDoctor.isActive}
                    onCheckedChange={(checked) => setEditingDoctor({ ...editingDoctor, isActive: checked })}
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
