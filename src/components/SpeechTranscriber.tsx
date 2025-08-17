import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, MicOff, Save, FileText, Clock, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
          description: "Engedélyezze a mikrofonhozzáférést a beállításokban.",
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

  // Start listening function
  const startListening = useCallback(() => {
    if (!isSupported) {
      toast({
        title: "Nem támogatott",
        description: "A böngésző nem támogatja a beszédfelismerést.",
        variant: "destructive",
      });
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
        }]);

      if (error) throw error;

      toast({
        title: "Átirat mentve",
        description: "Az átirat sikeresen mentve lett az adatbázisba.",
      });

      setShowSaveDialog(false);
      setSaveTitle('');
    } catch (error) {
      console.error('Error saving transcript:', error);
      toast({
        title: "Mentési hiba",
        description: "Nem sikerült menteni az átiratot.",
        variant: "destructive",
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="header-gradient border-b border-border p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">EyeHear</h1>
            <p className="text-sm text-muted-foreground">Magyar beszédfelismerés</p>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-4 text-sm">
            {isListening && (
              <>
                <div className="flex items-center gap-1 text-primary">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(sessionDuration)}</span>
                </div>
                <div className="flex items-center gap-1 text-foreground">
                  <Hash className="w-4 h-4" />
                  <span>{wordCount} szó</span>
                </div>
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSavedTranscripts(true)}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Mentett átiratok
            </Button>
          </div>
        </div>
      </header>

      {/* Main transcript area */}
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <Card className="min-h-[60vh] p-6">
            {!isListening && transcript.length === 0 && !currentInterim ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <Mic className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-xl font-semibold mb-2">Kezdjen el beszélni</h2>
                  <p className="text-muted-foreground">
                    Nyomja meg a mikrofon gombot a beszédfelismerés indításához
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Final transcript segments */}
                {transcript.map((segment) => (
                  <div key={segment.id}>
                    {formatTranscriptText(segment.text).map((chunk, index) => (
                      <div key={`${segment.id}-${index}`} className="transcript-vibrant">
                        {chunk}
                      </div>
                    ))}
                  </div>
                ))}
                
                {/* Current interim text */}
                {currentInterim && (
                  <div>
                    {formatTranscriptText(currentInterim).map((chunk, index) => (
                      <div key={`interim-${index}`} className="transcript-vibrant opacity-70">
                        {chunk}
                      </div>
                    ))}
                  </div>
                )}
                
                <div ref={transcriptEndRef} />
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Fixed bottom navigation */}
      <footer className="border-t border-border p-4 bg-background">
        <div className="max-w-4xl mx-auto flex justify-center">
          <Button
            size="lg"
            onClick={isListening ? stopListening : startListening}
            disabled={!isSupported}
            className={`w-16 h-16 rounded-full ${
              isListening 
                ? 'mic-button-active bg-destructive hover:bg-destructive/90' 
                : 'bg-primary hover:bg-primary/90'
            } smooth-transition`}
          >
            {isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </Button>
        </div>
        
        {isListening && (
          <div className="text-center mt-2 text-sm text-muted-foreground">
            Beszéljen a mikrofonba • Maximum {formatDuration(MAX_SESSION_DURATION - sessionDuration)} hátra
          </div>
        )}
      </footer>

      {/* Save dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Átirat mentése</DialogTitle>
            <DialogDescription>
              Adjon címet az átiratnak, vagy hagyja üresen az alapértelmezett címhez.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Cím</Label>
              <Input
                id="title"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="Átirat címe..."
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              Szavak száma: {wordCount + (currentInterim ? currentInterim.split(' ').filter(w => w.length > 0).length : 0)} • 
              Időtartam: {formatDuration(sessionDuration)}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={discardTranscript}>
              Elvetés
            </Button>
            <Button onClick={saveTranscript} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpeechTranscriber;