'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const KATEGORI_LIST = [
  'Jasa Cutting Laser', 'Jasa Bending', 'Jasa Shearing', 'Bengkel Fabrikasi', 
  'Otomotif & Karoseri', 'Pabrik Mesin', 'Alat Pertanian', 'Konstruksi Baja', 
  'Manufaktur Lift', 'Industri Manufaktur', 'Manufaktur Pintu/Pagar', 
  'Kontraktor ME', 'Bengkel & Permesinan', 'Kontraktor', 'Lain-lain', 'Umum'
];
const STATUS_LIST = ['Cold', 'Interested', 'Qualified', 'Converted', 'DNC'];
const KABUPATEN_FOCUS = ['Semua', 'Kab. Sidoarjo', 'Kota Surabaya', 'Kab. Gresik', 'Kab. Pasuruan', 'Unknown'];
const KECAMATAN_SIDOARJO = ['Waru','Gedangan','Sedati','Buduran','Sidoarjo','Candi','Tanggulangin','Porong','Krembung','Tulangan','Wonoayu','Krian','Taman','Sukodono','Tarik','Prambon','Jabon','Balong Bendo'];
const KECAMATAN_SURABAYA = ['Rungkut','Tenggilis Mejoyo','Sukolilo','Gunung Anyar','Mulyorejo','Tambaksari','Gubeng','Wonokromo','Wonocolo','Wiyung','Gayungan','Jambangan','Karangpilang','Krembangan','Tandes','Asemrowo'];
const KECAMATAN_GRESIK = ['Driyorejo','Kebomas','Gresik','Manyar','Cerme'];
const KECAMATAN_PASURUAN = ['Pandaan','Beji','Bangil','Gempol','Rembang'];

const KABUPATEN_MAP: Record<string, string[]> = {
  'Kab. Sidoarjo': KECAMATAN_SIDOARJO,
  'Kota Surabaya': KECAMATAN_SURABAYA,
  'Kab. Gresik': KECAMATAN_GRESIK,
  'Kab. Pasuruan': KECAMATAN_PASURUAN,
};

const KABUPATEN_KECAMATAN_MAP: Record<string, string> = {};
Object.entries(KABUPATEN_MAP).forEach(([kab, kecs]) => kecs.forEach(k => KABUPATEN_KECAMATAN_MAP[k] = kab));

type Lead = {
  id: number;
  nama_lead: string;
  nomor_wa: string | null;
  alamat_lengkap: string | null;
  website: string | null;
  bintang_google: number | null;
  koordinat_maps: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  kategori: string | null;
  jumlah_review: number | null;
  lead_score: number;
  status_crm: string;
  last_marketing_at: string | null;
};

type EditState = Partial<Lead> & { id: number };

