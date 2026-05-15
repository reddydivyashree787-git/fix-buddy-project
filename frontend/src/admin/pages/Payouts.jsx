import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import API, { payoutsAPI } from '../../api';

const normalizeListResponse = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.results) return payload.results;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
};

export default function AdminPayouts() {
      const [filterStatus, setFilterStatus] = useState('all');
      const [processingId, setProcessingId] = useState(null);
      const [providers, setProviders] = useState([]);
      const [selectedProvider, setSelectedProvider] = useState('all');

  const { data: payoutsData, isLoading: payoutsLoading, refetch } = useQuery({
    queryKey: ['admin-payouts', selectedProvider],
    queryFn: () => {
      const params = { page_size: 100 };
      if (selectedProvider !== 'all') {
        params.provider = selectedProvider;
      }
      return API.get('/payments/payouts/', { params });
    },
    staleTime: 0,
  });

  // Fetch providers for filter dropdown
  const { data: providersData } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: () => API.get('/auth/providers/'),
    staleTime: 0,
  });

  useEffect(() => {
    if (providersData) {
      const list = normalizeListResponse(providersData);
      setProviders(list);
    }
  }, [providersData]);

  // Fetch payments summary for revenue and commission calculations
  const { data: paymentsData } = useQuery({
    queryKey: ['admin-payments-summary'],
    queryFn: () => API.get('/payments/payments/?page_size=100'),
    staleTime: 0,
  });

  const payouts = normalizeListResponse(payoutsData);
  const payments = normalizeListResponse(paymentsData);

  // Filter payouts by status
  // Filter payouts by status and provider
  const filteredPayouts = payouts.filter((p) => {
    const statusMatch = filterStatus === 'all' ? true : p.status === filterStatus;
    const providerMatch = selectedProvider === 'all' ? true : String(p.provider) === String(selectedProvider);
    return statusMatch && providerMatch;
  });

  // Calculate summary stats
  const totalPayouts = payouts.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const pendingPayouts = payouts
    .filter((p) => ['pending', 'initiated', 'processing'].includes(p.status))
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const completedPayouts = payouts
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const failedPayouts = payouts
    .filter((p) => p.status === 'failed')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  // Revenue and commission calculation
  const totalRevenue = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const totalCommission = payments.reduce((sum, p) => sum + (parseFloat(p.commission_amount) || 0), 0);

  // Data for chart
  const payoutTrendData = [];
  payouts.slice(-30).forEach((payout) => {
    const date = payout.created_at ? new Date(payout.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'N/A';
    const existing = payoutTrendData.find((item) => item.date === date);
    if (existing) {
      existing.amount += parseFloat(payout.amount) || 0;
    } else {
      payoutTrendData.push({ date, amount: parseFloat(payout.amount) || 0 });
    }
  });

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

  const handlePayProvider = async (payoutId) => {
    setProcessingId(payoutId);
    try {
      await payoutsAPI.initiatePayout(payoutId);
      alert('Payout initiated successfully!');
      refetch();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to initiate payout.');
    } finally {
      setProcessingId(null);
    }
  };

  if (payoutsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="w-8 h-8 text-emerald-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payout Management</h1>
          <p className="text-sm text-slate-500">Monitor provider payouts and platform earnings</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Total Payouts', value: `₹${totalPayouts.toFixed(0)}`, icon: DollarSign, color: 'bg-blue-50 text-blue-600' },
          { label: 'Pending', value: `₹${pendingPayouts.toFixed(0)}`, icon: Clock, color: 'bg-amber-50 text-amber-600' },
          { label: 'Completed', value: `₹${completedPayouts.toFixed(0)}`, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(0)}`, icon: TrendingUp, color: 'bg-sky-50 text-sky-600' },
          { label: 'Commission Earned', value: `₹${totalCommission.toFixed(0)}`, icon: DollarSign, color: 'bg-purple-50 text-purple-600' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`inline-flex items-center justify-center rounded-lg ${card.color} p-2 mb-2`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500 font-medium">{card.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Payout Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={payoutTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Payout Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(payouts.reduce((acc, p) => {
              acc[p.status] = (acc[p.status] || 0) + 1;
              return acc;
            }, {})).map(([status, count]) => ({ status: status.charAt(0).toUpperCase() + status.slice(1), count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="status" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pending Payouts Alert */}
      {pendingPayouts > 0 && (
        <div className="bg-amber-50 rounded-3xl border border-amber-200 p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">Pending Payouts</h3>
            <p className="text-sm text-amber-900">
              ₹{pendingPayouts.toFixed(2)} in payouts are pending. Review and process them to maintain provider satisfaction.
            </p>
          </div>
        </div>
      )}

      {/* Payouts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Payout History</h2>
              <p className="text-sm text-slate-500 mt-1">{filteredPayouts.length} payouts</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Provider Filter Dropdown */}
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-sm"
            >
              <option value="all">All Providers</option>
              {providers.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.user?.full_name || prov.name || `Provider ${prov.id}`}
                </option>
              ))}
            </select>
            {['all', 'pending', 'initiated', 'processing', 'completed', 'failed'].map((status) => (
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

        {filteredPayouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Provider</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Amount</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Transfer ID</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700">Date</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{payout.provider_name}</p>
                        <p className="text-xs text-slate-500">Provider ID: {payout.provider}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-900">₹{payout.amount ? parseFloat(payout.amount).toFixed(2) : '0.00'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {payout.razorpay_transfer_id || payout.razorpay_payout_id || 'N/A'}
                      </code>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(payout.status)}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {payout.created_at ? new Date(payout.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {['pending', 'failed'].includes(payout.status) && (
                        <button
                          onClick={() => handlePayProvider(payout.id)}
                          disabled={processingId === payout.id}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {processingId === payout.id ? 'Processing...' : (payout.status === 'failed' ? 'Retry Payout' : 'Pay Provider')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No payouts found</p>
          </div>
        )}
      </div>

      {/* Platform Commission Breakdown */}
      <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-3xl border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-4">Platform Earnings Breakdown</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <p className="text-sm text-slate-600 font-medium">Total Revenue</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">₹{totalRevenue.toFixed(0)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <p className="text-sm text-slate-600 font-medium">Commission Rate</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">15%</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <p className="text-sm text-slate-600 font-medium">Commission Earned</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">₹{totalCommission.toFixed(0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
