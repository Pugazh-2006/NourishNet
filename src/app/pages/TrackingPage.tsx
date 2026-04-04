import { useNavigate, useParams } from 'react-router';
import { CheckCircle, Package, Truck } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { CategoryBadge } from '../components/CategoryBadge';
import { CountdownTimer } from '../components/CountdownTimer';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAppState } from '../state/AppState';

export default function TrackingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { donations } = useAppState();
  const post = donations.find((donation) => donation.id === id);

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNav />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-900 font-medium">Donation not found.</p>
              <p className="text-gray-600 mt-2">It may have been removed from your current view, or you may have opened an invalid tracking link.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4">
                <Button onClick={() => navigate('/donor-dashboard')} className="bg-green-600 hover:bg-green-700 text-white">
                  Back To Dashboard
                </Button>
                <Button onClick={() => navigate('/active-donations')} variant="outline">
                  View Active Donations
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const eventMap = new Map(post.history.map((item) => [item.status, item]));
  const timeline = [
    {
      status: 'posted',
      label: 'Posted',
      time: eventMap.get('posted')?.note || new Date(post.cookedTime).toLocaleString(),
      icon: Package,
      completed: true,
      at: eventMap.get('posted')?.at || post.cookedTime,
    },
    {
      status: 'accepted',
      label: 'Accepted',
      time: eventMap.get('accepted')?.note || 'Waiting for NGO response',
      icon: CheckCircle,
      completed: post.status !== 'pending',
      at: eventMap.get('accepted')?.at,
    },
    {
      status: 'pickedup',
      label: 'Picked Up',
      time: eventMap.get('pickedup')?.note || 'Awaiting pickup',
      icon: Truck,
      completed: post.status === 'pickedup' || post.status === 'delivered',
      at: eventMap.get('pickedup')?.at,
    },
    {
      status: 'delivered',
      label: 'Delivered',
      time: eventMap.get('delivered')?.note || 'In progress',
      icon: CheckCircle,
      completed: post.status === 'delivered',
      at: eventMap.get('delivered')?.at,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Donation Tracking</h1>
            <p className="text-gray-600">Track the status of your food donation</p>
          </div>
          <Button onClick={() => navigate(-1)} variant="outline" className="w-full sm:w-auto">
            Back
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{post.foodName}</span>
              <CategoryBadge category={post.category} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Type</div>
                <div className="font-semibold">{post.isVeg ? 'Veg' : 'Non-Veg'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Quantity</div>
                <div className="font-semibold">{post.quantity}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Location</div>
                <div className="font-semibold">{post.location}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Safe Until</div>
                <div className="font-semibold">
                  <CountdownTimer targetTime={post.safeUntil} />
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Button onClick={() => navigate('/donor-dashboard')} variant="outline" className="w-full sm:w-auto">
                Back To My Donations
              </Button>
              <Button onClick={() => navigate('/map')} variant="outline" className="w-full sm:w-auto">
                Open Map View
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {timeline.map((item, index) => (
                <div key={item.status} className="flex gap-4 pb-8 last:pb-0">
                  {index < timeline.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
                  )}

                  <div
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
                      item.completed ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    <item.icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 pt-2">
                    <div className="font-semibold text-gray-900 mb-1">{item.label}</div>
                    <div className="text-sm text-gray-600">{item.time}</div>
                    {item.at && (
                      <div className="text-xs text-gray-500 mt-1">{new Date(item.at).toLocaleString()}</div>
                    )}
                  </div>

                  <div className="pt-2">
                    {item.completed ? (
                      <span className="text-green-600 text-sm font-medium">Complete</span>
                    ) : (
                      <span className="text-gray-400 text-sm font-medium">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {post.status === 'delivered' && (
          <Card className="mt-6 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delivery completed successfully</h3>
                <p className="text-gray-600">
                  Thank you for reducing food waste and helping those in need.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
