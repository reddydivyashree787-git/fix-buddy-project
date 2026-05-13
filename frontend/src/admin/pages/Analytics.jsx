import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Calendar, Star, AlertCircle } from 'lucide-react';
import { authAPI, bookingsAPI, reviewsAPI } from '../../api';

const normalizeListResponse = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.results) return payload.results;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
};

const COLORS = ['#0ea5e9', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export default function AdminAnalytics() {
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 'bookings'],
    queryFn: () => bookingsAPI.getAnalytics(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['analytics', 'all-bookings'],
    queryFn: () => bookingsAPI.getBookings({ page_size: 100, ordering: '-created_at' }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['analytics', 'users'],
    queryFn: () => authAPI.getAllUsers(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: providersData } = useQuery({
    queryKey: ['analytics', 'providers'],
    queryFn: () => authAPI.getAllProviders(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['analytics', 'reviews'],
    queryFn: () => reviewsAPI.getReviews({ page_size: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: emergenciesData } = useQuery({
    queryKey: ['analytics', 'emergencies'],
    queryFn: () => bookingsAPI.getEmergencies(),
    staleTime: 5 * 60 * 1000,
  });

  const bookings = normalizeListResponse(bookingsData);
  const users = normalizeListResponse(usersData);
  const providers = normalizeListResponse(providersData);
  const reviews = normalizeListResponse(reviewsData);
  const emergencies = normalizeListResponse(emergenciesData);
  const analytics = analyticsData?.data || analyticsData || {};
  
  // Use original data from the backend
  const totalRevenue = analytics.total_revenue || 0;
  const completedBookings = (analytics.by_status || []).find(s => s.status === 'completed')?.count || 0;
  const totalBookingsCount = analytics.total_bookings || 0;
  const emergencyRequestsCount = analytics.emergency_bookings || 0;
  const averageBookingValue = analytics.average_completed_price || 0;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : 0;

  // Build charts data using original data
  const bookingStatusData = (analytics.by_status || []).map((statusObj) => ({
    name: statusObj.status.charAt(0).toUpperCase() + statusObj.status.slice(1),
    value: statusObj.count,
  }));

  const bookingsByDay = {};
  const revenueByDay = {};
  bookings.forEach((booking) => {
    const createdAt = booking.booking_date || booking.created_at;
    const date = createdAt ? new Date(createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'N/A';
    bookingsByDay[date] = (bookingsByDay[date] || 0) + 1;
    const price = parseFloat(booking.final_price || booking.quoted_price || 0);
    revenueByDay[date] = (revenueByDay[date] || 0) + (Number.isFinite(price) ? price : 0);
  });

  const timeSeriesData = Object.keys(bookingsByDay).sort().map((date) => ({
    date,
    bookings: bookingsByDay[date],
    revenue: revenueByDay[date],
  }));

  const ratingDistribution = {};
  reviews.forEach((review) => {
    const rating = review.rating || 0;
    ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
  });

  const ratingData = Array.from({ length: 5 }, (_, i) => i + 1).map((rating) => ({
    rating: `${rating}★`,
    count: ratingDistribution[rating] || 0,
  }));

  const emergencyByDay = {};
  emergencies.forEach((emergency) => {
    const createdAt = emergency.created_at;
    const date = createdAt ? new Date(createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'N/A';
    emergencyByDay[date] = (emergencyByDay[date] || 0) + 1;
  });

  const emergencyData = Object.keys(emergencyByDay).sort().map((date) => ({
    date,
    emergencies: emergencyByDay[date],
  }));

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-8 h-8 text-sky-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics & Reports</h1>
          <p className="text-sm text-slate-500">View comprehensive business metrics and performance data.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(0)}`, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Total Bookings', value: totalBookingsCount, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
          { label: 'Completed', value: completedBookings, icon: TrendingUp, color: 'bg-sky-50 text-sky-600' },
          { label: 'Avg Rating', value: `${avgRating}★`, icon: Star, color: 'bg-amber-50 text-amber-600' },
          { label: 'Emergency Req.', value: emergencyRequestsCount, icon: AlertCircle, color: 'bg-rose-50 text-rose-600' },
          { label: 'Active Providers', value: providers.length, icon: Users, color: 'bg-purple-50 text-purple-600' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`inline-flex items-center justify-center rounded-xl ${card.color} p-2 mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500 font-medium">{card.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Bookings Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="bookings" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Revenue Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Booking Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={bookingStatusData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                {bookingStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Rating Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ratingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="rating" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Emergency Requests Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={emergencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="emergencies" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Key Metrics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Avg. Booking Value</span>
              <span className="font-semibold text-slate-900">₹{averageBookingValue.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Completion Rate</span>
              <span className="font-semibold text-slate-900">{totalBookingsCount > 0 ? ((completedBookings / totalBookingsCount) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Total Customers</span>
              <span className="font-semibold text-slate-900">{users.filter((u) => u.role === 'customer').length}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Active Providers</span>
              <span className="font-semibold text-slate-900">{providers.length}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Providers</h2>
          <div className="space-y-3">
            {providers.slice(0, 5).map((provider, index) => (
              <div key={provider.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-sm text-slate-700 font-medium">{provider.full_name}</span>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">Active</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {[
              { label: 'New Bookings', value: bookings.filter((b) => b.status === 'pending').length, color: 'bg-blue-100 text-blue-600' },
              { label: 'In Progress', value: bookings.filter((b) => b.status === 'in_progress').length, color: 'bg-amber-100 text-amber-600' },
              { label: 'Completed Today', value: bookings.filter((b) => b.status === 'completed' && new Date(b.created_at).toDateString() === new Date().toDateString()).length, color: 'bg-emerald-100 text-emerald-600' },
              { label: 'Cancelled', value: bookings.filter((b) => b.status === 'cancelled').length, color: 'bg-rose-100 text-rose-600' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
