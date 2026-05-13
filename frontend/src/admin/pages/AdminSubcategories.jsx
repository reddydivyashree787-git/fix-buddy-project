import React, { useEffect, useState } from 'react';
import { Package, Plus, Trash2, Edit2, X } from 'lucide-react';
import { servicesAPI } from '../../api';

export default function AdminSubcategories() {
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    base_price: '',
    estimated_duration_hours: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subRes, catRes] = await Promise.all([
          servicesAPI.getSubcategories(),
          servicesAPI.getCategories(),
        ]);
        console.log('Subcategories response:', subRes.data);
        console.log('Subcategories response status:', subRes.status);
        
        // Handle both paginated and non-paginated responses
        let subData = subRes.data;
        if (subData && typeof subData === 'object') {
          if (Array.isArray(subData)) {
            setSubcategories(subData);
          } else if (subData.results) {
            setSubcategories(subData.results);
          } else if (subData.data) {
            setSubcategories(Array.isArray(subData.data) ? subData.data : subData.data.results || []);
          } else {
            setSubcategories(Object.values(subData).filter(v => typeof v === 'object' && v.id) || []);
          }
        } else {
          setSubcategories([]);
        }
        
        // Handle categories response
        let catData = catRes.data;
        if (catData && typeof catData === 'object') {
          if (Array.isArray(catData)) {
            setCategories(catData);
          } else if (catData.results) {
            setCategories(catData.results);
          } else if (catData.data) {
            setCategories(Array.isArray(catData.data) ? catData.data : catData.data.results || []);
          }
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const openModal = () => setIsModalOpen(true);
  const openEditModal = (subcategory) => {
    setEditingSubcategory(subcategory);
    setFormData({
      name: subcategory.name || '',
      category: subcategory.category?.toString() || '',
      description: subcategory.description || '',
      base_price: subcategory.base_price || '',
      estimated_duration_hours: subcategory.estimated_duration_hours || '',
    });
    setIsEditModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      name: '',
      category: '',
      description: '',
      base_price: '',
      estimated_duration_hours: '',
    });
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingSubcategory(null);
    setFormData({ name: '', category: '', description: '', base_price: '', estimated_duration_hours: '' });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubcategory = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.category || !formData.base_price) {
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        category: parseInt(formData.category),
        description: formData.description.trim(),
        base_price: parseFloat(formData.base_price),
        estimated_duration_hours: parseFloat(formData.estimated_duration_hours) || 1.0,
      };

      console.log('Creating subcategory with payload:', payload);
      
      const response = await servicesAPI.createSubcategory(payload);
      console.log('Create subcategory response:', response);
      
      // Refresh the list - fetch fresh data
      const res = await servicesAPI.getSubcategories();
      console.log('After create - subcategories:', res.data);
      
      // Handle response the same way as in useEffect
      let newSubData = res.data;
      if (newSubData && typeof newSubData === 'object') {
        if (Array.isArray(newSubData)) {
          setSubcategories(newSubData);
        } else if (newSubData.results) {
          setSubcategories(newSubData.results);
        } else if (newSubData.data) {
          setSubcategories(Array.isArray(newSubData.data) ? newSubData.data : newSubData.data.results || []);
        } else {
          setSubcategories(Object.values(newSubData).filter(v => typeof v === 'object' && v.id) || []);
        }
      } else {
        setSubcategories([]);
      }
      
      closeModal();
    } catch (error) {
      console.error('Failed to add subcategory:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
    }
  };

  const handleEditSubcategory = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.category || !formData.base_price || !editingSubcategory) {
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        category: parseInt(formData.category),
        description: formData.description.trim(),
        base_price: parseFloat(formData.base_price),
        estimated_duration_hours: parseFloat(formData.estimated_duration_hours) || 1.0,
      };

      await servicesAPI.updateSubcategory(editingSubcategory.id, payload);
      
      const res = await servicesAPI.getSubcategories();
      let newSubData = res.data;
      if (newSubData && typeof newSubData === 'object') {
        if (Array.isArray(newSubData)) {
          setSubcategories(newSubData);
        } else if (newSubData.results) {
          setSubcategories(newSubData.results);
        } else if (newSubData.data) {
          setSubcategories(Array.isArray(newSubData.data) ? newSubData.data : newSubData.data.results || []);
        } else {
          setSubcategories(Object.values(newSubData).filter(v => typeof v === 'object' && v.id) || []);
        }
      } else {
        setSubcategories([]);
      }
      
      closeEditModal();
    } catch (error) {
      console.error('Failed to update subcategory:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Subcategories Management</h1>
        </div>
        <button
          onClick={openModal}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 font-semibold"
        >
          <Plus className="w-5 h-5" />
          Add Subcategory
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/50 bg-white/40 backdrop-blur-sm">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Service Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Base Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Duration</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subcategories.map((subcategory) => (
                <tr key={subcategory.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{subcategory.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
                      {subcategory.category_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">₹{subcategory.base_price}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">{subcategory.estimated_duration_hours}h</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => openEditModal(subcategory)} className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition">
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

      <div className="bg-white/60 backdrop-blur-md border border-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm text-blue-900">
          Total Subcategories: <strong className="text-lg ml-1">{subcategories.length}</strong>
        </p>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
          <div className="w-full max-w-xl rounded-3xl bg-white/90 backdrop-blur-2xl p-6 shadow-2xl border border-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Add New Subcategory</h2>
                <p className="text-sm text-gray-500">Create a new service subcategory.</p>
              </div>
              <button onClick={closeModal} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubcategory} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-700">
                  Name
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Service name"
                    required
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-700">
                  Category
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-700">
                  Base Price (₹)
                  <input
                    type="number"
                    step="0.01"
                    name="base_price"
                    value={formData.base_price}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="100.00"
                    required
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-700">
                  Duration (hours)
                  <input
                    type="number"
                    step="0.5"
                    name="estimated_duration_hours"
                    value={formData.estimated_duration_hours}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="1.0"
                    required
                  />
                </label>
              </div>
              <label className="space-y-1 text-sm text-gray-700">
                Description
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Service description"
                  rows={3}
                />
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
                  Save Subcategory
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
                <h2 className="text-2xl font-bold text-gray-900">Edit Subcategory</h2>
                <p className="text-sm text-gray-500">Update subcategory details.</p>
              </div>
              <button onClick={closeEditModal} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubcategory} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-700">
                  Name
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Service name"
                    required
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-700">
                  Category
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-700">
                  Base Price (₹)
                  <input
                    type="number"
                    step="0.01"
                    name="base_price"
                    value={formData.base_price}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="100.00"
                    required
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-700">
                  Duration (hours)
                  <input
                    type="number"
                    step="0.5"
                    name="estimated_duration_hours"
                    value={formData.estimated_duration_hours}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="1.0"
                    required
                  />
                </label>
              </div>
              <label className="space-y-1 text-sm text-gray-700">
                Description
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Service description"
                  rows={3}
                />
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
                  Update Subcategory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
