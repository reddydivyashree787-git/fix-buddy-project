import React, { useEffect, useState } from 'react';
import { authAPI } from '../api';
import ProviderCard from '../components/ProviderCard';
import { useNavigate } from 'react-router-dom';

const getProviderRecommendationScore = (provider) => {
  const rating  = Number(provider.average_rating || 0);
  const reviews = Number(provider.total_reviews || 0);
  const jobs    = Number(provider.total_bookings_completed || 0);

  const reviewImpact = Math.min(reviews, 150) / 150;
  const jobImpact = Math.min(jobs, 300) / 300;

  return (rating / 5) * 0.6 + reviewImpact * 0.25 + jobImpact * 0.15;
};

export default function Providers() {
  const [providers, setProviders] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [filters, setFilters]     = useState({ city:'', min_rating:'', max_rate:'', sort_by:'-average_rating' });
  const [loading, setLoading]     = useState(true);
  const navigate = useNavigate();

  const load = (extra = {}) => {
    setLoading(true);
    authAPI.getProviders({ ...filters, ...extra })
      .then(r => {
        const list = r.data.results || r.data;
        const scored = list.map(p => ({
          ...p,
          recommendation_score: getProviderRecommendationScore(p),
        }));

        const top = [...scored]
          .sort((a, b) => b.recommendation_score - a.recommendation_score)
          .slice(0, 4);

        setProviders(scored);
        setRecommended(top);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="container page">
      <div className="section-header">
        <h1 className="section-title">Service Providers</h1>
        <span style={{ color:'#64748b', fontSize:14 }}>{providers.length} found</span>
      </div>

      {recommended.length > 0 && (
        <div className="section-header" style={{ marginTop:20 }}>
          <h2 className="section-title">Recommended for you</h2>
          <span style={{ color:'#64748b', fontSize:14 }}>Based on rating, customer reviews and completed jobs</span>
        </div>
      )}
      <div className="grid-3" style={{ marginBottom:24 }}>
        {recommended.map(provider => (
          <ProviderCard
            key={`rec-${provider.id}`}
            provider={provider}
            onBook={() => navigate(`/providers/${provider.id}`)}
          />
        ))}
      </div>

      {/* Filters */}
      <div style={{ 
        marginBottom:32, display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-end',
        background: 'linear-gradient(145deg, #312e81 0%, #4338ca 100%)',
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 12px 30px rgba(49,46,129,0.25)',
        color: 'white'
      }}>
        <div className="form-group" style={{ margin:0, flex:1, minWidth:140 }}>
          <label style={{ display:'block', marginBottom:8, fontWeight:600, fontSize:14, color:'#e0e7ff', letterSpacing: '0.5px' }}>City</label>
          <input className="form-input" placeholder="e.g. Mumbai"
            style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
            value={filters.city} onChange={e => setFilters(f => ({...f, city:e.target.value}))} />
        </div>
        <div className="form-group" style={{ margin:0, flex:1, minWidth:140 }}>
          <label style={{ display:'block', marginBottom:8, fontWeight:600, fontSize:14, color:'#e0e7ff', letterSpacing: '0.5px' }}>Min Rating</label>
          <select className="form-select" value={filters.min_rating}
            style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
            onChange={e => setFilters(f => ({...f, min_rating:e.target.value}))}>
            <option value="" style={{ color: 'black' }}>Any</option>
            {[3,4,4.5].map(r => <option key={r} value={r} style={{ color: 'black' }}>{r}+</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin:0, flex:1, minWidth:140 }}>
          <label style={{ display:'block', marginBottom:8, fontWeight:600, fontSize:14, color:'#e0e7ff', letterSpacing: '0.5px' }}>Max Rate (₹/hr)</label>
          <input className="form-input" type="number" placeholder="e.g. 500"
            style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
            value={filters.max_rate} onChange={e => setFilters(f => ({...f, max_rate:e.target.value}))} />
        </div>
        <div className="form-group" style={{ margin:0, flex:1, minWidth:160 }}>
          <label style={{ display:'block', marginBottom:8, fontWeight:600, fontSize:14, color:'#e0e7ff', letterSpacing: '0.5px' }}>Sort By</label>
          <select className="form-select" value={filters.sort_by}
            style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
            onChange={e => setFilters(f => ({...f, sort_by:e.target.value}))}>
            <option value="-average_rating" style={{ color: 'black' }}>Highest Rating</option>
            <option value="hourly_rate" style={{ color: 'black' }}>Lowest Price</option>
            <option value="-total_bookings_completed" style={{ color: 'black' }}>Most Experienced</option>
          </select>
        </div>
        <button 
          style={{ 
            background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)',
            color: '#1e293b', padding: '0 32px', border: 'none', borderRadius: '12px',
            fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px rgba(245,158,11,0.3)',
            transition: 'all 0.2s', height: '48px', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '1px'
          }}
          onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 25px rgba(245,158,11,0.4)'; }}
          onMouseOut={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(245,158,11,0.3)'; }}
          onClick={() => load()}
        >
          Apply Filters
        </button>
      </div>

      {loading
        ? <div className="loading-center"><div className="spinner" /></div>
        : <div className="grid-3">
            {providers.map(p => (
              <ProviderCard key={p.id} provider={p}
                onBook={() => navigate('/categories')} />
            ))}
            {!providers.length && (
              <div className="card" style={{ gridColumn:'1/-1', textAlign:'center', padding:48, color:'#64748b' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
                <p>No providers found matching your criteria.</p>
              </div>
            )}
          </div>
      }
    </div>
  );
}
