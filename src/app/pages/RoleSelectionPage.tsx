import { TopNav } from '../components/TopNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { UtensilsCrossed, Building2, Truck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppState } from '../state/AppState';

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const { currentRole } = useAppState();

  const roles = [
    {
      title: 'Donate Food',
      subtitle: 'Restaurant / Event',
      icon: UtensilsCrossed,
      color: 'bg-green-600 hover:bg-green-700',
      path: '/donor-dashboard',
      role: 'donor' as const,
    },
    {
      title: 'NGO / Accept Food',
      subtitle: 'Food Collection',
      icon: Building2,
      color: 'bg-blue-600 hover:bg-blue-700',
      path: '/ngo-food-list',
      role: 'ngo' as const,
    },
    {
      title: 'Volunteer / Pickup',
      subtitle: 'Delivery Service',
      icon: Truck,
      color: 'bg-purple-600 hover:bg-purple-700',
      path: '/volunteer-pickup',
      role: 'volunteer' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />

      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Workspace Access</h1>
          <p className="text-lg text-gray-600">Your account role controls which operational workspace you can open.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {roles.map((role) => (
            <Card
              key={role.title}
              className={`transition-all duration-300 border-2 ${
                currentRole === role.role
                  ? 'border-green-500 shadow-2xl'
                  : 'border-gray-200 opacity-70'
              }`}
              onClick={() => {
                if (currentRole === role.role) {
                  navigate(role.path);
                }
              }}
            >
              <CardHeader className="text-center pb-4">
                <div className={`w-24 h-24 mx-auto rounded-2xl ${role.color} flex items-center justify-center mb-4`}>
                  <role.icon className="w-12 h-12 text-white" />
                </div>
                <CardTitle className="text-xl mb-2">{role.title}</CardTitle>
                <p className="text-gray-600">{role.subtitle}</p>
              </CardHeader>
              <CardContent className="text-center">
                <Button
                  className={`w-full ${currentRole === role.role ? role.color : 'bg-gray-300 text-gray-700 hover:bg-gray-300'}`}
                  size="lg"
                  disabled={currentRole !== role.role}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentRole === role.role) {
                      navigate(role.path);
                    }
                  }}
                >
                  {currentRole === role.role ? 'Open Workspace' : 'Use Matching Account'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
