import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { servicesAPI, bookingsAPI } from '../api';
import ProviderCard from '../components/ProviderCard';
import StarRating from '../components/StarRating';
import PaymentCheckout from '../components/PaymentCheckout';
import { useAuth } from '../context/AuthContext';

const ICONS = ['🔧', '⚡', '🧹', '🪚', '❄️', '🎨', , '🚿'];

const CATEGORY_ICONS = {
  plumbing: '🚿',
  electrical: '⚡',
  carpentry: '🪚',
  painting: '🎨',
  cleaning: '🧹',
  ac: '❄️',
  security: '🛡️',
  technical: '⚙️',
};

const CATEGORY_BGS = {
  plumbing: '/images/plumbing.png',
  electric: '/images/electrical.png',
  electricity: '/images/electrical.png',
  electrical: '/images/electrical.png',
  painting: '/images/painting.png',
  cleaning: '/images/cleaning.png',
  default: '/images/hero.png',
};

function getCategoryIcon(name, index) {
  if (!name) {
    return ICONS[index % ICONS.length];
  }
  const key = name.toLowerCase();
  for (const k of Object.keys(CATEGORY_ICONS)) {
    if (k !== 'default' && key.includes(k)) {
      return CATEGORY_ICONS[k];
    }
  }
  return ICONS[index % ICONS.length];
}

function getCategoryBg(name) {
  if (!name) return CATEGORY_BGS.default;
  const key = name.toLowerCase();
  for (const k of Object.keys(CATEGORY_BGS)) {
    if (k !== 'default' && key.includes(k)) {
      return CATEGORY_BGS[k];
    }
  }
  return CATEGORY_BGS.default;
}

// ─── Category Listing ─────────────────────────────────────────────────────────
export function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    servicesAPI.getCategories()
      .then(r => setCategories(r.data.results || r.data))
      .catch(err => console.error('Unable to load categories:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="container page">
      <div className="section-header">
        <h1 className="section-title">All Service Categories</h1>
      </div>
      <div className="grid-4">
        {categories.map((cat, i) => (
          <Link key={cat.id} to={`/categories/${cat.id}`} className="card"
            style={{
              position: 'relative',
              overflow: 'hidden',
              textAlign: 'center',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              cursor: 'pointer',
              minHeight: '240px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.1)',
              borderTop: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '24px',
              padding: '24px',
              textDecoration: 'none',
              boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,.3)';
              e.currentTarget.querySelector('.category-bg').style.transform = 'scale(1.1)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,.1)';
              e.currentTarget.querySelector('.category-bg').style.transform = 'scale(1)';
            }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${getCategoryBg(cat.name)})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              zIndex: 0, transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }} className="category-bg" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.95), rgba(15,23,42,0.2))', zIndex: 1 }} />

            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                width: 64, height: 64, margin: '0 auto 16px auto',
                background: 'linear-gradient(135deg, rgba(252, 211, 77, 0.2), rgba(245, 158, 11, 0.05))',
                border: '1px solid rgba(252, 211, 77, 0.3)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32,
                boxShadow: '0 0 20px rgba(252, 211, 77, 0.15)'
              }}>
                <div style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{getCategoryIcon(cat.name, i)}</div>
              </div>
              <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 20, color: '#f8fafc', textShadow: '0 2px 4px rgba(0,0,0,0.8)', letterSpacing: '0.5px' }}>{cat.name}</div>
              <div style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{cat.subcategory_count} Services</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Category Detail (Subcategories) ─────────────────────────────────────────
