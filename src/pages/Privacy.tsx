import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Trash2, AlertTriangle, ExternalLink, Shield, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { exportUserData, deleteAllUserData, deleteUserAccount, downloadUserData } from '@/lib/privacy';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/i18n';

export default function Privacy() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleExportData = async () => {
    if (!user) {
      toast({
        title: t('errors.permissionDenied'),
        description: t('privacy.authRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const data = await exportUserData();
      if (data) {
        downloadUserData(data);
        toast({
          title: t('privacy.export.success'),
          description: t('privacy.export.success'),
        });
      } else {
        throw new Error('Failed to export data');
      }
    } catch (error) {
      toast({
        title: t('privacy.export.failed'),
        description: t('privacy.export.failed'),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteData = async () => {
    if (!user) {
      toast({
        title: t('errors.permissionDenied'),
        description: t('privacy.authRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteAllUserData();
      if (success) {
        toast({
          title: t('privacy.delete.success'),
          description: t('privacy.delete.success'),
        });
      } else {
        throw new Error('Failed to delete data');
      }
    } catch (error) {
      toast({
        title: t('privacy.delete.failed'),
        description: t('privacy.delete.failed'),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      toast({
        title: t('errors.permissionDenied'),
        description: t('privacy.authRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsDeletingAccount(true);
    try {
      const success = await deleteUserAccount();
      if (success) {
        toast({
          title: t('privacy.account.delete.success'),
          description: t('privacy.account.delete.success'),
        });
        // Navigate to auth page after successful deletion
        navigate('/auth');
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      toast({
        title: t('privacy.account.delete.failed'),
        description: t('privacy.account.delete.failed'),
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!user) {
    return (
      <div className="relative min-h-[100dvh]">
        <div className="pointer-events-none absolute inset-0 bg-animated-purple opacity-75" />
        <div className="relative mx-auto max-w-4xl px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
            <h1 className="text-2xl font-bold text-purple-100">{t('privacy.title')}</h1>
          </div>
          
          <Card className="border border-white/20 bg-white/10 dark:bg-black/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-purple-100">{t('errors.permissionDenied')}</CardTitle>
              <CardDescription className="text-neutral-300">
                {t('privacy.authRequired')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/auth')}>
                {t('auth.login.title')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh]">
      <div className="pointer-events-none absolute inset-0 bg-animated-purple opacity-75" />
      <div className="relative mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <h1 className="text-2xl font-bold text-purple-100">{t('privacy.title')}</h1>
        </div>

        <div className="space-y-6">
          {/* Privacy Policy & Information */}
          <Card className="border border-white/20 bg-white/10 dark:bg-black/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-100">
                <Shield className="w-5 h-5" />
                {t('privacy.speechNotice.title')}
              </CardTitle>
              <CardDescription className="text-neutral-300">
                {t('privacy.speechNotice.body')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm text-neutral-200">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                  <div>
                    <strong>Beszédfelismerés:</strong> Az EyeHear az Apple beszédfelismerési szolgáltatását használja. 
                    A hanganyag az Apple szervereire kerülhet feldolgozás céljából. Ez az Apple adatvédelmi irányelvei szerint történik.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                  <div>
                    <strong>Adattárolás:</strong> Az átiratok és profiladatok biztonságosan tárolódnak az adatbázisunkban. 
                    Ön bármikor exportálhatja vagy törölheti adatait.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                  <div>
                    <strong>Nincs követés:</strong> Az EyeHear nem követi Önt más alkalmazásokban vagy weboldalakon 
                    reklám célokból.
                  </div>
                </div>
              </div>
              
              <Button variant="outline" className="w-full" asChild>
                <a 
                  href="https://example.com/privacy-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('privacy.links.privacyPolicy')}
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="border border-white/20 bg-white/10 dark:bg-black/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-purple-100">{t('privacy.dataRights.title')}</CardTitle>
              <CardDescription className="text-neutral-300">
                Exportálja vagy törölje az EyeHear-ben tárolt személyes adatait.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Export Data */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                <div>
                  <h3 className="font-medium text-purple-100">{t('privacy.dataRights.export')}</h3>
                  <p className="text-sm text-neutral-300">
                    Töltse le az összes átiratot és profiladatot JSON fájlként.
                  </p>
                </div>
                <Button 
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? 'Exportálás...' : 'Exportálás'}
                </Button>
              </div>

              {/* Delete Data */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                <div>
                  <h3 className="font-medium text-purple-100">Átiratok törlése</h3>
                  <p className="text-sm text-neutral-300">
                    Az összes mentett átirat végleges törlése. Ez a művelet nem vonható vissza.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      {t('privacy.dataRights.deleteData')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('privacy.delete.confirmTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('privacy.delete.confirmBody')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteData}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDeleting ? 'Törlés...' : t('privacy.delete.confirmYes')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Delete Account */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                <div>
                  <h3 className="font-medium text-red-300">{t('privacy.dataRights.deleteAccount')}</h3>
                  <p className="text-sm text-neutral-300">
                    A fiók és az összes kapcsolódó adat végleges törlése.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {t('privacy.dataRights.deleteAccount')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('privacy.account.delete.confirmTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ez a művelet nem vonható vissza. Ezzel véglegesen törli a fiókját, 
                        profiladatait és az összes átiratot. Lehetséges, hogy kapcsolatba kell lépnie az ügyfélszolgálattal a folyamat befejezéséhez.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDeletingAccount ? 'Törlés...' : 'Fiók törlése'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Support */}
          <Card className="border border-white/20 bg-white/10 dark:bg-black/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-purple-100">{t('privacy.dataRights.contactSupport')}</CardTitle>
              <CardDescription className="text-neutral-300">
                Segítségre van szüksége adatvédelmi vagy adatkezelési kérdésekben?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <a 
                  href="mailto:support@eyehear.app" 
                  className="flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('privacy.dataRights.contactSupport')}
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}