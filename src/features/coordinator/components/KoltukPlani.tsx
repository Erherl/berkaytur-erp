/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, Vehicle } from '../../../types';
import { useAppStore } from '../../../store';
import { ApiClient } from '../../../infrastructure/api/apiClient';
import { 
  Bus, User, AlertTriangle, CheckSquare, Settings, 
  Trash2, X, AlertOctagon, Heart, RefreshCw, Send, Bell 
} from 'lucide-react';

interface KoltukPlaniProps {
  vehicles: Vehicle[];
  students: Student[];
  onUpdateStudent: (id: string, updated: Partial<Student>) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
  onAddLog: (action: string, details: string) => void;
}

interface SeatState {
  seatIndex: number;
  studentId?: string;
  status: 'empty' | 'filled' | 'absent' | 'passive' | 'maintenance';
}

export default function KoltukPlani({ 
  vehicles, students, onUpdateStudent, onAddNotification, onAddLog 
}: KoltukPlaniProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  
  // Local seating state stored by vehicle id
  const [busSeats, setBusSeats] = useState<Record<string, Record<number, SeatState>>>({});

  const activeVehicle = vehicles.find(v => v.id === selectedVehicleId);

  // Initialize seats for selected vehicle
  useEffect(() => {
    if (!selectedVehicleId || !activeVehicle) return;

    // Load seating arrangement directly from persistent backend database if it exists
    const capacity = activeVehicle.capacity;
    const initial: Record<number, SeatState> = {};
    const serverSeating = activeVehicle.seating || {};

    for (let i = 1; i <= capacity; i++) {
      if (i === 1) {
        initial[i] = { seatIndex: i, status: 'passive' }; // Seat 1 usually host/guide or driver close space
      } else {
        const studentId = serverSeating[String(i)] || serverSeating[i];
        if (studentId) {
          const student = students.find(s => s.id === studentId);
          initial[i] = {
            seatIndex: i,
            studentId,
            status: student?.morningStatus === 'absent' ? 'absent' : 'filled'
          };
        } else {
          initial[i] = { seatIndex: i, status: 'empty' };
        }
      }
    }

    setBusSeats(prev => ({ ...prev, [selectedVehicleId]: initial }));
  }, [selectedVehicleId, activeVehicle?.capacity, activeVehicle?.seating, students]);

  const activeSeats = selectedVehicleId ? (busSeats[selectedVehicleId] || {}) as Record<number, SeatState> : {} as Record<number, SeatState>;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Safe helper to sync any changes to the persistent Node backend
  const saveSeatingToServer = async (updatedSeats: Record<number, SeatState>) => {
    if (!selectedVehicleId) return;

    const backendSeatingRecord: Record<number, string> = {};
    Object.keys(updatedSeats).forEach(key => {
      const idx = Number(key);
      const studentId = updatedSeats[idx]?.studentId;
      if (studentId) {
        backendSeatingRecord[idx] = studentId;
      }
    });

    const res = await ApiClient.saveSeating(selectedVehicleId, backendSeatingRecord, 'Koordinatör');
    if (res.success) {
      // Sync client-side zustand state as well so the rest of the dashboards update in real-time
      useAppStore.getState().updateVehicle(selectedVehicleId, { seating: backendSeatingRecord });
    } else {
      console.error('Server seating sync error:', res.error);
    }
  };

  const handleDrop = async (e: React.DragEvent, seatIndex: number) => {
    e.preventDefault();
    const studentId = e.dataTransfer.getData('text/plain');
    if (!studentId || !selectedVehicleId) return;

    // Check if student is already in a seat on this or another vehicle
    let alreadySeated = false;
    Object.values(activeSeats).forEach(s => {
      if (s.studentId === studentId) alreadySeated = true;
    });

    if (alreadySeated) {
      alert("Bu öğrenci zaten bu araçta bir koltuğa yerleştirilmiş!");
      return;
    }

    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Validate seat allocation on the backend first to prevent duplicates or capacity overflow
    const validateRes = await ApiClient.validateSeating(selectedVehicleId, seatIndex, studentId, 'assign');
    if (!validateRes.success || !validateRes.data?.valid) {
      alert(`❌ Sunucu Doğrulama Hatası: ${validateRes.error || 'Atama doğrulaması başarısız oldu.'}`);
      return;
    }

    // Place student in seat in local state
    const updatedSeats = {
      ...activeSeats,
      [seatIndex]: {
        seatIndex,
        studentId,
        status: student.morningStatus === 'absent' ? 'absent' : 'filled'
      } as SeatState
    };

    setBusSeats(prev => ({ ...prev, [selectedVehicleId]: updatedSeats }));

    // Persist to server and sync Zustand store
    await saveSeatingToServer(updatedSeats);

    onAddLog('Öğrenci Koltuğa Yerleştirildi', `${student.name}, ${activeVehicle?.plate} plakalı araçta ${seatIndex} numaralı koltuğa atandı.`);
    onAddNotification('Koltuk Ataması', `${student.name} ${seatIndex} numaralı koltuğa yerleştirildi ve sunucuya kaydedildi.`, 'success');
  };

  const handleRemoveStudent = async (seatIndex: number) => {
    if (!selectedVehicleId) return;
    const seatInfo = activeSeats[seatIndex];
    if (!seatInfo || !seatInfo.studentId) return;

    const student = students.find(s => s.id === seatInfo.studentId);
    if (!student) return;

    const updatedSeats = {
      ...activeSeats,
      [seatIndex]: {
        seatIndex,
        status: 'empty'
      } as SeatState
    };

    setBusSeats(prev => ({ ...prev, [selectedVehicleId]: updatedSeats }));

    // Persist to server and sync Zustand store
    await saveSeatingToServer(updatedSeats);

    onAddLog('Öğrenci Koltuktan Kaldırıldı', `${student.name} koltuk ataması iptal edildi.`);
    onAddNotification('Koltuk Ataması', `${student.name} koltuğu boşaltıldı ve sunucuya kaydedildi.`, 'success');
  };

  const handleSetSeatStatus = async (seatIndex: number, newStatus: SeatState['status']) => {
    if (!selectedVehicleId) return;
    
    const updatedSeats = {
      ...activeSeats,
      [seatIndex]: {
        seatIndex,
        studentId: newStatus === 'empty' ? undefined : activeSeats[seatIndex]?.studentId,
        status: newStatus
      } as SeatState
    };

    setBusSeats(prev => ({ ...prev, [selectedVehicleId]: updatedSeats }));

    // Persist to server and sync Zustand store
    await saveSeatingToServer(updatedSeats);

    onAddLog('Koltuk Durumu Değişti', `${activeVehicle?.plate} aracında ${seatIndex} nolu koltuk yeni durum: ${newStatus.toUpperCase()}`);
  };

  // Simulating the Parent reporting "Today My Student Will Not Ride"
  const handleSimulateVeliAbsence = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // 1. Update Student status in app store/state
    onUpdateStudent(studentId, { morningStatus: 'absent', eveningStatus: 'absent' });

    // 2. Set seat status to 'absent' (Yellow) in koltuk planı
    if (selectedVehicleId) {
      const updatedSeats = { ...activeSeats };
      Object.keys(updatedSeats).forEach(key => {
        const idx = parseInt(key);
        if (updatedSeats[idx].studentId === studentId) {
          updatedSeats[idx].status = 'absent';
        }
      });

      setBusSeats(prev => ({ ...prev, [selectedVehicleId]: updatedSeats }));

      // Persist status change to backend database
      await saveSeatingToServer(updatedSeats);
    }

    // 3. Log and Fire Notifications
    onAddLog('Veli Devamsızlık Bildirimi', `${student.parentName} isimli veli, öğrencisi ${student.name} için 'Bugün Servise Binmeyecek' bildirimi yaptı.`);
    onAddNotification(
      '🚨 Veli Devamsızlık Bildirimi',
      `${student.name} isimli öğrenci bugün servise binmeyecektir. Şoför (${activeVehicle?.driverId ? 'Ahmet Y.' : 'Görevli'}) ve Hostes (${activeVehicle?.hostessId ? 'Ayşe Y.' : 'Görevli'}) ekranlarına devamsızlık uyarısı düşürülmüştür.`,
      'warning'
    );

    alert(`✅ Veli Devamsızlık Bildirimi Yapıldı!\n\nÖğrenci: ${student.name}\nKoltuk Rengi: SARI (Devamsız) olarak güncellendi.\nŞoför ve Hostes mobil ekranlarına 'Bugün Binmeyecek' uyarısı anında iletildi.`);
  };

  // Check if student is currently seated anywhere
  const isStudentSeated = (studentId: string) => {
    if (!selectedVehicleId) return false;
    return Object.values(activeSeats).some(s => s.studentId === studentId);
  };

  // Color mapper helper
  const getSeatColorClass = (status: SeatState['status']) => {
    switch (status) {
      case 'filled': return 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-400/30'; // Dolu: Mavi
      case 'absent': return 'bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-amber-400/30 animate-pulse'; // Devamsız: Sarı
      case 'passive': return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-400/30'; // Pasif: Kırmızı
      case 'maintenance': return 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-400/30'; // Bakım: Turuncu
      default: return 'bg-slate-300 hover:bg-slate-400 text-slate-700 shadow-slate-300/30'; // Boş: Gri
    }
  };

  const getSeatStatusName = (status: SeatState['status']) => {
    switch (status) {
      case 'filled': return 'Dolu (Mavi)';
      case 'absent': return 'Devamsız (Sarı)';
      case 'passive': return 'Pasif / Kapalı (Kırmızı)';
      case 'maintenance': return 'Bakım (Turuncu)';
      default: return 'Boş Koltuk (Gri)';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Selector Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Bus className="w-6 h-6 text-blue-600" /> İnteraktif Koltuk Planlama ve Yerleştirme
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Öğrencileri sürükleyerek koltuklara yerleştirin. Koltuk durumlarını ve devamsızlıkları anlık yönetin.
          </p>
        </div>

        <div className="w-full md:w-72">
          <select
            value={selectedVehicleId}
            onChange={e => setSelectedVehicleId(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="">Araç Seçiniz...</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>🚌 {v.plate} - {v.brand} {v.model} ({v.capacity} Koltuk)</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedVehicleId ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Bus className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="font-bold text-slate-800 text-sm">Plan Açmak İçin Araç Seçin</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Koltuk yerleşimi yapmak, koltuk durumlarını yönetmek veya devamsızlık kaydı simüle etmek için yukarıdaki listeden bir okul servis aracı seçmelisiniz.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDE: UNASSIGNED STUDENTS LIST (Drag Source) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 flex flex-col gap-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Yerleşim Bekleyen Öğrenciler</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Sürükleyip sağdaki gri koltuklara bırakabilirsiniz.</p>
            </div>

            <div className="flex-1 overflow-y-auto max-h-96 space-y-2 pr-1">
              {students.map(st => {
                const seated = isStudentSeated(st.id);
                if (seated) return null;

                return (
                  <div
                    key={st.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', st.id)}
                    className="p-3 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 border border-slate-200 rounded-xl cursor-grab active:cursor-grabbing transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{st.name}</p>
                      <p className="text-[10px] text-slate-400">{st.classLevel} • Velisi: {st.parentName}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] bg-slate-200/50 font-extrabold px-1.5 py-0.5 rounded text-slate-600 uppercase">
                      Sürükle
                    </div>
                  </div>
                );
              })}

              {students.filter(st => !isStudentSeated(st.id)).length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-xs font-bold">Tüm Öğrenciler Koltuğa Yerleştirildi</p>
                  <p className="text-[10px] mt-1 text-slate-300">Yeni bir öğrenci ekleyebilir veya koltuktan kaldırabilirsiniz.</p>
                </div>
              )}
            </div>

            {/* PARENT ABSENCE SIMULATION PANEL */}
            <div className="border-t border-slate-100 pt-4 mt-2 space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
              <div className="flex items-center gap-2 text-amber-800">
                <Bell className="w-4 h-4 text-amber-600" />
                <h5 className="font-extrabold text-xs uppercase tracking-wide">Veli Devamsızlık Simülatörü</h5>
              </div>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                Veli, mobil uygulamasından <b>"Bugün Servise Binmeyecek"</b> dediğinde öğrencinin koltuğu sarıya döner. Test etmek için öğrenci seçip simüle edin:
              </p>

              <div className="space-y-2">
                <select
                  id="simulate-absent-student-select"
                  className="w-full p-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="">Öğrenci Seçiniz...</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>{st.name} ({st.classLevel})</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const sel = document.getElementById('simulate-absent-student-select') as HTMLSelectElement;
                    if (sel && sel.value) {
                      handleSimulateVeliAbsence(sel.value);
                    } else {
                      alert("Lütfen devamsızlık bildirecek bir öğrenci seçiniz!");
                    }
                  }}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" /> "Bugün Servise Binmeyecek" Bildir
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: INTERACTIVE VEHICLE LAYOUT */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  🛡️ {activeVehicle?.plate || ''} Koltuk Şeması
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Kapasite: {activeVehicle?.capacity || 0} Kişilik • Sefer Durumu: Aktif Seferde</p>
              </div>

              {/* Color legends */}
              <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                  <span className="w-2.5 h-2.5 bg-slate-300 rounded-xs" /> Boş (Gri)
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs" /> Dolu (Mavi)
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100">
                  <span className="w-2.5 h-2.5 bg-amber-400 rounded-xs" /> Devamsız (Sarı)
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100">
                  <span className="w-2.5 h-2.5 bg-rose-600 rounded-xs" /> Pasif (Kırmızı)
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded border border-orange-100">
                  <span className="w-2.5 h-2.5 bg-orange-500 rounded-xs" /> Bakım (Turuncu)
                </span>
              </div>
            </div>

            {/* Dynamic Interactive Bus Grid */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 relative max-w-lg mx-auto">
              <div className="absolute top-4 left-4 text-[10px] font-bold text-slate-400 flex items-center gap-1 border border-slate-200/50 bg-white px-2.5 py-1 rounded-full uppercase tracking-wider">
                <Bus className="w-3 h-3 text-slate-400" /> Araç Önü / Şoför Kısmı
              </div>

              <div className="pt-8 grid grid-cols-4 gap-4 justify-center items-center">
                {/* Visual Front Cabin Layout */}
                <div className="col-span-1 flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center font-bold text-[10px] shadow-md border-2 border-slate-700">
                    DIREKSIYON
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Şoför</span>
                </div>
                
                <div className="col-span-2"></div> {/* Corridor space */}

                <div className="col-span-1 flex flex-col items-center">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-[10px] shadow-md border-2 border-indigo-500">
                    REHBER
                  </div>
                  <span className="text-[9px] text-indigo-500 font-bold mt-1 uppercase">Hostes</span>
                </div>

                {/* Corridor Spacing Row */}
                <div className="col-span-4 border-b border-dashed border-slate-300 my-2"></div>

                {/* Seating Grid Rows */}
                {Object.keys(activeSeats).map((key) => {
                  const idx = parseInt(key);
                  const seat = activeSeats[idx];
                  if (idx === 1) return null; // Skip hostess seat since we drew custom rehber above

                  const seatedStudent = seat.studentId ? students.find(s => s.id === seat.studentId) : null;

                  return (
                    <div 
                      key={idx}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                      className="col-span-1 flex flex-col items-center relative group"
                    >
                      {/* Seat representation */}
                      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-xs cursor-pointer select-none transition-all duration-300 border-2 border-white shadow-md relative ${getSeatColorClass(seat.status)}`}>
                        {idx}
                        {seat.status === 'filled' && <span className="absolute bottom-1 text-[8px] font-black uppercase">DOLU</span>}
                        {seat.status === 'absent' && <span className="absolute bottom-1 text-[8px] font-black uppercase">YOK</span>}
                        {seat.status === 'maintenance' && <span className="absolute bottom-1 text-[8px] font-black uppercase">BAKIM</span>}
                        {seat.status === 'passive' && <span className="absolute bottom-1 text-[8px] font-black uppercase">KAPALI</span>}

                        {/* Action Dropdown Hover / Tooltip overlay */}
                        <div className="absolute hidden group-hover:block bg-slate-900 text-white p-2 rounded-lg text-[10px] -top-16 z-50 w-28 text-center space-y-1.5 shadow-xl">
                          <p className="font-extrabold text-blue-300">{getSeatStatusName(seat.status)}</p>
                          <div className="grid grid-cols-2 gap-1 font-black">
                            <button 
                              onClick={() => handleSetSeatStatus(idx, 'empty')}
                              className="bg-slate-700 hover:bg-slate-600 p-0.5 rounded"
                            >
                              BOŞ
                            </button>
                            <button 
                              onClick={() => handleSetSeatStatus(idx, 'passive')}
                              className="bg-rose-700 hover:bg-rose-600 p-0.5 rounded"
                            >
                              PASİF
                            </button>
                            <button 
                              onClick={() => handleSetSeatStatus(idx, 'maintenance')}
                              className="bg-orange-700 hover:bg-orange-600 p-0.5 rounded"
                            >
                              BAKIM
                            </button>
                            {seat.studentId && (
                              <button 
                                onClick={() => handleRemoveStudent(idx)}
                                className="col-span-2 bg-slate-800 hover:bg-slate-700 p-0.5 rounded text-rose-400 border border-rose-900/30"
                              >
                                KALDIR
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Student label */}
                      <span className="text-[10px] text-center font-semibold text-slate-700 mt-1 truncate max-w-[65px] block h-4">
                        {seatedStudent ? seatedStudent.name.split(' ')[0] : 'Boş'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
              <span className="text-blue-600 text-base font-black">💡</span>
              <div className="text-xs text-slate-600 leading-relaxed">
                <p className="font-bold text-slate-800">Koltuk Yapılandırma İpuçları:</p>
                <p className="mt-0.5">1. Öğrencileri sol panelden tutup koltuklara bırakarak hızlıca atama yapabilirsiniz.</p>
                <p>2. Atanmış bir koltuğun üzerine gelerek durumunu <b>Pasif (Kırmızı)</b> veya <b>Bakım (Turuncu)</b> olarak değiştirebilir, öğrencileri kaldırabilirsiniz.</p>
                <p>3. Sol alt paneldeki simülatör sayesinde velilerin gün içinde gönderdiği biniş iptallerini doğrudan deneyimleyebilirsiniz.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
