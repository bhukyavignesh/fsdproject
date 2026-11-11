import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import AppProviders from './context/AppProviders';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Spinner from './components/ui/Spinner';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';

// Below-the-fold routes are code-split.
const SeatSelectionPage = lazy(() => import('./pages/SeatSelectionPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const ConfirmationPage = lazy(() => import('./pages/ConfirmationPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const OperatorPortalPage = lazy(() => import('./pages/OperatorPortalPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// HashRouter only for static preview hosting; production uses BrowserRouter.
const Router = import.meta.env.VITE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter;

const PageFallback = () => (
  <div className="flex justify-center py-24"><Spinner className="h-6 w-6 text-brand-600" /></div>
);

export default function App() {
  return (
    <Router>
      <AppProviders>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="buses" element={<SearchResultsPage />} />
              <Route path="buses/:busId/seats" element={<SeatSelectionPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="confirmation" element={<ConfirmationPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="operator" element={<ProtectedRoute role="operator"><OperatorPortalPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </AppProviders>
    </Router>
  );
}
