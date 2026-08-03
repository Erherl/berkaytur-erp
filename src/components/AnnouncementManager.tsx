/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { 
  Bell, Send, Trash2, Plus, Volume2, Share2, 
  FileText, Users, ArrowUpRight, MessageSquare 
} from 'lucide-react';
import { UserRole } from '../types';

export default function AnnouncementManager() {
  const { announcements, addAnnouncement, deleteAnnouncement, addLog, currentUser } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole | 'all'>('all');
  const [channelNotification, setChannelNotification] = useState(true);
  const [channelWhatsApp, setChannelWhatsApp] = useState(false);
  const [channelPDF, setChannelPDF] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const channels: ('notification' | 'whatsapp' | 'pdf')[] = [];
    if (channelNotification) channels.push('notification');
    if (channelWhatsApp) channels.push('whatsapp');
    if (channelPDF) channels.push('pdf');

    addAnnouncement({
      title,
      content,
      targetRoles: [targetRole],
      authorName: currentUser?.name || 'Sistem Yöneticisi',
      channels
    });

    setTitle('');
    setContent('');
    setShowAdd(false);
  };

  // Generate WhatsApp dynamic click link with Turkish templates
  const getWhatsAppShareLink = (annTitle: string, annContent: string) => {
    const presetText = `📢 *BERKAYTUR DUYURU SİSTEMİ*\n\n*${annTitle}*\n\n${annContent}\n\n_Bu mesaj Berkaytur ERP Okul Servis Portalı tarafından otomatik iletilmiştir._`;
    return `https://web.whatsapp.com/send?text=${encodeURIComponent(presetText)}`;
  };

  const handlePrintPDF = (annTitle: string, annContent: string, author: string, date: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${annTitle}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { border-bottom: 3px double #cbd5e1; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
            .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; color: #2563eb; margin: 0; }
            .sub { font-size: 10px; font-weight: bold; letter-spacing: 2px; color: #64748b; margin-top: 5px; text-transform: uppercase; }
            .title { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 20px; }
            .meta { font-size: 11px; font-weight: bold; color: #94a3b8; margin-top: 5px; }
            .content { font-size: 14px; margin-top: 30px; border-left: 4px solid #3b82f6; padding-left: 20px; text-align: justify; white-space: pre-line; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; text-align: center; color: #64748b; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="logo">BERKAYTUR</h1>
            <div class="sub">Okul Servis Taşımacılığı A.Ş. • Duyuru ve Tebliğ Belgesi</div>
          </div>
          <div class="title">${annTitle}</div>
          <div class="meta">Yayıncı: ${author} • Tarih: ${date}</div>
          <div class="content">${annContent}</div>
          <div class="footer">
            Bu belge Berkaytur ERP Okul Servis Portalı üzerinden dijital olarak oluşturulmuştur. Evrak kodu: BKT-DUY-${Date.now()}
            <br/><br/>
            <button class="no-print" onclick="window.print()" style="padding: 8px 16px; background-color: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Yazdır</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      
      {/* Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide">
            PERSONEL VE VELİ TEBLİĞ SİSTEMİ
          </span>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-1.5">Duyuru Panosu & Yayıncı</h3>
          <p className="text-xs text-slate-500">Koordinatörlere, şoförlere, hosteslere veya velilere ayrı ayrı kanallardan bildirim gönderin.</p>
        </div>
        
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Yeni Duyuru Yayınla
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 animate-fade-in">
          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Yeni Duyuru Giriş Formu</h4>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Duyuru Başlığı</label>
              <input
                type="text"
                required
                placeholder="Örn: Hafta Sonu Çalışma Programı"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Hedef Kitle</label>
              <select
                value={targetRole}
                onChange={e => setTargetRole(e.target.value as any)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
              >
                <option value="all">Herkes (Tüm Roller)</option>
                <option value="manager">Proje Müdürleri</option>
                <option value="coordinator">Okul Sorumluları</option>
                <option value="accounting">Muhasebe</option>
                <option value="driver">Şoförler</option>
                <option value="hostess">Hostesler</option>
                <option value="parent">Veliler</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase">Mesaj İçeriği</label>
            <textarea
              required
              rows={4}
              placeholder="Duyurulacak duyuru içeriğini buraya yazınız..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>

          {/* Distribution Channels */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase block">Yayın Kanalları</label>
            <div className="flex flex-wrap gap-4 text-xs font-bold">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channelNotification}
                  onChange={e => setChannelNotification(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                🖥️ Sistem İçi Bildirim
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channelWhatsApp}
                  onChange={e => setChannelWhatsApp(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                💬 WhatsApp Web Bağlantısı
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channelPDF}
                  onChange={e => setChannelPDF(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                📄 Resmi Tebliğ (PDF)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 bg-slate-200 rounded-lg text-xs font-bold"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-extrabold shadow-xs"
            >
              <Send className="w-3.5 h-3.5" /> Duyuruyu Yayınla
            </button>
          </div>
        </form>
      )}

      {/* Announcements List view */}
      <div className="space-y-4">
        {announcements.map((ann) => (
          <div 
            key={ann.id} 
            className="p-5 border border-slate-200/80 rounded-2xl bg-slate-50/20 hover:border-slate-300 transition-all flex gap-4"
          >
            {/* Status bell */}
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-inner">
              <Bell className="w-5 h-5" />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 tracking-tight leading-tight">
                    {ann.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    Yazar: {ann.authorName} • Tarih: {ann.createdAt}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] bg-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Hedef: {ann.targetRoles.join(', ')}
                  </span>
                  
                  {(currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'coordinator') && (
                    <button
                      onClick={() => deleteAnnouncement(ann.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                      title="Duyuruyu Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-line">
                {ann.content}
              </p>

              {/* Dynamic share triggers if configured */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100/60">
                {ann.channels.includes('whatsapp') && (
                  <a
                    href={getWhatsAppShareLink(ann.title, ann.content)}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg"
                  >
                    <MessageSquare className="w-3 h-3" />
                    WhatsApp Web Paylaşımı
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                )}

                {ann.channels.includes('pdf') && (
                  <button
                    onClick={() => handlePrintPDF(ann.title, ann.content, ann.authorName, ann.createdAt)}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    Resmi Tebliğ PDF Yazdır
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-12 text-slate-400 font-medium text-xs">
            Yayınlanmış herhangi bir resmi duyuru bulunmamaktadır.
          </div>
        )}
      </div>
    </div>
  );
}
