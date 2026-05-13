import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandHeader from './BrandHeader';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const dashboardPath =
    user?.role === 'admin'    ? '/admin-dashboard' :
    user?.role === 'provider' ? '/provider-dashboard' : '/dashboard';

  return (
    <nav style={{
      background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      position: 'sticky', top: 0, zIndex: 100, height: 72, fontFamily: "'Outfit', sans-serif"
    }}>
      <div className="container" style={{ display:'flex', alignItems:'center', height:'100%', gap:32 }}>
        <BrandHeader />

        <div style={{ flex:1, display:'flex', gap:16, alignItems:'center' }}>
          {(!user || user.role === 'customer') && (
            <>
              <Link to="/categories" style={{ fontSize:15, fontWeight:500, color:'#cbd5e1', padding:'8px 16px', borderRadius:50, transition:'all 0.2s', textDecoration:'none' }}
                onMouseOver={e => { e.target.style.color = '#fff'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseOut={e => { e.target.style.color = '#cbd5e1'; e.target.style.background = 'transparent'; }}
              >
                Services
              </Link>
              <Link to="/providers" style={{ fontSize:15, fontWeight:500, color:'#cbd5e1', padding:'8px 16px', borderRadius:50, transition:'all 0.2s', textDecoration:'none' }}
                onMouseOver={e => { e.target.style.color = '#fff'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseOut={e => { e.target.style.color = '#cbd5e1'; e.target.style.background = 'transparent'; }}
              >
                Providers
              </Link>
              <Link to="/emergency" style={{
                fontSize:14, fontWeight:700, color:'#fca5a5', padding:'8px 18px', textDecoration:'none',
                borderRadius:50, border:'1px solid rgba(239, 68, 68, 0.3)', background:'rgba(239, 68, 68, 0.1)',
                transition: 'all 0.3s', textTransform: 'uppercase', letterSpacing: '1px'
              }}
              onMouseOver={e => { e.target.style.background = 'rgba(239, 68, 68, 0.2)'; e.target.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.3)'; }}
              onMouseOut={e => { e.target.style.background = 'rgba(239, 68, 68, 0.1)'; e.target.style.boxShadow = 'none'; }}
              >
                🚨 Emergency
              </Link>
            </>
          )}
        </div>

        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
          {user ? (
            <>
              <NotificationBell user={user} />
              <Link to={dashboardPath} style={{
                fontSize:14, fontWeight:600, color:'#fcd34d', padding:'8px 16px', textDecoration:'none',
                borderRadius:50, border:'1px solid rgba(252, 211, 77, 0.3)', background:'rgba(252, 211, 77, 0.1)', transition:'all 0.2s'
              }}
              onMouseOver={e => { e.target.style.background = 'rgba(252, 211, 77, 0.2)'; }}
              onMouseOut={e => { e.target.style.background = 'rgba(252, 211, 77, 0.1)'; }}
              >
                {user.first_name}
              </Link>
              <button style={{
                fontSize: 14, fontWeight: 600, color: '#fca5a5', padding: '8px 20px', borderRadius: 50,
                border: '1px solid rgba(239, 68, 68, 0.3)', background: 'transparent', transition: 'all 0.3s', cursor: 'pointer'
              }} 
              onMouseOver={e => { e.target.style.background = 'rgba(239, 68, 68, 0.1)'; }}
              onMouseOut={e => { e.target.style.background = 'transparent'; }}
              onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{
                fontSize: 14, fontWeight: 600, color: '#fff', padding: '8px 20px', borderRadius: 50,
                border: '1px solid rgba(255,255,255,0.2)', transition: 'all 0.3s', textDecoration: 'none'
              }}
              onMouseOver={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseOut={e => { e.target.style.background = 'transparent'; }}
              >
                Login
              </Link>
              <Link to="/register" style={{
                fontSize: 14, fontWeight: 700, color: '#1e293b', padding: '8px 20px', borderRadius: 50,
                background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)', textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)', transition: 'all 0.3s'
              }}
              onMouseOver={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.5)'; }}
              onMouseOut={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.3)'; }}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
