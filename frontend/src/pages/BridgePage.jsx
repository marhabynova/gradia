import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { ExternalLink, ShoppingBag, Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export default function BridgePage() {
  const { id } = useParams();
  const [linkData, setLinkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(15); // Wait 15s to force them to read/look at ads

  useEffect(() => {
    // In a real app, this would fetch from a specific public endpoint.
    // For MVP, we'll just mock the fetch or use the admin endpoint if it was public.
    setTimeout(() => {
      setLinkData({
        news_title: "Mahasiswa Ini Raup Puluhan Juta Berkat Trik Rahasia",
        news_summary: "Banyak yang tidak menyangka bahwa dari kamar kos kecil, seorang mahasiswa berhasil mencetak omzet puluhan juta rupiah. Rahasianya ternyata sangat sederhana dan bisa ditiru oleh siapa saja yang memiliki koneksi internet...",
        news_source_url: "https://news.detik.com",
        url: "https://shope.ee/contoh_affiliate",
        created_at: new Date().toISOString()
      });
      setLoading(false);
    }, 800);
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

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '0', display: 'flex', flexDirection: 'column' }}>
      {/* Fake News Header */}
      <header style={{ background: '#1e293b', padding: '1.5rem 2rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#38bdf8', letterSpacing: '-0.02em', fontWeight: '900' }}>
          Viral<span style={{ color: '#f8fafc' }}>News</span>
        </h1>
        <div style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={14} /> Trending Hari Ini
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
        
        {/* The News Snippet */}
        <article style={{ marginBottom: '3rem', animation: 'fade-in 0.5s ease' }}>
          <h2 style={{ fontSize: '2.5rem', lineHeight: '1.2', marginBottom: '1.5rem', color: '#f1f5f9' }}>
            {linkData.news_title}
          </h2>
          
          <div style={{ width: '100%', height: '300px', background: '#334155', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            [Gambar Berita]
          </div>

          <div style={{ fontSize: '1.2rem', lineHeight: '1.8', color: '#cbd5e1' }}>
            {linkData.news_summary}
          </div>
        </article>

        {/* The "Bridge" / Native Ad */}
        <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(14, 165, 233, 0.05))', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', marginBottom: '3rem', position: 'relative', overflow: 'hidden' }}>
           <div style={{ position: 'absolute', top: 0, right: 0, background: '#0ea5e9', fontSize: '0.7rem', padding: '0.2rem 1rem', borderBottomLeftRadius: '12px', fontWeight: 'bold' }}>
             SPONSORED
           </div>
           <ShoppingBag size={48} color="#38bdf8" style={{ margin: '0 auto 1.5rem auto' }} />
           <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Rahasia Sukses: Diskon 80% Alat Ini!</h3>
           <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '1.1rem' }}>
             Ini dia barang yang dibahas di berita atas. Sedang promo gila-gilaan, stok terbatas.
           </p>
           
           <a href={linkData.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: '#0ea5e9', color: '#fff', textDecoration: 'none', padding: '1rem 2.5rem', borderRadius: '99px', fontSize: '1.1rem', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)', transition: 'transform 0.2s ease' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
             Beli Sekarang di Shopee/TikTok <ExternalLink size={18} />
           </a>
        </div>

        {/* Proceed to Full News */}
        <div style={{ textAlign: 'center', padding: '2rem', borderTop: '1px solid #334155' }}>
          <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
            Ingin melanjutkan membaca berita asli dari sumbernya?
          </p>
          
          <a 
            href={countdown === 0 ? linkData.news_source_url : '#'} 
            target={countdown === 0 ? '_blank' : '_self'}
            rel="noreferrer"
            style={{ 
              display: 'inline-block', 
              padding: '1rem 2rem', 
              background: countdown === 0 ? '#334155' : '#1e293b', 
              color: countdown === 0 ? '#f8fafc' : '#64748b', 
              textDecoration: 'none', 
              borderRadius: '8px',
              cursor: countdown === 0 ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease'
            }}
            onClick={(e) => {
              if (countdown > 0) e.preventDefault();
            }}
          >
            {countdown > 0 ? `Lanjutkan ke Berita (${countdown}s)` : 'Baca Selengkapnya di Sumber Asli'}
          </a>
        </div>

      </main>
    </div>
  );
}
