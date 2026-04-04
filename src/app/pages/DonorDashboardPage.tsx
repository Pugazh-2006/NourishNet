import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Filter, Plus } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { CategoryBadge } from '../components/CategoryBadge';
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

export default function DonorDashboardPage() {
  const navigate = useNavigate();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { donations } = useAppState();

  const filteredPosts = donations.filter((post) => {
    return filterCategory === 'all' || post.category === filterCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'accepted':
        return 'bg-blue-100 text-blue-700';
      case 'pickedup':
        return 'bg-purple-100 text-purple-700';
      case 'delivered':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Donor Dashboard</h1>
            <p className="text-gray-600">Manage your food donations and track their status</p>
          </div>
          <Button
            onClick={() => navigate('/post-food')}
            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Post Surplus Food
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Filter by Category:</span>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="red">High Priority</SelectItem>
                  <SelectItem value="yellow">Medium Priority</SelectItem>
                  <SelectItem value="green">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3 flex-wrap">
                      <h3 className="text-xl font-semibold text-gray-900">{post.foodName}</h3>
                      <CategoryBadge category={post.category} />
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(post.status)}`}
                      >
                        {post.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Type:</span> {post.isVeg ? 'Veg' : 'Non-Veg'}
                      </div>
                      <div>
                        <span className="font-medium">Quantity:</span> {post.quantity}
                      </div>
                      <div>
                        <span className="font-medium">Location:</span> {post.location}
                      </div>
                      <div>
                        <span className="font-medium">Safe Until:</span>{' '}
                        {new Date(post.safeUntil).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    {post.acceptedBy && (
                      <div className="mt-3 text-sm text-gray-600">
                        <span className="font-medium">Accepted by:</span> {post.acceptedBy}
                      </div>
                    )}
                  </div>
                  <Button onClick={() => navigate(`/tracking/${post.id}`)} variant="outline" className="w-full md:w-auto">
                    Track
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-900 font-medium">No donations match this view yet.</p>
              <p className="text-gray-600 mt-2">Post your first donation or switch the category filter to see more items.</p>
              <Button onClick={() => navigate('/post-food')} className="mt-4 bg-green-600 hover:bg-green-700 text-white">
                Post Surplus Food
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
