/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student, Vehicle } from '../../../types';
import { User, ShieldAlert, Heart, Info, X, Check } from 'lucide-react';

interface BusSeatingPlanProps {
  vehicle: Vehicle;
  students: Student[];
  onAssignStudent: (studentId: string, seatIndex: number) => void;
  onRemoveStudent: (seatIndex: number) => void;
}

export default function BusSeatingPlan({ vehicle, students, onAssignStudent, onRemoveStudent }: BusSeatingPlanProps) {
  // Seat status/layout states for customized capacity
  const [seats, setSeats] = useState<Record<number, { studentId?: string; status: 'empty' | 'filled' | 'inactive' | 'maintenance' }>>({
    1: { studentId: 'st1', status: 'filled' },
    2: { studentId: 'st2', status: 'filled' },
    5: { status: 'inactive' },
    9: { status: 'maintenance' },
  });

  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({
    'st1': 'Ön sırada oturmalıdır, alerjik rinit hassasiyeti var.',
    'st2': 'Kardeşi ile aynı sırada oturmaktadır. Serviste uyur.',
    'st3': 'Tekerlekli sandalye rampası yakınında konumlandırılmalıdır.'
  });

  const [editingNote, setEditingNote] = useState('');

  // Sibling matching: find if any students are siblings
  const checkSibling = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return null;
    return students.find(s => s.id !== studentId && s.parentPhone === student.parentPhone);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, seatIndex: number) => {
    e.preventDefault();
    const studentId = e.dataTransfer.getData('text/plain');
    if (!studentId) return;

    setSeats(prev => ({
      ...prev,
      [seatIndex]: { studentId, status: 'filled' }
    }));
    onAssignStudent(studentId, seatIndex);

    // Toast/Alert message for Sibling matching
    const sibling = checkSibling(studentId);
    if (sibling) {
      alert(`ℹ️ Kardeş Öğrenci Tespiti! ${sibling.name} ile ${students.find(s => s.id === studentId)?.name} kardeşlerdir. Aynı sırada oturtulması önerilir.`);
    }
  };

  const handleSeatClick = (seatIndex: number) => {
    setSelectedSeat(seatIndex);
    const seatInfo = seats[seatIndex];
    if (seatInfo && seatInfo.studentId) {
      setEditingNote(customNotes[seatInfo.studentId] || '');
    } else {
      setEditingNote('');
    }
  };

  const saveNote = () => {
    if (selectedSeat !== null) {
      const seatInfo = seats[selectedSeat];
      if (seatInfo && seatInfo.studentId) {
        setCustomNotes(prev => ({
          ...prev,
          [seatInfo.studentId!]: editingNote
        }));
      }
    }
    setSelectedSeat(null);
  };

  const changeSeatStatus = (seatIndex: number, newStatus: 'empty' | 'inactive' | 'maintenance') => {
    setSeats(prev => ({
      ...prev,
      [seatIndex]: {
        ...prev[seatIndex],
        status: newStatus,
        studentId: newStatus !== 'empty' ? prev[seatIndex]?.studentId : undefined
      }
    }));
    if (newStatus !== 'empty') {
      onRemoveStudent(seatIndex);
    }
  };

  const currentStudent = selectedSeat !== null && seats[selectedSeat]?.studentId 
    ? students.find(s => s.id === seats[selectedSeat].studentId)
    : null;

  // Render a responsive, 100% realistic bus seat layout
  const rows = Math.ceil((vehicle.capacity - 2) / 3); // 1 driver, 1 hostess, rest are 1 + 2 per row
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
      {/* Unassigned Students List (Drag Source) */}
      <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
        <div className="border-b border-slate-200 pb-2">
          <h4 className="font-bold text-slate-800 text-sm">Atama Bekleyen Öğrenciler</h4>
          <p className="text-[10px] text-slate-400">Öğrencileri sürükleyip koltuklara bırakabilirsiniz.</p>
        </div>
        <div className="flex-1 overflow-y-auto max-h-96 space-y-2">
          {students.map(st => {
            // Check if already assigned
            const isAssigned = (Object.values(seats) as any[]).some(s => s && s.studentId === st.id);
            if (isAssigned) return null;
            
            return (
              <div
                key={st.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', st.id)}
                className="p-3 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl cursor-grab active:cursor-grabbing transition-all flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-slate-800">{st.name}</p>
                  <p className="text-[10px] text-slate-400">{st.schoolName} • Sınıf: {st.classLevel}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] bg-slate-100 font-bold px-1.5 py-0.5 rounded text-slate-500">
                  <User className="w-3 h-3" /> Sürükle
                </div>
              </div>
            );
          })}
          {students.filter(st => !(Object.values(seats) as any[]).some(s => s && s.studentId === st.id)).length === 0 && (
            <div className="text-center py-12 text-slate-400">
              Atama bekleyen öğrenci bulunmamaktadır.
            </div>
          )}
        </div>
      </div>

      {/* Realistic Bus Seat Layout Grid (Drag Target) */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center">
        <div className="mb-4 text-center">
          <h4 className="font-bold text-slate-800 text-sm">Gerçekçi Okul Servis Planı</h4>
          <p className="text-[10px] text-slate-400">Kapasite: {vehicle.capacity} Kişilik • {vehicle.plate}</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 justify-center text-[10px] font-bold">
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300 block" /> Boş</div>
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-blue-600 block" /> Dolu</div>
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-rose-600 block" /> Pasif (Kilitli)</div>
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-amber-500 block" /> Bakımda</div>
        </div>

        {/* The Bus Frame */}
        <div className="w-full max-w-[340px] bg-slate-100 rounded-t-[50px] rounded-b-2xl border-4 border-slate-400 p-4 shadow-lg relative">
          {/* Front Windshield Line */}
          <div className="absolute top-8 left-0 right-0 h-1.5 bg-slate-300 rounded-full mx-6" />

          {/* Row 1: Driver (Left) and Hostess (Right) */}
          <div className="grid grid-cols-3 gap-3 mb-8 pt-4">
            {/* Driver Column */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold text-slate-400 mb-1">ŞOFÖR</span>
              <div className="w-11 h-11 bg-slate-800 text-white rounded-xl flex items-center justify-center font-black shadow-md">
                👨✈️
              </div>
            </div>

            {/* Aisle */}
            <div className="flex items-center justify-center text-[9px] text-slate-400 font-bold">KORİDOR</div>

            {/* Hostess Column */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold text-slate-400 mb-1">HOSTES</span>
              <div className="w-11 h-11 bg-purple-600 text-white rounded-xl flex items-center justify-center font-black shadow-md">
                👩
              </div>
            </div>
          </div>

          {/* Rows of Seating (Left: Single seat, Right: Double seats) */}
          <div className="space-y-4">
            {Array.from({ length: rows }).map((_, rIdx) => {
              const seatLeft = 3 + rIdx * 3;
              const seatRight1 = 3 + rIdx * 3 + 1;
              const seatRight2 = 3 + rIdx * 3 + 2;

              return (
                <div key={rIdx} className="grid grid-cols-3 gap-3">
                  {/* Single Seat (Left Column) */}
                  <div
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, seatLeft)}
                    onClick={() => handleSeatClick(seatLeft)}
                    className={`h-11 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all ${
                      seats[seatLeft]?.status === 'filled'
                        ? 'bg-blue-600 border-blue-700 text-white font-bold'
                        : seats[seatLeft]?.status === 'inactive'
                        ? 'bg-rose-600 border-rose-700 text-white'
                        : seats[seatLeft]?.status === 'maintenance'
                        ? 'bg-amber-500 border-amber-600 text-white'
                        : 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-600'
                    }`}
                  >
                    <span className="text-[9px] font-mono">No: {seatLeft}</span>
                    {seats[seatLeft]?.status === 'filled' && (
                      <span className="text-[8px] truncate max-w-[60px]">
                        {students.find(s => s.id === seats[seatLeft]?.studentId)?.name.split(' ')[0]}
                      </span>
                    )}
                  </div>

                  {/* Aisle */}
                  <div className="flex items-center justify-center text-[8px] text-slate-300 font-mono">
                    Sıra {rIdx + 1}
                  </div>

                  {/* Double Seats (Right Column) */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {[seatRight1, seatRight2].map(seatIndex => (
                      <div
                        key={seatIndex}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, seatIndex)}
                        onClick={() => handleSeatClick(seatIndex)}
                        className={`h-11 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all ${
                          seats[seatIndex]?.status === 'filled'
                            ? 'bg-blue-600 border-blue-700 text-white font-bold'
                            : seats[seatIndex]?.status === 'inactive'
                            ? 'bg-rose-600 border-rose-700 text-white'
                            : seats[seatIndex]?.status === 'maintenance'
                            ? 'bg-amber-500 border-amber-600 text-white'
                            : 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-600'
                        }`}
                      >
                        <span className="text-[8px] font-mono">No: {seatIndex}</span>
                        {seats[seatIndex]?.status === 'filled' && (
                          <span className="text-[8px] truncate max-w-[32px]">
                            {students.find(s => s.id === seats[seatIndex]?.studentId)?.name.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Rear Row of 4 Seats (En arka 4 kişilik koltuk) */}
            <div className="pt-2 border-t border-slate-300 mt-4">
              <span className="block text-center text-[8px] font-bold text-slate-400 mb-1">EN ARKA BEŞLİ/DÖRTLÜ SIRA</span>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, idx) => {
                  const rearSeatIndex = vehicle.capacity - 3 + idx;
                  return (
                    <div
                      key={rearSeatIndex}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, rearSeatIndex)}
                      onClick={() => handleSeatClick(rearSeatIndex)}
                      className={`h-11 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all ${
                        seats[rearSeatIndex]?.status === 'filled'
                          ? 'bg-blue-600 border-blue-700 text-white font-bold'
                          : seats[rearSeatIndex]?.status === 'inactive'
                          ? 'bg-rose-600 border-rose-700 text-white'
                          : seats[rearSeatIndex]?.status === 'maintenance'
                          ? 'bg-amber-500 border-amber-600 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-600'
                      }`}
                    >
                      <span className="text-[8px] font-mono">No: {rearSeatIndex}</span>
                      {seats[rearSeatIndex]?.status === 'filled' && (
                        <span className="text-[8px] truncate max-w-[40px]">
                          {students.find(s => s.id === seats[rearSeatIndex]?.studentId)?.name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seat Configurator Modal / Detail Panel */}
      {selectedSeat !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[2000] animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Koltuk No {selectedSeat} Ayarları
              </h3>
              <button onClick={() => setSelectedSeat(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seat Condition */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Koltuk Durumu Değiştir</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => changeSeatStatus(selectedSeat, 'empty')}
                  className={`py-2 px-3 rounded-xl font-bold text-center border transition-all ${
                    !seats[selectedSeat] || seats[selectedSeat].status === 'empty' || seats[selectedSeat].status === 'filled'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  🟢 Aktif / Boş
                </button>
                <button
                  onClick={() => changeSeatStatus(selectedSeat, 'inactive')}
                  className={`py-2 px-3 rounded-xl font-bold text-center border transition-all ${
                    seats[selectedSeat]?.status === 'inactive'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  🔴 Kilitli (Pasif)
                </button>
                <button
                  onClick={() => changeSeatStatus(selectedSeat, 'maintenance')}
                  className={`py-2 px-3 rounded-xl font-bold text-center border transition-all ${
                    seats[selectedSeat]?.status === 'maintenance'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  🟠 Bakımda
                </button>
              </div>
            </div>

            {/* Student Details If Filled */}
            {currentStudent ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-base">
                    👨🎓
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-800 text-sm">{currentStudent.name}</h5>
                    <p className="text-[10px] text-slate-400">{currentStudent.schoolName} • Sınıf: {currentStudent.classLevel}</p>
                  </div>
                </div>

                <div className="text-[10px] space-y-1 text-slate-600 font-medium">
                  <div className="flex justify-between"><span>Veli Adı:</span><span className="font-bold text-slate-800">{currentStudent.parentName}</span></div>
                  <div className="flex justify-between"><span>Veli Tel:</span><span className="font-bold text-slate-800 font-mono">{currentStudent.parentPhone}</span></div>
                  <div className="flex justify-between"><span>Okul Giriş / Çıkış:</span><span className="font-bold text-slate-800">08:30 / 16:00</span></div>
                  {checkSibling(currentStudent.id) && (
                    <div className="mt-1.5 p-1 px-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold flex items-center gap-1 text-[9px]">
                      <Heart className="w-3 h-3 fill-emerald-700" /> Sitede Kardeşi Var: {checkSibling(currentStudent.id)?.name}
                    </div>
                  )}
                </div>

                {/* Sibling warning or matching helper */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Özel Öğrenci Notu</label>
                  <textarea
                    rows={2}
                    value={editingNote}
                    onChange={(e) => setEditingNote(e.target.value)}
                    placeholder="Sürücü ve rehber personelin görebileceği not ekleyin..."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      onRemoveStudent(selectedSeat);
                      setSeats(prev => {
                        const updated = { ...prev };
                        delete updated[selectedSeat];
                        return updated;
                      });
                      setSelectedSeat(null);
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold cursor-pointer"
                  >
                    Koltuktan Çıkar
                  </button>
                  <button
                    onClick={saveNote}
                    className="px-4 py-1.5 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Notu Kaydet
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                Bu koltuk şu anda boş durumdadır. Öğrenci atamak için atama bekleyen öğrencileri sürükleyip bırakabilirsiniz.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
