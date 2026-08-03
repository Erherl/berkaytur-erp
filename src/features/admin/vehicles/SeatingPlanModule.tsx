/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../../store';
import { Student } from '../../../types';
import { 
  Grid, User, ShieldCheck, HelpCircle, Users, Sparkles, 
  Settings, AlertCircle, Info, Heart, Award, EyeOff, Check, X,
  Trash2, Plus, Sliders
} from 'lucide-react';

interface SeatingPlanModuleProps {
  vehicleId: string;
  onChangeSeating?: (seating: Record<number, string>) => void;
  capacity?: number;
}

// Special needs records registry - authorized view only!
const SPECIAL_NEEDS: Record<string, { label: string; type: string }[]> = {
  'st1': [
    { label: 'Fındık Alerjisi', type: 'Alerji' },
    { label: 'Ön Koltuk Önerilir', type: 'Ön Koltuk' }
  ],
  'st4': [
    { label: 'Yalnız Bırakılamaz', type: 'Özel Teslim' }
  ],
  'st2': [
    { label: 'Ortopedik Destek', type: 'Engelli' },
    { label: 'Tekerlekli Sandalye Aparatı', type: 'Tekerlekli Sandalye' }
  ],
  'st3': [
    { label: 'Yüksek Hassasiyet', type: 'Otizm (Hafif)' }
  ]
};

// Map names to genders for balance suggestion helper
const STUDENT_GENDERS: Record<string, 'Kız' | 'Erkek'> = {
  'st1': 'Erkek', // Ali
  'st2': 'Kız',   // Ece
  'st3': 'Erkek', // Can
  'st4': 'Kız'    // Zeynep
};

// Seat attribute types
export type SeatAttribute = 'normal' | 'vip' | 'disabled' | 'broken' | 'backup' | 'sibling';

