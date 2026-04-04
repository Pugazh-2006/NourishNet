import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { TopNav } from '../components/TopNav';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { useAppState } from '../state/AppState';

function isStructuredQuantity(value: string) {
  return /^(\d+(?:\.\d+)?)\s*(servings?|meals?|plates?|packets?|pieces?|boxes?|containers?|trays?|kgs?|kilograms?|g|gm|grams?)$/i.test(value.trim());
}

export default function PostFoodPage() {
  const navigate = useNavigate();
  const { addDonation, isLoading } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState<'red' | 'yellow' | 'green' | null>(null);
  const [isVeg, setIsVeg] = useState(true);
  const [formData, setFormData] = useState({
    foodName: '',
    quantity: '',
    cookedTime: '',
    safeUntil: '',
    location: '',
  });

  const categories = [
    { id: 'red' as const, label: 'High Priority', description: 'Fast Spoilage', color: 'border-red-500 bg-red-50 hover:bg-red-100', selectedColor: 'border-red-600 bg-red-100 ring-4 ring-red-200' },
    { id: 'yellow' as const, label: 'Medium Priority', description: 'Moderate Shelf Life', color: 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100', selectedColor: 'border-yellow-600 bg-yellow-100 ring-4 ring-yellow-200' },
    { id: 'green' as const, label: 'Low Priority', description: 'Packed Food', color: 'border-green-500 bg-green-50 hover:bg-green-100', selectedColor: 'border-green-600 bg-green-100 ring-4 ring-green-200' },
  ];

  const quantityIsValid = isStructuredQuantity(formData.quantity);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedCategory) {
      toast.error('Please select a food category');
      return;
    }

    if (!quantityIsValid) {
      toast.error('Use a structured quantity like "50 servings", "12 kg", or "100 packets"');
      return;
    }

    const cookedTime = new Date(formData.cookedTime);
    const safeUntil = new Date(formData.safeUntil);
    const now = new Date();

    if (cookedTime > now) {
      toast.error('Cooked time cannot be in the future');
      return;
    }

    if (safeUntil <= cookedTime) {
      toast.error('Safe until time must be later than cooked time');
      return;
    }

    if (safeUntil <= now) {
      toast.error('Safe until time must still be in the future');
      return;
    }

    try {
      await addDonation({ ...formData, category: selectedCategory, isVeg });
      toast.success('Food posted successfully. Address geocoding is handled automatically on the server.');
      navigate('/donor-dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to post donation');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Post Surplus Food</h1>
          <p className="text-gray-600">Share details about the food you want to donate</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="foodName">Food Name *</Label>
                <Input id="foodName" placeholder="e.g., Fresh Biryani, Sandwiches" value={formData.foodName} onChange={(e) => setFormData({ ...formData, foodName: e.target.value })} required disabled={isLoading} />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Food Type</Label>
                  <p className="text-sm text-gray-600">{isVeg ? 'Vegetarian' : 'Non-Vegetarian'}</p>
                </div>
                <Switch checked={isVeg} onCheckedChange={setIsVeg} disabled={isLoading} />
              </div>

              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input id="quantity" placeholder="e.g., 50 servings, 12 kg, 100 packets" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required disabled={isLoading} className={formData.quantity && !quantityIsValid ? 'border-red-500 focus-visible:ring-red-500' : ''} />
                <p className={`text-sm mt-1 ${formData.quantity && !quantityIsValid ? 'text-red-600' : 'text-gray-500'}`}>
                  Use a number plus unit such as servings, kg, g, packets, pieces, boxes, containers, or trays.
                </p>
              </div>

              <div>
                <Label className="mb-3 block">Food Category *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <button key={category.id} type="button" onClick={() => setSelectedCategory(category.id)} disabled={isLoading} className={`p-4 border-2 rounded-lg text-left transition-all ${selectedCategory === category.id ? category.selectedColor : category.color} ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      <div className="font-semibold text-gray-900 mb-1">{category.label}</div>
                      <div className="text-sm text-gray-600">{category.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cookedTime">Cooked Time *</Label>
                  <Input id="cookedTime" type="datetime-local" value={formData.cookedTime} onChange={(e) => setFormData({ ...formData, cookedTime: e.target.value })} required disabled={isLoading} />
                </div>
                <div>
                  <Label htmlFor="safeUntil">Safe Until Time *</Label>
                  <Input id="safeUntil" type="datetime-local" value={formData.safeUntil} onChange={(e) => setFormData({ ...formData, safeUntil: e.target.value })} required disabled={isLoading} />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Pickup Location *</Label>
                <div className="relative">
                  <Input id="location" placeholder="e.g., Downtown Restaurant, 123 Main St" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required className="pr-10" disabled={isLoading} />
                  <MapPin className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mt-1">Use a clear pickup address. The server will try to geocode it automatically for the live map.</p>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white" size="lg" disabled={isLoading}>
                  {isLoading ? 'Posting Donation...' : 'Notify Nearby NGOs'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/donor-dashboard')} size="lg" disabled={isLoading}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
