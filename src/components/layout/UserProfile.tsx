import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Settings, Shield, User } from 'lucide-react';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function UserProfile() {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const { profile, signOut, isSuperAdmin, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();

  if (!profile) return null;

  const initials = (profile.full_name || 'U')
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase();

  // Display role from secure roles - check super_admin first, then admin, then manager
  const displayedRole = isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : isManager ? 'Manager' : 'User';

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-auto p-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left text-sm">
              <p className="font-medium">{profile.full_name || 'User'}</p>
              <p className="text-muted-foreground">{displayedRole}</p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem onClick={() => setShowAdminPanel(true)} className="cursor-pointer">
              <Shield className="mr-2 h-4 w-4" />
              Admin Panel
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showAdminPanel} onOpenChange={setShowAdminPanel}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Admin Panel</DialogTitle>
          </DialogHeader>
          <AdminPanel />
        </DialogContent>
      </Dialog>
    </>
  );
}
