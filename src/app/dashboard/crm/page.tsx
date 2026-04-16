'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CRMDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>({ stats: {}, regions: [], leads: [] });
  const [loading, setLoading] = useState(true);
  const [selectedKec, setSelectedKec] = useState('Semua');

  const fetchData = async (kecamatan: string) => {
    setLoading(true);
    try {
      const qs = kecamatan !== 'Semua' ? `?wilayah=${encodeURIComponent(kecamatan)}` : '';
      const res = await fetch(`/api/debug/leads/crm${qs}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedKec);
  }, [selectedKec]);

  return (
    <div className="min-h-screen bg-charcoal text-text-light font-sans flex flex-col">
      <header className="h-16 bg-charcoal-800 border-b border-border-industrial flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="w-10 h-10 bg-charcoal-800 border border-border-industrial hover:border-maroon/50 rounded-lg flex items-center justify-center transition-all text-white/50 hover:text-white">
              ←
            </button>
            <h1 className="text-lg font-bold text-white tracking-tight">CRM Intelligence & Scoring</h1>
          </div>
          <div className="flex gap-4 items-center">
             <span className="text-sm font-bold text-white/50">Filter Kecamatan:</span>
             <select 
               value={selectedKec}
               onChange={(e) => setSelectedKec(e.target.value)}
               className="bg-charcoal-900 border border-border-industrial text-white text-sm rounded-lg block p-2 outline-none focus:border-maroon"
             >
               <option value="Semua">Tampilkan Semua</option>
               {data.regions?.map((r: string, i: number) => (
                 <option key={i} value={r}>{r}</option>
               ))}
             </select>
          </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-charcoal-800 p-6 rounded-2xl border border-border-industrial shadow-xl">
               <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Total Big Data Leads</p>
               <p className="text-4xl font-black text-white">{data.stats?.total || 0}</p>
            </div>
            <div className="bg-charcoal-800 p-6 rounded-2xl border border-border-industrial shadow-xl">
               <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Sebaran Kecamatan</p>
               <p className="text-4xl font-black text-amber">{data.stats?.domains || 0}</p>
            </div>
            <div className="bg-charcoal-800 p-6 rounded-2xl border border-border-industrial shadow-xl relative overflow-hidden">
               <div className="absolute inset-x-0 bottom-0 h-1 bg-maroon"></div>
               <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Skor Tertinggi Top Tier</p>
               <p className="text-4xl font-black text-maroon-500">{data.stats?.top_score || 0} Pts</p>
            </div>
         </div>

         <div className="bg-charcoal-800 border border-border-industrial rounded-2xl overflow-hidden shadow-2xl">
            {loading ? (
                <div className="p-16 text-center text-white/40 animate-pulse font-mono text-sm">Menarik data analitik CRM...</div>
            ) : data.leads?.length === 0 ? (
                <div className="p-16 text-center text-white/20">
                    <p className="text-3xl mb-4">📭</p>
                    <p className="text-sm font-bold">Belum ada data matang di kecamatan ini.</p>
                </div>
            ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                   <thead className="bg-white/5 border-b border-border-industrial text-xs font-bold text-white/40 uppercase tracking-widest">
                     <tr>
                       <th className="px-6 py-4">Nama Pelanggan</th>
                       <th className="px-6 py-4">Quality Score</th>
                       <th className="px-6 py-4">Kecamatan</th>
                       <th className="px-6 py-4">Bintang / Status</th>
                       <th className="px-6 py-4">Kontak Info</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {data.leads.map((lead: any, i: number) => (
                       <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                         <td className="px-6 py-4">
                             <p className="font-bold text-white">{lead.nama_lead}</p>
                             <p className="text-[10px] text-white/40 mt-1 truncate max-w-xs" title={lead.alamat_lengkap}>
                                 {lead.alamat_lengkap?.substring(0, 45) || 'Alamat tidak terekam'}...
                             </p>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                               <div className="w-full bg-charcoal-900 rounded-full h-2 max-w-[80px]">
                                 <div className={`h-2 rounded-full ${lead.lead_score >= 80 ? 'bg-maroon-500' : lead.lead_score >= 50 ? 'bg-amber' : 'bg-white/20'}`} style={{ width: `${Math.min(100, lead.lead_score)}%` }}></div>
                               </div>
                               <span className="font-mono text-xs font-bold text-white">{lead.lead_score}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                             <span className="bg-charcoal-900 border border-border-industrial px-3 py-1 rounded-full text-xs font-bold text-white/60">
                                 {lead.kecamatan || 'Unknown'}
                             </span>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                                {lead.bintang_google ? (
                                   <span className="text-amber font-bold text-xs flex items-center gap-1">★ {lead.bintang_google}</span>
                                ) : (
                                   <span className="text-white/20 text-xs">Tanpa Rating</span>
                                )}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${lead.status_crm === 'Cold' ? 'text-white/30' : lead.status_crm === 'Interested' ? 'text-green-500' : 'text-red-500'}`}>
                                   {lead.status_crm}
                                </span>
                            </div>
                         </td>
                         <td className="px-6 py-4 font-mono text-xs flex flex-row gap-2">
                             <a href={`https://wa.me/${lead.nomor_wa}`} target="_blank" className="text-green-400 hover:text-green-300 underline cursor-pointer">{lead.nomor_wa}</a>
                             {lead.website && (
                                <a href={lead.website} target="_blank" className="text-blue-400 hover:text-blue-300 ml-2" title="Kunjungi Website">🌐</a>
                             )}
                             {lead.koordinat_maps && (
                                <a href={`https://www.google.com/maps/search/?api=1&query=${lead.koordinat_maps}`} target="_blank" className="text-red-400 hover:text-red-300 ml-1" title="Lihat Maps">📍</a>
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
