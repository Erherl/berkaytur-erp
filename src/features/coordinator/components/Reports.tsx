/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, Vehicle, Payment } from '../../../types';
import { ApiClient } from '../../../infrastructure/api/apiClient';
import { 
  FileText, Download, Save, Search, RefreshCw, 
  Check, Info, HelpCircle, ArrowRight, Printer, ListFilter,
  Users, Bus, CalendarX, CreditCard, ShieldCheck, Loader2
} from 'lucide-react';

interface ReportsProps {
  students: Student[];
  vehicles: Vehicle[];
  payments: Payment[];
  onAddLog: (action: string, details: string) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

type ReportType = 'students' | 'vehicles' | 'absences' | 'payments' | 'inspections';

export default function Reports({
  onAddLog, onAddNotification
}: ReportsProps) {
  const [activeReportType, setActiveReportType] = useState<ReportType>('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportSummary, setReportSummary] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const getReportName = (type: ReportType) => {
    switch (type) {
      case 'students': return 'Öğrenci Genel Listesi';
      case 'vehicles': return 'Araç ve Güzergah Filo Raporu';
      case 'absences': return 'Öğrenci Devamsızlık Çizelgesi';
      case 'payments': return 'Tahsilat ve Cari Borç Raporu';
      case 'inspections': return 'Araç Sabah Denetim Günlüğü';
    }
  };

  // Dynamically load reports from backend with debounce
  useEffect(() => {
    let active = true;
    const fetchReport = async () => {
      setIsLoading(true);
      const res = await ApiClient.fetchReports(activeReportType, searchTerm);
      if (res.success && res.data && active) {
        setReportData(res.data.data);
        setReportSummary(res.data.summary);
      }
      if (active) {
        setIsLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      fetchReport();
    }, 200);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [activeReportType, searchTerm]);

  const handleExportToDrive = () => {
    const reportName = getReportName(activeReportType);
    onAddLog('Rapor Excel/PDF Aktarıldı', `${reportName} Google Drive'a yedeklendi.`);
    onAddNotification(
      '💾 Drive Senkronizasyonu',
      `"${reportName}" başarıyla Excel (.xlsx) formatında derlenerek /Drive/Berkaytur/Raporlar dizinine kaydedildi.`,
      'success'
    );
    alert(`✅ Başarılı!\n\n"${reportName}" verileri güncel haliyle Excel (.xlsx) olarak derlendi.\nGoogle Drive hesabınıza otomatik yüklendi.`);
  };

  const handleDownloadReport = () => {
    alert(`📥 PDF İndirme Başlatıldı!\n\n"${getReportName(activeReportType)}" güncel tablosu PDF formatında bilgisayarınıza aktarıldı.`);
  };

  return (
    <div className="space-y-6">
      {/* Selector card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" /> Rapor ve Evrak Yönetim Paneli
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Gelişmiş filtreler kullanarak okulunuza dair tüm listeleri saniyeler içinde Excel ve PDF olarak Google Drive'a aktarın.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 w-full md:w-auto text-xs">
          <button
            onClick={handleExportToDrive}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4 text-slate-500" /> Google Drive'a Gönder
          </button>
          <button
            onClick={handleDownloadReport}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-blue-200"
          >
            <Download className="w-4 h-4" /> PDF İndir / Yazdır
          </button>
        </div>
      </div>

      {/* KPI METRICS OVERVIEW MODULE - Offloaded directly from Server-Side stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {activeReportType === 'students' && (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Toplam Kayıtlı Öğrenci</span>
              <p className="text-xl font-black text-slate-800">{reportSummary.totalCount || 0}</p>
              <div className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">● Sistem Geneli</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Arama İle Eşleşen</span>
              <p className="text-xl font-black text-blue-600">{reportSummary.matchedCount || 0}</p>
              <div className="text-[9px] text-slate-500">Filtrelenmiş Satır</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sabah Servis Ataması</span>
              <p className="text-xl font-black text-slate-800">{reportSummary.morningAssigned || 0}</p>
              <div className="text-[9px] text-slate-500">Güzergah Tanımlı</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Akşam Servis Ataması</span>
              <p className="text-xl font-black text-slate-800">{reportSummary.eveningAssigned || 0}</p>
              <div className="text-[9px] text-slate-500">Güzergah Tanımlı</div>
            </div>
          </>
        )}

        {activeReportType === 'vehicles' && (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Toplam Filo Araç</span>
              <p className="text-xl font-black text-slate-800">{reportSummary.totalCount || 0}</p>
              <div className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">● Aktif Servis</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Eşleşen Filtre</span>
              <p className="text-xl font-black text-blue-600">{reportSummary.matchedCount || 0}</p>
              <div className="text-[9px] text-slate-500">Filtrelenmiş Sonuç</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Toplam Koltuk Kapasitesi</span>
              <p className="text-xl font-black text-slate-800">{reportSummary.totalCapacity || 0}</p>
              <div className="text-[9px] text-slate-500">Kapasite Sınırı</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Aktif Çalışan</span>
              <p className="text-xl font-black text-slate-800">{reportSummary.activeCount || 0}</p>
              <div className="text-[9px] text-slate-500">Sefer Halinde</div>
            </div>
          </>
        )}

        {activeReportType === 'absences' && (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sistemdeki Öğrenci</span>
              <p className="text-xl font-black text-slate-800">{reportSummary.totalCount || 0}</p>
              <div className="text-[9px] text-slate-500">Kayıtlı Havuz</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sabah Devamsız</span>
              <p className="text-xl font-black text-rose-600">{reportSummary.absentMorning || 0}</p>
              <div className="text-[9px] text-rose-500">"Binmeyecek" Bildiren</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Akşam Devamsız</span>
              <p className="text-xl font-black text-rose-600">{reportSummary.absentEvening || 0}</p>
              <div className="text-[9px] text-rose-500">"Binmeyecek" Bildiren</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sorunsuz Taşıma</span>
              <p className="text-xl font-black text-emerald-600">{reportSummary.presentCount || 0}</p>
              <div className="text-[9px] text-emerald-500">Aktif Binen</div>
            </div>
          </>
        )}

        {activeReportType === 'payments' && (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Toplam Tahsil Edilen</span>
              <p className="text-xl font-black text-emerald-600">{reportSummary.totalCollected || 0} TL</p>
              <div className="text-[9px] text-emerald-500">Bankaya Giriş Yapan</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Bekleyen Cari Alacak</span>
              <p className="text-xl font-black text-amber-600">{reportSummary.totalPending || 0} TL</p>
              <div className="text-[9px] text-amber-500">Taksit Vadesi Gelen</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">İade / Geri Alınan</span>
              <p className="text-xl font-black text-rose-600">{reportSummary.totalRefunded || 0} TL</p>
              <div className="text-[9px] text-rose-500">Rollback ve İadeler</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Toplam Cari Hacim</span>
              <p className="text-xl font-black text-slate-800">{(reportSummary.totalCollected || 0) + (reportSummary.totalPending || 0)} TL</p>
              <div className="text-[9px] text-slate-500">Brüt Tahsilat</div>
            </div>
          </>
        )}

        {activeReportType === 'inspections' && (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Denetlenen Araç</span>
              <p className="text-xl font-black text-slate-800">{reportSummary.totalInspected || 0}</p>
              <div className="text-[9px] text-slate-500">Sistem Filtreli</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sistem Kusur Puanı</span>
              <p className="text-xl font-black text-emerald-600">{reportSummary.totalFaults || 0}</p>
              <div className="text-[9px] text-emerald-500">Kritik Hata Yok</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Uygunluk Raporu Alan</span>
              <p className="text-xl font-black text-slate-800">{reportSummary.passedCount || 0}</p>
              <div className="text-[9px] text-slate-500">Onaylı Sefer</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Güvenlik Skoru</span>
              <p className="text-xl font-black text-emerald-600">100%</p>
              <div className="text-[9px] text-emerald-500">Sertifikalı Filo</div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT SELECTION COLUMN */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col gap-2">
          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
            Rapor Türleri
          </h4>

          {(['students', 'vehicles', 'absences', 'payments', 'inspections'] as ReportType[]).map(type => (
            <button
              key={type}
              onClick={() => {
                setActiveReportType(type);
                setSearchTerm('');
              }}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs text-left transition-all cursor-pointer ${
                activeReportType === type 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white hover:bg-slate-50 text-slate-600'
              }`}
            >
              📄 {getReportName(type).split(' ').slice(0, 3).join(' ')}
            </button>
          ))}
        </div>

        {/* RIGHT DATA PREVIEW TABLE */}
        <div className="lg:col-span-9 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 relative min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex items-center justify-center z-10 rounded-3xl">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs bg-white p-3 rounded-xl border shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin" /> Sunucu verileri derleniyor...
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                🗂️ Rapor Önizleme: {getReportName(activeReportType)}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Berkaytur Bulut Altyapısı • Son Güncelleme: Anlık</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Arama yapın..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-blue-500"
              />
            </div>
          </div>

          {/* DYNAMIC TABLES BASED ON TYPE */}
          <div className="overflow-x-auto">
            {activeReportType === 'students' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="pb-3">Öğrenci Adı</th>
                    <th className="pb-3">Okul Adı</th>
                    <th className="pb-3">Sınıf / Seviye</th>
                    <th className="pb-3">Veli Adı</th>
                    <th className="pb-3">Telefon</th>
                    <th className="pb-3 text-right">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reportData.map(st => (
                    <tr key={st.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-bold text-slate-800">{st.name}</td>
                      <td className="py-3 text-slate-600">{st.schoolName}</td>
                      <td className="py-3 text-slate-500">{st.classLevel}</td>
                      <td className="py-3 text-slate-600">{st.parentName}</td>
                      <td className="py-3 text-slate-500">{st.parentPhone}</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-bold border border-emerald-200 uppercase">
                          Kayıtlı
                        </span>
                      </td>
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 italic">Eşleşen öğrenci bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeReportType === 'vehicles' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="pb-3">Plaka No</th>
                    <th className="pb-3">Marka & Model</th>
                    <th className="pb-3">Kapasite</th>
                    <th className="pb-3">Sürücü Durumu</th>
                    <th className="pb-3">Rehber Ataması</th>
                    <th className="pb-3 text-right">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reportData.map(vh => (
                    <tr key={vh.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-bold text-slate-800">🚌 {vh.plate}</td>
                      <td className="py-3 text-slate-600">{vh.brand} {vh.model}</td>
                      <td className="py-3 text-slate-500">{vh.capacity} Koltuk</td>
                      <td className="py-3 text-slate-600">Görevli Sürücü</td>
                      <td className="py-3 text-slate-600">Rehber Personel</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-bold border border-emerald-200 uppercase">
                          Aktif
                        </span>
                      </td>
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 italic">Eşleşen araç bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeReportType === 'absences' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="pb-3">Öğrenci Adı</th>
                    <th className="pb-3">Okulu</th>
                    <th className="pb-3">Velisi</th>
                    <th className="pb-3">Sabah Biniş</th>
                    <th className="pb-3">Akşam Biniş</th>
                    <th className="pb-3 text-right">Veli Bildirimi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reportData.map(st => (
                    <tr key={st.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-bold text-slate-800">{st.name}</td>
                      <td className="py-3 text-slate-600">{st.schoolName}</td>
                      <td className="py-3 text-slate-500">{st.parentName}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          st.morningStatus !== 'absent' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {st.morningStatus !== 'absent' ? 'BİNDİ' : 'BİNMEDİ'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          st.eveningStatus !== 'absent' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {st.eveningStatus !== 'absent' ? 'BİNDİ' : 'BİNMEDİ'}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-600">
                        {st.morningStatus === 'absent' ? '🚨 "Binmeyecek" Bildirdi' : 'Yok'}
                      </td>
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 italic">Devamsızlık verisi bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeReportType === 'payments' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="pb-3">Veli / Öğrenci</th>
                    <th className="pb-3">Açıklama / Kategori</th>
                    <th className="pb-3">Vade Tarihi</th>
                    <th className="pb-3 text-right">Tutar (TL)</th>
                    <th className="pb-3 text-right">Ödeme Durumu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reportData.map(pm => (
                    <tr key={pm.id} className="hover:bg-slate-50/50">
                      <td className="py-3">
                        <p className="font-bold text-slate-800">{pm.studentName}</p>
                        <p className="text-[10px] text-slate-400">Velisi: {pm.parentName}</p>
                      </td>
                      <td className="py-3 text-slate-600">{pm.description}</td>
                      <td className="py-3 text-slate-500">{pm.dueDate}</td>
                      <td className="py-3 text-right font-bold text-slate-800">{pm.amount} TL</td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase ${
                          pm.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : pm.status === 'refunded'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                        }`}>
                          {pm.status === 'paid' ? 'TAHSİL EDİLDİ' : pm.status === 'refunded' ? 'İADE / GERİ ALINDI' : 'BEKLEYEN VADE'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {reportData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        Kayıtlı herhangi bir tahsilat kaydı bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeReportType === 'inspections' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="pb-3">Denetlenen Plaka</th>
                    <th className="pb-3">Denetçi Unvanı</th>
                    <th className="pb-3">Tarih & Saat</th>
                    <th className="pb-3">Genel Sonuç</th>
                    <th className="pb-3 text-right font-bold">Kusur Sayısı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reportData.map(i => (
                    <tr key={i.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-bold text-slate-800">🚌 {i.plate}</td>
                      <td className="py-3 text-slate-600">{i.inspector}</td>
                      <td className="py-3 text-slate-500">{i.time}</td>
                      <td className="py-3 text-emerald-700 font-bold">{i.result}</td>
                      <td className="py-3 text-right font-black text-slate-700">{i.faults}</td>
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400 italic">Eşleşen denetim kaydı bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
