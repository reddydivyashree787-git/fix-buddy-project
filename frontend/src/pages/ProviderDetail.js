import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authAPI, reviewsAPI } from '../api';
import StarRating from '../components/StarRating';

export default function ProviderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      authAPI.getProvider(id),
      reviewsAPI.getProviderReviews(id),
    ]).then(([p, r]) => {
      setProvider(p.data);
      setReviews(r.data);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!provider) return <div className="container page"><p>Provider not found.</p></div>;

  const u = provider.user;
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <div className="container page">
      <div style={{ marginBottom:8, fontSize:14, color:'#64748b' }}>
        <Link to="/providers" style={{ color:'#2563eb' }}>Providers</Link> / {u.full_name}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:24, alignItems:'start' }}>
        {/* Left */}
        <div>
          <div className="card" style={{ marginBottom:20 }}>
            <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
              <div style={{ width:72, height:72, borderRadius:'50%', background:'#dbeafe',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:800, fontSize:28, color:'#2563eb', flexShrink:0 }}>
                {u.full_name.charAt(0)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                  <h1 style={{ fontSize:22, fontWeight:800 }}>{u.full_name}</h1>
                  {provider.is_verified && (
                    <span style={{ fontSize:12, background:'#dcfce7', color:'#166534',
                      padding:'2px 10px', borderRadius:20 }}>✓ Verified</span>
                  )}
                </div>
                <div style={{ display:'flex', gap:16, fontSize:14, color:'#64748b', flexWrap:'wrap' }}>
                  <span>📍 {u.city}{u.state ? `, ${u.state}` : ''}</span>
                  <span>🏆 {provider.experience_years} years experience</span>
                  <span>✅ {provider.total_bookings_completed} jobs done</span>
                </div>
                <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8 }}>
                  <StarRating rating={provider.average_rating} size={18} />
                  <span style={{ fontWeight:600 }}>{Number(provider.average_rating).toFixed(1)}</span>
                  <span style={{ color:'#64748b', fontSize:14 }}>({provider.total_reviews} reviews)</span>
                </div>
              </div>
            </div>
            {provider.bio && (
              <p style={{ marginTop:16, color:'#374151', fontSize:14, lineHeight:1.6 }}>{provider.bio}</p>
            )}
          </div>

          {/* Reviews */}
          <div className="card">
            <h3 style={{ marginBottom:16 }}>Customer Reviews</h3>
            {reviews?.sentiment_summary && (
              <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
                {[
                  { key:'positive', label:'😊 Positive', color:'#16a34a', bg:'#dcfce7' },
                  { key:'neutral',  label:'😐 Neutral',  color:'#475569', bg:'#f1f5f9' },
                  { key:'negative', label:'😞 Negative', color:'#dc2626', bg:'#fee2e2' },
                ].map(s => (
                  <div key={s.key} style={{ padding:'8px 16px', background:s.bg,
                    borderRadius:20, fontSize:13, color:s.color, fontWeight:500 }}>
                    {s.label}: {reviews.sentiment_summary[s.key]}
                  </div>
                ))}
              </div>
            )}
            {reviews?.reviews?.length === 0 && (
              <p style={{ color:'#64748b' }}>No reviews yet.</p>
            )}
            {reviews?.reviews?.map(r => (
              <div key={r.id} style={{ borderBottom:'1px solid #f1f5f9', paddingBottom:16, marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontWeight:600 }}>{r.customer_name}</span>
                  <StarRating rating={r.rating} size={14} />
                </div>
                <p style={{ fontSize:14, color:'#374151' }}>{r.comment}</p>
                <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ marginBottom:16 }}>Booking Info</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10, fontSize:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'#64748b' }}>Hourly Rate</span>
                <span style={{ fontWeight:700, color:'#2563eb', fontSize:18 }}>₹{provider.hourly_rate}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'#64748b' }}>Service Radius</span>
                <span>{provider.service_radius_km} km</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'#64748b' }}>Availability</span>
                <span style={{ color: provider.is_available ? '#16a34a' : '#dc2626', fontWeight:500 }}>
                  {provider.is_available ? '● Available' : '○ Unavailable'}
                </span>
              </div>
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop:20 }}
              onClick={() => navigate('/categories')}>
              Book Now
            </button>
          </div>

          {/* Availability */}
          {provider.availability?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom:14 }}>Weekly Availability</h3>
              {provider.availability.map(a => (
                <div key={a.id} style={{ display:'flex', justifyContent:'space-between',
                  fontSize:13, padding:'6px 0', borderBottom:'1px solid #f8fafc' }}>
                  <span style={{ fontWeight:500 }}>{days[a.day_of_week]}</span>
                  <span style={{ color: a.is_available ? '#16a34a' : '#dc2626' }}>
                    {a.is_available ? `${a.start_time} – ${a.end_time}` : 'Closed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
