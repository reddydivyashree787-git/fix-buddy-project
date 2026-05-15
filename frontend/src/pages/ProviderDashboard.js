import React, { useEffect, useState } from 'react';
import { authAPI, bookingsAPI, servicesAPI, reviewsAPI, paymentsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import ProviderBankOnboarding from '../components/ProviderBankOnboarding';
import ProviderEarnings from '../components/ProviderEarnings';

export default function ProviderDashboard() {
  const { user, refreshUser } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [tab, setTab]           = useState('overview');
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews]   = useState([]);
  const [profile, setProfile]   = useState(null);
  const [categories, setCategories]   = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [myServices, setMyServices]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [commissionModal, setCommissionModal] = useState(null);
  const [serviceForm, setServiceForm] = useState({ subcategory:'', custom_price:'', description:'' });
  const [profileForm, setProfileForm] = useState({});
  const [saved, setSaved]       = useState('');
  const [locationMessage, setLocationMessage] = useState('');

  useEffect(() => {
    Promise.all([
      bookingsAPI.getBookings(),
      authAPI.getProviderProfile(),
      reviewsAPI.getReviews(),
      servicesAPI.getCategories(),
      servicesAPI.getMyServices(),
    ]).then(([b, p, r, c, s]) => {
      setBookings(b.data.results || b.data);
      setProfile(p.data);
      setProfileForm({ bio: p.data.bio, experience_years: p.data.experience_years,
        hourly_rate: p.data.hourly_rate, service_radius_km: p.data.service_radius_km });
      setReviews(r.data.results || r.data);
      setCategories(c.data.results || c.data);
      setMyServices(s.data.results || s.data);
    }).finally(() => setLoading(false));
  }, []);

  const loadSubcategories = async (catId) => {
    const { data } = await servicesAPI.getSubcategories(catId);
    setSubcategories(data.results || data);
  };

  const updateStatus = async (id, status) => {
    await bookingsAPI.updateStatus(id, { status });
    setBookings(b => b.map(x => x.id === id ? {...x, status} : x));
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleMarkComplete = async (booking) => {
    if (booking.payment_method === 'offline') {
      setCommissionModal({ booking, loading: true, data: null });
      try {
        const { data } = await paymentsAPI.initiateCommission({ booking_id: booking.id });
        setCommissionModal({ booking, loading: false, data });
      } catch (err) {
        alert('Failed to calculate commission: ' + (err.response?.data?.error || err.message));
        setCommissionModal(null);
      }
    } else {
      await updateStatus(booking.id, 'completed');
    }
  };

  const payCommission = async (data, booking) => {
    const loaded = await loadRazorpay();
    if (!loaded) {
      alert('Razorpay SDK failed to load. Are you online?');
      return;
    }
    const options = {
      key: data.key_id,
      amount: data.amount * 100,
      currency: data.currency,
      name: "Fix Buddy",
      description: "Commission Payment",
      order_id: data.razorpay_order_id,
      handler: async function (response) {
        try {
          await paymentsAPI.verifyCommission({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          setBookings(b => b.map(x => x.id === booking.id ? {...x, status: 'completed'} : x));
          setCommissionModal(null);
          alert('Commission paid successfully! Booking completed.');
        } catch (err) {
          alert('Failed to verify payment: ' + (err.response?.data?.error || err.message));
        }
      },
      prefill: {
        name: profile?.user?.full_name || '',
        email: profile?.user?.email || '',
        contact: profile?.user?.phone || ''
      },
      theme: { color: "#2563eb" }
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      alert('Payment failed: ' + response.error.description);
    });
    rzp.open();
  };

  const addService = async () => {
    if (!serviceForm.subcategory || !serviceForm.custom_price) {
      setSaved('Please select a service and enter a price.');
      return;
    }
    try {
      const payload = {
        subcategory: parseInt(serviceForm.subcategory, 10),
        custom_price: parseFloat(serviceForm.custom_price),
        description: serviceForm.description || '',
      };
      const { data } = await servicesAPI.addMyService(payload);
      setMyServices(s => [...s, data]);
      setServiceForm({ subcategory:'', custom_price:'', description:'' });
      setSaved('Service added!');
      setTimeout(() => setSaved(''), 2500);
    } catch (err) {
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(' ')
        : 'Failed to add service.';
      setSaved('Error: ' + msg);
    }
  };

  const saveProfile = async () => {
    await authAPI.updateProviderProfile(profileForm);
    setSaved('Profile saved!');
    setTimeout(() => setSaved(''), 2000);
  };

  const setCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation is not supported by your browser.');
      return;
    }
    setLocationMessage('Detecting your current location…');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await authAPI.updateProfile({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        await refreshUser();
        setLocationMessage('Location saved successfully.');
        setTimeout(() => setLocationMessage(''), 3000);
      } catch (err) {
        setLocationMessage('Unable to save your location. Please try again.');
      }
    }, () => {
      setLocationMessage('Location permission denied or unavailable.');
    });
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    rating: Number(profile?.average_rating || 0).toFixed(1),
  };

  const renderBookingCard = (b) => (
    <div key={b.id} className="card">
      <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:12, alignItems:'flex-start' }}>
        <div>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
            <span style={{ fontWeight:700 }}>{b.subcategory_name}</span>
            <span className={`badge badge-${b.status}`}>{b.status.replace('_',' ')}</span>
            {b.is_emergency && <span style={{ fontSize:12, color:'#dc2626' }}>🚨</span>}
          </div>
          <div style={{ fontSize:14, color:'#64748b' }}>
            👤 {b.customer_name} {b.customer_phone ? `(📞 ${b.customer_phone})` : ''} · 📅 {b.booking_date} {b.booking_time}
          </div>
          <div style={{ fontSize:14, color:'#64748b' }}>📍 {b.address}, {b.city}</div>
          {b.distance_km != null && (
            <div style={{ fontSize:13, color:'#475569', marginTop:4 }}>
              📏 Distance to customer: {b.distance_km} km
            </div>
          )}
          <div style={{ fontSize:14, color:'#475569', marginTop:4 }}>
            💳 Payment: {b.payment_method === 'offline' 
              ? <span style={{ color:'#d97706', fontWeight:600 }}>Cash Collection</span> 
              : <span style={{ color:'#16a34a', fontWeight:600 }}>Paid Online</span>}
          </div>
          <div style={{ fontSize:14, marginTop:4 }}>₹{b.quoted_price}</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {b.status === 'pending' && (<>
            <button className="btn btn-success btn-sm" onClick={() => updateStatus(b.id,'accepted')}>Accept</button>
            <button className="btn btn-outline btn-sm" onClick={() => updateStatus(b.id,'rejected')}>Reject</button>
          </>)}
          {b.status === 'accepted' && (
            <button className="btn btn-primary btn-sm" onClick={() => updateStatus(b.id,'in_progress')}>Start Job</button>
          )}
          {b.status === 'in_progress' && (
            <button className="btn btn-success btn-sm" onClick={() => handleMarkComplete(b)}>Mark Complete</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container page responsive-dashboard" style={{ display: 'flex', gap: isSidebarOpen ? 32 : 16, alignItems: 'flex-start', minHeight: 'calc(100vh - 64px)', transition: 'gap 0.3s' }}>
      
      {/* Sidebar */}
      <div className="responsive-sidebar" style={{ width: isSidebarOpen ? 250 : 80, flexShrink: 0, position: 'sticky', top: 88, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: isSidebarOpen ? 'space-between' : 'center', alignItems: 'flex-start', marginBottom: 28 }}>
          {isSidebarOpen && (
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>Provider Dashboard</h1>
              <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Manage your services</p>
              <div style={{ marginTop: 12 }}>
                {profile?.is_verified
                  ? <span style={{ padding:'4px 12px', background:'#dcfce7', color:'#166534', borderRadius:20, fontWeight:600, fontSize:12 }}>✓ Verified</span>
                  : <span style={{ padding:'4px 12px', background:'#fef3c7', color:'#92400e', borderRadius:20, fontSize:12 }}>Pending Verification</span>
                }
              </div>
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

        <div className="responsive-sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { id: 'overview', icon: '📊', label: 'Overview' },
            { id: 'pending', icon: '⏳', label: 'Pending Requests' },
            { id: 'services', icon: '🔧', label: 'My Services' },
            { id: 'profile', icon: '👤', label: 'Profile' },
            { id: 'account', icon: '💳', label: 'Account Details' },
            { id: 'earnings', icon: '💰', label: 'My Earnings' },
            { id: 'reviews', icon: '⭐', label: 'Reviews' },
            { id: 'personal', icon: '📝', label: 'Personal Info' }
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
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        
        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid-4" style={{ marginBottom: 28 }}>
              {[
                { label:'Total Bookings',  value:stats.total,    bg:'#eff6ff', color:'#2563eb' },
                { label:'Pending',         value:stats.pending,  bg:'#fef3c7', color:'#92400e' },
                { label:'Completed',       value:stats.completed,bg:'#f0fdf4', color:'#16a34a' },
                { label:'Avg Rating',      value:`${stats.rating}⭐`, bg:'#fff7ed', color:'#c2410c' },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'16px 20px', border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:13, color:'#64748b' }}>{s.label}</div>
                </div>
              ))}
            </div>
            
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>All Bookings</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {bookings.map(renderBookingCard)}
              {!bookings.length && (
                <div className="card" style={{ textAlign:'center', padding:40, color:'#64748b' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
                  <p>No bookings yet. Complete your profile to get discovered!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending Requests Tab */}
        {tab === 'pending' && (
          <div className="space-y-6">
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Pending Requests</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {bookings.filter(b => b.status === 'pending').map(renderBookingCard)}
              {!bookings.filter(b => b.status === 'pending').length && (
                <div className="card" style={{ textAlign:'center', padding:40, color:'#64748b' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>⏳</div>
                  <p>No pending requests at the moment.</p>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Services Tab */}
      {tab === 'services' && (
        <div>
          <div className="card" style={{ marginBottom:20 }}>
            <h3 style={{ marginBottom:16 }}>Add a Service</h3>
            {saved && <div className="alert alert-success">{saved}</div>}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" onChange={e => loadSubcategories(e.target.value)}>
                  <option value="">-- Category --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Service</label>
                <select className="form-select" value={serviceForm.subcategory}
                  onChange={e => setServiceForm(f => ({...f, subcategory:e.target.value}))}>
                  <option value="">-- Service --</option>
                  {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Your Price (₹)</label>
              <input className="form-input" type="number" value={serviceForm.custom_price}
                onChange={e => setServiceForm(f => ({...f, custom_price:e.target.value}))}
                placeholder="e.g. 499" />
            </div>
            <button className="btn btn-primary" onClick={addService}
              disabled={!serviceForm.subcategory || !serviceForm.custom_price}>
              + Add Service
            </button>
          </div>

          <div className="grid-3">
            {myServices.map(s => (
              <div key={s.id} className="card">
                <div style={{ fontWeight:600, marginBottom:4 }}>{s.subcategory_name}</div>
                <div style={{ fontSize:13, color:'#64748b', marginBottom:8 }}>{s.category_name}</div>
                <div style={{ fontWeight:700, color:'#2563eb', fontSize:18 }}>₹{s.custom_price}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="card" style={{ maxWidth:600 }}>
          <h3 style={{ marginBottom:20 }}>Provider Profile</h3>
          {saved && <div className="alert alert-success">{saved}</div>}
          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea className="form-input" rows={3} value={profileForm.bio || ''}
              onChange={e => setProfileForm(f => ({...f, bio:e.target.value}))}
              placeholder="Tell customers about yourself…" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Experience (years)</label>
              <input className="form-input" type="number" value={profileForm.experience_years || ''}
                onChange={e => setProfileForm(f => ({...f, experience_years:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Hourly Rate (₹)</label>
              <input className="form-input" type="number" value={profileForm.hourly_rate || ''}
                onChange={e => setProfileForm(f => ({...f, hourly_rate:e.target.value}))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Service Radius (km)</label>
            <input className="form-input" type="number" value={profileForm.service_radius_km || ''}
              onChange={e => setProfileForm(f => ({...f, service_radius_km:e.target.value}))} />
          </div>
          <button className="btn btn-primary" onClick={saveProfile}>Save Profile</button>
          <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={setCurrentLocation}>
            📍 Set My Current Location
          </button>
          {locationMessage && (
            <div style={{ fontSize: 13, color: '#475569', marginTop: 10 }}>{locationMessage}</div>
          )}
        </div>
      )}

      {/* Account Details Tab */}
      {tab === 'account' && (
        <div className="space-y-6">
          <ProviderBankOnboarding />
        </div>
      )}

      {/* Earnings Tab */}
      {tab === 'earnings' && (
        <div className="space-y-6">
          <ProviderEarnings />
        </div>
      )}

      {/* Reviews Tab */}
      {tab === 'reviews' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {reviews.map(r => (
            <div key={r.id} className="card">
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontWeight:600 }}>{r.customer_name}</span>
                <StarRating rating={r.rating} size={16} />
              </div>
              <p style={{ fontSize:14, color:'#374151' }}>{r.comment}</p>
              <span style={{ fontSize:12, padding:'2px 10px', borderRadius:20, marginTop:8, display:'inline-block',
                background: r.sentiment==='positive'?'#dcfce7':r.sentiment==='negative'?'#fee2e2':'#f1f5f9',
                color: r.sentiment==='positive'?'#166534':r.sentiment==='negative'?'#991b1b':'#475569' }}>
                {r.sentiment}
              </span>
            </div>
          ))}
          {!reviews.length && <div className="card" style={{ textAlign:'center', padding:40, color:'#64748b' }}>
            <p>No reviews yet. Complete bookings to receive reviews!</p>
          </div>}
        </div>
      )}
      {/* Personal Info Tab */}
      {tab === 'personal' && (
        <div className="card">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Personal Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
            <div>
              <p style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Full Name</p>
              <p style={{ fontWeight: 500 }}>{profile?.user?.full_name || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Email Address</p>
              <p style={{ fontWeight: 500 }}>{profile?.user?.email || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Phone Number</p>
              <p style={{ fontWeight: 500 }}>{profile?.user?.phone || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>City</p>
              <p style={{ fontWeight: 500 }}>{profile?.user?.city || 'N/A'}</p>
            </div>
          </div>
          
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, marginTop: 32 }}>Security Settings</h2>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Change Password</h3>
            <button className="btn btn-outline" onClick={() => alert('Change password modal coming soon')}>Change Password</button>
          </div>
        </div>
      )}
      
      </div>

      {/* Commission Modal */}
      {commissionModal && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ maxWidth: 400, width: '90%', padding: 24, borderRadius: 12, background: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Complete Cash Booking</h2>
            {commissionModal.loading ? (
              <div style={{ textAlign:'center', padding:20 }}><div className="spinner" /></div>
            ) : (
              <div>
                <p style={{ color: '#475569', marginBottom: 12, lineHeight: 1.5 }}>
                  The customer opted for <strong style={{ color:'#d97706' }}>Cash Payment</strong>. Ensure you have collected the full amount.
                </p>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#64748b' }}>Total Service Cost:</span>
                    <span style={{ fontWeight: 600 }}>₹{commissionModal.booking.quoted_price}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: 8 }}>
                    <span style={{ color: '#64748b' }}>Admin Commission:</span>
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>₹{commissionModal.data.amount}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => setCommissionModal(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => payCommission(commissionModal.data, commissionModal.booking)}>Pay Commission</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
