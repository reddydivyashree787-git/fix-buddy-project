import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, MessageCircle, User, CalendarClock } from 'lucide-react';
import { reviewsAPI } from '../../api';

const normalizeListResponse = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.results) return payload.results;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
};

export default function AdminReviews() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () => reviewsAPI.getReviews({ ordering: '-created_at', page_size: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const reviews = normalizeListResponse(data);
  const stats = {
    total: reviews.length,
    avgRating:
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length
        : 0,
    fiveStar: reviews.filter((r) => Number(r.rating) === 5).length,
    recent: reviews.slice(0, 5),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">Failed to load reviews</div>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Star className="w-8 h-8 text-yellow-500" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Reviews & Ratings</h1>
              <p className="text-sm text-slate-500">View all customer reviews and provider ratings.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Reviews', value: stats.total, color: 'bg-blue-50 text-blue-700' },
              { label: 'Average Rating', value: stats.avgRating.toFixed(1), color: 'bg-amber-50 text-amber-700' },
              { label: '5 Star Reviews', value: stats.fiveStar, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Latest Reviews', value: stats.recent.length, color: 'bg-slate-50 text-slate-700' },
            ].map((card) => (
              <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className={`mt-3 text-2xl font-semibold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Review</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Rating</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Customer</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Provider</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Booking</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    No reviews found.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">{review.comment || 'No comment provided.'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                        <Star className="w-4 h-4" />
                        {review.rating || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {review.customer_name || review.customer?.full_name || review.customer || 'Customer'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {review.provider_name || review.provider?.user?.full_name || 'Provider'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {review.booking_id ? `#${review.booking_id}` : review.booking || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(review.created_at || review.updated_at || review.date || Date.now()).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
