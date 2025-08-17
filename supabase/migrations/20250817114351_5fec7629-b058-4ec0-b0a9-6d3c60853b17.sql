-- Create transcripts table for Hungarian speech transcription app
CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Mentett átirat',
  content TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security with public access policies
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (as specified in requirements)
CREATE POLICY "Anyone can view transcripts" ON public.transcripts 
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create transcripts" ON public.transcripts 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update transcripts" ON public.transcripts 
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete transcripts" ON public.transcripts 
  FOR DELETE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_transcripts_updated_at
  BEFORE UPDATE ON public.transcripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();