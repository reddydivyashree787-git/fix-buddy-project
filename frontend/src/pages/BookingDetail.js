import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { bookingsAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  awaiting_payment: '#fef3c7', pending: '#fef3c7', accepted: '#dbeafe', in_progress: '#ede9fe',
  completed: '#dcfce7', cancelled: '#fee2e2', rejected: '#f3f4f6'
};

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const { data } = await bookingsAPI.getBooking(id);
        setBooking(data);
      } catch (err) {
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  if (loading) {
    return (
      <div className="container page">
        <div className="loading-center">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container page">
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
          <h2 style={{ marginBottom: 12 }}>Booking Not Found</h2>
          <p style={{ color: '#64748b', marginBottom: 24 }}>{error || 'The booking you are looking for does not exist.'}</p>
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <div style={{ marginBottom: 24 }}>
        <Link to="/dashboard" style={{ color: '#2563eb', textDecoration: 'none' }}>
          ← Back to My Bookings
        </Link>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
              Booking #{booking.id}
            </h1>
            <span className={`badge badge-${booking.status}`} style={{ 
              background: STATUS_COLORS[booking.status] || '#f1f5f9',
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 600
            }}>
              {booking.status?.replace('_', ' ').toUpperCase()}
            </span>
            {booking.is_emergency && (
              <span style={{ marginLeft: 12, color: '#dc2626', fontWeight: 600 }}>
                🚨 Emergency
              </span>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, color: '#64748b' }}>Booked on</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {new Date(booking.created_at || booking.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 24 }}>
          <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12 }}>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>Service</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{booking.subcategory_name || booking.subcategory?.name}</div>
            <div style={{ fontSize: 14, color: '#64748b' }}>{booking.subcategory?.category_name || booking.subcategory?.category?.name}</div>
          </div>

          <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12 }}>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>Provider</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{booking.provider_name || booking.provider?.user?.full_name || 'Not assigned'}</div>
            {booking.provider?.user?.phone && (
              <div style={{ fontSize: 14, color: '#64748b' }}>📞 {booking.provider.user.phone}</div>
            )}
          </div>

          <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12 }}>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>Scheduled</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{booking.booking_date || 'Not scheduled'}</div>
            {booking.booking_time && (
              <div style={{ fontSize: 14, color: '#64748b' }}>⏰ {booking.booking_time}</div>
            )}
          </div>

          <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12 }}>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>Total Price</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>
              ₹{Math.round(booking.final_price || booking.quoted_price || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Service Address</h3>
          <div style={{ fontSize: 16, color: '#374151' }}>
            {booking.address}<br />
            {booking.city} {booking.pincode ? `- ${booking.pincode}` : ''}
            {booking.distance_km != null && (
              <div style={{ fontSize: 14, color: '#475569', marginTop: 8 }}>
                📏 Distance to provider: {booking.distance_km} km
              </div>
            )}
          </div>
        </div>

        {booking.description && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24, marginTop: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Description</h3>
            <div style={{ fontSize: 16, color: '#374151' }}>{booking.description}</div>
          </div>
        )}

        {(booking.status === 'pending' || booking.status === 'awaiting_payment') && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24, marginTop: 24 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="btn btn-outline"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}