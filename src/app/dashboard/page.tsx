'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface Lead {
  id: number;
  nama_lead: string;
  nomor_wa: string;
  status_crm: string;
  last_chat: string;
  last_message: string;
  total_messages: number;
}

interface ChatMessage {
  id: number;
  sender_name: string;
  message_text: string;
  direction: 'incoming' | 'outgoing';
  timestamp: string;
  is_ai_response: boolean;
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [salesContactNumber, setSalesContactNumber] = useState('08961722712');
  const [savingSettings, setSavingSettings] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [otpCode, setOtpCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [maskedTarget, setMaskedTarget] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.sales_contact_number) {
        setSalesContactNumber(data.sales_contact_number);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesContactNumber }),
      });
      setIsSettingsOpen(false);
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/dashboard/chats');
      if (res.status === 401) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      setIsAuthenticated(true);
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (isAuthenticated !== false) setLoading(false);
    }
  };

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
      fetchLeads();
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchMessages = async (leadId: number) => {
    setChatLoading(true);
    try {
      const res = await fetch(`/api/dashboard/chats?leadId=${leadId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    fetchMessages(lead.id);
  };

  useEffect(() => {
    fetchLeads();
    fetchSettings();
    const interval = setInterval(fetchLeads, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh messages for selected lead
  useEffect(() => {
    if (!selectedLead) return;
    const interval = setInterval(() => fetchMessages(selectedLead.id), 4000);
    return () => clearInterval(interval);
  }, [selectedLead]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredLeads = leads.filter(l =>
    l.nama_lead?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.nomor_wa?.includes(searchQuery)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FollowUp': return 'bg-amber/20 text-amber border-amber/30';
      case 'Interested': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Deal': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-white/5 text-text-muted border-white/10';
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  };

  const formatPhoneDisplay = (num: string) => {
    if (!num) return 'Unknown';
    let formatted = num.split('@')[0]; // Strip @lid or @c.us
    if (formatted.startsWith('62')) {
      formatted = '0' + formatted.substring(2);
    } else if (formatted.startsWith('+62')) {
      formatted = '0' + formatted.substring(3);
    } else if (!formatted.startsWith('08')) {
      formatted = '08' + formatted;
    }
    return formatted;
  };

  if (isAuthenticated === false) {
    return (
      <div className="h-screen bg-charcoal flex flex-col items-center justify-center p-6 text-text-light" style={{ fontFamily: 'var(--font-manrope)' }}>
        <div className="w-full max-w-sm bg-charcoal-800 border border-border-industrial p-8 rounded-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-maroon to-transparent opacity-50"></div>
          
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-white tracking-tight mb-2">MK Metalindo</h1>
            <p className="text-xs text-text-muted">Secure Console Access</p>
          </div>

          {authError && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded text-center">
              {authError}
            </div>
          )}

          {otpStep === 'request' ? (
            <div className="flex flex-col gap-4 text-center">
              <p className="text-xs text-text-muted mb-2">Sistem akan mengirimkan 6-digit kode OTP ke nomor WhatsApp Admin yang terdaftar.</p>
              <button 
                onClick={requestOtp}
                disabled={authLoading}
                className="w-full bg-maroon text-white font-bold py-3 text-sm rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 flex justify-center items-center"
              >
                {authLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Kirim Kode OTP"}
              </button>
            </div>
          ) : (
            <form onSubmit={verifyOtp} className="flex flex-col gap-4 text-center">
              <p className="text-xs text-text-muted mb-2">Masukkan 6-digit kode yang dikirim ke <br/><strong className="text-amber">{maskedTarget}</strong></p>
              <input 
                type="text" 
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="• • • • • •"
                className="w-full bg-charcoal border border-border-industrial text-white text-center text-2xl tracking-[0.5em] rounded-lg focus:outline-none focus:border-maroon py-3"
                autoFocus
                required
              />
              <button 
                type="submit"
                disabled={authLoading || otpCode.length !== 6}
                className="w-full bg-maroon text-white font-bold py-3 text-sm rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 flex justify-center items-center mt-2"
              >
                {authLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Verifikasi & Masuk"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // If initial load
  if (isAuthenticated === null && loading) {
    return <div className="h-screen bg-charcoal flex items-center justify-center text-text-muted text-sm animate-pulse">Authenticating Secure Console...</div>;
  }

  return (
    <>
      <div className="h-screen bg-charcoal text-text-light flex flex-col" style={{ fontFamily: 'var(--font-manrope)' }}>
        {/* Top Bar */}
        <header className="h-14 bg-charcoal-800 border-b border-border-industrial flex items-center justify-between px-6 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-8 h-8 bg-charcoal border border-border-industrial hover:bg-white/5 hover:border-maroon rounded-lg flex items-center justify-center text-sm transition-all text-white/50 hover:text-white"
              title="Pengaturan Sistem"
            >
              ⚙️
            </button>
            <Link 
              href="/dashboard/files"
              className="w-8 h-8 bg-charcoal border border-border-industrial hover:bg-amber/10 hover:border-amber rounded-lg flex items-center justify-center transition-all text-white/50 hover:text-amber"
              title="Manajemen File Media"
            >
              📂
            </Link>
            <Link 
              href="/dashboard/blog"
              className="w-8 h-8 bg-charcoal border border-border-industrial hover:bg-green-500/10 hover:border-green-500/50 rounded-lg flex items-center justify-center transition-all text-white/50 hover:text-green-400"
              title="AI SEO Blog Manager"
            >
              📝
            </Link>
            <h1 className="text-sm font-bold text-white tracking-tight">MK Metalindo — Chat Console</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              {leads.length} Lead{leads.length !== 1 ? 's' : ''}
            </span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Live</span>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — Lead List */}
          <aside className="w-[340px] bg-charcoal-800 border-r border-border-industrial flex flex-col shrink-0">
            {/* Search */}
            <div className="p-3 border-b border-border-industrial">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama / HP..."
                className="w-full bg-charcoal border border-border-industrial text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-maroon transition-all placeholder:text-white/20"
              />
            </div>

            {/* Lead Items */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-text-muted text-xs animate-pulse">Loading leads...</div>
              ) : filteredLeads.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-xs">Belum ada percakapan.</div>
              ) : (
                filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => handleSelectLead(lead)}
                    className={`w-full text-left p-4 border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors ${
                      selectedLead?.id === lead.id ? 'bg-maroon/10 border-l-2 border-l-maroon' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-charcoal border border-border-industrial flex items-center justify-center text-sm font-bold text-maroon-600 shrink-0">
                          {lead.nama_lead?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{lead.nama_lead || 'Unknown'}</p>
                          <p className="text-[10px] text-text-muted font-mono truncate">{formatPhoneDisplay(lead.nomor_wa)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-text-muted">{lead.last_chat ? formatTime(lead.last_chat) : ''}</p>
                        {lead.total_messages > 0 && (
                          <span className="inline-block mt-1 bg-maroon text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                            {lead.total_messages}
                          </span>
                        )}
                      </div>
                    </div>
                    {lead.last_message && (
                      <p className="text-xs text-text-muted mt-2 truncate pl-[52px]">{lead.last_message}</p>
                    )}
                    {lead.status_crm && lead.status_crm !== 'Cold' && (
                      <span className={`inline-block mt-1.5 ml-[52px] text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${getStatusColor(lead.status_crm)}`}>
                        {lead.status_crm}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Chat Area */}
          <main className="flex-1 flex flex-col bg-charcoal min-w-0">
            {!selectedLead ? (
              // Empty State
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="w-20 h-20 bg-charcoal-800 border border-border-industrial rounded-2xl flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <p className="text-white/20 text-sm font-bold mb-1">Pilih percakapan</p>
                <p className="text-white/10 text-xs">Klik nama customer di sidebar untuk melihat riwayat chat.</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="h-16 bg-charcoal-800 border-b border-border-industrial flex items-center justify-between px-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-maroon/20 border border-maroon/30 flex items-center justify-center text-sm font-bold text-maroon-600">
                      {selectedLead.nama_lead?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{selectedLead.nama_lead}</p>
                      <p className="text-[10px] text-text-muted font-mono">{formatPhoneDisplay(selectedLead.nomor_wa)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedLead.status_crm && (
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${getStatusColor(selectedLead.status_crm)}`}>
                        {selectedLead.status_crm}
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3" style={{ background: 'radial-gradient(ellipse at top, rgba(123,29,63,0.05), transparent 70%)' }}>
                  {chatLoading ? (
                    <div className="text-center py-20 text-text-muted text-xs animate-pulse">Loading conversation...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-20 text-text-muted text-xs">Belum ada pesan.</div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.direction === 'incoming' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[65%] group`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            msg.direction === 'incoming'
                              ? 'bg-charcoal-800 border border-border-industrial text-text-light rounded-bl-sm'
                              : msg.is_ai_response
                                ? 'bg-maroon/20 border border-maroon/30 text-text-light rounded-br-sm'
                                : 'bg-white/5 border border-white/10 text-text-light rounded-br-sm'
                          }`}>
                            {/* Sender label */}
                            <p className={`text-[10px] font-bold mb-1 ${
                              msg.direction === 'incoming' ? 'text-amber' : msg.is_ai_response ? 'text-maroon-600' : 'text-text-muted'
                            }`}>
                              {msg.direction === 'incoming' ? msg.sender_name : msg.is_ai_response ? '🤖 AI Agent' : 'System'}
                            </p>
                            <div className="whitespace-pre-wrap">
                              {msg.message_text.includes('http') ? (
                                msg.message_text.split(/(https?:\/\/[^\s]+)/).map((part, i) => 
                                  part.match(/^https?:\/\//) 
                                    ? (
                                      <div key={i} className="my-2 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-3 group/file transition-all hover:bg-white/10">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                          <div className="w-10 h-10 bg-amber/20 rounded-lg flex items-center justify-center text-amber-500 shrink-0">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                          </div>
                                          <div className="overflow-hidden">
                                            <p className="text-[11px] font-bold text-white/90 truncate">{part.split('/').pop()}</p>
                                            <p className="text-[9px] text-white/40 uppercase tracking-tighter">Uploaded File</p>
                                          </div>
                                        </div>
                                        <a 
                                          href={part} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="bg-amber hover:bg-amber-600 text-charcoal px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-xl flex items-center gap-1.5 shrink-0"
                                        >
                                          <span>Open</span>
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                        </a>
                                      </div>
                                    )
                                    : part
                                )
                              ) : msg.message_text.includes('[File Uploaded:') ? (
                                <span className="text-amber-400 italic font-mono text-[11px]">📎 {msg.message_text}</span>
                              ) : (
                                msg.message_text
                              )}
                            </div>
                          </div>
                          <p className="text-[9px] text-white/20 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {new Date(msg.timestamp).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Bottom Info Bar */}
                <div className="h-12 bg-charcoal-800 border-t border-border-industrial flex items-center justify-center px-6">
                  <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                    Read-only monitoring · {messages.length} message{messages.length !== 1 ? 's' : ''} · Auto-refresh 4s
                  </p>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-charcoal-800 border border-border-industrial rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-border-industrial flex justify-between items-center">
              <h2 className="text-white font-bold text-lg">⚙️ Pengaturan Sistem</h2>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveSettings} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">
                    Nomor WhatsApp Sales Handoff
                  </label>
                  <p className="text-[10px] text-white/40 mb-3 leading-relaxed">
                    Nomor WhatsApp PIC (Misal: Luluk) yang akan menerima notifikasi penerusan file DXF/PDF/Gambar dari sistem otomatis, 
                    atau jika AI tidak bisa menjawab pertanyaan teknis mendalam.
                  </p>
                  <input
                    type="text"
                    required
                    value={salesContactNumber}
                    onChange={(e) => setSalesContactNumber(e.target.value)}
                    placeholder="Contoh: 08961722712"
                    className="w-full bg-charcoal border border-border-industrial rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-maroon transition-colors"
                  />
                  <p className="text-[10px] text-amber mt-2">
                    * Format nomor diawali 08... (Bukan 62).
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold text-white/50 hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2.5 bg-maroon text-white font-bold text-sm rounded-lg hover:bg-maroon-600 transition-colors disabled:opacity-50"
                >
                  {savingSettings ? 'Menyimpan...' : 'Simpan Nomor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
