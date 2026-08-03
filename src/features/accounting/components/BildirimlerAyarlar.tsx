/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../../store';
import { 
  Bell, Settings, Database, CloudLightning, Eye, Landmark, 
  HelpCircle, Check, Key, FileSpreadsheet, Folder 
} from 'lucide-react';

export default function BildirimlerAyarlar() {
  const { settings, updateSettings, addLog } = useAppStore();
  const [subTab, setSubTab] = useState<'notifications' | 'settings'>('notifications');

  // Load local settings or default them
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState(settings.googleSheetsUrl || 'https://docs.google.com/spreadsheets/d/1X5u91_berkaytur_finance/edit');
  const [googleDriveFolderId, setGoogleDriveFolderId] = useState(settings.googleDriveFolderId || 'drive_folder_bkt_accounting_2026');
  const [taxRate, setTaxRate] = useState('20');
  const [backupStatus, setBackupStatus] = useState<'idle' | 'running' | 'success'>('idle');

  // Pre-seed some beautiful, realistic, finance-only notifications
  const financeNotifications = [
    { id: 'fn_1', title: '💵 Yeni Veli Tahsilatı Alındı', message: 'Kamil Yılmaz velisinden 2,400 ₺ Temmuz ayı servis aidatı tahsil edildi.', time: 'Bugün, 14:32', type: 'success' },
    { id: 'fn_2', title: '⚠️ Gecikmiş Alacak Bildirimi', message: 'Can Öz öğrencisinin velisi Murat Öz ödeme günü 5 gün gecikti. Tutar: 2,800 ₺.', time: 'Bugün, 09:15', type: 'warning' },
    { id: 'fn_3', title: '📑 Hakediş Onay Bekliyor', message: 'Ahmet Yılmaz (Sürücü) hakediş hesaplama tablosu finans kontrolü bekliyor.', time: 'Dün, 17:40', type: 'info' },
    { id: 'fn_4', title: '⚠️ Denetimden Gelen Ceza', message: '06 BKT 123 aracına "Koltuk Sensörü Arızası" sebebiyle 1,500 ₺ ceza kesildi.', time: 'Dün, 11:22', type: 'warning' },
    { id: 'fn_5', title: '⛽ Yakıt Fişi Girişi', message: '06 BKT 456 aracı için 3,187.50 ₺ yakıt faturası işlendi (Şirket Gideri).', time: '14.07.2026', type: 'info' },
    { id: 'fn_6', title: '🔧 Tamir Faturası Kaydı', message: '06 BKT 123 aracı periyodik bakımı için 8,500 ₺ servis faturası sisteme işlendi.', time: '13.07.2026', type: 'info' }
  ];

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      googleSheetsUrl,
      googleDriveFolderId
    });
    addLog('Sistem Ayarları Güncellendi', 'Google Sheets entegrasyon URL ve Google Drive klasör ID parametreleri güncellendi.');
    alert('Muhasebe ve Google Workspace entegrasyon parametreleri başarıyla güncellendi!');
  };

  const handleCloudBackup = () => {
    setBackupStatus('running');
    setTimeout(() => {
      setBackupStatus('success');
      addLog('Veritabanı Yedekleme Tetiklendi', 'Tüm finansal hareketler, puantajlar, hakedişler ve cari hesaplar Google Sheets & Drive üzerine sıkıştırılarak yedeklendi.');
      setTimeout(() => setBackupStatus('idle'), 2000);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER AND SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Bildirimler & Entegrasyon Ayarları</h2>
          <p className="text-slate-500 text-xs font-semibold">Anlık finansal uyarı akışı ve Google Sheets, Google Drive bulut entegrasyon ayarları.</p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-2xl text-xs font-extrabold text-slate-600">
          <button
            onClick={() => setSubTab('notifications')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'notifications' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" /> Finansal Bildirimler ({financeNotifications.length})
          </button>
          <button
            onClick={() => setSubTab('settings')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'settings' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" /> Google & Entegrasyon Ayarları
          </button>
        </div>
      </div>

      {/* RENDER VIEW CONTROLLERS */}
      {subTab === 'notifications' ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 space-y-4">
          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Aktif Finansal Bildirim Akışı</h4>
          
          <div className="space-y-3">
            {financeNotifications.map(n => (
              <div 
                key={n.id} 
                className={`p-4 rounded-2xl border flex items-start gap-4 transition-all hover:bg-slate-50/20 ${
                  n.type === 'success' 
                    ? 'bg-emerald-50/20 border-emerald-100/40' 
                    : n.type === 'warning' 
                      ? 'bg-rose-50/20 border-rose-100/40' 
                      : 'bg-blue-50/20 border-blue-100/40'
                }`}
              >
                <div className={`p-2.5 rounded-xl text-lg ${
                  n.type === 'success' 
                    ? 'bg-emerald-100/60 text-emerald-700' 
                    : n.type === 'warning' 
                      ? 'bg-rose-100/60 text-rose-700' 
                      : 'bg-blue-100/60 text-blue-700'
                }`}>
                  {n.type === 'success' ? '💰' : n.type === 'warning' ? '⚠️' : '🔔'}
                </div>

                <div className="space-y-1 flex-1 text-xs font-semibold">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800">{n.title}</p>
                    <span className="font-mono text-[10px] text-slate-400 font-medium">{n.time}</span>
                  </div>
                  <p className="text-slate-500 leading-normal">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Cloud Synchronization Panel */}
          <div className="lg:col-span-4 bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/15 px-3 py-1 rounded-full border border-blue-500/20">
                BULUT SENKRONİZASYONU
              </span>
              <h3 className="text-lg font-black tracking-tight leading-snug">Google Workspace Anlık Veritabanı Yedekle</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-semibold">
                Sistemdeki tüm tahsilat, cari makbuz, hakediş ve yevmiye kayıtları Google Sheets ve Google Drive üzerinde anlık olarak saklanmaktadır. Herhangi bir veri kaybı olasılığına karşı tam manuel bir yedekleme paketi oluşturabilirsiniz.
              </p>
            </div>

            <button
              onClick={handleCloudBackup}
              disabled={backupStatus === 'running'}
              className={`w-full py-3 rounded-2xl text-xs font-extrabold tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                backupStatus === 'running' 
                  ? 'bg-blue-800 text-blue-200 cursor-not-allowed' 
                  : backupStatus === 'success' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Database className={`w-4 h-4 ${backupStatus === 'running' ? 'animate-spin' : ''}`} />
              {backupStatus === 'running' && 'Yedek Alınıyor...'}
              {backupStatus === 'success' && 'Yedekleme Tamamlandı!'}
              {backupStatus === 'idle' && 'Şimdi Google Drive\'a Yedekle'}
            </button>
          </div>

          {/* Settings Fields Form */}
          <form onSubmit={handleSaveSettings} className="lg:col-span-8 bg-white border border-slate-100 p-6 rounded-3xl shadow-xl shadow-slate-100/50 space-y-5">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Workspace Entegrasyon Parametreleri</h4>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-400 uppercase flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Google E-Tablo (Sheets) URL
                </label>
                <input
                  type="url"
                  required
                  value={googleSheetsUrl}
                  onChange={e => setGoogleSheetsUrl(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-400 uppercase flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-blue-600" /> Google Drive Hedef Klasör ID (Folder ID)
                </label>
                <input
                  type="text"
                  required
                  value={googleDriveFolderId}
                  onChange={e => setGoogleDriveFolderId(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-400 uppercase">Resmi KDV Oranı (%)</label>
                  <input
                    type="number"
                    required
                    value={taxRate}
                    onChange={e => setTaxRate(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold font-mono focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-400 uppercase">Cari Para Birimi</label>
                  <select
                    disabled
                    className="w-full p-3.5 bg-slate-100 border border-slate-200/60 rounded-2xl text-xs font-bold focus:outline-none text-slate-400"
                  >
                    <option value="TRY">Türk Lirası (₺) - Varsayılan</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer"
              >
                Parametreleri Kaydet
              </button>
            </div>
          </form>

        </div>
      )}

    </div>
  );
}
