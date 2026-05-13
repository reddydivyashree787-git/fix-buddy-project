import React, { useState, useEffect, useRef } from 'react';
import { chatbotAPI } from '../api';

let SESSION_KEY = localStorage.getItem('chat_session') || null;

export default function Chatbot() {
  const [open, setOpen]       = useState(false);
  const [messages, setMsgs]   = useState([
    {
      sender:'bot',
      message:"Hi! 👋 I'm your Fix Buddy assistant. How can I help you today?",
      suggestions:['Book a service', 'Emergency help', 'Pricing info', 'Find a provider']
    }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Request user location when chatbot opens
    if (open && !userLocation) {
      getUserLocation();
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        () => {
          // Location access denied - that's okay
          console.log('Location not available');
        }
      );
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMsgs(m => [...m, { sender:'user', message: text }]);
    setLoading(true);
    try {
      const payload = { message: text, session_key: SESSION_KEY };
      if (userLocation) {
        payload.latitude = userLocation.lat;
        payload.longitude = userLocation.lon;
      }
      const { data } = await chatbotAPI.sendMessage(payload);
      SESSION_KEY = data.session_key;
      localStorage.setItem('chat_session', SESSION_KEY);
      setMsgs(m => [
        ...m,
        {
          sender:'bot',
          message: data.reply,
          suggestions: data.suggestions || [],
          recommendations: data.recommendations || [],
          nearby_services: data.nearby_services || null,
          booking_hint: data.booking_hint || null,
          intent: data.intent || 'general',
          sentiment: data.sentiment || 'neutral'
        }
      ]);
    } catch {
      setMsgs(m => [...m, { sender:'bot', message:'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const quickReplies = ['Book a service', 'Emergency help', 'Pricing info', 'Find a provider'];

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:'fixed', bottom:24, right:24, width:56, height:56,
          borderRadius:'50%', background:'#2563eb', color:'#fff', border:'none',
          fontSize:24, cursor:'pointer', boxShadow:'0 4px 12px rgba(37,99,235,.4)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000,
          transition:'transform .2s'
        }}
        title="Chat with us"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position:'fixed', bottom:92, right:24, width:360, height:520,
          background:'#fff', borderRadius:16, boxShadow:'0 8px 32px rgba(0,0,0,.15)',
          display:'flex', flexDirection:'column', zIndex:1000, overflow:'hidden',
          border:'1px solid #e2e8f0'
        }}>
          {/* Header */}
          <div style={{ background:'#2563eb', padding:'14px 16px', display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,.2)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🤖</div>
            <div>
              <div style={{ color:'#fff', fontWeight:600, fontSize:14 }}>Fix Buddy Bot</div>
              <div style={{ color:'rgba(255,255,255,.7)', fontSize:12 }}>Always here to help</div>
            </div>
            <div style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%', background:'#4ade80' }} />
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:10 }}>
            {messages.map((m, i) => (
              <React.Fragment key={i}>
                <div style={{ display:'flex', justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth:'80%', padding:'10px 14px', borderRadius:
                      m.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: m.sender === 'user' ? '#2563eb' : '#f1f5f9',
                    color: m.sender === 'user' ? '#fff' : '#1e293b',
                    fontSize:13, lineHeight:1.6,
                    whiteSpace:'pre-wrap'
                  }}>
                    {m.message}
                  </div>
                </div>

                {m.sender === 'bot' && m.suggestions && m.suggestions.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginLeft:'auto', maxWidth:'80%' }}>
                    {m.suggestions.slice(0, 4).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setInput(suggestion); }}
                        style={{ fontSize:11, padding:'4px 10px', borderRadius:20, border:'1px solid #dbeafe', background:'#eff6ff', color:'#2563eb', cursor:'pointer' }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {m.sender === 'bot' && m.recommendations && m.recommendations.length > 0 && (
                  <div style={{ marginLeft: 'auto', maxWidth: '80%', background: '#f8fafc', padding: 8, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 600, marginBottom: 4 }}>Top Provider Recommendations</div>
                    {m.recommendations.map((prov, idx) => (
                      <div key={idx} style={{ marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{prov.name} {prov.is_verified ? '✓' : ''}</div>
                        <div style={{ fontSize: 12, color: '#475569' }}>{prov.service} · {prov.city}</div>
                        <div style={{ fontSize: 12, color: '#475569' }}>⭐ {prov.rating} · ₹{prov.price}</div>
                      </div>
                    ))}
                  </div>
                )}

                {m.sender === 'bot' && m.nearby_services && (
                  <div style={{ marginLeft: 'auto', maxWidth: '85%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, marginTop: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 18 }}>{m.nearby_services.icon}</span>
                      {m.nearby_services.service_name}
                    </div>
                    {m.nearby_services.places.map((place, idx) => (
                      <div key={idx} style={{ 
                        background: '#f8fafc', 
                        borderRadius: 8, 
                        padding: 10, 
                        marginBottom: idx < m.nearby_services.places.length - 1 ? 8 : 0,
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>
                          {place.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                          📍 {place.address}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                          <div style={{ fontSize: 11, color: '#475569' }}>
                            📞 {place.phone}
                          </div>
                          <div style={{ fontSize: 11, display: 'flex', gap: 6 }}>
                            {place.rating > 0 && (
                              <span style={{ color: '#f59e0b' }}>⭐ {place.rating}</span>
                            )}
                            <span style={{ color: '#64748b' }}>📏 {place.distance}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 10, color: '#2563eb', marginTop: 4, background: '#eff6ff', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>
                          {place.type}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
            {loading && (
              <div style={{ display:'flex', gap:4, padding:'10px 14px', background:'#f1f5f9',
                borderRadius:'16px 16px 16px 4px', width:'fit-content' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#94a3b8',
                    animation:`bounce .8s ${i*0.15}s infinite` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 1 && (
            <div style={{ padding:'0 16px 8px', display:'flex', flexWrap:'wrap', gap:6 }}>
              {quickReplies.map(r => (
                <button key={r} onClick={() => { setInput(r); }}
                  style={{ fontSize:12, padding:'4px 10px', borderRadius:20, border:'1px solid #dbeafe',
                    background:'#eff6ff', color:'#2563eb', cursor:'pointer' }}>
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:'12px 16px', borderTop:'1px solid #e2e8f0', display:'flex', gap:8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your message..."
              style={{ flex:1, padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:20,
                fontSize:13, outline:'none' }}
            />
            <button
              onClick={send} disabled={!input.trim() || loading}
              style={{ width:36, height:36, borderRadius:'50%', background:'#2563eb', color:'#fff',
                border:'none', cursor:'pointer', display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:16, opacity: (!input.trim()||loading)?0.5:1 }}
            >➤</button>
          </div>
        </div>
      )}

      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
    </>
  );
}
