import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { User, Lock, Bell, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();

  const profileForm = useForm({ defaultValues: { username: user?.username || '' } });
  const passwordForm = useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();

  const profileMutation = useMutation({
    mutationFn: (data: { username: string }) => api.put('/auth/profile', data),
    onSuccess: (res) => {
      setUser(res.data.data);
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      passwordForm.reset();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to change password';
      toast.error(msg);
    },
  });

  const onPasswordSubmit = (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    passwordMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-sm text-slate-400 mt-0.5">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-brand-400" />
          Profile
        </h3>
        <form onSubmit={profileForm.handleSubmit((d) => profileMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input value={user?.email || ''} disabled className="input opacity-50 cursor-not-allowed" />
            <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="label">Username</label>
            <input {...profileForm.register('username')} className="input" />
          </div>
          <div>
            <label className="label">Role</label>
            <input value={user?.role || ''} disabled className="input opacity-50 cursor-not-allowed capitalize" />
          </div>
          <button
            type="submit"
            disabled={profileMutation.isPending}
            className="btn-primary"
          >
            {profileMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-400" />
          Change Password
        </h3>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              {...passwordForm.register('currentPassword', { required: true })}
              type="password"
              className="input"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              {...passwordForm.register('newPassword', { required: true, minLength: 8 })}
              type="password"
              className="input"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              {...passwordForm.register('confirmPassword', { required: true })}
              type="password"
              className="input"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={passwordMutation.isPending}
            className="btn-primary"
          >
            {passwordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Change Password
          </button>
        </form>
      </div>

      {/* Notifications placeholder */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand-400" />
          Notifications
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Deployment success', desc: 'Notify when a deployment completes' },
            { label: 'Deployment failure', desc: 'Notify when a deployment fails' },
            { label: 'Function errors', desc: 'Notify on high error rates' },
          ].map((item) => (
            <label key={item.label} className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-sm font-medium text-slate-200">{item.label}</div>
                <div className="text-xs text-slate-500">{item.desc}</div>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-600" />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
