import { useAuth } from '@/hooks/useAuth';
import { ManagerManagement } from '@/components/admin/ManagerManagement';
import { MainLayout } from '@/components/layout/MainLayout';
import { Navigate } from 'react-router-dom';

export default function ManagerManagementPage() {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <ManagerManagement />
    </MainLayout>
  );
}
