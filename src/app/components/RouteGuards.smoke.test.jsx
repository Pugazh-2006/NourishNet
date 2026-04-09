import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { PublicOnly, RequireAuth, RequireRole } from './RouteGuards';
const useAppStateMock = vi.fn();
vi.mock('../state/AppState', () => ({
    useAppState: () => useAppStateMock(),
}));
function setState(overrides) {
    useAppStateMock.mockReturnValue({
        authReady: true,
        isAuthenticated: false,
        currentRole: null,
        ...overrides,
    });
}
describe('route guard smoke tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('renders loading screen while auth state is unresolved', () => {
        setState({ authReady: false, isAuthenticated: false });
        render(_jsx(MemoryRouter, { initialEntries: ['/private'], children: _jsxs(Routes, { children: [_jsx(Route, { path: "/private", element: _jsx(RequireAuth, { children: _jsx("div", { children: "Private Page" }) }) }), _jsx(Route, { path: "/login", element: _jsx("div", { children: "Login Page" }) })] }) }));
        expect(screen.getByText('Loading workspace')).toBeInTheDocument();
    });
    it('redirects unauthenticated users to login for protected routes', async () => {
        setState({ authReady: true, isAuthenticated: false });
        render(_jsx(MemoryRouter, { initialEntries: ['/private'], children: _jsxs(Routes, { children: [_jsx(Route, { path: "/private", element: _jsx(RequireAuth, { children: _jsx("div", { children: "Private Page" }) }) }), _jsx(Route, { path: "/login", element: _jsx("div", { children: "Login Page" }) })] }) }));
        expect(await screen.findByText('Login Page')).toBeInTheDocument();
    });
    it('renders protected content for matching role', () => {
        setState({ authReady: true, isAuthenticated: true, currentRole: 'ngo' });
        render(_jsx(MemoryRouter, { initialEntries: ['/ngo'], children: _jsxs(Routes, { children: [_jsx(Route, { path: "/ngo", element: _jsx(RequireRole, { role: "ngo", children: _jsx("div", { children: "NGO Workspace" }) }) }), _jsx(Route, { path: "/role-selection", element: _jsx("div", { children: "Role Selection" }) })] }) }));
        expect(screen.getByText('NGO Workspace')).toBeInTheDocument();
    });
    it('redirects authenticated users away from public-only routes', async () => {
        setState({ authReady: true, isAuthenticated: true, currentRole: 'donor' });
        render(_jsx(MemoryRouter, { initialEntries: ['/login'], children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(PublicOnly, { children: _jsx("div", { children: "Login Page" }) }) }), _jsx(Route, { path: "/", element: _jsx("div", { children: "Home Page" }) })] }) }));
        expect(await screen.findByText('Home Page')).toBeInTheDocument();
    });
});
