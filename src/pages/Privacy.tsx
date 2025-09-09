import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Trash2, AlertTriangle, ExternalLink, Shield, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { exportUserData, deleteAllUserData, deleteUserAccount, downloadUserData } from '@/lib/privacy';
import { useAuth } from '@/hooks/useAuth';

export default function Privacy() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleExportData = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to export your data.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const data = await exportUserData();
      if (data) {
        downloadUserData(data);
        toast({
          title: "Data Exported",
          description: "Your data has been downloaded as a JSON file.",
        });
      } else {
        throw new Error('Failed to export data');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteData = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to delete your data.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteAllUserData();
      if (success) {
        toast({
          title: "Data Deleted",
          description: "All your transcripts have been permanently deleted.",
        });
      } else {
        throw new Error('Failed to delete data');
      }
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: "There was an error deleting your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to delete your account.",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingAccount(true);
    try {
      const success = await deleteUserAccount();
      if (success) {
        toast({
          title: "Account Data Deleted",
          description: "Your account data has been deleted. Please contact support to complete account removal.",
        });
        // Navigate to auth page after successful deletion
        navigate('/auth');
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      toast({
        title: "Account Deletion Failed",
        description: "There was an error deleting your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!user) {
    return (
      <div className="relative min-h-[100dvh]">
        <div className="pointer-events-none absolute inset-0 bg-animated-purple opacity-75" />
        <div className="relative mx-auto max-w-4xl px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-purple-100">Privacy & Data</h1>
          </div>
          
          <Card className="border border-white/20 bg-white/10 dark:bg-black/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-purple-100">Authentication Required</CardTitle>
              <CardDescription className="text-neutral-300">
                Please sign in to access privacy settings and manage your data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh]">
      <div className="pointer-events-none absolute inset-0 bg-animated-purple opacity-75" />
      <div className="relative mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-purple-100">Privacy & Data</h1>
        </div>

        <div className="space-y-6">
          {/* Privacy Policy & Information */}
          <Card className="border border-white/20 bg-white/10 dark:bg-black/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-100">
                <Shield className="w-5 h-5" />
                Privacy Information
              </CardTitle>
              <CardDescription className="text-neutral-300">
                Learn how EyeHear handles your data and privacy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm text-neutral-200">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                  <div>
                    <strong>Speech Recognition:</strong> EyeHear uses Apple's speech recognition service. 
                    Your audio may be sent to Apple's servers for processing. This follows Apple's privacy policy.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                  <div>
                    <strong>Data Storage:</strong> Your transcripts and profile are securely stored in our database. 
                    You control your data and can export or delete it at any time.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                  <div>
                    <strong>No Tracking:</strong> EyeHear does not track you across other apps or websites 
                    for advertising purposes.
                  </div>
                </div>
              </div>
              
              <Button variant="outline" className="w-full" asChild>
                <a 
                  href="https://example.com/privacy-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Full Privacy Policy
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="border border-white/20 bg-white/10 dark:bg-black/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-purple-100">Your Data</CardTitle>
              <CardDescription className="text-neutral-300">
                Export or delete your personal data stored in EyeHear.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Export Data */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                <div>
                  <h3 className="font-medium text-purple-100">Export My Data</h3>
                  <p className="text-sm text-neutral-300">
                    Download all your transcripts and profile data as a JSON file.
                  </p>
                </div>
                <Button 
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>

              {/* Delete Data */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                <div>
                  <h3 className="font-medium text-purple-100">Delete My Transcripts</h3>
                  <p className="text-sm text-neutral-300">
                    Permanently delete all your saved transcripts. This cannot be undone.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All Transcripts</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all your saved transcripts.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteData}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete All Transcripts'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Delete Account */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                <div>
                  <h3 className="font-medium text-red-300">Delete My Account</h3>
                  <p className="text-sm text-neutral-300">
                    Permanently delete your account and all associated data.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Account</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account, 
                        profile, and all transcripts. You may need to contact support to complete the process.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Support */}
          <Card className="border border-white/20 bg-white/10 dark:bg-black/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-purple-100">Support & Contact</CardTitle>
              <CardDescription className="text-neutral-300">
                Need help with privacy or data questions?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <a 
                  href="mailto:support@eyehear.app" 
                  className="flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Contact Support
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}