import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingsAPI, reviewsAPI, authAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import PaymentCheckout from '../components/PaymentCheckout';

const STATUS_COLORS = {
  awaiting_payment: '#fef3c7', pending:'#fef3c7', accepted:'#dbeafe', in_progress:'#ede9fe',
  completed:'#dcfce7', cancelled:'#fee2e2', rejected:'#f3f4f6'
};

export default function CustomerDashboard() {
  const { user, refreshUser } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [profileLoading, setProfileLoading] = useState(false);

  const startEditing = () => {
    setProfileForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      pincode: user?.pincode || '',
    });
    setIsEditingProfile(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await authAPI.updateProfile(profileForm);
      await refreshUser();
      setIsEditingProfile(false);
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };
  const [tab, setTab]       = useState('overview');
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm]   = useState({ rating:5, comment:'' });
  const [reviewMsg, setReviewMsg]     = useState('');
  const [paymentModal, setPaymentModal] = useState(null);

  useEffect(() => {
    Promise.all([
      bookingsAPI.getBookings(),
      reviewsAPI.getReviews()
    ]).then(([b, r]) => {
      setBookings(b.data.results || b.data);
      setReviews(r.data.results || r.data);
    }).finally(() => setLoading(false));
  }, []);

  const cancelBooking = async (id) => {
    await bookingsAPI.updateStatus(id, { status:'cancelled' });
    setBookings(b => b.map(x => x.id === id ? {...x, status:'cancelled'} : x));
  };

  const submitReview = async () => {
    try {
      await reviewsAPI.createReview({ ...reviewForm, booking: reviewModal.id });
      setReviewMsg('Review submitted! Thank you.');
      setTimeout(() => { setReviewModal(null); setReviewMsg(''); }, 2000);
    } catch { setReviewMsg('Failed. You may have already reviewed this booking.'); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const stats = {
    total: bookings.length,
    completed: bookings.filter(b => b.status === 'completed').length,
    pending: bookings.filter(b => b.status === 'pending' || b.status === 'awaiting_payment').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  const renderBookingCard = (b) => (
    <div key={b.id} className="card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
            <span style={{ fontWeight:700, fontSize:16 }}>{b.subcategory_name}</span>
            <span className={`badge badge-${b.status}`}>{b.status.replace('_',' ')}</span>
            {b.is_emergency && <span style={{ fontSize:12, color:'#dc2626' }}>🚨 Emergency</span>}
          </div>
          <div style={{ fontSize:14, color:'#64748b' }}>
            👷 {b.provider_name} · 📅 {b.booking_date} {b.booking_time} · 📍 {b.city}
          </div>
          <div style={{ fontSize:14, marginTop:4 }}>
            Price: <strong>₹{b.final_price || b.quoted_price}</strong>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {(b.status === 'pending' || b.status === 'awaiting_payment') && (
            <>
              {b.status === 'awaiting_payment' && b.payment_method === 'online' && (
                <button className="btn btn-primary btn-sm" onClick={() => setPaymentModal(b)}>
                  💳 Pay Now
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => cancelBooking(b.id)}>
                Cancel
              </button>
            </>
          )}
          {b.status === 'completed' && (
            <button className="btn btn-sm"
              style={{ background:'#fef3c7', color:'#92400e', border:'1px solid #fde68a' }}
              onClick={() => setReviewModal(b)}>
              ⭐ Leave Review
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container page responsive-dashboard" style={{ display: 'flex', gap: isSidebarOpen ? 32 : 16, alignItems: 'flex-start', minHeight: 'calc(100vh - 64px)', transition: 'gap 0.3s' }}>
      {/* Sidebar */}
      <div className="responsive-sidebar" style={{ width: isSidebarOpen ? 250 : 80, flexShrink: 0, position: 'sticky', top: 88, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: isSidebarOpen ? 'space-between' : 'center', alignItems: 'center', marginBottom: 28 }}>
          {isSidebarOpen && (
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>Welcome, {user?.first_name}! 👋</h1>
              <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Manage your bookings and account</p>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, color: '#64748b' }}
            title="Toggle Sidebar"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="responsive-hide-mobile">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="responsive-sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 32 }}>
          {[
            { id: 'overview', icon: '📊', label: 'Overview' },
            { id: 'bookings', icon: '📋', label: 'My Bookings' },
            { id: 'profile', icon: '👤', label: 'My Profile' },
            { id: 'payments', icon: '💳', label: 'Payments' },
            { id: 'reviews', icon: '⭐', label: 'My Reviews' },
            { id: 'settings', icon: '⚙️', label: 'Settings' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: isSidebarOpen ? 12 : 0, padding: isSidebarOpen ? '12px 16px' : '12px',
                justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                borderRadius: 12, border: 'none', cursor: 'pointer',
                background: tab === t.id ? '#eff6ff' : 'transparent',
                color: tab === t.id ? '#2563eb' : '#64748b',
                fontWeight: tab === t.id ? 600 : 500,
                transition: 'all 0.2s ease',
                textAlign: 'left',
                width: '100%',
                whiteSpace: 'nowrap'
              }}
              title={!isSidebarOpen ? t.label : ''}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
              {isSidebarOpen && <span className="sidebar-text" style={{ transition: 'opacity 0.2s' }}>{t.label}</span>}
            </button>
          ))}
        </div>

        <div className="responsive-sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isSidebarOpen ? (
            <>
              <Link to="/categories" className="btn btn-primary" style={{ textAlign: 'center' }}>+ Book a Service</Link>
              <Link to="/emergency" className="btn btn-danger" style={{ textAlign: 'center' }}>🚨 Emergency</Link>
            </>
          ) : (
            <>
              <Link to="/categories" className="btn btn-primary" style={{ textAlign: 'center', padding: '12px 0' }} title="Book a Service">+</Link>
              <Link to="/emergency" className="btn btn-danger" style={{ textAlign: 'center', padding: '12px 0' }} title="Emergency">🚨</Link>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Overview */}
        {tab === 'overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Dashboard Overview</h2>
            <div className="grid-4" style={{ marginBottom: 28 }}>
              {[
                { label: 'Total Bookings', value: stats.total, bg: '#eff6ff', color: '#2563eb' },
                { label: 'Completed', value: stats.completed, bg: '#f0fdf4', color: '#16a34a' },
                { label: 'Pending', value: stats.pending, bg: '#fef3c7', color: '#92400e' },
                { label: 'Cancelled', value: stats.cancelled, bg: '#fef2f2', color: '#dc2626' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '16px 20px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>Recent Bookings</h3>
            {bookings.length === 0 && (
              <div className="card" style={{ textAlign:'center', padding:40, color:'#64748b' }}>
                <p>No bookings yet. <Link to="/categories" style={{ color:'#2563eb' }}>Book your first service!</Link></p>
              </div>
            )}
            {bookings.slice(0, 3).map(b => renderBookingCard(b))}
            {bookings.length > 3 && (
              <button onClick={() => setTab('bookings')} className="btn btn-outline" style={{ alignSelf: 'center', marginTop: 8 }}>View All Bookings</button>
            )}
          </div>
        )}

        {/* My Bookings */}
        {tab === 'bookings' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>My Bookings</h2>
            {bookings.length === 0 && (
              <div className="card" style={{ textAlign:'center', padding:40, color:'#64748b' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
                <p>No bookings yet. <Link to="/categories" style={{ color:'#2563eb' }}>Book your first service!</Link></p>
              </div>
            )}
            {bookings.map(b => renderBookingCard(b))}
          </div>
        )}

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>My Profile</h2>
              {!isEditingProfile && (
                <button onClick={startEditing} className="btn btn-outline btn-sm">Edit Profile</button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 'bold' }}>
                {user?.first_name?.[0] || user?.email?.[0] || 'U'}
              </div>
              <div>
                <h3 style={{ fontSize: 24, fontWeight: 700 }}>{user?.first_name} {user?.last_name}</h3>
                <p style={{ color: '#64748b' }}>{user?.email}</p>
                <span className="badge badge-primary" style={{ marginTop: 8, display: 'inline-block' }}>{user?.role?.toUpperCase()}</span>
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, marginTop: 12 }}>
              {isEditingProfile ? (
                <form onSubmit={handleProfileSubmit}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Edit Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input className="form-input" value={profileForm.first_name} onChange={e => setProfileForm({...profileForm, first_name: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input className="form-input" value={profileForm.last_name} onChange={e => setProfileForm({...profileForm, last_name: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input className="form-input" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <textarea className="form-input" rows={2} value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input className="form-input" value={profileForm.city} onChange={e => setProfileForm({...profileForm, city: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input className="form-input" value={profileForm.state} onChange={e => setProfileForm({...profileForm, state: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Pincode</label>
                      <input className="form-input" value={profileForm.pincode} onChange={e => setProfileForm({...profileForm, pincode: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button type="submit" className="btn btn-primary" disabled={profileLoading}>{profileLoading ? 'Saving...' : 'Save Changes'}</button>
                    <button type="button" className="btn btn-outline" onClick={() => setIsEditingProfile(false)} disabled={profileLoading}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Registered Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Phone Number</div>
                      <div style={{ fontWeight: 500 }}>{user?.phone || 'Not provided'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Account Status</div>
                      <div style={{ fontWeight: 500, color: user?.is_active ? '#16a34a' : '#dc2626' }}>{user?.is_active ? 'Active' : 'Inactive'}</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Address</div>
                      <div style={{ fontWeight: 500 }}>
                        {user?.address ? `${user.address}, ${user.city}, ${user.state} - ${user.pincode}` : 'Not provided'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Joined</div>
                      <div style={{ fontWeight: 500 }}>{user?.date_joined ? new Date(user?.date_joined).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {tab === 'payments' && (
           <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Payment History</h2>
            <div className="card">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 8px', color: '#64748b', fontWeight: 600, fontSize: 14 }}>Date</th>
                      <th style={{ padding: '12px 8px', color: '#64748b', fontWeight: 600, fontSize: 14 }}>Service</th>
                      <th style={{ padding: '12px 8px', color: '#64748b', fontWeight: 600, fontSize: 14 }}>Method</th>
                      <th style={{ padding: '12px 8px', color: '#64748b', fontWeight: 600, fontSize: 14 }}>Amount</th>
                      <th style={{ padding: '12px 8px', color: '#64748b', fontWeight: 600, fontSize: 14 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.filter(b => b.status === 'completed' || b.payment_id || b.payment_method).length === 0 ? (
                      <tr><td colSpan="5" style={{ padding: '24px 8px', textAlign: 'center', color: '#64748b' }}>No payment history found.</td></tr>
                    ) : (
                      bookings.filter(b => b.status === 'completed' || b.payment_id || b.payment_method).map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px 8px', fontSize: 14 }}>{new Date(b.created_at || b.booking_date).toLocaleDateString()}</td>
                          <td style={{ padding: '16px 8px', fontSize: 14, fontWeight: 500 }}>{b.subcategory_name}</td>
                          <td style={{ padding: '16px 8px', fontSize: 14 }}>{b.payment_method?.toUpperCase() || 'ONLINE'}</td>
                          <td style={{ padding: '16px 8px', fontSize: 14, fontWeight: 600 }}>₹{b.final_price || b.quoted_price}</td>
                          <td style={{ padding: '16px 8px', fontSize: 14 }}>
                            <span className={`badge badge-${b.status === 'completed' ? 'completed' : 'pending'}`}>
                              {b.status === 'completed' ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
           </div>
        )}

      {/* Reviews */}
      {tab === 'reviews' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {reviews.length === 0 && (
            <div className="card" style={{ textAlign:'center', padding:40, color:'#64748b' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>⭐</div>
              <p>No reviews yet. Complete a booking to leave one!</p>
            </div>
          )}
          {reviews.map(r => (
            <div key={r.id} className="card">
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontWeight:600 }}>{r.provider_name}</span>
                <StarRating rating={r.rating} size={16} />
              </div>
              <p style={{ color:'#374151', fontSize:14 }}>{r.comment}</p>
              <div style={{ display:'flex', gap:12, marginTop:8, fontSize:12, color:'#64748b' }}>
                <span style={{
                  padding:'2px 10px', borderRadius:20,
                  background: r.sentiment==='positive' ? '#dcfce7' : r.sentiment==='negative' ? '#fee2e2' : '#f1f5f9',
                  color: r.sentiment==='positive' ? '#166534' : r.sentiment==='negative' ? '#991b1b' : '#475569'
                }}>
                  {r.sentiment === 'positive' ? '😊' : r.sentiment === 'negative' ? '😞' : '😐'} {r.sentiment}
                </span>
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

        {/* Settings */}
        {tab === 'settings' && (
          <div className="card">
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Account Settings</h2>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Change Password</h3>
              <button className="btn btn-outline" onClick={() => alert('Change password modal coming soon')}>Change Password</button>
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
              <h3 style={{ fontWeight: 600, color: '#dc2626', marginBottom: 12 }}>Danger Zone</h3>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 12 }}>Once you delete your account, there is no going back. Please be certain.</p>
              <button className="btn btn-danger" onClick={() => {
                if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                  // Call delete API
                  alert('Account deletion initiated');
                }
              }}>Delete Account</button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div className="card" style={{ width:460, maxWidth:'90vw' }}>
            <h3 style={{ marginBottom:4 }}>Rate Your Experience</h3>
            <p style={{ color:'#64748b', fontSize:14, marginBottom:20 }}>
              {reviewModal.subcategory_name} with {reviewModal.provider_name}
            </p>
            {reviewMsg && <div className={`alert alert-${reviewMsg.includes('Failed')?'error':'success'}`}>{reviewMsg}</div>}
            <div className="form-group" style={{ textAlign:'center' }}>
              <StarRating rating={reviewForm.rating} size={36} interactive
                onChange={r => setReviewForm(f => ({...f, rating:r}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Your Review</label>
              <textarea className="form-input" rows={4} value={reviewForm.comment}
                onChange={e => setReviewForm(f => ({...f, comment:e.target.value}))}
                placeholder="Describe your experience…" />
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={submitReview}>Submit Review</button>
              <button className="btn btn-outline" onClick={() => setReviewModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20 }}>
          <div style={{ background:'white', borderRadius:16, maxWidth:600, width:'100%', maxHeight:'90vh', overflow:'auto' }}>
            <PaymentCheckout
              bookingId={paymentModal.id}
              onPaymentSuccess={(data) => {
                setPaymentModal(null);
                // Refresh bookings
                bookingsAPI.getBookings().then(r => setBookings(r.data.results || r.data));
              }}
              onPaymentError={(error) => {
                alert('Payment failed: ' + error);
              }}
            />
            <div style={{ padding:'0 24px 24px' }}>
              <button className="btn btn-outline" style={{ width:'100%' }} onClick={() => setPaymentModal(null)}>
                ← Back to Bookings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
