// ===== App Root =====
// Routing + context provider setup.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChallengeProvider, useChallengeContext } from './context/ChallengeContext';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { LibraryScreen } from './screens/LibraryScreen';

/**
 * Route guard — redirects to dashboard if already registered,
 * or to welcome if not registered.
 */
function ProtectedRoute({ children }) {
    const { state } = useChallengeContext();
    if (!state.registered) {
        return <Navigate to="/" replace />;
    }
    return children;
}

function PublicRoute({ children }) {
    const { state } = useChallengeContext();
    if (state.registered) {
        return <Navigate to="/library" replace />;
    }
    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/"
                element={
                    <PublicRoute>
                        <WelcomeScreen />
                    </PublicRoute>
                }
            />
            <Route
                path="/library"
                element={
                    <ProtectedRoute>
                        <LibraryScreen />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardScreen />
                    </ProtectedRoute>
                }
            />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <ChallengeProvider>
                <AppRoutes />
            </ChallengeProvider>
        </BrowserRouter>
    );
}
