import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Trash2, Calendar, Clock, Hash, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// TypeScript interface for transcript data
interface Transcript {
  id: string;
  title: string;
  content: string;
  word_count: number;
  duration_seconds: number;
  recorded_at: string;
  created_at: string;
}

interface SavedTranscriptsProps {
  onBack: () => void;
}

const SavedTranscripts: React.FC<SavedTranscriptsProps> = ({ onBack }) => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [transcriptToDelete, setTranscriptToDelete] = useState<Transcript | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  // Load saved transcripts from database
  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    if (!user) {
      toast({
        title: "Bejelentkezés szükséges",
        description: "Jelentkezzen be a mentett átiratok megtekintéséhez",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      setTranscripts(data || []);
    } catch (error) {
      console.error('Error loading transcripts:', error);
      toast({
        title: "Betöltési hiba",
        description: "Nem sikerült betölteni a mentett átiratokat.",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete transcript
  const deleteTranscript = async (transcript: Transcript) => {
    try {
      const { error } = await supabase
        .from('transcripts')
        .delete()
        .eq('id', transcript.id);

      if (error) throw error;

      setTranscripts(prev => prev.filter(t => t.id !== transcript.id));
      setShowDeleteDialog(false);
      setTranscriptToDelete(null);

      toast({
        title: "Átirat törölve",
        description: "Az átirat sikeresen törölve lett.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error deleting transcript:', error);
      toast({
        title: "Törlési hiba",
        description: "Nem sikerült törölni az átiratot.",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format transcript text into 4-word chunks for preview
  const formatTranscriptPreview = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Format transcript text into 4-word chunks for full display
  const formatTranscriptText = (text: string) => {
    const words = text.split(' ').filter(word => word.length > 0);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += 4) {
      chunks.push(words.slice(i, i + 4).join(' '));
    }
    
    return chunks;
  };

  // Handle transcript deletion confirmation
  const handleDeleteClick = (transcript: Transcript) => {
    setTranscriptToDelete(transcript);
    setShowDeleteDialog(true);
  };

  // Render detailed view of selected transcript
  if (selectedTranscript) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="header-gradient border-b border-border p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTranscript(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Vissza a listához
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteClick(selectedTranscript)}
            className="glass-card border-destructive/30 hover:border-destructive text-destructive hover:text-destructive transition-all duration-300 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Törlés
          </Button>
        </div>
        </header>

        {/* Transcript content */}
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Hash className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Szavak száma</p>
                    <p className="text-lg font-semibold">{selectedTranscript.word_count}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Időtartam</p>
                    <p className="text-lg font-semibold">{formatDuration(selectedTranscript.duration_seconds)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Rögzítés dátuma</p>
                    <p className="text-lg font-semibold">
                      {new Date(selectedTranscript.recorded_at).toLocaleDateString('hu-HU', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).replace(/\//g, '. ').replace(',', '')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Full transcript */}
            <Card>
              <CardHeader>
                <CardTitle>Teljes átirat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formatTranscriptText(selectedTranscript.content).map((chunk, index) => (
                    <div key={index} className="transcript-vibrant">
                      {chunk}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Render list view
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="header-gradient border-b border-border p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              EyeHear főoldal
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mentett átiratok</h1>
              <p className="text-sm text-muted-foreground">
                {transcripts.length} mentett átirat
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Átiratok betöltése...</p>
              </div>
            </div>
          ) : transcripts.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Eye className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Nincsenek mentett átiratok</h2>
                <p className="text-muted-foreground mb-4">
                  Kezdjen el beszélni és mentse el az első átiratát!
                </p>
                <Button onClick={onBack}>
                  Visszatérés a főoldalra
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {transcripts.map((transcript) => (
                <Card key={transcript.id} className="hover:shadow-md smooth-transition cursor-pointer" onClick={() => setSelectedTranscript(transcript)}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold pr-2 flex-1 min-w-0 break-words">{transcript.title}</h3>
                        
                        {/* Delete button only */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(transcript);
                            }}
                            className="glass-card border-destructive/30 hover:border-destructive text-destructive hover:text-destructive transition-all duration-300 flex items-center justify-center p-1 h-auto w-8"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Stats row - mobile responsive */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span className="truncate">{formatDate(transcript.recorded_at)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {transcript.word_count} szó
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(transcript.duration_seconds)}
                        </span>
                      </div>

                      {/* Preview text */}
                      <p className="text-muted-foreground text-sm break-words">
                        {formatTranscriptPreview(transcript.content)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Átirat törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretné ezt az átiratot? Ez a művelet nem vonható vissza.
            </DialogDescription>
          </DialogHeader>
          
          {transcriptToDelete && (
            <div className="space-y-2">
              <h4 className="font-semibold">{transcriptToDelete.title}</h4>
              <p className="text-sm text-muted-foreground">
                {transcriptToDelete.word_count} szó • {formatDuration(transcriptToDelete.duration_seconds)} • 
                {formatDate(transcriptToDelete.recorded_at)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Mégse
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => transcriptToDelete && deleteTranscript(transcriptToDelete)}
            >
              Törlés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SavedTranscripts;