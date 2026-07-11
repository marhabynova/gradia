import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show navbar on login page
  if (location.pathname === '/login') return null;

  const handleLogout = () => {
    localStorage.removeItem('gradia_token');
    navigate('/login');
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-1px', color: '#fff' }}>
          GRADIA
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button
          onClick={() => navigate('/panduan-integritas')}
          style={{
            background: 'transparent',
            border: 'none',
            color: location.pathname === '/panduan-integritas' ? '#10b981' : 'var(--text-muted)',
            fontSize: '0.85rem',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            padding: 0
          }}
        >
          Panduan Integritas Akademik
        </button>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Infrastruktur: <span style={{ color: '#10b981', fontWeight: 'bold' }}>Aktif</span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'var(--text-main)',
            padding: '0.4rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseOut={(e) => e.target.style.background = 'transparent'}
        >
          Keluar
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
