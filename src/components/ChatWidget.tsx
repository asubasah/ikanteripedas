'use client';

import React, { useState, useEffect, useRef } from 'react';

type ChatStep = 'idle' | 'register' | 'chatting';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ChatStep>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Lead info
  const [nama, setNama] = useState('');
  const [hp, setHp] = useState('');
  const [perusahaan, setPerusahaan] = useState('');
  const [sessionId, setSessionId] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleOpen = () => {
    setIsOpen(true);
    if (step === 'idle') setStep('register');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !hp.trim()) return;

    // Normalize phone
    let phone = hp.trim().replace(/[^0-9]/g, '');
    if (phone.startsWith('62')) phone = '0' + phone.slice(2);
    if (!phone.startsWith('0')) phone = '0' + phone;
    setHp(phone);

    const sid = `web-${phone}-${Date.now()}`;
    setSessionId(sid);
    setStep('chatting');
    setMessages([{
      text: `Halo ${nama.trim()}! 👋 Ada yang bisa kami bantu seputar pengerjaan metal? Silakan tanyakan apa saja.`,
      sender: 'bot'
    }]);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          userName: nama,
          phoneNumber: hp,
          companyName: perusahaan || undefined,
        }),
      });

      const data = await response.json();
      if (data.reply) {
        setMessages(prev => [...prev, { text: data.reply, sender: 'bot' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { text: "Mohon maaf, ada gangguan koneksi. Silakan coba lagi.", sender: 'bot' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (isLoading) return;
    
    // 📂 Large File Policy: Guidance to Email if > 20MB
    if (file.size > 20 * 1024 * 1024) {
      alert(`Waduh, file "${file.name}" ukurannya terlalu besar (>20MB) untuk Web Chat.\n\nMohon Bapak/Ibu kirimkan file tersebut via email ke: order@mkmetalindo.co.id agar tim Engineering kami bisa mengeceknya dengan lebih teliti. Terima kasih! 🙏`);
      return;
    }

    setIsLoading(true);
    setMessages(prev => [...prev, { text: `[Mengirim file: ${file.name}...]`, sender: 'user' }]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);
    formData.append('userName', nama);
    formData.append('phoneNumber', hp);

    try {
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { text: `File berhasil terkirim! Tim kami akan segera menghubungi untuk proses estimasi. Mohon konfirmasi apakah nomor WhatsApp Anda (${hp}) sudah benar? Jika ingin ganti, silakan ketik nomor baru Anda di bawah.`, sender: 'bot' }]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setMessages(prev => [...prev, { text: "Gagal mengirim file. Silakan coba lagi atau kirim via WhatsApp.", sender: 'bot' }]);
    } finally {
      setIsLoading(false);
      // Reset input file
      const input = document.getElementById('chat-file-upload') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1000]" style={{ fontFamily: 'var(--font-manrope)' }}>
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[360px] md:w-[400px] h-[520px] bg-charcoal-800 border border-border-industrial rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ animation: 'slideUp .3s ease-out' }}>
          {/* Header */}
          <div className="p-4 flex justify-between items-center bg-industrial-gradient border-b border-border-industrial">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-maroon flex items-center justify-center shadow-lg">
                <span className="text-lg">⚙️</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-none">MK Metal Indo</h3>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em]">
                  {step === 'register' ? 'Registrasi' : 'Tim Kami Siap Membantu'}
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition-colors p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Registration Form */}
          {step === 'register' && (
            <div className="flex-1 flex flex-col justify-center px-6">
              <div className="text-center mb-6">
                <p className="text-white font-bold text-lg mb-1">Selamat Datang! 👋</p>
                <p className="text-text-muted text-xs">Isi data singkat supaya kami bisa bantu lebih baik.</p>
              </div>
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">Nama Lengkap <span className="text-maroon-600">*</span></label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Masukkan nama Anda"
                    className="w-full bg-charcoal border border-border-industrial text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-maroon transition-all placeholder:text-white/20"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">No. HP / WhatsApp <span className="text-maroon-600">*</span></label>
                  <input
                    type="tel"
                    value={hp}
                    onChange={(e) => setHp(e.target.value)}
                    placeholder="0811 xxxx xxxx"
                    className="w-full bg-charcoal border border-border-industrial text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-maroon transition-all placeholder:text-white/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">Perusahaan <span className="text-white/20">(opsional)</span></label>
                  <input
                    type="text"
                    value={perusahaan}
                    onChange={(e) => setPerusahaan(e.target.value)}
                    placeholder="Nama perusahaan / perorangan"
                    className="w-full bg-charcoal border border-border-industrial text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-maroon transition-all placeholder:text-white/20"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-maroon text-white font-bold text-sm py-3 rounded-lg hover:bg-maroon-600 transition-all active:scale-[0.98] shadow-lg shadow-maroon/20 mt-1"
                >
                  Mulai Chat →
                </button>
              </form>
              <p className="text-center text-[10px] text-white/20 mt-3">Data Anda aman & hanya untuk keperluan follow-up.</p>
            </div>
          )}

          {/* Chat View */}
          {step === 'chatting' && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-charcoal/50">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-maroon text-white rounded-br-sm'
                        : 'bg-charcoal-800 border border-border-industrial text-text-light rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-charcoal-800 border border-border-industrial px-4 py-2 rounded-2xl text-text-muted text-xs flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 bg-charcoal-800 border-t border-border-industrial">
                <div className="relative flex items-center gap-2">
                  {/* File Upload Hidden Input */}
                  <input
                    type="file"
                    id="chat-file-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  
                  {/* Attach Button */}
                  <button
                    onClick={() => document.getElementById('chat-file-upload')?.click()}
                    disabled={isLoading}
                    className="shrink-0 w-10 h-10 bg-charcoal border border-border-industrial rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:border-maroon transition-all disabled:opacity-30"
                    title="Kirim Gambar / File (DXF, PDF, dll)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>

                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Tulis pesan..."
                    className="flex-1 bg-charcoal border border-border-industrial text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-maroon transition-all placeholder:text-white/20"
                    autoFocus
                  />
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !inputValue.trim()}
                    className="shrink-0 w-10 h-10 bg-maroon rounded-xl flex items-center justify-center text-white hover:bg-maroon-600 transition-all disabled:opacity-30 active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={handleOpen}
        className="w-16 h-16 bg-maroon rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(123,29,63,0.4)] text-white hover:bg-maroon-600 transition-all transform hover:scale-105 active:scale-95 ring-4 ring-white/5"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber rounded-full border-2 border-charcoal" />
          </>
        )}
      </button>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
