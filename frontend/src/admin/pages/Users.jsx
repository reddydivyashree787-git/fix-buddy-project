import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Plus, Trash2, Edit2, Shield, X } from 'lucide-react';
import { authAPI } from '../../api';

export default function UserManagement() {
  const [userList, setUserList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Customer',
    city: '',
    status: 'active',
  });

  const { data: fetchedUsers = [], isLoading, error } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => authAPI.getAllUsers().then((res) => {
      const payload = res.data;
      if (Array.isArray(payload)) return payload;
      if (payload?.results) return payload.results;
      return payload?.data || [];
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    setUserList(fetchedUsers || []);
  }, [fetchedUsers]);

  const openModal = () => setIsModalOpen(true);
  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.full_name || user.name || '',
      email: user.email || '',
      role: user.role || 'Customer',
      city: user.city || '',
      status: user.status || (user.is_active ? 'active' : 'inactive') || 'active',
    });
    setIsEditModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '', email: '', role: 'Customer', city: '', status: 'active' });
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'Customer', city: '', status: 'active' });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddUser = (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.city.trim()) {
      return;
    }

    const newUser = {
      id: Date.now(),
      full_name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role.toLowerCase(),
      city: formData.city.trim(),
      status: formData.status,
      is_active: formData.status === 'active',
      date_joined: new Date().toISOString(),
    };

    setUserList((prev) => [newUser, ...prev]);
    closeModal();
  };

  const handleEditUser = (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.city.trim() || !editingUser) {
      return;
    }

    const updatedUser = {
      ...editingUser,
      full_name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role.toLowerCase(),
      city: formData.city.trim(),
      status: formData.status,
      is_active: formData.status === 'active',
    };

    setUserList((prev) => prev.map((u) => (u.id === editingUser.id ? updatedUser : u)));
    closeEditModal();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">Failed to load users</div>
          <p className="text-gray-600">Please try again later</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: userList.length,
    providers: userList.filter((u) => u.role === 'provider').length,
    customers: userList.filter((u) => u.role === 'customer').length,
    active: userList.filter((u) => u.is_active).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        </div>
        <button
          onClick={openModal}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 font-semibold"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.total, color: 'from-blue-500' },
          { label: 'Providers', value: stats.providers, color: 'from-green-500' },
          { label: 'Customers', value: stats.customers, color: 'from-purple-500' },
          { label: 'Active', value: stats.active, color: 'from-emerald-500' },
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Join Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-indigo-600 text-white flex items-center justify-center font-bold">
                        {(user.full_name || user.email)[0]?.toUpperCase()}
                      </div>
                      <div className="font-medium text-gray-900">{user.full_name || user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.role === 'provider' && <Shield className="w-4 h-4 text-green-600" />}
                      <span className="text-sm font-medium text-gray-900">{user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">{user.city || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => openEditModal(user)} className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
          <div className="w-full max-w-xl rounded-3xl bg-white/90 backdrop-blur-2xl p-6 shadow-2xl border border-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Add New User</h2>
                <p className="text-sm text-gray-500">Create a user account for admin tracking.</p>
              </div>
              <button onClick={closeModal} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-700">
                  Name
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="User name"
                    required
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-700">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="user@example.com"
                    required
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-700">
                  Role
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Customer">Customer</option>
                    <option value="Provider">Provider</option>
                    <option value="Admin">Admin</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm text-gray-700">
                  City
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="City"
                    required
                  />
                </label>
              </div>
              <label className="space-y-1 text-sm text-gray-700">
                Status
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </label>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
          <div className="w-full max-w-xl rounded-3xl bg-white/90 backdrop-blur-2xl p-6 shadow-2xl border border-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit User</h2>
                <p className="text-sm text-gray-500">Update user details.</p>
              </div>
              <button onClick={closeEditModal} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-700">
                  Name
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="User name"
                    required
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-700">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="user@example.com"
                    required
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-700">
                  Role
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Customer">Customer</option>
                    <option value="Provider">Provider</option>
                    <option value="Admin">Admin</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm text-gray-700">
                  City
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="City"
                    required
                  />
                </label>
              </div>
              <label className="space-y-1 text-sm text-gray-700">
                Status
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </label>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
