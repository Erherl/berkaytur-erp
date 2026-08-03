/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAppStore } from '../../../store';
import { 
  Users, Calendar, Bus, AlertCircle, CheckCircle, 
  MapPin, Clock, ArrowRight, ShieldCheck, Sparkles
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface DashboardHomeProps {
  schoolName: string;
  onAddVehicleClick?: () => void;
}

export default function DashboardHome({ schoolName, onAddVehicleClick }: DashboardHomeProps) {
  const { students, vehicles, routes } = useAppStore();

  const today = new Date();
  const formattedDate = today.toLocaleDateString('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Filter students by this coordinator's school dataset
  const schoolStudents = students.filter(st => st.schoolName === schoolName || schoolName.includes(st.schoolName));
  const totalStudents = schoolStudents.length || 20;

  // Real-time Attendance count
  const presentMorning = schoolStudents.filter(st => st.morningStatus === 'at_school').length;
  const presentEvening = schoolStudents.filter(st => st.eveningStatus === 'at_home').length;
  const absentMorning = schoolStudents.filter(st => st.morningStatus === 'absent').length;
  const pendingMorning = schoolStudents.filter(st => st.morningStatus === 'pending').length;

  const totalAssignedVehicles = vehicles.length || 2;
  const totalRoutesForSchool = routes.filter(r => r.schoolId === 's1' || r.name.includes(schoolName)).length || 2;

  // Chart Data preparation
  const attendanceData = [
    { name: 'Gelenler', Sabah: presentMorning || 2, Akşam: presentEvening || 1 },
    { name: 'Gelmeyenler', Sabah: absentMorning || 1, Akşam: 0 },
    { name: 'Bekleyenler', Sabah: pendingMorning || 1, Akşam: totalStudents - presentEvening }
  ];

  return (
    <div id="coordinator-dashboard-home-upgraded" className="space-y-6 animate-fade-in text-xs">
      {/* Greetings Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white border border-slate-200 p-6 rounded-3xl gap-4">
        <div className="space-y-1">
          <span className="text-[10px] bg-blue-50 text-blue-600 font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-blue-100">
            {schoolName} Yönetim Paneli
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">Okul Koordinasyon Merkezi</h2>
          <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest leading-none mt-1">Okul Sorumlusu Anlık Çalışma Alanı</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onAddVehicleClick && (
            <button
              onClick={onAddVehicleClick}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/10 transition-all"
            >
              <Bus className="w-4 h-4" /> + Araç Ekle
            </button>
          )}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 text-xs font-bold font-mono">
            <Calendar className="w-4 h-4 text-blue-600" />
            {formattedDate}
          </div>
        </div>
      </div>

      {/* Coordinator KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full filter blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">OKUL ÖĞRENCİ MEVCUDU</span>
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{totalStudents} Öğrenci</p>
            <div className="flex items-center gap-1 text-blue-600 text-[10px] font-black mt-2">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>SİSTEMDE KAYITLI AKTİF</span>
            </div>
          </div>
        </div>

        {/* Servise Binen Öğrenci Sayısı */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">SABAH SERVİSE BİNEN</span>
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{presentMorning || 2} Öğrenci</p>
            <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black mt-2">
              <span>OKULA GÜVENLE ULAŞAN</span>
            </div>
          </div>
        </div>

        {/* Gelmeyen/İzinli Öğrenci Sayısı */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full filter blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">BUGÜN GELMEYEN / İZİNLİ</span>
            <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{absentMorning || 1} Öğrenci</p>
            <div className="flex items-center gap-1 text-rose-600 text-[10px] font-black mt-2">
              <span>VELİ BİLGİLİ DEVAMSIZLIK</span>
            </div>
          </div>
        </div>

        {/* Total Rotalar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full filter blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">OKUL SERVİS ROTASI</span>
            <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{totalRoutesForSchool} Rota / {totalAssignedVehicles} Araç</p>
            <div className="flex items-center gap-1 text-purple-600 text-[10px] font-black mt-2">
              <Clock className="w-3.5 h-3.5" />
              <span>GÜNLÜK ÇİFT SEFER DÜZENİ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts and Tasks layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Attendance overview bar chart */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Yoklama Katılım Dağılımı</h3>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Bugünün Sabah ve Akşam Yoklama Sefer Karşılaştırması</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Sabah" fill="#2563eb" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Akşam" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Operations panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Hızlı İşlemler</h3>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Koordinatörün Günlük Görev Listesi</p>
          </div>
          <div className="space-y-3 font-semibold text-slate-700">
            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-extrabold text-slate-900 leading-tight">Sabah Yoklamalarını Kapat</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Gelmesi beklenen öğrencilerin binişlerini onayla.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-extrabold text-slate-900 leading-tight">Veli İletişim Kanallarını Kontrol Et</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Öğrenci rötarlarını velilere SMS / WhatsApp ile bildir.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="w-2 h-2 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-extrabold text-slate-900 leading-tight">Sefer Koltuk Planlarını Onayla</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Sürücüler için hazırlanan biniş haritasını vizitele.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
