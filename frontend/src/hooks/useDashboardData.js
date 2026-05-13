import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { authAPI, bookingsAPI, servicesAPI } from '../api';

const staleTime = 30 * 1000;
const queryOptions = { staleTime, refetchOnWindowFocus: false };

const normalizeListResponse = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.results) return payload.results;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
};

export function useDashboardData() {
  const queries = useQueries({
    queries: [
      {
        queryKey: ['dashboard', 'analytics'],
        queryFn: () => bookingsAPI.getAnalytics(),
        ...queryOptions,
      },
      {
        queryKey: ['dashboard', 'bookings'],
        queryFn: () => bookingsAPI.getBookings({ page_size: 100, ordering: '-created_at' }),
        ...queryOptions,
      },
      {
        queryKey: ['dashboard', 'users'],
        queryFn: () => authAPI.getAllUsers(),
        ...queryOptions,
      },
      {
        queryKey: ['dashboard', 'providers'],
        queryFn: () => authAPI.getAllProviders(),
        ...queryOptions,
      },
      {
        queryKey: ['dashboard', 'emergencies'],
        queryFn: () => bookingsAPI.getEmergencies(),
        ...queryOptions,
      },
      {
        queryKey: ['dashboard', 'categories'],
        queryFn: () => servicesAPI.getCategories(),
        ...queryOptions,
      },
      {
        queryKey: ['dashboard', 'subcategories'],
        queryFn: () => servicesAPI.getSubcategories(),
        ...queryOptions,
      },
    ],
  });

  const [analyticsQuery, bookingsQuery, usersQuery, providersQuery, emergenciesQuery, categoriesQuery, subcategoriesQuery] = queries;
  const isLoading = queries.some((query) => query.isLoading);
  const isError = queries.some((query) => query.isError);

  const data = useMemo(() => {
    const analytics = analyticsQuery.data?.data || analyticsQuery.data || {};
    const bookings = normalizeListResponse(bookingsQuery.data);
    const users = normalizeListResponse(usersQuery.data);
    const providers = normalizeListResponse(providersQuery.data);
    const emergencies = normalizeListResponse(emergenciesQuery.data);
    const categories = normalizeListResponse(categoriesQuery.data);
    const subcategories = normalizeListResponse(subcategoriesQuery.data);

    const totalRevenue = bookings.reduce((sum, booking) => {
      const price = parseFloat(booking.final_price || booking.quoted_price || 0);
      return sum + (Number.isFinite(price) ? price : 0);
    }, 0);

    const bookingCountsByDay = {};
    const revenueByDay = {};
    const categoryMap = {};

    bookings.forEach((booking) => {
      const createdAt = booking.booking_date || booking.created_at || booking.createdAt || booking.created;
      const date = createdAt ? new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Unknown';
      bookingCountsByDay[date] = (bookingCountsByDay[date] || 0) + 1;
      const price = parseFloat(booking.final_price || booking.quoted_price || 0);
      revenueByDay[date] = (revenueByDay[date] || 0) + (Number.isFinite(price) ? price : 0);

      const categoryName = booking.subcategory?.category?.name || booking.subcategory?.name || 'Unknown';
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + 1;
    });

    const sortedDates = Object.keys(bookingCountsByDay).sort((a, b) => {
      const aDate = new Date(a);
      const bDate = new Date(b);
      return aDate - bDate;
    });

    return {
      stats: {
        totalUsers: users.length,
        totalProviders: providers.length,
        totalBookings: analytics.total_bookings || bookings.length,
        totalRevenue: analytics.average_completed_price ? analytics.average_completed_price * bookings.length : totalRevenue,
        pendingBookings: analytics.by_status?.find((item) => item.status === 'pending')?.count || 0,
        emergencyRequests: emergencies.length,
      },
      bookingsTrend: sortedDates.map((date) => ({ date, bookings: bookingCountsByDay[date] || 0 })),
      revenueTrend: sortedDates.map((date) => ({ date, revenue: Math.round(revenueByDay[date] || 0) })),
      categoryDistribution: Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
      recentBookings: bookings
        .slice()
        .sort((a, b) => new Date(b.booking_date || b.created_at || b.createdAt || b.created) - new Date(a.booking_date || a.created_at || a.createdAt || a.created))
        .slice(0, 10),
      topServices: subcategories.slice(0, 6).map((sub, idx) => ({
        id: sub.id,
        name: sub.name,
        base_price: sub.base_price,
        status: sub.is_active ? 'Active' : 'Inactive',
        color: ['from-blue-500', 'from-green-500', 'from-purple-500', 'from-yellow-500', 'from-pink-500', 'from-indigo-500'][idx % 6],
      })),
      topProviders: providers
        .filter(p => p.is_verified)
        .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
        .slice(0, 5),
    };
  }, [analyticsQuery.data, bookingsQuery.data, usersQuery.data, providersQuery.data, emergenciesQuery.data, categoriesQuery.data, subcategoriesQuery.data]);

  return {
    data,
    isLoading,
    isError,
    queries,
    refetch: () => queries.forEach((query) => query.refetch()),
  };
}
