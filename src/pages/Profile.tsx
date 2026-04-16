import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { User, Mail, Phone, Store, Shield, Edit, Save, X, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, isSuperAdmin, isAdmin, isManager, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    shop_name: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        shop_name: profile.shop_name || ''
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          shop_name: formData.shop_name,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    // Managers cannot change their own password - must contact admin
    if (isManager && !isAdmin) {
      toast({
        title: "Not Allowed",
        description: "Managers cannot change their password. Please contact your administrator.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });
      setShowPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    navigate('/admin-auth');
    return null;
  }

  const initials = (formData.full_name || 'U')
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getRoleBadge = () => {
    if (isSuperAdmin) {
      return <Badge variant="secondary" className="bg-violet-500/10 text-violet-600">Super Admin</Badge>;
    }
    if (isAdmin) {
      return <Badge variant="secondary" className="bg-primary/10 text-primary">Admin</Badge>;
    }
    if (isManager) {
      return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">Manager</Badge>;
    }
    return <Badge variant="secondary">User</Badge>;
  };

  // If Super Admin, show a different layout
  if (isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl bg-violet-500/10 text-violet-600">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{formData.full_name || 'Super Admin'}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </CardDescription>
                  <div className="mt-2">{getRoleBadge()}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Separator />
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Role</p>
                    <p className="text-sm text-muted-foreground">Super Administrator</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/super-admin')}>
                  Back to Dashboard
                </Button>
                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Key className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your new password below
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <Input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleChangePassword} disabled={isSaving} className="w-full">
                        {isSaving ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">View and manage your profile information</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{formData.full_name || 'User'}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </CardDescription>
                  <div className="mt-2">{getRoleBadge()}</div>
                </div>
              </div>
              {!isEditing ? (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />
            
            {isEditing ? (
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop_name">Shop Name</Label>
                  <Input
                    id="shop_name"
                    value={formData.shop_name}
                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Full Name</p>
                    <p className="text-sm text-muted-foreground">{formData.full_name || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Phone Number</p>
                    <p className="text-sm text-muted-foreground">{formData.phone || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Shop Name</p>
                    <p className="text-sm text-muted-foreground">{formData.shop_name || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Role</p>
                    <p className="text-sm text-muted-foreground">
                      {isAdmin ? 'Administrator' : isManager ? 'Manager' : 'User'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Password Section */}
            <div>
              <h3 className="font-medium mb-3">Security</h3>
              {isManager && !isAdmin ? (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    As a manager, you cannot change your password directly. 
                    Please contact your administrator to reset your password.
                  </p>
                </div>
              ) : (
                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Key className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your new password below
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <Input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleChangePassword} disabled={isSaving} className="w-full">
                        {isSaving ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Profile;
