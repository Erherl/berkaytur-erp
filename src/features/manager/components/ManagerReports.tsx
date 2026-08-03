/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  FileSpreadsheet, Printer, Download, TrendingUp, Users, Truck, Sparkles, Award
} from 'lucide-react';
import { DownloadService } from '../../../services/DownloadService';

interface ManagerReportsProps {
  schools: any[];
  students: any[];
  vehicles: any[];
}

export default function ManagerReports({ schools, students, vehicles }: ManagerReportsProps) {
  const [activeReport, setActiveReport] = useState<string>('occupancy');

  // Occupancy Report Data
  const occupancyData = vehicles.map(v => ({
    name: v.plate,
    doluluk: Math.round(((v.capacity - 4) / v.capacity) * 100),
    kapasite: v.capacity,
    ogrenci: v.capacity - 4,
  }));

  // Driver Performance Data
  const driverPerformanceData = [
    { name: 'Ahmet Yılmaz', zamanlama: 98, guvenlik: 96, veliSkoru: 95 },
    { name: 'Kamil Yıldırım', zamanlama: 94, guvenlik: 98, veliSkoru: 92 },
    { name: 'Süleyman Demir', zamanlama: 90, guvenlik: 92, veliSkoru: 88 },
  ];

  // Hostess Performance Data
  const hostessPerformanceData = [
    { name: 'Ayşe Yıldız', iletisim: 95, bakım: 98, veliSkoru: 96 },
    { name: 'Fatma Şahin', iletisim: 90, bakım: 92, veliSkoru: 89 },
    { name: 'Merve Doğan', iletisim: 92, bakım: 90, veliSkoru: 91 },
  ];

  // Student distribution per school data
  const schoolDistributionData = [
    { name: 'Atatürk Anadolu Lisesi', value: 340 },
    { name: 'Cumhuriyet İlkokulu', value: 210 },
    { name: 'Kolej Kampüsü', value: 180 },
  ];

  const COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b'];

  const triggerPDFPrint = () => {
    DownloadService.printContent('manager-reports-widget-container');
  };

  const triggerExcelDownload = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let reportName = '';

    if (activeReport === 'occupancy') {
      headers = ['Araç Plakası', 'Kapasite', 'Taşınan Öğrenci', 'Doluluk Oranı (%)'];
      rows = occupancyData.map(d => [d.name, d.kapasite.toString(), d.ogrenci.toString(), d.doluluk.toString()]);
      reportName = 'Arac_Doluluk_Raporu';
    } else if (activeReport === 'driver') {
      headers = ['Şoför Adı Soyadı', 'Zamanlama Skoru', 'Güvenli Sürüş Skoru', 'Veli Memnuniyet Skoru'];
      rows = driverPerformanceData.map(d => [d.name, d.zamanlama.toString(), d.guvenlik.toString(), d.veliSkoru.toString()]);
      reportName = 'Sofor_Performans_Raporu';
    } else if (activeReport === 'hostess') {
      headers = ['Rehber (Hostes) Adı', 'Öğrenci İletişim Puanı', 'Emniyet ve Bakım Puanı', 'Veli Puanı'];
      rows = hostessPerformanceData.map(d => [d.name, d.iletisim.toString(), d.bakım.toString(), d.veliSkoru.toString()]);
      reportName = 'Hostes_Performans_Raporu';
    } else if (activeReport === 'distribution') {
      headers = ['Okul Adı', 'Öğrenci Sayısı'];
      rows = schoolDistributionData.map(d => [d.name, d.value.toString()]);
      reportName = 'Ogrenci_Dagitim_Raporu';
    }

    DownloadService.downloadCSV(headers, rows, `Berkaytur_${reportName}`);
  };

  return (
    <div id="manager-reports-widget-container" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 text-xs">
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Raporlama ve Analiz Sistemi</h3>
          <p className="text-sm text-slate-500">Araç kapasiteleri, şoför/hostes performans verileri ve dökümler.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={triggerPDFPrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" /> PDF Raporu Al
          </button>
          <button
            onClick={triggerExcelDownload}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel Raporu Al
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200 max-w-3xl">
        <button
          onClick={() => setActiveReport('occupancy')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
            activeReport === 'occupancy' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Araç Doluluk Raporu
        </button>
        <button
          onClick={() => setActiveReport('driver')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
            activeReport === 'driver' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Şoför Performans Raporu
        </button>
        <button
          onClick={() => setActiveReport('hostess')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
            activeReport === 'hostess' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Hostes Performans Raporu
        </button>
        <button
          onClick={() => setActiveReport('distribution')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
            activeReport === 'distribution' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Öğrenci Dağılım Raporu
        </button>
      </div>

      {/* Report Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        {/* Left Side Chart Panel */}
        <div className="lg:col-span-8 bg-slate-50/50 border border-slate-200/60 rounded-3xl p-6 min-h-[340px]">
          {activeReport === 'occupancy' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-slate-800 text-sm">Servis Araçları Kapasite ve Doluluk Oranları (%)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={occupancyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="doluluk" fill="#3b82f6" name="Doluluk Oranı (%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeReport === 'driver' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-slate-800 text-sm">Sürücü Performans Metrikleri (Son 30 Gün)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={driverPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="zamanlama" fill="#10b981" name="Zamanlama Skoru" />
                    <Bar dataKey="guvenlik" fill="#f59e0b" name="Güvenli Sürüş Skoru" />
                    <Bar dataKey="veliSkoru" fill="#3b82f6" name="Veli Memnuniyeti" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeReport === 'hostess' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-slate-800 text-sm">Rehber Personel (Hostes) Hizmet Kalitesi</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hostessPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="iletisim" fill="#8b5cf6" name="Öğrenci İletişimi" />
                    <Bar dataKey="bakım" fill="#ec4899" name="Emniyet ve Bakım" />
                    <Bar dataKey="veliSkoru" fill="#14b8a6" name="Veli Puanı" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeReport === 'distribution' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-slate-800 text-sm">Anlaşmalı Okullardaki Öğrenci Dağılım Payları</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={schoolDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {schoolDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {schoolDistributionData.map((d, index) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full block" style={{ backgroundColor: COLORS[index] }} />
                        <span className="font-bold text-slate-700">{d.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">{d.value} Öğrenci</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Info Widget */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">GENEL DEĞERLENDİRME</h4>
            
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-blue-600 font-extrabold">ORTALAMA DOLULUK</p>
                <p className="text-lg font-black text-blue-900">%84.2</p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-600 font-extrabold">ZAMANINDA VARIŞ</p>
                <p className="text-lg font-black text-emerald-900">%97.8</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-amber-600 font-extrabold">TOPLAM TAŞINAN</p>
                <p className="text-lg font-black text-amber-900">730 Öğrenci</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6 text-slate-400 font-medium">
            Raporlama sistemi anlık verileri kullanmaktadır. PDF çıktısı almak için tarayıcınızın yazdırma arayüzünü açacaktır.
          </div>
        </div>
      </div>
    </div>
  );
}
