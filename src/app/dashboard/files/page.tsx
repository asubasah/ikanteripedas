'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FileData {
  name: string;
  size: number;
  timestamp: string;
  url: string;
}

export default function FileManagementPage() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDelete = async (filename: string) => {
    if (!confirm(`Hapus file "${filename}" secara permanen? File tidak dapat dikembalikan.`)) return;

    try {
      setDeletingFile(filename);
      const res = await fetch(`/api/files?name=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setFiles(files.filter(f => f.name !== filename));
      } else {
        alert(data.error || 'Gagal menghapus file.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Terjadi kesalahan saat menghapus file.');
    } finally {
      setDeletingFile(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-charcoal text-text-light" style={{ fontFamily: 'var(--font-manrope)' }}>
      {/* Top Bar */}
      <header className="h-14 bg-charcoal-800 border-b border-border-industrial flex items-center justify-between px-6 shrink-0 relative z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-amber transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
              <span className="text-amber">📁 File</span> Manager
            </h1>
          </div>
        </div>
        <div className="text-xs text-text-muted">
          Total: <span className="font-bold text-white">{files.length}</span> File
        </div>
      </header>

      <main className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8 relative p-6 rounded-2xl bg-industrial-gradient border border-border-industrial overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber/5 rounded-full blur-[80px]"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-2 tracking-tight">Manajemen File Media</h2>
            <p className="text-text-muted text-sm max-w-2xl">
              Daftar seluruh file media, DXF, PDF, dan gambar yang diunggah oleh customer lewat Web Chat maupun WhatsApp. Hapus file yang tidak lagi diperlukan untuk menghemat penyimpanan server (VPS).
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="bg-charcoal-800 border border-border-industrial rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-2xl border border-white/10 mx-auto flex items-center justify-center mb-4">
              <span className="text-3xl">📭</span>
            </div>
            <h3 className="text-lg font-bold mb-1">Belum Ada File</h3>
            <p className="text-text-muted text-sm">File media yang diterima akan muncul di sini.</p>
          </div>
        ) : (
          <div className="bg-charcoal-800 border border-border-industrial rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-xs text-text-muted uppercase tracking-widest">
                    <th className="p-4 font-bold border-b border-border-industrial">Nama File</th>
                    <th className="p-4 font-bold border-b border-border-industrial w-32">Ukuran</th>
                    <th className="p-4 font-bold border-b border-border-industrial w-48">Tanggal Upload</th>
                    <th className="p-4 font-bold border-b border-border-industrial w-32 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.name} className="border-b border-border-industrial/50 hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber/10 text-amber flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{file.name}</p>
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline">
                              {file.url}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-mono text-white/80">{formatSize(file.size)}</td>
                      <td className="p-4 text-xs text-text-muted">{new Date(file.timestamp).toLocaleString('id-ID')}</td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <a 
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white/5 border border-white/10 hover:bg-amber hover:text-black rounded-lg transition-all"
                          title="Buka/Download"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                        <button
                          onClick={() => handleDelete(file.name)}
                          disabled={deletingFile === file.name}
                          className="p-2 bg-white/5 border border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 rounded-lg transition-all disabled:opacity-50"
                          title="Hapus File"
                        >
                          {deletingFile === file.name ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white/5 p-4 border-t border-border-industrial flex justify-between items-center text-xs text-text-muted">
              <span>Menampilkan {files.length} file</span>
              <button onClick={fetchFiles} className="hover:text-amber transition-colors opacity-60 hover:opacity-100 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
