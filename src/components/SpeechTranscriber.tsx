import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, MicOff, Save, FileText, Clock, Hash, Zap, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SavedTranscripts from './SavedTranscripts';

// TypeScript interfaces for data structures
interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  addEventListener(type: string, listener: (event: SpeechRecognitionEvent) => void): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastInterimTextRef = useRef('');
  const finalizedTextRef = useRef('');
  const isRestartingRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const { user, signOut } = useAuth();

  // Constants
  const MAX_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
  const RESTART_INTERVAL = 55 * 1000; // 55 seconds to prevent 1-minute cutoff

  // Check browser support for Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
    } else {
      toast({
        title: "Nem támogatott",
        description: "A böngésző nem támogatja a beszédfelismerést. Próbálja meg Chrome vagy Safari böngészővel.",
        variant: "destructive",
      });
    }
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
  }, [isListening, sessionStartTime, toast]);

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, currentInterim]);

  // Format duration for display
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Create and configure speech recognition
  const createRecognition = useCallback((): SpeechRecognition | null => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    
    // Configure recognition for Hungarian continuous speech
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'hu-HU';
    recognition.maxAlternatives = 1;

    // Force online/server-based recognition (not device-local)
    if ('serviceURI' in recognition) {
      (recognition as any).serviceURI = 'wss://www.google.com/speech-api/v2/recognize';
    }

    return recognition;
  }, []);

  // Handle speech recognition results
  const handleResult = useCallback((event: SpeechRecognitionEvent) => {
    if (isRestartingRef.current) return;

    let interimTranscript = '';
    let finalTranscript = '';

    // Process all results from the current session
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    // Update state with new transcript data
    if (finalTranscript) {
      const newSegment: TranscriptSegment = {
        id: Date.now().toString(),
        text: finalTranscript.trim(),
        timestamp: new Date(),
        isFinal: true,
      };

      setTranscript(prev => [...prev, newSegment]);
      finalizedTextRef.current += finalTranscript;
      setWordCount(prev => prev + finalTranscript.split(' ').filter(word => word.length > 0).length);
      setCurrentInterim('');
      lastInterimTextRef.current = '';
    }

    if (interimTranscript && !finalTranscript) {
      setCurrentInterim(interimTranscript);
      lastInterimTextRef.current = interimTranscript;
    }
  }, []);

  // Handle speech recognition errors
  const handleError = useCallback((event: any) => {
    if (isRestartingRef.current) return;

    console.error('Speech recognition error:', event.error);
    
    // Handle different error types
    switch (event.error) {
      case 'network':
        toast({
          title: "Hálózati hiba",
          description: "Ellenőrizze az internetkapcsolatot és próbálja újra.",
          variant: "destructive",
        });
        break;
      case 'not-allowed':
        toast({
          title: "Mikrofonhozzáférés megtagadva",
          description: "Újítsa fel az oldalt és engedélyezze a mikrofonhozzáférést amikor kéri a böngésző.",
          variant: "destructive",
        });
        break;
      case 'no-speech':
        // Don't show error for no speech - this is normal
        return;
      default:
        toast({
          title: "Beszédfelismerési hiba",
          description: "Váratlan hiba történt. Próbálja újra.",
          variant: "destructive",
        });
    }

    setIsListening(false);
  }, [toast]);

  // Handle speech recognition end (triggers auto-restart)
  const handleEnd = useCallback(() => {
    console.log('Speech recognition ended');
    
    if (!isRestartingRef.current && isListening) {
      console.log('Restarting recognition...');
      restartRecognition();
    }
  }, [isListening]);

  // Restart speech recognition (called every 55 seconds)
  const restartRecognition = useCallback(() => {
    if (!isListening || isRestartingRef.current) return;

    isRestartingRef.current = true;
    console.log('Restarting speech recognition to prevent timeout...');

    // Stop current recognition
    if (recognitionRef.current) {
      recognitionRef.current.removeEventListener('result', handleResult as any);
      recognitionRef.current.removeEventListener('error', handleError as any);
      recognitionRef.current.removeEventListener('end', handleEnd as any);
      recognitionRef.current.stop();
    }

    // Start new recognition after brief delay
    setTimeout(() => {
      const newRecognition = createRecognition();
      if (!newRecognition) return;

      recognitionRef.current = newRecognition;
      
      // Re-attach event listeners
      newRecognition.addEventListener('result', handleResult as any);
      newRecognition.addEventListener('error', handleError as any);
      newRecognition.addEventListener('end', handleEnd as any);

      try {
        newRecognition.start();
        isRestartingRef.current = false;
        
        // Schedule next restart
        restartTimeoutRef.current = setTimeout(restartRecognition, RESTART_INTERVAL);
      } catch (error) {
        console.error('Error restarting recognition:', error);
        isRestartingRef.current = false;
      }
    }, 100);
  }, [isListening, createRecognition, handleResult, handleError, handleEnd]);

  // Request microphone permissions explicitly
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      // First, try to get microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Clean up
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      toast({
        title: "Mikrofonhozzáférés megtagadva",
        description: "Engedélyezze a mikrofonhozzáférést a böngészőben és próbálja újra.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Start listening function
  const startListening = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Nem támogatott",
        description: "A böngésző nem támogatja a beszédfelismerést.",
        variant: "destructive",
      });
      return;
    }

    // Request microphone permission first
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      return;
    }

    const recognition = createRecognition();
    if (!recognition) return;

    // Reset state for new session
    setTranscript([]);
    setCurrentInterim('');
    setWordCount(0);
    setSessionStartTime(new Date());
    setSessionDuration(0);
    finalizedTextRef.current = '';
    lastInterimTextRef.current = '';

    // Set up event listeners
    recognition.addEventListener('result', handleResult as any);
    recognition.addEventListener('error', handleError as any);
    recognition.addEventListener('end', handleEnd as any);

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
      
      // Schedule first restart
      restartTimeoutRef.current = setTimeout(restartRecognition, RESTART_INTERVAL);
      
      toast({
        title: "Beszédfelismerés aktív",
        description: "Beszéljen a mikrofonba. A felismerés folyamatos, maximum 30 percig.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error starting recognition:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült elindítani a beszédfelismerést.",
        variant: "destructive",
      });
    }
  }, [isSupported, createRecognition, handleResult, handleError, handleEnd, restartRecognition, toast]);

  // Stop listening function
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.removeEventListener('result', handleResult as any);
      recognitionRef.current.removeEventListener('error', handleError as any);
      recognitionRef.current.removeEventListener('end', handleEnd as any);
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Clear timeouts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }

    setIsListening(false);
    isRestartingRef.current = false;

    // Show save dialog if there's content
    if (transcript.length > 0 || currentInterim.trim()) {
      setShowSaveDialog(true);
      setSaveTitle(`Átirat ${new Date().toLocaleDateString('hu-HU')} ${new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}`);
    }

    toast({
      title: "Felvétel leállítva",
      description: "A beszédfelismerés befejeződött.",
      duration: 2000,
    });
  }, [transcript, currentInterim, handleResult, handleError, handleEnd, toast]);

  // Save transcript to database
  const saveTranscript = async () => {
    const fullContent = finalizedTextRef.current + (currentInterim ? ' ' + currentInterim : '');
    
    if (!fullContent.trim()) {
      toast({
        title: "Nincs tartalom",
        description: "Nincs mentendő átirat.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    if (!user) {
      toast({
        title: "Bejelentkezés szükséges",
        description: "Jelentkezzen be a mentéshez",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('transcripts')
        .insert([{
          title: saveTitle || 'Mentett átirat',
          content: fullContent.trim(),
          word_count: wordCount + (currentInterim ? currentInterim.split(' ').filter(w => w.length > 0).length : 0),
          duration_seconds: Math.floor(sessionDuration / 1000),
          user_id: user.id,
        }]);

      if (error) throw error;

      toast({
        title: "Átirat mentve",
        description: "Az átirat sikeresen mentve lett az adatbázisba.",
        duration: 2000,
      });

      setShowSaveDialog(false);
      setSaveTitle('');
    } catch (error) {
      console.error('Error saving transcript:', error);
      toast({
        title: "Mentési hiba",
        description: "Nem sikerült menteni az átiratot.",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  // Discard transcript
  const discardTranscript = () => {
    setShowSaveDialog(false);
    setSaveTitle('');
    setTranscript([]);
    setCurrentInterim('');
    setWordCount(0);
    setSessionDuration(0);
    finalizedTextRef.current = '';
    lastInterimTextRef.current = '';
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  // Format transcript text into 4-word chunks
  const formatTranscriptText = (text: string) => {
    const words = text.split(' ').filter(word => word.length > 0);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += 4) {
      chunks.push(words.slice(i, i + 4).join(' '));
    }
    
    return chunks;
  };

  // Render saved transcripts view
  if (showSavedTranscripts) {
    return <SavedTranscripts onBack={() => setShowSavedTranscripts(false)} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col particle-bg">
      {/* Futuristic Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="header-gradient border-b border-border p-4 sticky top-0 z-10"
      >
        <div className="max-w-6xl mx-auto">
          <div className="bento-grid grid-cols-1 md:grid-cols-3 gap-4 p-0">
            {/* App Title Section */}
            <motion.div 
              className="glass-card p-3 neon-border mt-4"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <h1 className="text-3xl font-heading font-bold text-white mb-2 text-center animate-pulse-glow">
                EyeHear
              </h1>
              <p className="text-sm text-white mt-1 text-center">
                Magyar nyelvű beszédfelismerő AI
              </p>
            </motion.div>

            {/* Status Display */}
            <AnimatePresence>
              {isListening && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="glass-card p-3 grid grid-cols-2 gap-3"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <Clock className="w-5 h-5 animate-pulse" />
                    <span className="font-mono text-lg">{formatDuration(sessionDuration)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-transcript-cyan">
                    <Hash className="w-5 h-5" />
                    <span className="font-mono text-lg">{wordCount} szó</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Action Button */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex gap-2"
            >
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowSavedTranscripts(true)}
                className="flex-1 glass-card border-primary/30 hover:border-primary text-foreground hover:text-primary transition-all duration-300"
              >
                <FileText className="w-5 h-5 mr-2" />
                Mentett átiratok
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={async () => {
                  try {
                    await signOut();
                    toast({
                      title: "Kijelentkezés sikeres",
                      description: "Sikeresen kijelentkezett.",
                    });
                  } catch (error) {
                    console.error('Logout error:', error);
                    toast({
                      title: "Kijelentkezési hiba",
                      description: "Nem sikerült kijelentkezni. Próbálja újra.",
                      variant: "destructive",
                    });
                  }
                }}
                className="glass-card border-destructive/30 hover:border-destructive text-destructive hover:text-destructive transition-all duration-300 relative z-10"
                style={{ pointerEvents: 'auto' }}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Futuristic Main Transcript Area */}
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card min-h-[55vh] p-6 perspective-1000"
          >
            {!isListening && transcript.length === 0 && !currentInterim ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center h-full text-center"
              >
                <div className="space-y-4">
                  <div className="flex justify-center items-center w-full">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.06, 1]
                      }}
                      transition={{ 
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="relative mic-logo-container"
                      style={{
                        width: 'clamp(120px, min(26vw, 160px), 160px)',
                        height: 'clamp(120px, min(26vw, 160px), 160px)',
                        transformOrigin: 'center',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <svg
                        viewBox="0 0 200 200"
                        className="w-full h-full relative z-10"
                        role="img"
                        aria-label="Mikrofon – élő beszédfelismerés"
                      >
                        {/* Gradient Definitions */}
                        <defs>
                          <linearGradient id="micGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#FF0080" />
                            <stop offset="100%" stopColor="#7928CA" />
                          </linearGradient>
                          <filter id="whiteGlow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge> 
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                          <filter id="glow">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                            <feMerge> 
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>
                        
                        {/* Outer Glow Circle */}
                        <circle 
                          cx="100" 
                          cy="100" 
                          r="90" 
                          fill="none" 
                          stroke="url(#micGradient)" 
                          strokeWidth="2" 
                          opacity="0.3"
                          className="animate-pulse-ring"
                        />
                        
                        {/* Main Circle */}
                        <circle 
                          cx="100" 
                          cy="100" 
                          r="70" 
                          fill="rgba(15, 15, 23, 0.8)" 
                          stroke="url(#micGradient)" 
                          strokeWidth="3"
                          filter="url(#glow)"
                        />
                        
                        {/* Conventional White Microphone Pictogram */}
                        <g transform="translate(100, 100)" fill="#FFFFFF">
                          {/* Mic Capsule */}
                          <ellipse cx="0" cy="-20" rx="12" ry="16" fill="#FFFFFF" />
                          
                          {/* Mic Stand */}
                          <rect x="-1.5" y="-4" width="3" height="20" fill="#FFFFFF" />
                          
                          {/* Mic Stand Base */}
                          <ellipse cx="0" cy="16" rx="18" ry="3" fill="#FFFFFF" />
                          
                          {/* Mic Windscreen Grid */}
                          <line x1="-8" y1="-25" x2="8" y2="-25" stroke="#0F0F17" strokeWidth="1" />
                          <line x1="-8" y1="-20" x2="8" y2="-20" stroke="#0F0F17" strokeWidth="1" />
                          <line x1="-8" y1="-15" x2="8" y2="-15" stroke="#0F0F17" strokeWidth="1" />
                          <line x1="-6" y1="-30" x2="-6" y2="-10" stroke="#0F0F17" strokeWidth="1" />
                          <line x1="0" y1="-30" x2="0" y2="-10" stroke="#0F0F17" strokeWidth="1" />
                          <line x1="6" y1="-30" x2="6" y2="-10" stroke="#0F0F17" strokeWidth="1" />
                        </g>
                      </svg>
                      
                      {/* Ambient Glow Rings */}
                      <div className="absolute inset-0 rounded-full mic-glow-ring-1"></div>
                      <div className="absolute inset-0 rounded-full mic-glow-ring-2"></div>
                    </motion.div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-heading font-bold text-glow">
                      AI BESZÉDFELISMERÉS
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                      Nyomja meg a mikrofon gombot és valós időben olvashatja az elhangzott szöveget
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-3 perspective-1000">
                <AnimatePresence>
                  {/* Final transcript segments */}
                  {transcript.map((segment, segmentIndex) => (
                    <motion.div 
                      key={segment.id}
                      initial={{ opacity: 0, y: 20, rotateX: 90 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{ 
                        delay: segmentIndex * 0.1,
                        type: "spring",
                        stiffness: 300
                      }}
                      className="space-y-1"
                    >
                      {formatTranscriptText(segment.text).map((chunk, index) => (
                        <motion.div
                          key={`${segment.id}-${index}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="py-1 text-transcript-cyan text-2xl leading-tight"
                          whileHover={{ scale: 1.02 }}
                        >
                          {chunk}
                        </motion.div>
                      ))}
                    </motion.div>
                  ))}
                  
                  {/* Current interim text */}
                  {currentInterim && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-1"
                    >
                      {formatTranscriptText(currentInterim).map((chunk, index) => (
                        <motion.div
                          key={`interim-${index}`}
                          animate={{ 
                            opacity: [0.5, 0.8, 0.5],
                            scale: [0.98, 1.02, 0.98]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="py-1 text-transcript-cyan text-2xl leading-tight opacity-70"
                        >
                          {chunk}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div ref={transcriptEndRef} />
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Futuristic Fixed Bottom Navigation */}
      <motion.footer 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-t border-border/50 p-4 bg-glass backdrop-blur-glass"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center gap-3">
            {/* Main Microphone Button */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative -mt-4"
            >
              <Button
                size="lg"
                onClick={isListening ? stopListening : startListening}
                disabled={!isSupported}
                className={`w-20 h-20 rounded-full relative overflow-hidden transition-all duration-500 text-white font-bold ${
                  isListening ? 'mic-button-active' : ''
                }`}
                style={{
                  background: 'linear-gradient(90deg, #FF0080 0%, #7928CA 100%)',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'left center',
                  backgroundClip: 'padding-box',
                  border: 'none',
                  borderColor: 'transparent',
                  borderRadius: '9999px'
                }}
              >
                <motion.div
                  animate={isListening ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 2, repeat: isListening ? Infinity : 0, ease: "linear" }}
                >
                  {isListening ? (
                    <MicOff className="w-10 h-10" />
                  ) : (
                    <Mic className="w-10 h-10" />
                  )}
                </motion.div>
                
                {/* Ripple effect */}
                {isListening && (
                  <motion.div
                    className="absolute inset-0 border-2 border-primary rounded-full"
                    animate={{
                      scale: [1, 1.5, 2],
                      opacity: [0.5, 0.2, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  />
                )}
              </Button>
            </motion.div>
            
            {/* Session Status */}
            <AnimatePresence>
              {isListening && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="glass-card px-4 py-2 rounded-full border border-primary/30"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2 text-primary">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-2 h-2 bg-primary rounded-full"
                      />
                      <span className="font-mono">REC</span>
                    </div>
                    <div className="h-4 w-px bg-border"></div>
                    <span className="text-muted-foreground">
                      Beszéljen a mikrofonba • Maximum{' '}
                      <span className="text-warning font-mono">
                        {formatDuration(MAX_SESSION_DURATION - sessionDuration)}
                      </span>{' '}
                      hátra
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.footer>

      {/* Futuristic Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="glass-card border-primary/30 max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <DialogHeader className="space-y-4">
              <DialogTitle className="text-2xl font-heading text-glow flex items-center gap-2">
                <Save className="w-6 h-6 text-primary" />
                Átirat mentése
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Adjon címet az átiratnak, vagy hagyja üresen az alapértelmezett címhez.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground font-medium">Cím</Label>
                <Input
                  id="title"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Átirat címe..."
                  className="glass-card border-primary/30 focus:border-primary focus:ring-primary/30"
                />
              </div>
              
              <motion.div 
                className="glass-card p-4 space-y-2 border border-primary/20"
                whileHover={{ borderColor: "hsl(var(--primary) / 0.4)" }}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Szavak száma:</span>
                  <span className="text-transcript-cyan font-mono">
                    {wordCount + (currentInterim ? currentInterim.split(' ').filter(w => w.length > 0).length : 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Időtartam:</span>
                  <span className="text-neon-gold font-mono">
                    {formatDuration(sessionDuration)}
                  </span>
                </div>
              </motion.div>
            </div>

            <DialogFooter className="gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  variant="outline" 
                  onClick={discardTranscript}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  Elvetés
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={saveTranscript} 
                  className="bg-gradient-primary hover:shadow-neon flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Mentés
                </Button>
              </motion.div>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpeechTranscriber;