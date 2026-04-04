import { TopNav } from '../components/TopNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { TrendingUp, Package, CheckCircle, AlertTriangle, Bell } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppState } from '../state/AppState';

export default function HomePage() {
  const navigate = useNavigate();
  const { stats: dashboardStats, notifications, currentRole } = useAppState();

  const workspacePath =
    currentRole === 'donor'
      ? '/donor-dashboard'
      : currentRole === 'ngo'
        ? '/ngo-food-list'
        : '/volunteer-pickup';

  const stats = [
    { label: 'Total Donations Today', value: dashboardStats.totalDonationsToday, icon: Package, color: 'text-blue-600 bg-blue-100' },
    { label: 'Active Pickups', value: dashboardStats.activePickups, icon: TrendingUp, color: 'text-green-600 bg-green-100' },
    { label: 'Completed Deliveries', value: dashboardStats.completedDeliveries, icon: CheckCircle, color: 'text-purple-600 bg-purple-100' },
    { label: 'High Priority Alerts', value: dashboardStats.highPriorityAlerts, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
  ];

  const roleGuide =
    currentRole === 'donor'
      ? {
          title: 'Donor Flow',
          description: 'Post a donation, review its status, and track it through NGO acceptance and delivery.',
          primaryLabel: 'Post New Donation',
          primaryAction: () => navigate('/post-food'),
          secondaryLabel: 'Open My Donations',
          secondaryAction: () => navigate('/donor-dashboard'),
        }
      : currentRole === 'ngo'
        ? {
            title: 'NGO Flow',
            description: 'Review pending food, accept safe donations, and monitor live handoff progress.',
            primaryLabel: 'Review NGO Queue',
            primaryAction: () => navigate('/ngo-food-list'),
            secondaryLabel: 'Open Active Donations',
            secondaryAction: () => navigate('/active-donations'),
          }
        : {
            title: 'Volunteer Flow',
            description: 'Open your assigned pickups, confirm collection, and complete delivery safely.',
            primaryLabel: 'Open Assigned Pickups',
            primaryAction: () => navigate('/volunteer-pickup'),
            secondaryLabel: 'Open Map View',
            secondaryAction: () => navigate('/map'),
          };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Main Dashboard</h1>
          <p className="text-gray-600">Monitor food donations and manage pickups in real-time</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                  <p className="font-medium text-gray-900">No recent workflow alerts yet.</p>
                  <p className="text-sm text-gray-600 mt-2">Your next updates will appear here as donations move through the flow.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        notification.type === 'urgent'
                          ? 'border-red-500 bg-red-50'
                          : notification.type === 'warning'
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-green-500 bg-green-50'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{notification.message}</p>
                      <p className="text-sm text-gray-600 mt-1">{notification.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate(workspacePath)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  Open Workspace
                </Button>
                <Button
                  onClick={() => navigate('/active-donations')}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  View Active Donations
                </Button>
                <Button
                  onClick={() => navigate('/map')}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Open Map View
                </Button>
                <Button
                  onClick={() => navigate('/analytics')}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{roleGuide.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-gray-700">{roleGuide.description}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 lg:min-w-fit">
              <Button onClick={roleGuide.primaryAction} className="bg-green-600 hover:bg-green-700 text-white">
                {roleGuide.primaryLabel}
              </Button>
              <Button onClick={roleGuide.secondaryAction} variant="outline">
                {roleGuide.secondaryLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
