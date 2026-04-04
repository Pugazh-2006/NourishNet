import { Home, MapPin, History, Map as MapIcon, User, LayoutDashboard } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useAppState } from '../state/AppState';
import { Button } from './ui/button';

export function TopNav() {
  const location = useLocation();
  const { currentRole, logout, user } = useAppState();

  const roleLabel = {
    donor: 'Donor',
    ngo: 'NGO',
    volunteer: 'Volunteer',
  }[currentRole ?? 'donor'];

  const workspacePath =
    currentRole === 'donor'
      ? '/donor-dashboard'
      : currentRole === 'ngo'
        ? '/ngo-food-list'
        : '/volunteer-pickup';

  const workspaceLabel =
    currentRole === 'donor'
      ? 'My Donations'
      : currentRole === 'ngo'
        ? 'NGO Queue'
        : 'Pickups';

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: workspacePath, label: workspaceLabel, icon: LayoutDashboard },
    { path: '/active-donations', label: 'Active Donations', icon: MapPin },
    { path: '/history', label: 'History', icon: History },
    { path: '/map', label: 'Map', icon: MapIcon },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">NN</span>
            </div>
            <div>
              <div className="font-semibold text-lg leading-none">NourishNet</div>
              <div className="text-xs text-gray-500">{roleLabel} workspace</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
            <div className="hidden xl:block text-right">
              <div className="text-sm font-medium text-gray-900">{user?.organization || user?.firstName}</div>
              <div className="text-xs text-gray-500">{user?.email}</div>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {navItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(`${path}/`));
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{label}</span>
                  </Link>
                );
              })}
            </div>
            <Button variant="outline" onClick={() => void logout()} className="self-start sm:self-auto">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
