import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { setCurrentUser, isLoggedIn } from '@/lib/rbac';
import type { User } from '@/types';

// ── Types for Electron IPC response ──────────────────────────────────────────
interface LoginResponse {
  token: string;
  expiresAt: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    role: string;
    mustChangePassword: boolean;
  };
}

// ── Main Login Page ────────────────────────────────────────────────────────────
export default function Index() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<'login' | 'change-password'>('login');

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // On first load, ensure default admin exists (fresh install only)
  useEffect(() => {
    if (window.api?.initDefaultAdmin) {
      window.api.initDefaultAdmin().catch((err: Error) => {
        console.warn('initDefaultAdmin:', err.message);
      });
    }
  }, []);

  // ── Login handler ────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      if (!window.api?.login) {
        throw new Error('Electron API not available. Run this inside the Electron app.');
      }

      const response: LoginResponse = await window.api.login(username.trim(), password);

      // Build user object for renderer context
      const user: User = {
        id: response.user.id,
        username: response.user.username,
        displayName: response.user.displayName,
        role: response.user.role as any,
        passwordHash: '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store user + token in renderer memory
      setCurrentUser(user, response.token);

      // BUG FIX: Enforce password change before allowing any navigation.
      // Previously the default admin account ('admin123') had no mechanism to
      // force a password change. Now the must_change_password flag from the DB
      // is checked here — the user cannot proceed to dashboard without changing it.
      if (response.user.mustChangePassword) {
        setCurrentPassword(password); // pre-fill for convenience
        setScreen('change-password');
        return;
      }

      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes('INVALID_CREDENTIALS')) {
        setLoginError('Invalid username or password.');
      } else if (msg.includes('Electron API not available')) {
        setLoginError(msg);
      } else {
        setLoginError('Login failed. Please try again.');
        console.error('Login error:', err);
      }
    } finally {
      setLoginLoading(false);
    }
  }

  // ── Change password handler ────────────────────────────────────────────────
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangeError('');

    if (newPassword.length < 8) {
      setChangeError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('Passwords do not match.');
      return;
    }
    if (newPassword === 'admin123' || newPassword === currentPassword) {
      setChangeError('New password must be different from the current password.');
      return;
    }

    setChangeLoading(true);
    try {
      await window.api.changePassword(currentPassword, newPassword);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes('INVALID_CURRENT_PASSWORD')) {
        setChangeError('Current password is incorrect.');
      } else if (msg.includes('PASSWORD_TOO_SHORT')) {
        setChangeError('Password must be at least 8 characters.');
      } else {
        setChangeError('Failed to change password. Please try again.');
        console.error('Change password error:', err);
      }
    } finally {
      setChangeLoading(false);
    }
  }

  // ── Render: Login Screen ──────────────────────────────────────────────────
  if (screen === 'login') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">ElectroBill</CardTitle>
            <CardDescription>Sign in to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={loginLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loginLoading}
                />
              </div>
              {loginError && (
                <Alert variant="destructive">
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: Force Password Change Screen ──────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold">Change Your Password</CardTitle>
          <CardDescription>
            You must set a new password before continuing. This is required on first login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                disabled={changeLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password (min. 8 characters)</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                disabled={changeLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                disabled={changeLoading}
              />
            </div>
            {changeError && (
              <Alert variant="destructive">
                <AlertDescription>{changeError}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={changeLoading}>
              {changeLoading ? 'Saving…' : 'Set New Password & Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
