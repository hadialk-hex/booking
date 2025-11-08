import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Clock } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function PendingApproval() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // فحص حالة الموافقة كل 3 ثوانٍ
  useEffect(() => {
    if (!loading && user) {
      // إذا تمت الموافقة، انتقل للصفحة المناسبة
      if (user.isApproved && user.role !== 'pending') {
        if (user.role === 'admin') {
          setLocation('/admin');
        } else if (user.role === 'call_center') {
          setLocation('/call-center');
        } else if (user.role === 'reception') {
          setLocation('/reception');
        }
      }
    }
  }, [user, loading, setLocation]);

  const handleLogout = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-100 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t('pendingApproval')}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t('pendingMessage')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            {t('contactAdmin')}
          </div>
          <Button onClick={handleLogout} variant="outline" className="w-full">
            {t('logout')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