export function CategoryDetail() {
  const { id } = useParams();
  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    servicesAPI.getCategory(id)
      .then(r => setCategory(r.data))
      .catch(err => console.error('Unable to load category detail:', err));

    servicesAPI.getSubcategories(id)
      .then(r => setSubcategories(r.data.results || r.data))
      .catch(err => console.error('Unable to load subcategories:', err));
  }, [id]);

  if (!category) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="container page">
      <div style={{ marginBottom: 8, fontSize: 14, color: '#64748b' }}>
        <Link to="/categories" style={{ color: '#2563eb' }}>Categories</Link> / {category.name}
      </div>
      <div className="section-header">
        <h1 className="section-title">{category.name}</h1>
      </div>
      {category.description && <p style={{ color: '#64748b', marginBottom: 24 }}>{category.description}</p>}

      <div className="grid-3">
        {subcategories.map(sub => (
          <Link key={sub.id} to={`/book/${sub.id}`}
            style={{
              position: 'relative',
              overflow: 'hidden',
              textAlign: 'center',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              cursor: 'pointer',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.1)',
              borderTop: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '24px',
              padding: '24px',
              textDecoration: 'none',
              boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,.3)';
              e.currentTarget.querySelector('.subcat-bg').style.transform = 'scale(1.1)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,.1)';
              e.currentTarget.querySelector('.subcat-bg').style.transform = 'scale(1)';
            }}>

            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${getCategoryBg(category.name)})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              zIndex: 0, transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }} className="subcat-bg" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.98), rgba(15,23,42,0.4))', zIndex: 1 }} />

            <div style={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 56, height: 56, margin: '0 auto 16px auto',
                background: 'linear-gradient(135deg, rgba(252, 211, 77, 0.2), rgba(245, 158, 11, 0.05))',
                border: '1px solid rgba(252, 211, 77, 0.3)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28,
                boxShadow: '0 0 20px rgba(252, 211, 77, 0.15)'
              }}>
                <div style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>✨</div>
              </div>

              <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8, color: '#f8fafc', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{sub.name}</div>

              {sub.description && (
                <p style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 16, lineHeight: 1.4, opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{sub.description}</p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 800, color: '#fcd34d', fontSize: 18 }}>₹{sub.base_price}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>base price</span>
                </div>
                <div style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ⏱ {sub.estimated_duration_hours}h
                </div>
              </div>

              <div style={{ marginTop: 16, textAlign: 'center', color: '#fcd34d', fontSize: 14, fontWeight: 700, letterSpacing: '0.5px' }}>
                Book Now →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Book Service (Providers + Booking Form) ──────────────────────────────────
