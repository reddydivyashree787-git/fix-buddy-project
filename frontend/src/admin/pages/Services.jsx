import React, { useEffect, useState } from 'react';
import { Package, Plus, Trash2, Edit2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { servicesAPI } from '../../api';

export default function Services() {
  const [stats, setStats] = useState({ categories: 0, subcategories: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [categoriesRes, subcategoriesRes] = await Promise.all([
          servicesAPI.getCategories(),
          servicesAPI.getSubcategories(),
        ]);
        const categories = categoriesRes.data?.results || categoriesRes.data || [];
        const subcategories = subcategoriesRes.data?.results || subcategoriesRes.data || [];
        setStats({
          categories: categories.length,
          subcategories: subcategories.length,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Services Management</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/admin/services/categories"
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
                <p className="text-sm text-gray-600">Manage service categories</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-blue-600">{stats.categories}</div>
          <p className="text-sm text-gray-600 mt-1">Total categories</p>
        </Link>

        <Link
          to="/admin/services/subcategories"
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Subcategories</h3>
                <p className="text-sm text-gray-600">Manage individual services</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-green-600">{stats.subcategories}</div>
          <p className="text-sm text-gray-600 mt-1">Total subcategories</p>
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Total Categories: <strong>{stats.categories}</strong> | 
          Total Services: <strong>{stats.subcategories}</strong>
        </p>
      </div>
    </div>
  );
}
