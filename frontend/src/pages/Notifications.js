import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, Filter, Search } from 'lucide-react';
import { notificationsAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    is_read: '',
    notification_type: '',
    search: ''
  });

  useEffect(() => {
    if (user) {
      fetchNotifications(1, true);
    }
  }, [user, filters]);

  const fetchNotifications = async (pageNum = 1, reset = false) => {
    try {
      setLoading(true);
      const params = {
        page: pageNum,
        page_size: 20,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await notificationsAPI.getNotifications(params);
      const newNotifications = response.data.results || response.data;

      if (reset) {
        setNotifications(newNotifications);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
      }

      setHasMore(newNotifications.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationsAPI.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    if (type.includes('booking')) return '📅';
    if (type.includes('payment')) return '💳';
    if (type.includes('review')) return '⭐';
    if (type.includes('registration')) return '🎉';
    if (type.includes('admin') || type.includes('system')) return '⚙️';
    return '🔔';
  };

  const getTypeDisplayName = (type) => {
    const typeMap = {
      'user_registration_success': 'Account',
      'user_booking_confirmed': 'Booking',
      'user_booking_updated': 'Booking',
      'user_booking_cancelled': 'Booking',
      'user_payment_success': 'Payment',
      'user_payment_failed': 'Payment',
      'user_provider_response': 'Support',
      'user_support_update': 'Support',
      'user_promotional': 'Promotional',
      'user_reminder': 'Reminder',
      'user_account_change': 'Account',
      'provider_new_booking': 'Booking',
      'provider_booking_cancelled': 'Booking',
      'provider_new_review': 'Review',
      'provider_payment_received': 'Payment',
      'provider_payout_processed': 'Payment',
      'provider_account_approved': 'Account',
      'provider_account_rejected': 'Account',
      'provider_profile_flagged': 'Account',
      'provider_subscription_reminder': 'Account',
      'provider_new_message': 'Message',
      'admin_user_registration': 'Admin',
      'admin_provider_registration': 'Admin',
      'admin_provider_verification': 'Admin',
      'admin_user_complaint': 'Admin',
      'admin_payment_failed': 'Admin',
      'admin_system_alert': 'Admin',
      'admin_support_ticket': 'Admin',
      'admin_content_flagged': 'Admin',
      'admin_bulk_operation': 'Admin',
    };
    return typeMap[type] || 'General';
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="container page">
      <div className="section-header">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-600" />
          <h1 className="section-title">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={filters.is_read}
              onChange={(e) => setFilters(prev => ({ ...prev, is_read: e.target.value }))}
            >
              <option value="">All</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={filters.notification_type}
              onChange={(e) => setFilters(prev => ({ ...prev, notification_type: e.target.value }))}
            >
              <option value="">All Types</option>
              <option value="user_booking_confirmed">Bookings</option>
              <option value="user_payment_success">Payments</option>
              <option value="user_promotional">Promotional</option>
              <option value="user_account_change">Account</option>
              {user?.role === 'provider' && (
                <>
                  <option value="provider_new_booking">New Bookings</option>
                  <option value="provider_new_review">Reviews</option>
                  <option value="provider_payment_received">Payments</option>
                </>
              )}
              {user?.role === 'admin' && (
                <>
                  <option value="admin_user_registration">Registrations</option>
                  <option value="admin_system_alert">System Alerts</option>
                </>
              )}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                className="form-input pl-10"
                placeholder="Search notifications..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn btn-primary flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 && !loading ? (
          <div className="card text-center py-12">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
            <p className="text-gray-600">
              {Object.values(filters).some(v => v) ?
                'Try adjusting your filters to see more notifications.' :
                'You don\'t have any notifications yet. We\'ll notify you when something important happens!'
              }
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`card border-l-4 ${
                !notification.is_read
                  ? 'border-l-blue-500 bg-blue-50'
                  : 'border-l-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl flex-shrink-0">
                  {getNotificationIcon(notification.notification_type)}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {notification.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          !notification.is_read
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {getTypeDisplayName(notification.notification_type)}
                        </span>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>

                      <p className="text-gray-700 mb-3">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{formatTimeAgo(notification.created_at)}</span>
                        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                          <span className="text-blue-600">
                            {Object.keys(notification.metadata).length} detail(s)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="text-center py-6">
            <button
              onClick={() => fetchNotifications(page + 1)}
              className="btn btn-outline"
            >
              Load More Notifications
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading notifications...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;