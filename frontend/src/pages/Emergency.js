import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { servicesAPI, bookingsAPI } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Emergency() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [categories, setCategories]   = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [form, setForm] = useState({
    subcategory: '', address: user?.address || '',
    city: user?.city || '', pincode: user?.pincode || '',
    description: '', priority_level: 1,
    latitude: null, longitude: null
  });
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(null);
  const [locating, setLocating] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    servicesAPI.getCategories().then(r => setCategories(r.data.results || r.data));
  }, []);

  useEffect(() => {
    if (selectedCat) {
      servicesAPI.getSubcategories(selectedCat)
        .then(r => setSubcategories(r.data.results || r.data));
    }
  }, [selectedCat]);



  const submit = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!user.address || !user.city) { setError('Please update your full address in your profile before requesting emergency service.'); return; }
    if (!form.subcategory) { setError('Please select a service'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await bookingsAPI.createEmergency({
        ...form,
        address: user.address,
        city: user.city,
        pincode: user.pincode,
        latitude: user.latitude,
        longitude: user.longitude,
      });
      setSuccess(data);
    } catch { setError('Failed to create emergency booking. Please try again.'); }
    finally { setLoading(false); }
  };

  if (success) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#fff1f1', padding:20 }}>
      <div className="card" style={{ maxWidth:480, textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:12 }}>🚨</div>
        <h2 style={{ fontSize:26, fontWeight:800, color:'#dc2626', marginBottom:8 }}>
          Emergency Booking Created!
        </h2>
        <div style={{ padding:'16px 20px', background:'#fef2f2', borderRadius:10, marginBottom:20 }}>
          <div style={{ fontSize:14, color:'#64748b', marginBottom:8 }}>Booking ID</div>
          <div style={{ fontSize:24, fontWeight:800, color:'#dc2626' }}>#{success.id}</div>
        </div>
        {success.provider ? (
          <div style={{ padding:'16px 20px', background:'#f0fdf4', borderRadius:10, marginBottom:20 }}>
            <div style={{ color:'#16a34a', fontWeight:600, marginBottom:4 }}>✅ Provider Assigned!</div>
            <div style={{ fontSize:15, fontWeight:600 }}>{success.provider_name}</div>
            <div style={{ fontSize:13, color:'#64748b' }}>Expected arrival within 30–60 minutes</div>
          </div>
        ) : (
          <div style={{ padding:'16px 20px', background:'#fef3c7', borderRadius:10, marginBottom:20 }}>
            <div style={{ color:'#92400e', fontWeight:600 }}>🔍 Searching for nearby providers…</div>
            <div style={{ fontSize:13, color:'#64748b' }}>You'll be notified once a provider is assigned</div>
          </div>
        )}
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <Link to={`/booking/${success.id}`} className="btn btn-primary">View Booking</Link>
          <Link to="/dashboard" className="btn btn-outline">Track Booking</Link>
          <Link to="/" className="btn btn-outline">Home</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background:'#fff1f1', minHeight:'100vh', padding:'40px 0' }}>
      <div className="container">
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🚨</div>
            <h1 style={{ fontSize:32, fontWeight:800, color:'#dc2626', marginBottom:8 }}>
              Emergency Service
            </h1>
            <p style={{ color:'#64748b', fontSize:16 }}>
              Nearest available provider will be assigned immediately.
              Available 24/7 for urgent situations.
            </p>
          </div>

          <div className="card">
            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={submit}>
              {/* Category */}
              <div className="form-group">
                <label className="form-label">Service Category *</label>
                <select className="form-select" value={selectedCat}
                  onChange={e => { setSelectedCat(e.target.value); setForm(f => ({...f, subcategory:''})); }}>
                  <option value="">-- Select Category --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {subcategories.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Specific Service *</label>
                  <select className="form-select" value={form.subcategory}
                    onChange={e => setForm(f => ({...f, subcategory:e.target.value}))}>
                    <option value="">-- Select Service --</option>
                    {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {/* Priority */}
              <div className="form-group">
                <label className="form-label">Priority Level</label>
                <div style={{ display:'flex', gap:8 }}>
                  {[
                    { val:1, label:'🔴 High', color:'#fee2e2', border:'#fca5a5', text:'#991b1b' },
                    { val:2, label:'🔥 Critical', color:'#fef3c7', border:'#fcd34d', text:'#92400e' },
                    { val:3, label:'⚡ Extreme', color:'#ede9fe', border:'#c4b5fd', text:'#5b21b6' },
                  ].map(p => (
                    <button key={p.val} type="button"
                      onClick={() => setForm(f => ({...f, priority_level:p.val}))}
                      style={{
                        flex:1, padding:'10px', border: `2px solid ${form.priority_level===p.val ? p.border : '#e2e8f0'}`,
                        borderRadius:10, background: form.priority_level===p.val ? p.color : '#fff',
                        color: form.priority_level===p.val ? p.text : '#64748b',
                        fontWeight:600, cursor:'pointer', fontSize:13
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location from Profile */}
              {user && (
                <div style={{
                  padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 20,
                  fontSize: 14, color: '#475569'
                }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>📍 Emergency Location</div>
                  {user.address ? `${user.address}, ${user.city} - ${user.pincode}` : <span style={{ color: '#ef4444' }}>Address not set in profile</span>}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Describe the Emergency *</label>
                <textarea className="form-input" rows={3} value={form.description}
                  onChange={e => setForm(f => ({...f, description:e.target.value}))}
                  placeholder="e.g., Water pipe burst, kitchen flooded…" required />
              </div>



              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:'16px', background:'#dc2626', color:'#fff',
                  border:'none', borderRadius:10, fontWeight:700, fontSize:16, cursor:'pointer',
                  boxShadow:'0 4px 12px rgba(220,38,38,.35)' }}>
                {loading ? '🚨 Sending Request…' : '🚨 Request Emergency Service'}
              </button>
            </form>

            <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'#64748b' }}>
              By booking, you agree to our emergency service terms.<br/>
              {!user && <><Link to="/login" style={{ color:'#2563eb' }}>Login</Link> required to book.</>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
