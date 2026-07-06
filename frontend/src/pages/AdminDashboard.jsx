import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Users, Link as LinkIcon, DollarSign, Activity, Trash2, Plus, ShoppingBag, Search, Compass, Package, Send, Shield } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('orders');
  
  // States
  const [links, setLinks] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [newsTitle, setNewsTitle] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsSource, setNewsSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [scraping, setScraping] = useState(false);
  const [arbitrageResult, setArbitrageResult] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [trends, setTrends] = useState([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  
  const [markupPercentage, setMarkupPercentage] = useState(30);
  
  const [pendingVIPs, setPendingVIPs] = useState([]);
  const [vipLoading, setVipLoading] = useState(false);
  
  const [auditLogs, setAuditLogs] = useState([]);
  
  const [adminStats, setAdminStats] = useState({
    pending_orders: 0,
    affiliate_clicks: 0,
    total_products: 0,
    estimated_revenue: 0
  });

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('gradia_token');
      const response = await axios.get(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAdminStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchLinks = async () => {
    try {
      const token = localStorage.getItem('gradia_token');
      const response = await axios.get(`${API_URL}/admin/affiliate/links`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setLinks(response.data);
    } catch (err) {
      console.error('Failed to fetch links', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('gradia_token');
      const response = await axios.get(`${API_URL}/admin/dropship/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('gradia_token');
      const response = await axios.get(`${API_URL}/admin/audit-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAuditLogs(response.data);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    }
  };

  const fetchTrends = async () => {
    try {
      setTrendsLoading(true);
      const token = localStorage.getItem('gradia_token');
      const response = await axios.get(`${API_URL}/admin/trends`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setTrends(response.data.data);
    } catch (err) {
      console.error('Failed to fetch trends', err);
    } finally {
      setTrendsLoading(false);
    }
  };

  const fetchPendingVIPs = async () => {
    try {
      const token = localStorage.getItem('gradia_token');
      const response = await axios.get(`${API_URL}/admin/subscriptions/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPendingVIPs(response.data);
    } catch (err) {
      console.error('Failed to fetch pending VIPs', err);
    }
  };

  const handleApproveVIP = async (invoiceId) => {
    if (!window.confirm('Pastikan Anda sudah mengecek saldo masuk di e-Wallet. Lanjutkan?')) return;
    setVipLoading(invoiceId);
    try {
      const token = localStorage.getItem('gradia_token');
      const res = await axios.post(`${API_URL}/admin/subscriptions/approve/${invoiceId}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert(res.data.message);
      fetchPendingVIPs();
    } catch (err) {
      alert(err.response?.data?.detail || 'Gagal menyetujui VIP');
    } finally {
      setVipLoading(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchStats();
    if (activeTab === 'monetization') fetchLinks();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'trends') fetchTrends();
    if (activeTab === 'vip') fetchPendingVIPs();
  }, [activeTab]);

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!newUrl) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('gradia_token');
      await axios.post(`${API_URL}/admin/affiliate/links`, {
        platform_id: '00000000-0000-0000-0000-000000000001',
        url: newUrl,
        news_title: newsTitle,
        news_summary: newsSummary,
        news_source_url: newsSource,
        category: newsTitle ? "NEWS_SAFELINK" : "PRODUCT_AFFILIATE"
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNewUrl('');
      setNewsTitle('');
      setNewsSummary('');
      setNewsSource('');
      fetchLinks();
    } catch (err) {
      alert('Gagal menambahkan link.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus tautan ini?')) return;
    try {
      const token = localStorage.getItem('gradia_token');
      await axios.delete(`${API_URL}/admin/affiliate/links/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchLinks();
    } catch (err) {
      alert('Gagal menghapus link.');
    }
  };

  const handleArbitrageSearch = async (e) => {
    e.preventDefault();
    if (!searchKeyword) return;
    setScraping(true);
    setArbitrageResult(null);
    try {
      const token = localStorage.getItem('gradia_token');
      const response = await axios.post(`${API_URL}/admin/dropship/arbitrage`, {
        keyword: searchKeyword
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setArbitrageResult(response.data.data);
      setMarkupPercentage(30); // Reset slider ke default 30%
    } catch (err) {
      alert('Pencarian Arbitrage gagal. ' + (err.response?.data?.detail || ''));
    } finally {
      setScraping(false);
    }
  };

  const handleAutoCheckout = async (orderId, customerAddress) => {
    setCheckoutLoading(orderId);
    try {
      const token = localStorage.getItem('gradia_token');
      const response = await axios.post(`${API_URL}/admin/dropship/orders/auto-checkout`, {
        order_id: orderId,
        customer_address: customerAddress
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert(response.data.data.message);
      fetchOrders();
    } catch (err) {
      alert('Auto-Checkout gagal: ' + (err.response?.data?.detail || ''));
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleBulkCheckout = async () => {
    if (selectedOrders.length === 0) return;
    setCheckoutLoading(true);
    try {
      const token = localStorage.getItem('gradia_token');
      const res = await axios.post(`${API_URL}/admin/dropship/orders/bulk-checkout`, 
        { order_ids: selectedOrders },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      alert(res.data.message);
      setSelectedOrders([]);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.detail || 'Gagal memproses pesanan masal');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSelectOrder = (id) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter(o => o !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  const stats = [
    { label: 'Pesanan Baru', value: adminStats.pending_orders, icon: <Package size={20} color="#8b5cf6" /> },
    { label: 'Klik AdSense', value: adminStats.affiliate_clicks, icon: <LinkIcon size={20} color="#10b981" /> },
    { label: 'Produk Arbitrase', value: adminStats.total_products, icon: <ShoppingBag size={20} color="#ec4899" /> },
    { label: 'Estimasi Pendapatan', value: `Rp ${adminStats.estimated_revenue.toLocaleString('id-ID')}`, icon: <DollarSign size={20} color="#f59e0b" /> }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)', color: 'white' }}>
      
      {/* Sidebar - Premium Dark Glass */}
      <div className="glass-panel" style={{ width: '280px', borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none', padding: '2rem 1.5rem', background: 'rgba(9, 9, 11, 0.95)', borderRight: '1px solid rgba(255,255,255,0.05)', boxShadow: '4px 0 24px rgba(0,0,0,0.4)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3.5rem', animation: 'fade-in 0.3s ease' }}>
          <div style={{ background: 'rgba(109, 40, 217, 0.1)', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 15px var(--primary-glow)' }}>
            <Settings size={28} color="var(--primary-accent)" />
          </div>
          <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>Admin Panel</h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button className={`btn-secondary ${activeTab === 'dashboard' ? 'btn-primary' : ''}`} style={{ textAlign: 'left', border: 'none', padding: '1rem', justifyContent: 'flex-start', background: activeTab === 'dashboard' ? '' : 'transparent' }} onClick={() => setActiveTab('dashboard')}>
            <Activity size={18} /> Ringkasan Bisnis
          </button>
          <button className={`btn-secondary ${activeTab === 'orders' ? 'btn-primary' : ''}`} style={{ textAlign: 'left', border: 'none', padding: '1rem', justifyContent: 'flex-start', background: activeTab === 'orders' ? '' : 'transparent' }} onClick={() => setActiveTab('orders')}>
            <Package size={18} /> Pesanan Masuk
          </button>
          <button className={`btn-secondary ${activeTab === 'dropship' ? 'btn-primary' : ''}`} style={{ textAlign: 'left', border: 'none', padding: '1rem', justifyContent: 'flex-start', background: activeTab === 'dropship' ? '' : 'transparent' }} onClick={() => setActiveTab('dropship')}>
            <Compass size={18} style={{ color: activeTab === 'dropship' ? '#fff' : '#fbbf24' }}/> Arbitrage Engine
          </button>
          <button className={`btn-secondary ${activeTab === 'monetization' ? 'btn-primary' : ''}`} style={{ textAlign: 'left', border: 'none', padding: '1rem', justifyContent: 'flex-start', background: activeTab === 'monetization' ? '' : 'transparent' }} onClick={() => setActiveTab('monetization')}>
            <LinkIcon size={18} /> Safelink Ads
          </button>
          <button className={`btn-secondary ${activeTab === 'trends' ? 'btn-primary' : ''}`} style={{ textAlign: 'left', border: 'none', padding: '1rem', justifyContent: 'flex-start', background: activeTab === 'trends' ? '' : 'transparent' }} onClick={() => setActiveTab('trends')}>
            <Activity size={18} style={{ color: activeTab === 'trends' ? '#fff' : '#f43f5e' }}/> Trend Monitor
          </button>
          <button className={`btn-secondary ${activeTab === 'vip' ? 'btn-primary' : ''}`} style={{ textAlign: 'left', border: 'none', padding: '1rem', justifyContent: 'flex-start', background: activeTab === 'vip' ? '' : 'transparent' }} onClick={() => setActiveTab('vip')}>
            <DollarSign size={18} style={{ color: activeTab === 'vip' ? '#fff' : '#10b981' }}/> Validasi VIP Manual
          </button>
          <button className={`btn-secondary ${activeTab === 'audit' ? 'btn-primary' : ''}`} style={{ textAlign: 'left', border: 'none', padding: '1rem', justifyContent: 'flex-start', background: activeTab === 'audit' ? '' : 'transparent' }} onClick={() => setActiveTab('audit')}>
            <Shield size={18} style={{ color: activeTab === 'audit' ? '#fff' : '#10b981' }}/> Audit Trail
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '3.5rem', overflowY: 'auto', background: 'radial-gradient(circle at top right, rgba(109, 40, 217, 0.08) 0%, transparent 50%)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fade-in 0.4s ease' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
            <div>
              <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', letterSpacing: '-0.03em' }}>Omnichannel Command Center</h1>
              <p className="text-muted" style={{ margin: 0, fontSize: '1.1rem' }}>Sistem kontrol pusat untuk manajemen dan otomatisasi monetisasi tingkat Enterprise.</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.5rem 1rem', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
                  <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold' }}>SYSTEM ONLINE</span>
               </div>
            </div>
          </div>
          
          {activeTab === 'dashboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem', animation: 'fade-in 0.5s ease' }}>
              {stats.map((stat, i) => (
                <div key={i} className="glass-panel glass-panel-hover" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', borderTop: '2px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '50%', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>{stat.icon}</div>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>{stat.label}</p>
                    <h3 style={{ margin: 0, fontSize: '1.75rem', letterSpacing: '-0.02em' }}>{stat.value}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="glass-panel" style={{ padding: '2.5rem', animation: 'fade-in 0.5s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.75rem' }}>Manajemen Pesanan & Auto-Fulfillment</h2>
                <button 
                  className="btn-primary flex-center gap-4" 
                  disabled={selectedOrders.length === 0 || checkoutLoading}
                  onClick={handleBulkCheckout}
                  style={{ padding: '0.875rem 1.5rem' }}
                >
                  <Package size={18} /> 
                  {checkoutLoading ? 'Memproses...' : `Bulk Checkout (${selectedOrders.length})`}
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '1.05rem' }}>Pilih pesanan di bawah ini untuk meneruskan data secara masal ke supplier dalam satu klik.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <Package size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0 }}>Antrean pesanan kosong saat ini.</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="glass-panel-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--glass-border)', padding: '1.5rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', transition: 'all 0.2s ease' }}>
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                           <input 
                             type="checkbox" 
                             checked={selectedOrders.includes(order.id)}
                             onChange={() => handleSelectOrder(order.id)}
                             disabled={order.status !== 'PENDING'}
                             style={{ width: '1.25rem', height: '1.25rem', cursor: order.status === 'PENDING' ? 'pointer' : 'not-allowed' }}
                           />
                        </div>
                        <div>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{order.product_name}</h3>
                            <span style={{ 
                              fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '99px', fontWeight: 'bold', letterSpacing: '0.05em',
                              background: order.status === 'PENDING' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: order.status === 'PENDING' ? '#f59e0b' : '#10b981',
                              border: `1px solid ${order.status === 'PENDING' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                            }}>
                              {order.status === 'PENDING' ? 'BELUM DIPROSES' : 'DIKIRIM SUPPLIER'}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-accent)', fontWeight: 'bold' }}>{order.quantity}x • Rp {order.total_price.toLocaleString('id-ID')}</p>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}><strong style={{ color: 'rgba(255,255,255,0.7)' }}>Alamat Pembeli:</strong> {order.customer_mock_address}</p>
                        </div>
                      </div>
                      <div>
                        {order.status === 'PENDING' ? (
                          <button 
                            className="btn-primary flex-center gap-4" 
                            onClick={() => handleAutoCheckout(order.id, order.customer_mock_address)}
                            disabled={checkoutLoading === order.id}
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
                          >
                            {checkoutLoading === order.id ? 'Memproses ke Supplier...' : <><Send size={18} /> Auto-Checkout</>}
                          </button>
                        ) : (
                          <button className="btn-secondary" disabled style={{ opacity: 0.5 }}>Selesai</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'dropship' && (
            <div className="glass-panel" style={{ padding: '3rem', animation: 'fade-in 0.5s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="text-gradient-gold" style={{ margin: 0, fontSize: '2rem' }}>Cross-Marketplace Price Arbitrage</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontSize: '1.1rem', maxWidth: '800px', lineHeight: '1.6' }}>
                Lakukan pencarian produk lintas platform, manfaatkan sistem komputasi margin, dan distribusikan kembali secara efisien tanpa kendala penyusunan deskripsi manual.
              </p>
              
              <form onSubmit={handleArbitrageSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                   <div style={{ position: 'absolute', top: '50%', left: '1.25rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                     <Search size={20} />
                   </div>
                   <input 
                     type="text" 
                     className="input-glass" 
                     placeholder="Cari produk (Contoh: Peralatan Elektronik, Pakaian...)" 
                     value={searchKeyword}
                     onChange={(e) => setSearchKeyword(e.target.value)}
                     required
                     style={{ width: '100%', paddingLeft: '3rem', fontSize: '1.1rem', height: '100%' }}
                   />
                </div>
                <button type="submit" className="btn-primary flex-center gap-4" disabled={scraping} style={{ padding: '0 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  {scraping ? 'Mencari Harga Termurah...' : 'Mulai Arbitrase'}
                </button>
              </form>

              {arbitrageResult && (
                <div style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '2.5rem', borderRadius: '16px', background: 'rgba(0,0,0,0.4)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: 'fade-in 0.4s ease' }}>
                  <div style={{ display: 'flex', gap: '2.5rem', marginBottom: '2rem' }}>
                    {arbitrageResult.image_url && (
                      <div style={{ width: '220px', height: '220px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={arbitrageResult.image_url} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fbbf24', color: '#000', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '1rem', boxShadow: '0 4px 10px rgba(251, 191, 36, 0.3)' }}>
                        <Shield size={14} /> Penawaran Terbaik: {arbitrageResult.source_platform}
                      </div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', lineHeight: '1.3' }}>{arbitrageResult.name}</h3>
                      
                      <div style={{ display: 'flex', gap: '3rem', margin: '2rem 0', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <div>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Harga Dasar (Pemasok)</p>
                          <strong style={{ fontSize: '1.5rem', color: '#ef4444', textDecoration: 'line-through' }}>
                            Rp {arbitrageResult.base_price.toLocaleString('id-ID')}
                          </strong>
                        </div>
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                        <div>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Estimasi Harga Jual (+{markupPercentage}%)</p>
                          <strong style={{ fontSize: '1.75rem', color: '#10b981', textShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}>
                            Rp {Math.floor(arbitrageResult.base_price * (1 + (markupPercentage/100))).toLocaleString('id-ID')}
                          </strong>
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#f59e0b', fontWeight: 'bold' }}>
                            Estimasi Margin: Rp {Math.floor(arbitrageResult.base_price * (markupPercentage/100)).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <strong style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem' }}>Manajemen Margin Interaktif</strong>
                          <strong style={{ color: '#10b981' }}>{markupPercentage}%</strong>
                        </div>
                        <input 
                          type="range" 
                          min="5" 
                          max="150" 
                          value={markupPercentage} 
                          onChange={(e) => setMarkupPercentage(e.target.value)}
                          style={{ width: '100%', cursor: 'pointer', accentColor: '#10b981' }}
                        />
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Sesuaikan persentase margin keuntungan untuk melihat proyeksi harga secara langsung.
                        </p>
                      </div>

                      <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--primary-accent)' }}>
                        <strong style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Deskripsi Asli Pemasok:</strong>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.6' }}>"{arbitrageResult.description}"</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)' }}>Marketplace pesaing yang berhasil dikalahkan:</p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {arbitrageResult.competitors.map((comp, idx) => (
                        <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.875rem 1.25rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{comp.platform}:</span> <span style={{ color: '#ef4444' }}>Rp {comp.price.toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" style={{ padding: '0.875rem 1.5rem' }}>Lihat Asli di {arbitrageResult.source_platform}</button>
                    <button className="btn-primary" style={{ padding: '0.875rem 1.5rem' }}>
                      <Package size={18} /> Masukkan ke Database Toko
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="glass-panel" style={{ padding: '3rem', animation: 'fade-in 0.5s ease' }}>
              <div style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>Google Trends Indonesia</h2>
                <p className="text-muted" style={{ margin: 0, fontSize: '1.1rem' }}>Pantau tren informasi harian untuk mendukung strategi pemasaran digital Anda.</p>
              </div>
              
              {trendsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Memuat data tren...</div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {trends.map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-accent)' }}>{item.keyword}</h3>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>{item.news_title}</p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Traffic: {item.traffic}</p>
                      </div>
                      {item.news_url && (
                         <a href={item.news_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ textDecoration: 'none' }}>
                           Baca Berita Asli
                         </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'monetization' && (
            <div className="glass-panel" style={{ padding: '3rem', animation: 'fade-in 0.5s ease' }}>
              <div style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>Manajemen Tautan Afiliasi (Safelink)</h2>
                <p className="text-muted" style={{ margin: 0, fontSize: '1.1rem' }}>Hasilkan Halaman Arahan (Landing Page) berbasis tren terkini untuk mengoptimalkan konversi trafik secara efisien.</p>
              </div>
              
              <form onSubmit={handleAddLink} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem', background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>URL Produk Afiliasi</label>
                    <input type="url" className="input-glass" placeholder="Misal: https://shope.ee/..." value={newUrl} onChange={(e) => setNewUrl(e.target.value)} required style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>URL Sumber Referensi (Opsional)</label>
                    <input type="url" className="input-glass" placeholder="Misal: https://news.detik.com/..." value={newsSource} onChange={(e) => setNewsSource(e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Judul Halaman Arahan</label>
                  <input type="text" className="input-glass" placeholder="Masukkan judul artikel yang akan didistribusikan..." value={newsTitle} onChange={(e) => setNewsTitle(e.target.value)} style={{ width: '100%' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Ringkasan Konten (Isi Halaman Arahan)</label>
                  <textarea className="input-glass" placeholder="Masukkan 1-2 paragraf konten pengantar di sini..." value={newsSummary} onChange={(e) => setNewsSummary(e.target.value)} rows="3" style={{ width: '100%', resize: 'vertical' }}></textarea>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn-primary flex-center gap-4" disabled={loading} style={{ padding: '0.875rem 2rem' }}>
                    <Plus size={18} /> Simpan Tautan
                  </button>
                </div>
              </form>

              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detail Link</th>
                      <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.length === 0 ? (
                      <tr>
                         <td colSpan="2" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada link yang didaftarkan.</td>
                      </tr>
                    ) : (
                      links.map(link => (
                        <tr key={link.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            {link.news_title && <div style={{ color: '#0ea5e9', fontWeight: 'bold', marginBottom: '0.25rem' }}>{link.news_title}</div>}
                            <div style={{ color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.85rem' }}>🎯 Tautan Afiliasi: {link.url}</div>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                               {link.news_title && (
                                 <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(`Temukan informasi selengkapnya mengenai materi ini: ${link.news_title}\n\nBaca di: http://localhost:5173/baca/${link.id}`)} style={{ padding: '0.6rem', fontSize: '0.8rem' }} title="Salin Teks Publikasi">
                                   Salin Teks Publikasi
                                 </button>
                               )}
                               <button className="btn-secondary" onClick={() => handleDelete(link.id)} style={{ padding: '0.6rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }} title="Hapus Tautan">
                                 <Trash2 size={16} />
                               </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'vip' && (
            <div className="glass-panel" style={{ padding: '3rem', animation: 'fade-in 0.5s ease' }}>
              <div style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>Otorisasi Berlangganan (Manual)</h2>
                <p className="text-muted" style={{ margin: 0, fontSize: '1.1rem' }}>Verifikasi transaksi masuk pada sistem pembayaran Anda dan setujui status pengguna.</p>
              </div>

              <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '1.25rem', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Waktu Order</th>
                      <th style={{ padding: '1.25rem', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Email Mahasiswa</th>
                      <th style={{ padding: '1.25rem', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>No. Ref (Kode Unik)</th>
                      <th style={{ padding: '1.25rem', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingVIPs.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '1.25rem', color: 'var(--text-main)' }}>{new Date(inv.created_at).toLocaleString('id-ID')}</td>
                        <td style={{ padding: '1.25rem', color: 'var(--primary-accent)' }}>{inv.user_email}</td>
                        <td style={{ padding: '1.25rem' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>Rp {inv.amount.toLocaleString('id-ID')}</span>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inv.reference}</div>
                        </td>
                        <td style={{ padding: '1.25rem' }}>
                          <button 
                            className="btn-primary" 
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '0.75rem 1.5rem' }}
                            onClick={() => handleApproveVIP(inv.id)}
                            disabled={vipLoading === inv.id}
                          >
                            {vipLoading === inv.id ? 'Memproses...' : 'Approve (Jadikan VIP)'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pendingVIPs.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <DollarSign size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 1rem auto' }} />
                          Belum ada tagihan VIP yang tertunda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="glass-panel" style={{ padding: '3rem', animation: 'fade-in 0.5s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Shield size={32} color="#10b981" />
                <h2 style={{ margin: 0, fontSize: '2rem' }}>Audit Trail & Keamanan Logs</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontSize: '1.05rem', maxWidth: '800px', lineHeight: '1.6' }}>
                Sistem pencatatan aktivitas terpusat untuk setiap eksekusi operasional. Melacak Alamat IP dan otorisasi pengguna untuk mendukung kepatuhan standar Enterprise.
              </p>
              
              <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '1.25rem', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Waktu Eksekusi</th>
                      <th style={{ padding: '1.25rem', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Operator (Email)</th>
                      <th style={{ padding: '1.25rem', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>IP Address</th>
                      <th style={{ padding: '1.25rem', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Aksi / Endpoint</th>
                      <th style={{ padding: '1.25rem', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Detail Payload JSON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '1.25rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                        <td style={{ padding: '1.25rem', color: 'var(--primary-accent)', fontWeight: '500' }}>{log.admin_email}</td>
                        <td style={{ padding: '1.25rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{log.ip_address}</span>
                        </td>
                        <td style={{ padding: '1.25rem' }}>
                          <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: '0.25rem' }}>{log.action}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>{log.endpoint}</span>
                        </td>
                        <td style={{ padding: '1.25rem' }}>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '8px', maxWidth: '280px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)', color: '#cbd5e1' }}>
                            {log.details ? <pre style={{ margin: 0 }}>{JSON.stringify(JSON.parse(log.details), null, 2)}</pre> : '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <Shield size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 1rem auto' }} />
                          Belum ada log aktivitas keamanan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
