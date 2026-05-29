import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { wsClient } from '@/lib/websocket';

export default function DashboardLayout() {
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (accessToken) {
      wsClient.connect(accessToken);
    }
    return () => wsClient.disconnect();
  }, [accessToken]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
