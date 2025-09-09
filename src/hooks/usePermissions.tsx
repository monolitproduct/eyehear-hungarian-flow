import { useState, useEffect, useCallback } from 'react';

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

  const checkBrowserSupport = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return !!SpeechRecognition && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
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

  const checkSpeechRecognitionPermission = useCallback((): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> => {
    return new Promise((resolve) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        resolve('denied');
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        const timeout = setTimeout(() => {
          recognition.abort();
          resolve('unknown');
        }, 3000);

        (recognition as any).onstart = () => {
          clearTimeout(timeout);
          recognition.abort();
          resolve('granted');
        };

        (recognition as any).onerror = (event: any) => {
          clearTimeout(timeout);
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            resolve('denied');
          } else {
            resolve('prompt');
          }
        };

        // Start recognition to test permission
        recognition.start();
      } catch (error) {
        console.error('Error checking speech recognition permission:', error);
        resolve('unknown');
      }
    });
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

  const requestSpeechRecognitionPermission = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        resolve(false);
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        const timeout = setTimeout(() => {
          recognition.abort();
          resolve(false);
        }, 5000);

        (recognition as any).onstart = () => {
          clearTimeout(timeout);
          recognition.abort();
          resolve(true);
        };

        (recognition as any).onerror = (event: any) => {
          clearTimeout(timeout);
          resolve(false);
        };

        recognition.start();
      } catch (error) {
        console.error('Error requesting speech recognition permission:', error);
        resolve(false);
      }
    });
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
      const isSupported = checkBrowserSupport();
      
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
      alert('Kérjük, nyissa meg a Beállítások > EyeHear > Engedélyek menüt a mikrofonhoz és beszédfelismeréshez való hozzáférés engedélyezéséhez.');
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