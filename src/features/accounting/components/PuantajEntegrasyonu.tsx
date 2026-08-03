/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../store';
import { DownloadService } from '../../../services/DownloadService';
import {
  Calendar as CalendarIcon, Check, X, ShieldAlert, Bus, HelpCircle,
  Clock, Save, AlertTriangle, CheckSquare, Settings, RefreshCw,
  FileSpreadsheet, FileText, ArrowRight, UserCheck, Phone, Info,
  Plus, Users, MessageSquare, Printer, Award, ThumbsUp
} from 'lucide-react';

interface SpareVehicleInfo {
  brand: string;
  plate: string;
  driver: string;
  hostess: string;
}

interface DayPuantaj {
  status: '0' | '0.5' | '1' | 'izin' | 'ariza' | 'gelmedi' | 'yedek';
  spareInfo?: SpareVehicleInfo;
  absentReason?: string;
}

// 15 July is Demokrasi ve Milli Birlik Günü (Turkish National Holiday)
const isPublicHoliday = (day: number, month: number) => {
  if (month === 6 && day === 15) return true; // July is index 6 (0-indexed)
  if (month === 4 && day === 1) return true;  // 1 May
  if (month === 4 && day === 19) return true; // 19 May
  if (month === 9 && day === 29) return true; // 29 Oct
  return false;
};

