import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingDown, TrendingUp, Calendar, Clock } from 'lucide-react';
import API from '../api';

const ProviderEarnings = () => {
  const { data: earningsData, isLoading } = useQuery({
    queryKey: ['provider-earnings'],
    queryFn: () => API.get('/payments/payouts/earnings/'),
    staleTime: 5 * 60 * 1000,
  });

  const earnings = earningsData?.data;

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
      initiated: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Processing' },
      processing: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Processing' },
      completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Completed' },
      failed: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Failed' },
      reversed: { bg: 'bg-slate-50', text: 'text-slate-700', label: 'Reversed' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>{config.label}</span>;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="w-8 h-8 text-emerald-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Earnings</h1>
          <p className="text-sm text-slate-500">Track your payouts and earnings summary</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: 'Total Earned',
            value: `₹${Number(earnings?.total_earned || 0).toFixed(2)}`,
            icon: TrendingUp,
            color: 'bg-emerald-50 text-emerald-600',
          },
          {
            label: 'Pending Payout',
            value: `₹${Number(earnings?.pending_payout || 0).toFixed(2)}`,
            icon: Clock,
            color: 'bg-amber-50 text-amber-600',
          },
          {
            label: 'Withdrawn',
            value: `₹${Number(earnings?.withdrawn || 0).toFixed(2)}`,
            icon: DollarSign,
            color: 'bg-blue-50 text-blue-600',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className={`inline-flex items-center justify-center rounded-xl ${card.color} p-3 mb-3`}>
                <Icon className="w-6 h-6" />
              </div>
              <p className="text-sm text-slate-600 font-medium">{card.label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Payout History</h2>
          <p className="text-sm text-slate-500 mt-1">{earnings?.payouts_count || 0} payouts</p>
        </div>

        {earnings?.payouts && earnings.payouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Booking ID</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Amount</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {earnings.payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900">
                        Booking #{payout.payment_order_id?.split('_')[1] || payout.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-900">₹{Number(payout.amount || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(payout.status)}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {payout.created_at ? new Date(payout.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No payout history yet</p>
            <p className="text-sm text-slate-500 mt-1">Complete service bookings to start earning</p>
          </div>
        )}
      </div>

      {/* Payout Policy Info */}
      <div className="bg-blue-50 rounded-3xl border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-2">How Payouts Work</h3>
        <ul className="text-sm text-blue-900 space-y-2">
          <li className="flex gap-3">
            <span className="font-semibold min-w-max">1. Service Complete:</span>
            <span>Once customer marks service as complete, we process your payout</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold min-w-max">2. Platform Fee:</span>
            <span>15% platform commission is deducted before transfer</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold min-w-max">3. Transfer Time:</span>
            <span>Payouts are transferred within 24-48 hours via NEFT</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold min-w-max">4. Bank Account:</span>
            <span>Ensure your bank details are verified for smooth transfers</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ProviderEarnings;
