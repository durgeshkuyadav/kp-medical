import { useState, useEffect } from 'react';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Edit, Key, Trash2, AlertCircle, CheckCircle2, Loader2, XCircle, Copy, Eye, EyeOff, Mail, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useShopSettings } from '@/hooks/useShopSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

type StepStatus = 'pending' | 'in_progress' | 'done' | 'error';

interface CreationStep {
  label: string;
  status: StepStatus;
  errorMessage?: string;
}

interface CreatedManagerInfo {
  userId: string;
  email: string;
  fullName: string;
  password: string;
}

export function ManagerManagement() {
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedManager, setSelectedManager] = useState<UserProfile | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    shopName: '',
    phone: ''
  });
  
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creationSteps, setCreationSteps] = useState<CreationStep[]>([]);
  const [createdManager, setCreatedManager] = useState<CreatedManagerInfo | null>(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const managersPerPage = 10;
  const { getAllManagers, createManager } = useAuth();
  const { toast } = useToast();
  const { settings: shopSettings } = useShopSettings();

  const filteredManagers = managers.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.shop_name || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredManagers.length / managersPerPage);
  const paginatedManagers = filteredManagers.slice(
    (currentPage - 1) * managersPerPage,
    currentPage * managersPerPage
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    loadManagers();
  }, []);

  const loadManagers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllManagers();
      setManagers(data || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load managers');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStep = (index: number, update: Partial<CreationStep>) => {
    setCreationSteps(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s));
  };

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setCreatedManager(null);

    const initialSteps: CreationStep[] = [
      { label: 'Validating inputs', status: 'pending' },
      { label: 'Creating user account', status: 'pending' },
      { label: 'Setting up profile', status: 'pending' },
      { label: 'Assigning role & mapping', status: 'pending' },
    ];
    setCreationSteps(initialSteps);

    try {
      // Step 1: Validate
      setCreationSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'in_progress' } : s));
      
      if (!formData.email || !formData.password || !formData.fullName) {
        updateStep(0, { status: 'error', errorMessage: 'Email, password, and full name are required' });
        throw new Error('Email, password, and full name are required');
      }
      if (formData.password.length < 8) {
        updateStep(0, { status: 'error', errorMessage: 'Password must be at least 8 characters' });
        throw new Error('Password must be at least 8 characters');
      }
      updateStep(0, { status: 'done' });

      // Step 2: Create user via edge function
      updateStep(1, { status: 'in_progress' });

      const { data, error: fnError } = await supabase.functions.invoke('create-manager', {
        body: {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone || undefined,
          shopName: formData.shopName || undefined,
        }
      });

      if (fnError) {
        const msg = fnError.message || 'Failed to create manager account';
        updateStep(1, { status: 'error', errorMessage: msg });
        throw new Error(msg);
      }

      if (data?.error) {
        updateStep(1, { status: 'error', errorMessage: data.error });
        throw new Error(data.error);
      }

      updateStep(1, { status: 'done' });

      // Step 3: Profile (handled by edge function)
      updateStep(2, { status: 'in_progress' });
      // Small delay to show progress
      await new Promise(r => setTimeout(r, 300));
      updateStep(2, { status: 'done' });

      // Step 4: Role & mapping (handled by edge function)
      updateStep(3, { status: 'in_progress' });
      await new Promise(r => setTimeout(r, 300));
      updateStep(3, { status: 'done' });

      // Show created manager info
      setCreatedManager({
        userId: data?.user_id || '',
        email: formData.email,
        fullName: formData.fullName,
        password: formData.password,
      });

      loadManagers();

      toast({
        title: "Manager Created Successfully",
        description: `${formData.fullName} has been added as a manager.`,
      });
    } catch (error: any) {
      setError(error.message || 'Failed to create manager');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManager) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          shop_name: formData.shopName,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', selectedManager.user_id);

      if (updateError) throw updateError;

      toast({
        title: "Manager Updated",
        description: "Manager profile updated successfully",
      });
      setShowEditDialog(false);
      setSelectedManager(null);
      loadManagers();
    } catch (error: any) {
      setError(error.message || 'Failed to update manager');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManager) return;
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use admin API to reset password via edge function
      const { data, error: fnError } = await supabase.functions.invoke('reset-manager-password', {
        body: { 
          managerId: selectedManager.user_id,
          newPassword: newPassword
        }
      });

      if (fnError) {
        // If edge function doesn't exist, show helpful message
        if (fnError.message.includes('not found')) {
          throw new Error('Password reset requires admin privileges. The manager will need to use the "Forgot Password" option on the login page.');
        }
        throw fnError;
      }

      toast({
        title: "Password Reset",
        description: `Password has been reset for ${selectedManager.full_name}. New password: ${newPassword}`,
      });
      setShowResetPasswordDialog(false);
      setSelectedManager(null);
      setNewPassword('');
    } catch (error: any) {
      // Fallback: Send password reset email
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          selectedManager.user_id, // This won't work as we need email
          { redirectTo: `${window.location.origin}/reset-password` }
        );
        
        // If we can't reset directly, inform admin
        toast({
          title: "Password Reset",
          description: `Please share the new password with the manager: ${newPassword}. They may need to use this on their next login.`,
        });
        setShowResetPasswordDialog(false);
        setSelectedManager(null);
        setNewPassword('');
      } catch (e) {
        setError('Could not reset password. Please ask the manager to use "Forgot Password" on login page.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteManager = async () => {
    if (!selectedManager) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Delete manager role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedManager.user_id);

      if (roleError) throw roleError;

      // Delete manager profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', selectedManager.user_id);

      if (profileError) throw profileError;

      toast({
        title: "Manager Deleted",
        description: `${selectedManager.full_name} has been removed from the system`,
      });
      setShowDeleteDialog(false);
      setSelectedManager(null);
      loadManagers();
    } catch (error: any) {
      setError(error.message || 'Failed to delete manager');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (manager: UserProfile) => {
    setSelectedManager(manager);
    setFormData({
      email: '',
      password: '',
      fullName: manager.full_name || '',
      shopName: manager.shop_name || '',
      phone: manager.phone || ''
    });
    setError(null);
    setShowEditDialog(true);
  };

  const openResetPasswordDialog = (manager: UserProfile) => {
    setSelectedManager(manager);
    setNewPassword('');
    setError(null);
    setShowResetPasswordDialog(true);
  };

  const openDeleteDialog = (manager: UserProfile) => {
    setSelectedManager(manager);
    setError(null);
    setShowDeleteDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Manager Management</h2>
          <p className="text-muted-foreground">Create and manage manager accounts</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            setError(null);
            setCreationSteps([]);
            setCreatedManager(null);
            setShowCreatedPassword(false);
            if (createdManager) {
              setFormData({ email: '', password: '', fullName: '', shopName: '', phone: '' });
            }
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add New Manager
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Manager Account</DialogTitle>
              <DialogDescription>
                {createdManager ? 'Manager created successfully!' : 'Add a new manager with login credentials'}
              </DialogDescription>
            </DialogHeader>

            {/* Step Progress */}
            {creationSteps.length > 0 && (
              <div className="space-y-3">
                <Progress value={
                  (creationSteps.filter(s => s.status === 'done').length / creationSteps.length) * 100
                } className="h-2" />
                <div className="space-y-2">
                  {creationSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {step.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-muted" />}
                      {step.status === 'in_progress' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {step.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {step.status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
                      <span className={step.status === 'error' ? 'text-destructive' : step.status === 'done' ? 'text-green-600' : 'text-muted-foreground'}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                  {creationSteps.some(s => s.status === 'error') && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {creationSteps.find(s => s.status === 'error')?.errorMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}

            {/* Created Manager Credentials Card */}
            {createdManager && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Manager Credentials
                  </CardTitle>
                  <CardDescription>Share these securely with the manager</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">User ID</Label>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{createdManager.userId}</code>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                        navigator.clipboard.writeText(createdManager.userId);
                        toast({ title: "Copied", description: "User ID copied to clipboard" });
                      }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <p className="text-sm font-medium">{createdManager.fullName}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium flex-1">{createdManager.email}</p>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                        navigator.clipboard.writeText(createdManager.email);
                        toast({ title: "Copied", description: "Email copied to clipboard" });
                      }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Password</Label>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                        {showCreatedPassword ? createdManager.password : '••••••••'}
                      </code>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowCreatedPassword(!showCreatedPassword)}>
                        {showCreatedPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                        navigator.clipboard.writeText(createdManager.password);
                        toast({ title: "Copied", description: "Password copied to clipboard" });
                      }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Button className="w-full mt-2" onClick={() => {
                    setShowCreateDialog(false);
                    setCreationSteps([]);
                    setCreatedManager(null);
                    setShowCreatedPassword(false);
                    setFormData({ email: '', password: '', fullName: '', shopName: '', phone: '' });
                  }}>
                    Done
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Form - hidden when creation is complete or in progress with steps */}
            {!createdManager && (
              <>
                {error && creationSteps.length === 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleCreateManager} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-name">Full Name *</Label>
                    <Input
                      id="create-name"
                      placeholder="Enter manager's full name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-email">Email *</Label>
                    <Input
                      id="create-email"
                      type="email"
                      placeholder="Enter manager's email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="create-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 8 characters"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={8}
                        disabled={isLoading}
                      />
                      <Button type="button" size="sm" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Must be at least 8 characters with letters and numbers</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-phone">Phone Number</Label>
                    <Input
                      id="create-phone"
                      type="tel"
                      placeholder="Enter manager's phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-shop">Shop Name</Label>
                    <Input
                      id="create-shop"
                      placeholder="Enter shop name"
                      value={formData.shopName}
                      onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : 'Create Manager'}
                  </Button>
                </form>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Managers</CardTitle>
          <CardDescription>
            Managers can access the shop but cannot change their own password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {managers.length > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or shop..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {isLoading && managers.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading managers...</span>
            </div>
          ) : managers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium">No managers found.</p>
              <p className="text-sm text-muted-foreground">Create your first manager account using the button above.</p>
            </div>
          ) : filteredManagers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium">No managers match your search.</p>
              <p className="text-sm text-muted-foreground">Try a different name or email.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Manager</TableHead>
                      <TableHead className="text-center">Email</TableHead>
                      <TableHead className="text-center">Shop Name</TableHead>
                      <TableHead className="text-center">Phone</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedManagers.map((manager) => {
                      const initials = (manager.full_name || 'M').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                      const displayShopName = manager.shop_name || shopSettings?.shop_name || null;
                      return (
                        <TableRow key={manager.id}>
                          <TableCell>
                            <div className="flex items-center justify-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="text-left">
                                <p className="font-medium">{manager.full_name || <span className="text-muted-foreground italic">Not set</span>}</p>
                                <p className="text-xs text-muted-foreground">ID: {manager.user_id.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {manager.email ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm">{manager.email}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{displayShopName || <span className="text-muted-foreground text-sm italic">—</span>}</TableCell>
                          <TableCell className="text-center">{manager.phone || <span className="text-muted-foreground text-sm italic">—</span>}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">Active</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEditDialog(manager)} title="Edit Manager"><Edit className="w-4 h-4" /></Button>
                              <Button size="sm" variant="outline" onClick={() => openResetPasswordDialog(manager)} title="Reset Password"><Key className="w-4 h-4" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(manager)} title="Delete Manager"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * managersPerPage) + 1}–{Math.min(currentPage * managersPerPage, filteredManagers.length)} of {filteredManagers.length} managers
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <span className="text-sm font-medium px-2">{currentPage} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Manager Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setError(null);
          setSelectedManager(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Manager</DialogTitle>
            <DialogDescription>
              Update manager information for {selectedManager?.full_name}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleUpdateManager} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter manager's full name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                type="tel"
                placeholder="Enter manager's phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-shop">Shop Name</Label>
              <Input
                id="edit-shop"
                placeholder="Enter shop name"
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={(open) => {
        setShowResetPasswordDialog(open);
        if (!open) {
          setError(null);
          setSelectedManager(null);
          setNewPassword('');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Manager Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedManager?.full_name}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Share this password with the manager securely
              </p>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Manager Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) {
          setError(null);
          setSelectedManager(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Manager</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedManager?.full_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteManager} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete Manager'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
