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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Calendar, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import AppointmentCalendar from "@/components/AppointmentCalendar";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { convertTo12Hour } from "@/lib/timeUtils";

export default function CallCenterDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("all");
  const [showCalendar, setShowCalendar] = useState(false);
  
  const [newAppointment, setNewAppointment] = useState({
    patientName: "",
    patientPhone: "",
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: "",
    doctorId: 0,
    doctorName: "",
    appointmentType: "",
    patientType: "new" as "new" | "existing",
    bookingSourceId: 0,
    bookingSourceName: "",
    notes: "",
  });

  const { data: appointments, isLoading, refetch } = trpc.appointments.listMine.useQuery(undefined, {
    refetchInterval: 5000 // تحديث كل 5 ثواني
  });
  const { data: doctors } = trpc.doctors.listActive.useQuery();
  const { data: bookingSources } = trpc.bookingSources.listActive.useQuery();
  const { data: allAppointments } = trpc.appointments.listAllForSchedule.useQuery();
  const { data: stats, refetch: refetchStats } = trpc.stats.mine.useQuery(undefined, {
    refetchInterval: 5000 // تحديث كل 5 ثواني
  });
  const { data: allStats, refetch: refetchAllStats } = trpc.stats.all.useQuery(undefined, {
    refetchInterval: 5000 // تحديث كل 5 ثواني
  });
  const utils = trpc.useUtils();
  const createMutation = trpc.appointments.create.useMutation();
  const updateMutation = trpc.appointments.update.useMutation();
  const deleteMutation = trpc.appointments.delete.useMutation();

  // نظام الإشعارات المنبثقة
  useEffect(() => {
    const interval = setInterval(() => {
      refetchAllStats();
    }, 5000); // تحديث كل 5 ثواني

    return () => clearInterval(interval);
  }, [refetchAllStats]);

  // مراقبة التغييرات في allStats لإظهار إشعارات
  useEffect(() => {
    if (!allStats || allStats.length === 0) return;
    
    const previousStats = localStorage.getItem('previousStats');
    if (previousStats) {
      const prev = JSON.parse(previousStats);
      allStats.forEach(current => {
        const old = prev.find((p: any) => p.userId === current.userId);
        if (old && current.total > old.total && current.userId !== user?.id) {
          const userName = current.displayName || current.userName || 'مستخدم';
          toast.info(`🎉 ${userName} قام بتسجيل حجز جديد!`, {
            duration: 3000,
          });
        }
      });
    }
    
    localStorage.setItem('previousStats', JSON.stringify(allStats));
  }, [allStats, user]);

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'call_center')) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, user, setLocation]);

  // معالجة البيانات المرسلة من جدول المواعيد
  useEffect(() => {
    const state = (window.history.state as any)?.usr?.state;
    if (state?.prefillAppointment) {
      const prefill = state.prefillAppointment;
      setNewAppointment(prev => ({
        ...prev,
        doctorId: prefill.doctorId,
        doctorName: prefill.doctorName,
        appointmentDate: prefill.date,
        appointmentTime: prefill.time,
      }));
      setIsAddDialogOpen(true);
      
      // مسح البيانات من history state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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
    return new Map(Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0])));
  }, [appointments]);

  const handleCreate = async () => {
    if (!newAppointment.patientName.trim() || !newAppointment.patientPhone.trim() || !newAppointment.appointmentTime || !newAppointment.doctorId) {
      toast.error("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...newAppointment,
        appointmentDate: new Date(newAppointment.appointmentDate),
      });
      toast.success("تم إضافة الموعد بنجاح");
      setIsAddDialogOpen(false);
      refetch();
      utils.appointments.listAllForSchedule.invalidate(); // تحديث جدول المواعيد
    } catch (error: any) {
      // التحقق من نوع الخطأ
      if (error?.message === 'APPOINTMENT_CONFLICT') {
        toast.error("هناك موعد بالفعل لهذا الطبيب في نفس الوقت");
      } else {
        toast.error("حدث خطأ أثناء إضافة الموعد");
      }
    }
  };

  const handleUpdate = async () => {
    try {
      await updateMutation.mutateAsync({
        id: editingAppointment.id,
        patientName: editingAppointment.patientName,
        patientPhone: editingAppointment.patientPhone,
        appointmentTime: editingAppointment.appointmentTime,
        appointmentDate: editingAppointment.appointmentDate ? new Date(editingAppointment.appointmentDate) : undefined,
        doctorId: editingAppointment.doctorId,
        notes: editingAppointment.notes,
      });
      toast.success("تم تحديث الموعد بنجاح");
      setIsEditDialogOpen(false);
      setEditingAppointment(null);
      refetch();
      utils.appointments.listAllForSchedule.invalidate(); // تحديث جدول المواعيد
    } catch (error: any) {
      // التحقق من نوع الخطأ
      if (error?.message === 'APPOINTMENT_CONFLICT') {
        toast.error("هناك موعد بالفعل لهذا الطبيب في نفس الوقت");
      } else {
        toast.error("حدث خطأ أثناء التحديث");
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الموعد؟")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("تم حذف الموعد بنجاح");
      refetch();
      utils.appointments.listAllForSchedule.invalidate(); // تحديث جدول المواعيد
    } catch (error) {
      toast.error("حدث خطأ أثناء الحذف");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">لوحة الكول سنتر</h1>
              <p className="text-gray-600">مرحباً {user?.name}</p>
            </div>
            <Button onClick={() => {
              const { logout } = useAuth();
              logout();
            }} variant="outline">
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">إجمالي حجوزاتي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">{stats?.total || 0}</div>
              <p className="text-blue-100 text-sm mt-2">جميع الحجوزات</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">حجوزات اليوم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">{stats?.today || 0}</div>
              <p className="text-green-100 text-sm mt-2">حجوزات اليوم فقط</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>إضافة حجز جديد</CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) {
                  // Reset form when closing
                  setTimeout(() => {
                    setNewAppointment({
                      patientName: "",
                      patientPhone: "",
                      appointmentDate: new Date().toISOString().split('T')[0],
                      appointmentTime: "",
                      doctorId: 0,
                      doctorName: "",
                      appointmentType: "",
                      patientType: "new",
                      bookingSourceId: 0,
                      bookingSourceName: "",
                      notes: "",
                    });
                  }, 300);
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 ml-2" />
                    حجز جديد
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>إضافة موعد جديد</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label>اسم المريض *</Label>
                      <Input
                        value={newAppointment.patientName}
                        onChange={(e) => setNewAppointment({ ...newAppointment, patientName: e.target.value })}
                        placeholder="أحمد محمد"
                      />
                    </div>
                    <div>
                      <Label>رقم الهاتف *</Label>
                      <Input
                        value={newAppointment.patientPhone}
                        onChange={(e) => setNewAppointment({ ...newAppointment, patientPhone: e.target.value })}
                        placeholder="05xxxxxxxx"
                      />
                    </div>
                    <div>
                      <Label>التاريخ *</Label>
                      <Input
                        type="date"
                        value={newAppointment.appointmentDate}
                        onChange={(e) => setNewAppointment({ ...newAppointment, appointmentDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>الوقت *</Label>
                      <Select
                        value={newAppointment.appointmentTime}
                        onValueChange={(value) => setNewAppointment({ ...newAppointment, appointmentTime: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الوقت" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="10:00">10:00 AM</SelectItem>
                          <SelectItem value="10:15">10:15 AM</SelectItem>
                          <SelectItem value="10:30">10:30 AM</SelectItem>
                          <SelectItem value="10:45">10:45 AM</SelectItem>
                          <SelectItem value="11:00">11:00 AM</SelectItem>
                          <SelectItem value="11:15">11:15 AM</SelectItem>
                          <SelectItem value="11:30">11:30 AM</SelectItem>
                          <SelectItem value="11:45">11:45 AM</SelectItem>
                          <SelectItem value="12:00">12:00 PM</SelectItem>
                          <SelectItem value="12:15">12:15 PM</SelectItem>
                          <SelectItem value="12:30">12:30 PM</SelectItem>
                          <SelectItem value="12:45">12:45 PM</SelectItem>
                          <SelectItem value="13:00">01:00 PM</SelectItem>
                          <SelectItem value="13:15">01:15 PM</SelectItem>
                          <SelectItem value="13:30">01:30 PM</SelectItem>
                          <SelectItem value="13:45">01:45 PM</SelectItem>
                          <SelectItem value="14:00">02:00 PM</SelectItem>
                          <SelectItem value="14:15">02:15 PM</SelectItem>
                          <SelectItem value="14:30">02:30 PM</SelectItem>
                          <SelectItem value="14:45">02:45 PM</SelectItem>
                          <SelectItem value="15:00">03:00 PM</SelectItem>
                          <SelectItem value="15:15">03:15 PM</SelectItem>
                          <SelectItem value="15:30">03:30 PM</SelectItem>
                          <SelectItem value="15:45">03:45 PM</SelectItem>
                          <SelectItem value="16:00">04:00 PM</SelectItem>
                          <SelectItem value="16:15">04:15 PM</SelectItem>
                          <SelectItem value="16:30">04:30 PM</SelectItem>
                          <SelectItem value="16:45">04:45 PM</SelectItem>
                          <SelectItem value="17:00">05:00 PM</SelectItem>
                          <SelectItem value="17:15">05:15 PM</SelectItem>
                          <SelectItem value="17:30">05:30 PM</SelectItem>
                          <SelectItem value="17:45">05:45 PM</SelectItem>
                          <SelectItem value="18:00">06:00 PM</SelectItem>
                          <SelectItem value="18:15">06:15 PM</SelectItem>
                          <SelectItem value="18:30">06:30 PM</SelectItem>
                          <SelectItem value="18:45">06:45 PM</SelectItem>
                          <SelectItem value="19:00">07:00 PM</SelectItem>
                          <SelectItem value="19:15">07:15 PM</SelectItem>
                          <SelectItem value="19:30">07:30 PM</SelectItem>
                          <SelectItem value="19:45">07:45 PM</SelectItem>
                          <SelectItem value="20:00">08:00 PM</SelectItem>
                          <SelectItem value="20:15">08:15 PM</SelectItem>
                          <SelectItem value="20:30">08:30 PM</SelectItem>
                          <SelectItem value="20:45">08:45 PM</SelectItem>
                          <SelectItem value="21:00">09:00 PM</SelectItem>
                          <SelectItem value="21:15">09:15 PM</SelectItem>
                          <SelectItem value="21:30">09:30 PM</SelectItem>
                          <SelectItem value="21:45">09:45 PM</SelectItem>
                          <SelectItem value="22:00">10:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>الطبيب *</Label>
                      <Select
                        value={newAppointment.doctorId.toString()}
                        onValueChange={(value) => {
                          const doctor = doctors?.find(d => d.id === parseInt(value));
                          setNewAppointment({
                            ...newAppointment,
                            doctorId: parseInt(value),
                            doctorName: doctor?.name || ""
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الطبيب" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors?.map((doctor) => (
                            <SelectItem key={doctor.id} value={doctor.id.toString()}>
                              {doctor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>نوع الخدمة</Label>
                      <Input
                        value={newAppointment.appointmentType}
                        onChange={(e) => setNewAppointment({ ...newAppointment, appointmentType: e.target.value })}
                        placeholder="كشف، متابعة، إلخ"
                      />
                    </div>
                    <div>
                      <Label>نوع المريض *</Label>
                      <Select
                        value={newAppointment.patientType}
                        onValueChange={(value: any) => setNewAppointment({ ...newAppointment, patientType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">عميل جديد</SelectItem>
                          <SelectItem value="existing">عميل قديم</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>مصدر الحجز *</Label>
                      <Select
                        value={newAppointment.bookingSourceId?.toString()}
                        onValueChange={(value) => {
                          const source = bookingSources?.find(s => s.id === parseInt(value));
                          setNewAppointment({ 
                            ...newAppointment, 
                            bookingSourceId: parseInt(value),
                            bookingSourceName: source?.name || ""
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر مصدر الحجز" />
                        </SelectTrigger>
                        <SelectContent>
                          {bookingSources?.map(source => (
                            <SelectItem key={source.id} value={source.id.toString()}>
                              {source.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>ملاحظات</Label>
                      <Textarea
                        value={newAppointment.notes}
                        onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                        placeholder="أي ملاحظات إضافية..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreate} className="w-full mt-4" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    إضافة الموعد
                  </Button>
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline" 
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                onClick={() => setShowCalendar(!showCalendar)}
              >
                <Calendar className="w-4 h-4 ml-2" />
                {showCalendar ? 'إخفاء التقويم' : 'عرض التقويم'}
              </Button>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setLocation('/schedule')}
              >
                <Calendar className="w-4 h-4 ml-2" />
                جدول المواعيد
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* التقويم */}
        {showCalendar && (
          <div className="mb-6">
            <AppointmentCalendar
              appointments={allAppointments?.map(apt => ({
                ...apt,
                appointmentDate: new Date(apt.appointmentDate)
              })) || []}
              doctors={doctors || []}
              onTimeSlotClick={(doctorId, date, time) => {
                // ملء نموذج الحجز بالبيانات المختارة
                const doctor = doctors?.find(d => d.id === doctorId);
                setNewAppointment({
                  ...newAppointment,
                  doctorId: doctorId,
                  doctorName: doctor?.name || '',
                  appointmentDate: date.toISOString().split('T')[0],
                  appointmentTime: time,
                });
                setIsAddDialogOpen(true);
              }}
            />
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle>حجوزاتي حسب التاريخ</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
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
                <Calendar className="w-4 h-4 text-gray-500" />
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
                    <TableHead className="text-right">الحالة</TableHead>
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
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(apt.status)}`}>
                          {getStatusName(apt.status)}
                        </span>
                      </TableCell>
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
                لا توجد حجوزات في هذا التاريخ
              </div>
            )}
          </CardContent>
        </Card>

        {allStats && allStats.length > 0 && (
          <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏆 لوحة المتصدرين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allStats.map((s, index) => (
                  <div key={s.userId} className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold">#{index + 1}</div>
                        <div>
                          <div className="font-semibold text-lg">{s.displayName || s.userName || 'غير محدد'}</div>
                          <div className="text-sm opacity-90">إجمالي: {s.total} حجز</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{s.today}</div>
                        <div className="text-xs opacity-75">اليوم</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
                <Select
                  value={editingAppointment.appointmentTime}
                  onValueChange={(value) => setEditingAppointment({ ...editingAppointment, appointmentTime: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الوقت" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="10:15">10:15 AM</SelectItem>
                    <SelectItem value="10:30">10:30 AM</SelectItem>
                    <SelectItem value="10:45">10:45 AM</SelectItem>
                    <SelectItem value="11:00">11:00 AM</SelectItem>
                    <SelectItem value="11:15">11:15 AM</SelectItem>
                    <SelectItem value="11:30">11:30 AM</SelectItem>
                    <SelectItem value="11:45">11:45 AM</SelectItem>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="12:15">12:15 PM</SelectItem>
                    <SelectItem value="12:30">12:30 PM</SelectItem>
                    <SelectItem value="12:45">12:45 PM</SelectItem>
                    <SelectItem value="13:00">01:00 PM</SelectItem>
                    <SelectItem value="13:15">01:15 PM</SelectItem>
                    <SelectItem value="13:30">01:30 PM</SelectItem>
                    <SelectItem value="13:45">01:45 PM</SelectItem>
                    <SelectItem value="14:00">02:00 PM</SelectItem>
                    <SelectItem value="14:15">02:15 PM</SelectItem>
                    <SelectItem value="14:30">02:30 PM</SelectItem>
                    <SelectItem value="14:45">02:45 PM</SelectItem>
                    <SelectItem value="15:00">03:00 PM</SelectItem>
                    <SelectItem value="15:15">03:15 PM</SelectItem>
                    <SelectItem value="15:30">03:30 PM</SelectItem>
                    <SelectItem value="15:45">03:45 PM</SelectItem>
                    <SelectItem value="16:00">04:00 PM</SelectItem>
                    <SelectItem value="16:15">04:15 PM</SelectItem>
                    <SelectItem value="16:30">04:30 PM</SelectItem>
                    <SelectItem value="16:45">04:45 PM</SelectItem>
                    <SelectItem value="17:00">05:00 PM</SelectItem>
                    <SelectItem value="17:15">05:15 PM</SelectItem>
                    <SelectItem value="17:30">05:30 PM</SelectItem>
                    <SelectItem value="17:45">05:45 PM</SelectItem>
                    <SelectItem value="18:00">06:00 PM</SelectItem>
                    <SelectItem value="18:15">06:15 PM</SelectItem>
                    <SelectItem value="18:30">06:30 PM</SelectItem>
                    <SelectItem value="18:45">06:45 PM</SelectItem>
                    <SelectItem value="19:00">07:00 PM</SelectItem>
                    <SelectItem value="19:15">07:15 PM</SelectItem>
                    <SelectItem value="19:30">07:30 PM</SelectItem>
                    <SelectItem value="19:45">07:45 PM</SelectItem>
                    <SelectItem value="20:00">08:00 PM</SelectItem>
                    <SelectItem value="20:15">08:15 PM</SelectItem>
                    <SelectItem value="20:30">08:30 PM</SelectItem>
                    <SelectItem value="20:45">08:45 PM</SelectItem>
                    <SelectItem value="21:00">09:00 PM</SelectItem>
                    <SelectItem value="21:15">09:15 PM</SelectItem>
                    <SelectItem value="21:30">09:30 PM</SelectItem>
                    <SelectItem value="21:45">09:45 PM</SelectItem>
                    <SelectItem value="22:00">10:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Textarea
                  value={editingAppointment.notes || ""}
                  onChange={(e) => setEditingAppointment({ ...editingAppointment, notes: e.target.value })}
                  rows={3}
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
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedAppointment.status)}`}>
                      {getStatusName(selectedAppointment.status)}
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
                <div>
                  <Label className="text-gray-600">مصدر الحجز</Label>
                  <p className="font-medium">{selectedAppointment.bookingSourceName || 'غير محدد'}</p>
                </div>
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

      {/* شريط الأخبار المتحرك */}
      {allStats && allStats.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 shadow-2xl z-[9999]">
          <div className="overflow-hidden">
            <div className="animate-marquee whitespace-nowrap inline-block">
              {allStats.map((s, index) => (
                <span key={s.userId} className="inline-flex items-center gap-2 text-sm font-medium mx-8">
                  🏆 #{index + 1} {s.displayName || s.userName || 'غير محدد'}: {s.total} حجز (اليوم: {s.today})
                </span>
              ))}
              {/* تكرار للحركة المستمرة */}
              {allStats.map((s, index) => (
                <span key={`dup-${s.userId}`} className="inline-flex items-center gap-2 text-sm font-medium mx-8">
                  🏆 #{index + 1} {s.displayName || s.userName || 'غير محدد'}: {s.total} حجز (اليوم: {s.today})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
