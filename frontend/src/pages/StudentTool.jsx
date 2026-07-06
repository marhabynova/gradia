import { useState, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, Download, Timer, Zap } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export default function StudentTool() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, done
  const [versionId, setVersionId] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [isPremium, setIsPremium] = useState(false); // Default to FREE for MVP
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [quotaError, setQuotaError] = useState(null); // { message: string }
  const [uploadError, setUploadError] = useState(null);
  const [isParaphrasing, setIsParaphrasing] = useState(false);
  const [paraphrasedText, setParaphrasedText] = useState("");
  const [suggestedCitation, setSuggestedCitation] = useState("");
  const [isFixingBib, setIsFixingBib] = useState(false);
  const [isSyncingToc, setIsSyncingToc] = useState(false);
  const [isSuggestingCitation, setIsSuggestingCitation] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFixBibliography = async () => {
    setIsFixingBib(true);
    try {
      const token = localStorage.getItem('gradia_token');
      const res = await axios.post(`${API_URL}/student/documents/${versionId}/fix-bibliography`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert(res.data.message + "\n\n" + res.data.changes_made.join('\n'));
    } catch (err) {
      alert("Gagal memperbaiki daftar pustaka.");
    } finally {
      setIsFixingBib(false);
    }
  };

  const handleSyncTOC = async () => {
    setIsSyncingToc(true);
    try {
      const token = localStorage.getItem('gradia_token');
      const res = await axios.post(`${API_URL}/student/documents/${versionId}/sync-toc`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert(res.data.message);
    } catch (err) {
      alert("Gagal mensinkronisasi daftar isi.");
    } finally {
      setIsSyncingToc(false);
    }
  };

  const handleSuggestCitation = async (textSnippet) => {
    setIsSuggestingCitation(true);
    try {
      const token = localStorage.getItem('gradia_token');
      const res = await axios.post(`${API_URL}/student/documents/${versionId}/plagiarism-suggest-citation`, null, {
        params: { text_snippet: textSnippet },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuggestedCitation(res.data.improved_text);
    } catch (err) {
      alert("Gagal memberikan saran sitasi.");
    } finally {
      setIsSuggestingCitation(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.pdf') || droppedFile.name.endsWith('.docx')) {
        setFile(droppedFile);
      } else {
        alert('Format file tidak didukung. Harap gunakan .pdf atau .docx');
      }
    }
  };

  const handleParaphrase = async (chunkId) => {
    setIsParaphrasing(true);
    setQuotaError(null);
    try {
      const token = localStorage.getItem('gradia_token');
      // Replace mock-chunk-id with actual chunkId in real integration
      const response = await axios.post(`${API_URL}/student/documents/${versionId || 'dummy-version'}/paraphrase/${chunkId}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setParaphrasedText(response.data.paraphrased);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 402) {
        setQuotaError(err.response.data.detail); // The limit message
      } else {
        alert('Gagal melakukan paraphrase.');
      }
    } finally {
      setIsParaphrasing(false);
    }
  };

  const handleUpgradeVIP = async (amount) => {
    setIsUpgrading(amount);
    try {
      const token = localStorage.getItem('gradia_token');
      // For MVP simulation, we call the backend API we just built
      const response = await axios.post(`${API_URL}/subscription/checkout`, { amount }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Menampilkan modal QRIS
      setCheckoutData(response.data);
      setIsUpgrading(false);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat tagihan. Silakan coba lagi.');
      setIsUpgrading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    
    setStatus('uploading');
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('gradia_token');
      const response = await axios.post(`${API_URL}/student/documents/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      // Mocking immediate response for MVP. In reality, we'd poll or use WebSockets.
      setVersionId(response.data.data.version_id);
      setStatus('done');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setUploadError(err.response?.data?.detail || 'Terjadi kesalahan saat mengunggah dokumen.');
    }
  };

  const handleDownloadIntent = async (mode) => {
    try {
      const token = localStorage.getItem('gradia_token');
      const response = await axios.post(`${API_URL}/student/documents/${versionId}/download-intent`, 
        { mode },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      const data = response.data;
      setTicketData(data);
      setShowModal(true);
      
      if (mode === 'FAST') {
        // Open affiliate link in new tab, and they can download immediately
        window.open(data.redirect_url, '_blank');
        setCountdown(0);
      } else {
        // Normal wait mode
        setCountdown(data.wait_seconds);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal mengambil tiket unduhan.');
    }
  };

  useEffect(() => {
    let timer;
    if (countdown > 0 && showModal) {
      timer = setInterval(() => {
        setCountdown(c => c - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown, showModal]);

  const redeemTicket = async () => {
    if (countdown > 0) return;
    try {
      const token = localStorage.getItem('gradia_token');
      const response = await axios.get(`${API_URL}/student/documents/redeem/${ticketData.ticket_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Redirect to the GCS Signed URL
      window.location.href = response.data.download_url;
      setShowModal(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Gagal redeem tiket. Jangan tutup halaman ini sebelum waktunya!');
      setShowModal(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '6rem', paddingBottom: '6rem' }}>
      
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '4rem', animation: 'fade-in 1s ease' }}>
        <h1 className="text-gradient" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>AI Academic Assessor</h1>
        <p className="text-muted" style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
          Tingkatkan kualitas dokumen akademis secara presisi. Validasi tingkat orisinalitas, standarisasi format, dan sempurnakan tata bahasa menggunakan teknologi kecerdasan buatan.
        </p>
      </div>

      {status === 'idle' && (
        <div style={{ maxWidth: '650px', margin: '0 auto' }}>
          
          {/* VIP PRICING SECTION */}
          {!isPremium && (
            <div style={{ marginBottom: '3rem' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem', color: 'var(--text-main)' }}>
                Bandingkan & Pilih Paket Anda
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {/* FREE TIER */}
                <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.8 }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>Paket Dasar (Gratis)</h4>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Rp 0</div>
                  <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <li>Maks. ukuran file <strong>5MB</strong></li>
                    <li>Pemeriksaan Orisinalitas Teks</li>
                    <li>Sistem Antrean Pengunduhan</li>
                    <li style={{ textDecoration: 'line-through', opacity: 0.5 }}>Asisten Parafrase Otomatis</li>
                    <li style={{ textDecoration: 'line-through', opacity: 0.5 }}>Standarisasi Format & Daftar Isi</li>
                  </ul>
                  <button className="btn-secondary" style={{ width: '100%', opacity: 0.5 }} disabled>Sedang Digunakan</button>
                </div>

                {/* 25RB TIER */}
                <div className="glass-panel glass-panel-hover" style={{ padding: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#f59e0b' }}>Paket Profesional</h4>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#fff' }}>Rp 25.000</div>
                  <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <li>Maks. ukuran file <strong>15MB</strong></li>
                    <li>Asisten Parafrase Otomatis</li>
                    <li>Sistem Antrean Pengunduhan</li>
                    <li style={{ textDecoration: 'line-through', opacity: 0.5, color: 'var(--text-muted)' }}>Integrasi Referensi Jurnal</li>
                    <li style={{ textDecoration: 'line-through', opacity: 0.5, color: 'var(--text-muted)' }}>Standarisasi Daftar Pustaka</li>
                  </ul>
                  <button 
                    className="btn-secondary" 
                    style={{ width: '100%', borderColor: '#f59e0b', color: '#f59e0b' }} 
                    onClick={() => handleUpgradeVIP(25000)}
                    disabled={isUpgrading}
                  >
                    {isUpgrading === 25000 ? 'Memproses...' : 'Pilih Profesional'}
                  </button>
                </div>

                {/* 80RB TIER */}
                <div className="glass-panel glass-panel-hover" style={{ padding: '1.5rem', border: '2px solid #10b981', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-10px', right: '10px', background: '#10b981', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px', fontWeight: 'bold' }}>REKOMENDASI</div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#10b981' }}>Paket Enterprise</h4>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#fff' }}>Rp 80.000</div>
                  <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <li>Maks. ukuran file <strong>50MB</strong></li>
                    <li><strong>Parafrase AI Lanjutan</strong></li>
                    <li><strong>Integrasi Referensi Jurnal Akademik</strong></li>
                    <li><strong>Standarisasi Format & Daftar Pustaka</strong></li>
                    <li>Sistem Antrean Pengunduhan</li>
                  </ul>
                  <button 
                    className="btn-primary" 
                    style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }} 
                    onClick={() => handleUpgradeVIP(80000)}
                    disabled={isUpgrading}
                  >
                    {isUpgrading === 80000 ? 'Memproses...' : 'Pilih Enterprise'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Unggah Dokumen Skripsi</h3>
            <p className="text-muted" style={{ marginTop: 0, fontSize: '0.95rem' }}>
              Mendukung format .docx atau .pdf<br/>
              <strong style={{ color: isPremium ? 'var(--success)' : 'var(--danger)' }}>
                Maksimal {isPremium ? '50MB (Premium)' : '5MB (Biasa)'}
              </strong>
            </p>
            
            <label 
              className={`drop-zone ${file ? 'active' : ''} ${isDragActive ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadCloud className="drop-zone-icon" size={56} />
              {file ? (
                <div style={{ animation: 'fade-in 0.3s ease' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--success)', fontSize: '1.25rem' }}>Dokumen Siap Diproses</h4>
                  <span style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '1.1rem' }}>{file.name}</span>
                </div>
              ) : (
                <span className="text-muted" style={{ fontSize: '1.1rem' }}>Klik atau seret dokumen akademis Anda ke area ini</span>
              )}
              <input 
                type="file" 
                className="file-input-hidden"
                accept=".docx,.pdf" 
                onChange={e => setFile(e.target.files[0])}
              />
            </label>
            
            <button className="btn-primary" onClick={handleUpload} disabled={!file} style={{ width: '100%', marginTop: '1.5rem', padding: '1.25rem', fontSize: '1.1rem' }}>
              <Zap size={20} /> Mulai Analisis Pintar
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="glass-panel glass-panel-hover" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <AlertTriangle size={64} color="var(--danger)" style={{ margin: '0 auto 1.5rem auto' }} />
          <h3 style={{ color: 'var(--danger)', fontSize: '1.5rem' }}>Dokumen Ditolak</h3>
          <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>{uploadError}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => { setStatus('idle'); setFile(null); }}>
              Muat Ulang
            </button>
            {!isPremium && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" onClick={() => handleUpgradeVIP(25000)} style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>VIP Profesional</button>
                <button className="btn-primary" onClick={() => handleUpgradeVIP(80000)} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>VIP Enterprise</button>
              </div>
            )}
          </div>
        </div>
      )}

      {status === 'uploading' && (
        <div className="flex-center" style={{ flexDirection: 'column', padding: '6rem 0' }}>
          <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '2rem' }}>
            <div className="animate-pulse-ring"></div>
            <div className="spinner animate-spin-slow" style={{ 
              width: '100%', height: '100%', 
              border: `4px solid ${isPremium ? 'rgba(245, 158, 11, 0.2)' : 'rgba(109, 40, 217, 0.2)'}`,
              borderTop: `4px solid ${isPremium ? '#f59e0b' : 'var(--primary-accent)'}`,
              borderRadius: '50%',
              position: 'relative',
              zIndex: 2
            }} />
          </div>
          
          <h3 style={{ color: isPremium ? '#f59e0b' : 'inherit', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {isPremium ? 'Pemrosesan Algoritma Lanjutan Aktif' : 'Menganalisis Struktur Dokumen...'}
          </h3>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>
            {isPremium 
              ? 'Melakukan restrukturisasi linguistik dan mengintegrasikan referensi sitasi akademik...' 
              : 'Sistem sedang menganalisis pola penulisan dan memvalidasi indeks orisinalitas.'}
          </p>
          
          <div style={{ width: '300px', marginTop: '2rem' }}>
             <div className="skeleton-loader" style={{ height: '8px', width: '100%' }}></div>
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="glass-panel glass-panel-hover" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                <CheckCircle color="var(--success)" size={40} />
              </div>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem' }}>Evaluasi Selesai</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="text-muted">Indeks Kesamaan Teks:</span>
                  <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '4px 12px', borderRadius: '99px', fontWeight: 'bold' }}>24% Terdeteksi</span>
                </div>
              </div>
            </div>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Download size={20} />
              Unduh Hasil Dokumen
            </button>
          </div>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Rincian Temuan AI</h3>
            
            {/* Mocked Plagiarism Match Card */}
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <AlertTriangle size={20} color="var(--danger)" />
                  <strong style={{ color: 'var(--danger)', fontSize: '1.1rem' }}>Indikasi Plagiarisme (92% Mirip)</strong>
                </div>
                <span className="text-sm text-muted">Sumber: <a href="#" style={{ color: 'var(--primary-accent)' }}>wikipedia.org</a></span>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', borderLeft: '4px solid var(--danger)' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: '1.6' }} id="mock-text">
                  "Metodologi penelitian ini menggunakan pendekatan kualitatif dengan observasi langsung di lapangan untuk mengambil data primer..."
                </p>
              </div>
              
              {paraphrasedText && (
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', borderLeft: '4px solid var(--success)' }}>
                  <p style={{ margin: 0, color: 'var(--success)', lineHeight: '1.6' }}><strong>Parafrase AI:</strong> {paraphrasedText}</p>
                </div>
              )}

              {suggestedCitation && (
                <div style={{ background: 'rgba(14, 165, 233, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', borderLeft: '4px solid #0ea5e9' }}>
                  <p style={{ margin: 0, color: '#0ea5e9', lineHeight: '1.6' }}><strong>Rekomendasi Sitasi:</strong> {suggestedCitation}</p>
                </div>
              )}
              
              {quotaError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} /> <strong>Akses Ditolak:</strong> {quotaError}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-secondary" onClick={() => handleUpgradeVIP(25000)} style={{ padding: '0.5rem 1rem', borderColor: '#f59e0b', color: '#f59e0b' }}>Paket 25rb</button>
                    <button className="btn-primary" onClick={() => handleUpgradeVIP(80000)} style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Paket 80rb</button>
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                {!paraphrasedText && !quotaError && (
                  <button className="btn-secondary" style={{ flex: 1, borderColor: 'rgba(255,255,255,0.1)' }} onClick={() => handleParaphrase('mock-chunk')} disabled={isParaphrasing}>
                    <Zap size={18} /> 
                    {isParaphrasing ? 'Memproses Parafrase...' : 'Gunakan Asisten Parafrase'}
                  </button>
                )}
                {!suggestedCitation && !quotaError && (
                  <button className="btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }} onClick={() => handleSuggestCitation('Metodologi penelitian ini...')} disabled={isSuggestingCitation}>
                    <FileText size={18} /> 
                    {isSuggestingCitation ? 'Mengidentifikasi Sitasi...' : 'Rekomendasi Sitasi Akademik'}
                  </button>
                )}
              </div>
            </div>

            {/* Formatting Auto-Fix Card */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileText size={20} color="var(--primary-accent)" />
                  <strong style={{ fontSize: '1.1rem' }}>Perbaikan Format Dokumen</strong>
                </div>
              </div>
              <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Tingkatkan profesionalisme laporan Anda dengan otomatisasi standarisasi kampus.</p>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={handleFixBibliography} disabled={isFixingBib}>
                  <CheckCircle size={18} color="var(--success)" />
                  {isFixingBib ? 'Merapikan...' : 'Rapikan Daftar Pustaka (APA)'}
                </button>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={handleSyncTOC} disabled={isSyncingToc}>
                  <AlertTriangle size={18} color="#f59e0b" />
                  {isSyncingToc ? 'Sinkronisasi...' : 'Sync Daftar Isi & Halaman'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monetization Modal */}
      {showModal && !ticketData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ maxWidth: '550px', width: '90%', padding: '3rem', animation: 'fade-in 0.3s ease' }}>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Pilih Jalur Pengunduhan</h2>
            <p className="text-muted" style={{ marginBottom: '2.5rem' }}>Silakan pilih metode akses server untuk mengunduh dokumen Anda.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <button 
                className="btn-primary" 
                style={{ padding: '2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, var(--primary-accent), var(--secondary-accent))' }}
                onClick={() => handleDownloadIntent('FAST')}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Jalur Prioritas (Akses Instan)</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: 'normal' }}>Kunjungi penawaran mitra kami sekali, dan dokumen langsung siap.</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '50%' }}>
                  <Zap size={28} />
                </div>
              </button>
              
              <button 
                className="btn-secondary" 
                style={{ padding: '2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => handleDownloadIntent('NORMAL')}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Jalur Reguler (Gratis)</div>
                  <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'normal' }}>Menggunakan sistem antrean standar selama 60 detik.</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '50%', color: 'var(--text-muted)' }}>
                  <Timer size={28} />
                </div>
              </button>
            </div>
            
            <button style={{ marginTop: '2rem', width: '100%', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '1rem' }} onClick={() => setShowModal(false)}>
              Batal & Kembali
            </button>
          </div>
        </div>
      )}

      {/* Timer / Download Button Modal */}
      {showModal && ticketData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ maxWidth: '550px', width: '90%', textAlign: 'center', padding: '3rem', animation: 'fade-in 0.3s ease' }}>
            <h2 className="text-gradient" style={{ fontSize: '2rem' }}>Dokumen Siap</h2>
            
            {countdown > 0 ? (
              <div style={{ margin: '3rem 0' }}>
                <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 2rem auto' }}>
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="var(--primary-accent)" strokeWidth="8" 
                      strokeDasharray="339.292" strokeDashoffset={339.292 - (339.292 * countdown) / ticketData.wait_seconds} 
                      style={{ transition: 'stroke-dashoffset 1s linear' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                    {countdown}
                  </div>
                </div>
                
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.9rem' }}><strong>PERHATIAN:</strong> Mohon jangan memuat ulang (refresh) halaman ini agar sesi antrean Anda tetap valid.</p>
                </div>
                
                {/* Iklan Tiruan */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', padding: '2rem', marginTop: '2rem', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                  Ruang Penempatan Mitra Publikasi
                </div>
              </div>
            ) : (
              <div style={{ margin: '4rem 0' }}>
                <CheckCircle size={80} color="var(--success)" style={{ margin: '0 auto 1.5rem auto' }} />
                <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)' }}>Otentikasi berhasil. File siap diunduh secara aman.</p>
              </div>
            )}
            
            <button 
              className="btn-primary" 
              onClick={redeemTicket} 
              disabled={countdown > 0}
              style={{ width: '100%', padding: '1.25rem', opacity: countdown > 0 ? 0.5 : 1, fontSize: '1.1rem' }}
            >
              <Download size={20} /> Unduh File Skripsi
            </button>
          </div>
        </div>
      )}

      {/* Manual QRIS Checkout Modal */}
      {checkoutData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ maxWidth: '450px', width: '90%', padding: '2.5rem', animation: 'fade-in 0.3s ease', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#f59e0b' }}>Otorisasi Layanan Premium</h2>
            <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Gunakan sistem pembayaran elektronik (QRIS) terdaftar Anda untuk memproses transaksi berlangganan.
            </p>
            
            <div style={{ background: '#fff', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '1.5rem' }}>
              <img src="/qris-statis.jpg" alt="QRIS" style={{ width: '200px', height: '200px', objectFit: 'cover', background: '#e2e8f0', display: 'block' }} 
                   onError={(e) => { e.target.src = 'https://via.placeholder.com/200x200.png?text=QRIS+Statis+Sistem' }} />
            </div>
            
            <div style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Nilai Transaksi:</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)', letterSpacing: '1px' }}>
                Rp {checkoutData.amount.toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                *3 digit acak di belakang digunakan untuk validasi sistem.
              </div>
            </div>
            
            <a 
              href={checkoutData.whatsapp_url} 
              target="_blank" 
              rel="noreferrer"
              className="btn-primary" 
              style={{ display: 'block', width: '100%', padding: '1.25rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', textDecoration: 'none', marginBottom: '1rem' }}
              onClick={() => setCheckoutData(null)}
            >
              Kirim Konfirmasi Validasi
            </a>
            
            <button style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }} onClick={() => { setCheckoutData(null); setIsUpgrading(false); }}>
              Batal & Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  );

}
