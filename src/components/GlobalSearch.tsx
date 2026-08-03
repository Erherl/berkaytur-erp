/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Search, X, Users, BookOpen, Bus, MapPin, ArrowRight, Server, Laptop, RefreshCw } from 'lucide-react';
import { ApiClient } from '../infrastructure/api/apiClient';

interface GlobalSearchProps {
  onNavigateToTab?: (tabId: string) => void;
}

export default function GlobalSearch({ onNavigateToTab }: GlobalSearchProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'server' | 'local'>('server');
  const [serverResults, setServerResults] = useState<any>({ students: [], schools: [], routes: [], vehicles: [] });
  const [loading, setLoading] = useState(false);
  const { students, schools, routes, vehicles, users } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard listener for "/" shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced server-side search API trigger
  useEffect(() => {
    if (searchMode !== 'server' || !query.trim()) {
      setServerResults({ students: [], schools: [], routes: [], vehicles: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      const res = await ApiClient.searchServerSide(query);
      if (res.success && res.data) {
        setServerResults(res.data);
      }
      setLoading(false);
    }, 400); // 400ms server query debounce threshold

    return () => clearTimeout(delayDebounce);
  }, [query, searchMode]);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white border border-slate-800 hover:border-blue-500 rounded-full py-2.5 px-4 shadow-2xl flex items-center gap-2 text-xs font-black transition-all group scale-100 hover:scale-105"
        title="Aramak için '/' tuşuna basın"
      >
        <Search className="w-4 h-4 text-blue-400 group-hover:rotate-12 transition-transform" />
        <span>Sistemde Ara</span>
        <span className="bg-slate-800 text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-700">/</span>
      </button>
    );
  }

  // Normalized local search query
  const cleanQuery = query.toLowerCase().trim();

  // Filter datasets (local cache mode)
  const filteredStudents = cleanQuery
    ? students.filter(s => s.name.toLowerCase().includes(cleanQuery) || s.schoolName.toLowerCase().includes(cleanQuery))
    : [];

  const filteredSchools = cleanQuery
    ? schools.filter(s => s.name.toLowerCase().includes(cleanQuery) || s.address.toLowerCase().includes(cleanQuery))
    : [];

  const filteredRoutes = cleanQuery
    ? routes.filter(r => r.name.toLowerCase().includes(cleanQuery))
    : [];

  const filteredVehicles = cleanQuery
    ? vehicles.filter(v => {
        const driver = users.find(u => u.id === v.driverId);
        return v.plate.toLowerCase().includes(cleanQuery) || (driver && driver.name.toLowerCase().includes(cleanQuery));
      })
    : [];

  // Determine active datasets based on Mode
  const activeStudents = searchMode === 'server' ? serverResults.students : filteredStudents;
  const activeSchools = searchMode === 'server' ? serverResults.schools : filteredSchools;
  const activeVehicles = searchMode === 'server' ? serverResults.vehicles : filteredVehicles;
  const activeRoutes = searchMode === 'server' ? serverResults.routes : filteredRoutes;

  const hasResults = 
    activeStudents.length > 0 || 
    activeSchools.length > 0 || 
    activeRoutes.length > 0 || 
    activeVehicles.length > 0;

  return (
    <div id="universal-global-search-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4 animate-fade-in text-xs font-medium">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        
        {/* Mode Switcher Header tab */}
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between">
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">ARAMA METODOLOJİSİ</span>
          <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setSearchMode('server')}
              className={`px-3 py-1 rounded-md text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                searchMode === 'server' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Server className="w-3 h-3 text-blue-400" /> Sunucu Tabanlı (GET API)
            </button>
            <button
              onClick={() => setSearchMode('local')}
              className={`px-3 py-1 rounded-md text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                searchMode === 'local' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Laptop className="w-3 h-3 text-amber-500" /> Yerel Önbellek (Offline Index)
            </button>
          </div>
        </div>

        {/* Search header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Search className="w-5 h-5 text-blue-600 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder={searchMode === 'server' ? "Kelimeyi girin, server-side debounced arama yapılsın..." : "Öğrenci adı, okul, plaka veya rota arayın..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-sm font-black text-slate-800 bg-transparent outline-none border-none placeholder-slate-400"
            />
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="font-extrabold text-slate-700">Yüksek Performanslı Sunucu Sorgusu</p>
              <p className="text-[10px] text-slate-400">NodeJS / Express arka planında kayıtlar eşleştiriliyor...</p>
            </div>
          ) : query === '' ? (
            <div className="text-center py-12 space-y-2">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-extrabold text-slate-700">Hızlı Global Arama ({searchMode === 'server' ? 'Server-Side' : 'Client-Side'})</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Sistem genelindeki tüm verilere hızlıca ulaşmak için harfleri tuşlayın. Çıkmak için <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono">ESC</kbd> tuşuna basabilirsiniz.
              </p>
            </div>
          ) : !hasResults ? (
            <div className="text-center py-12 space-y-2">
              <p className="font-extrabold text-slate-700">"{query}" İçin Sonuç Bulunmadı</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Lütfen arama terimlerini veya plaka/öğrenci ismini kontrol edip tekrar deneyin.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Students Results */}
              {activeStudents.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] text-slate-400 uppercase font-black tracking-wider flex items-center gap-1.5 px-2">
                    <Users className="w-3.5 h-3.5" /> Öğrenciler ({activeStudents.length})
                  </h4>
                  <div className="space-y-1">
                    {activeStudents.map((s: any) => (
                      <div key={s.id} className="flex justify-between items-center p-3 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-colors">
                        <div>
                          <p className="font-black text-slate-800 text-xs">{s.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{s.schoolName} • Sınıf: {s.classLevel || 'N/A'}</p>
                        </div>
                        <span className="text-[9px] bg-blue-50 text-blue-600 font-extrabold px-2 py-0.5 rounded-md border border-blue-100">
                          {s.routeName || 'Atanmamış'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schools Results */}
              {activeSchools.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] text-slate-400 uppercase font-black tracking-wider flex items-center gap-1.5 px-2">
                    <BookOpen className="w-3.5 h-3.5" /> Okullar ({activeSchools.length})
                  </h4>
                  <div className="space-y-1">
                    {activeSchools.map((sch: any) => (
                      <div key={sch.id} className="flex justify-between items-center p-3 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-colors">
                        <div>
                          <p className="font-black text-slate-800 text-xs">{sch.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{sch.address}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicles Results */}
              {activeVehicles.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] text-slate-400 uppercase font-black tracking-wider flex items-center gap-1.5 px-2">
                    <Bus className="w-3.5 h-3.5" /> Servis Araçları ({activeVehicles.length})
                  </h4>
                  <div className="space-y-1">
                    {activeVehicles.map((v: any) => {
                      const driver = users.find(u => u.id === v.driverId);
                      const hostess = users.find(u => u.id === v.hostessId);
                      const routeMatch = routes.find(r => r.vehicleId === v.id);
                      const studentCount = routeMatch ? students.filter(s => s.routeId === routeMatch.id).length : 0;
                      return (
                        <div key={v.id} className="flex justify-between items-center p-3 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-colors">
                          <div>
                            <p className="font-black text-slate-800 text-xs">{v.plate}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Sürücü: {driver ? driver.name : (v.driverId || 'Belirtilmemiş')} • Hostes: {hostess ? hostess.name : (v.hostessId || 'Belirtilmemiş')}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-600 font-mono font-bold">
                            {studentCount || 0} / {v.capacity || 16} Koltuk
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Routes Results */}
              {activeRoutes.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] text-slate-400 uppercase font-black tracking-wider flex items-center gap-1.5 px-2">
                    <MapPin className="w-3.5 h-3.5" /> Rotalar ({activeRoutes.length})
                  </h4>
                  <div className="space-y-1">
                    {activeRoutes.map((r: any) => (
                      <div key={r.id} className="flex justify-between items-center p-3 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-colors">
                        <div>
                          <p className="font-black text-slate-800 text-xs">{r.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Durum: {r.status === 'morning_active' ? 'Sabah Seferi Aktif' : r.status === 'evening_active' ? 'Akşam Seferi Aktif' : 'Sefer Tamamlandı / Boşta'}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal footer shortcut guide */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold font-mono">
          <span>Kapatmak için ESC basabilirsiniz</span>
          <span className="text-blue-600">Berkaytur Genel Arama Motoru</span>
        </div>
      </div>
    </div>
  );
}
