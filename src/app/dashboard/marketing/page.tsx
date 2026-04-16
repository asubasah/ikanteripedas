'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MarketingDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ cold_leads: 0, sent_today: 0, interested: 0, rejected: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/debug/leads/marketing');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-charcoal text-text-light font-sans flex flex-col">
      <header className="h-16 bg-charcoal-800 border-b border-border-industrial flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="w-10 h-10 bg-charcoal-800 border border-border-industrial hover:border-maroon/50 rounded-lg flex items-center justify-center transition-all text-white/50 hover:text-white">
              ←
            </button>
            <h1 className="text-lg font-bold text-white tracking-tight">Marketing Blast Hub</h1>
          </div>
          <div>
            <span className="bg-amber/10 text-amber border border-amber/30 text-[10px] font-bold uppercase py-1 px-3 rounded-full">
              Safe Send Mode Active
            </span>
          </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Stat Cards */}
            <div className="bg-charcoal-800 p-6 rounded-2xl border border-border-industrial shadow-xl">
               <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Cold Leads Tersedia</p>
               <p className="text-4xl font-black text-white">{stats.cold_leads}</p>
            </div>
            <div className="bg-charcoal-800 p-6 rounded-2xl border border-border-industrial shadow-xl relative overflow-hidden">
               <div className="absolute inset-x-0 bottom-0 h-1 bg-maroon"></div>
               <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Dikirim Hari Ini</p>
               <p className="text-4xl font-black text-white">{stats.sent_today}</p>
               <p className="text-[10px] text-maroon-600 font-bold mt-2">Batas: 35/hari (Anti-Spam)</p>
            </div>
            <div className="bg-charcoal-800 p-6 rounded-2xl border border-border-industrial shadow-xl relative overflow-hidden">
               <div className="absolute inset-x-0 bottom-0 h-1 bg-green-500"></div>
               <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Respon Tertarik</p>
               <p className="text-4xl font-black text-green-400">{stats.interested}</p>
            </div>
            <div className="bg-charcoal-800 p-6 rounded-2xl border border-border-industrial shadow-xl relative overflow-hidden">
               <div className="absolute inset-x-0 bottom-0 h-1 bg-red-500"></div>
               <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Menolak / Dihapus</p>
               <p className="text-4xl font-black text-red-500">{stats.rejected}</p>
            </div>
         </div>

         <h2 className="text-lg font-bold text-white mb-6">Log Pengiriman Kampanye (Live)</h2>
         <div className="bg-charcoal-800 border border-border-industrial rounded-2xl overflow-hidden shadow-2xl">
            {loading ? (
                <div className="p-8 text-center text-white/40 animate-pulse font-mono text-sm">Menyelaraskan log...</div>
            ) : recentLogs.length === 0 ? (
                <div className="p-16 text-center text-white/20">
                    <p className="text-3xl mb-4">📭</p>
                    <p className="text-sm font-bold">Belum ada aktivitas blast hari ini.</p>
                </div>
            ) : (
               <table className="w-full text-left text-sm">
                 <thead className="bg-white/5 border-b border-border-industrial text-xs font-bold text-white/40 uppercase tracking-widest">
                   <tr>
                     <th className="px-6 py-4">Waktu Asli</th>
                     <th className="px-6 py-4">Tujuan</th>
                     <th className="px-6 py-4">Nomor Target</th>
                     <th className="px-6 py-4">Pesan AI</th>
                     <th className="px-6 py-4">Status Target</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                   {recentLogs.map((log: any, i: number) => (
                     <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                       <td className="px-6 py-4 font-mono text-xs text-white/60">
                           {new Date(log.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                       </td>
                       <td className="px-6 py-4 font-bold text-white">{log.nama_lead}</td>
                       <td className="px-6 py-4 font-mono text-xs text-amber">{log.nomor_wa}</td>
                       <td className="px-6 py-4">
                           <div className="max-w-xs truncate text-[11px] text-white/50 bg-white/5 px-3 py-1.5 rounded">
                               {log.message_text}
                           </div>
                       </td>
                       <td className="px-6 py-4">
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border 
                              ${log.status_crm === 'Cold' ? 'bg-white/5 text-white/40 border-white/10' : 
                                log.status_crm === 'Interested' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 
                                'bg-red-500/10 text-red-500 border-red-500/30'}`}>
                                {log.status_crm}
                            </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            )}
         </div>
      </main>
    </div>
  );
}
