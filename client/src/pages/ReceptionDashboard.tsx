import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Calendar, Loader2, DollarSign, Plus, Pencil, Trash2 } from "lucide-react";
import AppointmentCalendar from "@/components/AppointmentCalendar";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { convertTo12Hour } from "@/lib/timeUtils";

export default function ReceptionDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const t = translations[language];
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("all");
  const [editingPrice, setEditingPrice] = useState<any>(null);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
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

  const { data: appointments, isLoading, refetch } = trpc.appointments.listAll.useQuery(undefined, {
    refetchInterval: 5000
  });
  const { data: bookingSources } = trpc.bookingSources.listActive.useQuery();
  const { data: doctors } = trpc.doctors.listActive.useQuery();
  const { data: allAppointments } = trpc.appointments.listAllForSchedule.useQuery(undefined, {
    refetchInterval: 5000
  });
  const utils = trpc.useUtils();
  const updateMutation = trpc.appointments.update.useMutation();
  const createMutation = trpc.appointments.create.useMutation();
  const deleteMutation = trpc.appointments.delete.useMutation();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'reception')) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, user, setLocation]);

  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
      const matchesDate = aptDate === selectedDate;
      const matchesStatus = selectedStatus === "all" || apt.status === selectedStatus;
      const matchesSource = selectedSourceFilter === "all" || apt.bookingSourceId?.toString() === selectedSourceFilter;
      return matchesDate && matchesStatus && matchesSource;
    });
  }, [appointments, selectedDate, selectedStatus, selectedSourceFilter]);

  const stats = useMemo(() => {
    if (!appointments) return { total: 0, arrived: 0, scheduled: 0, noShow: 0, noAnswer: 0 };
    
    const todayAppts = appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
      return aptDate === new Date().toISOString().split('T')[0];
    });

    return {
      total: todayAppts.length,
      arrived: todayAppts.filter(a => a.status === 'arrived').length,
      scheduled: todayAppts.filter(a => a.status === 'scheduled').length,
      noShow: todayAppts.filter(a => a.status === 'no_show').length,
      noAnswer: todayAppts.filter(a => a.status === 'no_answer').length,
    };
  }, [appointments]);

  const handleStatusChange = async (appointmentId: number, newStatus: string) => {
    try {
      await updateMutation.mutateAsync({
        id: appointmentId,
        status: newStatus as any,
      });
      toast.success(t.statusUpdated);
      refetch();
    } catch (error) {
      toast.error(t.error);
    }
  };

  const handlePriceUpdate = async () => {
    if (!editingPrice || !editingPrice.price) {
      toast.error(t.fillRequired);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingPrice.id,
        price: parseFloat(editingPrice.price),
      });
      toast.success(t.priceUpdated);
      setIsPriceDialogOpen(false);
      setEditingPrice(null);
      refetch();
    } catch (error) {
      toast.error(t.error);
    }
  };

  const handleAddAppointment = async () => {
    if (!newAppointment.patientName || !newAppointment.patientPhone || !newAppointment.appointmentTime || !newAppointment.doctorId || !newAppointment.bookingSourceId) {
      toast.error(t.fillRequired);
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...newAppointment,
        appointmentDate: new Date(newAppointment.appointmentDate),
      });
      toast.success(language === 'ar' ? 'تم إضافة الحجز بنجاح' : 'Appointment added successfully');
      setIsAddDialogOpen(false);
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
      refetch();
      utils.appointments.listAllForSchedule.invalidate();
    } catch (error) {
      toast.error(t.error);
    }
  };

  const handleEditAppointment = async () => {
    if (!editingAppointment) return;

    // Check if the appointment was created by the current user
    if (editingAppointment.createdById !== user!.id) {
      toast.error(language === 'ar' ? 'لا يمكنك تعديل حجوزات الآخرين' : 'You can only edit your own appointments');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingAppointment.id,
        ...editingAppointment,
      });
      toast.success(language === 'ar' ? 'تم تحديث الحجز بنجاح' : 'Appointment updated successfully');
      setIsEditDialogOpen(false);
      setEditingAppointment(null);
      refetch();
      utils.appointments.listAllForSchedule.invalidate();
    } catch (error) {
      toast.error(t.error);
    }
  };

  const handleDeleteAppointment = async (id: number, createdById: number) => {
    // Check if the appointment was created by the current user
    if (createdById !== user!.id) {
      toast.error(language === 'ar' ? 'لا يمكنك حذف حجوزات الآخرين' : 'You can only delete your own appointments');
      return;
    }

    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الحجز؟' : 'Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success(language === 'ar' ? 'تم حذف الحجز بنجاح' : 'Appointment deleted successfully');
      refetch();
      utils.appointments.listAllForSchedule.invalidate();
    } catch (error) {
      toast.error(t.error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      scheduled: { label: t.scheduled, className: "bg-blue-100 text-blue-800" },
      arrived: { label: t.arrived, className: "bg-green-100 text-green-800" },
      no_show: { label: t.noShow, className: "bg-red-100 text-red-800" },
      no_answer: { label: t.noAnswer, className: "bg-gray-100 text-gray-800" },
    };
    
    const config = statusMap[status] || statusMap.scheduled;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (loading || !isAuthenticated || user?.role !== 'reception') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t.welcome} 👋 {user?.displayName || user?.name}</h1>
            <p className="text-gray-600 mt-1">{t.receptionDashboard}</p>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.todayTotal}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs text-blue-100 mt-1">{t.appointments}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.arrived}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.arrived}</div>
              <p className="text-xs text-green-100 mt-1">{t.bookings}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.scheduled}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.scheduled}</div>
              <p className="text-xs text-purple-100 mt-1">{t.bookings}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.noShow}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.noShow}</div>
              <p className="text-xs text-red-100 mt-1">{t.bookings}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.noAnswer}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.noAnswer}</div>
              <p className="text-xs text-gray-100 mt-1">{t.bookings}</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-3">
          <Button
            onClick={() => setShowCalendar(!showCalendar)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            {language === 'ar' ? (showCalendar ? 'إخفاء التقويم' : 'جدول المواعيد') : (showCalendar ? 'Hide Calendar' : 'Appointment Calendar')}
          </Button>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {language === 'ar' ? 'حجز جديد' : 'New Booking'}
          </Button>
        </div>

        {/* Calendar */}
        {showCalendar && (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'جدول المواعيد' : 'Appointment Calendar'}</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentCalendar
                appointments={allAppointments || []}
                doctors={doctors || []}
              />
            </CardContent>
          </Card>
        )}

        {/* Appointments Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>{t.allAppointmentsByDate}</CardTitle>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">{t.status}:</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.all}</SelectItem>
                      <SelectItem value="scheduled">{t.scheduled}</SelectItem>
                      <SelectItem value="arrived">{t.arrived}</SelectItem>
                      <SelectItem value="no_show">{t.noShow}</SelectItem>
                      <SelectItem value="no_answer">{t.noAnswer}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">{language === 'ar' ? 'المصدر' : 'Source'}:</Label>
                  <Select value={selectedSourceFilter} onValueChange={setSelectedSourceFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder={language === 'ar' ? 'الكل' : 'All'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                      {bookingSources?.map(source => (
                        <SelectItem key={source.id} value={source.id.toString()}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t.noAppointments}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">{t.time}</TableHead>
                      <TableHead className="text-right">{t.patientName}</TableHead>
                      <TableHead className="text-right">{t.patientPhone}</TableHead>
                      <TableHead className="text-right">{t.doctor}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'الكول سنتر' : 'Call Center'}</TableHead>
                      <TableHead className="text-right">{t.status}</TableHead>
                      <TableHead className="text-right">{t.actions}</TableHead>
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
                        <TableCell className="font-medium">
                          {convertTo12Hour(apt.appointmentTime)}
                        </TableCell>
                        <TableCell>{apt.patientName}</TableCell>
                        <TableCell>{apt.patientPhone}</TableCell>
                        <TableCell>{apt.doctorName}</TableCell>
                        <TableCell>{apt.createdByName}</TableCell>
                        <TableCell>
                          <Select
                            value={apt.status}
                            onValueChange={(value) => handleStatusChange(apt.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue>{getStatusBadge(apt.status)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">{t.scheduled}</SelectItem>
                              <SelectItem value="arrived">{t.arrived}</SelectItem>
                              <SelectItem value="no_show">{t.noShow}</SelectItem>
                              <SelectItem value="no_answer">{t.noAnswer}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingPrice({ id: apt.id, price: apt.price || '' });
                                setIsPriceDialogOpen(true);
                              }}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              {apt.price ? `${apt.price} ${language === 'ar' ? 'ريال' : 'SAR'}` : t.addPrice}
                            </Button>
                            {apt.createdById === user?.id && (
                              <>
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
                                  onClick={() => handleDeleteAppointment(apt.id, apt.createdById)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={language === 'ar' ? 'text-right' : 'text-left'}>
              {t.appointmentDetails || (language === 'ar' ? 'تفاصيل الحجز' : 'Appointment Details')}
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">{t.patientName}</Label>
                  <p className="font-medium">{selectedAppointment.patientName}</p>
                </div>
                <div>
                  <Label className="text-gray-600">{t.patientPhone}</Label>
                  <p className="font-medium">{selectedAppointment.patientPhone}</p>
                </div>
                <div>
                  <Label className="text-gray-600">{t.doctor}</Label>
                  <p className="font-medium">{selectedAppointment.doctorName}</p>
                </div>
                <div>
                  <Label className="text-gray-600">{t.date}</Label>
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
                  <Label className="text-gray-600">{t.time}</Label>
                  <p className="font-medium">
                    {convertTo12Hour(selectedAppointment.appointmentTime)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">{t.status}</Label>
                  <p className="font-medium">{getStatusBadge(selectedAppointment.status)}</p>
                </div>
                <div>
                  <Label className="text-gray-600">{language === 'ar' ? 'المبلغ' : 'Price'}</Label>
                  <p className="font-medium">
                    {selectedAppointment.price ? `${selectedAppointment.price} ${language === 'ar' ? 'ريال' : 'SAR'}` : (language === 'ar' ? 'لم يتم التحديد' : 'Not set')}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">{language === 'ar' ? 'مصدر الحجز' : 'Booking Source'}</Label>
                  <p className="font-medium">{selectedAppointment.bookingSourceName || (language === 'ar' ? 'غير محدد' : 'Not specified')}</p>
                </div>
                <div>
                  <Label className="text-gray-600">{language === 'ar' ? 'تم الحجز بواسطة' : 'Booked by'}</Label>
                  <p className="font-medium">{selectedAppointment.createdByName}</p>
                </div>
                {selectedAppointment.appointmentType && (
                  <div>
                    <Label className="text-gray-600">{language === 'ar' ? 'نوع الخدمة' : 'Service Type'}</Label>
                    <p className="font-medium">{selectedAppointment.appointmentType}</p>
                  </div>
                )}
              </div>
              {selectedAppointment.notes && (
                <div>
                  <Label className="text-gray-600">{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                  <p className="font-medium whitespace-pre-wrap">{selectedAppointment.notes}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDetailsDialogOpen(false);
                    setEditingPrice({ id: selectedAppointment.id, price: selectedAppointment.price || '' });
                    setIsPriceDialogOpen(true);
                  }}
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  {t.updatePrice}
                </Button>
                <Button onClick={() => setIsDetailsDialogOpen(false)}>
                  {t.close || (language === 'ar' ? 'إغلاق' : 'Close')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Price Dialog */}
      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={language === 'ar' ? 'text-right' : 'text-left'}>{t.updatePrice}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t.priceInSAR}</Label>
              <Input
                type="number"
                value={editingPrice?.price || ''}
                onChange={(e) => setEditingPrice({ ...editingPrice, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPriceDialogOpen(false)}>
                {t.cancel}
              </Button>
              <Button onClick={handlePriceUpdate}>
                {t.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Appointment Dialog - نسخة مبسطة من الكول سنتر */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'حجز جديد' : 'New Booking'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.patientName}</Label>
                <Input
                  value={newAppointment.patientName}
                  onChange={(e) => setNewAppointment({ ...newAppointment, patientName: e.target.value })}
                />
              </div>
              <div>
                <Label>{t.patientPhone}</Label>
                <Input
                  value={newAppointment.patientPhone}
                  onChange={(e) => setNewAppointment({ ...newAppointment, patientPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.date}</Label>
                <Input
                  type="date"
                  value={newAppointment.appointmentDate}
                  onChange={(e) => setNewAppointment({ ...newAppointment, appointmentDate: e.target.value })}
                />
              </div>
              <div>
                <Label>{t.time}</Label>
                <div className="flex gap-2">
                  <Select
                    value={newAppointment.appointmentTime.split(':')[0] || ''}
                    onValueChange={(hour) => {
                      const minute = newAppointment.appointmentTime.split(':')[1] || '00';
                      setNewAppointment({ ...newAppointment, appointmentTime: `${hour}:${minute}` });
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder={language === 'ar' ? 'الساعة' : 'Hour'} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 13 }, (_, i) => i + 10).map(hour => (
                        <SelectItem key={hour} value={hour.toString().padStart(2, '0')}>
                          {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newAppointment.appointmentTime.split(':')[1] || ''}
                    onValueChange={(minute) => {
                      const hour = newAppointment.appointmentTime.split(':')[0] || '10';
                      setNewAppointment({ ...newAppointment, appointmentTime: `${hour}:${minute}` });
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder={language === 'ar' ? 'الدقيقة' : 'Minute'} />
                    </SelectTrigger>
                    <SelectContent>
                      {['00', '15', '30', '45'].map(minute => (
                        <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div>
              <Label>{t.doctor}</Label>
              <Select
                value={newAppointment.doctorId.toString()}
                onValueChange={(value) => {
                  const doctor = doctors?.find(d => d.id.toString() === value);
                  setNewAppointment({
                    ...newAppointment,
                    doctorId: parseInt(value),
                    doctorName: doctor?.name || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الطبيب' : 'Select Doctor'} />
                </SelectTrigger>
                <SelectContent>
                  {doctors?.map(doctor => (
                    <SelectItem key={doctor.id} value={doctor.id.toString()}>
                      {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'ar' ? 'مصدر الحجز' : 'Booking Source'}</Label>
              <Select
                value={newAppointment.bookingSourceId.toString()}
                onValueChange={(value) => {
                  const source = bookingSources?.find(s => s.id.toString() === value);
                  setNewAppointment({
                    ...newAppointment,
                    bookingSourceId: parseInt(value),
                    bookingSourceName: source?.name || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر المصدر' : 'Select Source'} />
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
            <div>
              <Label>{t.notes}</Label>
              <Textarea
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t.cancel}
              </Button>
              <Button onClick={handleAddAppointment}>
                {language === 'ar' ? 'إضافة' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تعديل الحجز' : 'Edit Booking'}</DialogTitle>
          </DialogHeader>
          {editingAppointment && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t.patientName}</Label>
                  <Input
                    value={editingAppointment.patientName}
                    onChange={(e) => setEditingAppointment({ ...editingAppointment, patientName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t.patientPhone}</Label>
                  <Input
                    value={editingAppointment.patientPhone}
                    onChange={(e) => setEditingAppointment({ ...editingAppointment, patientPhone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t.date}</Label>
                  <Input
                    type="date"
                    value={new Date(editingAppointment.appointmentDate).toISOString().split('T')[0]}
                    onChange={(e) => setEditingAppointment({ ...editingAppointment, appointmentDate: new Date(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>{t.time}</Label>
                  <div className="flex gap-2">
                    <Select
                      value={editingAppointment.appointmentTime.split(':')[0]}
                      onValueChange={(hour) => {
                        const minute = editingAppointment.appointmentTime.split(':')[1];
                        setEditingAppointment({ ...editingAppointment, appointmentTime: `${hour}:${minute}` });
                      }}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 13 }, (_, i) => i + 10).map(hour => (
                          <SelectItem key={hour} value={hour.toString().padStart(2, '0')}>
                            {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={editingAppointment.appointmentTime.split(':')[1]}
                      onValueChange={(minute) => {
                        const hour = editingAppointment.appointmentTime.split(':')[0];
                        setEditingAppointment({ ...editingAppointment, appointmentTime: `${hour}:${minute}` });
                      }}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['00', '15', '30', '45'].map(minute => (
                          <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div>
                <Label>{t.doctor}</Label>
                <Select
                  value={editingAppointment.doctorId.toString()}
                  onValueChange={(value) => {
                    const doctor = doctors?.find(d => d.id.toString() === value);
                    setEditingAppointment({
                      ...editingAppointment,
                      doctorId: parseInt(value),
                      doctorName: doctor?.name || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors?.map(doctor => (
                      <SelectItem key={doctor.id} value={doctor.id.toString()}>
                        {doctor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.notes}</Label>
                <Textarea
                  value={editingAppointment.notes || ''}
                  onChange={(e) => setEditingAppointment({ ...editingAppointment, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  {t.cancel}
                </Button>
                <Button onClick={handleEditAppointment}>
                  {t.save}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
