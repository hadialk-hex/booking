import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { trpc } from "@/lib/trpc";
import { Loader2, Pencil, Trash2, Calendar as CalendarIcon, Download } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportAppointmentsToExcel, exportStatsToExcel } from "@/lib/exportUtils";
import { convertTo12Hour } from "@/lib/timeUtils";

export default function AdminAppointments() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("all");

  const { data: appointments, isLoading, refetch } = trpc.appointments.listAll.useQuery();
  const { data: stats } = trpc.stats.all.useQuery();
  const { data: bookingSources } = trpc.bookingSources.listActive.useQuery();
  const updateMutation = trpc.appointments.update.useMutation();
  const deleteMutation = trpc.appointments.delete.useMutation();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'admin')) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, user, setLocation]);

  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
      const dateMatch = aptDate === selectedDate;
      const sourceMatch = selectedSourceFilter === "all" || apt.bookingSourceId?.toString() === selectedSourceFilter;
      return dateMatch && sourceMatch;
    });
  }, [appointments, selectedDate, selectedSourceFilter]);

  const groupedByDate = useMemo(() => {
    if (!appointments) return new Map();
    const groups = new Map<string, any[]>();
    appointments.forEach(apt => {
      const date = new Date(apt.appointmentDate).toISOString().split('T')[0];
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date)!.push(apt);
    });
    return groups;
  }, [appointments]);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateMutation.mutateAsync({ id, status: status as any });
      toast.success("تم تحديث حالة الموعد");
      refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء التحديث");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الموعد؟")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("تم حذف الموعد بنجاح");
      refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleUpdateAppointment = async () => {
    try {
      await updateMutation.mutateAsync({
        id: editingAppointment.id,
        patientName: editingAppointment.patientName,
        patientPhone: editingAppointment.patientPhone,
        appointmentTime: editingAppointment.appointmentTime,
        status: editingAppointment.status,
        price: editingAppointment.price ? parseInt(editingAppointment.price) : undefined,
      });
      toast.success("تم تحديث الموعد بنجاح");
      setIsEditDialogOpen(false);
      setEditingAppointment(null);
      refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء التحديث");
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'scheduled': return 'مجدول';
      case 'arrived': return 'وصل';
      case 'no_show': return 'لم يصل';
      case 'no_answer': return 'لم يرد';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'arrived': return 'bg-green-100 text-green-700';
      case 'no_show': return 'bg-red-100 text-red-700';
      case 'no_answer': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">إدارة المواعيد</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">إجمالي المواعيد</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{appointments?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">مواعيد اليوم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{filteredAppointments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">عدد الموظفين النشطين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {stats && stats.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>إحصائيات الموظفين</CardTitle>
                <Button
                  onClick={() => {
                    const filename = `employee-stats-${new Date().toISOString().split('T')[0]}.xlsx`;
                    exportStatsToExcel(stats, filename);
                    toast.success('تم تصدير الإحصائيات بنجاح');
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  تصدير Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map((s) => (
                  <div key={s.userId} className="p-4 border rounded-lg bg-gray-50">
                    <div className="font-semibold text-lg mb-2">{s.userName}</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">إجمالي الحجوزات:</span>
                      <span className="font-bold text-blue-600">{s.total}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">حجوزات اليوم:</span>
                      <span className="font-bold text-green-600">{s.today}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle>المواعيد حسب التاريخ</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => {
                    const dataToExport = filteredAppointments.length > 0 ? filteredAppointments : appointments || [];
                    const filename = `appointments-${new Date().toISOString().split('T')[0]}.xlsx`;
                    exportAppointmentsToExcel(dataToExport, filename);
                    toast.success('تم تصدير البيانات بنجاح');
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  تصدير Excel
                </Button>
                <Select value={selectedSourceFilter} onValueChange={setSelectedSourceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="كل المصادر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المصادر</SelectItem>
                    {bookingSources?.map(source => (
                      <SelectItem key={source.id} value={source.id.toString()}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CalendarIcon className="w-4 h-4 text-gray-500" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredAppointments.length > 0 ? (
              <Table dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الوقت</TableHead>
                    <TableHead className="text-right">اسم المريض</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">الطبيب</TableHead>
                    <TableHead className="text-right">الموظف</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((apt) => (
                    <TableRow 
                      key={apt.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setIsDetailsDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">{convertTo12Hour(apt.appointmentTime)}</TableCell>
                      <TableCell>{apt.patientName}</TableCell>
                      <TableCell>{apt.patientPhone}</TableCell>
                      <TableCell>{apt.doctorName}</TableCell>
                      <TableCell>{apt.createdByName}</TableCell>
                      <TableCell>
                        <Select
                          value={apt.status}
                          onValueChange={(value) => handleStatusChange(apt.id, value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">مجدول</SelectItem>
                            <SelectItem value="arrived">وصل</SelectItem>
                            <SelectItem value="no_show">لم يصل</SelectItem>
                            <SelectItem value="no_answer">لم يرد</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{apt.price ? `${apt.price} ريال` : "-"}</TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingAppointment(apt);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(apt.id)}
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
                لا توجد مواعيد في هذا التاريخ
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل الموعد</DialogTitle>
            </DialogHeader>
            {editingAppointment && (
              <div className="space-y-4 mt-4">
                <div>
                  <Label>اسم المريض</Label>
                  <Input
                    value={editingAppointment.patientName}
                    onChange={(e) => setEditingAppointment({ ...editingAppointment, patientName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>رقم الهاتف</Label>
                  <Input
                    value={editingAppointment.patientPhone}
                    onChange={(e) => setEditingAppointment({ ...editingAppointment, patientPhone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>الوقت</Label>
                  <Input
                    type="time"
                    value={editingAppointment.appointmentTime}
                    onChange={(e) => setEditingAppointment({ ...editingAppointment, appointmentTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label>الحالة</Label>
                  <Select
                    value={editingAppointment.status}
                    onValueChange={(value) => setEditingAppointment({ ...editingAppointment, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">مجدول</SelectItem>
                      <SelectItem value="arrived">وصل</SelectItem>
                      <SelectItem value="no_show">لم يصل</SelectItem>
                      <SelectItem value="no_answer">لم يرد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>السعر (اختياري)</Label>
                  <Input
                    type="number"
                    value={editingAppointment.price || ""}
                    onChange={(e) => setEditingAppointment({ ...editingAppointment, price: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <Button onClick={handleUpdateAppointment} className="w-full" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                  حفظ التغييرات
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Appointment Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">
                تفاصيل الحجز
              </DialogTitle>
            </DialogHeader>
            {selectedAppointment && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">اسم المريض</Label>
                    <p className="font-medium">{selectedAppointment.patientName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">رقم الهاتف</Label>
                    <p className="font-medium">{selectedAppointment.patientPhone}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">الطبيب</Label>
                    <p className="font-medium">{selectedAppointment.doctorName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">التاريخ</Label>
                    <p className="font-medium">
                      {new Date(selectedAppointment.appointmentDate).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">الوقت</Label>
                    <p className="font-medium">{convertTo12Hour(selectedAppointment.appointmentTime)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">الحالة</Label>
                    <p className="font-medium">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        selectedAppointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        selectedAppointment.status === 'arrived' ? 'bg-green-100 text-green-800' :
                        selectedAppointment.status === 'no_show' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedAppointment.status === 'scheduled' ? 'مجدول' :
                         selectedAppointment.status === 'arrived' ? 'وصل' :
                         selectedAppointment.status === 'no_show' ? 'لم يصل' : 'لم يرد'}
                      </span>
                    </p>
                  </div>
                  {selectedAppointment.price && (
                    <div>
                      <Label className="text-gray-600">المبلغ</Label>
                      <p className="font-medium">{selectedAppointment.price} ريال</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-600">تم الحجز بواسطة</Label>
                    <p className="font-medium">{selectedAppointment.createdByName}</p>
                  </div>
                  {selectedAppointment.appointmentType && (
                    <div>
                      <Label className="text-gray-600">نوع الخدمة</Label>
                      <p className="font-medium">{selectedAppointment.appointmentType}</p>
                    </div>
                  )}
                  {selectedAppointment.patientType && (
                    <div>
                      <Label className="text-gray-600">نوع المريض</Label>
                      <p className="font-medium">{selectedAppointment.patientType === 'new' ? 'عميل جديد' : 'عميل قديم'}</p>
                    </div>
                  )}
                  {selectedAppointment.bookingSourceName && (
                    <div>
                      <Label className="text-gray-600">مصدر الحجز</Label>
                      <p className="font-medium">{selectedAppointment.bookingSourceName}</p>
                    </div>
                  )}
                </div>
                {selectedAppointment.notes && (
                  <div>
                    <Label className="text-gray-600">ملاحظات</Label>
                    <p className="font-medium whitespace-pre-wrap">{selectedAppointment.notes}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDetailsDialogOpen(false);
                      setEditingAppointment(selectedAppointment);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 ml-1" />
                    تعديل
                  </Button>
                  <Button onClick={() => setIsDetailsDialogOpen(false)}>
                    إغلاق
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
