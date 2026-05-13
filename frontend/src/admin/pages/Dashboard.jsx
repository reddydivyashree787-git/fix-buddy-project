import React from 'react';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, Award, Package, Star, TrendingUp, Users } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useDashboardData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load dashboard data.</p>
          <button
            onClick={refetch}
            className="mt-4 inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    stats,
    bookingsTrend,
    revenueTrend,
    categoryDistribution,
    recentBookings,
    topServices,
    topProviders,
  } = data || {};

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shadow-sm text-3xl">
              <span>🏠</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-sky-600">Fix</span>
                <span className="text-2xl font-bold text-sky-600">Buddy</span>
                <span className="ml-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Admin</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Admin Dashboard</p>
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 border border-slate-200 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Overview</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">Services & Providers</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { title: 'Users', value: stats?.totalUsers?.toLocaleString() || '0', icon: Users, color: 'from-indigo-500 to-cyan-400' },
          { title: 'Providers', value: stats?.totalProviders?.toLocaleString() || '0', icon: Award, color: 'from-fuchsia-500 to-pink-500' },
          { title: 'Pending', value: stats?.pendingBookings?.toLocaleString() || '0', icon: TrendingUp, color: 'from-amber-400 to-orange-500' },
          { title: 'Bookings', value: stats?.totalBookings?.toLocaleString() || '0', icon: Package, color: 'from-violet-500 to-purple-500' },
          { title: 'Revenue', value: `₹${Math.round(stats?.totalRevenue || 0).toLocaleString()}`, icon: AlertCircle, color: 'from-emerald-400 to-teal-500' },
          { title: 'Emergencies', value: stats?.emergencyRequests?.toLocaleString() || '0', icon: Star, color: 'from-rose-500 to-red-500' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-white hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{stat.title}</p>
                  <p className="text-3xl font-extrabold text-slate-800">{stat.value}</p>
                </div>
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg shadow-${stat.color.split('-')[1]}-500/40 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-100">
        <div className="flex items-center gap-3 mb-6">
          <Package className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Top Services</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {(topServices || []).map((service, idx) => (
            <div key={service.id || idx} className={`bg-gradient-to-br ${service.color || 'from-blue-500'} to-opacity-80 p-6 rounded-2xl text-white shadow-md hover:shadow-lg transition-all group cursor-pointer hover:scale-105`}>
              <div className="text-4xl mb-2">{service.icon || '🔧'}</div>
              <div className="text-sm font-semibold truncate">{service.name || 'Service'}</div>
              <div className="text-2xl font-bold mt-2">{service.bookings || 0}</div>
              <div className="text-xs opacity-90 mt-1">bookings</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Bookings Trend</h3>
          {bookingsTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bookingsTrend}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={8} />
                <YAxis axisLine={false} tickLine={false} tickMargin={8} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="bookings" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-sm text-gray-500 py-20">No booking trend data yet.</div>
          )}
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Bookings by Category</h3>
          {categoryDistribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" fill="#8884d8" />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-sm text-gray-500 py-20">No category data available.</div>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Revenue Growth</h3>
        {revenueTrend?.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={revenueTrend}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-sm text-gray-500 py-20">No revenue data available.</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-green-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              Top Rated Providers
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {(topProviders || []).length > 0 ? (
              (topProviders || []).map((provider) => (
                <div key={provider.id} className="p-5 hover:bg-green-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-green-600 text-white flex items-center justify-center font-bold">
                          {provider.user?.full_name?.[0] || 'P'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{provider.user?.full_name || 'Provider'}</p>
                          <p className="text-sm text-gray-500">{provider.user?.city || 'City'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold text-gray-900">{(provider.average_rating || 0).toFixed(1)}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${provider.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {provider.is_available ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-gray-500">No approved providers yet.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Recent Bookings
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {(recentBookings || []).length > 0 ? (
              (recentBookings || []).map((booking) => (
                <div key={booking.id} className="p-5 hover:bg-blue-50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">Booking #{booking.id}</p>
                      <p className="text-sm text-gray-500">{booking.customer?.full_name || booking.customer?.email || 'Customer'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₹{Math.round(booking.final_price || booking.quoted_price || 0).toLocaleString()}</p>
                      <span className="text-xs text-gray-500">{booking.status || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-gray-500">No recent bookings yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
