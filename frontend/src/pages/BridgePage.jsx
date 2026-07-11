import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { ExternalLink, ShoppingBag, Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export default function BridgePage() {
  const { id } = useParams();
  const [linkData, setLinkData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(15); // Wait 15s to force them to read/look at ads

  useEffect(() => {
    const fetchBridgeData = async () => {
      try {
        const res = await axios.get(`${API_URL}/bridge/${id}`);
        setLinkData(res.data);
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchBridgeData();
  }, [id]);

  useEffect(() => {
    let timer;
    if (!loading && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [loading, countdown]);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
        <div className="spinner" style={{ width: '50px', height: '50px', borderTopColor: 'var(--primary-accent)', borderRadius: '50%' }}></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Tautan tidak ditemukan</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Link ini mungkin sudah kedaluwarsa atau dihapus.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '0', display: 'flex', flexDirection: 'column' }}>
      {/* Corporate Header */}
      <header style={{ background: '#09090b', padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', letterSpacing: '-1px', fontWeight: '900' }}>
          GRADIA
        </h1>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <Clock size={14} /> Secure Gateway
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
        
        {/* Information Snippet */}
        <article style={{ marginBottom: '3rem', animation: 'fade-in 0.5s ease', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', lineHeight: '1.2', marginBottom: '1.5rem', color: '#fff', fontWeight: 'bold' }}>
            {linkData.news_title}
          </h2>

          <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'rgba(255,255,255,0.6)', maxWidth: '600px', margin: '0 auto' }}>
            {linkData.news_summary}
          </div>
        </article>

        {/* Corporate Sponsorship Gateway */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0', padding: '3rem', textAlign: 'center', marginBottom: '3rem', position: 'relative' }}>
           <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', padding: '0.2rem 1rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
             Mitra Strategis
           </div>
           <ShoppingBag size={48} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 1.5rem auto' }} />
           <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#fff', letterSpacing: '0.5px' }}>Tinjauan Rekomendasi Eksternal</h3>
           <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontSize: '1rem' }}>
             Kami mendeteksi korelasi antara aktivitas akademis Anda dengan penawaran perangkat pendukung berikut.
           </p>
           
           <a href={linkData.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: '#fff', color: '#000', textDecoration: 'none', padding: '1rem 2.5rem', fontSize: '0.95rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '0.8'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
             Tinjau Penawaran <ExternalLink size={18} />
           </a>
        </div>

        {/* Proceed to Destination */}
        <div style={{ textAlign: 'center', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Otorisasi lanjutan akses dokumen Anda sedang disiapkan.
          </p>
          
          <a 
            href={countdown === 0 ? linkData.news_source_url : '#'} 
            target={countdown === 0 ? '_blank' : '_self'}
            rel="noreferrer"
            style={{ 
              display: 'inline-block', 
              padding: '1rem 2rem', 
              background: 'transparent', 
              color: countdown === 0 ? '#fff' : 'rgba(255,255,255,0.3)', 
              border: `1px solid ${countdown === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
              textDecoration: 'none', 
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              cursor: countdown === 0 ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease'
            }}
            onClick={(e) => {
              if (countdown > 0) e.preventDefault();
            }}
          >
            {countdown > 0 ? `Lanjutkan Akses (${countdown}s)` : 'Otorisasi Akses Tersedia'}
          </a>
        </div>

      </main>
    </div>
  );
}
