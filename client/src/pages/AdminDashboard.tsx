import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Users, Stethoscope, UserCog, Tag } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/i18n";

export default function AdminDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const t = translations[language];

  const { data: appointments } = trpc.appointments.listAll.useQuery();
  const { data: doctors } = trpc.doctors.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const { data: stats } = trpc.stats.all.useQuery();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'admin')) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const todayAppointments = appointments?.filter(apt => {
    const today = new Date().toISOString().split('T')[0];
    const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
    return aptDate === today;
  }).length || 0;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t.welcome} {user?.displayName || user?.name} 👋</h1>
          <p className="text-gray-600">{t.overview}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t.totalAppointments}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{appointments?.length || 0}</div>
              <p className="text-blue-100 text-sm mt-1">{t.allBookings}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t.todayAppointments}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{todayAppointments}</div>
              <p className="text-green-100 text-sm mt-1">{t.myTodayBookings}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                {t.doctors}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{doctors?.length || 0}</div>
              <p className="text-purple-100 text-sm mt-1">{t.totalDoctors}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t.employees}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{users?.length || 0}</div>
              <p className="text-orange-100 text-sm mt-1">{t.totalEmployees}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>{t.employeeStats}</CardTitle>
            </CardHeader>
            <CardContent>
              {stats && stats.length > 0 ? (
                <div className="space-y-4">
                  {stats.slice(0, 5).map((s) => (
                    <div key={s.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-semibold">{s.displayName || s.userName}</div>
                        <div className="text-sm text-gray-600">
                          {t.total}: {s.total} | {t.today}: {s.today}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{s.total}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">{t.noData}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.quickActions}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  onClick={() => setLocation('/admin/appointments')}
                  className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Calendar className={`w-5 h-5 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  {t.manageAppointments}
                </Button>
                <Button
                  onClick={() => setLocation('/admin/doctors')}
                  className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  <Stethoscope className={`w-5 h-5 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  {t.manageDoctors}
                </Button>
                <Button
                  onClick={() => setLocation('/admin/users')}
                  className="w-full justify-start bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <UserCog className={`w-5 h-5 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  {t.manageUsers}
                </Button>
                <Button
                  onClick={() => setLocation('/admin/booking-sources')}
                  className="w-full justify-start bg-orange-600 hover:bg-orange-700"
                  size="lg"
                >
                  <Tag className={`w-5 h-5 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  {language === 'ar' ? 'إدارة مصادر الحجز' : 'Manage Booking Sources'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