export default function SeatingPlanModule({ vehicleId, onChangeSeating, capacity = 19 }: SeatingPlanModuleProps) {
  const { students, currentUser, vehicles, updateVehicle } = useAppStore();
  
  // Find vehicle
  const currentVehicle = vehicles.find(v => v.id === vehicleId);
  const currentCapacity = currentVehicle?.capacity || capacity;
  
  // Seating plan state (local fallback if store doesn't have it, but we can update store!)
  const [localSeating, setLocalSeating] = useState<Record<number, string>>(
    (currentVehicle as any)?.seating || {
      1: 'st1',
      2: 'st2',
      5: 'st4'
    }
  );

  // Seat Special Attributes (e.g. seat 3 is VIP, seat 4 is Disabled)
  const [seatAttributes, setSeatAttributes] = useState<Record<number, SeatAttribute>>({
    1: 'sibling',
    5: 'sibling',
    3: 'vip',
    8: 'disabled',
    12: 'broken',
    15: 'backup'
  });

  // Controls & Settings
  const [activeSeatSelect, setActiveSeatSelect] = useState<number | null>(null);
  const [siblingMode, setSiblingMode] = useState(true);
  const [genderBalanceMode, setGenderBalanceMode] = useState(true);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [customCapacity, setCustomCapacity] = useState<string>('');
  const [customCapMode, setCustomCapMode] = useState(false);

  // Special Needs Authorization Check
  const isAuthorizedToViewSpecialNeeds = ['admin', 'manager', 'coordinator'].includes(currentUser?.role || '');

  // Sibling detector helper
  const findSibling = (studentId: string): Student | undefined => {
    const student = students.find(s => s.id === studentId);
    if (!student) return undefined;
    return students.find(s => s.id !== studentId && s.parentPhone === student.parentPhone);
  };

  // Get sibling seat location
  const getSiblingSeat = (studentId: string): number | null => {
    const sibling = findSibling(studentId);
    if (!sibling) return null;
    const foundSeat = Object.entries(localSeating).find(([_, id]) => id === sibling.id);
    return foundSeat ? parseInt(foundSeat[0]) : null;
  };

  // Drag and Drop handlers
  const handleDragStart = (studentId: string) => {
    setDraggedStudentId(studentId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (seatNo: number) => {
    if (!draggedStudentId) return;
    
    // Check if seat is broken or inactive
    if (seatAttributes[seatNo] === 'broken') {
      alert('⚠️ Bu koltuk arızalı/pasif durumdadır. Öğrenci atanamaz!');
      setDraggedStudentId(null);
      return;
    }

    // Assign student
    assignStudentToSeat(seatNo, draggedStudentId);
    setDraggedStudentId(null);
  };

  const assignStudentToSeat = (seatNo: number, studentId: string) => {
    const updated = { ...localSeating };
    
    // Remove student from any other seat they might have been in
    Object.keys(updated).forEach(key => {
      if (updated[parseInt(key)] === studentId) {
        delete updated[parseInt(key)];
      }
    });

    updated[seatNo] = studentId;
    setLocalSeating(updated);

    // Save in store if available
    if (currentVehicle) {
      updateVehicle(currentVehicle.id, {
        ...currentVehicle,
        seating: updated
      } as any);
    }
    
    if (onChangeSeating) {
      onChangeSeating(updated);
    }

    // Sibling detection and automatic seat suggestion triggers
    if (siblingMode) {
      const sibling = findSibling(studentId);
      if (sibling) {
        // Check if sibling is seated on this bus
        const siblingSeat = getSiblingSeat(studentId);
        if (siblingSeat) {
          const seatDiff = Math.abs(seatNo - siblingSeat);
          // Suggest same row (assuming rows are groups of 3/4)
          const sameRow = Math.floor((seatNo - 1) / 3) === Math.floor((siblingSeat - 1) / 3);
          if (!sameRow && seatDiff > 2) {
            alert(`ℹ️ Kardeş Atama Önerisi:\n${sibling.name} bu araçta ${siblingSeat}. koltukta oturuyor. Kardeşlerin aynı sırada veya yan yana oturması önerilir!`);
          }
        }
      }
    }
  };

  const removeStudentFromSeat = (seatNo: number) => {
    const updated = { ...localSeating };
    delete updated[seatNo];
    setLocalSeating(updated);

    if (currentVehicle) {
      updateVehicle(currentVehicle.id, {
        ...currentVehicle,
        seating: updated
      } as any);
    }

    if (onChangeSeating) {
      onChangeSeating(updated);
    }
  };

  const changeSeatAttribute = (seatNo: number, attr: SeatAttribute) => {
    setSeatAttributes(prev => ({
      ...prev,
      [seatNo]: attr
    }));
  };

  const handleAddCustomCapacity = (e: React.FormEvent) => {
    e.preventDefault();
    const cap = parseInt(customCapacity);
    if (cap > 0 && cap <= 60) {
      if (currentVehicle) {
        updateVehicle(currentVehicle.id, { capacity: cap });
      }
      setCustomCapMode(false);
      setCustomCapacity('');
    } else {
      alert('Kapasite 1 - 60 arasında olmalıdır.');
    }
  };

  // Grid layout generator for visual bus mapping
  const generateBusLayoutRows = () => {
    const rows: { type: 'row' | 'back' | 'front'; seats: { seatNo?: number; isAisle: boolean; isDriver?: boolean; isHostess?: boolean }[] }[] = [];
    
    // Front Row (Driver & Hostess)
    rows.push({
      type: 'front',
      seats: [
        { isDriver: true, isAisle: false },
        { isAisle: true },
        { isAisle: true },
        { isHostess: true, isAisle: false }
      ]
    });

    // Middle rows
    // Standard layouts: usually Left Single, Aisle, Right Double
    let remainingSeats = currentCapacity - (currentCapacity > 20 ? 5 : 4); // Keep last row separate
    let currentSeatNum = 1;

    while (remainingSeats > 0) {
      if (remainingSeats >= 3) {
        // Left seat (1), aisle, Right seats (2)
        rows.push({
          type: 'row',
          seats: [
            { seatNo: currentSeatNum++, isAisle: false },
            { isAisle: true },
            { seatNo: currentSeatNum++, isAisle: false },
            { seatNo: currentSeatNum++, isAisle: false }
          ]
        });
        remainingSeats -= 3;
      } else if (remainingSeats === 2) {
        rows.push({
          type: 'row',
          seats: [
            { seatNo: currentSeatNum++, isAisle: false },
            { isAisle: true },
            { isAisle: true },
            { seatNo: currentSeatNum++, isAisle: false }
          ]
        });
        remainingSeats -= 2;
      } else {
        rows.push({
          type: 'row',
          seats: [
            { isAisle: true },
            { isAisle: true },
            { isAisle: true },
            { seatNo: currentSeatNum++, isAisle: false }
          ]
        });
        remainingSeats -= 1;
      }
    }

    // Back Row (all seats across)
    const backSeatsCount = currentCapacity > 20 ? 5 : 4;
    const backRowSeats: { seatNo: number; isAisle: boolean }[] = [];
    for (let i = 0; i < backSeatsCount; i++) {
      if (currentSeatNum <= currentCapacity) {
        backRowSeats.push({ seatNo: currentSeatNum++, isAisle: false });
      }
    }
    
    rows.push({
      type: 'back',
      seats: backRowSeats.map(s => ({ ...s, isAisle: false }))
    });

    return rows;
  };

  const layoutRows = generateBusLayoutRows();

  // Seating Analysis Metrics
  const assignedStudentIds = Object.values(localSeating);
  const totalAssigned = assignedStudentIds.length;
  const occupancyRate = currentCapacity > 0 ? Math.round((totalAssigned / currentCapacity) * 100) : 0;
  const emptySeatsCount = currentCapacity - totalAssigned;
  const brokenSeatsCount = Object.entries(seatAttributes).filter(([seatNo, attr]) => parseInt(seatNo) <= currentCapacity && attr === 'broken').length;
  const backupSeatsCount = Object.entries(seatAttributes).filter(([seatNo, attr]) => parseInt(seatNo) <= currentCapacity && attr === 'backup').length;

  // Waiting students (students registered for this school route or in general, not seated on this vehicle)
  const schoolStudents = (currentVehicle as any)?.schoolId 
    ? students.filter(s => s.schoolId === (currentVehicle as any).schoolId)
    : students;
  
  const waitingStudents = schoolStudents.filter(s => !assignedStudentIds.includes(s.id));

  // Determine active seat student details
  const activeSeatStudent = activeSeatSelect ? students.find(s => s.id === localSeating[activeSeatSelect]) : null;
  const activeSeatAttr = activeSeatSelect ? (seatAttributes[activeSeatSelect] || 'normal') : 'normal';

  // Highlight helper for matching siblings during drag
  const isSiblingOfDragged = (studentId: string): boolean => {
    if (!draggedStudentId) return false;
    const sibling = findSibling(draggedStudentId);
    return sibling ? sibling.id === studentId : false;
  };

  return (
    <div className="space-y-6">
      {/* Upper Options & Smart Suggestions Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-600/30 text-blue-400 rounded-lg"><Sparkles className="w-5 h-5" /></span>
            <h4 className="font-extrabold text-sm tracking-tight">Akıllı Koltuk Öneri Motoru</h4>
          </div>
          <p className="text-xs text-slate-400 font-medium">Kardeş eşleştirme, kız/erkek dengesi ve özel ihtiyaç duyarlı yerleşim.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
          <label className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 px-3 py-2 rounded-xl border border-slate-700/50 cursor-pointer">
            <input 
              type="checkbox" 
              checked={siblingMode} 
              onChange={e => setSiblingMode(e.target.checked)} 
              className="rounded text-blue-500 focus:ring-0 w-4 h-4"
            />
            <span>Kardeş Yan Yana Modu</span>
          </label>

          <label className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 px-3 py-2 rounded-xl border border-slate-700/50 cursor-pointer">
            <input 
              type="checkbox" 
              checked={genderBalanceMode} 
              onChange={e => setGenderBalanceMode(e.target.checked)} 
              className="rounded text-blue-500 focus:ring-0 w-4 h-4"
            />
            <span>Kız/Erkek Alternatif Dengesi</span>
          </label>

          <button 
            onClick={() => setCustomCapMode(!customCapMode)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" /> Kapasite Değiştir
          </button>
        </div>
      </div>

      {customCapMode && (
        <form onSubmit={handleAddCustomCapacity} className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-xs font-bold animate-fade-in">
          <span className="text-amber-800">Özel Kapasite Değer Girin (1-60):</span>
          <input 
            type="number" 
            placeholder="Örn: 22" 
            value={customCapacity} 
            onChange={e => setCustomCapacity(e.target.value)} 
            className="p-2 border border-amber-300 bg-white rounded-lg w-24 text-center font-bold"
            required
          />
          <button type="submit" className="px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-black cursor-pointer">Kapasite Güncelle</button>
          <button type="button" onClick={() => setCustomCapMode(false)} className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 cursor-pointer">İptal</button>
        </form>
      )}

      {/* Main Grid: Left Side Seating layout, Right Side Info Panel & Waiting list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Interactive Real-Size Bus Layout Canvas */}
        <div className="lg:col-span-8 bg-slate-950 text-white rounded-3xl p-6 relative border border-slate-800 shadow-xl overflow-hidden">
          {/* Animated decorative cabin lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
          
          <div className="relative z-10 space-y-6">
            <div className="border-b border-slate-800/80 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">AŞAĞI YÖN (ÖN PANEL)</span>
                <span className="text-xs bg-slate-900 border border-slate-800 text-emerald-400 px-2.5 py-0.5 rounded-full font-mono font-bold">Kapı</span>
              </div>
              <div className="text-xs text-slate-400 font-bold font-mono">
                {currentVehicle?.plate || 'Test Plaka'} • {currentCapacity} Koltuklu Plan
              </div>
            </div>

            {/* Simulated realistic bus layout */}
            <div className="space-y-4 max-w-sm mx-auto bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50">
              {layoutRows.map((row, rowIdx) => (
                <div 
                  key={rowIdx} 
                  className={`grid ${row.type === 'back' ? 'grid-cols-5' : 'grid-cols-4'} gap-3 items-center justify-items-center`}
                >
                  {row.seats.map((seat, seatIdx) => {
                    if (seat.isAisle) {
                      return <div key={`aisle-${seatIdx}`} className="w-10 h-10" />; // Empty aisle
                    }

                    if (seat.isDriver) {
                      return (
                        <div key="driver-seat" className="w-14 h-14 bg-slate-800 border border-slate-700/80 rounded-2xl flex flex-col items-center justify-center text-slate-400 shadow-md">
                          <span className="text-lg">☸️</span>
                          <span className="text-[9px] font-bold">KAPTAN</span>
                        </div>
                      );
                    }

                    if (seat.isHostess) {
                      return (
                        <div key="hostess-seat" className="w-14 h-14 bg-blue-950 border border-blue-900/80 rounded-2xl flex flex-col items-center justify-center text-blue-300 shadow-md animate-pulse">
                          <span className="text-lg">🎙️</span>
                          <span className="text-[9px] font-bold">REHBER</span>
                        </div>
                      );
                    }

                    // Regular seat rendering
                    const seatNo = seat.seatNo!;
                    const studentId = localSeating[seatNo];
                    const student = students.find(s => s.id === studentId);
                    const attr = seatAttributes[seatNo] || 'normal';
                    
                    // Style indicators based on attributes
                    let attrBorder = 'border-slate-800 hover:border-slate-600 bg-slate-900/80 text-slate-400';
                    let badgeColor = 'bg-slate-800 text-slate-400';
                    let attrSymbol = '';

                    if (attr === 'vip') {
                      attrBorder = 'border-amber-500/50 hover:border-amber-400 bg-amber-950/20 text-amber-300';
                      badgeColor = 'bg-amber-500 text-slate-950';
                      attrSymbol = '⭐';
                    } else if (attr === 'disabled') {
                      attrBorder = 'border-purple-500/50 hover:border-purple-400 bg-purple-950/20 text-purple-300';
                      badgeColor = 'bg-purple-500 text-white';
                      attrSymbol = '♿';
                    } else if (attr === 'broken') {
                      attrBorder = 'border-rose-500/30 hover:border-rose-400/50 bg-rose-950/10 text-rose-400 line-through';
                      badgeColor = 'bg-rose-500 text-white';
                      attrSymbol = '⚠️';
                    } else if (attr === 'backup') {
                      attrBorder = 'border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20 text-cyan-300';
                      badgeColor = 'bg-cyan-500 text-slate-950';
                      attrSymbol = '🔄';
                    } else if (attr === 'sibling') {
                      attrBorder = 'border-pink-500/40 hover:border-pink-400 bg-pink-950/20 text-pink-300';
                      badgeColor = 'bg-pink-500 text-white';
                      attrSymbol = '❤️';
                    }

                    // Hover suggestions logic
                    const isSiblingDraggedHighlight = student && isSiblingOfDragged(student.id);

                    // Gender colors if filled
                    let studentBg = '';
                    if (student) {
                      const gender = STUDENT_GENDERS[student.id] || 'Erkek';
                      if (gender === 'Kız') {
                        studentBg = 'bg-rose-700/90 border-rose-500 text-white hover:bg-rose-600';
                      } else {
                        studentBg = 'bg-blue-700/90 border-blue-500 text-white hover:bg-blue-600';
                      }
                    }

                    return (
                      <div
                        key={`seat-${seatNo}`}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(seatNo)}
                        onClick={() => setActiveSeatSelect(seatNo)}
                        className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all border relative shadow-md ${
                          activeSeatSelect === seatNo 
                            ? 'bg-yellow-500 border-white ring-4 ring-yellow-400 text-slate-950 scale-105 z-20' 
                            : isSiblingDraggedHighlight
                              ? 'bg-pink-600 border-pink-300 ring-4 ring-pink-500 text-white animate-bounce scale-105 z-10'
                              : student 
                                ? studentBg 
                                : attrBorder
                        }`}
                        title={`Koltuk No: ${seatNo} - ${student ? student.name : 'Boş'}`}
                      >
                        <span className="text-[9px] font-black absolute top-1 left-1.5 opacity-55">N:{seatNo}</span>
                        {attrSymbol && <span className="text-[9px] absolute top-1 right-1.5">{attrSymbol}</span>}
                        
                        <span className="text-xs font-black truncate max-w-[48px] mt-2">
                          {student ? student.name.split(' ').map(n=>n[0]).join('') : 'Boş'}
                        </span>

                        {/* Sibling helper tag inside seat */}
                        {student && findSibling(student.id) && (
                          <span className="absolute -bottom-1 bg-pink-500 text-[8px] font-black px-1.5 rounded-full text-white scale-90 border border-slate-900">KARDEŞ</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800/80 pt-4 text-center">
              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">ARKA PANEL (DÖRT KİŞİLİK SIRA)</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Seat Assignment Control & Waiting list */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Active Seat Details Editor */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
              <Grid className="w-4 h-4 text-blue-600" /> Koltuk Düzenleme Paneli
            </h4>

            {activeSeatSelect ? (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-blue-800 text-sm">Seçilen Koltuk No: {activeSeatSelect}</p>
                    <p className="text-slate-400 font-bold mt-0.5 font-mono uppercase text-[9px]">Durum: {activeSeatStudent ? 'Dolu' : 'Boş'}</p>
                  </div>
                  {activeSeatStudent && (
                    <button 
                      onClick={() => removeStudentFromSeat(activeSeatSelect)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer"
                      title="Öğrenciyi Kaldır"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Seat Special Attribute Picker */}
                <div className="space-y-2">
                  <label className="block text-slate-500 font-extrabold uppercase text-[9px]">Koltuk Özel Niteliği:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['normal', 'vip', 'disabled', 'broken', 'backup', 'sibling'] as SeatAttribute[]).map(at => (
                      <button
                        key={at}
                        type="button"
                        onClick={() => changeSeatAttribute(activeSeatSelect, at)}
                        className={`py-1.5 rounded-lg border text-[10px] font-black uppercase transition-all ${
                          activeSeatAttr === at 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'hover:bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {at === 'normal' && 'Standart'}
                        {at === 'vip' && '⭐ VIP'}
                        {at === 'disabled' && '♿ Engelli'}
                        {at === 'broken' && '⚠️ Arızalı'}
                        {at === 'backup' && '🔄 Yedek'}
                        {at === 'sibling' && '❤️ Kardeş'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Select Student Dropdown Manual Assignment */}
                <div className="space-y-2">
                  <label className="block text-slate-500 font-extrabold uppercase text-[9px]">Öğrenci Seç:</label>
                  <select
                    value={localSeating[activeSeatSelect] || 'empty'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'empty') {
                        removeStudentFromSeat(activeSeatSelect);
                      } else {
                        assignStudentToSeat(activeSeatSelect, val);
                      }
                      setActiveSeatSelect(null);
                    }}
                    className="p-2.5 border bg-white rounded-xl w-full font-bold text-slate-800 shadow-inner"
                  >
                    <option value="empty">-- Koltuğu Boş Bırak --</option>
                    {schoolStudents.map(st => (
                      <option key={st.id} value={st.id}>{st.name} ({st.classLevel}) - {STUDENT_GENDERS[st.id] || 'Erkek'}</option>
                    ))}
                  </select>
                </div>

                {/* Student specific cards with Privileged Special Needs */}
                {activeSeatStudent && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <p className="font-extrabold text-slate-800 text-xs">{activeSeatStudent.name}</p>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-mono">No: {activeSeatStudent.studentNumber}</span>
                    </div>

                    {/* Sibling Warning panel inside card */}
                    {findSibling(activeSeatStudent.id) && (
                      <div className="p-2 bg-pink-50 rounded-lg text-[10px] border border-pink-100 text-pink-700 font-bold flex items-center gap-1.5 animate-pulse">
                        <Heart className="w-3.5 h-3.5 fill-pink-500 stroke-none" />
                        <span>Kardeşi ({findSibling(activeSeatStudent.id)?.name}) de bu okulda kayıttadır.</span>
                      </div>
                    )}

                    {/* Masked / Privileged view for Special Needs */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400">
                        <span>ÖZEL SAĞLIK & BULGULAR</span>
                        {isAuthorizedToViewSpecialNeeds ? (
                          <span className="text-emerald-600 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> YETKİLİ GÖRÜNÜMÜ</span>
                        ) : (
                          <span className="text-rose-500 flex items-center gap-1"><EyeOff className="w-3 h-3" /> KORUMALI VERİ</span>
                        )}
                      </div>

                      {isAuthorizedToViewSpecialNeeds ? (
                        <div className="space-y-1">
                          {SPECIAL_NEEDS[activeSeatStudent.id]?.map((nd, idx) => (
                            <div key={idx} className="p-1.5 bg-purple-50 text-purple-800 border border-purple-100 text-[10px] font-bold rounded-md flex items-center justify-between">
                              <span>• {nd.label}</span>
                              <span className="text-[8px] uppercase font-black bg-purple-200 px-1.5 rounded">{nd.type}</span>
                            </div>
                          )) || <p className="text-slate-400 italic font-medium py-1">Kayıtlı herhangi bir özel durum bulunmuyor.</p>}
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-100 text-slate-400 border rounded-md italic font-medium text-center">
                          Yönetmelik gereği özel durum bilgileri maskelenmiştir. Sadece yönetici/koordinatör görebilir.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setActiveSeatSelect(null)}
                  className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold cursor-pointer hover:bg-slate-800"
                >
                  Kapat
                </button>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 text-slate-400 italic text-center rounded-2xl border border-dashed border-slate-200 font-medium">
                Koltuk atamak, nitelik değiştirmek veya özel durumları görmek için soldaki koltuklardan birine tıklayın.
              </div>
            )}
          </div>

          {/* Occupancy and Analysis Graph/Report */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>📊 Koltuk Doluluk Analizi</span>
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-mono">{occupancyRate}% Dolu</span>
            </h4>

            {/* Simulated progress bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full transition-all duration-500 ${
                    occupancyRate > 90 ? 'bg-rose-500' : occupancyRate > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono">
                <span>0</span>
                <span>{currentCapacity} Kapasite</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
              <div className="p-2 bg-slate-50 rounded-lg flex justify-between items-center">
                <span className="text-slate-400">Dolu:</span>
                <span className="text-slate-800 font-black">{totalAssigned}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg flex justify-between items-center">
                <span className="text-slate-400">Boş:</span>
                <span className="text-slate-800 font-black">{emptySeatsCount}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg flex justify-between items-center">
                <span className="text-slate-400">Arızalı:</span>
                <span className="text-slate-800 font-black">{brokenSeatsCount}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg flex justify-between items-center">
                <span className="text-slate-400">Yedek:</span>
                <span className="text-slate-800 font-black">{backupSeatsCount}</span>
              </div>
            </div>
          </div>

          {/* Waiting list of Students for dragging (Drag & Drop Source) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2 flex justify-between items-center">
              <span className="flex items-center gap-1.5">👥 Atama Bekleyenler</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-black">{waitingStudents.length} Öğrenci</span>
            </h4>

            {waitingStudents.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {waitingStudents.map(st => {
                  const sibling = findSibling(st.id);
                  const gender = STUDENT_GENDERS[st.id] || 'Erkek';
                  return (
                    <div
                      key={st.id}
                      draggable
                      onDragStart={() => handleDragStart(st.id)}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing transition-all select-none"
                    >
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
                          {st.name} 
                          <span className={`text-[9px] px-1 rounded ${gender === 'Kız' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>{gender[0]}</span>
                        </p>
                        <p className="text-slate-400 text-[10px] font-bold">Okul: {st.schoolName} • Sınıf: {st.classLevel}</p>
                        
                        {sibling && (
                          <span className="inline-block text-[8px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-black mt-1">❤️ KARDEŞ: {sibling.name}</span>
                        )}
                      </div>
                      <span className="text-lg text-slate-400 select-none">☰</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 italic text-center py-4 font-medium">Yerleştirilmeyi bekleyen öğrenci bulunmuyor.</p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
