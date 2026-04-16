import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from "@/components/layout/MainLayout";
import { ShopSettingsForm } from "@/components/settings/ShopSettingsForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { ManagerManagement } from '@/components/admin/ManagerManagement';
import { Store, Users, Shield } from 'lucide-react';

const Settings = () => {
  const { user, isAdmin, isManager, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/admin-auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure shop details and manage your account
          </p>
        </div>
        
        {isAdmin ? (
          <Tabs defaultValue="shop" className="space-y-4">
            <TabsList>
              <TabsTrigger value="shop">
                <Store className="h-4 w-4 mr-2" />
                Shop Settings
              </TabsTrigger>
              <TabsTrigger value="managers">
                <Users className="h-4 w-4 mr-2" />
                Manager Management
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shop">
              <ShopSettingsForm />
            </TabsContent>

            <TabsContent value="managers">
              <ManagerManagement />
            </TabsContent>
          </Tabs>
        ) : (
          // For managers - show limited view
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Shop Information
              </CardTitle>
              <CardDescription>
                View shop details (read-only for managers)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShopSettingsForm />
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Settings;
