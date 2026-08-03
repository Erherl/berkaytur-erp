/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Vehicle, User } from '../../../types';
import { 
  CheckSquare, ShieldAlert, AlertTriangle, Truck, 
  UserX, DollarSign, Camera, Check, AlertOctagon, 
  Trash2, ShieldCheck, Hammer, HelpCircle, X, Clock,
  FileSpreadsheet, ClipboardList, RefreshCw, Star
} from 'lucide-react';

interface DenetimlerProps {
  vehicles: Vehicle[];
  drivers: User[];
  hostesses: User[];
  onAddLog: (action: string, details: string) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

interface ChecklistItem {
  key: string;
  label: string;
  status: 'Uygun' | 'Uygun Değil';
}

interface PastInspection {
  id: string;
  date: string;
  time: string;
  vehiclePlate: string;
  driverName: string;
  hostessName: string;
  score: number;
  failsCount: number;
  note: string;
  photo: string | null;
}

export default function Denetimler({ 
  vehicles, drivers, hostesses, onAddLog, onAddNotification 
}: DenetimlerProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  
  // Checklist items
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { key: 'arac_temizligi', label: 'Araç Temizliği (İç/Dış Hijyen)', status: 'Uygun' },
    { key: 'sofor_kiyafeti', label: 'Şoför Kıyafeti (Kurumsal Üniforma)', status: 'Uygun' },
    { key: 'hostes_kiyafeti', label: 'Hostes Kıyafeti (Kurumsal Üniforma)', status: 'Uygun' },
    { key: 'emniyet_kemerleri', label: 'Tüm Emniyet Kemerlerinin Çalışması', status: 'Uygun' },
    { key: 'yangin_tupu', label: 'Yangın Söndürme Tüpü (Tarih ve Basınç)', status: 'Uygun' },
    { key: 'ilkyardim_cantasi', label: 'İlk Yardım Çantası (Tam İçerik)', status: 'Uygun' },
    { key: 'arac_belgeleri', label: 'Araç Evrakları (Ruhsat, Muayene, Trafik Sigortası)', status: 'Uygun' },
    { key: 'sofor_evraklari', label: 'Şoför Belgeleri (SRC, Psikoteknik, Ehliyet)', status: 'Uygun' },
    { key: 'hostes_evraklari', label: 'Hostes Sertifikaları ve Belgeleri', status: 'Uygun' },
    { key: 'okul_tasiti_yazisi', label: '"Okul Taşıtı" Tabelası ve "Dur" Lambası', status: 'Uygun' },
    { key: 'koltuk_sensoru', label: 'Koltuk Sensörleri ve Takip Sistemi', status: 'Uygun' },
    { key: 'ogrenci_guvenligi', label: 'İniş / Biniş Güvenlik Önlemleri', status: 'Uygun' },
    { key: 'klima_isitma', label: 'Klima ve Isıtma Sistemleri Testi', status: 'Uygun' },
  ]);

  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [inspectionNote, setInspectionNote] = useState('');

  // Fine System States
  const [fineTarget, setFineTarget] = useState<'sofor' | 'hostes' | 'tedarikci'>('sofor');
  const [fineReason, setFineReason] = useState('Emniyet Kemeri Eksikliği / Arızası');
  const [fineAmount, setFineAmount] = useState('1000');
  
  // Loaded inspection logs from local storage
  const [inspectionHistory, setInspectionHistory] = useState<PastInspection[]>(() => {
    const list = localStorage.getItem('bkt_accounting_inspections');
    if (!list) {
      // Seed default histories
      const defaults: PastInspection[] = [
        {
          id: 'ins_1',
          date: '15.07.2026',
          time: '07:15',
          vehiclePlate: '06 BKT 123',
          driverName: 'Ahmet Yılmaz',
          hostessName: 'Ayşe Yıldız',
          score: 100,
          failsCount: 0,
          note: 'Araç içi düzen fevkalade, personel evrakları tam.',
          photo: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=150'
        },
        {
          id: 'ins_2',
          date: '14.07.2026',
          time: '07:22',
          vehiclePlate: '06 BKT 456',
          driverName: 'Mehmet Kaya',
          hostessName: 'Selin Işık',
          score: 69, // Low Score, will be highlighted red (< 80)
          failsCount: 4,
          note: 'Arka koltuk sensörü arızalı, şoför kıyafeti yönetmeliğe aykırı.',
          photo: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=150'
        }
      ];
      localStorage.setItem('bkt_accounting_inspections', JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(list);
  });

  const activeVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const activeDriver = drivers.find(d => d.id === activeVehicle?.driverId);
  const activeHostess = hostesses.find(h => h.id === activeVehicle?.hostessId);

  const handleStatusToggle = (key: string, newStatus: 'Uygun' | 'Uygun Değil') => {
    setChecklist(prev => prev.map(item => item.key === key ? { ...item, status: newStatus } : item));
  };

  const handleCapturePhoto = () => {
    // Simulate real camera photo capture
    const randomPhotos = [
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=400"
    ];
    const picked = randomPhotos[Math.floor(Math.random() * randomPhotos.length)];
    setUploadedPhoto(picked);
    
    onAddNotification(
      '📸 Google Drive Entegrasyonu',
      'Denetim kanıt dosyası başarıyla şifrelenip Google Drive "/Denetimler_Belgeleri/" klasörüne yüklendi.',
      'success'
    );
  };

  // 100 Point Audit Score Calculator
  const calculateScore = () => {
    const total = checklist.length;
    const pass = checklist.filter(i => i.status === 'Uygun').length;
    return Math.round((pass / total) * 100);
  };

  const handleSaveInspection = () => {
    if (!selectedVehicleId) return;

    const fails = checklist.filter(item => item.status === 'Uygun Değil');
    const score = calculateScore();
    const dateStr = new Date().toLocaleDateString('tr-TR');
    const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const newAudit: PastInspection = {
      id: `ins_${Date.now()}`,
      date: dateStr,
      time: timeStr,
      vehiclePlate: activeVehicle?.plate || '06 BKT 123',
      driverName: activeDriver?.name || 'Ahmet Yılmaz',
      hostessName: activeHostess?.name || 'Ayşe Yıldız',
      score,
      failsCount: fails.length,
      note: inspectionNote || 'Denetim rutin olarak tamamlandı.',
      photo: uploadedPhoto
    };

    const updatedHistory = [newAudit, ...inspectionHistory];
    setInspectionHistory(updatedHistory);
    localStorage.setItem('bkt_accounting_inspections', JSON.stringify(updatedHistory));

    const summary = fails.length === 0 
      ? 'Tüm maddeler kusursuz ve uygun bulundu.' 
      : `${fails.length} adet uygunsuzluk tespit edildi: ${fails.map(f => f.label).join(', ')}`;

    onAddLog(
      'Denetim Kaydedildi', 
      `${activeVehicle?.plate} plakalı araç denetlendi. Denetim Puanı: %${score}. Detay: ${summary}`
    );

    onAddNotification(
      '📋 Denetim Raporu İşlendi',
      `${activeVehicle?.plate} plakalı araç sabah denetim puanı: %${score}. Google Drive yedeklemesi yapıldı.`,
      score < 80 ? 'warning' : 'success'
    );

    alert(`✅ Denetim Tamamlandı ve Arşivlendi!\n\nPlaka: ${activeVehicle?.plate}\nDenetim Puanı: %${score}\nUygunsuzluk Sayısı: ${fails.length}\n\nTüm veriler Google Drive "Denetim_Raporlari" ve muhasebeye başarıyla senkronize edilmiştir.`);
    
    // Reset form
    setChecklist(checklist.map(item => ({ ...item, status: 'Uygun' })));
    setUploadedPhoto(null);
    setInspectionNote('');
    setSelectedVehicleId('');
  };

  const handleIssueFine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      alert("Lütfen önce ceza kesilecek personelin bulunduğu aracı seçiniz!");
      return;
    }

    const amountNum = parseFloat(fineAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Lütfen geçerli bir ceza tutarı giriniz!");
      return;
    }

    let targetName = 'Bilinmeyen Personel';
    let targetId = '';
    if (fineTarget === 'sofor') {
      targetName = activeDriver?.name || 'Ahmet Yılmaz';
      targetId = activeDriver?.id || 'u4';
    } else if (fineTarget === 'hostes') {
      targetName = activeHostess?.name || 'Ayşe Yıldız';
      targetId = activeHostess?.id || 'u5';
    } else {
      targetName = 'Tedarikçi Firma (BERKAYTUR Ortağı)';
      targetId = 'u4'; // Default to driver linked supplier
    }

    // Unify fine format with CezalarPrimler & Hakedisler
    const newFine = {
      id: `fn_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      personnelId: targetId,
      personnelName: targetName,
      vehiclePlate: activeVehicle?.plate || '06 BKT 123',
      amount: amountNum,
      reason: fineReason,
      source: 'Denetim Cezası',
      description: `${activeVehicle?.plate} plakalı aracın denetiminde saptanan kusurlar üzerine kesilmiştir.`
    };

    // Save to shared localStorage key 'bkt_accounting_cezalar'
    const existingCezalar = JSON.parse(localStorage.getItem('bkt_accounting_cezalar') || '[]');
    const newCezalar = [newFine, ...existingCezalar];
    localStorage.setItem('bkt_accounting_cezalar', JSON.stringify(newCezalar));

    onAddLog(
      'Denetim Cezası Kesildi', 
      `${targetName} için ${amountNum} ₺ denetim cezası kesildi. Gerekçe: ${fineReason}`
    );

    onAddNotification(
      '🚨 Hakediş Ceza Kesintisi',
      `${targetName} personeline kesilen ${amountNum} ₺ ceza, aylık hakedişinden otomatik düşürülmek üzere muhasebeye sevk edildi.`,
      'warning'
    );

    alert(`✅ Ceza Muhasebeye Sevk Edildi!\n\nKişi/Kurum: ${targetName}\nCeza Tutarı: -${amountNum} ₺\nGerekçe: ${fineReason}\n\nBu ceza anlık olarak "Aylık Hakediş Bordrosuna" yansıtılarak tedarikçi/personel alacağından düşürülmüştür.`);
    
    // Clear fine amount
    setFineAmount('1000');
  };

  return (
    <div className="space-y-6">
      
      {/* MODULE MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT SIDE: MORNING INSPECTIONS CHECKLIST */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                KOORDİNATÖR SAHA AUDİT
              </span>
              <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                <CheckSquare className="w-5 h-5 text-emerald-600" /> Mobil Uyumlu Rutin Araç Denetimi
              </h4>
              <p className="text-[10px] text-slate-400">Her sabah okul sorumlusu tarafından doldurulan resmi kontrol formu.</p>
            </div>

            <select
              value={selectedVehicleId}
              onChange={e => setSelectedVehicleId(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 w-44 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">Araç Seçiniz...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>🚌 {v.plate}</option>
              ))}
            </select>
          </div>

          {!selectedVehicleId ? (
            <div className="py-24 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <ClipboardList className="w-10 h-10 text-slate-300 animate-pulse" />
              <span>Denetim checklistini doldurmak için lütfen sağ üst köşeden denetleyeceğiniz aracı seçiniz.</span>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              
              {/* CURRENT SELECTED VEHICLE INFO CARD */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border rounded-2xl text-[10px] font-bold text-slate-500">
                <div>
                  <span className="block text-[8px] text-slate-400 uppercase">Şoför</span>
                  <span className="text-slate-800 font-extrabold">{activeDriver?.name || 'Ahmet Yılmaz'}</span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 uppercase">Hostes</span>
                  <span className="text-slate-800 font-extrabold">{activeHostess?.name || 'Ayşe Yıldız'}</span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 uppercase">Kapasite</span>
                  <span className="text-slate-800 font-extrabold">{activeVehicle?.capacity} Koltuk / {activeVehicle?.brand}</span>
                </div>
              </div>

              {/* Checklist table */}
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1 space-y-1.5">
                {checklist.map(item => (
                  <div key={item.key} className="py-2 flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-[11px] leading-tight">{item.label}</span>
                    <div className="flex border border-slate-200/60 rounded-xl overflow-hidden font-extrabold text-[9px] shadow-sm">
                      <button
                        type="button"
                        onClick={() => handleStatusToggle(item.key, 'Uygun')}
                        className={`px-3 py-1.5 transition-all cursor-pointer ${
                          item.status === 'Uygun' ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-400'
                        }`}
                      >
                        UYGUN (10p)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusToggle(item.key, 'Uygun Değil')}
                        className={`px-3 py-1.5 transition-all cursor-pointer ${
                          item.status === 'Uygun Değil' ? 'bg-rose-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-400'
                        }`}
                      >
                        KUSURLU
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* LIVE SCORE INDICATOR */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">GÜNCEL HAKEDİŞ PUANI</span>
                  <p className="text-[10px] text-slate-300">100 puan üzerinden ağırlıklı denetim notu.</p>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-black ${calculateScore() < 80 ? 'text-rose-500' : 'text-emerald-400'}`}>
                    %{calculateScore()}
                  </span>
                </div>
              </div>

              {/* Photo Attachment Row */}
              <div className="border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border text-slate-700 font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                  >
                    <Camera className="w-4 h-4 text-slate-500" /> Kanıt Fotoğrafı Çek (Drive)
                  </button>
                  {uploadedPhoto && (
                    <span className="text-emerald-600 font-black text-[10px] flex items-center gap-1">
                      <Check className="w-4 h-4" /> Drive Bulutuna Gönderildi
                    </span>
                  )}
                </div>

                {uploadedPhoto && (
                  <img 
                    src={uploadedPhoto} 
                    alt="Denetim kanıtı" 
                    className="w-16 h-12 rounded-xl object-cover border border-slate-200 shadow-sm" 
                  />
                )}
              </div>

              {/* General Note */}
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Denetim Notu ve Görüşü</label>
                <input
                  type="text"
                  placeholder="Araç durumuna dair özel notlar ve koordinatör yorumları..."
                  value={inspectionNote}
                  onChange={e => setInspectionNote(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveInspection}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10 text-xs"
              >
                <Check className="w-4 h-4" /> Denetim Raporunu Onayla ve Arşivle
              </button>
            </div>
          )}
        </div>

        {/* RIGHT SIDE: PENALTY SYSTEM */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              SAHA YAPTIRIM YÖNETİMİ
            </span>
            <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5 mt-1">
              <Hammer className="w-5 h-5 text-rose-600" /> Ceza ve Yaptırım Paneli
            </h4>
            <p className="text-[10px] text-slate-400">Saptanan kusurlar için hakedişten kesinti oluşturun.</p>
          </div>

          {selectedVehicleId ? (
            <form onSubmit={handleIssueFine} className="space-y-3 text-xs">
              {/* Fine Target */}
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Ceza Alacak Taraf</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['sofor', 'hostes', 'tedarikci'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFineTarget(t)}
                      className={`py-2 rounded-xl font-bold border transition-all text-center cursor-pointer text-[10px] uppercase tracking-wide ${
                        fineTarget === t 
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm' 
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {t === 'sofor' ? 'Şoför' : t === 'hostes' ? 'Hostes' : 'Tedarikçi'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Displaying name dynamically based on selected vehicle */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-2xl text-[10px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Araç Plakası:</span>
                  <span className="font-bold text-slate-800">{activeVehicle?.plate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Muhatap Personel:</span>
                  <span className="font-bold text-slate-800">
                    {fineTarget === 'sofor' 
                      ? activeDriver?.name || 'Ahmet Yılmaz' 
                      : fineTarget === 'hostes' 
                        ? activeHostess?.name || 'Ayşe Yıldız' 
                        : 'BERKAYTUR Tedarikçi Ortağı'}
                  </span>
                </div>
              </div>

              {/* Fine Reason */}
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Ceza Kesim Nedeni</label>
                <select
                  value={fineReason}
                  onChange={e => setFineReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="Emniyet Kemeri Eksikliği / Arızası">Emniyet Kemeri Eksikliği / Arızası</option>
                  <option value="Araç Temizliği Uygun Değil">Araç Temizliği Uygun Değil (İç/Dış)</option>
                  <option value="Evrak/Belge Eksikliği (Şoför/Hostes)">Evrak/Belge Eksikliği (Şoför/Hostes)</option>
                  <option value="Öğrenci Güvenliği İhmali">Öğrenci Güvenliği İhmali</option>
                  <option value="Kıyafet Yönetmeliğine Aykırı Davranış">Kıyafet Yönetmeliğine Aykırı Davranış</option>
                  <option value="Sefer Gecikmesi (Hava Koşulları Dışı)">Sefer Gecikmesi (Hava Koşulları Dışı)</option>
                  <option value="Diğer (Açıklama Yazın)">Diğer (Manuel Cezalandırma)</option>
                </select>
              </div>

              {/* Fine Amount */}
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Ceza Tutarı (₺ Kesinti)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    placeholder="Ceza miktarı giriniz"
                    value={fineAmount}
                    onChange={e => setFineAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-rose-500 text-rose-700"
                  />
                </div>
              </div>

              {/* Submit Fine */}
              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-200 text-xs"
              >
                <ShieldAlert className="w-4 h-4" /> Cezayı Muhasebeye Sevk Et
              </button>
            </form>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <ShieldAlert className="w-10 h-10 text-slate-300" />
              <span>Denetleyeceğiniz aracı seçtiğinizde, ceza yaptırım arayüzü o aracın aktif personeline kilitlenecektir.</span>
            </div>
          )}
        </div>

      </div>

      {/* BOTTOM AREA: HISTORICAL INSPECTION LOGS (LOW SCORES COLORED IN CRIMSON-RED) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
            <ClipboardList className="w-5 h-5 text-blue-600" /> Denetim Arşiv ve Geçmiş Logları
          </h4>
          <p className="text-[10px] text-slate-400">
            Saha denetçilerinin raporları. %80 barajı altındaki düşük puanlı denetimler otomatik olarak kırmızı renkte vurgulanır.
          </p>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {inspectionHistory.map(h => (
            <div 
              key={h.id} 
              className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                h.score < 80 
                  ? 'bg-rose-50/50 border-rose-200/60 text-rose-950' 
                  : 'bg-slate-50/30 border-slate-100 text-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${h.score < 80 ? 'bg-rose-600 animate-pulse' : 'bg-emerald-500'}`}></span>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-xs font-mono">{h.vehiclePlate}</span>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase">({h.date} - {h.time})</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">
                    Şoför: <span className="text-slate-800 font-bold">{h.driverName}</span> | Hostes: <span className="text-slate-800 font-bold">{h.hostessName}</span>
                  </p>
                  <p className="text-xs leading-normal font-medium max-w-2xl text-slate-600">
                    <span className="font-black text-slate-700">Açıklama:</span> "{h.note}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                {h.photo && (
                  <img 
                    src={h.photo} 
                    alt="Denetim görseli" 
                    className="w-12 h-9 rounded-lg object-cover border" 
                  />
                )}
                <div className="text-right">
                  <p className="text-[8px] text-slate-400 font-black uppercase">DENETİM PUANI</p>
                  <p className={`text-lg font-black font-mono ${h.score < 80 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    %{h.score}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
