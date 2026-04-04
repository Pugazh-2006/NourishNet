import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { useAppState } from '../state/AppState';
import type { UserRole } from '../types';

const demoAccounts = [
  { role: 'donor' as const, email: 'donor@nourishnet.local', password: 'password123' },
  { role: 'ngo' as const, email: 'ngo@nourishnet.local', password: 'password123' },
  { role: 'volunteer' as const, email: 'volunteer@nourishnet.local', password: 'password123' },
];

function workspacePath(role: UserRole) {
  if (role === 'donor') return '/donor-dashboard';
  if (role === 'ngo') return '/ngo-food-list';
  return '/volunteer-pickup';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAppState();
  const [formData, setFormData] = useState({
    email: demoAccounts[0].email,
    password: demoAccounts[0].password,
  });

  const redirectTarget = (location.state as { from?: string } | null)?.from;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const user = await login(formData.email, formData.password);
      toast.success(`Signed in as ${user.role}.`);
      navigate(redirectTarget || workspacePath(user.role), { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign in');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl shadow-xl border-0">
        <CardHeader className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-green-600 text-white flex items-center justify-center font-bold">
            NN
          </div>
          <CardTitle className="text-3xl">Sign in to NourishNet</CardTitle>
          <CardDescription>
            Use one of the seeded demo accounts below to test the shared donor, NGO, and volunteer workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {demoAccounts.map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => setFormData({ email: account.email, password: account.password })}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-green-400 hover:bg-green-50"
              >
                <div className="font-semibold capitalize text-gray-900">{account.role}</div>
                <div className="text-xs text-gray-600 mt-1">{account.email}</div>
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 space-y-2">
            <div>Demo password for all three accounts: <span className="font-semibold">password123</span></div>
            <div>If login says it cannot reach the API, start the backend with <span className="font-semibold">npm run server</span>.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
