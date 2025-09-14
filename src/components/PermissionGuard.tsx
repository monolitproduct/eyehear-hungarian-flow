import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MessageSquare, Settings, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { shouldShowUnsupportedBanner } from '@/lib/platform/nativeFlags';

interface PermissionGuardProps {
  children: React.ReactNode;
  onPermissionsGranted?: () => void;
}

export default function PermissionGuard({ children, onPermissionsGranted }: PermissionGuardProps) {
  const [showExplainer, setShowExplainer] = useState(false);
  const [hasSeenExplainer, setHasSeenExplainer] = useState(false);
  const { 
    microphone, 
    speechRecognition, 
    isSupported, 
    isLoading, 
    hasAllPermissions, 
    needsPermissions,
    requestAllPermissions,
    checkAllPermissions,
    openAppSettings 
  } = usePermissions();
  const navigate = useNavigate();

  // Show loading state
  if (isLoading) {
    return (
      <div className="relative min-h-[100dvh] flex items-center justify-center">
        <div className="pointer-events-none absolute inset-0 bg-animated-purple opacity-75" />
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full"
          />
          <p className="mt-4 text-purple-100 text-center">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // If browser is not supported (robust native/web detection)
  if (!isSupported && shouldShowUnsupportedBanner()) {
    return (
      <div className="relative min-h-[100dvh]">
        <div className="pointer-events-none absolute inset-0 bg-animated-purple opacity-75" />
        <div className="relative mx-auto max-w-2xl px-4 py-8 flex flex-col items-center justify-center min-h-[100dvh]">
          <Card className="border border-white/20 bg-white/10 dark:bg-black/20 backdrop-blur-md">
            <CardHeader className="text-center">
              <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <CardTitle className="text-2xl text-purple-100">Böngésző nem támogatott</CardTitle>
              <CardDescription className="text-neutral-300">
                Az EyeHear alkalmazás Chrome, Safari, vagy Edge böngészőt igényel a beszédfelismerés működéséhez.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Oldal frissítése
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If permissions are granted, show the app
  if (hasAllPermissions) {
    onPermissionsGranted?.();
    return <>{children}</>;
  }

  // Show permission explainer on first run
  if (!hasSeenExplainer && !showExplainer) {
    return (
      <div className="relative min-h-[100dvh]">
        <div className="pointer-events-none absolute inset-0 bg-animated-purple opacity-75" />
        <div className="relative mx-auto max-w-2xl px-4 py-8 flex flex-col items-center justify-center min-h-[100dvh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <Card className="border border-white/20 bg-white/10 dark:bg-black/20 backdrop-blur-md">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Mic className="w-12 h-12 text-purple-300" />
                  <MessageSquare className="w-12 h-12 text-pink-300" />
                </div>
                <CardTitle className="text-2xl text-purple-100">{t('onboarding.title')}</CardTitle>
                <CardDescription className="text-neutral-300 text-base leading-relaxed">
                  {t('onboarding.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm text-neutral-200">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <Mic className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-purple-200">{t('permissions.microphone')} hozzáférés:</strong> A beszéd rögzítéséhez szükséges
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <MessageSquare className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-purple-200">{t('permissions.speech')}:</strong> Az Apple szolgáltatásai segítségével történik az átírás
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={() => {
                    setHasSeenExplainer(true);
                    setShowExplainer(true);
                  }}
                  className="w-full"
                  size="lg"
                >
                  {t('onboarding.continue')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Show permission request or denied state
  if (needsPermissions) {
    const handleRequestPermissions = async () => {
      const granted = await requestAllPermissions();
      if (granted) {
        // Recheck permissions after request
        await checkAllPermissions();
      }
    };

    const isDenied = microphone === 'denied' || speechRecognition === 'denied';

    return (
      <div className="relative min-h-[100dvh]">
        <div className="pointer-events-none absolute inset-0 bg-animated-purple opacity-75" />
        <div className="relative mx-auto max-w-2xl px-4 py-8 flex flex-col items-center justify-center min-h-[100dvh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-6"
          >
            {isDenied ? (
              // Permission denied state
              <Card className="border border-red-500/20 bg-red-500/5 backdrop-blur-md">
                <CardHeader className="text-center">
                  <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <CardTitle className="text-2xl text-red-300">{t('permissions.denied.title')}</CardTitle>
                  <CardDescription className="text-neutral-300">
                    {t('permissions.explain')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {microphone === 'denied' && (
                    <Alert className="border-red-500/20 bg-red-500/10">
                      <Mic className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-300">
                        {t('permissions.denied.body.mic')}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {speechRecognition === 'denied' && (
                    <Alert className="border-red-500/20 bg-red-500/10">
                      <MessageSquare className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-300">
                        {t('permissions.denied.body.speech')}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-2">
                    <Button 
                      onClick={openAppSettings}
                      variant="outline"
                      className="w-full flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      {t('permissions.openSettings')}
                    </Button>
                    
                    <Button 
                      onClick={checkAllPermissions}
                      variant="ghost"
                      className="w-full flex items-center gap-2 text-purple-200"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t('common.retry')}
                    </Button>
                    
                    <Button 
                      onClick={() => navigate('/privacy')}
                      variant="ghost"
                      size="sm"
                      className="text-neutral-400 hover:text-purple-200"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      {t('permissions.whyWeNeedThis')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Permission request state
              <Card className="border border-white/20 bg-white/10 dark:bg-black/20 backdrop-blur-md">
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Mic className="w-12 h-12 text-purple-300" />
                    <MessageSquare className="w-12 h-12 text-pink-300" />
                  </div>
                  <CardTitle className="text-2xl text-purple-100">{t('permissions.title')}</CardTitle>
                  <CardDescription className="text-neutral-300">
                    Kattintson az "Engedélyek megadása" gombra, majd engedélyezze a mikrofont és beszédfelismerést a böngésző felugró ablakokban.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleRequestPermissions}
                    className="w-full"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Engedélyek kérése...' : t('permissions.request')}
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/privacy')}
                    variant="ghost"
                    size="sm"
                    className="w-full text-neutral-400 hover:text-purple-200"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Adatvédelmi információk
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}