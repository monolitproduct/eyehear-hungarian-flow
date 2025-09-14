import { useState, useEffect, useCallback } from 'react';
import { t } from '@/i18n';
import { speechService } from '@/services/speech/SpeechService';

// TypeScript definitions for Web Speech API errors
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export interface PermissionState {
  microphone: PermissionStatus;
  speechRecognition: 'granted' | 'denied' | 'prompt' | 'unknown';
  isSupported: boolean;
  isLoading: boolean;
}

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

export const usePermissions = () => {
  const [permissionState, setPermissionState] = useState<PermissionState>({
    microphone: 'unknown',
    speechRecognition: 'unknown',
    isSupported: false,
    isLoading: true
  });

  const checkBrowserSupport = useCallback(async () => {
    const availability = await speechService.checkAvailability();
    return availability.available;
  }, []);

  const checkMicrophonePermission = useCallback(async (): Promise<PermissionStatus> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return 'denied';
      }

      // Check if permission API is available
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          return permission.state as PermissionStatus;
        } catch (error) {
          console.warn('Permissions API not available for microphone:', error);
        }
      }

      // Fallback: try to access microphone to check permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return 'granted';
      } catch (error: any) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          return 'denied';
        }
        return 'prompt';
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      return 'unknown';
    }
  }, []);

  const checkSpeechRecognitionPermission = useCallback(async (): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> => {
    try {
      const result = await speechService.requestPermission();
      return result.granted ? 'granted' : 'denied';
    } catch (error) {
      return 'unknown';
    }
  }, []);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }, []);

  const requestSpeechRecognitionPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await speechService.requestPermission();
      return result.granted;
    } catch (error) {
      return false;
    }
  }, []);

  const requestAllPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setPermissionState(prev => ({ ...prev, isLoading: true }));

      // Request microphone permission first
      const micGranted = await requestMicrophonePermission();
      if (!micGranted) {
        return false;
      }

      // Then request speech recognition permission
      const speechGranted = await requestSpeechRecognitionPermission();
      
      return micGranted && speechGranted;
    } finally {
      setPermissionState(prev => ({ ...prev, isLoading: false }));
    }
  }, [requestMicrophonePermission, requestSpeechRecognitionPermission]);

  const checkAllPermissions = useCallback(async () => {
    setPermissionState(prev => ({ ...prev, isLoading: true }));

    try {
      const isSupported = await checkBrowserSupport();
      
      if (!isSupported) {
        setPermissionState({
          microphone: 'denied',
          speechRecognition: 'denied',
          isSupported: false,
          isLoading: false
        });
        return;
      }

      const [micPermission, speechPermission] = await Promise.all([
        checkMicrophonePermission(),
        checkSpeechRecognitionPermission()
      ]);

      setPermissionState({
        microphone: micPermission,
        speechRecognition: speechPermission,
        isSupported: true,
        isLoading: false
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionState(prev => ({ ...prev, isLoading: false }));
    }
  }, [checkBrowserSupport, checkMicrophonePermission, checkSpeechRecognitionPermission]);

  const openAppSettings = useCallback(() => {
    // On iOS/mobile, this might not work, but we can try
    if (window.location.protocol === 'capacitor:') {
      // In Capacitor app, we could use a native plugin to open settings
      // For now, show an alert with instructions
      alert(t('permissions.openAppSettings') + ' - iOS beállítások szükségesek.');
    } else {
      // In web browser, show instructions
      alert('Kérjük, frissítse az oldalt és engedélyezze a mikrofont és beszédfelismerést a felugró ablakokban.');
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    checkAllPermissions();
  }, [checkAllPermissions]);

  return {
    ...permissionState,
    requestAllPermissions,
    checkAllPermissions,
    openAppSettings,
    hasAllPermissions: permissionState.microphone === 'granted' && permissionState.speechRecognition === 'granted',
    needsPermissions: permissionState.microphone !== 'granted' || permissionState.speechRecognition !== 'granted'
  };
};