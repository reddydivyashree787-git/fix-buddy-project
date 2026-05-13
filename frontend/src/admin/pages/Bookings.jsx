import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CalendarDays, CheckCircle, User, TrendingUp } from 'lucide-react';
import { bookingsAPI } from '../../api';

const normalizeListResponse = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.results) return payload.results;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
};

export default function AdminBookings() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => bookingsAPI.getBookings({ page_size: 100, ordering: '-created_at' }),
    staleTime: 5 * 60 * 1000,
  });

  const bookings = normalizeListResponse(data);
  const stats = {
    total: bookings.length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  };

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
          <div className="text-red-500 mb-4">Failed to load bookings</div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="w-8 h-8 text-sky-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Bookings</h1>
              <p className="text-sm text-slate-500">View all service bookings for admin review.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Total bookings', value: stats.total, icon: CalendarDays, color: 'bg-blue-50 text-blue-700' },
              { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Pending', value: stats.pending, icon: TrendingUp, color: 'bg-amber-50 text-amber-700' },
              { label: 'Cancelled', value: stats.cancelled, icon: User, color: 'bg-rose-50 text-rose-700' },
            ].map((card) => (
              <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`rounded-2xl p-3 ${card.color}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{card.label}</p>
                    <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Booking</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Customer</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Provider</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Service</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Total</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Booked</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                  No bookings found.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-900">#{booking.id}</div>
                    <div className="text-xs text-slate-500">{booking.status?.toUpperCase()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{booking.customer_name || booking.customer?.full_name || booking.customer}</div>
                    <div className="text-xs text-slate-500">{booking.customer_email || booking.customer?.email || ''}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{booking.provider_name || booking.provider?.user?.full_name || booking.provider}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{booking.subcategory_name || booking.subcategory?.name || 'N/A'}</div>
                    <div className="text-xs text-slate-500">{booking.subcategory?.category_name || booking.subcategory?.category?.name || ''}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">₹{Math.round(booking.final_price || booking.quoted_price || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      booking.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {booking.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(booking.booking_date || booking.created_at || booking.createdAt || booking.created).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
