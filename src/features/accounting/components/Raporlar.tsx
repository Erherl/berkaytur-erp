/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../store';
import { DownloadService } from '../../../services/DownloadService';
import { 
  FileText, Download, Share2, Smartphone, Printer, Mail, 
  Search, Calendar, Filter, ChevronRight, FileSpreadsheet, 
  CheckCircle2, Star, Plus, Trash2, Award, ShieldCheck,
  TrendingUp, Users, Bus, Heart, BookOpen, AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, LineChart, Line, Cell
} from 'recharts';

interface SurveyScore {
  week: string;
  firma: number;
  sofor: number;
  hostes: number;
  arac: number;
  okulSorumlusu: number;
  projeMuduru: number;
}

export default function Raporlar() {
  const { payments, vehicles, users } = useAppStore();
  const [selectedReportType, setSelectedReportType] = useState<string>('hakedis');
  const [dateFilter, setDateFilter] = useState<'daily' | 'monthly' | 'yearly'>('monthly');

  // Shared accounting logs from LocalStorage
  const fuels = JSON.parse(localStorage.getItem('bkt_accounting_yakitlar') || '[]');
  const repairs = JSON.parse(localStorage.getItem('bkt_accounting_tamirler') || '[]');
  const advances = JSON.parse(localStorage.getItem('bkt_accounting_avanslar') || '[]');
  const fines = JSON.parse(localStorage.getItem('bkt_accounting_cezalar') || '[]');
  const primes = JSON.parse(localStorage.getItem('bkt_accounting_primler') || '[]');
  const inspections = JSON.parse(localStorage.getItem('bkt_accounting_inspections') || '[]');

  // Satisfaction Survey state with local storage binding
  const [surveyData, setSurveyData] = useState<SurveyScore[]>(() => {
    const saved = localStorage.getItem('bkt_accounting_surveys_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    const defaults = [
      { week: '1. Hafta', firma: 4.5, sofor: 4.8, hostes: 4.2, arac: 4.6, okulSorumlusu: 4.9, projeMuduru: 4.7 },
      { week: '2. Hafta', firma: 4.6, sofor: 4.7, hostes: 4.4, arac: 4.5, okulSorumlusu: 4.8, projeMuduru: 4.8 },
      { week: '3. Hafta', firma: 4.7, sofor: 4.9, hostes: 4.6, arac: 4.7, okulSorumlusu: 4.9, projeMuduru: 4.9 },
      { week: '4. Hafta', firma: 4.8, sofor: 4.9, hostes: 4.7, arac: 4.8, okulSorumlusu: 5.0, projeMuduru: 4.9 }
    ];
    localStorage.setItem('bkt_accounting_surveys_v2', JSON.stringify(defaults));
    return defaults;
  });

  // Survey Input Form state
  const [inputWeek, setInputWeek] = useState('5. Hafta');
  const [inputFirma, setInputFirma] = useState('4.8');
  const [inputSofor, setInputSofor] = useState('4.9');
  const [inputHostes, setInputHostes] = useState('4.7');
  const [inputArac, setInputArac] = useState('4.8');
  const [inputSorumlu, setInputSorumlu] = useState('4.9');
  const [inputMudur, setInputMudur] = useState('5.0');

  // Add new weekly survey score
  const handleAddSurveyScore = (e: React.FormEvent) => {
    e.preventDefault();
    const newScore: SurveyScore = {
      week: inputWeek,
      firma: parseFloat(inputFirma) || 4.5,
      sofor: parseFloat(inputSofor) || 4.5,
      hostes: parseFloat(inputHostes) || 4.5,
      arac: parseFloat(inputArac) || 4.5,
      okulSorumlusu: parseFloat(inputSorumlu) || 4.5,
      projeMuduru: parseFloat(inputMudur) || 4.5
    };
    const updated = [...surveyData, newScore];
    setSurveyData(updated);
    localStorage.setItem('bkt_accounting_surveys_v2', JSON.stringify(updated));
    alert(`✅ ${inputWeek} Veli Memnuniyet Anketi verileri başarıyla sisteme girildi ve grafikler güncellendi!`);
    
    // Auto-increment week label for next entry
    const nextNum = parseInt(inputWeek.replace(/\D/g, '')) + 1;
    setInputWeek(`${nextNum}. Hafta`);
  };

  // Triggers export flows
  const handleExportExcel = () => {
    const headers = ["Rapor Kalemi", "Detay", "Tarih/Filtre", "Durum"];
    const rows = [
      ["Konsolide Rapor Türü", selectedReportType.toUpperCase(), dateFilter, "Aktif"],
      ["Veli Memnuniyet Ortalaması", "%96.2", "Temmuz 2026", "Onaylandı"],
      ["Filo Performans Endeksi", "9.4/10", "Aylık", "Kararlı"],
      ["Finansal Durum", "Tamamlandı", "Bordro", "Aktif"]
    ];
    DownloadService.downloadCSV(headers, rows, `Berkaytur_Rapor_${selectedReportType}_${dateFilter}`);
    alert(`📊 Rapor Excel formatında (.csv) başarıyla oluşturuldu ve indirildi.`);
  };

  const handleExportPDF = () => {
    DownloadService.downloadReceipt(
      `Konsolide Performans ve Finans Raporu`,
      {
        'Rapor Türü': selectedReportType.toUpperCase(),
        'Filtre Dönemi': dateFilter.toUpperCase(),
        'Genel Memnuniyet': '%96.2 Başarı Oranı',
        'Zaman Dakiklik': '%98.4 Zamanlama Kararlılığı',
        'Toplam Sefer Sayısı': '1,420 Sefer',
        'Denetim Puanı': '9.8 / 10'
      },
      `Berkaytur_Rapor_${selectedReportType}.txt`
    );
  };

  const handlePrint = () => {
    DownloadService.printContent('financial-reporting-analysis-center');
  };

  const handleSendWhatsApp = () => {
    const text = `*BERKAYTUR RAPORU VE MEMNUNİYET İCMALİ*\nRapor Türü: ${selectedReportType.toUpperCase()}\nFiltre Aralığı: ${dateFilter.toUpperCase()}\n\nVeli memnuniyet anketi genel ortalamamız %96 başarıyla tamamlanmıştır. Raporun PDF/Excel belgesine Google Drive üzerinden erişim sağlayabilirsiniz. - Berkaytur Koordinatörlük`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div id="financial-reporting-analysis-center" className="space-y-6 animate-fade-in">
      
      {/* HEADER BANNER */}
      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 uppercase tracking-widest">
            BERKAYTUR KONSOLİDE ANALİZ MERKEZİ
          </span>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5.5 h-5.5 text-blue-600" /> Raporlama, Performans ve Memnuniyet Yönetimi
          </h2>
          <p className="text-slate-400 text-xs font-semibold">
            Tüm puantaj cetvelleri, hakediş icmalleri, araç bakım masrafları ve veli anket sonuçlarının tek ekranda grafiksel analizi.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedReportType('anket')}
            className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
              selectedReportType === 'anket'
                ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200'
                : 'bg-white hover:bg-slate-50 text-rose-600 border-rose-200/50'
            }`}
          >
            <Heart className="w-4 h-4 fill-current" /> Veli Memnuniyet Anketi Grafikleri
          </button>
        </div>
      </div>

      {/* RENDER REPORT CONTROLLERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Report Variants Menu */}
        <div className="lg:col-span-4 bg-white border border-slate-100 p-5 rounded-3xl shadow-xs space-y-4">
          <h4 className="font-extrabold text-slate-400 text-[10px] uppercase tracking-widest block border-b pb-2">Rapor Türü Seçin</h4>
          
          <div className="space-y-1.5">
            {[
              { id: 'puantaj', name: '📆 Puantaj Sefer Raporu', color: 'text-emerald-600' },
              { id: 'hakedis', name: '📑 Şoför & Hostes Hakedişleri', color: 'text-blue-600' },
              { id: 'ceza', name: '🚨 Kesilen Denetim Cezaları', color: 'text-rose-600' },
              { id: 'prim', name: '🏆 Hak Edilen Teşvik Primleri', color: 'text-amber-600' },
              { id: 'yakit', name: '⛽ Akaryakıt Gider Tablosu', color: 'text-amber-500' },
              { id: 'tamir', name: '🔧 Servis, Bakım & Tamirler', color: 'text-orange-600' },
              { id: 'denetim', name: '📋 Saha Denetim Başarı Puanı', color: 'text-violet-600' },
              { id: 'performans', name: '📈 Sefer & Koordinasyon Analizi', color: 'text-indigo-600' },
              { id: 'anket', name: '💖 Veli Memnuniyet Anketleri', color: 'text-rose-600 font-black' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedReportType(item.id)}
                className={`w-full p-3 rounded-2xl text-left text-xs font-extrabold transition-all flex items-center justify-between border cursor-pointer ${
                  selectedReportType === item.id 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg font-black' 
                    : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span className={item.color}>{item.name}</span>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            ))}
          </div>

          <h4 className="font-extrabold text-slate-400 text-[10px] uppercase tracking-widest block border-b pb-2 pt-2">Dönem Filtresi</h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'daily', name: 'Günlük' },
              { id: 'monthly', name: 'Aylık' },
              { id: 'yearly', name: 'Yıllık' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as any)}
                className={`py-2 rounded-xl text-[10px] font-black uppercase border text-center transition-all cursor-pointer ${
                  dateFilter === f.id 
                    ? 'bg-blue-50 border-blue-600 text-blue-700 font-black' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Preview Panel & Exports */}
        <div className="lg:col-span-8 bg-white border border-slate-100 p-6 rounded-3xl shadow-xl shadow-slate-100/50 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                KONSOLİDE RAPORLAMA ÖN İZLEME
              </span>
              <h3 className="text-base font-black text-slate-800 mt-1.5 uppercase">
                {selectedReportType === 'puantaj' && 'Okul Sefer Puantaj Cetveli İcmali'}
                {selectedReportType === 'hakedis' && 'Şoför & Hostes Hakediş Bordrosu'}
                {selectedReportType === 'ceza' && 'Denetim ve İdari Cezalar Raporu'}
                {selectedReportType === 'prim' && 'Aylık Başarı ve Teşvik Primleri Raporu'}
                {selectedReportType === 'yakit' && 'Filo Akaryakıt Tüketimi & Kilometre Analizi'}
                {selectedReportType === 'tamir' && 'Filo Bakım Onarım & Servis Faturaları'}
                {selectedReportType === 'denetim' && 'Saha Denetimleri Başarı Karnesi'}
                {selectedReportType === 'performans' && 'Araç Sefer Performans & Dakiklik Endeksi'}
                {selectedReportType === 'anket' && 'Veli Memnuniyet Anket Analizleri (5 Yıldız Oranı)'}
              </h3>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={handleExportExcel}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Excel olarak indir"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="PDF olarak indir"
              >
                <FileText className="w-4 h-4" /> PDF
              </button>
              <button
                onClick={handlePrint}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Yazdır"
              >
                <Printer className="w-4 h-4" /> Yazdır
              </button>
              <button
                onClick={handleSendWhatsApp}
                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="WhatsApp paylaş"
              >
                <Smartphone className="w-4 h-4" /> Paylaş
              </button>
            </div>
          </div>

          {/* MAIN PREVIEW CONTAINER */}
          {selectedReportType === 'anket' ? (
            
            // 💖 VELI MEMNUNİYET ANKETİ VIEW WITH INTERACTIVE CHART & INPUT FORM
            <div className="space-y-6">
              
              {/* RECHARTS VISUAL CONTAINER */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Veli Anket Memnuniyet Puanları Gelişim Grafiği (5 Üzerinden)
                </h4>
                <div className="h-72 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={surveyData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="week" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                      <YAxis domain={[3.5, 5.0]} stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                      <Line type="monotone" dataKey="firma" name="Ana Firma" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="sofor" name="Şoför" stroke="#10b981" strokeWidth={3} />
                      <Line type="monotone" dataKey="hostes" name="Hostes" stroke="#8b5cf6" strokeWidth={3} />
                      <Line type="monotone" dataKey="arac" name="Araç Konforu" stroke="#f59e0b" strokeWidth={3} />
                      <Line type="monotone" dataKey="okulSorumlusu" name="Okul Sorumlusu" stroke="#ec4899" strokeWidth={3} />
                      <Line type="monotone" dataKey="projeMuduru" name="Proje Müdürü" stroke="#64748b" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SURVEY SCORE ENTRY FORM */}
              <form onSubmit={handleAddSurveyScore} className="p-5 border border-dashed rounded-3xl bg-slate-50/30 space-y-4">
                <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Haftalık Veli Anketi Puan Giriş Cetveli</h4>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold text-slate-600">
                  <div className="space-y-1">
                    <label>Hafta Tanımı</label>
                    <input 
                      type="text" 
                      required 
                      value={inputWeek} 
                      onChange={e => setInputWeek(e.target.value)} 
                      className="w-full p-2 bg-white border rounded-xl"
                      placeholder="5. Hafta"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Firma Memnuniyeti</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="1" 
                      max="5" 
                      required 
                      value={inputFirma} 
                      onChange={e => setInputFirma(e.target.value)} 
                      className="w-full p-2 bg-white border rounded-xl font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Şoför Davranışı</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="1" 
                      max="5" 
                      required 
                      value={inputSofor} 
                      onChange={e => setInputSofor(e.target.value)} 
                      className="w-full p-2 bg-white border rounded-xl font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Hostes İletişimi</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="1" 
                      max="5" 
                      required 
                      value={inputHostes} 
                      onChange={e => setInputHostes(e.target.value)} 
                      className="w-full p-2 bg-white border rounded-xl font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Araç Konforu</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="1" 
                      max="5" 
                      required 
                      value={inputArac} 
                      onChange={e => setInputArac(e.target.value)} 
                      className="w-full p-2 bg-white border rounded-xl font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Okul Sorumlusu</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="1" 
                      max="5" 
                      required 
                      value={inputSorumlu} 
                      onChange={e => setInputSorumlu(e.target.value)} 
                      className="w-full p-2 bg-white border rounded-xl font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Proje Müdürü</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="1" 
                      max="5" 
                      required 
                      value={inputMudur} 
                      onChange={e => setInputMudur(e.target.value)} 
                      className="w-full p-2 bg-white border rounded-xl font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                    >
                      Veriyi Kaydet & Çiz
                    </button>
                  </div>
                </div>
              </form>

            </div>
          ) : (
            
            // 📊 STANDARDS TABLES ACCORDING TO THE OTHER 8 CATEGORIES
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-4">Parametre / Cari</th>
                    <th className="py-3.5 px-4 font-mono">Grup / Sınıf</th>
                    <th className="py-3.5 px-4">Tarih</th>
                    <th className="py-3.5 px-4">Rapor Belgesi / Detay</th>
                    <th className="py-3.5 px-4 text-right">Tutar (₺) / Sonuç</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  
                  {/* PUANTAJ */}
                  {selectedReportType === 'puantaj' && (
                    <>
                      <tr className="hover:bg-slate-50/20 transition-all">
                        <td className="py-3 px-4 font-bold text-slate-800">Atatürk Anadolu Lisesi</td>
                        <td className="py-3 px-4 text-emerald-600 font-extrabold uppercase">Dönem Toplamı</td>
                        <td className="py-3 px-4 font-mono text-slate-400">Temmuz 2026</td>
                        <td className="py-3 px-4 italic text-slate-400">Tüm kadrolu araçların sefer katılım oranı %98</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">26 Sefer Günü</td>
                      </tr>
                      <tr className="hover:bg-slate-50/20 transition-all">
                        <td className="py-3 px-4 font-bold text-slate-800">Cumhuriyet İlkokulu</td>
                        <td className="py-3 px-4 text-emerald-600 font-extrabold uppercase">Dönem Toplamı</td>
                        <td className="py-3 px-4 font-mono text-slate-400">Temmuz 2026</td>
                        <td className="py-3 px-4 italic text-slate-400">Tüm kadrolu araçların sefer katılım oranı %100</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">26 Sefer Günü</td>
                      </tr>
                    </>
                  )}

                  {/* HAKEDIS */}
                  {selectedReportType === 'hakedis' && (
                    <>
                      <tr className="hover:bg-slate-50/20 transition-all">
                        <td className="py-3 px-4 font-bold text-slate-800">Ahmet Yılmaz</td>
                        <td className="py-3 px-4 font-extrabold text-blue-600 uppercase">SÜRÜCÜ</td>
                        <td className="py-3 px-4 font-mono text-slate-400">Temmuz 2026</td>
                        <td className="py-3 px-4 italic text-slate-400">06 BKT 123 (Hakediş Bordrosu Bankaya Gönderildi)</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">24,300 ₺</td>
                      </tr>
                      <tr className="hover:bg-slate-50/20 transition-all">
                        <td className="py-3 px-4 font-bold text-slate-800">Ayşe Yıldız</td>
                        <td className="py-3 px-4 font-extrabold text-purple-600 uppercase">HOSTES</td>
                        <td className="py-3 px-4 font-mono text-slate-400">Temmuz 2026</td>
                        <td className="py-3 px-4 italic text-slate-400">06 BKT 123 (Hakediş Bordrosu Bankaya Gönderildi)</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">19,200 ₺</td>
                      </tr>
                    </>
                  )}

                  {/* CEZA */}
                  {selectedReportType === 'ceza' && (
                    fines.length > 0 ? (
                      fines.map((f: any) => (
                        <tr key={f.id} className="hover:bg-slate-50/20 transition-all">
                          <td className="py-3 px-4 font-bold text-slate-800">{f.personnelName}</td>
                          <td className="py-3 px-4 text-rose-600 font-extrabold uppercase">DENETİM CEZASI</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{f.date}</td>
                          <td className="py-3 px-4 italic text-slate-400">{f.reason} • {f.vehiclePlate}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-rose-600">-{f.amount.toLocaleString('tr-TR')} ₺</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">Sistemde henüz kayıtlı ceza bulunmamaktadır.</td>
                      </tr>
                    )
                  )}

                  {/* PRIM */}
                  {selectedReportType === 'prim' && (
                    primes.length > 0 ? (
                      primes.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/20 transition-all">
                          <td className="py-3 px-4 font-bold text-slate-800">{p.personnelName}</td>
                          <td className="py-3 px-4 text-emerald-600 font-extrabold uppercase">TEŞVİK ÖDÜLÜ</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{p.date}</td>
                          <td className="py-3 px-4 italic text-slate-400">{p.reason} • {p.description}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">+{p.amount.toLocaleString('tr-TR')} ₺</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">Sistemde henüz kayıtlı prim bulunmamaktadır.</td>
                      </tr>
                    )
                  )}

                  {/* YAKIT */}
                  {selectedReportType === 'yakit' && (
                    fuels.length > 0 ? (
                      fuels.map((f: any) => (
                        <tr key={f.id} className="hover:bg-slate-50/20 transition-all">
                          <td className="py-3 px-4 font-bold text-slate-800">{f.vehiclePlate}</td>
                          <td className="py-3 px-4 text-slate-500 font-bold">AKARYAKIT</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{f.date}</td>
                          <td className="py-3 px-4 italic text-slate-400">{f.liters} L • Litre Fiyatı: {f.literPrice} ₺ • Fiş No: {f.receipt}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-rose-600">-{f.total.toLocaleString('tr-TR')} ₺</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">Sistemde henüz kayıtlı yakıt gider faturası bulunmamaktadır.</td>
                      </tr>
                    )
                  )}

                  {/* TAMIR */}
                  {selectedReportType === 'tamir' && (
                    repairs.length > 0 ? (
                      repairs.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50/20 transition-all">
                          <td className="py-3 px-4 font-bold text-slate-800">{r.vehiclePlate}</td>
                          <td className="py-3 px-4 text-slate-500 font-bold">{r.service}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{r.date}</td>
                          <td className="py-3 px-4 italic text-slate-400">Açıklama: {r.description}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-rose-600">-{r.amount.toLocaleString('tr-TR')} ₺</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">Sistemde henüz kayıtlı servis tamir faturası bulunmamaktadır.</td>
                      </tr>
                    )
                  )}

                  {/* DENETIM */}
                  {selectedReportType === 'denetim' && (
                    inspections.length > 0 ? (
                      inspections.map((ins: any) => (
                        <tr key={ins.id} className="hover:bg-slate-50/20 transition-all">
                          <td className="py-3 px-4 font-bold text-slate-800">{ins.vehiclePlate}</td>
                          <td className="py-3 px-4 text-slate-500">Saha Denetimi</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{ins.date} {ins.time}</td>
                          <td className="py-3 px-4 italic text-slate-400">Kusur Sayısı: {ins.failsCount} • Not: {ins.note}</td>
                          <td className={`py-3 px-4 text-right font-mono font-black ${ins.score < 80 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            %{ins.score}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">Sistemde henüz kayıtlı saha denetimi bulunmamaktadır.</td>
                      </tr>
                    )
                  )}

                  {/* PERFORMANS */}
                  {selectedReportType === 'performans' && (
                    <>
                      <tr className="hover:bg-slate-50/20 transition-all">
                        <td className="py-3 px-4 font-bold text-slate-800">06 BKT 123</td>
                        <td className="py-3 px-4 text-blue-600 font-bold">HAT-A (Atatürk Lisesi)</td>
                        <td className="py-3 px-4 font-mono text-slate-400">Temmuz 2026</td>
                        <td className="py-3 px-4 italic text-slate-400">Gecikme Oranı: %0 • Hız İhlali: %0 • Sefer Tamamlama %100</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">%99.4 Performans</td>
                      </tr>
                      <tr className="hover:bg-slate-50/20 transition-all">
                        <td className="py-3 px-4 font-bold text-slate-800">06 BKT 456</td>
                        <td className="py-3 px-4 text-blue-600 font-bold">HAT-B (Cumhuriyet İlkokulu)</td>
                        <td className="py-3 px-4 font-mono text-slate-400">Temmuz 2026</td>
                        <td className="py-3 px-4 italic text-slate-400">Gecikme Oranı: %4 • Hız İhlali: %0 • Sefer Tamamlama %100</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-amber-600">%94.1 Performans</td>
                      </tr>
                    </>
                  )}

                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
