import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';

export default function Login() {
  const [view, setView] = useState('login'); // 'login', 'register', 'verify', 'forgot', 'reset'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const [fullName, setFullName] = useState('');
  const [institution, setInstitution] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [expectedCaptcha, setExpectedCaptcha] = useState({ q: '', a: 0 });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setExpectedCaptcha({ q: `${num1} + ${num2} = ?`, a: num1 + num2 });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      
      const token = response.data.access_token;
      localStorage.setItem('gradia_token', token);
      
      if (email.includes('admin')) {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail === "Email not verified") {
        setError("Akun belum diverifikasi. Silakan cek instruksi di email Anda.");
        setView('verify');
      } else {
        setError(err.response?.data?.detail || 'Autentikasi gagal. Periksa kembali kredensial Anda.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (parseInt(captchaAnswer) !== expectedCaptcha.a) {
      setError('Verifikasi Captcha gagal. Silakan coba lagi.');
      generateCaptcha();
      setCaptchaAnswer('');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.post(`${API_URL}/auth/register`, { 
        email, 
        password,
        full_name: fullName,
        institution,
        role: email.includes('admin') ? 'ADMIN' : 'STUDENT'
      });
      setMessage('Registrasi sistem berhasil. Kode otentikasi telah dikirim ke alamat email.');
      setView('verify');
    } catch (err) {
      setError(err.response?.data?.detail || 'Pendaftaran gagal mematuhi ketentuan sistem.');
      generateCaptcha();
      setCaptchaAnswer('');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.post(`${API_URL}/auth/verify-otp`, { email, otp });
      setMessage('Otorisasi sistem berhasil. Silakan masuk dengan kredensial Anda.');
      setView('login');
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Kode validasi tidak terotorisasi.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setMessage('Apabila profil tercatat, instruksi pemulihan telah didistribusikan.');
      setView('reset');
    } catch (err) {
      setError('Sistem tidak dapat memproses permintaan otorisasi.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { 
        email,
        otp,
        new_password: password
      });
      setMessage('Pembaruan sandi berhasil tercatat. Silakan login kembali.');
      setView('login');
      setOtp('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal menyinkronkan sandi baru. Kode invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Left Panel - Corporate Branding */}
      <div className="login-sidebar" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4rem', borderRight: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(0, 0, 0, 0.95))' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h1 style={{ 
            fontFamily: '"Inter", "Helvetica Neue", sans-serif', 
            fontSize: '5.5rem', 
            fontWeight: '900', 
            letterSpacing: '-2px',
            color: '#fff',
            margin: '0 0 1rem 0'
          }}>
            GRADIA
          </h1>
          <div style={{ height: '3px', width: '80px', background: 'var(--primary-accent)', marginBottom: '2.5rem' }}></div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.25rem', lineHeight: '1.6', margin: 0, fontWeight: '300' }}>
            Sistem analisis dokumen tingkat lanjut dengan tingkat akurasi tinggi.
          </p>
        </div>
      </div>

      {/* Right Panel - Minimalist Auth Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', position: 'relative' }}>
        
        <div style={{ width: '100%', maxWidth: '380px' }}>
          
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.85rem', fontWeight: '600', color: '#fff', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
              {view === 'login' ? 'Masuk ke Portal' : 
               view === 'register' ? 'Registrasi Kredensial' : 
               view === 'verify' ? 'Validasi Keamanan' : 
               view === 'forgot' ? 'Pemulihan Akses' : 
               'Pembaruan Sandi'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.95rem' }}>
              Akses terbatas untuk pengguna terdaftar.
            </p>
          </div>

          {error && (
            <div style={{ background: 'transparent', borderLeft: '3px solid var(--danger)', color: '#fca5a5', padding: '0.75rem 1rem', marginBottom: '2rem', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.05)' }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{ background: 'transparent', borderLeft: '3px solid var(--success)', color: '#6ee7b7', padding: '0.75rem 1rem', marginBottom: '2rem', fontSize: '0.9rem', background: 'rgba(16, 185, 129, 0.05)' }}>
              {message}
            </div>
          )}

          {/* --- FORGOT PASSWORD VIEW --- */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fade-in 0.3s ease' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                  Alamat Email Terdaftar
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required 
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 0', color: '#fff', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s', borderRadius: 0 }}
                  onFocus={(e) => e.target.style.borderBottom = '1px solid var(--primary-accent)'}
                  onBlur={(e) => e.target.style.borderBottom = '1px solid rgba(255,255,255,0.2)'}
                />
              </div>
              
              <div>
                <button type="submit" disabled={loading} style={{ width: '100%', background: '#fff', color: '#000', border: 'none', padding: '1.1rem', fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s' }}>
                  {loading ? 'Memproses...' : 'Kirim Instruksi'}
                </button>
                <button type="button" onClick={() => setView('login')} style={{ width: '100%', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.9rem', marginTop: '1rem' }}>
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* --- RESET PASSWORD VIEW --- */}
          {view === 'reset' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fade-in 0.3s ease' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                  Kode Pemulihan
                </label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required 
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 0', color: '#fff', fontSize: '1.25rem', letterSpacing: '8px', outline: 'none', transition: 'border-color 0.2s', borderRadius: 0 }}
                  onFocus={(e) => e.target.style.borderBottom = '1px solid var(--primary-accent)'}
                  onBlur={(e) => e.target.style.borderBottom = '1px solid rgba(255,255,255,0.2)'}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                  Sandi Baru
                </label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required 
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 0', color: '#fff', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s', borderRadius: 0 }}
                  onFocus={(e) => e.target.style.borderBottom = '1px solid var(--primary-accent)'}
                  onBlur={(e) => e.target.style.borderBottom = '1px solid rgba(255,255,255,0.2)'}
                />
              </div>
              
              <button type="submit" disabled={loading} style={{ width: '100%', background: '#fff', color: '#000', border: 'none', padding: '1.1rem', fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s' }}>
                {loading ? 'Menyinkronkan...' : 'Simpan Kredensial'}
              </button>
            </form>
          )}

          {/* --- VERIFY OTP VIEW --- */}
          {view === 'verify' && (
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fade-in 0.3s ease' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                  Kode Otentikasi
                </label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required 
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 0', color: '#fff', fontSize: '1.25rem', letterSpacing: '8px', outline: 'none', transition: 'border-color 0.2s', borderRadius: 0 }}
                  onFocus={(e) => e.target.style.borderBottom = '1px solid var(--primary-accent)'}
                  onBlur={(e) => e.target.style.borderBottom = '1px solid rgba(255,255,255,0.2)'}
                />
                <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Terkirim ke {email}</p>
              </div>
              
              <button type="submit" disabled={loading} style={{ width: '100%', background: '#fff', color: '#000', border: 'none', padding: '1.1rem', fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s' }}>
                {loading ? 'Memvalidasi...' : 'Otorisasi Akun'}
              </button>
            </form>
          )}

          {/* --- LOGIN VIEW --- */}
          {view === 'login' && (
            <div style={{ animation: 'fade-in 0.3s ease' }}>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                    Alamat Email
                  </label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required 
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 0', color: '#fff', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s', borderRadius: 0 }}
                    onFocus={(e) => e.target.style.borderBottom = '1px solid var(--primary-accent)'}
                    onBlur={(e) => e.target.style.borderBottom = '1px solid rgba(255,255,255,0.2)'}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                      Sandi Akses
                    </label>
                    <button type="button" onClick={() => setView('forgot')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.8rem', padding: 0, textDecoration: 'underline' }}>
                      Lupa?
                    </button>
                  </div>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required 
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 0', color: '#fff', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s', borderRadius: 0 }}
                    onFocus={(e) => e.target.style.borderBottom = '1px solid var(--primary-accent)'}
                    onBlur={(e) => e.target.style.borderBottom = '1px solid rgba(255,255,255,0.2)'}
                  />
                </div>
                
                <button type="submit" disabled={loading} style={{ width: '100%', background: '#fff', color: '#000', border: 'none', padding: '1.1rem', fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem', transition: 'opacity 0.2s' }}>
                  {loading ? 'Otentikasi...' : 'Masuk'}
                </button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', margin: '2.5rem 0', opacity: 0.15 }}>
                <div style={{ flex: 1, height: '1px', background: '#fff' }}></div>
                <span style={{ padding: '0 1rem', fontSize: '0.7rem', letterSpacing: '0.15em', fontWeight: 'bold' }}>SSO</span>
                <div style={{ flex: 1, height: '1px', background: '#fff' }}></div>
              </div>

              <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      try {
                        const res = await axios.post(`${API_URL}/auth/google/login`, {
                          id_token: credentialResponse.credential
                        });
                        localStorage.setItem('gradia_token', res.data.access_token);
                        navigate('/student');
                      } catch (err) {
                        setError('Otentikasi SSO gagal.');
                      }
                    }}
                    onError={() => {
                      setError('Otentikasi SSO dibatalkan.');
                    }}
                    useOneTap
                    theme="filled_black"
                    shape="square"
                    width="100%"
                  />
                </div>
              </GoogleOAuthProvider>

              <p style={{ textAlign: 'center', marginTop: '3.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                Tidak memiliki akses?{' '}
                <button type="button" onClick={() => { setView('register'); generateCaptcha(); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: '600', padding: 0, textDecoration: 'underline' }}>
                  Registrasi
                </button>
              </p>
            </div>
          )}

          {/* --- REGISTER VIEW --- */}
          {view === 'register' && (
            <div style={{ animation: 'fade-in 0.3s ease' }}>
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                    Nama Lengkap
                  </label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required 
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 0', color: '#fff', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s', borderRadius: 0 }}
                    onFocus={(e) => e.target.style.borderBottom = '1px solid var(--primary-accent)'}
                    onBlur={(e) => e.target.style.borderBottom = '1px solid rgba(255,255,255,0.2)'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                    Institusi / Universitas
                  </label>
                  <input type="text" value={institution} onChange={(e) => setInstitution(e.target.value)} required 
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 0', color: '#fff', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s', borderRadius: 0 }}
                    onFocus={(e) => e.target.style.borderBottom = '1px solid var(--primary-accent)'}
                    onBlur={(e) => e.target.style.borderBottom = '1px solid rgba(255,255,255,0.2)'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                    Alamat Email Instansi
                  </label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required 
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 0', color: '#fff', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s', borderRadius: 0 }}
                    onFocus={(e) => e.target.style.borderBottom = '1px solid var(--primary-accent)'}
                    onBlur={(e) => e.target.style.borderBottom = '1px solid rgba(255,255,255,0.2)'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                    Sandi Keamanan Baru
                  </label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required 
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 0', color: '#fff', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s', borderRadius: 0 }}
                    onFocus={(e) => e.target.style.borderBottom = '1px solid var(--primary-accent)'}
                    onBlur={(e) => e.target.style.borderBottom = '1px solid rgba(255,255,255,0.2)'}
                  />
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                    Verifikasi Keamanan (Math Captcha)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: '1', fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '3px' }}>
                      {expectedCaptcha.q}
                    </div>
                    <div style={{ flex: '2' }}>
                      <input type="number" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} required placeholder="Hasil..."
                        style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem', color: '#fff', fontSize: '1.05rem', outline: 'none', transition: 'border-color 0.2s', textAlign: 'center' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary-accent)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                      />
                    </div>
                  </div>
                </div>
                
                <button type="submit" disabled={loading} style={{ width: '100%', background: '#fff', color: '#000', border: 'none', padding: '1.1rem', fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem', transition: 'opacity 0.2s' }}>
                  {loading ? 'Memproses...' : 'Daftar Sistem'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '3.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                Telah terdaftar?{' '}
                <button type="button" onClick={() => setView('login')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: '600', padding: 0, textDecoration: 'underline' }}>
                  Buka Portal
                </button>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
