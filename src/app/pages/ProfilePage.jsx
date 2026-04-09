import { useEffect, useMemo, useState } from 'react';
import { Mail, MapPin, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import { TopNav } from '../components/TopNav';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAppState } from '../state/AppState';

function requiredFieldsForRole(role) {
  if (role === 'volunteer') {
    return ['firstName', 'lastName', 'phone', 'address'];
  }

  return ['firstName', 'lastName', 'phone', 'address', 'organization'];
}

export default function ProfilePage() {
  const { user, profile, donations, saveProfile, changePassword, isLoading } = useAppState();
  const [formData, setFormData] = useState(profile);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const missingFields = useMemo(() => {
    const required = requiredFieldsForRole(user?.role);
    return required.filter((field) => !String(formData[field] || '').trim());
  }, [formData, user?.role]);

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      await saveProfile(formData);
      toast.success('Profile updated successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save profile');
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      toast.success('Password updated. Please sign in again.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update password');
    }
  };

  const fullName = `${formData.firstName} ${formData.lastName}`.trim();
  const totalDonations = donations.filter((donation) => donation.donorName === (formData.organization || fullName)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600">Manage your account information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardContent className="p-6 text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{fullName}</h3>
              <p className="text-sm text-gray-600 mb-4">{formData.organization || 'No organization provided'}</p>

              <div className="space-y-2 text-sm text-left">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{formData.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{formData.phone || 'Missing'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{formData.address || 'Missing'}</span>
                </div>
              </div>

              {missingFields.length ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900">
                  Missing required fields for {user?.role}: {missingFields.join(', ')}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={formData.firstName} onChange={(event) => setFormData({ ...formData, firstName: event.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={formData.lastName} onChange={(event) => setFormData({ ...formData, lastName: event.target.value })} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    value={formData.organization}
                    onChange={(event) => setFormData({ ...formData, organization: event.target.value })}
                    placeholder={user?.role === 'volunteer' ? 'Optional for volunteers' : ''}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} disabled />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={formData.address} onChange={(event) => setFormData({ ...formData, address: event.target.value })} />
                </div>

                <div className="flex gap-4">
                  <Button className="bg-green-600 hover:bg-green-700 text-white" type="submit" disabled={isLoading}>
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setFormData(profile)} disabled={isLoading}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handlePasswordChange}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    minLength={8}
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="bg-gray-900 hover:bg-black text-white" disabled={isLoading}>
                Update Password
              </Button>
            </form>
            <p className="mt-3 text-xs text-gray-600">Forgot-password reset is not yet available in-app and is tracked as deferred scope.</p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Your Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{totalDonations}</div>
                <div className="text-sm text-gray-600">Total Donations</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalDonations * 18} kg</div>
                <div className="text-sm text-gray-600">Food Saved</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{totalDonations * 25}</div>
                <div className="text-sm text-gray-600">Meals Provided</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{new Set(donations.map((donation) => donation.acceptedBy).filter(Boolean)).size}</div>
                <div className="text-sm text-gray-600">Partner NGOs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
