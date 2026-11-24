import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { FactoryProvider } from '@/context/FactoryContext';
import { ToastProvider } from '@/components/Toast';
import { AssignProvider } from '@/components/AssignHost';
import { AppShell } from '@/components/AppShell';
import { WorkerShell } from '@/components/WorkerShell';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { MachineMonitoringPage } from '@/pages/MachineMonitoringPage';
import { BusinessPage } from '@/pages/BusinessPage';
import { WorkOrdersPage } from '@/pages/WorkOrdersPage';
import { TeamManagementPage } from '@/pages/TeamManagementPage';
import { NoticesPage } from '@/pages/NoticesPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { WorkerTasksPage } from '@/pages/WorkerTasksPage';
import type { PageId } from '@/types';

function ManagerAndSupervisorApp() {
  const [page, setPage] = useState<PageId>('overview');
  const [pendingMachineId, setPendingMachineId] = useState<string | undefined>(undefined);

  const navigate = (next: PageId, machineId?: string) => {
    setPendingMachineId(machineId);
    setPage(next);
  };

  return (
    <AssignProvider>
      <AppShell current={page} onNavigate={navigate}>
        {page === 'overview' && <OverviewPage onNavigate={navigate} />}
        {page === 'machines' && (
          <MachineMonitoringPage initialMachineId={pendingMachineId} onNavigate={navigate} />
        )}
        {page === 'business' && <BusinessPage />}
        {page === 'workorders' && <WorkOrdersPage />}
        {page === 'inventory' && <InventoryPage />}
        {page === 'team' && <TeamManagementPage />}
        {page === 'notices' && <NoticesPage onNavigate={navigate} />}
      </AppShell>
    </AssignProvider>
  );
}

function RoleRouter() {
  const { session } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'supervisor' | 'worker' | null>(null);

  // If user is not authenticated:
  if (!session) {
    if (!selectedRole) {
      // Landing Page (Image 1)
      return <LandingPage onSelectRole={(role) => setSelectedRole(role)} />;
    }
    // Dedicated Login Page for the chosen role (Image 2)
    return (
      <LoginPage
        initialRole={selectedRole}
        onBack={() => setSelectedRole(null)}
      />
    );
  }

  // If authenticated:
  if (session.role === 'admin' || session.role === 'manager' || session.role === 'supervisor') {
    return <ManagerAndSupervisorApp />;
  }

  return (
    <WorkerShell>
      <WorkerTasksPage />
    </WorkerShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <FactoryProvider>
        <ToastProvider>
          <RoleRouter />
        </ToastProvider>
      </FactoryProvider>
    </AuthProvider>
  );
}

export default App;
