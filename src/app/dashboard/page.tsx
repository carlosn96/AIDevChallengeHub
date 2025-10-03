'use client';

import ScheduleDashboard from '@/components/schedule-dashboard';
import StudentDashboard from '@/components/student-dashboard';
import { useSettings } from '@/context/settings-context';
import { LoadingScreen } from '@/components/loading-screen';

export default function DashboardPage() {
  const { user, role, isLoading } = useSettings();

  if (isLoading || !user || !role) {
    return <LoadingScreen />;
  }

  // Render the appropriate dashboard based on the user's role
  if (role === 'Alumno') {
    return <StudentDashboard />;
  }
  
  if (role === 'Docente' || role === 'Administrativo') {
    return (
      <div className="w-full">
        <ScheduleDashboard />
      </div>
    );
  }

  // Fallback for any other case or if role is null
  return (
    <div>
      <h1 className="text-2xl font-bold">Acceso no configurado</h1>
      <p>Tu rol no tiene una vista de dashboard configurada. Por favor, contacta a un administrador.</p>
    </div>
  );
}
