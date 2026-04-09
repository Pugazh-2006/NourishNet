import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { useAppState } from '../state/AppState';

const demoAccounts = [
  { role: 'donor', email: 'donor@nourishnet.local', password: 'password123' },
  { role: 'ngo', email: 'ngo@nourishnet.local', password: 'password123' },
  { role: 'volunteer', email: 'volunteer@nourishnet.local', password: 'password123' },
];

const initialSignup = {
  role: 'donor',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  organization: '',
};

function workspacePath(role) {
  if (role === 'donor') return '/donor-dashboard';
  if (role === 'ngo') return '/ngo-food-list';
  return '/volunteer-pickup';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, isLoading } = useAppState();
  const [mode, setMode] = useState('signin');
  const [signInData, setSignInData] = useState({
    email: demoAccounts[0].email,
    password: demoAccounts[0].password,
  });
  const [signUpData, setSignUpData] = useState(initialSignup);

  const redirectTarget = location.state?.from;

  const handleSignIn = async (event) => {
    event.preventDefault();
    try {
      const user = await login(signInData.email, signInData.password);
      toast.success(`Signed in as ${user.role}.`);
      navigate(redirectTarget || workspacePath(user.role), { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign in');
    }
  };

  const handleSignUp = async (event) => {
    event.preventDefault();

    try {
      const payload = {
        ...signUpData,
        organization: signUpData.role === 'volunteer' ? '' : signUpData.organization,
      };
      const user = await signup(payload);
      toast.success(`Welcome to NourishNet, ${user.firstName}.`);
      navigate(redirectTarget || workspacePath(user.role), { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create account');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-2xl shadow-xl border-0">
        <CardHeader className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-green-600 text-white flex items-center justify-center font-bold">NN</div>
          <CardTitle className="text-3xl">NourishNet Account Access</CardTitle>
          <CardDescription>
            Sign in with demo users or create a new account for donor, NGO, and volunteer workflows.
          </CardDescription>
          <div className="inline-flex rounded-xl bg-gray-100 p-1 w-full max-w-sm">
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === 'signin' ? 'bg-white shadow' : 'text-gray-600'}`}
              onClick={() => setMode('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === 'signup' ? 'bg-white shadow' : 'text-gray-600'}`}
              onClick={() => setMode('signup')}
            >
              Create Account
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {mode === 'signin' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {demoAccounts.map((account) => (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => setSignInData({ email: account.email, password: account.password })}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-green-400 hover:bg-green-50"
                  >
                    <div className="font-semibold capitalize text-gray-900">{account.role}</div>
                    <div className="text-xs text-gray-600 mt-1">{account.email}</div>
                  </button>
                ))}
              </div>

              <form className="space-y-4" onSubmit={handleSignIn}>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={signInData.email}
                    onChange={(event) => setSignInData((current) => ({ ...current, email: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={signInData.password}
                    onChange={(event) => setSignInData((current) => ({ ...current, password: event.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </>
          ) : (
            <form className="space-y-4" onSubmit={handleSignUp}>
              <div>
                <Label htmlFor="signup-role">Role</Label>
                <select
                  id="signup-role"
                  value={signUpData.role}
                  onChange={(event) => setSignUpData((current) => ({ ...current, role: event.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="donor">Donor</option>
                  <option value="ngo">NGO</option>
                  <option value="volunteer">Volunteer</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signup-first-name">First Name</Label>
                  <Input
                    id="signup-first-name"
                    value={signUpData.firstName}
                    onChange={(event) => setSignUpData((current) => ({ ...current, firstName: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-last-name">Last Name</Label>
                  <Input
                    id="signup-last-name"
                    value={signUpData.lastName}
                    onChange={(event) => setSignUpData((current) => ({ ...current, lastName: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signUpData.email}
                    onChange={(event) => setSignUpData((current) => ({ ...current, email: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    minLength={8}
                    value={signUpData.password}
                    onChange={(event) => setSignUpData((current) => ({ ...current, password: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signup-phone">Phone</Label>
                  <Input
                    id="signup-phone"
                    value={signUpData.phone}
                    onChange={(event) => setSignUpData((current) => ({ ...current, phone: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-address">Address</Label>
                  <Input
                    id="signup-address"
                    value={signUpData.address}
                    onChange={(event) => setSignUpData((current) => ({ ...current, address: event.target.value }))}
                    required
                  />
                </div>
              </div>

              {signUpData.role !== 'volunteer' ? (
                <div>
                  <Label htmlFor="signup-organization">Organization</Label>
                  <Input
                    id="signup-organization"
                    value={signUpData.organization}
                    onChange={(event) => setSignUpData((current) => ({ ...current, organization: event.target.value }))}
                    required
                  />
                </div>
              ) : null}

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          )}

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 space-y-2">
            <div>
              Demo password for seeded accounts: <span className="font-semibold">password123</span>
            </div>
            <div>
              Password reset flow is deferred in this sprint; use in-session password change under Profile after login.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
