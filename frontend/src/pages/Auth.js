import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandHeader from '../components/BrandHeader';

// ─── Login ────────────────────────────────────────────────────────────────────
export function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]   = useState({ email:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [require2fa, setRequire2fa] = useState(false);
  const [totpCode, setTotpCode] = useState('');

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login({ ...form, totp_code: totpCode });
      if (user.role === 'admin')    navigate('/admin/dashboard');
      else if (user.role === 'provider') navigate('/provider-dashboard');
      else navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.require_2fa) {
        setRequire2fa(true);
      } else {
        const message = err.response?.data?.error || err.response?.data?.non_field_errors?.[0]
          || err.response?.data?.detail
          || err.response?.data?.message
          || 'Login failed. Check your credentials.';
        setError(message);
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg,#eff6ff,#ede9fe)', padding:20 }}>
      <div style={{ position:'absolute', top:20, left:20 }}>
        <BrandHeader />
      </div>
      <div className="card" style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🏠</div>
          <h2 style={{ fontSize:24, fontWeight:800 }}>Welcome Back</h2>
          <p style={{ color:'#64748b', fontSize:14 }}>Sign in to your Fix Buddy account</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          {!require2fa ? (
            <>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" name="email"
                  value={form.email} onChange={handle} required placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" name="password"
                  value={form.password} onChange={handle} required placeholder="••••••••" />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label">Authentication Code (2FA)</label>
              <input className="form-input" type="text" name="totpCode"
                value={totpCode} onChange={(e) => setTotpCode(e.target.value)} required placeholder="123456" />
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop:8 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
          <Link to="/forgot-password" style={{ color:'#2563eb', fontSize:14, fontWeight:500 }}>Forgot Password?</Link>
        </div>



        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'#64748b' }}>
          Don't have an account? <Link to="/register" style={{ color:'#2563eb', fontWeight:500 }}>Register</Link>
        </p>

        {/* Demo credentials */}
        <div style={{ marginTop:20, padding:14, background:'#f8fafc', borderRadius:8, fontSize:13 }}>
          <div style={{ fontWeight:600, marginBottom:6 }}>Demo Accounts:</div>
          <div style={{ color:'#64748b', display:'flex', flexDirection:'column', gap:2 }}>
            <span>🛡️ Admin: admin@demo.com / admin123</span>
            <span>🏠 Customer: customer@demo.com / demo1234</span>
            <span>👷 Provider: provider@demo.com / demo1234</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────
export function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const [form, setForm] = useState({
    email:'', first_name:'', last_name:'', phone:'',
    role: params.get('role') || 'customer',
    city:'', address:'', state:'', pincode:'', password:'', confirm_password:'',
    latitude: null, longitude: null
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setError('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setLocating(false);
      },
      () => {
        setError('Unable to retrieve your location. Please enter address manually.');
        setLocating(false);
      }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await register(form);
      if (user.role === 'provider') navigate('/provider-dashboard');
      else navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      const msg  = typeof data === 'object'
        ? Object.values(data).flat().join(' ')
        : 'Registration failed.';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg,#eff6ff,#ede9fe)', padding:20 }}>
      <div className="card" style={{ width:'100%', maxWidth:520 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>✨</div>
          <h2 style={{ fontSize:24, fontWeight:800 }}>Create Account</h2>
          <p style={{ color:'#64748b', fontSize:14 }}>Join Fix Buddy today</p>
        </div>

        {/* Role selector */}
        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
          {['customer','provider'].map(r => (
            <button key={r} type="button"
              onClick={() => setForm(f => ({...f, role:r}))}
              style={{
                flex:1, padding:'10px', borderRadius:10,
                border: form.role===r ? '2px solid #2563eb' : '1px solid #e2e8f0',
                background: form.role===r ? '#eff6ff' : '#fff',
                color: form.role===r ? '#2563eb' : '#64748b',
                fontWeight:600, cursor:'pointer', fontSize:14
              }}>
              {r === 'customer' ? '🏠 Customer' : '👷 Service Provider'}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" name="first_name" value={form.first_name}
                onChange={handle} required placeholder="John" />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" name="last_name" value={form.last_name}
                onChange={handle} required placeholder="Doe" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" name="email" value={form.email}
              onChange={handle} required placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" name="phone" value={form.phone}
              onChange={handle} placeholder="+91 98765 43210" />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" style={{ margin: 0 }}>Address</label>
              <button type="button" onClick={captureLocation} disabled={locating}
                style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, cursor: locating ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => { if(!locating) e.currentTarget.style.background = '#e2e8f0' }}
                onMouseOut={e => { if(!locating) e.currentTarget.style.background = '#f1f5f9' }}
              >
                {locating ? '📍 Locating...' : '📍 Capture GPS'}
              </button>
            </div>
            <textarea className="form-input" name="address" rows={2} value={form.address}
              onChange={handle} placeholder="123 Main St, Apt 4B or use GPS" required />
            {form.latitude && form.longitude && (
              <div style={{ fontSize: 12, color: '#16a34a', marginTop: 6, fontWeight: 500 }}>
                ✓ GPS captured ({form.latitude.toFixed(4)}, {form.longitude.toFixed(4)})
              </div>
            )}
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" name="city" value={form.city}
                onChange={handle} placeholder="Mumbai" required />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input className="form-input" name="state" value={form.state}
                onChange={handle} placeholder="Maharashtra" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Pincode</label>
            <input className="form-input" name="pincode" value={form.pincode}
              onChange={handle} placeholder="400001" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" name="password" value={form.password}
              onChange={handle} required placeholder="Min. 8 characters" minLength={8} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input className="form-input" type="password" name="confirm_password"
              value={form.confirm_password} onChange={handle} required placeholder="Repeat password" />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop:8 }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>



        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'#64748b' }}>
          Already have an account? <Link to="/login" style={{ color:'#2563eb', fontWeight:500 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}

// ─── Forgot Password ──────────────────────────────────────────────────────────
import API from '../api';

export function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      const res = await API.post('/auth/forgot-password/', { email });
      setMessage(res.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      const res = await API.post('/auth/reset-password/', { email, otp, password });
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg,#eff6ff,#ede9fe)', padding:20 }}>
      <div style={{ position:'absolute', top:20, left:20 }}>
        <BrandHeader />
      </div>
      <div className="card" style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🔒</div>
          <h2 style={{ fontSize:24, fontWeight:800 }}>Reset Password</h2>
          <p style={{ color:'#64748b', fontSize:14 }}>
            {step === 1 ? 'Enter your email to receive an OTP' : 'Enter the OTP and your new password'}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success" style={{ background:'#dcfce3', color:'#166534', padding:12, borderRadius:6, marginBottom:16 }}>{message}</div>}

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop:8 }}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label className="form-label">OTP</label>
              <input className="form-input" type="text" value={otp}
                onChange={e => setOtp(e.target.value)} required placeholder="123456" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop:8 }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'#64748b' }}>
          Remembered your password? <Link to="/login" style={{ color:'#2563eb', fontWeight:500 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
