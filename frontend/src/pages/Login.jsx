import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';

const HoldToVerify = ({ onVerified, resetToggle }) => {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [verified, setVerified] = useState(false);
  
  useEffect(() => {
    setVerified(false);
    setProgress(0);
    onVerified(false);
  }, [resetToggle]);
  
  useEffect(() => {
    let interval;
    if (isHolding && !verified) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setVerified(true);
            onVerified(true);
            return 100;
          }
          return prev + 4; // Fills in ~750ms
        });
      }, 30);
    } else if (!isHolding && !verified) {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isHolding, verified, onVerified]);

  return (
    <div 
      onMouseDown={() => setIsHolding(true)}
      onMouseUp={() => setIsHolding(false)}
      onMouseLeave={() => setIsHolding(false)}
      onTouchStart={() => setIsHolding(true)}
      onTouchEnd={() => setIsHolding(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: '55px',
        background: verified ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${verified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: verified ? 'default' : 'pointer',
        overflow: 'hidden',
        userSelect: 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {!verified && (
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress}%`, background: 'rgba(255,255,255,0.08)', transition: 'width 0.05s linear' }} />
      )}
      <span style={{ position: 'relative', zIndex: 1, fontSize: '0.75rem', fontWeight: '600', color: verified ? '#6ee7b7' : 'rgba(255,255,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase' }}>
        {verified ? 'Terverifikasi' : 'Tahan untuk Verifikasi Keamanan'}
      </span>
    </div>
  );
};

const TermsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(5px)' }}>
      <div style={{ background: '#09090b', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', animation: 'fade-in 0.2s ease', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Dokumen Legal Akses Sistem</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.5rem', padding: 0, transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = 'rgba(255,255,255,0.5)'}>&times;</button>
        </div>
        <div style={{ padding: '2rem', overflowY: 'auto', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: '1.7' }}>
          <h4 style={{ color: '#fff', marginTop: 0, letterSpacing: '0.5px' }}>1. Yurisdiksi dan Pengikatan</h4>
          <p>Dengan melakukan otorisasi pendaftaran pada infrastruktur GRADIA, Anda selaku Pengguna terikat secara hukum pada klausul ini. Infrastruktur ini dirancang eksklusif untuk validasi dan otomasi dokumen akademis skala enterprise.</p>
          
          <h4 style={{ color: '#fff', letterSpacing: '0.5px' }}>2. Enkripsi dan Privasi Dokumen</h4>
          <p>Seluruh transmisi muatan dokumen yang diproses melalui sistem ini dilindungi oleh protokol keamanan ketat. GRADIA tidak bertanggung jawab atas kebocoran yang diakibatkan oleh kompromi dari sisi perangkat keras (hardware) atau peramban (browser) Pengguna.</p>
          
          <h4 style={{ color: '#fff', letterSpacing: '0.5px' }}>3. Integritas Sistem</h4>
          <p>Dilarang keras melakukan rekayasa balik (reverse-engineering), pengikisan data (data scraping), atau serangan penetrasi jaringan pada infrastruktur. Pelanggaran terhadap klausul ini akan memicu pemutusan akses permanen seketika.</p>
        </div>
        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', background: 'rgba(255,255,255,0.02)' }}>
          <button onClick={onClose} style={{ background: '#fff', color: '#000', border: 'none', padding: '0.75rem 2rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Saya Mengerti</button>
        </div>
      </div>
    </div>
  );
};

export default function Login() {
  const [view, setView] = useState('login'); // 'login', 'register', 'verify', 'forgot', 'reset'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const [fullName, setFullName] = useState('');
  const [institution, setInstitution] = useState('');
  
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [captchaResetToggle, setCaptchaResetToggle] = useState(false);
  const [acceptTnc, setAcceptTnc] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

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
    
    if (!acceptTnc) {
      setError('Otorisasi pendaftaran ditolak. Anda belum menyetujui dokumen legal.');
      return;
    }

    if (!isHumanVerified) {
      setError('Verifikasi keamanan wajib diselesaikan.');
      setCaptchaResetToggle(!captchaResetToggle);
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
      setCaptchaResetToggle(!captchaResetToggle);
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
    <>
    <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
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
            margin: '0'
          }}>
            GRADIA
          </h1>
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
                <button type="button" onClick={() => { setView('register'); setCaptchaResetToggle(!captchaResetToggle); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: '600', padding: 0, textDecoration: 'underline' }}>
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
                
                <HoldToVerify onVerified={setIsHumanVerified} resetToggle={captchaResetToggle} />
                
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <input type="checkbox" id="tnc" checked={acceptTnc} onChange={(e) => setAcceptTnc(e.target.checked)} 
                    style={{ marginTop: '0.25rem', accentColor: '#fff', width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                  />
                  <label htmlFor="tnc" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5', cursor: 'pointer' }}>
                    Saya tunduk pada seluruh <button type="button" onClick={() => setShowTerms(true)} style={{ background: 'none', border: 'none', color: '#fff', textDecoration: 'underline', padding: 0, cursor: 'pointer', fontSize: '0.75rem' }}>Dokumen Legal Akses Sistem</button> dan siap bertanggung jawab secara korporat apabila terjadi pelanggaran akses.
                  </label>
                </div>

                <button type="submit" disabled={loading} style={{ width: '100%', background: '#fff', color: '#000', border: 'none', padding: '1.1rem', fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s', marginTop: '0.5rem' }}>
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
    </>
  );
}