export default function CRMDashboard() {
  const router = useRouter();
  const [data, setData] = useState<{ stats: any; kabupaten_list: any[]; kecamatan_list: string[]; leads: Lead[] }>({
    stats: {}, kabupaten_list: [], kecamatan_list: [], leads: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<EditState | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [filters, setFilters] = useState({ kabupaten: 'Semua', kecamatan: 'Semua', kategori: 'Semua', status: 'Semua' });
  
  // Scraper & Export States
  const [scraperStatus, setScraperStatus] = useState({ isRunning: false, logs: '' });
  const [scraperModal, setScraperModal] = useState(false);
  const [customKwText, setCustomKwText] = useState("[\n  {\"keyword\": \"Karoseri Surabaya\", \"kategori\": \"Otomotif & Karoseri\"}\n]");

  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [otpCode, setOtpCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [maskedTarget, setMaskedTarget] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.kabupaten !== 'Semua') qs.set('kabupaten', filters.kabupaten);
      if (filters.kecamatan !== 'Semua') qs.set('kecamatan', filters.kecamatan);
      if (filters.kategori !== 'Semua') qs.set('kategori', filters.kategori);
      if (filters.status !== 'Semua') qs.set('status', filters.status);
      const res = await fetch(`/api/debug/leads/crm?${qs}`);
      if (res.status === 401) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      setIsAuthenticated(true);
      if (res.ok) setData(await res.json());
    } catch (err) { console.error(err); }
    finally { if (isAuthenticated !== false) setLoading(false); }
  }, [filters, isAuthenticated]);

  const requestOtp = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/otp', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim OTP');
      setMaskedTarget(data.maskedPhone);
      setOtpStep('verify');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kode salah');
      setIsAuthenticated(true);
      fetchData();
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const checkScraper = async () => {
      try {
        const res = await fetch('/api/debug/leads/scraper');
        if (res.ok) {
           setScraperStatus(await res.json());
        }
      } catch (e) {}
    };
    checkScraper();
    const interval = setInterval(checkScraper, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    const qs = new URLSearchParams();
    if (filters.kabupaten !== 'Semua') qs.set('kabupaten', filters.kabupaten);
    if (filters.kecamatan !== 'Semua') qs.set('kecamatan', filters.kecamatan);
    if (filters.kategori !== 'Semua') qs.set('kategori', filters.kategori);
    if (filters.status !== 'Semua') qs.set('status', filters.status);
    window.open(`/api/debug/leads/export?${qs}`, '_blank');
  };

  const handleScraper = async (action: 'start' | 'stop') => {
    try {
      let kw = undefined;
      if (action === 'start') {
        try { kw = JSON.parse(customKwText); } 
        catch(e) { alert('Format keyword JSON salah!'); return; }
      }
      
      const res = await fetch('/api/debug/leads/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, keywords: kw })
      });
      if (!res.ok) {
         const data = await res.json();
         alert((data as any).error || 'Gagal');
      } else {
         if (action === 'start') setScraperModal(false);
      }
    } catch (e) {
      alert('Error menghubungi server scraper');
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setSaving(editRow.id);
    try {
      const kab = editRow.kecamatan ? (KABUPATEN_KECAMATAN_MAP[editRow.kecamatan] || editRow.kabupaten) : editRow.kabupaten;
      await fetch('/api/debug/leads/crm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editRow, kabupaten: kab }),
      });
      setEditRow(null);
      await fetchData();
    } finally { setSaving(null); }
  };

  const scoreColor = (s: number) => s >= 80 ? '#B91C1C' : s >= 50 ? '#D97706' : '#6B7280';
  const statusColor = (s: string) => ({
    'Cold': 'text-white/30 bg-white/5', 'Interested': 'text-emerald-400 bg-emerald-400/10',
    'Qualified': 'text-blue-400 bg-blue-400/10', 'Converted': 'text-purple-400 bg-purple-400/10', 'DNC': 'text-red-400 bg-red-400/10'
  }[s] || 'text-white/30 bg-white/5');

  const kecOptions = filters.kabupaten !== 'Semua' ? (KABUPATEN_MAP[filters.kabupaten] || data.kecamatan_list) : data.kecamatan_list;

  if (isAuthenticated === false) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0F14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, color: '#E2E8F0', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: '100%', maxWidth: 384, background: '#12151D', border: '1px solid rgba(255,255,255,0.07)', padding: 32, borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', color: '#F1F5F9' }}>MK Metalindo CRM</h1>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Secure Console Access</p>
          </div>

          {authError && (
            <div style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid #DC2626', color: '#FCA5A5', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 24, textAlign: 'center' }}>
              {authError}
            </div>
          )}

          {otpStep === 'request' ? (
            <div style={{ textAlign: 'center' }}>
              <button 
                onClick={requestOtp}
                disabled={authLoading}
                style={{ width: '100%', padding: '14px', background: '#2563EB', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 14, cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}
              >
                {authLoading ? 'Mengirim...' : 'Request OTP Login'}
              </button>
            </div>
          ) : (
            <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#E2E8F0' }}>
                  Masukkan kode OTP yang dikirim ke <span style={{ color: '#34D399' }}>{maskedTarget}</span>
                </label>
                <input 
                  type="text" 
                  autoFocus
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\\D/g, ''))}
                  placeholder="000000"
                  style={{ width: '100%', padding: '14px', background: '#0D0F14', border: '1px solid rgba(255,255,255,0.1)', color: '#34D399', borderRadius: 8, fontSize: 24, letterSpacing: 8, textAlign: 'center', outline: 'none', fontWeight: 800 }}
                />
              </div>
              <button 
                type="submit"
                disabled={authLoading || otpCode.length !== 6}
                style={{ width: '100%', padding: '14px', background: '#059669', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 14, cursor: (authLoading || otpCode.length !== 6) ? 'not-allowed' : 'pointer', opacity: (authLoading || otpCode.length !== 6) ? 0.7 : 1 }}
              >
                {authLoading ? 'Verifikasi...' : 'Verifikasi OTP'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0F14', color: '#E2E8F0', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ height: 64, background: '#12151D', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/dashboard')} style={{ width: 38, height: 38, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', color: '#94A3B8', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.3px' }}>CRM Intelligence & Prospects</h1>
            <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>Sidoarjo · Surabaya · Gresik · Pasuruan</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setScraperModal(true)} style={{ padding: '6px 16px', background: scraperStatus.isRunning ? '#059669' : '#1D4ED8', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
             {scraperStatus.isRunning ? '🟢 Scraper Running' : '🤖 Jalankan Scraper'}
          </button>
          <button onClick={handleExport} style={{ padding: '6px 16px', background: '#475569', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>📥 Export CSV</button>
          <button onClick={fetchData} style={{ padding: '6px 16px', background: '#991B1B', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>↻ Refresh</button>
        </div>
      </header>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: '24px 32px 0' }}>
        {[
          { label: 'Total Prospek', value: data.stats.total || 0, color: '#F1F5F9' },
          { label: 'Punya Nomor WA', value: data.stats.total_with_phone || 0, color: '#34D399' },
          { label: 'Sebaran Kabupaten', value: data.stats.total_kabupaten || 0, color: '#FBBF24' },
          { label: 'Skor Tertinggi', value: (data.stats.max_score || 0) + ' Pts', color: '#F87171' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#12151D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 24px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, padding: '20px 32px 0', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Filter:</span>
        
        {/* Kabupaten */}
        <select value={filters.kabupaten} onChange={e => setFilters(f => ({ ...f, kabupaten: e.target.value, kecamatan: 'Semua' }))}
          style={{ background: '#12151D', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
          {KABUPATEN_FOCUS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        {/* Kecamatan */}
        <select value={filters.kecamatan} onChange={e => setFilters(f => ({ ...f, kecamatan: e.target.value }))}
          style={{ background: '#12151D', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
          <option value="Semua">Semua Kecamatan</option>
          {kecOptions.map((k, i) => <option key={i} value={k}>{k}</option>)}
        </select>

        {/* Kategori */}
        <select value={filters.kategori} onChange={e => setFilters(f => ({ ...f, kategori: e.target.value }))}
          style={{ background: '#12151D', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
          <option value="Semua">Semua Kategori</option>
          {KATEGORI_LIST.map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        {/* Status */}
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ background: '#12151D', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
          <option value="Semua">Semua Status</option>
          {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Kabupaten quick chips */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {['Kab. Sidoarjo', 'Kota Surabaya', 'Kab. Gresik', 'Kab. Pasuruan'].map(k => (
            <button key={k} onClick={() => setFilters(f => ({ ...f, kabupaten: f.kabupaten === k ? 'Semua' : k, kecamatan: 'Semua' }))}
              style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: filters.kabupaten === k ? '#991B1B' : 'rgba(255,255,255,0.05)',
                color: filters.kabupaten === k ? 'white' : '#64748B' }}>
              {k.replace('Kab. ','').replace('Kota ','')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <main style={{ flex: 1, padding: '16px 32px 32px', overflow: 'hidden' }}>
        <div style={{ background: '#12151D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
          {loading ? (
            <div style={{ padding: 80, textAlign: 'center', color: '#475569', fontSize: 13 }}>⏳ Memuat data prospek...</div>
          ) : data.leads.length === 0 ? (
            <div style={{ padding: 80, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
              <p style={{ color: '#475569', margin: 0 }}>Belum ada data untuk filter ini</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Nama Prospek', 'Kategori', 'Kabupaten / Kecamatan', 'Score', 'Status', 'Kontak', 'Aksi'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.leads.map((lead) => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      
                      {/* Nama */}
                      <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                        <p onClick={() => setDetailLead(lead)} style={{ margin: 0, fontWeight: 700, color: '#60A5FA', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', textDecoration: 'underline' }}>{lead.nama_lead}</p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                           {lead.bintang_google && <span style={{ color: '#F59E0B', fontSize: 10 }}>★ {lead.bintang_google}</span>}
                           {lead.jumlah_review ? <span style={{ color: '#94A3B8', fontSize: 10 }}>({lead.jumlah_review} ulasan)</span> : null}
                        </div>
                      </td>

                      {/* Kategori */}
                      <td style={{ padding: '12px 16px' }}>
                        {editRow?.id === lead.id ? (
                          <select value={editRow.kategori || 'Umum'} onChange={e => setEditRow(r => r ? { ...r, kategori: e.target.value } : r)}
                            style={{ background: '#0D0F14', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', borderRadius: 6, padding: '4px 8px', fontSize: 11, width: 160 }}>
                            {KATEGORI_LIST.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        ) : (
                          <span style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>
                            {lead.kategori || 'Umum'}
                          </span>
                        )}
                      </td>

                      {/* Kabupaten / Kecamatan */}
                      <td style={{ padding: '12px 16px' }}>
                        {editRow?.id === lead.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <select value={editRow.kabupaten || ''} onChange={e => setEditRow(r => r ? { ...r, kabupaten: e.target.value, kecamatan: '' } : r)}
                              style={{ background: '#0D0F14', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', borderRadius: 6, padding: '4px 8px', fontSize: 11 }}>
                              <option value="">-- Kabupaten --</option>
                              {Object.keys(KABUPATEN_MAP).map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <select value={editRow.kecamatan || ''} onChange={e => setEditRow(r => r ? { ...r, kecamatan: e.target.value } : r)}
                              style={{ background: '#0D0F14', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', borderRadius: 6, padding: '4px 8px', fontSize: 11 }}>
                              <option value="">-- Kecamatan --</option>
                              {(editRow.kabupaten ? KABUPATEN_MAP[editRow.kabupaten] || [] : []).map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>{lead.kabupaten || '—'}</span>
                            <span style={{ fontSize: 10, color: '#475569' }}>{lead.kecamatan || 'Unknown'}</span>
                          </div>
                        )}
                      </td>

                      {/* Score */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99 }}>
                            <div style={{ width: `${Math.min(100, lead.lead_score)}%`, height: '100%', background: scoreColor(lead.lead_score), borderRadius: 99 }}></div>
                          </div>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#E2E8F0' }}>{lead.lead_score}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        {editRow?.id === lead.id ? (
                          <select value={editRow.status_crm || 'Cold'} onChange={e => setEditRow(r => r ? { ...r, status_crm: e.target.value } : r)}
                            style={{ background: '#0D0F14', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', borderRadius: 6, padding: '4px 8px', fontSize: 11 }}>
                            {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={statusColor(lead.status_crm)} style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, display: 'inline-block' }}>
                            {lead.status_crm}
                          </span>
                        )}
                      </td>

                      {/* Kontak */}
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>
                        {editRow?.id === lead.id ? (
                          <input value={editRow.nomor_wa || ''} onChange={e => setEditRow(r => r ? { ...r, nomor_wa: e.target.value } : r)} placeholder="08xxxxxxxxxx"
                            style={{ background: '#0D0F14', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', borderRadius: 6, padding: '4px 8px', fontSize: 11, width: 120 }} />
                        ) : (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                            {lead.nomor_wa ? (
                              <a href={`https://wa.me/${lead.nomor_wa.replace(/\D/g,'')}`} target="_blank" style={{ color: '#34D399', fontSize: 11, textDecoration: 'none' }}>📱 {lead.nomor_wa}</a>
                            ) : <span style={{ color: '#374151', fontSize: 10 }}>No HP</span>}
                            {lead.website && <a href={lead.website} target="_blank" style={{ color: '#60A5FA', fontSize: 11 }}>🌐</a>}
                            {lead.koordinat_maps && <a href={`https://www.google.com/maps?q=${lead.koordinat_maps}`} target="_blank" style={{ color: '#F87171', fontSize: 11 }}>📍</a>}
                          </div>
                        )}
                      </td>

                      {/* Aksi */}
                      <td style={{ padding: '12px 16px' }}>
                        {editRow?.id === lead.id ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={saveEdit} disabled={saving === lead.id}
                              style={{ padding: '5px 12px', background: '#991B1B', border: 'none', borderRadius: 6, color: 'white', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>
                              {saving === lead.id ? '...' : '✓ Simpan'}
                            </button>
                            <button onClick={() => setEditRow(null)}
                              style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: '#94A3B8', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setEditRow({ id: lead.id, kecamatan: lead.kecamatan, kabupaten: lead.kabupaten, kategori: lead.kategori || 'Umum', status_crm: lead.status_crm, nomor_wa: lead.nomor_wa })}
                            style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#94A3B8', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>
                            ✏️ Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Detail */}
      {detailLead && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#12151D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: 600, maxWidth: '90%', padding: 32, position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <button onClick={() => setDetailLead(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 24, cursor: 'pointer' }}>×</button>
            <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#F1F5F9' }}>{detailLead.nama_lead}</h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#60A5FA', fontWeight: 600 }}>{detailLead.kategori || 'Kategori Umum'}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12 }}>
                <span style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Alamat Lengkap</span>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#E2E8F0', lineHeight: 1.5 }}>
                  {detailLead.alamat_lengkap || 'Tidak ada data alamat'}
                  <br />
                  <span style={{ color: '#F59E0B', fontWeight: 600 }}>{detailLead.kecamatan || 'Unknown'}, {detailLead.kabupaten || 'Unknown'}</span>
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12 }}>
                  <span style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Kontak Utama</span>
                  <div style={{ margin: '4px 0 0', fontSize: 14 }}>
                    {detailLead.nomor_wa ? <a href={`https://wa.me/${detailLead.nomor_wa.replace(/\\D/g,'')}`} target="_blank" style={{ color: '#34D399', textDecoration: 'none', fontWeight: 700 }}>WhatsApp: {detailLead.nomor_wa}</a> : <span style={{ color: '#94A3B8' }}>Tidak ada nomor</span>}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12 }}>
                  <span style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Website & Maps</span>
                  <div style={{ margin: '4px 0 0', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {detailLead.website ? <a href={detailLead.website} target="_blank" style={{ color: '#60A5FA', textDecoration: 'none' }}>Kunjungi Website ↗</a> : <span style={{ color: '#94A3B8' }}>Tidak ada website</span>}
                    {detailLead.koordinat_maps ? <a href={`https://www.google.com/maps?q=${detailLead.koordinat_maps}`} target="_blank" style={{ color: '#F87171', textDecoration: 'none' }}>Buka di Maps 📍</a> : null}
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Kualitas / Google Rating</span>
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: '#E2E8F0' }}>
                    <span style={{ color: '#F59E0B', fontWeight: 700 }}>{detailLead.bintang_google ? `★ ${detailLead.bintang_google}` : 'Tanpa Bintang'}</span> 
                    <span style={{ color: '#94A3B8', marginLeft: 8 }}>({detailLead.jumlah_review || 0} reviews)</span>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Lead Score</span>
                  <div style={{ fontSize: 24, fontWeight: 900, color: scoreColor(detailLead.lead_score) }}>{detailLead.lead_score} Pts</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal Scraper Control */}
      {scraperModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#12151D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: 600, maxWidth: '90%', padding: 32, position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <button onClick={() => setScraperModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 24, cursor: 'pointer' }}>×</button>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#F1F5F9' }}>🤖 Auto-Scraper Control</h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#94A3B8' }}>Jalankan pencarian otomatis ke Google Maps. Anda bisa menambahkan atau mengganti keyword dan kategori target secara custom di bawah ini.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#E2E8F0' }}>Target Keywords (Format JSON)</label>
                <textarea 
                  value={customKwText} 
                  onChange={e => setCustomKwText(e.target.value)}
                  style={{ width: '100%', height: 120, background: '#0D0F14', border: '1px solid rgba(255,255,255,0.1)', color: '#34D399', borderRadius: 8, padding: 12, fontSize: 12, fontFamily: 'monospace', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {scraperStatus.isRunning ? (
                <div style={{ background: 'rgba(5, 150, 105, 0.1)', border: '1px solid #059669', padding: 16, borderRadius: 12 }}>
                  <p style={{ margin: '0 0 8px', color: '#34D399', fontWeight: 700, fontSize: 13 }}>🟢 Scraper Sedang Berjalan</p>
                  <pre style={{ margin: 0, padding: 12, background: '#0D0F14', color: '#94A3B8', fontSize: 10, borderRadius: 8, height: 100, overflowY: 'auto' }}>
                    {scraperStatus.logs || 'Memulai proses...'}
                  </pre>
                  <button onClick={() => handleScraper('stop')} style={{ marginTop: 12, width: '100%', padding: '10px', background: '#DC2626', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, cursor: 'pointer' }}>Hentikan Paksa Scraper</button>
                </div>
              ) : (
                <button onClick={() => handleScraper('start')} style={{ width: '100%', padding: '12px', background: '#2563EB', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                  Mulai Deep-Scraping 🚀
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
