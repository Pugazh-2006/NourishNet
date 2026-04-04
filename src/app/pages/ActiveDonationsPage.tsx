import { toast } from 'sonner';
import { TopNav } from '../components/TopNav';
import { Card, CardContent } from '../components/ui/card';
import { CategoryBadge } from '../components/CategoryBadge';
import { Button } from '../components/ui/button';
import { useAppState } from '../state/AppState';

export default function ActiveDonationsPage() {
  const { donations, acceptDonation, currentRole, isLoading } = useAppState();
  const activeDonations = donations.filter(
    (p) => p.status === 'pending' || p.status === 'accepted' || p.status === 'pickedup'
  );

  const getStatusBadgeClassName = (status: string) => {
    if (status === 'pending') {
      return 'bg-amber-100 text-amber-700';
    }

    if (status === 'pickedup') {
      return 'bg-purple-100 text-purple-700';
    }

    return 'bg-blue-100 text-blue-700';
  };

  const handleAccept = async (donationId: string, foodName: string) => {
    const confirmed = window.confirm(`Accept \"${foodName}\" and move it into pickup workflow?`);
    if (!confirmed) {
      return;
    }

    try {
      await acceptDonation(donationId);
      toast.success('Food accepted and assigned for volunteer pickup.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to accept donation');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Active Donations</h1>
          <p className="text-gray-600">View all donations that are open or currently in progress</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {activeDonations.map((post) => {
            const isExpired = post.status === 'pending' && new Date(post.safeUntil).getTime() <= Date.now();

            return (
              <Card key={post.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3 flex-wrap">
                        <h3 className="text-xl font-semibold text-gray-900">{post.foodName}</h3>
                        <CategoryBadge category={post.category} />
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusBadgeClassName(post.status)}`}
                        >
                          {post.status}
                        </span>
                        {isExpired && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">expired</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Donor:</span> {post.donorName}
                        </div>
                        <div>
                          <span className="font-medium">Quantity:</span> {post.quantity}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {post.location}
                        </div>
                        <div>
                          <span className="font-medium">NGO:</span> {post.acceptedBy || 'Awaiting NGO acceptance'}
                        </div>
                        <div>
                          <span className="font-medium">Distance:</span> {post.distance} km
                        </div>
                      </div>

                      {isExpired && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          This donation has expired and can no longer be accepted.
                        </div>
                      )}

                      {currentRole === 'ngo' && post.status === 'pending' && (
                        <div className="mt-5 flex justify-end">
                          <Button
                            onClick={() => void handleAccept(post.id, post.foodName)}
                            disabled={isLoading || isExpired}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {isExpired ? 'Expired' : isLoading ? 'Accepting...' : 'Accept Donation'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {activeDonations.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">No active donations at the moment</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
