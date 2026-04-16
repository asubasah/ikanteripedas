'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const KATEGORI_LIST = ['Umum', 'Bengkel Fabrikasi', 'Kontraktor', 'Industri Manufaktur', 'Konstruksi', 'Otomotif', 'Lain-lain'];
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
  const [filters, setFilters] = useState({ kabupaten: 'Semua', kecamatan: 'Semua', kategori: 'Semua', status: 'Semua' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.kabupaten !== 'Semua') qs.set('kabupaten', filters.kabupaten);
      if (filters.kecamatan !== 'Semua') qs.set('kecamatan', filters.kecamatan);
      if (filters.kategori !== 'Semua') qs.set('kategori', filters.kategori);
      if (filters.status !== 'Semua') qs.set('status', filters.status);
      const res = await fetch(`/api/debug/leads/crm?${qs}`);
      if (res.ok) setData(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        <button onClick={fetchData} style={{ padding: '6px 16px', background: '#991B1B', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>↻ Refresh</button>
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
                        <p style={{ margin: 0, fontWeight: 700, color: '#F1F5F9', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.nama_lead}</p>
                        {lead.bintang_google && <span style={{ color: '#F59E0B', fontSize: 10 }}>★ {lead.bintang_google}</span>}
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
    </div>
  );
}
