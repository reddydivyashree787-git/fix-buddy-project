import React from 'react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating';

export default function ProviderCard({ provider, servicePrice, onBook }) {
  const u = provider.user || provider;
  const name = u.full_name || `${u.first_name} ${u.last_name}`;
  const city = u.city || '—';

  return (
    <div style={{ 
      display:'flex', flexDirection:'column', gap:16, 
      background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderTop: '1px solid rgba(255,255,255,0.15)',
      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      borderRadius: '20px',
      padding: '24px',
      color: '#f8fafc'
    }}
    onMouseOver={e => { e.currentTarget.style.transform='translateY(-6px)'; e.currentTarget.style.boxShadow='0 15px 35px rgba(0,0,0,0.25)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.2)'; }}
    onMouseOut={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 8px 25px rgba(0,0,0,0.15)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}
    >
      {/* Header */}
      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <div style={{
          width:48, height:48, borderRadius:'50%', 
          background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:800, fontSize:20, color:'#1e293b', flexShrink:0,
          boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)'
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:16, letterSpacing: '0.3px' }}>{name}</div>
          <div style={{ fontSize:13, color:'#cbd5e1' }}>📍 {city}</div>
        </div>
        {provider.is_verified && (
          <span style={{ marginLeft:'auto', fontSize:12, background:'rgba(22, 163, 74, 0.15)', color:'#4ade80',
            border: '1px solid rgba(74, 222, 128, 0.2)', padding:'4px 10px', borderRadius:20, fontWeight: 600 }}>✓ Verified</span>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:16, fontSize:13 }}>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <StarRating rating={provider.average_rating} size={14} />
          <span style={{ marginLeft:6, color:'#94a3b8', fontWeight: 600 }}>
            {Number(provider.average_rating).toFixed(1)} ({provider.total_reviews})
          </span>
        </span>
        <span style={{ color:'#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>🏆 {provider.experience_years}y exp</span>
        <span style={{ color:'#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>✅ {provider.total_bookings_completed} jobs</span>
      </div>

      {/* Price */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight:800, fontSize:20, color:'#fcd34d' }}>
            ₹{servicePrice || provider.hourly_rate}
          </span>
          <span style={{ fontSize:11, color:'#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>/service</span>
        </div>
        {provider.score && (
          <span style={{ fontSize:13, background:'rgba(59, 130, 246, 0.15)', color:'#60a5fa',
            border: '1px solid rgba(96, 165, 250, 0.2)', padding:'4px 12px', borderRadius:20, fontWeight: 600 }}>
            Score: {provider.score}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:12, marginTop: '8px' }}>
        <Link
          to={`/providers/${provider.id}`}
          style={{ 
            flex:1, 
            textAlign:'center', 
            padding:'12px', 
            borderRadius:'50px', 
            background: 'rgba(255,255,255,0.05)',
            color: '#f8fafc',
            border: '1px solid rgba(255,255,255,0.1)',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseOver={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.2)'; }}
          onMouseOut={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}
        >
          View Profile
        </Link>
        {onBook && (
          <button 
            style={{ 
              flex:1, 
              padding:'12px', 
              borderRadius:'50px', 
              background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)', 
              color: '#1e293b',
              border: 'none',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
            }}
            onClick={onBook}
            onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(245, 158, 11, 0.5)'; }}
            onMouseOut={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 15px rgba(245, 158, 11, 0.3)'; }}
          >
            Book Now
          </button>
        )}
      </div>
    </div>
  );
}
