import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { servicesAPI } from '../api';
import StarRating from '../components/StarRating';

const ICONS = ['🔧','⚡','🧹','🪚','❄️','🎨','🌿','🚿','🛡️','🔑'];

const CATEGORY_ICONS = {
  plumbing: '🚿',
  electric: '⚡',
  electricity: '⚡',
  electrical: '⚡',
  carpentry: '🪚',
  painting: '🎨',
  cleaning: '🧹',
  ac: '❄️',
  air: '❄️',
  landscaping: '🌿',
  security: '🛡️',
  locksmith: '🔑',
  technical: '⚙️',
  default: '🔧',
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

const CATEGORY_BGS = {
  plumbing: '/images/plumbing.png',
  electric: '/images/electrical.png',
  electricity: '/images/electrical.png',
  electrical: '/images/electrical.png',
  painting: '/images/painting.png',
  cleaning: '/images/cleaning.png',
  default: '/images/hero.png',
};

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

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch]         = useState('');
  const [results, setResults]       = useState(null);
  const [searching, setSearching]   = useState(false);
  const [searchError, setSearchError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();
  const debounceRef = useRef(null);


  useEffect(() => {
    servicesAPI.getCategories()
      .then(r => setCategories(r.data.results || r.data))
      .catch(err => console.error('Unable to load categories:', err));
  }, []);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setResults(null);
      setSearchError('');
      return;
    }

    setSearching(true);
    setSearchError('');
    try {
      const response = await servicesAPI.search(query);
      const data = response.data || response;
      
      // Handle the response structure safely
      const categories = data.categories || [];
      const subcategories = data.subcategories || [];
      const providers = data.providers || [];
      
      if (!categories.length && !subcategories.length && !providers.length) {
        setSearchError('No results found. Try broader keywords like "plumbing" or "electrical".');
      }
      
      setResults({ categories, subcategories, providers });
      setSuggestions([
        ...categories.slice(0, 3).map(c => ({ label: c.name, type: 'category', id: c.id })),
        ...subcategories.slice(0, 3).map(s => ({ label: s.name, type: 'subcategory', id: s.id })),
      ]);
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };


  return (
    <div>
      {/* Hero */}
      <div style={{
        position: 'relative',
        color: '#fff', padding: '100px 0', textAlign: 'center',
        backgroundImage: `url('/images/hero.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,23,42,0.8), rgba(15,23,42,0.95))', zIndex: 0 }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize:42, fontWeight:800, marginBottom:12, lineHeight:1.2, color: '#fcd34d', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            Expert Home Services,<br/>At Your Doorstep
          </h1>
          <p style={{ fontSize:18, color: '#f8fafc', opacity:.9, marginBottom:36, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            Book trusted professionals for plumbing, electrical, cleaning & more
          </p>

          <form onSubmit={e => { e.preventDefault(); handleSearch(search); }} 
            style={{ 
              display:'flex', 
              maxWidth: 650, 
              margin:'0 auto', 
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: '8px',
              borderRadius: '50px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.2)',
              alignItems: 'center'
            }}>
            <div style={{ padding: '0 16px', fontSize: '20px', color: 'rgba(255,255,255,0.9)' }}>🔍</div>
            <input
              className="hero-search-input"
              value={search}
              onChange={e => {
                const val = e.target.value;
                setSearch(val);
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => handleSearch(val), 350);
              }}
              placeholder="What service do you need today?"
              style={{ 
                flex:1, 
                padding:'12px 0', 
                border:'none',
                background: 'transparent',
                fontSize: 16, 
                color: '#fff',
                outline: 'none',
              }}
            />
            <button type="submit" disabled={searching}
              style={{ 
                padding:'14px 32px', 
                background:'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)', 
                color:'#1e293b', 
                border:'none',
                borderRadius:'40px', 
                fontSize:16, 
                fontWeight:800, 
                cursor:'pointer', 
                whiteSpace:'nowrap',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.6)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.4)'; }}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div style={{ marginTop:24, display:'flex', gap:20, justifyContent:'center', fontSize:14, opacity:.8 }}>
            <span>✅ 10,000+ Verified Professionals</span>
            <span>⭐ 4.8 Average Rating</span>
            <span>🚀 Same-Day Service</span>
          </div>

          {searchError && (
            <div style={{ marginTop:14, maxWidth:560, margin:'14px auto 0', color:'#dc2626', fontSize:14, background:'#fee2e2', padding:10, borderRadius:8 }}>
              {searchError}
            </div>
          )}

          {suggestions.length > 0 && (
            <div style={{ marginTop:14, maxWidth:560, margin:'14px auto 0', display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
              {suggestions.map((item,index) => (
                <button
                  key={index}
                  onClick={() => { setSearch(item.label); handleSearch(item.label); }}
                  style={{ background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:20, padding:'6px 10px', fontSize:13, cursor:'pointer' }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Premium Emergency Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
        padding: '28px 0',
        color: 'white',
        boxShadow: '0 10px 30px rgba(220, 38, 38, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background glow */}
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }} />

        <div className="container" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap: 'wrap', gap: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ display:'flex', gap:18, alignItems:'center' }}>
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              width: 56, height: 56,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
              boxShadow: '0 0 20px rgba(255,255,255,0.2)'
            }}>🚨</div>
            <div>
              <div style={{ fontWeight:800, fontSize: 22, letterSpacing: '0.5px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>Emergency Service Available 24/7</div>
              <div style={{ fontSize:15, color: '#fee2e2', marginTop: 4, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>Get the nearest professional assigned to your location within minutes</div>
            </div>
          </div>
          <Link to="/emergency" style={{
            background: 'white',
            color: '#b91c1c',
            fontWeight: 800,
            padding: '14px 32px',
            borderRadius: '50px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontSize: '14px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
            transition: 'all 0.2s ease-in-out',
            textDecoration: 'none',
            display: 'inline-block'
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)'; e.currentTarget.style.color = '#dc2626'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.25)'; e.currentTarget.style.color = '#b91c1c'; }}
          >
            Book Emergency Now
          </Link>
        </div>
      </div>

      <div className="container page">

        {/* Search Results */}
        {results && (
          <div className="card" style={{ marginBottom:32 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <h3>Search Results for "{search}"</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setResults(null)}>✕ Clear</button>
            </div>
            {results.subcategories?.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontWeight:600, marginBottom:8, fontSize:14, color:'#64748b' }}>SERVICES</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {results.subcategories.map(s => (
                    <Link key={s.id} to={`/book/${s.id}`}
                      style={{ padding:'6px 14px', background:'#eff6ff', color:'#2563eb',
                        borderRadius:20, fontSize:13, border:'1px solid #dbeafe' }}>
                      {s.name} — ₹{s.base_price}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {results.providers?.length > 0 && (
              <div>
                <div style={{ fontWeight:600, marginBottom:8, fontSize:14, color:'#64748b' }}>PROVIDERS</div>
                <div className="grid-3">
                  {results.providers.map(p => (
                    <Link key={p.id} to={`/providers/${p.id}`} className="card" style={{ display:'block' }}>
                      <div style={{ fontWeight:600 }}>{p.user?.full_name}</div>
                      <div style={{ fontSize:13, color:'#64748b' }}>{p.user?.city}</div>
                      <StarRating rating={p.average_rating} size={13} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {!results.subcategories?.length && !results.providers?.length && (
              <p style={{ color:'#64748b' }}>No results found for "{search}".</p>
            )}
          </div>
        )}

        {/* Categories */}
        <div className="section-header">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:32 }}>📦</span>
            <h2 className="section-title">Browse Services</h2>
          </div>
          <Link to="/categories" style={{ color:'#2563eb', fontSize:14 }}>View All →</Link>
        </div>

        <div className="grid-4" style={{ marginBottom:48 }}>
          {categories.slice(0, 8).map((cat, i) => (
            <Link
              key={cat.id}
              to={`/categories/${cat.id}`}
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
                e.currentTarget.style.transform='translateY(-8px)'; 
                e.currentTarget.style.boxShadow='0 20px 40px rgba(0,0,0,.3)'; 
                e.currentTarget.querySelector('.category-bg').style.transform='scale(1.1)';
              }}
              onMouseOut={e => { 
                e.currentTarget.style.transform='translateY(0)'; 
                e.currentTarget.style.boxShadow='0 10px 20px rgba(0,0,0,.1)'; 
                e.currentTarget.querySelector('.category-bg').style.transform='scale(1)';
              }}
            >
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
                <div style={{ fontWeight:800, marginBottom:6, fontSize: 20, color: '#f8fafc', textShadow: '0 2px 4px rgba(0,0,0,0.8)', letterSpacing: '0.5px' }}>{cat.name}</div>
                <div style={{ fontSize:14, color: '#cbd5e1', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{cat.subcategory_count} Services</div>
              </div>
            </Link>
          ))}
        </div>

      </div> {/* End container page */}

      {/* How it works - Full Width Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(30,58,138,1) 100%)', 
        position: 'relative',
        padding: '80px 0',
        marginBottom: '64px'
      }}>
        
        <div className="container" style={{ position: 'relative', zIndex: 1, color: 'white' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, color: '#fcd34d' }}>How It Works</h2>
            <p style={{ fontSize: 16, color: '#cbd5e1', maxWidth: 600, margin: '0 auto' }}>Getting your home services sorted has never been this simple. Follow these three easy steps.</p>
          </div>
          
          <div className="grid-3" style={{ gap: 32 }}>
            {[
              { step: '01', icon:'🔍', title:'Search & Choose', desc:'Browse categories, filter by rating, price & location to find your perfect service provider.', image: '/images/cleaning.png' },
              { step: '02', icon:'📅', title:'Book Instantly', desc:'Pick your preferred date & time. Get instant confirmation or quick provider response.', image: '/images/electrical.png' },
              { step: '03', icon:'✅', title:'Get It Done', desc:'Professional arrives on time, completes the job, and you rate the experience.', image: '/images/painting.png' },
            ].map(step => (
              <div key={step.title} style={{ 
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '24px', 
                padding: '48px 32px', 
                textAlign:'center',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                cursor: 'pointer',
                boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
                border: 'none',
                minHeight: '350px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
              onMouseOver={e => { 
                e.currentTarget.style.transform = 'translateY(-12px)'; 
                e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.4)'; 
                e.currentTarget.querySelector('.hiw-bg').style.transform = 'scale(1.1)';
              }}
              onMouseOut={e => { 
                e.currentTarget.style.transform = 'translateY(0)'; 
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.2)';
                e.currentTarget.querySelector('.hiw-bg').style.transform = 'scale(1)';
              }}
              >
                {/* Background Image */}
                <div className="hiw-bg" style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(${step.image})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  zIndex: 0, transition: 'transform 0.5s ease',
                }} />
                {/* Gradient Overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.4))', zIndex: 1 }} />
                
                {/* Large Background Watermark Number */}
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: 160, fontWeight: 900, color: 'rgba(255,255,255,0.08)', lineHeight: 1, zIndex: 1 }}>{step.step}</div>
                
                {/* Icon Container */}
                <div style={{ 
                  position: 'relative', zIndex: 2,
                  width: 80, height: 80, margin: '0 auto 24px auto',
                  background: 'linear-gradient(135deg, rgba(252, 211, 77, 0.2), rgba(245, 158, 11, 0.05))',
                  border: '1px solid rgba(252, 211, 77, 0.3)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36,
                  boxShadow: '0 0 20px rgba(252, 211, 77, 0.15)'
                }}>
                  <div style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>{step.icon}</div>
                </div>

                {/* Content */}
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <h3 style={{ marginBottom:16, fontSize: 24, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.5px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{step.title}</h3>
                  <p style={{ color:'#cbd5e1', fontSize:15, lineHeight: 1.7, opacity: 0.9, margin: 0, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: '64px' }}>
        {/* Premium CTA */}
        <div style={{ 
          position: 'relative',
          background: '#0f172a',
          borderRadius: 32,
          padding: '64px 40px', 
          textAlign: 'center', 
          color: '#fff', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Abstract glows */}
          <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-50%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
              border: '1px solid rgba(255,255,255,0.2)', marginBottom: 24,
              boxShadow: '0 0 20px rgba(255,255,255,0.05)'
            }}>
              <span style={{ fontSize:40, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}>🚀</span>
            </div>
            
            <h2 style={{ fontSize:36, fontWeight:900, marginBottom:16, fontFamily: "'Outfit', system-ui, sans-serif", letterSpacing: '-0.5px' }}>
              Are You a Service Professional?
            </h2>
            <p style={{ opacity: 0.8, marginBottom:36, fontSize: 18, maxWidth: 600, margin: '0 auto 36px auto', lineHeight: 1.6, fontFamily: "'Outfit', system-ui, sans-serif" }}>
              Join 10,000+ top-rated providers. Set your own schedule, control your pricing, and dramatically grow your business.
            </p>
            <Link to="/register?role=provider" 
              style={{ 
                display: 'inline-block',
                background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)', 
                color: '#1e293b', 
                fontWeight: 800, 
                padding: '16px 40px', 
                fontSize: 16, 
                borderRadius: '50px',
                textDecoration: 'none',
                boxShadow: '0 8px 25px rgba(245,158,11,0.3)',
                transition: 'all 0.3s ease',
                fontFamily: "'Outfit', system-ui, sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(245,158,11,0.4)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(245,158,11,0.3)'; }}
            >
              Start Earning Today
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
