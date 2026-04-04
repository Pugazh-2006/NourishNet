import { useMemo, useState } from 'react';
import { Drumstick, Leaf, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { TopNav } from '../components/TopNav';
import { CategoryBadge } from '../components/CategoryBadge';
import { CountdownTimer } from '../components/CountdownTimer';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useAppState } from '../state/AppState';

export default function NGOFoodListPage() {
  const [sortBy, setSortBy] = useState('nearest');
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const { donations, acceptDonation, profile, isLoading } = useAppState();

  const pendingPosts = useMemo(
    () =>
      donations.filter(
        (post) => post.status === 'pending' && !dismissedIds.includes(post.id),
      ),
    [dismissedIds, donations],
  );

  const sortedPosts = [...pendingPosts].sort((a, b) => {
    if (sortBy === 'nearest') {
      return (a.distance || 0) - (b.distance || 0);
    }

    const priority = { red: 3, yellow: 2, green: 1 };
    return priority[b.category] - priority[a.category];
  });

  const ngoName = profile.organization || 'Your NGO';

  const handleAccept = async (postId: string, foodName: string) => {
    const confirmed = window.confirm(`Accept \"${foodName}\" and assign it into the volunteer workflow?`);
    if (!confirmed) {
      return;
    }

    try {
      await acceptDonation(postId);
      toast.success('Food accepted and assigned for volunteer pickup.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to accept donation');
    }
  };

  const handleDecline = (postId: string) => {
    setDismissedIds((current) => [...current, postId]);
    toast.info('Donation hidden from your NGO queue.');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nearby Food Donations</h1>
          <p className="text-gray-600">Accept food donations from nearby donors as {ngoName}</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="font-medium text-gray-700">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nearest">Nearest First</SelectItem>
                  <SelectItem value="priority">Highest Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedPosts.map((post) => {
            const isExpired = new Date(post.safeUntil).getTime() <= Date.now();

            return (
              <Card key={post.id} className="hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4 gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{post.foodName}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CategoryBadge category={post.category} />
                        {isExpired && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">Expired</span>
                        )}
                      </div>
                    </div>
                    <CountdownTimer targetTime={post.safeUntil} />
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-gray-600">
                      {post.isVeg ? (
                        <Leaf className="w-4 h-4 text-green-600" />
                      ) : (
                        <Drumstick className="w-4 h-4 text-red-600" />
                      )}
                      <span>{post.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {post.location} - {post.distance} km away
                      </span>
                    </div>

                    <div className="text-gray-600">
                      <span className="font-medium">Quantity:</span> {post.quantity}
                    </div>

                    <div className="text-gray-600">
                      <span className="font-medium">Donor:</span> {post.donorName}
                    </div>

                    {post.volunteerName && (
                      <div className="text-gray-600">
                        <span className="font-medium">Volunteer:</span> {post.volunteerName}
                      </div>
                    )}

                    <div className="text-gray-600">
                      <span className="font-medium">Cooked:</span>{' '}
                      {new Date(post.cookedTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>

                    {isExpired && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        This donation has passed its safe handling window and cannot be accepted.
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => void handleAccept(post.id, post.foodName)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={isLoading || isExpired}
                    >
                      {isExpired ? 'Expired' : isLoading ? 'Accepting...' : 'Accept'}
                    </Button>
                    <Button onClick={() => handleDecline(post.id)} variant="outline" className="flex-1" disabled={isLoading}>
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {sortedPosts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">No pending food donations at the moment</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
