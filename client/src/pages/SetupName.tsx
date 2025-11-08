import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function SetupName() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const updateNameMutation = trpc.auth.setupName.useMutation();
  const utils = trpc.useUtils();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('nameRequired'));
      return;
    }

    try {
      await updateNameMutation.mutateAsync({ displayName: name.trim() });
      toast.success('تم حفظ الاسم بنجاح');
      // إعادة تحميل بيانات المستخدم
      await utils.auth.me.invalidate();
      // الانتقال إلى صفحة انتظار الموافقة
      setLocation('/pending-approval');
    } catch (error) {
      toast.error(t('error'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('setupName')}</CardTitle>
          <CardDescription>{t('setupDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">{t('yourName')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('enterYourName')}
                className="mt-2"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={updateNameMutation.isPending}>
              {updateNameMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {t('continue')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
