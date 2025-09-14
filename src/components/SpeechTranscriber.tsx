import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, MicOff, Save, FileText, Clock, Hash, Zap, LogOut, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SavedTranscripts from './SavedTranscripts';
import { t } from '@/i18n';
import { speechService, SpeechResult } from '@/services/speech/SpeechService';

// TypeScript interfaces for data structures
interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

const SpeechTranscriber: React.FC = () => {
  // Main state variables
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [currentInterim, setCurrentInterim] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [showSavedTranscripts, setShowSavedTranscripts] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Critical refs for speech handling
  const lastInterimTextRef = useRef('');
  const finalizedTextRef = useRef('');
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resultUnsubscribeRef = useRef<(() => void) | null>(null);
  const errorUnsubscribeRef = useRef<(() => void) | null>(null);

  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Constants
  const MAX_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  // Check speech service availability
  useEffect(() => {
    const checkAvailability = async () => {
      const availability = await speechService.checkAvailability();
      setIsSupported(availability.available);
      
      if (!availability.available && availability.reason === 'web-unsupported') {
        toast({
          title: "Nem támogatott",
          description: "A böngésző nem támogatja a beszédfelismerést. Próbálja meg Chrome vagy Safari böngészővel.",
          variant: "destructive",
        });
      }
    };
    
    checkAvailability();
  }, [toast]);

  // Session duration updater
  useEffect(() => {
    if (isListening && sessionStartTime) {
      durationIntervalRef.current = setInterval(() => {
        const duration = Date.now() - sessionStartTime.getTime();
        setSessionDuration(duration);
        
        // Auto-stop at 30 minutes
        if (duration >= MAX_SESSION_DURATION) {
          stopListening();
          toast({
            title: "Munkamenet befejezve",
            description: "30 perces maximum elérve. A felvétel automatikusan leállt.",
            variant: "destructive",
          });
        }
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isListening, sessionStartTime]);

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, currentInterim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resultUnsubscribeRef.current) {
        resultUnsubscribeRef.current();
      }
      if (errorUnsubscribeRef.current) {
        errorUnsubscribeRef.current();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      speechService.stop();
    };
  }, []);

  // Format duration helper
  const formatDuration = useCallback((ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  }, []);

  // Handle speech recognition results
  const handleResult = useCallback((result: SpeechResult) => {
    const cleanText = sanitizeText(result.text).trim();
    if (!cleanText) return;

    if (result.isFinal) {
      // Add final result to transcript
      setTranscript(prev => [...prev, {
        id: crypto.randomUUID(),
        text: cleanText,
        timestamp: new Date(),
        isFinal: true
      }]);
      
      // Clear interim text and update refs
      setCurrentInterim('');
      lastInterimTextRef.current = '';
      finalizedTextRef.current += ' ' + cleanText;
      
      // Update word count
      const words = finalizedTextRef.current.trim().split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
    } else {
      // Update interim results
      if (cleanText !== lastInterimTextRef.current) {
        setCurrentInterim(cleanText);
        lastInterimTextRef.current = cleanText;
      }
    }
  }, []);

  // Handle speech recognition errors
  const handleError = useCallback((error: string) => {
    console.error('Speech recognition error:', error);
    
    // Map errors to user-friendly messages in Hungarian
    let message = 'Ismeretlen hiba történt a beszédfelismerés során.';
    
    if (error.includes('not-allowed') || error.includes('permission')) {
      message = 'Mikrofonengedély szükséges a beszédfelismeréshez.';
    } else if (error.includes('network')) {
      message = 'Hálózati hiba. Ellenőrizze az internetkapcsolatot.';
    } else if (error.includes('no-speech')) {
      message = 'Nincs beszéd érzékelve. Próbálja újra.';
    } else if (error.includes('audio-capture')) {
      message = 'Mikrofon nem érhető el. Ellenőrizze a mikrofonkapcsolatot.';
    }

    toast({
      title: 'Beszédfelismerési hiba',
      description: message,
      variant: 'destructive',
    });
  }, [toast]);

  // Start listening
  const startListening = useCallback(async () => {
    try {
      // Check permissions first
      const permissionResult = await speechService.requestPermission();
      if (!permissionResult.granted) {
        toast({
          title: 'Engedély szükséges',
          description: permissionResult.error || 'Mikrofon és beszédfelismerési engedély szükséges.',
          variant: 'destructive',
        });
        return;
      }

      // Set up listeners
      resultUnsubscribeRef.current = speechService.onResult(handleResult);
      errorUnsubscribeRef.current = speechService.onError(handleError);

      // Start speech recognition
      await speechService.start({
        language: 'hu-HU',
        partialResults: true,
        continuous: true,
        interimResults: true
      });

      setIsListening(true);
      setSessionStartTime(new Date());
      setSessionDuration(0);
      
      toast({
        title: speechService.isNativePlatform ? 'Natív beszédfelismerés indítva' : 'Webes beszédfelismerés indítva',
        description: 'Kezdje el beszélni...',
      });

    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast({
        title: 'Hiba',
        description: error instanceof Error ? error.message : 'Nem sikerült elindítani a beszédfelismerést.',
        variant: 'destructive',
      });
    }
  }, [handleResult, handleError, toast]);

  // Stop listening
  const stopListening = useCallback(async () => {
    try {
      await speechService.stop();
      
      // Clean up listeners
      if (resultUnsubscribeRef.current) {
        resultUnsubscribeRef.current();
        resultUnsubscribeRef.current = null;
      }
      if (errorUnsubscribeRef.current) {
        errorUnsubscribeRef.current();
        errorUnsubscribeRef.current = null;
      }

      setIsListening(false);
      
      // Add any remaining interim text as final
      if (currentInterim.trim()) {
        setTranscript(prev => [...prev, {
          id: crypto.randomUUID(),
          text: currentInterim.trim(),
          timestamp: new Date(),
          isFinal: true
        }]);
        setCurrentInterim('');
      }
      
      // Show save dialog if there's content
      if (transcript.length > 0 || currentInterim.trim()) {
        setShowSaveDialog(true);
      }

    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }, [transcript, currentInterim]);

  // Sanitize text to prevent XSS
  const sanitizeText = (text: string): string => {
    return text.replace(/[<>]/g, '');
  };

  // Save transcript to Supabase
  const saveTranscript = useCallback(async () => {
    if (!user) {
      toast({
        title: t('auth.login.required'),
        description: t('auth.login.required.save'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const allText = transcript.map(t => t.text).join(' ') + (currentInterim ? ' ' + currentInterim : '');
      const sanitizedText = sanitizeText(allText);
      const finalTitle = sanitizeText(saveTitle || `Átirat ${new Date().toLocaleDateString('hu-HU')}`);

      const { error } = await supabase
        .from('transcripts')
        .insert({
          title: finalTitle,
          content: sanitizedText,
          word_count: wordCount,
          session_duration: Math.round(sessionDuration / 1000),
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: 'Átirat mentve',
        description: `"${finalTitle}" sikeresen mentve!`,
      });

      setShowSaveDialog(false);
      setSaveTitle('');
    } catch (error) {
      console.error('Error saving transcript:', error);
      toast({
        title: 'Mentési hiba',
        description: 'Az átirat mentése nem sikerült.',
        variant: 'destructive',
      });
    }
  }, [user, transcript, currentInterim, saveTitle, wordCount, sessionDuration, toast]);

  // Discard transcript
  const discardTranscript = useCallback(() => {
    setTranscript([]);
    setCurrentInterim('');
    setWordCount(0);
    setSessionDuration(0);
    setSessionStartTime(null);
    setShowSaveDialog(false);
    setSaveTitle('');
    finalizedTextRef.current = '';
    lastInterimTextRef.current = '';
  }, []);

  // Format transcript text into readable chunks
  const formatTranscriptText = useCallback((segments: TranscriptSegment[]): string[] => {
    const fullText = segments.map(s => s.text).join(' ');
    const sentences = fullText.match(/[^\.!?]*[\.!?]+/g) || [fullText];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    if (isListening) {
      await stopListening();
    }
    await signOut();
    navigate('/auth');
  };

  // Show saved transcripts view
  if (showSavedTranscripts) {
    return <SavedTranscripts onBack={() => setShowSavedTranscripts(false)} />;
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 bg-animated-purple opacity-75" />
      
      {/* Floating orbs for ambiance */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/5 backdrop-blur-sm"
            style={{
              width: Math.random() * 200 + 100,
              height: Math.random() * 200 + 100,
            }}
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            transition={{
              duration: Math.random() * 20 + 20,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8">
        {/* Header with controls */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                scale: isListening ? [1, 1.1, 1] : 1,
                rotate: isListening ? [0, 5, -5, 0] : 0
              }}
              transition={{ 
                duration: 2, 
                repeat: isListening ? Infinity : 0,
                ease: "easeInOut"
              }}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25"
            >
              <Zap className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white">EyeHear</h1>
              <p className="text-sm text-purple-200">
                {speechService.isNativePlatform ? 'Natív iOS beszédfelismerés' : 'Webes beszédfelismerés'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSavedTranscripts(true)}
              className="text-white hover:bg-white/10"
            >
              <FileText className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/privacy')}
              className="text-white hover:bg-white/10"
            >
              <Shield className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Status bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="border border-white/20 bg-white/10 backdrop-blur-md">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-purple-300" />
                <span className="text-sm font-medium text-purple-200">Időtartam</span>
              </div>
              <div className="text-lg font-bold text-white">
                {formatDuration(sessionDuration)}
              </div>
            </div>
          </Card>
          
          <Card className="border border-white/20 bg-white/10 backdrop-blur-md">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Hash className="w-4 h-4 text-green-300" />
                <span className="text-sm font-medium text-purple-200">Szavak</span>
              </div>
              <div className="text-lg font-bold text-white">{wordCount}</div>
            </div>
          </Card>
          
          <Card className="border border-white/20 bg-white/10 backdrop-blur-md">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Mic className={`w-4 h-4 ${isListening ? 'text-red-400' : 'text-gray-400'}`} />
                <span className="text-sm font-medium text-purple-200">Státusz</span>
              </div>
              <div className={`text-lg font-bold ${isListening ? 'text-red-400' : 'text-white'}`}>
                {isListening ? 'Hallgatás...' : 'Készenlét'}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Main microphone button */}
        <div className="mb-8 flex justify-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={!isSupported}
              size="lg"
              className={`
                relative w-24 h-24 rounded-full p-0 border-4 transition-all duration-300
                ${isListening 
                  ? 'bg-red-500 hover:bg-red-600 border-red-300 shadow-lg shadow-red-500/50' 
                  : 'bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 border-purple-300 shadow-lg shadow-purple-500/50'
                }
                ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <motion.div
                animate={isListening ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </motion.div>
              
              {/* Pulse effect when listening */}
              <AnimatePresence>
                {isListening && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0.5, 0], scale: [1, 2] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-red-400 pointer-events-none"
                  />
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </div>

        {/* Transcript display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border border-white/20 bg-white/5 backdrop-blur-md">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Élő átirat</h2>
                {transcript.length > 0 && (
                  <Button
                    onClick={() => setShowSaveDialog(true)}
                    variant="ghost"
                    size="sm"
                    className="text-purple-200 hover:text-white hover:bg-white/10"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Mentés
                  </Button>
                )}
              </div>
              
              <div className="min-h-[300px] max-h-[400px] overflow-y-auto rounded-lg bg-black/20 p-4 text-white">
                {transcript.length === 0 && !currentInterim ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                    <Mic className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg">Kattintson a mikrofon gombra a beszédfelismerés indításához</p>
                    <p className="text-sm mt-2">
                      {speechService.isNativePlatform 
                        ? 'Natív iOS beszédfelismerés használata' 
                        : 'Webes beszédfelismerés használata'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formatTranscriptText(transcript).map((sentence, index) => (
                      <motion.p
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="leading-relaxed"
                      >
                        {sentence}
                      </motion.p>
                    ))}
                    
                    {/* Current interim results */}
                    <AnimatePresence>
                      {currentInterim && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-purple-300 italic leading-relaxed"
                        >
                          {currentInterim}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    
                    {/* Auto-scroll target */}
                    <div ref={transcriptEndRef} />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="border border-white/20 bg-gradient-to-br from-purple-900/90 to-pink-900/90 backdrop-blur-md text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Átirat mentése</DialogTitle>
            <DialogDescription className="text-purple-200">
              Adjon nevet az átiratnak a későbbi visszakereséshez.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title" className="text-purple-200">Cím</Label>
              <Input
                id="title"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder={`Átirat ${new Date().toLocaleDateString('hu-HU')}`}
                className="mt-2 border-white/20 bg-white/10 text-white placeholder:text-purple-300"
              />
            </div>
            
            <div className="text-sm text-purple-200">
              <p>Szavak száma: {wordCount}</p>
              <p>Időtartam: {formatDuration(sessionDuration)}</p>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={discardTranscript}
              className="text-purple-200 hover:text-white hover:bg-white/10"
            >
              Elvetés
            </Button>
            <Button
              onClick={saveTranscript}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
            >
              <Save className="w-4 h-4 mr-2" />
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpeechTranscriber;