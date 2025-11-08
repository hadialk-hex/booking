import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, Users, Stethoscope } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      // إذا لم يكن لديه اسم معروض، يذهب لصفحة إعداد الاسم
      if (!user.displayName) {
        setLocation('/setup-name');
        return;
      }
      
      // إذا لم تتم الموافقة عليه، يذهب لصفحة الانتظار
      if (!user.isApproved || user.role === 'pending') {
        setLocation('/pending-approval');
        return;
      }
      
      // التوجيه حسب الصلاحية
      if (user.role === 'admin') {
        setLocation('/admin');
      } else if (user.role === 'call_center') {
        setLocation('/call-center');
      } else if (user.role === 'reception') {
        setLocation('/reception');
      }
    }
  }, [user, loading, isAuthenticated, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Calendar className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {t('appTitle')}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {t('appDescription')}
          </p>
          
          {!isAuthenticated && (
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-6"
              onClick={() => window.location.href = getLoginUrl()}
            >
              {t('signIn')}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>{t('admin')}</CardTitle>
              <CardDescription>
                إدارة كاملة للنظام والمستخدمين والأطباء
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• إدارة المستخدمين والصلاحيات</li>
                <li>• إدارة قائمة الأطباء</li>
                <li>• عرض جميع المواعيد</li>
                <li>• إحصائيات شاملة</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>{t('callCenter')}</CardTitle>
              <CardDescription>
                إضافة وإدارة الحجوزات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• إضافة حجوزات جديدة</li>
                <li>• عرض حجوزاتي فقط</li>
                <li>• تعديل وحذف حجوزاتي</li>
                <li>• لوحة المتصدرين</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Stethoscope className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>{t('reception')}</CardTitle>
              <CardDescription>
                استقبال المرضى وإدارة الحالات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• عرض جميع المواعيد</li>
                <li>• تحديث حالة الموعد</li>
                <li>• إضافة الأسعار</li>
                <li>• فلترة متقدمة</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
