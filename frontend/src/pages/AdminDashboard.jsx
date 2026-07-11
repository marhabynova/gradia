import { useState, useEffect } from "react";
import axios from "axios";
import {
  Settings,
  Users,
  Link as LinkIcon,
  DollarSign,
  Activity,
  Trash2,
  Plus,
  ShoppingBag,
  Search,
  Compass,
  Package,
  Shield,
  RefreshCcw,
  Globe,
  Server,
  CheckCircle,
  Database,
} from "lucide-react";
import { logError } from "../utils/logger";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("orders");

  // States
  const [links, setLinks] = useState([]);
  const [newUrl, setNewUrl] = useState("");
  const [newsTitle, setNewsTitle] = useState("");
  const [newsSummary, setNewsSummary] = useState("");
  const [newsSource, setNewsSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [scraping, setScraping] = useState(false);
  const [arbitrageResult, setArbitrageResult] = useState(null);
  const [studentConfig, setStudentConfig] = useState({
    student_ads_enabled: false,
    student_safelink_url: "",
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [draggingOrderId, setDraggingOrderId] = useState(null);
  const [orderFilter, setOrderFilter] = useState("ALL");
  const [trends, setTrends] = useState([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendKeyword, setTrendKeyword] = useState("");
  const [scrapedDrafts, setScrapedDrafts] = useState([]);
  const [markupPercentage, setMarkupPercentage] = useState(30);

  const [pendingVIPs, setPendingVIPs] = useState([]);
  const [vipLoading, setVipLoading] = useState(false);

  // States untuk Gradia Omnichannel Master
  const [scraperConnected, setScraperConnected] = useState(false);
  const [massPublishing, setMassPublishing] = useState(false);
  const [syncingInventory, setSyncingInventory] = useState(false);
  const [masterProducts, setMasterProducts] = useState([]);
  const [savingMaster, setSavingMaster] = useState(false);
  const [draftSavingId, setDraftSavingId] = useState(null);
  const [orderForm, setOrderForm] = useState({
    product_id: "",
    customer_name: "",
    customer_phone: "",
    shipping_address: "",
    quantity: 1,
    buyer_note: "",
  });

  const [auditLogs, setAuditLogs] = useState([]);

  const [adminStats, setAdminStats] = useState({
    pending_orders: 0,
    affiliate_clicks: 0,
    total_products: 0,
    estimated_revenue: 0,
  });

  // Lightweight in-app toast + confirm system, replacing native alert()/confirm()/prompt()
  // which block the whole page and feel jarring on a dashboard used many times a day.
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  };
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const [confirmDialog, setConfirmDialog] = useState(null); // { message, confirmLabel, onConfirm }
  const askConfirm = (message, onConfirm, confirmLabel = "Ya, Lanjutkan") => {
    setConfirmDialog({ message, confirmLabel, onConfirm });
  };

  // Audit log `details` isn't guaranteed to be valid JSON (legacy rows, truncation, etc.) -
  // a raw JSON.parse crashing here would take down the whole Audit Trail tab render.
  const formatAuditDetails = (details) => {
    try {
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch {
      return String(details);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("gradia_token");
      const response = await axios.get(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdminStats(response.data);
    } catch (err) {
      logError("FETCH_STATS_FAILED", err);
    }
  };

  const fetchLinks = async () => {
    try {
      const token = localStorage.getItem("gradia_token");
      const response = await axios.get(`${API_URL}/admin/affiliate/links`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLinks(response.data);
    } catch (err) {
      logError("FETCH_LINKS_FAILED", err);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("gradia_token");
      const response = await axios.get(`${API_URL}/admin/dropship/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(response.data);
    } catch (err) {
      logError("FETCH_ORDERS_FAILED", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem("gradia_token");
      const response = await axios.get(`${API_URL}/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAuditLogs(response.data);
    } catch (err) {
      logError("FETCH_AUDIT_LOGS_FAILED", err);
    }
  };

  const fetchTrends = async (searchStr = trendKeyword) => {
    try {
      setTrendsLoading(true);
      const token = localStorage.getItem("gradia_token");
      const q = searchStr ? `?query=${encodeURIComponent(searchStr)}` : "";
      const response = await axios.get(`${API_URL}/admin/trends${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrends(response.data.data);
    } catch (err) {
      logError("FETCH_TRENDS_FAILED", err);
    } finally {
      setTrendsLoading(false);
    }
  };

  const fetchScrapedDrafts = async () => {
    try {
      const token = localStorage.getItem("gradia_token");
      const response = await axios.get(
        `${API_URL}/admin/dropship/extension-scrape`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setScrapedDrafts(response.data.data);
    } catch (err) {
      logError("FETCH_SCRAPED_FAILED", err);
    }
  };

  const fetchPendingVIPs = async () => {
    try {
      const token = localStorage.getItem("gradia_token");
      const response = await axios.get(
        `${API_URL}/admin/subscriptions/pending`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setPendingVIPs(response.data);
    } catch (err) {
      logError("FETCH_PENDING_VIPS_FAILED", err);
    }
  };

  const handleApproveVIP = (invoiceId) => {
    askConfirm(
      "Pastikan Anda sudah mengecek saldo masuk di e-Wallet. Lanjutkan?",
      async () => {
        setVipLoading(invoiceId);
        try {
          const token = localStorage.getItem("gradia_token");
          const res = await axios.post(
            `${API_URL}/admin/subscriptions/approve/${invoiceId}`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          showToast(res.data.message);
          fetchPendingVIPs();
        } catch (err) {
          showToast(err.response?.data?.detail || "Gagal menyetujui VIP", "error");
        } finally {
          setVipLoading(null);
        }
      },
      "Ya, Sudah Saya Cek",
    );
  };

  const fetchMasterProducts = async () => {
    try {
      const token = localStorage.getItem("gradia_token");
      const response = await axios.get(
        `${API_URL}/admin/omnichannel/products`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setMasterProducts(response.data.data);
    } catch (err) {
      logError("FETCH_MASTER_PRODUCTS_FAILED", err);
    }
  };

  useEffect(() => {
    if (activeTab === "dashboard") fetchStats();
    if (activeTab === "monetization") fetchLinks();
    if (activeTab === "orders") fetchOrders();
    if (activeTab === "audit") fetchAuditLogs();
    if (activeTab === "dropship") {
      fetchMasterProducts();
      fetchScrapedDrafts();
    }
    if (activeTab === "trends") fetchTrends();
    if (activeTab === "student_control") fetchStudentConfig();
    if (activeTab === "vip") fetchPendingVIPs();
  }, [activeTab]);

  const fetchStudentConfig = async () => {
    try {
      const token = localStorage.getItem("gradia_token");
      const res = await axios.get(`${API_URL}/admin/student-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudentConfig(res.data.data);
    } catch (err) {
      logError("FETCH_STUDENT_CONFIG_ERROR", err);
    }
  };

  const handleSaveStudentConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const token = localStorage.getItem("gradia_token");
      await axios.post(`${API_URL}/admin/student-config`, studentConfig, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Konfigurasi Mahasiswa berhasil disimpan!");
    } catch (err) {
      showToast("Gagal menyimpan konfigurasi", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!newUrl) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("gradia_token");
      await axios.post(
        `${API_URL}/admin/affiliate/links`,
        {
          url: newUrl,
          news_title: newsTitle,
          news_summary: newsSummary,
          news_source_url: newsSource,
          category: newsTitle ? "NEWS_SAFELINK" : "PRODUCT_AFFILIATE",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNewUrl("");
      setNewsTitle("");
      setNewsSummary("");
      setNewsSource("");
      fetchLinks();
      showToast("Safelink berhasil ditambahkan!");
    } catch (err) {
      logError("ADD_LINK_FAILED", err);
      showToast("Gagal menambahkan link. Pastikan URL valid.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Modal state for "generate safelink from news" - replaces window.prompt
  const [newsSafelinkModal, setNewsSafelinkModal] = useState(null); // { item, affiliateUrl, submitting }

  const openNewsSafelinkModal = (item) => {
    setNewsSafelinkModal({ item, affiliateUrl: "", submitting: false });
  };

  const submitNewsSafelinkModal = async () => {
    if (!newsSafelinkModal?.affiliateUrl) return;
    setNewsSafelinkModal((m) => ({ ...m, submitting: true }));
    try {
      const token = localStorage.getItem("gradia_token");
      const res = await axios.post(
        `${API_URL}/admin/affiliate/links/generate-from-news`,
        {
          news_title: newsSafelinkModal.item.news_title,
          news_source_url: newsSafelinkModal.item.news_url,
          affiliate_url: newsSafelinkModal.affiliateUrl,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const shareUrl = `${window.location.origin}${res.data.bridge_path}`;
      setNewsSafelinkModal(null);
      showToast(`Konten afiliasi dibuat! Link: ${shareUrl}`);
      if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).catch(() => {});
    } catch (err) {
      showToast("Gagal membuat konten afiliasi dari berita ini.", "error");
      logError("GENERATE_NEWS_SAFELINK_FAILED", err);
      setNewsSafelinkModal((m) => ({ ...m, submitting: false }));
    }
  };

  const handleDeleteLink = (id) => {
    askConfirm("Yakin ingin menghapus tautan ini?", async () => {
      try {
        const token = localStorage.getItem("gradia_token");
        await axios.delete(`${API_URL}/admin/affiliate/links/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchLinks();
        showToast("Tautan berhasil dihapus.");
      } catch (err) {
        showToast("Gagal menghapus link.", "error");
      }
    }, "Ya, Hapus");
  };

  const handleArbitrageSearch = async (e) => {
    e.preventDefault();
    if (!searchKeyword) return;
    setScraping(true);
    setArbitrageResult(null);
    try {
      const token = localStorage.getItem("gradia_token");
      const response = await axios.post(
        `${API_URL}/admin/dropship/arbitrage`,
        {
          keyword: searchKeyword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setArbitrageResult(response.data.data);
    } catch (err) {
      logError("ARBITRAGE_SEARCH_ERROR", err);
    } finally {
      setScraping(false);
    }
  };

  const handleConnectScraper = () => {
    setScraperConnected(true);
  };

  const handleMassPublish = async () => {
    setMassPublishing(true);
    try {
      await axios.post(
        `${API_URL}/admin/omnichannel/publish`,
        {
          product: arbitrageResult,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("gradia_token")}`,
          },
        },
      );
      showToast("Produk berhasil dipublish ke master channel.");
    } catch (err) {
      logError("MASS_PUBLISH_ERROR", err);
      showToast("Publish gagal diproses.", "error");
    } finally {
      setMassPublishing(false);
    }
  };

  const handleSaveToMaster = async () => {
    if (!arbitrageResult) return;
    setSavingMaster(true);
    try {
      const token = localStorage.getItem("gradia_token");
      const res = await axios.post(
        `${API_URL}/admin/omnichannel/products/master`,
        {
          product: arbitrageResult,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showToast(res.data.message);
      fetchMasterProducts();
    } catch (err) {
      logError("SAVE_MASTER_ERROR", err);
      showToast("Gagal menyimpan ke Master Data.", "error");
    } finally {
      setSavingMaster(false);
    }
  };

  const handlePromoteDraftToMaster = async (draft) => {
    setDraftSavingId(draft.id ?? draft.original_url);
    try {
      const token = localStorage.getItem("gradia_token");
      const response = await axios.post(
        `${API_URL}/admin/omnichannel/products/master`,
        {
          product: {
            ...draft,
            base_price: draft.price,
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showToast(response.data.message);
      fetchMasterProducts();
    } catch (err) {
      logError("PROMOTE_DRAFT_ERROR", err);
      showToast("Gagal memindahkan draft ke master data.", "error");
    } finally {
      setDraftSavingId(null);
    }
  };

  const handleCreateDropshipOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.product_id || !orderForm.shipping_address) return;

    try {
      const token = localStorage.getItem("gradia_token");
      const response = await axios.post(
        `${API_URL}/admin/dropship/orders`,
        {
          ...orderForm,
          quantity: Number(orderForm.quantity) || 1,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showToast(response.data.message);
      setOrderForm({
        product_id: "",
        customer_name: "",
        customer_phone: "",
        shipping_address: "",
        quantity: 1,
        buyer_note: "",
      });
      fetchOrders();
      fetchMasterProducts();
    } catch (err) {
      showToast(err.response?.data?.detail || "Gagal membuat pesanan dropship", "error");
    }
  };

  const handleSyncInventory = async () => {
    setSyncingInventory(true);
    try {
      const token = localStorage.getItem("gradia_token");
      await axios.post(
        `${API_URL}/admin/omnichannel/sync-inventory`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showToast("Inventaris lintas channel berhasil disinkronkan.");
      fetchMasterProducts();
    } catch (err) {
      logError("SYNC_INVENTORY_ERROR", err);
      showToast("Sinkronisasi stok gagal diproses.", "error");
    } finally {
      setSyncingInventory(false);
    }
  };

  // Split from the old overloaded `checkoutLoading` (was both a boolean for
  // bulk-checkout and an order-id sentinel for per-row actions at the same time).
  const [bulkCheckoutLoading, setBulkCheckoutLoading] = useState(false);
  const [rowCheckoutLoadingId, setRowCheckoutLoadingId] = useState(null);

  const handleAutoCheckout = async (orderId, customerAddress) => {
    setRowCheckoutLoadingId(orderId);
    try {
      const token = localStorage.getItem("gradia_token");
      const response = await axios.post(
        `${API_URL}/admin/dropship/orders/auto-checkout`,
        {
          order_id: orderId,
          customer_address: customerAddress,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showToast(response.data.data.message);
      fetchOrders();
    } catch (err) {
      showToast(
        "Pengiriman ke supplier gagal: " + (err.response?.data?.detail || ""),
        "error",
      );
    } finally {
      setRowCheckoutLoadingId(null);
    }
  };

  const handleBulkCheckout = () => {
    if (selectedOrders.length === 0) return;
    askConfirm(
      `Checkout ${selectedOrders.length} pesanan sekaligus ke supplier? Aksi ini akan mengirim pesanan secara nyata dan tidak bisa dibatalkan dari sini.`,
      async () => {
        setBulkCheckoutLoading(true);
        try {
          const token = localStorage.getItem("gradia_token");
          const res = await axios.post(
            `${API_URL}/admin/dropship/orders/bulk-checkout`,
            { order_ids: selectedOrders },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          showToast(res.data.message);
          setSelectedOrders([]);
          fetchOrders();
        } catch (err) {
          showToast(err.response?.data?.detail || "Gagal memproses pesanan masal", "error");
        } finally {
          setBulkCheckoutLoading(false);
        }
      },
      "Ya, Checkout Sekarang",
    );
  };

  const handleUpdateOrderStatus = (orderId, status) => {
    const doUpdate = async () => {
      setRowCheckoutLoadingId(orderId);
      try {
        const token = localStorage.getItem("gradia_token");
        const response = await axios.put(
          `${API_URL}/admin/dropship/orders/${orderId}/status`,
          { status },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        showToast(response.data.message);
        fetchOrders();
      } catch (err) {
        showToast(err.response?.data?.detail || "Gagal memperbarui status pesanan", "error");
      } finally {
        setRowCheckoutLoadingId(null);
      }
    };

    if (status === "CANCELLED") {
      askConfirm(
        "Batalkan pesanan ini? Aksi ini tidak bisa diurungkan.",
        doUpdate,
        "Ya, Batalkan Pesanan",
      );
    } else {
      doUpdate();
    }
  };

  const handleDragStartOrder = (orderId) => {
    setDraggingOrderId(orderId);
  };

  const handleDragEndOrder = () => {
    setDraggingOrderId(null);
  };

  const handleDropOrderToStatus = async (status) => {
    if (!draggingOrderId) return;
    const targetOrder = orders.find((order) => order.id === draggingOrderId);
    if (!targetOrder) {
      setDraggingOrderId(null);
      return;
    }

    const currentStatus = (targetOrder.status || "NEW").toUpperCase();
    if (currentStatus === status) {
      setDraggingOrderId(null);
      return;
    }

    await handleUpdateOrderStatus(draggingOrderId, status);
    setDraggingOrderId(null);
  };

  const handleSelectOrder = (id) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter((o) => o !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  const stats = [
    {
      label: "Pesanan Baru",
      value: adminStats.pending_orders,
      icon: <Package size={20} color="#8b5cf6" />,
    },
    {
      label: "Klik AdSense",
      value: adminStats.affiliate_clicks,
      icon: <LinkIcon size={20} color="#10b981" />,
    },
    {
      label: "Produk Arbitrase",
      value: adminStats.total_products,
      icon: <ShoppingBag size={20} color="#ec4899" />,
    },
    {
      label: "Estimasi Pendapatan",
      value: `Rp ${(adminStats.estimated_revenue ?? 0).toLocaleString("id-ID")}`,
      icon: <DollarSign size={20} color="#f59e0b" />,
    },
  ];

  const orderStatusCounts = orders.reduce(
    (acc, order) => {
      const status = (order.status || "NEW").toUpperCase();
      acc[status] = (acc[status] || 0) + 1;
      acc.ALL += 1;
      return acc;
    },
    {
      ALL: 0,
      NEW: 0,
      PENDING: 0,
      AUTO_CHECKOUT: 0,
      PACKING: 0,
      SHIPPED: 0,
      CANCELLED: 0,
      RETURNED: 0,
    },
  );

  const orderFilterOptions = [
    { key: "ALL", label: "Semua" },
    { key: "NEW", label: "New" },
    { key: "PENDING", label: "Pending" },
    { key: "AUTO_CHECKOUT", label: "Checkout" },
    { key: "PACKING", label: "Packing" },
    { key: "SHIPPED", label: "Shipped" },
  ];

  const orderPipelineColumns = [
    { key: "NEW", label: "New Intake", accent: "#f59e0b" },
    { key: "PENDING", label: "Ready to Checkout", accent: "#f97316" },
    { key: "AUTO_CHECKOUT", label: "Supplier Queue", accent: "#10b981" },
    { key: "PACKING", label: "Packing", accent: "#3b82f6" },
    { key: "SHIPPED", label: "Shipped", accent: "#8b5cf6" },
  ];

  const boardOrders =
    orderFilter === "ALL"
      ? orders
      : orders.filter(
          (order) => (order.status || "NEW").toUpperCase() === orderFilter,
        );

  const ordersByStatus = orderPipelineColumns.reduce((acc, column) => {
    acc[column.key] = boardOrders.filter(
      (order) => (order.status || "NEW").toUpperCase() === column.key,
    );
    return acc;
  }, {});

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg-dark)",
        color: "white",
      }}
    >
      {/* Sidebar - Premium Dark Glass */}
      <div
        className="glass-panel"
        style={{
          width: "280px",
          borderRadius: 0,
          borderTop: "none",
          borderBottom: "none",
          borderLeft: "none",
          padding: "2rem 1.5rem",
          background: "rgba(9, 9, 11, 0.95)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.4)",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "3.5rem",
            animation: "fade-in 0.3s ease",
          }}
        >
          <div
            style={{
              background: "rgba(109, 40, 217, 0.1)",
              padding: "12px",
              borderRadius: "12px",
              boxShadow: "0 4px 15px var(--primary-glow)",
            }}
          >
            <Settings size={28} color="var(--primary-accent)" />
          </div>
          <h2
            className="text-gradient"
            style={{ margin: 0, fontSize: "1.5rem", letterSpacing: "-0.02em" }}
          >
            Admin Panel
          </h2>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <button
            className={`btn-secondary ${activeTab === "dashboard" ? "btn-primary" : ""}`}
            style={{
              textAlign: "left",
              border: "none",
              padding: "1rem",
              justifyContent: "flex-start",
              background: activeTab === "dashboard" ? "" : "transparent",
            }}
            onClick={() => setActiveTab("dashboard")}
          >
            <Activity size={18} /> Ringkasan Bisnis
          </button>
          <button
            className={`btn-secondary ${activeTab === "orders" ? "btn-primary" : ""}`}
            style={{
              textAlign: "left",
              border: "none",
              padding: "1rem",
              justifyContent: "flex-start",
              background: activeTab === "orders" ? "" : "transparent",
            }}
            onClick={() => setActiveTab("orders")}
          >
            <Package size={18} /> Pesanan Masuk
          </button>
          <button
            className={`btn-secondary ${activeTab === "dropship" ? "btn-primary" : ""}`}
            style={{
              textAlign: "left",
              border: "none",
              padding: "1rem",
              justifyContent: "flex-start",
              background: activeTab === "dropship" ? "" : "transparent",
            }}
            onClick={() => setActiveTab("dropship")}
          >
            <Compass
              size={18}
              style={{ color: activeTab === "dropship" ? "#fff" : "#fbbf24" }}
            />{" "}
            Gradia Omnichannel Master
          </button>
          <button
            className={`btn-secondary ${activeTab === "monetization" ? "btn-primary" : ""}`}
            style={{
              textAlign: "left",
              border: "none",
              padding: "1rem",
              justifyContent: "flex-start",
              background: activeTab === "monetization" ? "" : "transparent",
            }}
            onClick={() => setActiveTab("monetization")}
          >
            <LinkIcon size={18} /> Distribusi Tautan Terkelola
          </button>
          <button
            className={`btn-secondary ${activeTab === "trends" ? "btn-primary" : ""}`}
            style={{
              textAlign: "left",
              border: "none",
              padding: "1rem",
              justifyContent: "flex-start",
              background: activeTab === "trends" ? "" : "transparent",
            }}
            onClick={() => setActiveTab("trends")}
          >
            <Activity
              size={18}
              style={{ color: activeTab === "trends" ? "#fff" : "#f43f5e" }}
            />{" "}
            Pencarian Berita Afiliasi
          </button>
          <button
            className={`btn-secondary ${activeTab === "vip" ? "btn-primary" : ""}`}
            style={{
              textAlign: "left",
              border: "none",
              padding: "1rem",
              justifyContent: "flex-start",
              background: activeTab === "vip" ? "" : "transparent",
            }}
            onClick={() => setActiveTab("vip")}
          >
            <DollarSign
              size={18}
              style={{ color: activeTab === "vip" ? "#fff" : "#10b981" }}
            />{" "}
            Otorisasi Kredensial Pengguna
          </button>
          <button
            className={`btn-secondary ${activeTab === "audit" ? "btn-primary" : ""}`}
            style={{
              textAlign: "left",
              border: "none",
              padding: "1rem",
              justifyContent: "flex-start",
              background: activeTab === "audit" ? "" : "transparent",
            }}
            onClick={() => setActiveTab("audit")}
          >
            <Shield
              size={18}
              style={{ color: activeTab === "audit" ? "#fff" : "#10b981" }}
            />{" "}
            Audit Trail
          </button>
          <button
            className={`btn-secondary ${activeTab === "student_control" ? "btn-primary" : ""}`}
            style={{
              textAlign: "left",
              border: "none",
              padding: "1rem",
              justifyContent: "flex-start",
              background: activeTab === "student_control" ? "" : "transparent",
            }}
            onClick={() => setActiveTab("student_control")}
          >
            <Users
              size={18}
              style={{
                color: activeTab === "student_control" ? "#fff" : "#6366f1",
              }}
            />{" "}
            Kontrol Web Mahasiswa
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          padding: "3.5rem",
          overflowY: "auto",
          background:
            "radial-gradient(circle at top right, rgba(109, 40, 217, 0.08) 0%, transparent 50%)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            animation: "fade-in 0.4s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: "3rem",
            }}
          >
            <div>
              <h1
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "2.5rem",
                  letterSpacing: "-0.03em",
                }}
              >
                Omnichannel Command Center
              </h1>
              <p
                className="text-muted"
                style={{ margin: 0, fontSize: "1.1rem" }}
              >
                Sistem kontrol pusat untuk manajemen dan otomatisasi monetisasi
                tingkat Enterprise.
              </p>
            </div>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  padding: "0.5rem 1rem",
                  borderRadius: "99px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 8px #10b981",
                  }}
                ></div>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "#10b981",
                    fontWeight: "bold",
                  }}
                >
                  SYSTEM ONLINE
                </span>
              </div>
            </div>
          </div>

          {activeTab === "dashboard" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1.5rem",
                marginBottom: "3rem",
                animation: "fade-in 0.5s ease",
              }}
            >
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="glass-panel glass-panel-hover"
                  style={{
                    padding: "2rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "1.5rem",
                    borderTop: "2px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      padding: "1.25rem",
                      borderRadius: "50%",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
                    }}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <p
                      style={{
                        margin: "0 0 0.25rem 0",
                        color: "var(--text-muted)",
                        fontSize: "0.9rem",
                        fontWeight: "500",
                      }}
                    >
                      {stat.label}
                    </p>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.75rem",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {stat.value}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "orders" && (
            <div
              className="glass-panel"
              style={{ padding: "2.5rem", animation: "fade-in 0.5s ease" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "1.75rem" }}>
                  Manajemen Pesanan & Auto-Fulfillment
                </h2>
                <button
                  className="btn-primary flex-center gap-4"
                  disabled={selectedOrders.length === 0 || bulkCheckoutLoading}
                  onClick={handleBulkCheckout}
                  style={{ padding: "0.875rem 1.5rem" }}
                >
                  <Package size={18} />
                  {bulkCheckoutLoading
                    ? "Memproses..."
                    : `Bulk Checkout (${selectedOrders.length})`}
                </button>
              </div>
              <p
                style={{
                  color: "var(--text-muted)",
                  marginBottom: "2.5rem",
                  fontSize: "1.05rem",
                }}
              >
                Pilih pesanan di bawah ini untuk meneruskan data secara masal ke
                supplier dalam satu klik.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "0.75rem",
                  marginBottom: "1.5rem",
                }}
              >
                {orderFilterOptions.map((item) => (
                  <button
                    key={item.key}
                    className="btn-secondary"
                    onClick={() => setOrderFilter(item.key)}
                    style={{
                      padding: "0.8rem 1rem",
                      border:
                        orderFilter === item.key
                          ? "1px solid rgba(16,185,129,0.5)"
                          : undefined,
                      background:
                        orderFilter === item.key
                          ? "rgba(16,185,129,0.12)"
                          : undefined,
                    }}
                  >
                    {item.label} · {orderStatusCounts[item.key] || 0}
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "1rem",
                  alignItems: "start",
                }}
              >
                {orderPipelineColumns.map((column) => {
                  const columnOrders =
                    orderFilter === "ALL"
                      ? ordersByStatus[column.key]
                      : boardOrders.filter(
                          (order) =>
                            (order.status || "NEW").toUpperCase() ===
                            column.key,
                        );

                  return (
                    <div
                      key={column.key}
                      style={{
                        background: "rgba(0,0,0,0.25)",
                        border: `1px solid ${column.accent}33`,
                        borderRadius: "16px",
                        padding: "1rem",
                        minHeight: "260px",
                        transition: "all 0.15s ease",
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        handleDropOrderToStatus(column.key);
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "1rem",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            {column.label}
                          </div>
                          <strong style={{ fontSize: "1.3rem" }}>
                            {columnOrders.length}
                          </strong>
                        </div>
                        <div
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "999px",
                            background: column.accent,
                            boxShadow: `0 0 12px ${column.accent}`,
                          }}
                        />
                      </div>

                      <div style={{ display: "grid", gap: "0.75rem" }}>
                        {columnOrders.length === 0 ? (
                          <div
                            style={{
                              padding: "1.25rem",
                              borderRadius: "12px",
                              border: "1px dashed rgba(255,255,255,0.1)",
                              color: "var(--text-muted)",
                              textAlign: "center",
                              fontSize: "0.9rem",
                            }}
                          >
                            Kosong
                          </div>
                        ) : (
                          columnOrders.map((order) => (
                            <div
                              key={order.id}
                              draggable={true}
                              onDragStart={() => handleDragStartOrder(order.id)}
                              onDragEnd={handleDragEndOrder}
                              style={{
                                background: "rgba(0,0,0,0.35)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "14px",
                                padding: "1rem",
                                display: "grid",
                                gap: "0.85rem",
                                cursor: "grab",
                                opacity:
                                  draggingOrderId === order.id ? 0.55 : 1,
                                transform:
                                  draggingOrderId === order.id
                                    ? "scale(0.98)"
                                    : "none",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: "0.75rem",
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    {order.product_name}
                                  </div>
                                  <strong
                                    style={{
                                      fontSize: "1rem",
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    {order.customer_name ||
                                      "Pembeli belum diisi"}
                                  </strong>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={selectedOrders.includes(order.id)}
                                  onChange={() => handleSelectOrder(order.id)}
                                  disabled={
                                    !["NEW", "PENDING"].includes(order.status)
                                  }
                                  style={{ width: "1rem", height: "1rem" }}
                                />
                              </div>

                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  color: "var(--text-muted)",
                                  lineHeight: 1.45,
                                }}
                              >
                                <div>
                                  {order.quantity ?? 1}x · Rp{" "}
                                  {(order.total_price ?? 0).toLocaleString(
                                    "id-ID",
                                  )}
                                </div>
                                <div>{order.customer_phone || "No phone"}</div>
                                <div>{order.customer_address}</div>
                                {order.buyer_note && (
                                  <div>Catatan: {order.buyer_note}</div>
                                )}
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "0.5rem",
                                }}
                              >
                                {["NEW", "PENDING"].includes(order.status) && (
                                  <button
                                    className="btn-primary"
                                    onClick={() =>
                                      handleAutoCheckout(
                                        order.id,
                                        order.customer_address,
                                      )
                                    }
                                    disabled={rowCheckoutLoadingId === order.id}
                                    style={{
                                      padding: "0.65rem 0.9rem",
                                      fontSize: "0.85rem",
                                    }}
                                  >
                                    {rowCheckoutLoadingId === order.id
                                      ? "..."
                                      : "Checkout"}
                                  </button>
                                )}
                                {order.status === "AUTO_CHECKOUT" && (
                                  <button
                                    className="btn-secondary"
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        "PACKING",
                                      )
                                    }
                                    disabled={rowCheckoutLoadingId === order.id}
                                    style={{
                                      padding: "0.65rem 0.9rem",
                                      fontSize: "0.85rem",
                                    }}
                                  >
                                    Packing
                                  </button>
                                )}
                                {order.status === "PACKING" && (
                                  <button
                                    className="btn-secondary"
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        "SHIPPED",
                                      )
                                    }
                                    disabled={rowCheckoutLoadingId === order.id}
                                    style={{
                                      padding: "0.65rem 0.9rem",
                                      fontSize: "0.85rem",
                                    }}
                                  >
                                    Shipped
                                  </button>
                                )}
                                {[
                                  "NEW",
                                  "PENDING",
                                  "AUTO_CHECKOUT",
                                  "PACKING",
                                ].includes(order.status) && (
                                  <button
                                    className="btn-secondary"
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        "CANCELLED",
                                      )
                                    }
                                    disabled={rowCheckoutLoadingId === order.id}
                                    style={{
                                      padding: "0.65rem 0.9rem",
                                      fontSize: "0.85rem",
                                      borderColor: "rgba(239,68,68,0.35)",
                                      color: "#fca5a5",
                                    }}
                                  >
                                    Cancel
                                  </button>
                                )}
                                {![
                                  "NEW",
                                  "PENDING",
                                  "AUTO_CHECKOUT",
                                  "PACKING",
                                ].includes(order.status) && (
                                  <span
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "#86efac",
                                    }}
                                  >
                                    Done
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "dropship" && (
            <div
              className="glass-panel"
              style={{ padding: "3rem", animation: "fade-in 0.5s ease" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "2.5rem",
                }}
              >
                <div>
                  <h2
                    className="text-gradient-gold"
                    style={{ margin: "0 0 0.5rem 0", fontSize: "2.2rem" }}
                  >
                    Gradia Omnichannel Master
                  </h2>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      margin: 0,
                      fontSize: "1.1rem",
                      maxWidth: "800px",
                      lineHeight: "1.6",
                    }}
                  >
                    Sistem Enterprise Resources Planning (ERP) mandiri. Kelola
                    ribuan produk, sinkronisasi stok lintas-platform secara
                    real-time, dan distribusikan massal tanpa memerlukan pihak
                    ketiga.
                  </p>
                </div>
                <button
                  className="btn-secondary"
                  onClick={handleSyncInventory}
                  disabled={syncingInventory}
                  style={{
                    padding: "0.75rem 1.5rem",
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "center",
                  }}
                >
                  <RefreshCcw
                    size={18}
                    className={syncingInventory ? "spin" : ""}
                  />
                  {syncingInventory
                    ? "Menyelaraskan Stok..."
                    : "Sinkronisasi Master Stok"}
                </button>
              </div>

              {/* Panel Status Infrastruktur ERP */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "1.5rem",
                  marginBottom: "3rem",
                }}
              >
                {/* Node Ekstensi Scraper */}
                <div
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    padding: "1.5rem",
                    borderRadius: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <Database
                        size={22}
                        style={{
                          color: scraperConnected ? "#10b981" : "#f59e0b",
                        }}
                      />
                      <strong style={{ fontSize: "1.1rem" }}>
                        Scraper Node
                      </strong>
                    </div>
                    {scraperConnected ? (
                      <CheckCircle size={18} color="#10b981" />
                    ) : (
                      <Activity size={18} color="#f59e0b" />
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-muted)",
                      marginBottom: "1.5rem",
                    }}
                  >
                    {scraperConnected
                      ? "Pendengar Webhook aktif. Scraping real-time beroperasi normal."
                      : "Koneksi ke ekstensi browser terputus."}
                  </p>
                  {!scraperConnected ? (
                    <button
                      onClick={handleConnectScraper}
                      className="btn-primary"
                      style={{
                        width: "100%",
                        padding: "0.6rem",
                        fontSize: "0.9rem",
                      }}
                    >
                      Init Koneksi Node
                    </button>
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        padding: "0.6rem",
                        textAlign: "center",
                        color: "#10b981",
                        fontSize: "0.9rem",
                        background: "rgba(16,185,129,0.1)",
                        borderRadius: "6px",
                      }}
                    >
                      Koneksi Stabil
                    </div>
                  )}
                </div>

                {/* Node API Marketplace */}
                <div
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    padding: "1.5rem",
                    borderRadius: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <Globe size={22} style={{ color: "#3b82f6" }} />
                      <strong style={{ fontSize: "1.1rem" }}>
                        Saluran Distribusi
                      </strong>
                    </div>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        background: "rgba(148,163,184,0.2)",
                        color: "#94a3b8",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                      }}
                    >
                      Belum Terhubung
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.85rem",
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      <span>Shopee API</span>{" "}
                      <span style={{ color: "#94a3b8" }}>Belum Terhubung</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.85rem",
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      <span>Tokopedia API</span>{" "}
                      <span style={{ color: "#94a3b8" }}>Belum Terhubung</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.85rem",
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      <span>TikTok Shop API</span>{" "}
                      <span style={{ color: "#94a3b8" }}>Belum Terhubung</span>
                    </div>
                  </div>
                  <p
                    style={{
                      margin: "1rem 0 0 0",
                      fontSize: "0.75rem",
                      color: "rgba(255,255,255,0.4)",
                      lineHeight: 1.5,
                    }}
                  >
                    Sinkronisasi di bawah masih memakai data lokal (belum ada integrasi API resmi
                    marketplace). Status di atas akan berubah otomatis begitu kredensial API resmi
                    tersambung.
                  </p>
                </div>

                {/* Node Master Database */}
                <div
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    padding: "1.5rem",
                    borderRadius: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <Server size={22} style={{ color: "#8b5cf6" }} />
                      <strong style={{ fontSize: "1.1rem" }}>
                        Pusat Data Master
                      </strong>
                    </div>
                  </div>
                  <p
                    style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}
                  >
                    Menyimpan katalog aktif, stok, harga beli, dan status
                    sinkronisasi per channel.
                  </p>
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  paddingTop: "3rem",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 1.5rem 0",
                    fontSize: "1.5rem",
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  Draft Produk Masuk
                </h3>

                {scrapedDrafts.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      marginBottom: "3rem",
                    }}
                  >
                    {scrapedDrafts.map((draft, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          padding: "1.5rem",
                          borderRadius: "12px",
                          display: "flex",
                          gap: "1.5rem",
                          alignItems: "center",
                        }}
                      >
                        {draft.image_url && (
                          <img
                            src={draft.image_url}
                            alt="Draft"
                            style={{
                              width: "80px",
                              height: "80px",
                              borderRadius: "8px",
                              objectFit: "cover",
                            }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <h4
                            style={{
                              margin: "0 0 0.5rem 0",
                              fontSize: "1.2rem",
                              color: "var(--primary-accent)",
                            }}
                          >
                            {draft.name}
                          </h4>
                          <p style={{ margin: 0, color: "var(--text-muted)" }}>
                            Sumber: {draft.source_platform} | Harga Modal: Rp{" "}
                            {(draft.price ?? 0).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <button
                          className="btn-primary"
                          onClick={() => handlePromoteDraftToMaster(draft)}
                          disabled={
                            draftSavingId === (draft.id ?? draft.original_url)
                          }
                          style={{ padding: "0.75rem 1.5rem" }}
                        >
                          {draftSavingId === (draft.id ?? draft.original_url)
                            ? "Memindahkan..."
                            : "Masukkan ke Pipeline"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: "12px",
                      border: "1px dashed rgba(255,255,255,0.1)",
                      marginBottom: "3rem",
                    }}
                  >
                    <p style={{ color: "var(--text-muted)" }}>
                      Belum ada draft produk yang masuk.
                    </p>
                  </div>
                )}

                <h3
                  style={{
                    margin: "0 0 1.5rem 0",
                    fontSize: "1.5rem",
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  Analisis Katalog
                </h3>
                <form
                  onSubmit={handleArbitrageSearch}
                  style={{ display: "flex", gap: "1rem", marginBottom: "3rem" }}
                >
                  <div style={{ position: "relative", flex: 1 }}>
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "1.25rem",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                      }}
                    >
                      <Search size={20} />
                    </div>
                    <input
                      type="text"
                      className="input-glass"
                      placeholder="Cari produk supplier, contoh: Sepatu Nike Terbaru"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        paddingLeft: "3rem",
                        fontSize: "1.1rem",
                        height: "100%",
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary flex-center gap-4"
                    disabled={scraping}
                    style={{
                      padding: "0 2.5rem",
                      fontSize: "1.1rem",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                    }}
                  >
                    {scraping ? "Menganalisis..." : "Cari Supplier"}
                  </button>
                </form>
              </div>

              {arbitrageResult && (
                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    padding: "2.5rem",
                    borderRadius: "16px",
                    background: "rgba(0,0,0,0.4)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                    animation: "fade-in 0.4s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "2.5rem",
                      marginBottom: "2rem",
                    }}
                  >
                    {arbitrageResult.image_url && (
                      <div
                        style={{
                          width: "220px",
                          height: "220px",
                          borderRadius: "12px",
                          overflow: "hidden",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <img
                          src={arbitrageResult.image_url}
                          alt="Product"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          background: "#fbbf24",
                          color: "#000",
                          padding: "0.4rem 1rem",
                          borderRadius: "999px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          marginBottom: "1rem",
                          boxShadow: "0 4px 10px rgba(251, 191, 36, 0.3)",
                        }}
                      >
                        <Shield size={14} /> Tervalidasi dari Supplier:{" "}
                        {arbitrageResult.source_platform}
                      </div>
                      <h3
                        style={{
                          margin: "0 0 0.5rem 0",
                          fontSize: "1.75rem",
                          lineHeight: "1.3",
                        }}
                      >
                        {arbitrageResult.name}
                      </h3>

                      <div
                        style={{
                          display: "flex",
                          gap: "3rem",
                          margin: "2rem 0",
                          padding: "1.5rem",
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: "12px",
                          border: "1px dashed rgba(255,255,255,0.1)",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin: "0 0 0.5rem 0",
                              fontSize: "0.9rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            Modal Pembelian (Master)
                          </p>
                          <strong
                            style={{
                              fontSize: "1.5rem",
                              color: "#ef4444",
                              textDecoration: "line-through",
                            }}
                          >
                            Rp{" "}
                            {(arbitrageResult.base_price ?? 0).toLocaleString("id-ID")}
                          </strong>
                        </div>
                        <div
                          style={{
                            width: "1px",
                            background: "rgba(255,255,255,0.1)",
                          }}
                        ></div>
                        <div>
                          <p
                            style={{
                              margin: "0 0 0.5rem 0",
                              fontSize: "0.9rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            Harga Jual Omnichannel (+{markupPercentage}%)
                          </p>
                          <strong
                            style={{
                              fontSize: "1.75rem",
                              color: "#10b981",
                              textShadow: "0 0 10px rgba(16, 185, 129, 0.3)",
                            }}
                          >
                            Rp{" "}
                            {Math.floor(
                              (arbitrageResult.base_price ?? 0) *
                                (1 + markupPercentage / 100),
                            ).toLocaleString("id-ID")}
                          </strong>
                          <p
                            style={{
                              margin: "0.5rem 0 0 0",
                              fontSize: "0.85rem",
                              color: "#f59e0b",
                              fontWeight: "bold",
                            }}
                          >
                            Estimasi Laba Bersih: Rp{" "}
                            {Math.floor(
                              (arbitrageResult.base_price ?? 0) *
                                (markupPercentage / 100),
                            ).toLocaleString("id-ID")}{" "}
                            / item
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "1rem",
                          background: "rgba(0,0,0,0.3)",
                          padding: "1.5rem",
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "1rem",
                          }}
                        >
                          <strong
                            style={{
                              color: "rgba(255,255,255,0.9)",
                              fontSize: "1rem",
                            }}
                          >
                            Setel Markup Harga Serentak
                          </strong>
                          <strong style={{ color: "#10b981" }}>
                            {markupPercentage}%
                          </strong>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="150"
                          value={markupPercentage}
                          onChange={(e) => setMarkupPercentage(e.target.value)}
                          style={{
                            width: "100%",
                            cursor: "pointer",
                            accentColor: "#10b981",
                          }}
                        />
                        <p
                          style={{
                            margin: "0.5rem 0 0 0",
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Perubahan markup akan diaplikasikan secara dinamis
                          saat melakukan Mass Publish.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "2.5rem",
                      display: "flex",
                      gap: "1rem",
                      justifyContent: "flex-end",
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                      paddingTop: "2rem",
                    }}
                  >
                    <button
                      className="btn-secondary"
                      onClick={handleSaveToMaster}
                      disabled={savingMaster}
                      style={{
                        padding: "0.875rem 1.5rem",
                        display: "flex",
                        gap: "0.75rem",
                        alignItems: "center",
                      }}
                    >
                      <Server size={18} />{" "}
                      {savingMaster
                        ? "Menyimpan..."
                        : "Simpan ke Master Data Lokal"}
                    </button>
                    <button
                      className="btn-primary"
                      onClick={handleMassPublish}
                      disabled={massPublishing}
                      style={{
                        padding: "0.875rem 2rem",
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      }}
                    >
                      {massPublishing ? (
                        <>Mendistribusikan ke 4 API...</>
                      ) : (
                        <>
                          <Globe size={18} /> Mass Publish ke Seluruh Toko
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {masterProducts.length > 0 && (
                <div
                  style={{
                    marginTop: "3rem",
                    marginBottom: "3rem",
                    padding: "2rem",
                    borderRadius: "16px",
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.4rem" }}>
                    Buat Order Dropship
                  </h3>
                  <form
                    onSubmit={handleCreateDropshipOrder}
                    style={{ display: "grid", gap: "1rem" }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr 1fr",
                        gap: "1rem",
                      }}
                    >
                      <select
                        className="input-glass"
                        value={orderForm.product_id}
                        onChange={(e) =>
                          setOrderForm((prev) => ({
                            ...prev,
                            product_id: e.target.value,
                          }))
                        }
                        required
                      >
                        <option value="">Pilih produk master</option>
                        {masterProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input-glass"
                        placeholder="Nama pembeli"
                        value={orderForm.customer_name}
                        onChange={(e) =>
                          setOrderForm((prev) => ({
                            ...prev,
                            customer_name: e.target.value,
                          }))
                        }
                      />
                      <input
                        className="input-glass"
                        placeholder="No. telepon pembeli"
                        value={orderForm.customer_phone}
                        onChange={(e) =>
                          setOrderForm((prev) => ({
                            ...prev,
                            customer_phone: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <textarea
                      className="input-glass"
                      placeholder="Alamat kirim"
                      value={orderForm.shipping_address}
                      onChange={(e) =>
                        setOrderForm((prev) => ({
                          ...prev,
                          shipping_address: e.target.value,
                        }))
                      }
                      required
                      rows={3}
                    />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "140px 1fr auto",
                        gap: "1rem",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="number"
                        min="1"
                        className="input-glass"
                        value={orderForm.quantity}
                        onChange={(e) =>
                          setOrderForm((prev) => ({
                            ...prev,
                            quantity: e.target.value,
                          }))
                        }
                      />
                      <input
                        className="input-glass"
                        placeholder="Catatan pembeli"
                        value={orderForm.buyer_note}
                        onChange={(e) =>
                          setOrderForm((prev) => ({
                            ...prev,
                            buyer_note: e.target.value,
                          }))
                        }
                      />
                      <button className="btn-primary" type="submit">
                        Buat Order
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TABEL REAL-TIME INVENTORY */}
              <div style={{ marginTop: "4rem" }}>
                <h3
                  style={{
                    margin: "0 0 1.5rem 0",
                    fontSize: "1.5rem",
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  Status Inventaris Toko Gradia (Real-Time)
                </h3>
                <div
                  className="table-container"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.05)",
                    overflow: "hidden",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          textAlign: "left",
                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <th
                          style={{
                            padding: "1rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Produk
                        </th>
                        <th
                          style={{
                            padding: "1rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Harga (IDR)
                        </th>
                        <th
                          style={{
                            padding: "1rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Stok Master
                        </th>
                        <th
                          style={{
                            padding: "1rem",
                            color: "var(--text-muted)",
                            textAlign: "center",
                          }}
                        >
                          Shopee
                        </th>
                        <th
                          style={{
                            padding: "1rem",
                            color: "var(--text-muted)",
                            textAlign: "center",
                          }}
                        >
                          Tokopedia
                        </th>
                        <th
                          style={{
                            padding: "1rem",
                            color: "var(--text-muted)",
                            textAlign: "center",
                          }}
                        >
                          TikTok
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterProducts.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            style={{
                              padding: "2rem",
                              textAlign: "center",
                              color: "var(--text-muted)",
                            }}
                          >
                            Belum ada produk di Master Data. Lakukan pencarian
                            arbitrase di atas.
                          </td>
                        </tr>
                      ) : (
                        masterProducts.map((p) => (
                          <tr
                            key={p.id}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            <td style={{ padding: "1rem" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "1rem",
                                }}
                              >
                                {p.image_url ? (
                                  <img
                                    src={p.image_url}
                                    alt="Prod"
                                    style={{
                                      width: "40px",
                                      height: "40px",
                                      borderRadius: "6px",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: "40px",
                                      height: "40px",
                                      borderRadius: "6px",
                                      background: "rgba(255,255,255,0.1)",
                                    }}
                                  ></div>
                                )}
                                <div>
                                  <div style={{ fontWeight: "bold" }}>
                                    {(p.name ?? "").substring(0, 30)}
                                    {(p.name ?? "").length > 30 ? "..." : ""}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    Sumber: {p.source_platform}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "1rem",
                                color: "#10b981",
                                fontWeight: "bold",
                              }}
                            >
                              Rp {(p.price ?? 0).toLocaleString("id-ID")}
                            </td>
                            <td style={{ padding: "1rem" }}>
                              {p.stock_quantity} unit
                            </td>
                            <td
                              style={{ padding: "1rem", textAlign: "center" }}
                            >
                              {p.sync_status?.shopee === "ok" ? (
                                <CheckCircle
                                  size={16}
                                  color="#10b981"
                                  style={{ margin: "0 auto" }}
                                />
                              ) : (
                                <Activity
                                  size={16}
                                  color="#f59e0b"
                                  style={{ margin: "0 auto" }}
                                />
                              )}
                            </td>
                            <td
                              style={{ padding: "1rem", textAlign: "center" }}
                            >
                              {p.sync_status?.tokopedia === "ok" ? (
                                <CheckCircle
                                  size={16}
                                  color="#10b981"
                                  style={{ margin: "0 auto" }}
                                />
                              ) : (
                                <Activity
                                  size={16}
                                  color="#f59e0b"
                                  style={{ margin: "0 auto" }}
                                />
                              )}
                            </td>
                            <td
                              style={{ padding: "1rem", textAlign: "center" }}
                            >
                              {p.sync_status?.tiktok === "ok" ? (
                                <CheckCircle
                                  size={16}
                                  color="#10b981"
                                  style={{ margin: "0 auto" }}
                                />
                              ) : (
                                <Activity
                                  size={16}
                                  color="#f59e0b"
                                  style={{ margin: "0 auto" }}
                                />
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "trends" && (
            <div
              className="glass-panel"
              style={{ padding: "3rem", animation: "fade-in 0.5s ease" }}
            >
              <div style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "2rem" }}>
                  Pencarian Berita Afiliasi
                </h2>
                <p
                  className="text-muted"
                  style={{ margin: 0, fontSize: "1.1rem" }}
                >
                  Cari berita spesifik untuk disebarkan sebagai Safelink.
                </p>
              </div>

              <div
                style={{ display: "flex", gap: "1rem", marginBottom: "2.5rem" }}
              >
                <div style={{ position: "relative", flex: 1 }}>
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "1.25rem",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Search size={20} />
                  </div>
                  <input
                    type="text"
                    className="input-glass"
                    placeholder="Cari kata kunci berita (Misal: Teknologi, Viral, Bisnis)..."
                    value={trendKeyword}
                    onChange={(e) => setTrendKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") fetchTrends(trendKeyword);
                    }}
                    style={{
                      width: "100%",
                      paddingLeft: "3.5rem",
                      paddingRight: "1rem",
                      paddingTop: "1rem",
                      paddingBottom: "1rem",
                      fontSize: "1.1rem",
                    }}
                  />
                </div>
                <button
                  className="btn-primary"
                  onClick={() => fetchTrends(trendKeyword)}
                  style={{ padding: "0 2.5rem", fontSize: "1.1rem" }}
                >
                  Cari Berita
                </button>
              </div>

              {trendsLoading ? (
                <div style={{ textAlign: "center", padding: "3rem" }}>
                  Memuat data tren...
                </div>
              ) : (
                <div style={{ display: "grid", gap: "1rem" }}>
                  {trends.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "rgba(0,0,0,0.2)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        padding: "1.5rem",
                        borderRadius: "12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            margin: "0 0 0.5rem 0",
                            color: "var(--primary-accent)",
                          }}
                        >
                          {item.keyword}
                        </h3>
                        <p
                          style={{
                            margin: "0 0 0.25rem 0",
                            fontSize: "0.9rem",
                            color: "var(--text-main)",
                          }}
                        >
                          {item.news_title}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Traffic: {item.traffic}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {item.news_url && (
                          <>
                            <a
                              href={item.news_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-secondary"
                              style={{
                                textDecoration: "none",
                                fontSize: "0.85rem",
                                padding: "0.5rem 1rem",
                              }}
                            >
                              Baca Asli
                            </a>
                            <button
                              onClick={() => openNewsSafelinkModal(item)}
                              className="btn-primary"
                              style={{
                                fontSize: "0.85rem",
                                padding: "0.5rem 1rem",
                              }}
                            >
                              + Buat Safelink
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "monetization" && (
            <div
              className="glass-panel"
              style={{ padding: "3rem", animation: "fade-in 0.5s ease" }}
            >
              <div style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "2rem" }}>
                  Distribusi Tautan Terkelola (Safelink)
                </h2>
                <p
                  className="text-muted"
                  style={{ margin: 0, fontSize: "1.1rem" }}
                >
                  Hasilkan Halaman Arahan (Landing Page) berbasis tren terkini
                  untuk mengoptimalkan konversi trafik secara efisien.
                </p>
              </div>

              <form
                onSubmit={handleAddLink}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                  marginBottom: "3rem",
                  background: "rgba(0,0,0,0.2)",
                  padding: "2rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div style={{ display: "flex", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      URL Produk Afiliasi
                    </label>
                    <input
                      type="url"
                      className="input-glass"
                      placeholder="Misal: https://shope.ee/..."
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      required
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      URL Sumber Referensi (Opsional)
                    </label>
                    <input
                      type="url"
                      className="input-glass"
                      placeholder="Misal: https://news.detik.com/..."
                      value={newsSource}
                      onChange={(e) => setNewsSource(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Judul Halaman Arahan
                  </label>
                  <input
                    type="text"
                    className="input-glass"
                    placeholder="Masukkan judul artikel yang akan didistribusikan..."
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Ringkasan Konten (Isi Halaman Arahan)
                  </label>
                  <textarea
                    className="input-glass"
                    placeholder="Masukkan 1-2 paragraf konten pengantar di sini..."
                    value={newsSummary}
                    onChange={(e) => setNewsSummary(e.target.value)}
                    rows="3"
                    style={{ width: "100%", resize: "vertical" }}
                  ></textarea>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    className="btn-primary flex-center gap-4"
                    disabled={loading}
                    style={{ padding: "0.875rem 2rem" }}
                  >
                    <Plus size={18} /> Simpan Tautan
                  </button>
                </div>
              </form>

              <div
                style={{
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)",
                  overflow: "hidden",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    textAlign: "left",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--glass-border)",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <th
                        style={{
                          padding: "1.25rem 1.5rem",
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: "600",
                          fontSize: "0.9rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Detail Link
                      </th>
                      <th
                        style={{
                          padding: "1.25rem 1.5rem",
                          textAlign: "right",
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: "600",
                          fontSize: "0.9rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.length === 0 ? (
                      <tr>
                        <td
                          colSpan="2"
                          style={{
                            padding: "3rem",
                            textAlign: "center",
                            color: "var(--text-muted)",
                          }}
                        >
                          Belum ada link yang didaftarkan.
                        </td>
                      </tr>
                    ) : (
                      links.map((link) => (
                        <tr
                          key={link.id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.02)",
                            transition: "background 0.2s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(255,255,255,0.02)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <td style={{ padding: "1.25rem 1.5rem" }}>
                            {link.news_title && (
                              <div
                                style={{
                                  color: "#0ea5e9",
                                  fontWeight: "bold",
                                  marginBottom: "0.25rem",
                                }}
                              >
                                {link.news_title}
                              </div>
                            )}
                            <div
                              style={{
                                color: "var(--text-main)",
                                fontFamily: "monospace",
                                fontSize: "0.85rem",
                              }}
                            >
                              🎯 Tautan Afiliasi: {link.url}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "1.25rem 1.5rem",
                              textAlign: "right",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "0.5rem",
                                justifyContent: "flex-end",
                              }}
                            >
                              {link.news_title && (
                                <button
                                  className="btn-secondary"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      `Temukan informasi selengkapnya mengenai materi ini: ${link.news_title}\n\nBaca di: ${window.location.origin}/baca/${link.id}`,
                                    );
                                    showToast("Teks publikasi disalin ke clipboard.");
                                  }}
                                  style={{
                                    padding: "0.6rem",
                                    fontSize: "0.8rem",
                                  }}
                                  title="Salin Teks Publikasi"
                                >
                                  Salin Teks Publikasi
                                </button>
                              )}
                              <button
                                className="btn-secondary"
                                onClick={() => handleDeleteLink(link.id)}
                                style={{
                                  padding: "0.6rem",
                                  color: "#ef4444",
                                  borderColor: "rgba(239, 68, 68, 0.2)",
                                  background: "rgba(239, 68, 68, 0.05)",
                                }}
                                title="Hapus Tautan"
                              >
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

          {activeTab === "vip" && (
            <div
              className="glass-panel"
              style={{ padding: "3rem", animation: "fade-in 0.5s ease" }}
            >
              <div style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "2rem" }}>
                  Otorisasi Kredensial Pengguna
                </h2>
                <p
                  className="text-muted"
                  style={{ margin: 0, fontSize: "1.1rem" }}
                >
                  Verifikasi transaksi masuk pada sistem pembayaran Anda dan
                  setujui status pengguna.
                </p>
              </div>

              <div
                style={{
                  overflowX: "auto",
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.9rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--glass-border)",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <th
                        style={{
                          padding: "1.25rem",
                          textAlign: "left",
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: "600",
                        }}
                      >
                        Waktu Order
                      </th>
                      <th
                        style={{
                          padding: "1.25rem",
                          textAlign: "left",
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: "600",
                        }}
                      >
                        Email Mahasiswa
                      </th>
                      <th
                        style={{
                          padding: "1.25rem",
                          textAlign: "left",
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: "600",
                        }}
                      >
                        No. Ref (Kode Unik)
                      </th>
                      <th
                        style={{
                          padding: "1.25rem",
                          textAlign: "left",
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: "600",
                        }}
                      >
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingVIPs.map((inv) => (
                      <tr
                        key={inv.id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.03)",
                        }}
                      >
                        <td
                          style={{
                            padding: "1.25rem",
                            color: "var(--text-main)",
                          }}
                        >
                          {new Date(inv.created_at).toLocaleString("id-ID")}
                        </td>
                        <td
                          style={{
                            padding: "1.25rem",
                            color: "var(--primary-accent)",
                          }}
                        >
                          {inv.user_email}
                        </td>
                        <td style={{ padding: "1.25rem" }}>
                          <span
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: "bold",
                              color: "#f59e0b",
                            }}
                          >
                            Rp {(inv.amount ?? 0).toLocaleString("id-ID")}
                          </span>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            {inv.reference}
                          </div>
                        </td>
                        <td style={{ padding: "1.25rem" }}>
                          <button
                            className="btn-primary"
                            style={{
                              background:
                                "linear-gradient(135deg, #10b981, #059669)",
                              padding: "0.75rem 1.5rem",
                            }}
                            onClick={() => handleApproveVIP(inv.id)}
                            disabled={vipLoading === inv.id}
                          >
                            {vipLoading === inv.id
                              ? "Memproses..."
                              : "Otorisasi Akses"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pendingVIPs.length === 0 && (
                      <tr>
                        <td
                          colSpan="4"
                          style={{
                            padding: "4rem",
                            textAlign: "center",
                            color: "var(--text-muted)",
                          }}
                        >
                          <DollarSign
                            size={48}
                            color="rgba(255,255,255,0.1)"
                            style={{ margin: "0 auto 1rem auto" }}
                          />
                          Belum ada tagihan VIP yang tertunda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div
              className="glass-panel"
              style={{ padding: "3rem", animation: "fade-in 0.5s ease" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <Shield size={32} color="#10b981" />
                <h2 style={{ margin: 0, fontSize: "2rem" }}>
                  Audit Trail & Keamanan Logs
                </h2>
              </div>
              <p
                style={{
                  color: "var(--text-muted)",
                  marginBottom: "3rem",
                  fontSize: "1.05rem",
                  maxWidth: "800px",
                  lineHeight: "1.6",
                }}
              >
                Sistem pencatatan aktivitas terpusat untuk setiap eksekusi
                operasional. Melacak Alamat IP dan otorisasi pengguna untuk
                mendukung kepatuhan standar Enterprise.
              </p>

              <div
                style={{
                  overflowX: "auto",
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.9rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--glass-border)",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <th
                        style={{
                          padding: "1.25rem",
                          textAlign: "left",
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: "600",
                        }}
                      >
                        Waktu Eksekusi
                      </th>
                      <th
                        style={{
                          padding: "1.25rem",
                          textAlign: "left",
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: "600",
                        }}
                      >
                        Operator (Email)
                      </th>
                      <th
                        style={{
                          padding: "1.25rem",
                          textAlign: "left",
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: "600",
                        }}
                      >
                        IP Address
                      </th>
                      <th
                        style={{
                          padding: "1.25rem",
                          textAlign: "left",
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: "600",
                        }}
                      >
                        Aksi / Endpoint
                      </th>
                      <th
                        style={{
                          padding: "1.25rem",
                          textAlign: "left",
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: "600",
                        }}
                      >
                        Detail Payload JSON
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr
                        key={log.id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.03)",
                          transition: "background 0.2s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(255,255,255,0.02)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td
                          style={{
                            padding: "1.25rem",
                            color: "var(--text-main)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {new Date(log.created_at).toLocaleString("id-ID")}
                        </td>
                        <td
                          style={{
                            padding: "1.25rem",
                            color: "var(--primary-accent)",
                            fontWeight: "500",
                          }}
                        >
                          {log.admin_email}
                        </td>
                        <td
                          style={{
                            padding: "1.25rem",
                            fontFamily: "monospace",
                            color: "#94a3b8",
                          }}
                        >
                          <span
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                            }}
                          >
                            {log.ip_address}
                          </span>
                        </td>
                        <td style={{ padding: "1.25rem" }}>
                          <strong
                            style={{
                              color: "#e2e8f0",
                              display: "block",
                              marginBottom: "0.25rem",
                            }}
                          >
                            {log.action}
                          </strong>
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.8rem",
                              fontFamily: "monospace",
                            }}
                          >
                            {log.endpoint}
                          </span>
                        </td>
                        <td style={{ padding: "1.25rem" }}>
                          <div
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.8rem",
                              background: "rgba(0,0,0,0.4)",
                              padding: "0.75rem",
                              borderRadius: "8px",
                              maxWidth: "280px",
                              overflowX: "auto",
                              border: "1px solid rgba(255,255,255,0.05)",
                              color: "#cbd5e1",
                            }}
                          >
                            {log.details ? (
                              <pre style={{ margin: 0 }}>
                                {formatAuditDetails(log.details)}
                              </pre>
                            ) : (
                              "-"
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td
                          colSpan="5"
                          style={{
                            padding: "4rem",
                            textAlign: "center",
                            color: "var(--text-muted)",
                          }}
                        >
                          <Shield
                            size={48}
                            color="rgba(255,255,255,0.1)"
                            style={{ margin: "0 auto 1rem auto" }}
                          />
                          Belum ada log aktivitas keamanan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === "student_control" && (
            <div
              className="tab-content"
              style={{ animation: "fade-in 0.4s ease" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "2rem",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: "2rem",
                      marginBottom: "0.5rem",
                      color: "#fff",
                    }}
                  >
                    Kontrol Web Mahasiswa
                  </h2>
                  <p style={{ color: "var(--text-muted)" }}>
                    Pusat kendali pengaturan iklan dan monetisasi di halaman
                    pengguna (Mahasiswa).
                  </p>
                </div>
                <Users size={32} style={{ color: "#6366f1" }} />
              </div>

              <form
                onSubmit={handleSaveStudentConfig}
                style={{
                  display: "grid",
                  gap: "2rem",
                  background: "rgba(255,255,255,0.02)",
                  padding: "2rem",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {/* Ads Toggle */}
                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "60px",
                        height: "32px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={studentConfig.student_ads_enabled}
                        onChange={(e) =>
                          setStudentConfig({
                            ...studentConfig,
                            student_ads_enabled: e.target.checked,
                          })
                        }
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: studentConfig.student_ads_enabled
                            ? "#10b981"
                            : "#4b5563",
                          borderRadius: "34px",
                          transition: "0.4s",
                        }}
                      ></div>
                      <div
                        style={{
                          position: "absolute",
                          height: "24px",
                          width: "24px",
                          left: "4px",
                          bottom: "4px",
                          background: "white",
                          borderRadius: "50%",
                          transition: "0.4s",
                          transform: studentConfig.student_ads_enabled
                            ? "translateX(28px)"
                            : "translateX(0)",
                        }}
                      ></div>
                    </div>
                    <div>
                      <strong
                        style={{
                          fontSize: "1.1rem",
                          display: "block",
                          color: studentConfig.student_ads_enabled
                            ? "#10b981"
                            : "#fff",
                        }}
                      >
                        {studentConfig.student_ads_enabled
                          ? "Injeksi Iklan (Ads) Aktif"
                          : "Injeksi Iklan Mati"}
                      </strong>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Menyalakan/mematikan tampilan banner iklan di modul
                        Mahasiswa.
                      </span>
                    </div>
                  </label>
                </div>

                <hr
                  style={{
                    border: "none",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                  }}
                />

                {/* Safelink Configuration */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.75rem",
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                    }}
                  >
                    Safelink (Tautan Monetisasi Download Cepat)
                  </label>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-muted)",
                      marginBottom: "1rem",
                    }}
                  >
                    Tautan ini akan dipaksakan (force redirect) ketika mahasiswa
                    memilih opsi "Download Cepat".
                  </p>
                  <input
                    type="url"
                    className="input-glass"
                    placeholder="https://example.com/safelink..."
                    value={studentConfig.student_safelink_url}
                    onChange={(e) =>
                      setStudentConfig({
                        ...studentConfig,
                        student_safelink_url: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "1rem",
                      fontSize: "1rem",
                      marginBottom: "1rem",
                    }}
                    required
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={savingConfig}
                    style={{ padding: "0.75rem 2rem" }}
                  >
                    {savingConfig
                      ? "Menyimpan Konfigurasi..."
                      : "Simpan Pengaturan"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <div
        style={{
          position: "fixed",
          top: "1.5rem",
          right: "1.5rem",
          zIndex: 2000,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxWidth: "380px",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismissToast(t.id)}
            style={{
              cursor: "pointer",
              padding: "1rem 1.25rem",
              borderRadius: "10px",
              backdropFilter: "blur(12px)",
              background:
                t.type === "error"
                  ? "rgba(239, 68, 68, 0.15)"
                  : "rgba(16, 185, 129, 0.15)",
              border: `1px solid ${t.type === "error" ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
              color: t.type === "error" ? "#fca5a5" : "#6ee7b7",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              animation: "fade-in 0.2s ease",
              fontSize: "0.9rem",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Generate News Safelink Modal */}
      {newsSafelinkModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2100,
          }}
        >
          <div className="glass-panel" style={{ maxWidth: "480px", width: "90%", padding: "2rem" }}>
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Buat Konten Afiliasi dari Berita</h3>
            <p style={{ margin: "0 0 1.5rem 0", color: "var(--text-muted)", fontSize: "0.95rem" }}>
              {newsSafelinkModal.item.news_title}
            </p>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              URL Produk/Afiliasi
            </label>
            <input
              type="text"
              autoFocus
              className="input-glass"
              placeholder="https://..."
              value={newsSafelinkModal.affiliateUrl}
              onChange={(e) =>
                setNewsSafelinkModal((m) => ({ ...m, affiliateUrl: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && submitNewsSafelinkModal()}
              style={{ width: "100%", padding: "0.85rem 1rem", marginBottom: "1.5rem" }}
            />
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setNewsSafelinkModal(null)}>
                Batal
              </button>
              <button
                className="btn-primary"
                disabled={!newsSafelinkModal.affiliateUrl || newsSafelinkModal.submitting}
                onClick={submitNewsSafelinkModal}
              >
                {newsSafelinkModal.submitting ? "Membuat..." : "Buat dengan AI"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2100,
          }}
        >
          <div
            className="glass-panel"
            style={{ maxWidth: "420px", width: "90%", padding: "2rem" }}
          >
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "1.05rem", lineHeight: 1.6 }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                className="btn-secondary"
                onClick={() => setConfirmDialog(null)}
              >
                Batal
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  action();
                }}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
