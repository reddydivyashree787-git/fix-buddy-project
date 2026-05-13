import React, { useEffect, useState } from 'react';
import { Package, Plus, Trash2, Edit2, X } from 'lucide-react';
import { servicesAPI } from '../../api';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await servicesAPI.getCategories();
        console.log('Categories response:', res.data);
        
        // Handle multiple response formats
        let catData = res.data;
        if (catData && typeof catData === 'object') {
          if (Array.isArray(catData)) {
            setCategories(catData);
          } else if (catData.results) {
            setCategories(catData.results);
          } else if (catData.data) {
            setCategories(Array.isArray(catData.data) ? catData.data : catData.data.results || []);
          } else {
            setCategories(Object.values(catData).filter(v => typeof v === 'object' && v.id) || []);
          }
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const openModal = () => setIsModalOpen(true);
  const openEditModal = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      icon: category.icon || '',
    });
    setIsEditModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      name: '',
      description: '',
      icon: '',
    });
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', icon: '' });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCategory = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        icon: formData.icon.trim(),
      };

      await servicesAPI.createCategory(payload);
      
      const res = await servicesAPI.getCategories();
      
      // Handle multiple response formats
      let catData = res.data;
      if (catData && typeof catData === 'object') {
        if (Array.isArray(catData)) {
          setCategories(catData);
        } else if (catData.results) {
          setCategories(catData.results);
        } else if (catData.data) {
          setCategories(Array.isArray(catData.data) ? catData.data : catData.data.results || []);
        } else {
          setCategories(Object.values(catData).filter(v => typeof v === 'object' && v.id) || []);
        }
      } else {
        setCategories([]);
      }
      
      closeModal();
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const handleEditCategory = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !editingCategory) {
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        icon: formData.icon.trim(),
      };

      await servicesAPI.updateCategory(editingCategory.id, payload);
      
      const res = await servicesAPI.getCategories();
      
      // Handle multiple response formats
      let catData = res.data;
      if (catData && typeof catData === 'object') {
        if (Array.isArray(catData)) {
          setCategories(catData);
        } else if (catData.results) {
          setCategories(catData.results);
        } else if (catData.data) {
          setCategories(Array.isArray(catData.data) ? catData.data : catData.data.results || []);
        } else {
          setCategories(Object.values(catData).filter(v => typeof v === 'object' && v.id) || []);
        }
      } else {
        setCategories([]);
      }
      
      closeEditModal();
    } catch (error) {
      console.error('Failed to update category:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Categories Management</h1>
        </div>
        <button
          onClick={openModal}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 font-semibold"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/50 bg-white/40 backdrop-blur-sm">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Category Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Subcategories</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{category.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 max-w-xs truncate">{category.description || 'No description'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
                      {category.subcategory_count || 0} services
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => openEditModal(category)} className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition">
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
          Total Categories: <strong className="text-lg ml-1">{categories.length}</strong>
        </p>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
          <div className="w-full max-w-xl rounded-3xl bg-white/90 backdrop-blur-2xl p-6 shadow-2xl border border-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Add New Category</h2>
                <p className="text-sm text-gray-500">Create a new service category.</p>
              </div>
              <button onClick={closeModal} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <label className="space-y-1 text-sm text-gray-700">
                Name
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Category name"
                  required
                />
              </label>
              <label className="space-y-1 text-sm text-gray-700">
                Description
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Category description"
                  rows={3}
                />
              </label>
              <label className="space-y-1 text-sm text-gray-700">
                Icon (optional)
                <input
                  name="icon"
                  value={formData.icon}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Icon class or emoji (e.g., 🔧)"
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
                  Save Category
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
                <h2 className="text-2xl font-bold text-gray-900">Edit Category</h2>
                <p className="text-sm text-gray-500">Update category details.</p>
              </div>
              <button onClick={closeEditModal} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditCategory} className="space-y-4">
              <label className="space-y-1 text-sm text-gray-700">
                Name
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Category name"
                  required
                />
              </label>
              <label className="space-y-1 text-sm text-gray-700">
                Description
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Category description"
                  rows={3}
                />
              </label>
              <label className="space-y-1 text-sm text-gray-700">
                Icon (optional)
                <input
                  name="icon"
                  value={formData.icon}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Icon class or emoji (e.g., 🔧)"
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
                  Update Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
