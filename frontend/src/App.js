import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import Footer from './components/Footer';
import Home from './pages/Home';
import NotificationToaster from './components/NotificationToaster';
import { Login, Register, ForgotPassword } from './pages/Auth';
import { Categories, CategoryDetail, BookService } from './pages/Categories';
import Providers from './pages/Providers';
import ProviderDetail from './pages/ProviderDetail';
import Emergency from './pages/Emergency';
import CustomerDashboard from './pages/CustomerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import Notifications from './pages/Notifications';
import BookingDetail from './pages/BookingDetail';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminDashboardPage from './admin/pages/Dashboard';
import AdminServices from './admin/pages/Services';
import AdminCategories from './admin/pages/AdminCategories';
import AdminSubcategories from './admin/pages/AdminSubcategories';
import AdminProviders from './admin/pages/Providers';
import AdminUsers from './admin/pages/Users';
import AdminBookings from './admin/pages/Bookings';
import AdminEmergency from './admin/pages/Emergency';
import AdminReviews from './admin/pages/Reviews';
import AdminChatbot from './admin/pages/Chatbot';
import AdminAnalytics from './admin/pages/Analytics';
import AdminPayouts from './admin/pages/Payouts';
import AdminPayments from './admin/pages/Payments';
import AdminSettings from './admin/pages/Settings';
import AdminLoginActivity from './admin/pages/LoginActivity';

import './index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const hideLayout = location.pathname.startsWith('/admin') || location.pathname === '/login' || location.pathname === '/register';

  return (
    <>
      {!hideLayout && <Navbar />}
      <Routes>
        <Route path="/" element={
          user?.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> :
          user?.role === 'provider' ? <Navigate to="/provider-dashboard" replace /> :
          <Home />
        } />
        <Route path="/login"         element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register"      element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
        <Route path="/categories"    element={<Categories />} />
        <Route path="/categories/:id" element={<CategoryDetail />} />
        <Route path="/book/:subcategoryId" element={<BookService />} />
        <Route path="/providers"     element={<Providers />} />
        <Route path="/providers/:id" element={<ProviderDetail />} />
        <Route path="/emergency"     element={<Emergency />} />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute roles={['customer']}>
            <CustomerDashboard />
          </ProtectedRoute>
        } />

        <Route path="/booking/:id" element={
          <ProtectedRoute roles={['customer']}>
            <BookingDetail />
          </ProtectedRoute>
        } />

        <Route path="/provider-dashboard" element={
          <ProtectedRoute roles={['provider']}>
            <ProviderDashboard />
          </ProtectedRoute>
        } />

        <Route path="/admin-dashboard" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="services/categories" element={<AdminCategories />} />
          <Route path="services/subcategories" element={<AdminSubcategories />} />
          <Route path="providers" element={<AdminProviders />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="emergency" element={<AdminEmergency />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="chatbot" element={<AdminChatbot />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="payouts" element={<AdminPayouts />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="login-activity" element={<AdminLoginActivity />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {!hideLayout && <Chatbot />}
      {!hideLayout && <Footer />}
      <NotificationToaster />
    </>
  );
}

export default function App() {
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const handleUnhandledRejection = (event) => {
      const reason = event?.reason;
      if (!reason) return;

      if (reason.isAxiosNetworkError || reason.message?.includes('Network Error')) {
        event.preventDefault();
        console.error('Caught unhandled network error:', reason);
        setError(
          'Network error: cannot reach API. Please make sure the backend is running at http://localhost:8000 and refresh the page.'
        );
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {error && (
            <div style={{ background: '#fde68a', color: '#92400e', padding: '10px 16px', textAlign: 'center' }}>
              {error}
            </div>
          )}
          <AppRoutes />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
