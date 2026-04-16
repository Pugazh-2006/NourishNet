import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import HomePage from './HomePage';
const useAppStateMock = vi.fn();
vi.mock('../state/AppState', () => ({
    useAppState: () => useAppStateMock(),
}));
vi.mock('../components/TopNav', () => ({
    TopNav: () => _jsx("div", { children: "Top Navigation" }),
}));
describe('HomePage smoke render', () => {
    it('renders dashboard and key actions', () => {
        useAppStateMock.mockReturnValue({
            currentRole: 'donor',
            stats: {
                totalDonationsToday: 3,
                activePickups: 2,
                completedDeliveries: 1,
                highPriorityAlerts: 1,
            },
            notifications: [],
        });
        render(_jsx(MemoryRouter, { children: _jsx(HomePage, {}) }));
        expect(screen.getByText('Main Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
        expect(screen.getByText('Open Workspace')).toBeInTheDocument();
    });
});
