import { Capacitor } from '@capacitor/core';

// Robust native platform detection
export const IS_NATIVE = (() => {
  try {
    return (
      Capacitor?.isNativePlatform?.() === true ||
      ['ios', 'android'].includes(Capacitor?.getPlatform?.() ?? '') ||
      window.location.protocol.startsWith('capacitor:')
    );
  } catch (error) {
    // Fallback if Capacitor is not available
    return window.location.protocol.startsWith('capacitor:');
  }
})();

export const PLATFORM = (() => {
  try {
    return Capacitor?.getPlatform?.() || 'web';
  } catch (error) {
    return 'web';
  }
})();

export const WEB_SPEECH_AVAILABLE = (() => {
  try {
    return !!(window as any).webkitSpeechRecognition || !!(window as any).SpeechRecognition;
  } catch (error) {
    return false;
  }
})();

// Utility function for banner visibility
export const shouldShowUnsupportedBanner = (): boolean => {
  // Never show on native platforms
  if (IS_NATIVE) return false;
  
  // On web, show only when speech API is missing
  return !WEB_SPEECH_AVAILABLE;
};

// Log platform info once on first import
let hasLogged = false;
if (!hasLogged) {
  console.log(`EH: platform=${PLATFORM} isNative=${IS_NATIVE} webSpeech=${WEB_SPEECH_AVAILABLE}`);
  hasLogged = true;
}