export function BookService() {
  const { subcategoryId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subcategory, setSubcategory] = useState(null);
  const [providers, setProviders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ min_rating: '', max_price: '', city: '' });
  const [form, setForm] = useState({
    booking_date: '', booking_time: '', address: user?.address || '',
    city: user?.city || '', pincode: user?.pincode || '',
    latitude: user?.latitude || null,
    longitude: user?.longitude || null,
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [createdBooking, setCreatedBooking] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    servicesAPI.getSubcategories().then(r => {
      const list = r.data.results || r.data;
      const found = list.find(s => String(s.id) === String(subcategoryId));
      setSubcategory(found);
    });
    loadProviders();
  }, [subcategoryId]);

  const loadProviders = (extra = {}) => {
    servicesAPI.getProvidersBySubcategory(subcategoryId, { ...filters, ...extra })
      .then(r => setProviders(r.data))
      .catch(err => console.error('Unable to load providers:', err));
  };

  const applyFilters = () => loadProviders();



  const bookNow = async (paymentMethod) => {
    if (!user) { navigate('/login'); return; }
    if (!selected) { setError('Please select a provider'); return; }
    if (!form.booking_date || !form.booking_time) {
      setError('Fill in all booking details'); return;
    }
    if (!user.address || !user.city || !user.pincode) {
      setError('Please complete your address details in your Profile before booking.'); return;
    }
    setLoading(true); setError('');
    try {
      const bookingResponse = await bookingsAPI.createBooking({
        ...form,
        address: user.address,
        city: user.city,
        pincode: user.pincode,
        latitude: user.latitude,
        longitude: user.longitude,
        provider: selected.id,
        subcategory: subcategoryId,
        quoted_price: selected.service_price || selected.hourly_rate,
        payment_method: paymentMethod
      });
      setCreatedBooking(bookingResponse.data);
      if (paymentMethod === 'online') {
        setShowPayment(true);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      const errorMsg = err.response?.data ? (typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : err.response.data) : 'Booking failed. Please try again.';
      setError(`Booking failed: ${errorMsg}`);
    } finally { setLoading(false); }
  };

  const handlePaymentSuccess = () => {
    setSuccess(true);
    setShowPayment(false);
  };

  const handlePaymentError = (errorMessage) => {
    setError(errorMessage);
    setShowPayment(false);
  };

  if (success) return (
    <div className="container page" style={{ textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Booking Confirmed!</h2>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        Your booking is now confirmed. {createdBooking?.payment_method === 'online' ? 'Your payment was successful.' : 'You have chosen to pay offline.'} The provider will be notified.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link to="/dashboard" className="btn btn-primary">View My Bookings</Link>
        <Link to="/" className="btn btn-outline">Back to Home</Link>
      </div>
    </div>
  );

  if (showPayment && createdBooking) {
    return (
      <div className="container page">
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Complete Your Payment</h2>
            <p style={{ color: '#64748b' }}>Secure payment for your {subcategory?.name} booking</p>
          </div>
          <PaymentCheckout
            bookingId={createdBooking.id}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button
              onClick={() => setShowPayment(false)}
              className="btn btn-outline btn-sm"
              style={{ marginRight: 12 }}
            >
              ← Back to Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      {subcategory && (
        <div style={{ marginBottom: 24 }}>
          <h1 className="section-title">{subcategory.name}</h1>
          <p style={{ color: '#64748b' }}>Base price: ₹{subcategory.base_price} · Est. {subcategory.estimated_duration_hours}h</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
        {/* Left: Providers */}
        <div>
          {/* Filters */}
          <div style={{
            marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end',
            background: 'linear-gradient(145deg, #312e81 0%, #4338ca 100%)',
            padding: '24px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 12px 30px rgba(49,46,129,0.25)',
            color: 'white'
          }}>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#e0e7ff', letterSpacing: '0.5px' }}>Min Rating</label>
              <select className="form-select" value={filters.min_rating}
                style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
                onChange={e => setFilters(f => ({ ...f, min_rating: e.target.value }))}>
                <option value="" style={{ color: 'black' }}>Any</option>
                {[4, 4.5, 5].map(r => <option key={r} value={r} style={{ color: 'black' }}>{r}+ ⭐</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#e0e7ff', letterSpacing: '0.5px' }}>Max Price (₹)</label>
              <input className="form-input" type="number" placeholder="e.g. 1000"
                style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
                value={filters.max_price}
                onChange={e => setFilters(f => ({ ...f, max_price: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#e0e7ff', letterSpacing: '0.5px' }}>City</label>
              <input className="form-input" placeholder="e.g. Mumbai"
                style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
                value={filters.city}
                onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} />
            </div>
            <button
              style={{
                background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)',
                color: '#1e293b', padding: '0 32px', border: 'none', borderRadius: '12px',
                fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px rgba(245,158,11,0.3)',
                transition: 'all 0.2s', height: '48px', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '1px'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 25px rgba(245,158,11,0.4)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(245,158,11,0.3)'; }}
              onClick={applyFilters}
            >
              Apply
            </button>
          </div>

          <div style={{ marginBottom: 12, fontSize: 14, color: '#64748b' }}>
            {providers.length} provider{providers.length !== 1 ? 's' : ''} found
            {selected && <span style={{ color: '#16a34a', marginLeft: 12 }}>✓ {selected.user?.full_name} selected</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {providers.map(p => (
              <div key={p.id} onClick={() => setSelected(p)}
                style={{
                  outline: selected?.id === p.id ? '2px solid #2563eb' : 'none',
                  borderRadius: 10, cursor: 'pointer'
                }}>
                <ProviderCard
                  provider={p}
                  servicePrice={p.service_price}
                  onBook={() => { setSelected(p); }}
                />
              </div>
            ))}
            {!providers.length && (
              <div className="card" style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>
                No providers available for this service in your area.
              </div>
            )}
          </div>
        </div>

        {/* Right: Booking form */}
        <div style={{
          position: 'sticky', top: 80,
          background: 'linear-gradient(145deg, #312e81 0%, #4338ca 100%)',
          padding: '32px',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 12px 30px rgba(49,46,129,0.25)',
          color: 'white'
        }}>
          <h3 style={{ marginBottom: 24, fontSize: 22, fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 28, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>📅</span> Book Appointment
          </h3>
          {error && <div className="alert alert-error" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fecaca', borderRadius: '12px' }}>{error}</div>}
          {selected && (
            <div style={{
              padding: '12px 16px', background: 'rgba(252, 211, 77, 0.1)', border: '1px solid rgba(252, 211, 77, 0.3)', borderRadius: 12, marginBottom: 20,
              fontSize: 15, color: '#fcd34d', fontWeight: 600
            }}>
              Provider: <span style={{ color: 'white' }}>{selected.user?.full_name}</span>
            </div>
          )}
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#e0e7ff', letterSpacing: '0.5px' }}>Date</label>
            <input className="form-input" type="date" value={form.booking_date}
              style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setForm(f => ({ ...f, booking_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#e0e7ff', letterSpacing: '0.5px' }}>Time</label>
            <input className="form-input" type="time" value={form.booking_time}
              style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px', colorScheme: 'dark' }}
              onChange={e => setForm(f => ({ ...f, booking_time: e.target.value }))} />
          </div>
          {user && (
            <div style={{
              padding: '12px 16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 12, marginBottom: 20,
              fontSize: 14, color: '#cbd5e1'
            }}>
              <div style={{ fontWeight: 600, color: 'white', marginBottom: 4 }}>📍 Service Address</div>
              {user.address ? `${user.address}, ${user.city} - ${user.pincode}` : <span style={{ color: '#ef4444' }}>Address not set in profile</span>}
            </div>
          )}
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#e0e7ff', letterSpacing: '0.5px' }}>Description (optional)</label>
            <textarea className="form-input" rows={2} value={form.description}
              style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the issue..." />
          </div>
          <div style={{ display: 'flex', gap: 16, flexDirection: 'column', marginTop: 8 }}>
            <button
              onClick={() => bookNow('online')} disabled={loading || !selected}
              style={{
                background: 'linear-gradient(135deg, #ffdf00 0%, #ffb300 100%)',
                color: '#1e293b', padding: '16px', border: 'none', borderRadius: '12px',
                fontWeight: 800, cursor: loading || !selected ? 'not-allowed' : 'pointer', boxShadow: '0 8px 25px rgba(255, 179, 0, 0.5)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '1.5px', opacity: loading || !selected ? 0.6 : 1
              }}
              onMouseOver={e => { if (!loading && selected) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(255, 179, 0, 0.7)'; } }}
              onMouseOut={e => { if (!loading && selected) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 179, 0, 0.5)'; } }}
            >
              {loading ? 'Creating Booking…' : 'Book & Pay Online'}
            </button>
            <button
              onClick={() => bookNow('offline')} disabled={loading || !selected}
              style={{
                background: 'linear-gradient(135deg, #00e676 0%, #00b248 100%)',
                color: '#1e293b', padding: '16px', border: 'none', borderRadius: '12px',
                fontWeight: 800, cursor: loading || !selected ? 'not-allowed' : 'pointer', boxShadow: '0 8px 25px rgba(0, 230, 118, 0.4)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '1.5px', opacity: loading || !selected ? 0.6 : 1
              }}
              onMouseOver={e => { if (!loading && selected) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 230, 118, 0.6)'; } }}
              onMouseOut={e => { if (!loading && selected) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 230, 118, 0.4)'; } }}
            >
              {loading ? 'Creating Booking…' : 'Book (Offline / Cash)'}
            </button>
          </div>
          {!user && <p style={{ fontSize: 13, color: '#cbd5e1', marginTop: 16, textAlign: 'center', fontWeight: 500 }}>
            <Link to="/login" style={{ color: '#fcd34d', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link> to book an appointment
          </p>}
        </div>
      </div>
    </div>
  );
}
