/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../store';
import { ApiClient } from '../../../infrastructure/api/apiClient';
import { Vehicle, User } from '../../../types';
import { 
  FileText, ShieldAlert, CheckCircle, Calculator, Share2, 
  Send, Smartphone, Printer, Download, Plus, Trash2, Edit3, 
  Settings, HelpCircle, FileCheck, ArrowRightLeft, Fuel,
  Wrench, AlertOctagon, Award, DollarSign, Clock, Check, X
} from 'lucide-react';

interface HakedislerProps {
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

export default function Hakedisler({ onAddNotification }: HakedislerProps) {
  const { 
    vehicles, users, addLog, currentUser, addDocument, routes, schools, suppliers, settings
  } = useAppStore();

  const drivers = users.filter(u => u.role === 'driver');
  const hostesses = users.filter(u => u.role === 'hostess');

  // Daily Rates
  const [dailyDriverRate, setDailyDriverRate] = useState(() => {
    return Number(localStorage.getItem('bkt_daily_driver_rate')) || 1200;
  });
  const [dailyHostessRate, setDailyHostessRate] = useState(() => {
    return Number(localStorage.getItem('bkt_daily_hostess_rate')) || 800;
  });

  // State for active payment order overlay
  const [activeOrder, setActiveOrder] = useState<any | null>(null);

  // Lists with local storage binding
  const [advances, setAdvances] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('bkt_accounting_avanslar') || '[]');
  });
  const [fuels, setFuels] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('bkt_accounting_yakitlar') || '[]');
  });
  const [repairs, setRepairs] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('bkt_accounting_tamirler') || '[]');
  });
  const [fines, setFines] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('bkt_accounting_cezalar') || '[]');
  });
  const [primes, setPrimes] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('bkt_accounting_primler') || '[]');
  });

  // Standard working days of the month
  const standardWorkingDays = 26;

  // Form Modals visible states
  const [showAddAdvance, setShowAddAdvance] = useState(false);
  const [showAddFuel, setShowAddFuel] = useState(false);
  const [showAddRepair, setShowAddRepair] = useState(false);
  const [showAddFine, setShowAddFine] = useState(false);
  const [showAddPrime, setShowAddPrime] = useState(false);

  // Form input states
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPersonnelId, setFormPersonnelId] = useState(drivers[0]?.id || '');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formVehiclePlate, setFormVehiclePlate] = useState(vehicles[0]?.plate || '06 BKT 123');
  
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelLiterPrice, setFuelLiterPrice] = useState('');
  const [fuelReceipt, setFuelReceipt] = useState('');
  const [fuelDriveDoc, setFuelDriveDoc] = useState('');

  const [repairService, setRepairService] = useState('');
  const [repairDriveDoc, setRepairDriveDoc] = useState('');

  const [fineTargetType, setFineTargetType] = useState<'sofor' | 'hostes' | 'tedarikci'>('sofor');
  const [fineType, setFineType] = useState('Kılık Kıyafet');

  const [primeType, setPrimeType] = useState('Aylık');

  // Dynamic worked days retriever from Puantaj matrix
  const getWorkedDaysFromPuantaj = (vehicleId: string, defaultDays: number) => {
    try {
      const saved = localStorage.getItem('bkt_accounting_puantaj_matrix_v2');
      if (saved) {
        const matrix = JSON.parse(saved);
        let sum = 0;
        let found = false;
        Object.keys(matrix).forEach(schoolId => {
          const schoolData = matrix[schoolId];
          if (schoolData && schoolData[vehicleId]) {
            found = true;
            Object.values(schoolData[vehicleId]).forEach((dayData: any) => {
              if (dayData.status === '1' || dayData.status === 'yedek') {
                sum += 1.0;
              } else if (dayData.status === '0.5') {
                sum += 0.5;
              }
            });
          }
        });
        if (found) return sum;
      }
    } catch (e) {
      console.error(e);
    }
    return defaultDays;
  };

  // Build high-fidelity Hakediş Matrix
  const hakedisList = React.useMemo(() => {
    const list: any[] = [];

    // Calculate for Drivers
    drivers.forEach(driver => {
      const v = vehicles.find(veh => veh.driverId === driver.id) || vehicles[0];
      const plate = v ? v.plate : '06 BKT 123';

      const workedDays = getWorkedDaysFromPuantaj(v ? v.id : 'v1', driver.id === 'u4' ? 24 : 25);
      const missingDays = standardWorkingDays > workedDays ? standardWorkingDays - workedDays : 0;
      
      const dailyRate = dailyDriverRate;
      const gross = workedDays * dailyRate;

      // Filter and sum deductions / additions
      const staffAdvances = advances.filter(a => a.personnelId === driver.id).reduce((sum, a) => sum + Number(a.amount), 0);
      const staffPrimes = primes.filter(p => p.personnelId === driver.id).reduce((sum, p) => sum + Number(p.amount), 0);
      const staffFines = fines.filter(f => f.personnelId === driver.id || f.vehiclePlate === plate).reduce((sum, f) => sum + Number(f.amount), 0);
      
      const staffFuel = fuels.filter(f => f.vehiclePlate === plate).reduce((sum, f) => sum + Number(f.total), 0);
      const staffRepair = repairs.filter(r => r.vehiclePlate === plate).reduce((sum, r) => sum + Number(r.amount), 0);

      const totalDeductions = staffAdvances + staffFuel + staffRepair + staffFines;
      const net = gross + staffPrimes - totalDeductions;

      list.push({
        id: `hk_drv_${driver.id}`,
        personnelId: driver.id,
        name: driver.name,
        role: 'Sürücü',
        plate,
        workedDays,
        missingDays,
        dailyRate,
        gross,
        advance: staffAdvances,
        fuel: staffFuel,
        repair: staffRepair,
        fine: staffFines,
        prime: staffPrimes,
        deductions: totalDeductions,
        net,
        status: 'Hesaplandı'
      });
    });

    // Calculate for Hostesses
    hostesses.forEach(hostess => {
      const v = vehicles.find(veh => veh.hostessId === hostess.id) || vehicles[0];
      const plate = v ? v.plate : '06 BKT 123';

      const workedDays = getWorkedDaysFromPuantaj(v ? v.id : 'v1', hostess.id === 'u5' ? 22 : 26);
      const missingDays = standardWorkingDays > workedDays ? standardWorkingDays - workedDays : 0;

      const dailyRate = dailyHostessRate;
      const gross = workedDays * dailyRate;

      const staffAdvances = advances.filter(a => a.personnelId === hostess.id).reduce((sum, a) => sum + Number(a.amount), 0);
      const staffPrimes = primes.filter(p => p.personnelId === hostess.id).reduce((sum, p) => sum + Number(p.amount), 0);
      const staffFines = fines.filter(f => f.personnelId === hostess.id).reduce((sum, f) => sum + Number(f.amount), 0);

      const totalDeductions = staffAdvances + staffFines;
      const net = gross + staffPrimes - totalDeductions;

      list.push({
        id: `hk_hst_${hostess.id}`,
        personnelId: hostess.id,
        name: hostess.name,
        role: 'Hostes',
        plate,
        workedDays,
        missingDays,
        dailyRate,
        gross,
        advance: staffAdvances,
        fuel: 0,
        repair: 0,
        fine: staffFines,
        prime: staffPrimes,
        deductions: totalDeductions,
        net,
        status: 'Hesaplandı'
      });
    });

    return list;
  }, [drivers, hostesses, vehicles, advances, fuels, repairs, fines, primes, dailyDriverRate, dailyHostessRate]);

  // Form submissions
  const handleAddAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = users.find(u => u.id === formPersonnelId);
    if (!target || !formAmount) return;

    const newAdvance = {
      id: `adv_${Date.now()}`,
      date: formDate,
      personnelId: formPersonnelId,
      personnelName: target.name,
      amount: Number(formAmount),
      description: formDescription || 'İdari Avans Ödemesi'
    };

    const updated = [newAdvance, ...advances];
    setAdvances(updated);
    localStorage.setItem('bkt_accounting_avanslar', JSON.stringify(updated));

    addLog(
      'Avans Ödemesi Eklendi',
      `${target.name} (${target.role.toUpperCase()}) personeline ${formAmount} ₺ avans tanımlandı.`
    );
    onAddNotification('💰 Avans Verildi', `${target.name} personeli için ${formAmount} ₺ avans kaydedildi.`, 'info');
    setShowAddAdvance(false);
    setFormAmount('');
    setFormDescription('');
  };

  const handleAddFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(fuelLiters) * Number(fuelLiterPrice);

    const newFuel = {
      id: `fuel_${Date.now()}`,
      date: formDate,
      vehiclePlate: formVehiclePlate,
      liters: Number(fuelLiters),
      literPrice: Number(fuelLiterPrice),
      total,
      receipt: fuelReceipt,
      driveDoc: fuelDriveDoc
    };

    const updated = [newFuel, ...fuels];
    setFuels(updated);
    localStorage.setItem('bkt_accounting_yakitlar', JSON.stringify(updated));

    // Also add to global documents list
    addDocument({
      name: `${formVehiclePlate}_Yakit_Fis_${fuelReceipt}.pdf`,
      category: 'Araç',
      fileUrl: fuelDriveDoc,
      fileSize: '340 KB',
      uploadedBy: 'Muhasebe'
    });

    addLog(
      'Yakıt Gideri Girildi',
      `${formVehiclePlate} aracına ${fuelLiters} Litre (${total.toLocaleString('tr-TR')} ₺) yakıt alımı kaydedildi.`
    );
    onAddNotification('⛽ Yakıt Gideri', `${formVehiclePlate} için ${total.toLocaleString('tr-TR')} ₺ yakıt faturası işlendi.`, 'info');
    setShowAddFuel(false);
  };

  const handleAddRepairSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount) return;

    const newRepair = {
      id: `rep_${Date.now()}`,
      date: formDate,
      vehiclePlate: formVehiclePlate,
      service: repairService,
      amount: Number(formAmount),
      description: formDescription || 'Periyodik Bakım / Tamirat',
      driveDoc: repairDriveDoc
    };

    const updated = [newRepair, ...repairs];
    setRepairs(updated);
    localStorage.setItem('bkt_accounting_tamirler', JSON.stringify(updated));

    // Add to global documents list
    addDocument({
      name: `${formVehiclePlate}_Servis_Faturasi.pdf`,
      category: 'Araç',
      fileUrl: repairDriveDoc,
      fileSize: '1.4 MB',
      uploadedBy: 'Muhasebe'
    });

    addLog(
      'Tamir Gideri Girildi',
      `${formVehiclePlate} aracı için ${repairService} bünyesinde ${formAmount} ₺ bakım faturası işlendi.`
    );
    onAddNotification('🔧 Tamirat Gideri', `${formVehiclePlate} periyodik bakımı BERKAYTUR Yetkili Servisi tarafından tamamlandı.`, 'info');
    setShowAddRepair(false);
    setFormAmount('');
    setFormDescription('');
  };

  const handleAddFineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = users.find(u => u.id === formPersonnelId);
    if (!target || !formAmount) return;

    const newFine = {
      id: `fn_${Date.now()}`,
      date: formDate,
      personnelId: formPersonnelId,
      personnelName: target.name,
      vehiclePlate: formVehiclePlate,
      amount: Number(formAmount),
      reason: fineType,
      source: 'Finans Yönetimi',
      description: formDescription || 'Yönetim Cezası'
    };

    const updated = [newFine, ...fines];
    setFines(updated);
    localStorage.setItem('bkt_accounting_cezalar', JSON.stringify(updated));

    addLog(
      'Manuel Ceza Kesildi',
      `${target.name} personeline "${fineType}" sebebiyle ${formAmount} ₺ ceza tahakkuk ettirildi.`
    );
    onAddNotification('🚨 Ceza Kesildi', `${target.name} için ${formAmount} ₺ idari ceza hakedişe yansıtıldı.`, 'warning');
    setShowAddFine(false);
    setFormAmount('');
    setFormDescription('');
  };

  const handleAddPrimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = users.find(u => u.id === formPersonnelId);
    if (!target || !formAmount) return;

    const newPrime = {
      id: `pr_${Date.now()}`,
      date: formDate,
      personnelId: formPersonnelId,
      personnelName: target.name,
      amount: Number(formAmount),
      reason: `${primeType} Prim Ödülü`,
      description: formDescription || 'Başarı ve Memnuniyet Primi'
    };

    const updated = [newPrime, ...primes];
    setPrimes(updated);
    localStorage.setItem('bkt_accounting_primler', JSON.stringify(updated));

    addLog(
      'Prim Hak Tanımlandı',
      `${target.name} personeline "${primeType}" kapsamında ${formAmount} ₺ prim teşviği eklendi.`
    );
    onAddNotification('🏆 Prim Tanımlandı', `${target.name} personeli için ${formAmount} ₺ prim hakedişe eklendi.`, 'success');
    setShowAddPrime(false);
    setFormAmount('');
    setFormDescription('');
  };

  const handleCreateHakedisBelgesi = (hk: any) => {
    // Resolve additional metadata from store
    const v = vehicles.find(veh => veh.plate === hk.plate) || vehicles[0];
    const driverObj = users.find(u => u.id === (v?.driverId || hk.personnelId));
    const hostessObj = users.find(u => u.id === v?.hostessId);
    
    // Find route and school
    const routeObj = v ? routes.find(r => r.vehicleId === v.id) : null;
    const schoolObj = routeObj ? schools.find(s => s.id === routeObj.schoolId) : schools[0];
    const routeName = routeObj ? routeObj.name : "Yenimahalle Güzergahı";
    const schoolName = schoolObj ? schoolObj.name : "Atatürk Anadolu Lisesi";
    
    // Resolve supplier
    const supplierObj = v?.supplierId ? suppliers.find(s => s.id === v.supplierId) : null;
    const supplierName = supplierObj ? supplierObj.companyName : "BERKAYTUR Taşıma Hizmetleri A.Ş.";

    const hakedisNo = `HKD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toLocaleDateString('tr-TR');

    const ekGorev = hk.ekGorev || 1500; // Ek görev bedeli

    const order = {
      orderNo: hakedisNo,
      date: dateStr,
      time: timeStr,
      company: 'Berkaytur Servis Taşımacılık A.Ş.',
      companyTaxNo: 'BKT-TAX-9876543210',
      companyAddress: 'Çankaya Cad. No: 120/A, Ankara',
      period: 'Temmuz 2026 Dönemi',
      name: hk.name,
      role: hk.role,
      plate: hk.plate,
      routeName,
      schoolName,
      driverName: driverObj ? driverObj.name : "Ahmet Yılmaz",
      hostessName: hostessObj ? hostessObj.name : "Ayşe Yıldız",
      supplierName,
      workedDays: hk.workedDays,
      dailyRate: hk.dailyRate,
      gross: hk.gross,
      advance: hk.advance,
      fuel: hk.fuel,
      repair: hk.repair,
      fine: hk.fine,
      prime: hk.prime,
      ekGorev,
      deductions: hk.deductions,
      net: hk.net + ekGorev, // Net Hakediş includes Ek Görev
      personnel: currentUser?.name || 'Ayhan Sayman'
    };

    setActiveOrder(order);
    addLog('Hakediş Belgesi Oluşturuldu', `${hk.name} (${hk.role}) için Resmi Hakediş Belgesi oluşturuldu. No: ${hakedisNo}`);
  };

  const handleShareWhatsApp = () => {
    if (!activeOrder) return;
    
    let text = '';
    if (settings && settings.whatsappSupplierTemplate) {
      text = settings.whatsappSupplierTemplate
        .replace('{firma_adi}', activeOrder.supplierName || activeOrder.name)
        .replace('{donem}', activeOrder.period)
        .replace('{plaka}', activeOrder.plate)
        .replace('{net_tutar}', `${activeOrder.net.toLocaleString('tr-TR')} ₺`);
    } else {
      text = `*BERKAYTUR RESMİ HAKEDİŞ BELGESİ ÖZETİ*\n\n` +
        `*Firma:* ${activeOrder.company}\n` +
        `*Dönem:* ${activeOrder.period}\n` +
        `*Oluşturulma Tarihi:* ${activeOrder.date}\n\n` +
        `*HİZMET DETAYLARI:*\n` +
        `- Tedarikçi Firma: *${activeOrder.supplierName}*\n` +
        `- Okul: *${activeOrder.schoolName}*\n` +
        `- Güzergâh: *${activeOrder.routeName}*\n` +
        `- Araç Plakası: *${activeOrder.plate}*\n` +
        `- Görevli Şoför: *${activeOrder.driverName}*\n` +
        `- Görevli Hostes: *${activeOrder.hostessName}*\n\n` +
        `*FİNANSAL ÖZET:*\n` +
        `- Çalışılan Gün: *${activeOrder.workedDays} Gün*\n` +
        `- Günlük Ücret: *${activeOrder.dailyRate.toLocaleString('tr-TR')} ₺*\n` +
        `- Brüt Hakediş: *${activeOrder.gross.toLocaleString('tr-TR')} ₺*\n` +
        `+ Primler: *${activeOrder.prime.toLocaleString('tr-TR')} ₺*\n` +
        `+ Ek Görev Bedeli: *${activeOrder.ekGorev.toLocaleString('tr-TR')} ₺*\n\n` +
        `*KESİNTİLER:*\n` +
        `- Avans: *${activeOrder.advance.toLocaleString('tr-TR')} ₺*\n` +
        `- Yakıt Gideri: *${activeOrder.fuel.toLocaleString('tr-TR')} ₺*\n` +
        `- Tamir Gideri: *${activeOrder.repair.toLocaleString('tr-TR')} ₺*\n` +
        `- Ceza Bedeli: *${activeOrder.fine.toLocaleString('tr-TR')} ₺*\n` +
        `- Toplam Kesinti: *${activeOrder.deductions.toLocaleString('tr-TR')} ₺*\n\n` +
        `*ÖDENECEK NET HAKEDİŞ: ${activeOrder.net.toLocaleString('tr-TR')} ₺*\n\n` +
        `_Bu belge tedarikçiye veya personele gönderilen resmi bir hakediş özetidir. Banka ödeme emri değildir._`;
    }

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    addLog('WhatsApp Hakediş Paylaşıldı', `${activeOrder.name} personeliyle hakediş özeti WhatsApp ile paylaşıldı.`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* INTRO AND ACTION CONTROLS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Hakediş Entegrasyon Sistemi</h2>
          <p className="text-slate-500 text-xs font-semibold">
            Puantaj kayıtlarından gelen çalışma günleri, yakıt, tamir, avans ve ceza kesintileriyle otomatik net hakediş hesaplama.
          </p>
        </div>

        {/* Action triggers to add expenses, advances, fules, primes */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAddAdvance(true)}
            className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-blue-100 cursor-pointer"
          >
            <DollarSign className="w-4 h-4" /> + Avans Ekle
          </button>
          <button
            onClick={() => setShowAddFuel(true)}
            className="px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-amber-100 cursor-pointer"
          >
            <Fuel className="w-4 h-4" /> + Yakıt Gideri
          </button>
          <button
            onClick={() => setShowAddRepair(true)}
            className="px-3 py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-orange-100 cursor-pointer"
          >
            <Wrench className="w-4 h-4" /> + Tamir Gideri
          </button>
          <button
            onClick={() => setShowAddFine(true)}
            className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-rose-100 cursor-pointer"
          >
            <AlertOctagon className="w-4 h-4" /> + Ceza Yaz
          </button>
          <button
            onClick={() => setShowAddPrime(true)}
            className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-emerald-100 cursor-pointer"
          >
            <Award className="w-4 h-4" /> + Prim Tanımla
          </button>
        </div>
      </div>

      {/* PARAMETERS CONFIG BOX */}
      <div className="bg-white border border-slate-100 p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-600 shadow-sm">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          <span>Şoför ve Hostes Günlük Sefer Yevmiye Değerleri:</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Şoför Yevmiye:</span>
            <input 
              type="number" 
              value={dailyDriverRate} 
              onChange={e => {
                const val = Number(e.target.value);
                setDailyDriverRate(val);
                localStorage.setItem('bkt_daily_driver_rate', String(val));
              }}
              className="w-20 p-1.5 bg-slate-50 border rounded text-slate-800 text-center font-mono font-black focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span>₺</span>
          </div>
          <div className="flex items-center gap-1.5 border-l pl-4 border-slate-100">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Hostes Yevmiye:</span>
            <input 
              type="number" 
              value={dailyHostessRate} 
              onChange={e => {
                const val = Number(e.target.value);
                setDailyHostessRate(val);
                localStorage.setItem('bkt_daily_hostess_rate', String(val));
              }}
              className="w-20 p-1.5 bg-slate-50 border rounded text-slate-800 text-center font-mono font-black focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span>₺</span>
          </div>
        </div>
      </div>

      {/* FORMULA BANNER */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1.5">
          <h4 className="text-xs font-extrabold tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-emerald-400" /> Otomatik Hakediş Formül Hesaplaması
          </h4>
          <p className="text-sm font-semibold tracking-wide">
            Net Hakediş = (Çalışılan Gün × Günlük Ücret) + Prim + Ek Görev - Avans - Yakıt - Tamir - Ceza
          </p>
          <p className="text-[11px] text-slate-400 leading-normal max-w-xl">
            Tüm veri alanları anlık olarak Puantaj Excel sayfasından, Avans kartlarından ve masraf belgelerinden otomatik olarak matrise akar. El ile çift veri girişine gerek kalmaz.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1.5 bg-slate-800/80 text-blue-200 rounded-xl text-[10px] font-mono font-bold border border-slate-700">
            Standart Dönem: 26 Sefer Günü
          </span>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xl shadow-slate-100/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-6">Alıcı Personel / Görev</th>
                <th className="py-4 px-6">Plaka</th>
                <th className="py-4 px-6">Yevmiye</th>
                <th className="py-4 px-6 text-center">Ç.Gün</th>
                <th className="py-4 px-6">Brüt Hakediş</th>
                <th className="py-4 px-6 text-rose-600">Düşen Kesintiler (Avans / Masraf / Ceza)</th>
                <th className="py-4 px-6 text-emerald-600">Primler</th>
                <th className="py-4 px-6">Ödenecek Net Tutar</th>
                <th className="py-4 px-6 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
              {hakedisList.map(hk => (
                <tr key={hk.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-4 px-6">
                    <p className="font-bold text-slate-800 text-sm">{hk.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{hk.role}</p>
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-slate-700">{hk.plate}</td>
                  <td className="py-4 px-6 font-mono font-bold text-slate-800">{hk.dailyRate.toLocaleString('tr-TR')} ₺</td>
                  <td className="py-4 px-6 text-center font-mono font-black text-slate-800 text-sm bg-slate-50/40">{hk.workedDays}</td>
                  <td className="py-4 px-6 font-mono font-black text-slate-900">{hk.gross.toLocaleString('tr-TR')} ₺</td>
                  <td className="py-4 px-6">
                    <div className="space-y-0.5">
                      <p className="font-mono text-rose-600 font-bold">-{hk.deductions.toLocaleString('tr-TR')} ₺</p>
                      <p className="text-[9px] text-slate-400 leading-none font-medium">
                        Avans: {hk.advance} ₺ | Yakıt: {hk.fuel} ₺ | Tamir: {hk.repair} ₺ | Ceza: {hk.fine} ₺
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono text-emerald-600 font-bold">+{hk.prime.toLocaleString('tr-TR')} ₺</td>
                  <td className="py-4 px-6 font-mono font-black text-blue-700 text-sm">{hk.net.toLocaleString('tr-TR')} ₺</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex flex-col sm:flex-row gap-1.5 justify-end">
                      <button
                        onClick={() => handleCreateHakedisBelgesi(hk)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold tracking-wide transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> Hakediş Belgesi Oluştur
                      </button>
                      <button
                        onClick={() => {
                          handleCreateHakedisBelgesi(hk);
                          setTimeout(() => {
                            handleShareWhatsApp();
                          }, 100);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold tracking-wide transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
                      >
                        <Share2 className="w-3.5 h-3.5" /> WhatsApp ile Gönder
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DIALOG MODALS FOR HAKEDIŞ MANAGEMENT */}

      {/* 1. SHOW ADD ADVANCE MODAL */}
      {showAddAdvance && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddAdvanceSubmit} className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full space-y-4 animate-scale-up">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                  <DollarSign className="w-5 h-5 text-blue-600" /> Personel Avans Talep Kaydı
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Avans hakedişten otomatik düşecektir.</p>
              </div>
              <button type="button" onClick={() => setShowAddAdvance(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-bold text-slate-600">
              <div className="space-y-1">
                <label>Avans Alacak Personel</label>
                <select
                  value={formPersonnelId}
                  onChange={e => setFormPersonnelId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                >
                  {users.filter(u => u.role === 'driver' || u.role === 'hostess').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role === 'driver' ? 'Sürücü' : 'Hostes'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label>Ödeme Tarihi</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label>Tutar (₺)</label>
                  <input
                    type="number"
                    required
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono text-slate-800 font-bold"
                    placeholder="3000"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label>Açıklama</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  placeholder="Temmuz ortası avans talebi"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddAdvance(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Avansı Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. SHOW ADD FUEL MODAL */}
      {showAddFuel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddFuelSubmit} className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full space-y-4 animate-scale-up">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                  <Fuel className="w-5 h-5 text-amber-600" /> Araç Yakıt Masraf Girişi
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Yakıt giderleri araç bazlı kaydedilir.</p>
              </div>
              <button type="button" onClick={() => setShowAddFuel(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-bold text-slate-600">
              <div className="space-y-1">
                <label>Araç Plakası</label>
                <select
                  value={formVehiclePlate}
                  onChange={e => setFormVehiclePlate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.plate}>{v.plate} ({v.brand} {v.model})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label>Litre</label>
                  <input
                    type="number"
                    required
                    value={fuelLiters}
                    onChange={e => setFuelLiters(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono text-center"
                  />
                </div>
                <div className="space-y-1">
                  <label>Litre Fiyatı (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={fuelLiterPrice}
                    onChange={e => setFuelLiterPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label>Fiş / Fatura No</label>
                  <input
                    type="text"
                    required
                    value={fuelReceipt}
                    onChange={e => setFuelReceipt(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                    placeholder="FIS-99182"
                  />
                </div>
                <div className="space-y-1">
                  <label>Toplam Gider (₺)</label>
                  <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-slate-800 text-center font-black">
                    {(Number(fuelLiters) * Number(fuelLiterPrice)).toLocaleString('tr-TR')} ₺
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label>Google Drive Fiş Belgesi Linki</label>
                <input
                  type="text"
                  required
                  value={fuelDriveDoc}
                  onChange={e => setFuelDriveDoc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-[10px] font-mono text-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddFuel(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Yakıt Masrafını Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. SHOW ADD REPAIR MODAL */}
      {showAddRepair && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddRepairSubmit} className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full space-y-4 animate-scale-up">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                  <Wrench className="w-5 h-5 text-orange-600" /> Araç Tamir / Servis Gideri
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">BERKAYTUR Yetkili Servisi veya diğer anlaşmalı bayiler.</p>
              </div>
              <button type="button" onClick={() => setShowAddRepair(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-bold text-slate-600">
              <div className="space-y-1">
                <label>Servis Veren İstasyon</label>
                <select
                  value={repairService}
                  onChange={e => setRepairService(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                >
                  <option value="BERKAYTUR Yetkili Servisi">BERKAYTUR Yetkili Servisi</option>
                  <option value="Mercedes Benz Yetkili Servis">Mercedes Benz Yetkili Servis</option>
                  <option value="Volkswagen Doğuş Otomotiv">Volkswagen Doğuş Otomotiv</option>
                  <option value="Diğer Özel Servis">Diğer Özel Servis</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label>Araç Plakası</label>
                  <select
                    value={formVehiclePlate}
                    onChange={e => setFormVehiclePlate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.plate}>{v.plate}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label>Fatura Tutarı (₺)</label>
                  <input
                    type="number"
                    required
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono text-slate-800 font-bold"
                    placeholder="4500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label>Yapılan Tamirat İşlemi</label>
                <input
                  type="text"
                  required
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  placeholder="10.000 KM periyodik bakımı ve fren balata değişimi"
                />
              </div>

              <div className="space-y-1">
                <label>Google Drive Fatura Belgesi</label>
                <input
                  type="text"
                  required
                  value={repairDriveDoc}
                  onChange={e => setRepairDriveDoc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono text-[10px] text-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddRepair(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Faturayı Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. SHOW ADD FINE MODAL */}
      {showAddFine && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddFineSubmit} className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full space-y-4 animate-scale-up">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                  <AlertOctagon className="w-5 h-5 text-rose-600" /> İdari Ceza Kesintisi Yaz
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Manuel ceza yazma ekranı.</p>
              </div>
              <button type="button" onClick={() => setShowAddFine(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-bold text-slate-600">
              <div className="space-y-1">
                <label>Ceza Kesilecek Personel</label>
                <select
                  value={formPersonnelId}
                  onChange={e => setFormPersonnelId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                >
                  {users.filter(u => u.role === 'driver' || u.role === 'hostess').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role === 'driver' ? 'Sürücü' : 'Hostes'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label>Ceza Türü</label>
                  <select
                    value={fineType}
                    onChange={e => setFineType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  >
                    <option value="Kılık Kıyafet">Kılık Kıyafet</option>
                    <option value="Araç Temiz Değil">Araç Temiz Değil</option>
                    <option value="Geç Kalma">Geç Kalma</option>
                    <option value="Eksik Evrak">Eksik Evrak</option>
                    <option value="Kemer Takılmadı">Kemer Takılmadı</option>
                    <option value="Telefon Kullanımı">Telefon Kullanımı</option>
                    <option value="Hız Sınırı İhlali">Hız Sınırı İhlali</option>
                    <option value="Sigara Kullanımı">Sigara Kullanımı</option>
                    <option value="Diğer">Diğer Sebepler</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label>Ceza Tutarı (₺)</label>
                  <input
                    type="number"
                    required
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono text-slate-800 font-bold"
                    placeholder="1000"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label>Ceza Detayı ve Açıklaması</label>
                <input
                  type="text"
                  required
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  placeholder="Hız limiti kuralları ihlali"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddFine(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Cezayı Yansıt
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. SHOW ADD PRIME MODAL */}
      {showAddPrime && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddPrimeSubmit} className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full space-y-4 animate-scale-up">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                  <Award className="w-5 h-5 text-emerald-600" /> Teşvik Primi Hak Tanımla
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Hakedişe prim ekleme ekranı.</p>
              </div>
              <button type="button" onClick={() => setShowAddPrime(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-bold text-slate-600">
              <div className="space-y-1">
                <label>Ödüllendirilecek Personel</label>
                <select
                  value={formPersonnelId}
                  onChange={e => setFormPersonnelId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                >
                  {users.filter(u => u.role === 'driver' || u.role === 'hostess').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role === 'driver' ? 'Sürücü' : 'Hostes'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label>Prim Türü</label>
                  <select
                    value={primeType}
                    onChange={e => setPrimeType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  >
                    <option value="Aylık">Aylık Teşvik</option>
                    <option value="Etkinlik">Etkinlik Primi</option>
                    <option value="Başarı">Başarı Ödülü</option>
                    <option value="Memnuniyet">Veli Memnuniyet Primi</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label>Prim Tutarı (₺)</label>
                  <input
                    type="number"
                    required
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono text-slate-800 font-bold"
                    placeholder="1500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label>Prim Gerekçesi / Not</label>
                <input
                  type="text"
                  required
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  placeholder="Dönem sonu %100 kusursuz sürüş ödülü"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddPrime(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Primi Kaydet
              </button>
            </div>
          </form>
        </div>
      )}


      {/* RESMİ HAKEDİŞ BELGESİ DETAY ÖNİZLEME (PORTAL / PDF) */}
      {activeOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-8 space-y-6 animate-scale-up relative">
            
            {/* Header: Firma Logosu & Bilgileri */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-5 gap-4">
              <div className="flex items-center gap-3">
                {/* Stylized Logo */}
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white text-lg tracking-wider shadow-md shadow-blue-200">
                  BT
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight leading-none">
                    BERKAYTUR
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">RESMİ HAKEDİŞ BELGESİ</p>
                </div>
              </div>
              <div className="text-right sm:text-right text-[10px] text-slate-500 font-medium">
                <p className="font-bold text-slate-800">{activeOrder.company}</p>
                <p>Vergi Dairesi: Çankaya V.D. - 1640294821</p>
                <p>{activeOrder.companyAddress}</p>
              </div>
            </div>

            {/* Official Document Info Block */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100/80 text-[11px] text-slate-600 font-medium">
              <div className="space-y-1.5">
                <p><b>Hakediş Belge No:</b> <span className="font-bold text-slate-800 font-mono">{activeOrder.orderNo}</span></p>
                <p><b>Hakediş Dönemi:</b> <span className="font-bold text-slate-800">{activeOrder.period}</span></p>
                <p><b>Oluşturulma Tarihi:</b> <span className="font-bold text-slate-800">{activeOrder.date} • {activeOrder.time}</span></p>
              </div>
              <div className="space-y-1.5 border-l pl-4 border-slate-200">
                <p><b>Tedarikçi Firma:</b> <span className="font-bold text-slate-800">{activeOrder.supplierName}</span></p>
                <p><b>Okul / Servis Alanı:</b> <span className="font-bold text-slate-800">{activeOrder.schoolName}</span></p>
                <p><b>Güzergâh Tanımı:</b> <span className="font-bold text-slate-800">{activeOrder.routeName}</span></p>
              </div>
            </div>

            {/* Personnel & Vehicle Info Block */}
            <div className="grid grid-cols-3 gap-4 border-b border-dashed pb-4 border-slate-200 text-[11px] text-slate-600">
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-0.5">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase block tracking-wider">ARAÇ PLAKASI</span>
                <p className="font-bold text-slate-800 font-mono text-xs">{activeOrder.plate}</p>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-0.5">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase block tracking-wider">GÖREVLİ ŞOFÖR</span>
                <p className="font-bold text-slate-800 text-xs">{activeOrder.driverName}</p>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-0.5">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase block tracking-wider">GÖREVLİ HOSTES</span>
                <p className="font-bold text-slate-800 text-xs">{activeOrder.hostessName}</p>
              </div>
            </div>

            {/* Calculations Breakdown (Excel Grid Style) */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">HAKEDİŞ HESAP KALEMLERİ VE DETAYLAR</h4>
              <div className="border border-slate-100 rounded-2xl overflow-hidden font-sans text-xs">
                
                {/* Header Row */}
                <div className="grid grid-cols-12 bg-slate-50 p-3 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                  <span className="col-span-6">Açıklama Kalemi / Detay</span>
                  <span className="col-span-3 text-right">Birim / Gün</span>
                  <span className="col-span-3 text-right">Tutar (₺)</span>
                </div>

                {/* Body Rows */}
                <div className="p-3 space-y-2.5 text-slate-600 divide-y divide-slate-100 font-medium">
                  
                  {/* Gross */}
                  <div className="grid grid-cols-12 pt-1 font-semibold">
                    <span className="col-span-6 text-slate-800">Çalışılan Gün Brüt Hakediş</span>
                    <span className="col-span-3 text-right text-slate-500">{activeOrder.workedDays} Gün × {activeOrder.dailyRate.toLocaleString('tr-TR')} ₺</span>
                    <span className="col-span-3 text-right text-slate-900 font-mono font-bold">+{activeOrder.gross.toLocaleString('tr-TR')} ₺</span>
                  </div>

                  {/* Prim */}
                  <div className="grid grid-cols-12 pt-2.5">
                    <span className="col-span-6 text-emerald-700">Tanımlı Başarı Primi & Teşvik</span>
                    <span className="col-span-3 text-right text-slate-400">-</span>
                    <span className="col-span-3 text-right text-emerald-600 font-mono font-bold">+{activeOrder.prime.toLocaleString('tr-TR')} ₺</span>
                  </div>

                  {/* Ek Görev */}
                  <div className="grid grid-cols-12 pt-2.5">
                    <span className="col-span-6 text-blue-700">Ek Görev / Dış Sefer Bedeli</span>
                    <span className="col-span-3 text-right text-slate-400">-</span>
                    <span className="col-span-3 text-right text-blue-600 font-mono font-bold">+{activeOrder.ekGorev.toLocaleString('tr-TR')} ₺</span>
                  </div>

                  {/* Deductions block header */}
                  <div className="pt-3 border-t border-slate-100 text-[10px] font-extrabold text-rose-500 uppercase tracking-widest">
                    UYGULANAN MASRAF VE KESİNTİLER
                  </div>

                  {/* Avans */}
                  <div className="grid grid-cols-12 pt-2">
                    <span className="col-span-6 text-slate-700">Kullanılan Cari Avans</span>
                    <span className="col-span-3 text-right text-slate-400">-</span>
                    <span className="col-span-3 text-right text-rose-600 font-mono font-bold">-{activeOrder.advance.toLocaleString('tr-TR')} ₺</span>
                  </div>

                  {/* Yakıt */}
                  <div className="grid grid-cols-12 pt-2.5">
                    <span className="col-span-6 text-slate-700">Cari Yakıt Alım Giderleri</span>
                    <span className="col-span-3 text-right text-slate-400">-</span>
                    <span className="col-span-3 text-right text-rose-600 font-mono font-bold">-{activeOrder.fuel.toLocaleString('tr-TR')} ₺</span>
                  </div>

                  {/* Tamir */}
                  <div className="grid grid-cols-12 pt-2.5">
                    <span className="col-span-6 text-slate-700">Cari Araç Bakım ve Tamir Masrafı</span>
                    <span className="col-span-3 text-right text-slate-400">-</span>
                    <span className="col-span-3 text-right text-rose-600 font-mono font-bold">-{activeOrder.repair.toLocaleString('tr-TR')} ₺</span>
                  </div>

                  {/* Ceza */}
                  <div className="grid grid-cols-12 pt-2.5">
                    <span className="col-span-6 text-slate-700">İdari ve Denetim Cezaları Kesintisi</span>
                    <span className="col-span-3 text-right text-slate-400">-</span>
                    <span className="col-span-3 text-right text-rose-600 font-mono font-bold">-{activeOrder.fine.toLocaleString('tr-TR')} ₺</span>
                  </div>

                  {/* Deductions Total */}
                  <div className="grid grid-cols-12 pt-2.5 font-semibold text-rose-700">
                    <span className="col-span-6">Toplam Kesinti Tutarı</span>
                    <span className="col-span-3 text-right text-slate-400">-</span>
                    <span className="col-span-3 text-right font-mono font-black">-{activeOrder.deductions.toLocaleString('tr-TR')} ₺</span>
                  </div>

                </div>

                {/* Final Total Net Row */}
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center text-sm font-black">
                  <span className="tracking-wide">ÖDENECEK NET HAKEDİŞ TUTARI</span>
                  <span className="text-emerald-400 font-mono text-lg">{activeOrder.net.toLocaleString('tr-TR')} ₺</span>
                </div>
              </div>
            </div>

            {/* Warning note explicitly defining this document's nature */}
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-[10px] leading-relaxed font-semibold">
              ⚠️ <b>YASAL UYARI VE BİLGİLENDİRME:</b> Bu belge resmi bir hakediş özeti olup banka ödeme emri (virman/talimat) niteliğinde değildir. Cari hesap mutabakatı ve tedarikçi bilgilendirme amaçlı üretilmiştir.
            </div>

            {/* Action buttons */}
            <div className="border-t border-dashed border-slate-200 pt-5 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    const docPayload = {
                      name: `Hakedis_Belgesi_${activeOrder.orderNo}.pdf`,
                      category: 'Hakediş',
                      fileSize: '1.4 MB',
                      uploadedBy: currentUser?.name || 'Ayhan Sayman'
                    };
                    const res = await ApiClient.uploadDocument(docPayload);
                    if (res.success) {
                      addLog(
                        'Hakediş Belgesi Kaydedildi',
                        `Resmi hakediş belgesi (${activeOrder.orderNo}) başarıyla oluşturuldu ve sisteme/Google Drive'a kaydedildi.`
                      );
                      alert(`✅ Başarılı!\n\nResmi Hakediş Belgesi (${activeOrder.orderNo}) Google Drive klasöründeki "/Hakedisler/Resmi_Belgeler/" dizinine ve sisteme PDF olarak başarıyla kaydedildi.`);
                    } else {
                      alert(`❌ Hata: ${res.error}`);
                    }
                  }}
                  className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200/50 transition-colors"
                >
                  <Download className="w-4 h-4 text-blue-500" /> Google Drive'a Kaydet
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-emerald-100"
                >
                  <Smartphone className="w-4 h-4" /> WhatsApp Web ile Gönder
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.print()}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Yazdır / PDF İndir
                </button>
                <button
                  onClick={() => setActiveOrder(null)}
                  className="py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Belgeyi Kapat
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
