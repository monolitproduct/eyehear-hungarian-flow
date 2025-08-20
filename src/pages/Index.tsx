import SpeechTranscriber from '@/components/SpeechTranscriber';
import ProtectedRoute from '@/components/ProtectedRoute';

const Index = () => {
  return (
    <ProtectedRoute>
      <SpeechTranscriber />
    </ProtectedRoute>
  );
};

export default Index;
