import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Package, UserCheck, Calendar, AlertCircle, Star, MessageCircle, BarChart3, DollarSign, Settings, Activity } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: Package, label: 'Services', path: '/admin/services', children: [
    { label: 'Categories', path: '/admin/services/categories' },
    { label: 'Subcategories', path: '/admin/services/subcategories' },
  ] },
  { icon: UserCheck, label: 'Providers', path: '/admin/providers' },
  { icon: Calendar, label: 'Bookings', path: '/admin/bookings' },
  { icon: AlertCircle, label: 'Emergency Requests', path: '/admin/emergency' },
  { icon: Star, label: 'Reviews & Ratings', path: '/admin/reviews' },
  { icon: MessageCircle, label: 'Chatbot Logs', path: '/admin/chatbot' },
  { icon: BarChart3, label: 'Analytics & Reports', path: '/admin/analytics' },
  { icon: DollarSign, label: 'Payments', path: '/admin/payments', children: [
    { label: 'All Payments', path: '/admin/payments' },
    { label: 'Provider Payouts', path: '/admin/payouts' }
  ] },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
  { icon: Activity, label: 'Login Activity', path: '/admin/login-activity' },
];

export default function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();

  return (
    <aside className="bg-slate-900 border-r border-slate-800 h-screen p-4 transition-all duration-300 w-64 flex flex-col shadow-2xl z-40">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onToggle} className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <nav className="flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          const hasChildren = item.children;

          return (
            <div key={item.path} className="mb-2">
              <Link
                to={item.path}
                className={`flex items-center p-3 rounded-xl transition-all duration-300 hover:translate-x-1 ${
                  active
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="block whitespace-nowrap">{item.label}</span>
              </Link>
              {hasChildren && (
                <div className="ml-6 mt-2 space-y-1 border-l border-slate-700 pl-3">
                  {item.children.map((child) => (
                    <Link
                      key={child.path}
                      to={child.path}
                      className="block py-1.5 px-3 text-sm rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
