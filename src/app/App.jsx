import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { AppStateProvider } from './state/AppState';
export default function App() {
    return (_jsxs(AppStateProvider, { children: [_jsx(RouterProvider, { router: router }), _jsx(Toaster, { position: "top-right" })] }));
}
