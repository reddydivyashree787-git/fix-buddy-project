import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Clock, MapPin, Phone, ShieldAlert } from 'lucide-react';
import { bookingsAPI } from '../../api';

const normalizeListResponse = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.results) return payload.results;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
};

export default function AdminEmergency() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-emergencies'],
    queryFn: () => bookingsAPI.getEmergencies(),
    staleTime: 5 * 60 * 1000,
  });

  const emergencies = normalizeListResponse(data);
  const stats = {
    total: emergencies.length,
    active: emergencies.filter((item) => item.status === 'active').length,
    completed: emergencies.filter((item) => item.status === 'completed').length,
    cancelled: emergencies.filter((item) => item.status === 'cancelled').length,
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
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load emergency booking details.</p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <ShieldAlert className="w-8 h-8 text-rose-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Emergency Requests</h1>
              <p className="text-sm text-slate-500">Review emergency bookings submitted by customers.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Total emergencies', value: stats.total, color: 'bg-rose-50 text-rose-700' },
              { label: 'Active', value: stats.active, color: 'bg-amber-50 text-amber-700' },
              { label: 'Completed', value: stats.completed, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Cancelled', value: stats.cancelled, color: 'bg-slate-50 text-slate-700' },
            ].map((card) => (
              <div key={card.label} className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm`}>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className={`mt-3 text-2xl font-semibold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Request</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Customer</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Service</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Provider</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Location</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Contact</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Requested</th>
            </tr>
          </thead>
          <tbody>
            {emergencies.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                  No emergency bookings found.
                </td>
              </tr>
            ) : (
              emergencies.map((emergency) => (
                <tr key={emergency.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-900">#{emergency.id}</div>
                    <div className="text-xs text-slate-500">{emergency.subcategory_name || emergency.subcategory?.name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{emergency.customer_name || emergency.customer?.full_name || emergency.customer || 'Customer'}</div>
                    <div className="text-xs text-slate-500">{emergency.customer_email || emergency.customer?.email || ''}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">{emergency.subcategory_name || emergency.subcategory?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">{emergency.provider_name || emergency.provider?.user?.full_name || 'Unassigned'}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" />{emergency.address || emergency.customer?.address || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{emergency.customer_phone || emergency.customer?.phone || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      emergency.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      emergency.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      emergency.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {emergency.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(emergency.created_at || emergency.booking_date || emergency.updated_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
