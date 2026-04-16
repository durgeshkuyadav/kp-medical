import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';
import { z } from 'zod';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  shop_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

// Input validation schemas
const emailSchema = z.string().email().max(255);
const passwordSchema = z.string().min(8).max(100);
const nameSchema = z.string().trim().min(1).max(100);
const phoneSchema = z.string().trim().min(10).max(20);

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch user profile from profiles table
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Fetch user roles from the secure user_roles table
  const fetchUserRoles = async (userId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return (data || []).map(r => r.role);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        const roles = await fetchUserRoles(session.user.id);
        setProfile(profile);
        setUserRoles(roles);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer async operations to prevent deadlock
        setTimeout(() => {
          fetchUserProfile(session.user.id).then(setProfile);
          fetchUserRoles(session.user.id).then(setUserRoles);
        }, 0);
      } else {
        setProfile(null);
        setUserRoles([]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Server-verified admin check
  const verifyAdmin = async (): Promise<boolean> => {
    try {
      const currentUserId = user?.id;
      if (!currentUserId) return false;
      const { data, error } = await supabase.rpc('has_role', { _user_id: currentUserId, _role: 'admin' });
      if (error) {
        console.error('has_role rpc error:', error);
        return userRoles.includes('admin');
      }
      return Boolean(data);
    } catch (e) {
      console.error('verifyAdmin error:', e);
      return userRoles.includes('admin');
    }
  };

  const ensureAdminOrThrow = async () => {
    const ok = await verifyAdmin();
    if (!ok) throw new Error('User not allowed');
  };

  const signIn = async (email: string, password: string) => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Signed in successfully",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Signed out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const registerAdmin = async (
    email: string, 
    password: string, 
    fullName: string, 
    phone: string,
    shopName?: string,
    shopAddress?: string,
    drugLicenseNumber?: string,
    gstNumber?: string
  ) => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      nameSchema.parse(fullName);
      if (phone) phoneSchema.parse(phone);

      const { data: fnData, error: fnError } = await supabase.functions.invoke('register-admin', {
        body: { email, password, fullName, phone, shopName, shopAddress, drugLicenseNumber, gstNumber }
      });

      if (fnError) {
        let serverMsg = '';
        try {
          if (fnError.context && typeof fnError.context.json === 'function') {
            const body = await fnError.context.json();
            serverMsg = body?.error || '';
          }
        } catch { /* ignore */ }
        if (!serverMsg && fnData && typeof fnData === 'object' && 'error' in fnData) {
          serverMsg = (fnData as any).error;
        }
        throw new Error(serverMsg || fnError.message || 'Registration failed');
      }

      if (fnData && typeof fnData === 'object' && 'error' in fnData) {
        throw new Error((fnData as any).error);
      }

      toast({
        title: "Registration Submitted",
        description: "Your admin registration is pending approval. Please check your email for verification.",
      });

      return { success: true };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const createManager = async (email: string, password: string, fullName: string, shopName: string, phone: string) => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      nameSchema.parse(fullName);
      if (phone) phoneSchema.parse(phone);

      await ensureAdminOrThrow();

      const { data: fnData, error: fnError } = await supabase.functions.invoke('create-manager', {
        body: { email, password, fullName, shopName, phone }
      });

      if (fnError) {
        // Try to extract the error message from the response body
        let serverMsg = '';
        try {
          if (fnError.context && typeof fnError.context.json === 'function') {
            const body = await fnError.context.json();
            serverMsg = body?.error || '';
          }
        } catch {
          // ignore parse errors
        }
        if (!serverMsg && fnData && typeof fnData === 'object' && 'error' in fnData) {
          serverMsg = (fnData as any).error;
        }
        throw new Error(serverMsg || fnError.message || 'Failed to create manager');
      }

      if (fnData && typeof fnData === 'object' && 'error' in fnData) {
        throw new Error((fnData as any).error);
      }

      const managerId = 'MGR' + Math.floor(1000 + Math.random() * 9000);
      
      toast({
        title: "Success",
        description: `Manager account created with ID: ${managerId}`,
      });

      return managerId;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const getAllManagers = async (): Promise<UserProfile[]> => {
    try {
      const currentUserId = user?.id;
      if (!currentUserId) return [];

      // Get managers mapped to this admin
      const { data: mappings, error: mapError } = await supabase
        .from('manager_admin_mapping')
        .select('manager_id')
        .eq('admin_id', currentUserId);

      if (mapError) throw mapError;
      if (!mappings || mappings.length === 0) return [];

      const managerIds = mappings.map(m => m.manager_id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', managerIds);

      if (error) throw error;

      return (data || []) as UserProfile[];
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const changePassword = async (newPassword: string, currentPassword?: string) => {
    try {
      passwordSchema.parse(newPassword);

      if (!userRoles.includes('admin') && !currentPassword) {
        throw new Error('Managers cannot change passwords directly');
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({
        title: "Success",
        description: "Password changed successfully",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const requestPasswordResetOTP = async (email: string) => {
    try {
      emailSchema.parse(email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast({
        title: "Password Reset Email Sent",
        description: "Please check your email for password reset instructions",
      });
      return true;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  return {
    user,
    profile,
    loading,
    signIn,
    signOut,
    registerAdmin,
    createManager,
    getAllManagers,
    changePassword,
    requestPasswordResetOTP,
    isSuperAdmin: userRoles.includes('super_admin'),
    isAdmin: userRoles.includes('admin'),
    isManager: userRoles.includes('manager'),
    userRoles,
  };
};
