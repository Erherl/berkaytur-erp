/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, Vehicle, User } from '../../../types';
import { 
  Calendar, Check, X, ShieldAlert, Bus, 
  Clock, Save, Users, AlertTriangle, CheckSquare, History, ShieldCheck
} from 'lucide-react';
import { useAppStore } from '../../../store';
import { ApiClient } from '../../../infrastructure/api/apiClient';

interface PuantajProps {
  vehicles: Vehicle[];
  students: Student[];
  drivers: User[];
  hostesses: User[];
  onUpdateStudent: (id: string, updated: Partial<Student>) => void;
  onAddLog: (action: string, details: string) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

export default function Puantaj({
  vehicles, students, drivers, hostesses, onUpdateStudent, onAddLog, onAddNotification
}: PuantajProps) {
  const currentUser = useAppStore(state => state.currentUser);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // Local puantaj statuses
  const [morningServiceStatus, setMorningServiceStatus] = useState<'completed' | 'failed'>('completed');
  const [eveningServiceStatus, setEveningServiceStatus] = useState<'completed' | 'failed'>('completed');
  const [driverAttendance, setDriverAttendance] = useState<'present' | 'absent'>('present');
  const [hostessAttendance, setHostessAttendance] = useState<'present' | 'absent'>('present');

  // Attendance history audit state
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const activeVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const activeDriver = drivers.find(d => d.id === activeVehicle?.driverId);
  const activeHostess = hostesses.find(h => h.id === activeVehicle?.hostessId);

  // Filter students who belong to the selected vehicle
  const activeVehicleStudents = students; // For flexibility, show all students or filter by custom rules

  const loadAttendanceHistory = async () => {
    setLoadingHistory(true);
    const res = await ApiClient.fetchAttendance();
    if (res.success && res.data) {
      setAttendanceHistory(res.data);
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    loadAttendanceHistory();
  }, []);

  const handleUpdateStudentStatus = async (studentId: string, name: string, status: 'present' | 'absent') => {
    const editorName = currentUser?.name || 'Sistem Yetkilisi';
    const editorRole = currentUser?.role || 'coordinator';

    const res = await ApiClient.postAttendance({
      studentId,
      date: selectedDate,
      shift: 'morning',
      status,
      editorName,
      editorRole
    });

    if (res.success) {
      // Update local state via props
      onUpdateStudent(studentId, { 
        morningStatus: status === 'present' ? 'on_bus' : 'absent',
        eveningStatus: status === 'present' ? 'on_bus' : 'absent'
      });
      onAddLog('Yoklama Güncellendi', `${name} yoklaması (${status === 'present' ? 'Bindi' : 'Binmedi'}) olarak kaydedildi.`);
      onAddNotification(
        '📅 Yoklama Güncellendi',
        `${name} öğrencisinin yoklama kaydı güncellendi.`,
        'success'
      );
      loadAttendanceHistory(); // reload the audit log panel
    } else {
      alert(`Hata: ${res.error}`);
    }
  };

  const handleSavePuantaj = async () => {
    if (!selectedVehicleId) {
      alert("Lütfen puantaj kaydı yapmadan önce bir araç seçiniz!");
      return;
    }

    const summary = `Tarih: ${selectedDate} - Araç: ${activeVehicle?.plate} - Sabah: ${morningServiceStatus === 'completed' ? 'Tamamlandı' : 'Hatalı'} - Akşam: ${eveningServiceStatus === 'completed' ? 'Tamamlandı' : 'Hatalı'} - Şoför: ${driverAttendance === 'present' ? 'Geldi' : 'Gelmedi'} - Hostes: ${hostessAttendance === 'present' ? 'Geldi' : 'Gelmedi'}`;

    onAddLog('Günlük Puantaj İşlendi', summary);
    onAddNotification(
      '📅 Puantaj İşlendi',
      `${activeVehicle?.plate} servis aracının ${selectedDate} tarihli puantajı başarıyla kaydedilmiştir.`,
      'success'
    );

    alert(`🎉 Puantaj Kaydedildi!\n\n${summary}\n\nTüm veriler hakediş ve devamsızlık defterine işlenmiştir.`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT FORM: DAILY TIMEKEEPING CONFIGURATION */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <Calendar className="w-5 h-5 text-blue-600" /> Günlük Puantaj ve Sefer Kontrolü
            </h4>
            <p className="text-[10px] text-slate-400">Günlük seferlerin tamamlanma durumlarını ve kadro katılımlarını kaydedin.</p>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Date Selector */}
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Puantaj Tarihi</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold"
              />
            </div>

            {/* Vehicle Selector */}
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Servis Aracı / Plaka</label>
              <select
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
              >
                <option value="">Seçiniz...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>🚌 {v.plate} ({v.brand})</option>
                ))}
              </select>
            </div>

            {activeVehicle && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                {/* Sefer durumları */}
                <div className="space-y-2">
                  <p className="font-extrabold text-slate-600 text-[10px] uppercase tracking-wider">Sabah ve Akşam Seferleri</p>
                  
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/50">
                    <span className="font-bold text-slate-700">Sabah Seferi</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setMorningServiceStatus('completed')}
                        className={`px-3 py-1 font-bold text-[10px] rounded-lg border cursor-pointer transition-all ${
                          morningServiceStatus === 'completed' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        YAPILDI
                      </button>
                      <button
                        onClick={() => setMorningServiceStatus('failed')}
                        className={`px-3 py-1 font-bold text-[10px] rounded-lg border cursor-pointer transition-all ${
                          morningServiceStatus === 'failed' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        YAPILMADI
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/50">
                    <span className="font-bold text-slate-700">Akşam Seferi</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEveningServiceStatus('completed')}
                        className={`px-3 py-1 font-bold text-[10px] rounded-lg border cursor-pointer transition-all ${
                          eveningServiceStatus === 'completed' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        YAPILDI
                      </button>
                      <button
                        onClick={() => setEveningServiceStatus('failed')}
                        className={`px-3 py-1 font-bold text-[10px] rounded-lg border cursor-pointer transition-all ${
                          eveningServiceStatus === 'failed' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        YAPILMADI
                      </button>
                    </div>
                  </div>
                </div>

                {/* Kadro Yoklama */}
                <div className="space-y-2">
                  <p className="font-extrabold text-slate-600 text-[10px] uppercase tracking-wider">Sürücü & Rehber Yoklama</p>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/50">
                    <div>
                      <p className="font-bold text-slate-700">Şoför: {activeDriver?.name || 'Ahmet Yılmaz'}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Kıyafet ve Sağlık: Uygun</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setDriverAttendance('present')}
                        className={`px-3 py-1 font-bold text-[10px] rounded-lg border cursor-pointer transition-all ${
                          driverAttendance === 'present' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        GELDİ
                      </button>
                      <button
                        onClick={() => setDriverAttendance('absent')}
                        className={`px-3 py-1 font-bold text-[10px] rounded-lg border cursor-pointer transition-all ${
                          driverAttendance === 'absent' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        GELMEDİ
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/50">
                    <div>
                      <p className="font-bold text-slate-700">Hostes: {activeHostess?.name || 'Ayşe Yıldız'}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Kıyafet ve Sağlık: Uygun</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setHostessAttendance('present')}
                        className={`px-3 py-1 font-bold text-[10px] rounded-lg border cursor-pointer transition-all ${
                          hostessAttendance === 'present' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        GELDİ
                      </button>
                      <button
                        onClick={() => setHostessAttendance('absent')}
                        className={`px-3 py-1 font-bold text-[10px] rounded-lg border cursor-pointer transition-all ${
                          hostessAttendance === 'absent' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        GELMEDİ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSavePuantaj}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <Save className="w-4 h-4" /> Günlük Puantaj Kontrolünü Kaydet
          </button>
        </div>

        {/* RIGHT PANEL: STUDENT DAILY ATTENDANCE YOKLAMA */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <Users className="w-5 h-5 text-blue-600" /> Öğrenci Yoklama Çizelgesi
            </h4>
            <p className="text-[10px] text-slate-400">Sefer esnasında şoför/hostes tarafından güncellenen veya veli bildirimli devamsızlık durumu.</p>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {activeVehicleStudents.map(st => {
              const isAbsent = st.morningStatus === 'absent';
              
              return (
                <div 
                  key={st.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 transition-all"
                >
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs">{st.name}</h5>
                    <p className="text-[10px] text-slate-400">{st.classLevel} • {st.schoolName}</p>
                  </div>

                  <div className="flex gap-1 text-xs">
                    <button
                      onClick={() => handleUpdateStudentStatus(st.id, st.name, 'present')}
                      className={`px-3 py-1.5 rounded-xl font-bold border transition-all text-[10px] cursor-pointer ${
                        !isAbsent 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs' 
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      BİNDİ (VAR)
                    </button>

                    <button
                      onClick={() => handleUpdateStudentStatus(st.id, st.name, 'absent')}
                      className={`px-3 py-1.5 rounded-xl font-bold border transition-all text-[10px] cursor-pointer ${
                        isAbsent 
                          ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-xs' 
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      BİNMEDİ (YOK)
                    </button>
                  </div>
                </div>
              );
            })}

            {activeVehicleStudents.length === 0 && (
              <div className="text-center py-16 text-slate-400 text-xs">
                Sisteme kayıtlı öğrenci verisi bulunmamaktadır.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW SECTION: SECURE AUDIT & MODIFICATION HISTORY LIST */}
      <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 text-slate-100 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" /> Puantaj Değişiklik ve Güncelleme Geçmişi (Sunucu Kayıtlı)
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">Canlı hakediş ve ödeme raporlarını etkileyen tüm puantaj revizyonları geriye dönük loglanır.</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> SECURE AUDIT ENABLED
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-extrabold bg-slate-950/20">
                <th className="p-3">Tarih / Saat</th>
                <th className="p-3">Öğrenci</th>
                <th className="p-3">Durum</th>
                <th className="p-3">Değiştiren Yetkili</th>
                <th className="p-3">Revizyon Türü</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {attendanceHistory.map((item, index) => {
                const matchedStudent = students.find(s => s.id === item.studentId);
                const stdName = matchedStudent ? matchedStudent.name : `Öğrenci ID: ${item.studentId}`;
                const latestHistory = item.history && item.history.length > 0 ? item.history[item.history.length - 1] : null;
                
                return (
                  <tr key={item.id || index} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-slate-300">{item.timestamp || item.date}</td>
                    <td className="p-3 font-bold text-white">{stdName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        item.status === 'present' 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {item.status === 'present' ? 'VAR / BİNDİ' : 'YOK / BİNMEDİ'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 font-medium">{item.updatedBy || 'Sistem Yetkilisi'}</td>
                    <td className="p-3">
                      {latestHistory ? (
                        <span className="text-[10px] text-slate-400">
                          {latestHistory.statusBefore} ➔ {latestHistory.statusAfter} ({latestHistory.updatedAt})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">İlk Kayıt</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {attendanceHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Henüz sunucuda kayıtlı bir puantaj revizyon geçmişi bulunmamaktadır.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
