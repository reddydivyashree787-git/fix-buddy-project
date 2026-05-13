import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import API from '../../api';

const normalizeListResponse = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.results) return payload.results;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
};

export default function AdminPayments() {
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: paymentsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: () => API.get('/payments/payments/?page_size=100'),
    staleTime: 0,
  });

  const payments = normalizeListResponse(paymentsData);
  const filteredPayments = filterStatus === 'all' ? payments : payments.filter(p => p.status === filterStatus);

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
      captured: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Captured' },
      failed: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Failed' },
      refunded: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Refunded' },
    }[status] || { bg: 'bg-slate-100', text: 'text-slate-700', label: status || 'Unknown' };

    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>{config.label}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">All Payments</h1>
              <p className="text-sm text-slate-500">View all customer transactions and commissions.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 p-6">
          <div className="flex gap-2 flex-wrap">
            {['all', 'captured', 'pending', 'failed', 'refunded'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Transaction</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Booking</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Users</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Total Amount</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Commission</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">ID: {payment.id}</p>
                        <p className="text-xs text-slate-500">{payment.razorpay_payment_id || payment.razorpay_order_id || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">#{payment.booking}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900"><span className="font-medium text-slate-500">Cust:</span> {payment.customer_email}</div>
                      <div className="text-sm text-slate-900"><span className="font-medium text-slate-500">Prov:</span> {payment.provider_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-900">₹{payment.amount ? parseFloat(payment.amount).toFixed(2) : '0.00'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-emerald-600">₹{payment.commission_amount ? parseFloat(payment.commission_amount).toFixed(2) : '0.00'}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No payments found</p>
          </div>
        )}
      </div>
    </div>
  );
}
