import { TopNav } from '../components/TopNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, Users, Clock, Package, CheckCircle, ClipboardList } from 'lucide-react';
import { useAppState } from '../state/AppState';

function formatMinutes(value: number | null) {
  return value === null ? 'Not enough data' : `${value} mins`;
}

function formatWeight(value: number) {
  return value > 0 ? `${value.toLocaleString()} kg` : 'No kg data yet';
}

export default function AnalyticsPage() {
  const { analytics } = useAppState();
  const { platform, personal, dataQuality } = analytics;

  const platformStats = [
    {
      label: 'Platform Donations',
      value: platform.totalDonations.toLocaleString(),
      icon: ClipboardList,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'Tracked Meals',
      value: dataQuality.platformHasMealData ? platform.mealsCount.toLocaleString() : 'No meal data yet',
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Tracked Food Weight',
      value: formatWeight(platform.foodWeightKg),
      icon: Package,
      color: 'text-orange-600 bg-orange-100',
    },
    {
      label: 'Avg Pickup Time',
      value: formatMinutes(platform.averagePickupTime),
      icon: Clock,
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  const personalStats = [
    {
      label: 'Your Donations in Scope',
      value: personal.totalContributions.toLocaleString(),
      icon: ClipboardList,
      color: 'text-slate-700 bg-slate-100',
    },
    {
      label: 'Your Completed Deliveries',
      value: personal.completedContributions.toLocaleString(),
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'Your Tracked Meals',
      value: dataQuality.personalHasMealData ? personal.mealsCount.toLocaleString() : 'No meal data yet',
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Your Avg Pickup Time',
      value: formatMinutes(personal.averagePickupTime),
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Reports</h1>
          <p className="text-gray-600">Track platform-wide activity separately from your own contribution history.</p>
        </div>

        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900 space-y-1">
            <p>Only structured quantity entries are counted as real metrics.</p>
            <p>Meals are counted from entries like <span className="font-medium">50 servings</span>. Food weight is counted from entries like <span className="font-medium">12 kg</span> or <span className="font-medium">500 g</span>.</p>
          </CardContent>
        </Card>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {platformStats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {personalStats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {platform.totalDonations === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
                  No donation activity yet to chart.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={platform.categoryDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, count }) => `${name}: ${count}`}
                      outerRadius={100}
                      dataKey="count"
                    >
                      {platform.categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, _name, props) => [`${value} donations`, props?.payload?.name || 'Category']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>NGO Coverage by Zone</CardTitle>
            </CardHeader>
            <CardContent>
              {platform.activeNGOsByZone.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
                  No NGO location data is available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={platform.activeNGOsByZone}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="zone" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#22c55e" name="NGO Count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              <div><span className="font-medium">Open donations:</span> {platform.openDonations}</div>
              <div><span className="font-medium">Completed deliveries:</span> {platform.deliveredDonations}</div>
              <div><span className="font-medium">Partner NGOs:</span> {platform.totalPartnerNGOs}</div>
              <div><span className="font-medium">Tracked meal entries:</span> {platform.trackedMealDonations}</div>
              <div><span className="font-medium">Tracked weight entries:</span> {platform.trackedWeightDonations}</div>
              <div><span className="font-medium">Avg delivery time after pickup:</span> {formatMinutes(platform.averageDeliveryTime)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{personal.scopeLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              <div><span className="font-medium">Open items in your scope:</span> {personal.openContributions}</div>
              <div><span className="font-medium">Completed items in your scope:</span> {personal.completedContributions}</div>
              <div><span className="font-medium">Tracked food weight:</span> {formatWeight(personal.foodWeightKg)}</div>
              <div><span className="font-medium">Tracked loose-item count:</span> {personal.itemCount}</div>
              <div><span className="font-medium">Tracked meal entries:</span> {personal.trackedMealDonations}</div>
              <div><span className="font-medium">Avg delivery time after pickup:</span> {formatMinutes(personal.averageDeliveryTime)}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
