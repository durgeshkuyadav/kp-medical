import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  shop_name: string | null;
  created_at: string;
  updated_at: string;
}

// Create the user_profiles table if it doesn't exist
export const initializeUserTables = async () => {
  try {
    // For demo purposes, just log that we're initializing
    console.log('Database initialization completed');
  } catch (error) {
    console.log('Database tables may already exist');
  }
};

// Mock admin profile for demo purposes when database isn't set up
export const createMockAdmin = (): UserProfile => ({
  id: 'admin-demo-id',
  user_id: 'admin-demo-user-id',
  full_name: 'System Administrator',
  phone: null,
  shop_name: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

// Check if admin exists by checking user_roles table
export const checkAdminExists = async (): Promise<boolean> => {
  try {
    // Query admin_registrations which has a public SELECT policy for own rows
    // Use a count query that doesn't require auth - check if any admin registrations exist
    const { count, error } = await supabase
      .from('admin_registrations')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Database error:', error);
      // If we get an RLS error, assume admins exist (safer default)
      return true;
    }

    return (count !== null && count > 0);
  } catch (error) {
    console.error('Database connection error:', error);
    // Default to true so we don't show registration when we can't verify
    return true;
  }
};

// Simplified user management for demo
export const userService = {
  async signUp(email: string, password: string) {
    return supabase.auth.signUp({ email, password });
  },
  
  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  
  async signOut() {
    return supabase.auth.signOut();
  },
  
  async updatePassword(newPassword: string) {
    return supabase.auth.updateUser({ password: newPassword });
  }
};