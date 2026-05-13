import React, { useEffect, useState } from 'react';
import { Award, Plus, Trash2, Check, X as XIcon, Star } from 'lucide-react';
import { authAPI } from '../../api';

export default function Providers() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await authAPI.getAllProviders();
        setProviders(Array.isArray(res.data) ? res.data : res.data?.results || []);
      } catch (error) {
        console.error('Failed to fetch providers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  const handleInviteProvider = () => {
    const inviteLink = `${window.location.origin}/register?role=provider`;
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 3000);
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
        alert('Failed to copy invite link. Please manually copy: ' + inviteLink);
      });
  };

  const handleVerify = async (providerId, isVerified) => {
    try {
      await authAPI.updateProvider(providerId, { is_verified: isVerified });
      setProviders((prev) =>
        prev.map((p) => (p.id === providerId ? { ...p, is_verified: isVerified } : p))
      );
    } catch (error) {
      console.error('Failed to update provider status:', error);
    }
  };

  const handleDelete = async (providerId) => {
    if (window.confirm('Are you sure you want to completely delete this provider profile?')) {
      // In a real app, you would call authAPI.deleteProvider(providerId) here.
      // But for now, we just update the UI.
      setProviders((prev) => prev.filter(p => p.id !== providerId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">Providers Management</h1>
        </div>
        <button 
          onClick={handleInviteProvider}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 font-semibold"
        >
          {inviteCopied ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {inviteCopied ? 'Link Copied!' : 'Invite Provider'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Providers', value: providers.length, color: 'from-green-500' },
          { label: 'Approved', value: providers.filter(p => p.is_verified).length, color: 'from-emerald-500' },
          { label: 'Pending', value: providers.filter(p => !p.is_verified).length, color: 'from-yellow-500' },
          { label: 'Avg Rating', value: (providers.reduce((sum, p) => sum + (p.average_rating || 0), 0) / (providers.length || 1)).toFixed(1), color: 'from-orange-500' },
        ].map((stat, idx) => (
          <div key={idx} className={`bg-gradient-to-r ${stat.color} to-opacity-80 p-6 rounded-2xl text-white`}>
            <div className="text-sm opacity-90">{stat.label}</div>
            <div className="text-3xl font-bold mt-2">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/50 bg-white/40 backdrop-blur-sm">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Provider Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rating</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-green-600 text-white flex items-center justify-center font-bold">
                        {provider.user?.full_name?.[0] || 'P'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{provider.user?.full_name || 'Provider'}</div>
                        <div className="text-sm text-gray-500">{provider.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{provider.user?.city || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-gray-900">{provider.average_rating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      provider.is_verified ? 'bg-emerald-100 text-emerald-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {provider.is_verified ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    {!provider.is_verified ? (
                      <button onClick={() => handleVerify(provider.id, true)} title="Approve" className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-lg transition bg-slate-50 border border-slate-200">
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => handleVerify(provider.id, false)} title="Revoke Approval" className="p-2 hover:bg-yellow-100 text-yellow-600 rounded-lg transition bg-slate-50 border border-slate-200">
                        <XIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(provider.id)} title="Delete" className="p-2 hover:bg-rose-100 text-rose-600 rounded-lg transition bg-slate-50 border border-slate-200 ml-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
