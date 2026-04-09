import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate, useLocation } from 'react-router';
import { useAppState } from '../state/AppState';
function LoadingScreen() {
    return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center px-4", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-2xl font-semibold text-gray-900 mb-2", children: "Loading workspace" }), _jsx("p", { className: "text-gray-600", children: "Checking your session and syncing shared data." })] }) }));
}
export function RequireAuth({ children }) {
    const location = useLocation();
    const { authReady, isAuthenticated } = useAppState();
    if (!authReady) {
        return _jsx(LoadingScreen, {});
    }
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true, state: { from: location.pathname } });
    }
    return _jsx(_Fragment, { children: children });
}
export function RequireRole({ role, children, }) {
    const { currentRole } = useAppState();
    return (_jsx(RequireAuth, { children: currentRole === role ? children : _jsx(Navigate, { to: "/role-selection", replace: true }) }));
}
export function PublicOnly({ children }) {
    const { authReady, isAuthenticated } = useAppState();
    if (!authReady) {
        return _jsx(LoadingScreen, {});
    }
    if (isAuthenticated) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
