import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn, GraduationCap, UserPlus, KeyRound } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';

export default function Login() {
  const [view, setView] = useState('login'); // 'login', 'register', 'verify'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

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
        setError("Akun belum diverifikasi. Silakan cek email Anda untuk OTP.");
        setView('verify');
      } else {
        setError(err.response?.data?.detail || 'Login failed. Check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.post(`${API_URL}/auth/register`, { 
        email, 
        password,
        role: email.includes('admin') ? 'ADMIN' : 'STUDENT'
      });
      setMessage('Pendaftaran berhasil! Kode OTP telah dikirim ke email Anda.');
      setView('verify');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registrasi gagal.');
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
      setMessage('Verifikasi berhasil! Silakan masuk.');
      setView('login');
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Kode OTP tidak valid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '2rem', background: 'radial-gradient(circle at center, rgba(109, 40, 217, 0.15) 0%, transparent 60%)' }}>
      <div className="glass-panel glass-panel-hover" style={{ width: '100%', maxWidth: '420px', padding: '3rem 2.5rem', animation: 'fade-in 0.5s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ background: 'rgba(109, 40, 217, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: '0 0 20px rgba(109, 40, 217, 0.2)' }}>
            <GraduationCap size={40} color="var(--primary-accent)" />
          </div>
          <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Gradia Platform</h2>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.95rem' }}>AI Assistant Kelas Enterprise</p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fade-in 0.3s ease'
          }}>
            <strong style={{ color: 'var(--danger)' }}>Error:</strong> {error}
          </div>
        )}

        {message && (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#6ee7b7', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fade-in 0.3s ease'
          }}>
            <strong style={{ color: 'var(--success)' }}>Sukses:</strong> {message}
          </div>
        )}

        {/* --- VERIFY OTP VIEW --- */}
        {view === 'verify' && (
          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem', animation: 'fade-in 0.3s ease' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                Masukkan 6-digit kode OTP yang dikirimkan ke:<br/>
                <strong style={{ color: 'var(--text-main)', display: 'block', marginTop: '0.5rem' }}>{email}</strong>
              </p>
            </div>
            
            <div>
              <input 
                type="text" 
                className="input-glass"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                required
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '1rem', padding: '1.25rem' }}
              />
            </div>
            <button type="submit" className="btn-primary flex-center gap-4" disabled={loading} style={{ padding: '1.25rem', fontSize: '1.05rem', width: '100%' }}>
              {loading ? 'Memverifikasi...' : <><KeyRound size={20} /> Verifikasi Akun</>}
            </button>
            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginTop: '0.5rem', padding: '0.5rem' }} onClick={() => setView('login')}>
              &larr; Kembali ke Login
            </button>
          </form>
        )}

        {/* --- LOGIN VIEW --- */}
        {view === 'login' && (
          <div style={{ animation: 'fade-in 0.3s ease' }}>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                  Alamat Email
                </label>
                <input type="email" className="input-glass" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mahasiswa@kampus.ac.id" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                  Kata Sandi
                </label>
                <input type="password" className="input-glass" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn-primary flex-center gap-4" disabled={loading} style={{ padding: '1.1rem', fontSize: '1.05rem', marginTop: '0.5rem', width: '100%' }}>
                {loading ? 'Mengotentikasi...' : <><LogIn size={20} /> Masuk ke Aplikasi</>}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              Belum memiliki akses?{' '}
              <button onClick={() => setView('register')} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
                Daftar Gratis
              </button>
            </p>

            <div style={{ display: 'flex', alignItems: 'center', margin: '2rem 0', opacity: 0.5 }}>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--text-muted))' }}></div>
              <span style={{ padding: '0 1.5rem', fontSize: '0.8rem', letterSpacing: '0.1em' }}>ATAU LANJUTKAN DENGAN</span>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--text-muted))' }}></div>
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
                      setError('Otentikasi Google gagal dari server.');
                    }
                  }}
                  onError={() => {
                    setError('Login Google dibatalkan atau gagal.');
                  }}
                  useOneTap
                  theme="outline"
                  size="large"
                  text="continue_with"
                  width="100%"
                />
              </div>
            </GoogleOAuthProvider>
          </div>
        )}

        {/* --- REGISTER VIEW --- */}
        {view === 'register' && (
          <div style={{ animation: 'fade-in 0.3s ease' }}>
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                  Alamat Email Valid
                </label>
                <input type="email" className="input-glass" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mahasiswa@kampus.ac.id" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                  Buat Kata Sandi
                </label>
                <input type="password" className="input-glass" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 karakter keamanan tinggi" required />
              </div>
              <button type="submit" className="btn-primary flex-center gap-4" disabled={loading} style={{ padding: '1.1rem', fontSize: '1.05rem', marginTop: '0.5rem', width: '100%' }}>
                {loading ? 'Memproses Pendaftaran...' : <><UserPlus size={20} /> Buat Akun Enterprise</>}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              Sudah pernah mendaftar?{' '}
              <button onClick={() => setView('login')} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
                Masuk di sini
              </button>
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