export default function PuantajEntegrasyonu() {
  const { vehicles, routes, schools, users, addLog } = useAppStore();

  // Active School, Month, and Year selection
  const [selectedSchoolId, setSelectedSchoolId] = useState(schools[0]?.id || 's1');
  const [selectedMonth, setSelectedMonth] = useState(6); // July (0-indexed)
  const [selectedYear, setSelectedYear] = useState(2026);

  // Load puantaj matrix
  const [puantajMatrix, setPuantajMatrix] = useState<Record<string, Record<string, Record<number, DayPuantaj>>>>(() => {
    const saved = localStorage.getItem('bkt_accounting_puantaj_matrix_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }

    // Seed initial data
    const initial: Record<string, Record<string, Record<number, DayPuantaj>>> = {};
    schools.forEach(sch => {
      initial[sch.id] = {};
      const schoolRoutes = routes.filter(r => r.schoolId === sch.id);
      
      schoolRoutes.forEach(r => {
        initial[sch.id][r.vehicleId] = {};
        for (let day = 1; day <= 31; day++) {
          const date = new Date(2026, 6, day); // July 2026
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const isHoliday = isPublicHoliday(day, 6);

          let status: DayPuantaj['status'] = '1';
          if (isWeekend) {
            status = '0';
          } else if (isHoliday) {
            status = 'izin';
          } else if (day === 8 && r.vehicleId === 'v1') {
            status = 'ariza'; // breakdown record
          } else if (day === 15 && r.vehicleId === 'v1') {
            status = 'yedek'; // spare vehicle record
          }

          initial[sch.id][r.vehicleId][day] = {
            status,
            absentReason: status === 'ariza' ? 'Arıza' : undefined,
            spareInfo: status === 'yedek' ? {
              brand: 'Isuzu',
              plate: '06 YDK 99',
              driver: 'Kamil Güneş',
              hostess: 'Selin Can'
            } : undefined
          };
        }
      });
    });
    localStorage.setItem('bkt_accounting_puantaj_matrix_v2', JSON.stringify(initial));
    return initial;
  });

  // Dialog/Modal states
  const [activeCell, setActiveCell] = useState<{ vehicleId: string; day: number } | null>(null);
  const [showSpareModal, setShowSpareModal] = useState(false);
  const [showAbsentModal, setShowAbsentModal] = useState(false);

  // Form states for spare vehicle
  const [spareBrand, setSpareBrand] = useState('Mercedes Sprinter');
  const [sparePlate, setSparePlate] = useState('06 YDK 99');
  const [spareDriver, setSpareDriver] = useState('Kemal Tekin');
  const [spareHostess, setSpareHostess] = useState('Melis Uzun');

  // Form states for absenteeism
  const [absentReason, setAbsentReason] = useState('Arıza');

  // Find school details
  const activeSchool = schools.find(s => s.id === selectedSchoolId) || schools[0];
  const projectManager = 'Mehmet Öz (Proje Müdürü)';
  
  // Find coordinator of selected school
  const schoolCoordinator = users.find(u => u.role === 'coordinator' && u.schoolId === selectedSchoolId)?.name || 'Canan Kaya (Okul Sorumlusu)';

  // Find routes of this school
  const schoolRoutes = routes.filter(r => r.schoolId === selectedSchoolId);

  // Get total days in month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  // Save matrix to local storage and log it
  const saveMatrix = (updated: Record<string, Record<string, Record<number, DayPuantaj>>>) => {
    setPuantajMatrix(updated);
    localStorage.setItem('bkt_accounting_puantaj_matrix_v2', JSON.stringify(updated));
  };

  // Cell status change handler
  const handleCellStatusSelect = (status: DayPuantaj['status']) => {
    if (!activeCell) return;
    const { vehicleId, day } = activeCell;

    const updated = { ...puantajMatrix };
    if (!updated[selectedSchoolId]) updated[selectedSchoolId] = {};
    if (!updated[selectedSchoolId][vehicleId]) updated[selectedSchoolId][vehicleId] = {};

    const existing = updated[selectedSchoolId][vehicleId][day] || { status: '0' };

    if (status === 'yedek') {
      // Open spare vehicle modal
      setShowSpareModal(true);
      return;
    } else if (status === 'gelmedi' || status === 'ariza') {
      // Open absent reason modal
      setAbsentReason(status === 'ariza' ? 'Arıza' : 'Şoför Gelmedi');
      setShowAbsentModal(true);
      return;
    }

    updated[selectedSchoolId][vehicleId][day] = {
      status,
      spareInfo: undefined,
      absentReason: undefined
    };

    saveMatrix(updated);
    setActiveCell(null);
    
    addLog(
      'Puantaj Değiştirildi',
      `${activeSchool.name} - Gün ${day}: Araç puantaj durumu "${status}" olarak güncellendi.`
    );
  };

  // Submit spare vehicle assignment
  const handleSpareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCell) return;
    const { vehicleId, day } = activeCell;

    const updated = { ...puantajMatrix };
    if (!updated[selectedSchoolId]) updated[selectedSchoolId] = {};
    if (!updated[selectedSchoolId][vehicleId]) updated[selectedSchoolId][vehicleId] = {};

    updated[selectedSchoolId][vehicleId][day] = {
      status: 'yedek',
      spareInfo: {
        brand: spareBrand,
        plate: sparePlate,
        driver: spareDriver,
        hostess: spareHostess
      }
    };

    saveMatrix(updated);
    setShowSpareModal(false);
    setActiveCell(null);

    addLog(
      'Yedek Araç Puantajı İşlendi',
      `${activeSchool.name} - Gün ${day}: ${sparePlate} plakalı yedek araç (${spareDriver} / ${spareHostess}) atandı.`
    );
  };

  // Submit absenteeism details
  const handleAbsentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCell) return;
    const { vehicleId, day } = activeCell;

    const updated = { ...puantajMatrix };
    if (!updated[selectedSchoolId]) updated[selectedSchoolId] = {};
    if (!updated[selectedSchoolId][vehicleId]) updated[selectedSchoolId][vehicleId] = {};

    const status: DayPuantaj['status'] = absentReason === 'Arıza' ? 'ariza' : 'gelmedi';

    updated[selectedSchoolId][vehicleId][day] = {
      status,
      absentReason
    };

    saveMatrix(updated);
    setShowAbsentModal(false);
    setActiveCell(null);

    addLog(
      'Puantaj Devamsızlık İşlendi',
      `${activeSchool.name} - Gün ${day}: Devamsızlık kaydedildi. Sebep: ${absentReason}`
    );
  };

  // Calculate stats for a vehicle
  const calculateVehicleWorkedDays = (vehicleId: string) => {
    const schoolData = puantajMatrix[selectedSchoolId] || {};
    const vehicleData = schoolData[vehicleId] || {};
    let worked = 0;
    Object.values(vehicleData).forEach((dayData: any) => {
      if (dayData && (dayData.status === '1' || dayData.status === 'yedek')) {
        worked += 1.0;
      } else if (dayData && dayData.status === '0.5') {
        worked += 0.5;
      }
    });
    return worked;
  };

  const handleLockPuantaj = () => {
    alert(`🎉 ${activeSchool.name} için Temmuz 2026 dönemi Puantaj Cetveli başarıyla Onaylandı ve Kilitlendi!\nHakediş hesaplamaları otomatik olarak muhasebe sayfasına aktarılmıştır.`);
    addLog(
      'Puantaj Kilitlendi',
      `${activeSchool.name} okulu için Temmuz 2026 dönemi puantaj cetveli onaylandı.`
    );
  };

  const handleDownloadExcel = () => {
    const headers = [
      'Güzergah',
      'Plaka',
      'Araç Markası',
      'Şoför',
      'Telefon',
      'Rehber Personel',
      'Tedarikçi',
      'Kapasite',
      ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1} Temmuz`),
      'Çalışılan Gün'
    ];

    const rows = schoolRoutes.map(r => {
      const vehicle = vehicles.find(v => v.id === r.vehicleId) || vehicles[0];
      const driver = users.find(u => u.id === r.driverId) || { name: 'Bilinmeyen Şoför', phone: '0555 111 22 33' };
      const hostess = users.find(u => u.id === r.hostessId) || { name: 'Bilinmeyen Hostes' };
      const workedDays = calculateVehicleWorkedDays(r.vehicleId);

      const daysData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dayData = (puantajMatrix[selectedSchoolId]?.[r.vehicleId]?.[day]) || { status: '0' };
        return getStatusText(dayData.status);
      });

      return [
        r.name,
        vehicle.plate,
        vehicle.brand || '',
        driver.name,
        driver.phone || '',
        hostess.name,
        'BERKAYTUR Tedarikçi Ortağı',
        `${vehicle.capacity} Kişi`,
        ...daysData,
        String(workedDays)
      ];
    });

    DownloadService.downloadCSV(
      headers,
      rows,
      `puantaj_${activeSchool.name.replace(/\s+/g, '_').toLowerCase()}_${selectedYear}_${selectedMonth + 1}.csv`
    );

    addLog(
      'Puantaj Excel İndirildi',
      `${activeSchool.name} okulu için Temmuz 2026 dönemi puantaj cetveli Excel olarak indirildi.`
    );
  };

  const getCellStyles = (status: DayPuantaj['status']) => {
    switch (status) {
      case '1':
        return 'bg-emerald-500 text-white border-emerald-600';
      case '0.5':
        return 'bg-amber-400 text-slate-900 border-amber-500';
      case 'izin':
        return 'bg-blue-500 text-white border-blue-600';
      case 'ariza':
        return 'bg-orange-500 text-white border-orange-600';
      case 'gelmedi':
        return 'bg-rose-600 text-white border-rose-700';
      case 'yedek':
        return 'bg-purple-600 text-white border-purple-700';
      default:
        return 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50';
    }
  };

  const getStatusText = (status: DayPuantaj['status']) => {
    switch (status) {
      case '1': return '1';
      case '0.5': return '0.5';
      case 'izin': return 'İzn';
      case 'ariza': return 'Arz';
      case 'gelmedi': return 'Gel';
      case 'yedek': return 'Ydk';
      default: return '0';
    }
  };

  return (
    <div id="excel-puantaj-system-module" className="space-y-6 animate-fade-in">
      
      {/* SYSTEM HEADER AND SCHOOL SELECTOR */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            OKUL SERVİS PUANTAJ SİSTEMİ
          </span>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Excel Tabanlı Puantaj Cetveli
          </h2>
          <p className="text-slate-400 text-xs font-semibold leading-normal">
            Her okul için ayrı puantaj oluşturulur. Sabah (0.5) ve Akşam (0.5) seferlerinin hakediş hesapları otomatik yapılır.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Okul:</span>
            <select
              value={selectedSchoolId}
              onChange={e => setSelectedSchoolId(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Dönem:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value={0}>Ocak</option>
              <option value={1}>Şubat</option>
              <option value={2}>Mart</option>
              <option value={3}>Nisan</option>
              <option value={4}>Mayıs</option>
              <option value={5}>Haziran</option>
              <option value={6}>Temmuz</option>
              <option value={7}>Ağustos</option>
              <option value={8}>Eylül</option>
              <option value={9}>Ekim</option>
              <option value={10}>Kasım</option>
              <option value={11}>Aralık</option>
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>
      </div>

      {/* DETAILED WORK SHEET HEADERS */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-xs font-semibold">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Okul Adı</span>
            <p className="text-sm font-black text-white">{activeSchool?.name}</p>
          </div>
          <div className="space-y-1 md:pl-4">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Proje Müdürü</span>
            <p className="text-sm font-bold text-slate-200">{projectManager}</p>
          </div>
          <div className="space-y-1 md:pl-4">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Okul Sorumlusu</span>
            <p className="text-sm font-bold text-slate-200">{schoolCoordinator}</p>
          </div>
          <div className="space-y-1 md:pl-4">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Ay / Yıl</span>
            <p className="text-sm font-bold text-emerald-400">Temmuz 2026</p>
          </div>
          <div className="space-y-1 md:pl-4 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Kilit Durumu</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 max-w-max mt-1">
              <Clock className="w-3.5 h-3.5" /> DÖNEM AÇIK (TASLAK)
            </span>
          </div>
        </div>
      </div>

      {/* EXCEL INTERACTIVE GRID */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xl shadow-slate-100/40">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
            Aylık Puantaj Matrisi (Excel Düzeni)
          </h3>
          <div className="flex flex-wrap gap-1.5 text-[10px] font-extrabold">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-500 border">0 = Boş (Hafta Sonu)</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500 text-white">1 = Tam Gün (Yeşil)</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-400 text-slate-900">0.5 = Yarım Gün (Sarı)</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500 text-white">İzin (Mavi)</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-500 text-white">Arıza (Turuncu)</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-600 text-white">Gelmedi (Kırmızı)</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-600 text-white">Yedek (Mor)</span>
          </div>
        </div>

        {/* Scrollable grid area */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-4 sticky left-0 bg-slate-50 z-10 w-48 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Güzergah Adı</th>
                <th className="py-4 px-4">Plaka</th>
                <th className="py-4 px-4">Tip</th>
                <th className="py-4 px-4">Şoför Adı</th>
                <th className="py-4 px-4">Telefon</th>
                <th className="py-4 px-4">Hostes Adı</th>
                <th className="py-4 px-4">Tedarikçi</th>
                <th className="py-4 px-4 text-center">Kapasite</th>
                
                {/* 1 to 31 columns */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const date = new Date(selectedYear, selectedMonth, day);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isHoliday = isPublicHoliday(day, selectedMonth);

                  return (
                    <th 
                      key={day} 
                      className={`py-2 text-center text-[10px] min-w-[32px] font-mono border-l border-slate-100 ${
                        isWeekend ? 'bg-slate-100 text-slate-400' : isHoliday ? 'bg-amber-50 text-amber-700 font-extrabold' : 'text-slate-600'
                      }`}
                      title={date.toLocaleDateString('tr-TR', { weekday: 'long' })}
                    >
                      <p className="leading-none">{day}</p>
                      <span className="text-[7px] tracking-none uppercase mt-0.5 block">
                        {date.toLocaleDateString('tr-TR', { weekday: 'short' }).slice(0, 3)}
                      </span>
                    </th>
                  );
                })}
                <th className="py-4 px-4 text-center bg-emerald-50 text-emerald-700 font-black">Ç.Gün</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
              {schoolRoutes.map(r => {
                const vehicle = vehicles.find(v => v.id === r.vehicleId) || vehicles[0];
                const driver = users.find(u => u.id === r.driverId) || { name: 'Bilinmeyen Şoför', phone: '0555 111 22 33' };
                const hostess = users.find(u => u.id === r.hostessId) || { name: 'Bilinmeyen Hostes' };
                const supplier = 'BERKAYTUR Tedarikçi Ortağı';
                const workedDays = calculateVehicleWorkedDays(r.vehicleId);

                return (
                  <tr key={r.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] max-w-[192px] truncate">
                      {r.name}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{vehicle.plate}</td>
                    <td className="py-3 px-4 text-slate-500 font-bold">{vehicle.brand}</td>
                    <td className="py-3 px-4 text-slate-700 font-bold">{driver.name}</td>
                    <td className="py-3 px-4 text-slate-400 font-bold font-mono text-[10px]">{driver.phone}</td>
                    <td className="py-3 px-4 text-slate-600">{hostess.name}</td>
                    <td className="py-3 px-4 text-[10px] text-slate-400 uppercase font-extrabold">{supplier}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{vehicle.capacity} Kişi</td>
                    
                    {/* Days cells */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const dayData = (puantajMatrix[selectedSchoolId]?.[r.vehicleId]?.[day]) || { status: '0' };
                      const date = new Date(selectedYear, selectedMonth, day);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                      return (
                        <td 
                          key={day} 
                          className={`p-0.5 border-l border-slate-100 text-center min-w-[32px] font-mono font-bold ${
                            isWeekend ? 'bg-slate-50/50' : ''
                          }`}
                        >
                          <button
                            onClick={() => {
                              setActiveCell({ vehicleId: r.vehicleId, day });
                            }}
                            className={`w-7 h-7 rounded-lg text-[9px] font-black flex items-center justify-center mx-auto transition-all cursor-pointer border ${getCellStyles(dayData.status)}`}
                            title={`Gün ${day} Temmuz: ${dayData.status === 'yedek' ? `Yedek Araç: ${dayData.spareInfo?.plate}` : dayData.absentReason || 'Seçim Yapın'}`}
                          >
                            {getStatusText(dayData.status)}
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-center font-mono font-black text-sm text-emerald-600 bg-emerald-50/50">
                      {workedDays}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* CELL VALUE SELECTOR FLOATER POPUP */}
        {activeCell && (
          <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-ping"></span>
              <span>
                Gün {activeCell.day} Puantaj Değerini Seçin ({vehicles.find(v => v.id === activeCell.vehicleId)?.plate}):
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleCellStatusSelect('1')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black shadow-xs cursor-pointer"
              >
                1 (Tam Gün / Yeşil)
              </button>
              <button
                onClick={() => handleCellStatusSelect('0.5')}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-[10px] font-black shadow-xs cursor-pointer"
              >
                0.5 (Yarım Gün / Sarı)
              </button>
              <button
                onClick={() => handleCellStatusSelect('0')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border rounded-xl text-[10px] font-black shadow-xs cursor-pointer"
              >
                0 (Çalışmadı / Beyaz)
              </button>
              <button
                onClick={() => handleCellStatusSelect('izin')}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-[10px] font-black shadow-xs cursor-pointer"
              >
                İzin (Mavi)
              </button>
              <button
                onClick={() => handleCellStatusSelect('ariza')}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black shadow-xs cursor-pointer"
              >
                Arıza (Turuncu)
              </button>
              <button
                onClick={() => handleCellStatusSelect('gelmedi')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black shadow-xs cursor-pointer"
              >
                Gelmedi (Kırmızı)
              </button>
              <button
                onClick={() => handleCellStatusSelect('yedek')}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black shadow-xs cursor-pointer"
              >
                Yedek Araç (Mor)
              </button>
              <button
                onClick={() => setActiveCell(null)}
                className="px-3 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-xl text-[10px] font-black cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-slate-400 text-[10px] font-extrabold uppercase flex items-center gap-1.5">
          <Info className="w-4 h-4 text-blue-500" />
          Her ay sonunda puantaj kilitlendiğinde hakediş hiyerarşisi otomatik hesaplanır.
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadExcel}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer border border-emerald-200/50 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx) İndir
          </button>
          <button
            onClick={handleLockPuantaj}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/15 cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Puantajı Onayla ve Kilitle
          </button>
        </div>
      </div>

      {/* YEDEK ARAÇ (SPARE VEHICLE) WINDOW / DIALOG MODAL */}
      {showSpareModal && activeCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSpareSubmit} className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full space-y-4 animate-scale-up">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                  <Bus className="w-4 h-4 text-purple-600" /> Gün {activeCell.day}: Yedek Araç Atama Cetveli
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">O gün sadece yedek araç çalışacaktır.</p>
              </div>
              <button type="button" onClick={() => setShowSpareModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
              Kadrolu aracın çalışamadığı bu gün için hizmet veren yedek aracın ve personelin bilgilerini giriniz. Hakediş otomatik olarak yeni araca ve şoföre yazılacaktır.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-600">
              <div className="space-y-1">
                <label>Yeni Araç Markası</label>
                <input
                  type="text"
                  required
                  value={spareBrand}
                  onChange={e => setSpareBrand(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  placeholder="Mercedes Sprinter"
                />
              </div>
              <div className="space-y-1">
                <label>Yeni Plaka</label>
                <input
                  type="text"
                  required
                  value={sparePlate}
                  onChange={e => setSparePlate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                  placeholder="06 YDK 99"
                />
              </div>
              <div className="space-y-1">
                <label>Yeni Şoför Adı</label>
                <input
                  type="text"
                  required
                  value={spareDriver}
                  onChange={e => setSpareDriver(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  placeholder="Kemal Tekin"
                />
              </div>
              <div className="space-y-1">
                <label>Yeni Hostes Adı</label>
                <input
                  type="text"
                  required
                  value={spareHostess}
                  onChange={e => setSpareHostess(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  placeholder="Melis Uzun"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSpareModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Yedek Aracı Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DEVAMSIZLIK (ABSENTEEISM REASON) WINDOW / DIALOG MODAL */}
      {showAbsentModal && activeCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAbsentSubmit} className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full space-y-4 animate-scale-up">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> Gün {activeCell.day}: Devamsızlık Nedeni
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Araç çalışmama gerekçesini belirtin.</p>
              </div>
              <button type="button" onClick={() => setShowAbsentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs font-bold text-slate-600">
              <label>Devamsızlık Sebebi Seçiniz</label>
              <select
                value={absentReason}
                onChange={e => setAbsentReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border rounded-xl"
              >
                <option value="Arıza">Arıza (Gider Kesintisi Olacak)</option>
                <option value="Şoför Gelmedi">Şoför Gelmedi (Eksik Gün)</option>
                <option value="Hostes Gelmedi">Hostes Gelmedi</option>
                <option value="Okul Tatili">Okul Tatili</option>
                <option value="Resmi Tatil">Resmi Tatil</option>
                <option value="Kar Tatili">Kar Tatili</option>
                <option value="Diğer">Diğer Sebepler</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAbsentModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Devamsızlığı İşle
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
