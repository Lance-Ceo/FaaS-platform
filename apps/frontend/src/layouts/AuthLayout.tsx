import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Zap } from 'lucide-react';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 flex-col justify-between p-12 border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">FaaS Platform</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Deploy serverless functions{' '}
            <span className="text-gradient">at scale</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Build, deploy, and manage serverless functions with a production-grade
            platform powered by OpenFaaS and Docker.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: 'Runtimes', value: '3+' },
              { label: 'Auto-scaling', value: '✓' },
              { label: 'Live Logs', value: '✓' },
              { label: 'API Gateway', value: '✓' },
            ].map((item) => (
              <div key={item.label} className="glass-card p-4">
                <div className="text-2xl font-bold text-brand-400">{item.value}</div>
                <div className="text-sm text-slate-400 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-sm">
          © {new Date().getFullYear()} FaaS Platform. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold">FaaS Platform</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
