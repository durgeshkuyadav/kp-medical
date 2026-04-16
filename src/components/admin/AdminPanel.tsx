import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Key, Users, Database } from 'lucide-react';
import { ManagerManagement } from './ManagerManagement';
import { DataGenerator } from './DataGenerator';

export function AdminPanel() {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { changePassword, profile, isAdmin } = useAuth();

  if (!isAdmin) {
    return <div className="text-muted-foreground">You are not authorized to view this section.</div>;
  }
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setIsChangePasswordOpen(false);
    } catch (error) {
      // Error handled in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <p className="text-muted-foreground">Welcome, {profile?.full_name}</p>
      </div>

      <Tabs defaultValue="managers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="managers">
            <Users className="w-4 h-4 mr-2" />
            Manager Management
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Key className="w-4 h-4 mr-2" />
            Admin Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="managers" className="space-y-4">
          <ManagerManagement />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Password Management
              </CardTitle>
              <CardDescription>
                Change your admin password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Change My Password
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Enter your new password
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Changing...' : 'Change Password'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}