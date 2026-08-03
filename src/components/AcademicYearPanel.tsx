/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Calendar, Archive, RefreshCw, Plus, CheckCircle, ChevronRight, PlayCircle } from 'lucide-react';

export default function AcademicYearPanel() {
  const { 
    academicYears, 
    activeAcademicYear, 
    setActiveAcademicYear, 
    archiveAndCloneToNewYear,
    addLog,
    students,
    schools,
    vehicles,
    routes
  } = useAppStore();

  const [newYear, setNewYear] = useState('');
  const [cloneSource, setCloneSource] = useState(activeAcademicYear);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneSuccess, setCloneSuccess] = useState(false);

  const handleCreateYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYear.trim()) return;
    if (academicYears.includes(newYear)) {
      alert('Bu akademik yıl zaten mevcut!');
      return;
    }
    
    // Simply switch to it or add log
    setActiveAcademicYear(newYear);
    addLog('Yeni Akademik Yıl', `Yeni çalışma dönemi oluşturuldu: ${newYear}`);
    setNewYear('');
  };

  const handleCloneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cloneSource === newYear) {
      alert('Kaynak ve hedef dönem aynı olamaz!');
      return;
    }

    const targetYear = `${newYear.trim()}`;
    if (!targetYear) {
      alert('Lütfen geçerli bir hedef akademik yıl giriniz (Örn: 2026-2027)');
      return;
    }

    setIsCloning(true);
    setCloneSuccess(false);

    setTimeout(() => {
      archiveAndCloneToNewYear(cloneSource, targetYear);
      setIsCloning(false);
      setCloneSuccess(true);
      setNewYear('');
      
      setTimeout(() => setCloneSuccess(false), 4000);
    }, 1200);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide">
            ARŞİVLEME VE PLANLAMA
          </span>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-1.5">Akademik Yıl Yönetimi</h3>
          <p className="text-xs text-slate-500">Çalışma dönemlerini yönetin, arşivleyin ve yeni eğitim yılına otomatik veri aktarımı yapın.</p>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>Aktif Dönem: {activeAcademicYear}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Academic Year Switcher */}
        <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-200/60 space-y-4">
          <div className="flex items-center gap-2">
            <Archive className="w-4.5 h-4.5 text-slate-600" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Dönem Değiştir / Arşiv</h4>
          </div>
          
          <p className="text-xs text-slate-500 leading-relaxed">
            Sistemdeki tüm kayıtlar seçtiğiniz akademik yıla göre filtrelenir. Eski dönemler arşiv durumuna geçer ve silinmez.
          </p>

          <div className="space-y-2 pt-2">
            {academicYears.map((year) => {
              const isActive = year === activeAcademicYear;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => setActiveAcademicYear(year)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-slate-300'}`} />
                    <span>{year} Dönemi</span>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isActive ? 'Aktif' : 'Arşiv'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Open New Academic Year with Automated Cloner */}
        <div className="lg:col-span-2 bg-slate-50/50 rounded-2xl p-5 border border-slate-200/60 space-y-5">
          <div className="flex items-center gap-2">
            <Plus className="w-4.5 h-4.5 text-blue-600" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Yeni Dönem Aç ve Verileri Aktar</h4>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Yeni bir akademik yıl açarak mevcut okulları, araçları, şoförleri, hostesleri ve öğrencileri tek tıkla yeni döneme kopyalayabilirsiniz.
          </p>

          <form onSubmit={handleCloneSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Mevcut Kaynak Dönem</label>
                <select
                  value={cloneSource}
                  onChange={(e) => setCloneSource(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {academicYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Açılacak Yeni Dönem</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 2026-2027"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Simulated checklist of resources to clone */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <p className="font-bold text-slate-700 border-b border-slate-100 pb-1.5 mb-2">Otomatik Aktarılacak Veri Özeti:</p>
              <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium">
                <div className="flex items-center gap-2">✅ Okul Bilgileri ({schools.length} Kayıt)</div>
                <div className="flex items-center gap-2">✅ Araçlar ve Plakalar ({vehicles.length} Kayıt)</div>
                <div className="flex items-center gap-2">✅ Şoför & Hostes Kadrosu</div>
                <div className="flex items-center gap-2">✅ Öğrenci Roster Listesi ({students.length} Öğrenci)</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {cloneSuccess && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold animate-pulse">
                  <CheckCircle className="w-4 h-4" /> Yeni dönem başarıyla aktarıldı ve aktif edildi!
                </span>
              )}
              <button
                type="submit"
                disabled={isCloning}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
              >
                {isCloning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Veriler Yeni Döneme Kopyalanıyor...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    Yeni Yılı Aç ve Verileri Kopyala
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Info Notice card */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3.5">
        <div className="p-2 bg-blue-100 rounded-xl text-blue-700 mt-0.5">
          <Archive className="w-4 h-4" />
        </div>
        <div className="text-xs text-blue-800 space-y-1">
          <p className="font-extrabold uppercase tracking-wider">Arşivleme Güvencesi</p>
          <p className="font-medium leading-relaxed">
            Berkaytur ERP sistemindeki akademik yıl planlayıcı, geçmiş dönemlere ait hiçbir fatura, yoklama veya ödeme verisinin kaybolmamasını garanti eder. İhtiyacınız olduğunda soldaki dönem değiştiriciyi kullanarak anında geçmiş veritabanına geri dönebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
