import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export interface SpeechServiceConfig {
  language?: string;
  partialResults?: boolean;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface SpeechResult {
  text: string;
  isFinal: boolean;
}

export type SpeechServiceListener = (result: SpeechResult) => void;
export type SpeechErrorListener = (error: string) => void;

class SpeechServiceImpl {
  private isListening = false;
  private nativeListening = false;
  private webRecognition: any = null;
  private resultListeners: SpeechServiceListener[] = [];
  private errorListeners: SpeechErrorListener[] = [];

  async checkAvailability(): Promise<{ available: boolean; reason?: string }> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await SpeechRecognition.available();
        return { available: result.available };
      } catch (error) {
        return { available: false, reason: 'native-unavailable' };
      }
    } else {
      // Web platform
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const mediaDevicesSupported = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
      
      if (!SpeechRecognitionClass || !mediaDevicesSupported) {
        return { available: false, reason: 'web-unsupported' };
      }
      
      return { available: true };
    }
  }

  async requestPermission(): Promise<{ granted: boolean; error?: string }> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await SpeechRecognition.requestPermissions();
        return { granted: result.speechRecognition === 'granted' };
      } catch (error) {
        return { granted: false, error: error instanceof Error ? error.message : 'Permission denied' };
      }
    } else {
      // Web platform - test by attempting to create recognition
      try {
        const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionClass) {
          return { granted: false, error: 'Speech recognition not supported' };
        }

        // Test microphone access
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        } catch (micError) {
          return { granted: false, error: 'Microphone access denied' };
        }

        // Test speech recognition
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            recognition.stop();
            resolve({ granted: true });
          }, 1000);

          recognition.onerror = (event: any) => {
            clearTimeout(timeout);
            if (event.error === 'not-allowed') {
              resolve({ granted: false, error: 'Speech recognition permission denied' });
            } else {
              resolve({ granted: true }); // Other errors don't necessarily mean no permission
            }
          };

          recognition.onstart = () => {
            clearTimeout(timeout);
            recognition.stop();
            resolve({ granted: true });
          };

          recognition.start();
        });
      } catch (error) {
        return { granted: false, error: error instanceof Error ? error.message : 'Permission check failed' };
      }
    }
  }

  async start(config: SpeechServiceConfig = {}): Promise<void> {
    if (this.isListening) {
      await this.stop();
    }

    const defaultConfig = {
      language: 'hu-HU',
      partialResults: true,
      continuous: true,
      interimResults: true,
      ...config
    };

    if (Capacitor.isNativePlatform()) {
      await this.startNative(defaultConfig);
    } else {
      await this.startWeb(defaultConfig);
    }

    this.isListening = true;
  }

  private async startNative(config: SpeechServiceConfig): Promise<void> {
    try {
      await SpeechRecognition.start({
        language: config.language!,
        maxResults: 5,
        prompt: 'Beszéljen most...',
        partialResults: config.partialResults!,
        popup: false,
      });

      this.nativeListening = true;

      // Listen for results
      SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        if (data.matches && data.matches.length > 0) {
          this.notifyResult({
            text: data.matches[0],
            isFinal: false
          });
        }
      });

      // Note: Using partialResults listener for both partial and final results
      // as the plugin may not have separate finalResults event

    } catch (error) {
      this.nativeListening = false;
      throw new Error(error instanceof Error ? error.message : 'Failed to start native speech recognition');
    }
  }

  private async startWeb(config: SpeechServiceConfig): Promise<void> {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) {
      throw new Error('Speech recognition not supported in this browser');
    }

    this.webRecognition = new SpeechRecognitionClass();
    this.webRecognition.continuous = config.continuous;
    this.webRecognition.interimResults = config.interimResults;
    this.webRecognition.lang = config.language;
    this.webRecognition.maxAlternatives = 1;

    this.webRecognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        this.notifyResult({
          text: result[0].transcript,
          isFinal: result.isFinal
        });
      }
    };

    this.webRecognition.onerror = (event: any) => {
      this.notifyError(event.error || 'Speech recognition error');
    };

    this.webRecognition.onend = () => {
      // Auto-restart if we're supposed to be continuous and still listening
      if (this.isListening && config.continuous) {
        setTimeout(() => {
          if (this.isListening) {
            this.webRecognition?.start();
          }
        }, 100);
      }
    };

    this.webRecognition.start();
  }

  async stop(): Promise<void> {
    this.isListening = false;

    if (Capacitor.isNativePlatform() && this.nativeListening) {
      try {
        await SpeechRecognition.stop();
        SpeechRecognition.removeAllListeners();
        this.nativeListening = false;
      } catch (error) {
        console.warn('Error stopping native speech recognition:', error);
      }
    } else if (this.webRecognition) {
      this.webRecognition.stop();
      this.webRecognition = null;
    }
  }

  onResult(listener: SpeechServiceListener): () => void {
    this.resultListeners.push(listener);
    return () => {
      const index = this.resultListeners.indexOf(listener);
      if (index > -1) {
        this.resultListeners.splice(index, 1);
      }
    };
  }

  onError(listener: SpeechErrorListener): () => void {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  private notifyResult(result: SpeechResult): void {
    this.resultListeners.forEach(listener => listener(result));
  }

  private notifyError(error: string): void {
    this.errorListeners.forEach(listener => listener(error));
  }

  get listening(): boolean {
    return this.isListening;
  }

  get isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }
}

export const speechService = new SpeechServiceImpl();