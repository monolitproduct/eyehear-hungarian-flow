import { supabase } from "@/integrations/supabase/client";

/**
 * Privacy Helper - Data Collection and Management
 * 
 * What we collect:
 * - Email address: For account creation and authentication
 * - User transcripts: Speech-to-text content created by the user
 * - Usage metadata: Timestamps, word counts, duration for app functionality
 * 
 * Where stored:
 * - Device: Temporary audio processing (not persisted)
 * - Supabase: User profiles, transcripts, and metadata
 * - Apple servers: Audio may be sent to Apple for speech recognition processing
 * 
 * Retention:
 * - User controls their data and can export or delete at any time
 * - Account deletion removes all associated data
 * - Apple's speech recognition data follows Apple's privacy policy
 */

export interface PrivacyData {
  profile: {
    id: string;
    email: string | null;
    created_at: string;
    updated_at: string;
  };
  transcripts: Array<{
    id: string;
    title: string;
    content: string;
    recorded_at: string;
    created_at: string;
    word_count: number;
    duration_seconds: number;
  }>;
}

/**
 * Export all user data in JSON format
 */
export async function exportUserData(): Promise<PrivacyData | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    // Get user transcripts
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('id, title, content, recorded_at, created_at, word_count, duration_seconds')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (transcriptsError) {
      console.error('Error fetching transcripts:', transcriptsError);
      throw transcriptsError;
    }

    return {
      profile: {
        id: profile.id,
        email: profile.email,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      },
      transcripts: transcripts || []
    };
  } catch (error) {
    console.error('Error exporting user data:', error);
    return null;
  }
}

/**
 * Delete all user transcripts
 */
export async function deleteAllUserData(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Delete all user transcripts
    const { error: transcriptsError } = await supabase
      .from('transcripts')
      .delete()
      .eq('user_id', user.id);

    if (transcriptsError) {
      console.error('Error deleting transcripts:', transcriptsError);
      throw transcriptsError;
    }

    return true;
  } catch (error) {
    console.error('Error deleting user data:', error);
    return false;
  }
}

/**
 * Delete user account and all associated data
 */
export async function deleteUserAccount(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First delete all user data
    const dataDeleted = await deleteAllUserData();
    if (!dataDeleted) {
      throw new Error('Failed to delete user data');
    }

    // Delete user profile (this will cascade due to RLS policies)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      throw profileError;
    }

    // Note: We cannot delete from auth.users table directly via the client
    // This would typically be handled by an admin function or Supabase dashboard
    console.log('Account data deleted. User should contact support to complete account deletion.');

    return true;
  } catch (error) {
    console.error('Error deleting user account:', error);
    return false;
  }
}

/**
 * Download user data as JSON file
 */
export function downloadUserData(data: PrivacyData, filename = 'my-eyehear-data.json'): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}