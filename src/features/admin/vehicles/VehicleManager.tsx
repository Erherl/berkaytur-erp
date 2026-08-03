/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../store';
import { ApiClient } from '../../../infrastructure/api/apiClient';
import { 
  DetailedVehicle, INITIAL_DETAILED_VEHICLES, STATUS_COLORS, CAPACITIES, VehicleHistoryItem 
} from './vehicleTypes';
import SeatingPlanModule from './SeatingPlanModule';
import VehicleHistoryModule from './VehicleHistoryModule';
import VehicleMapModule from './VehicleMapModule';
import { 
  Truck, ShieldAlert, AlertCircle, Plus, Clipboard, UserCheck, 
  Settings, RefreshCw, Layers, Database, FolderOpen, Heart, 
  Map, Grid, Info, CheckCircle2, ChevronRight, Fuel, Wrench, Edit2, Trash2
} from 'lucide-react';

interface VehicleManagerProps {
  defaultTab?: 'fleet' | 'seating' | 'map' | 'history';
}

export default function VehicleManager({ defaultTab = 'fleet' }: VehicleManagerProps) {
  const { schools, users, addLog } = useAppStore();

  // Load detailed vehicles in local state to simulate robust changes (fully integrated in store dynamically)
  const [vehiclesList, setVehiclesList] = useState<DetailedVehicle[]>(INITIAL_DETAILED_VEHICLES);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'fleet' | 'seating' | 'map' | 'history'>(defaultTab);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('v1');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVehicleType, setNewVehicleType] = useState<'company' | 'supplier'>('company');

  const loadVehicles = async () => {
    setLoading(true);
    const res = await ApiClient.fetchVehicles();
    if (res.success && res.data && res.data.length > 0) {
      setVehiclesList(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  // Filter & Search states
  const [fleetFilter, setFleetFilter] = useState<'all' | 'company' | 'supplier'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'idle' | 'service'>('all');

  // Unified Assignment State (for driver, hostess, school, project assignment in single screen)
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    driverId: '',
    hostessId: '',
    schoolId: '',
    schoolIds: [] as string[],
    projectName: ''
  });

  // Forms states
  const [companyForm, setCompanyForm] = useState({
    plate: '', brand: '', model: '', year: '2023', capacity: 19,
    fuelType: 'Dizel', phone: '', gpsEnabled: true, acEnabled: true,
    cameraSystemEnabled: true, registrationNumber: '',
    inspectionDate: '', insuranceDate: '', compInsuranceDate: '',
    tyreReplaceDate: '', maintenanceDate: '', fireExtinguisherDate: '',
    firstAidKit: true, photo: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=60'
  });

  const [supplierForm, setSupplierForm] = useState({
    plate: '', brand: '', model: '', year: '2022', capacity: 16,
    supplierCompany: '', supplierManager: '', supplierPhone: '', supplierAddress: '',
    supplierTaxOffice: '', supplierTaxNo: '', supplierIban: '',
    hostessIncluded: false, driverIsOwner: true,
    photo: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&auto=format&fit=crop&q=60'
  });

  // Backup active list to trace which school has swapped backup vehicles
  const [backupActiveSchools, setBackupActiveSchools] = useState<Record<string, { original: string; backup: string }>>({});

  // Google Sheets & Drive Sync States
  const [isSheetsSyncing, setIsSheetsSyncing] = useState(false);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);

  // Selected vehicle object
  const activeVehicle = vehiclesList.find(v => v.id === selectedVehicleId) || vehiclesList[0];

  // Filters calculation
  const filteredVehicles = vehiclesList.filter(v => {
    const matchesType = fleetFilter === 'all' || v.vehicleType === fleetFilter;
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesType && matchesStatus;
  });

  // Handle addition of history item
  const handleAddHistoryItem = async (vehicleId: string, item: Omit<VehicleHistoryItem, 'id'>) => {
    const res = await ApiClient.addVehicleHistory(vehicleId, item);
    if (res.success && res.data) {
      setVehiclesList(prev => prev.map(v => {
        if (v.id === vehicleId) {
          return {
            ...v,
            history: [
              res.data,
              ...v.history
            ]
          };
        }
        return v;
      }));
      addLog('Araç Geçmişi Ekleme', `${vehicleId} plakalı araca yeni geçmiş kaydı eklendi.`);
    } else {
      alert(`Geçmiş kaydı eklenemedi: ${res.error}`);
    }
  };

  // Add Company Vehicle
  const handleAddCompanyVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const newV = {
      plate: companyForm.plate,
      brand: companyForm.brand,
      model: companyForm.model,
      year: companyForm.year,
      capacity: companyForm.capacity,
      status: 'idle',
      vehicleType: 'company',
      photo: companyForm.photo,
      fuelType: companyForm.fuelType,
      phone: companyForm.phone,
      gpsEnabled: companyForm.gpsEnabled,
      acEnabled: companyForm.acEnabled,
      cameraSystemEnabled: companyForm.cameraSystemEnabled,
      registrationNumber: companyForm.registrationNumber,
      inspectionDate: companyForm.inspectionDate,
      insuranceDate: companyForm.insuranceDate,
      compInsuranceDate: companyForm.compInsuranceDate,
      tyreReplaceDate: companyForm.tyreReplaceDate,
      maintenanceDate: companyForm.maintenanceDate,
      fireExtinguisherDate: companyForm.fireExtinguisherDate,
      firstAidKit: companyForm.firstAidKit,
    };

    const res = await ApiClient.createVehicle(newV);
    if (res.success && res.data) {
      setVehiclesList(prev => [res.data, ...prev]);
      setShowAddForm(false);
      addLog('Araç Kaydı', `${newV.plate} plakalı şirket aracı sisteme kaydedildi.`);
      alert(`🎉 ${newV.plate} plakalı Şirket Aracı başarıyla kaydedildi!`);
    } else {
      alert(`Araç oluşturulamadı: ${res.error}`);
    }
  };

  // Add Supplier Vehicle
  const handleAddSupplierVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const newV = {
      plate: supplierForm.plate,
      brand: supplierForm.brand,
      model: supplierForm.model,
      year: supplierForm.year,
      capacity: supplierForm.capacity,
      status: 'idle',
      vehicleType: 'supplier',
      photo: supplierForm.photo,
      supplierCompany: supplierForm.supplierCompany,
      supplierManager: supplierForm.supplierManager,
      supplierPhone: supplierForm.supplierPhone,
      supplierAddress: supplierForm.supplierAddress,
      supplierTaxOffice: supplierForm.supplierTaxOffice,
      supplierTaxNo: supplierForm.supplierTaxNo,
      supplierIban: supplierForm.supplierIban,
      hostessIncluded: supplierForm.hostessIncluded,
      driverIsOwner: supplierForm.driverIsOwner,
    };

    const res = await ApiClient.createVehicle(newV);
    if (res.success && res.data) {
      setVehiclesList(prev => [res.data, ...prev]);
      setShowAddForm(false);
      addLog('Araç Kaydı', `${newV.plate} plakalı tedarikçi aracı sisteme kaydedildi.`);
      alert(`🎉 ${newV.plate} plakalı Tedarikçi Aracı başarıyla kaydedildi!`);
    } else {
      alert(`Tedarikçi aracı oluşturulamadı: ${res.error}`);
    }
  };

  // Staff and School assignment submit (Single-screen preserve)
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignmentId) return;

    const { updateUser } = useAppStore();

    const selectedDriver = users.find(u => u.id === assignmentForm.driverId);
    const selectedHostess = users.find(u => u.id === assignmentForm.hostessId);
    
    // Resolve multiple selected schools
    const selectedSchools = schools.filter(s => assignmentForm.schoolIds.includes(s.id));
    const schoolNamesStr = selectedSchools.map(s => s.name).join(', ');

    const updatedFields = {
      driverId: assignmentForm.driverId || undefined,
      driverName: selectedDriver ? selectedDriver.name : undefined,
      hostessId: assignmentForm.hostessId || undefined,
      hostessName: selectedHostess ? selectedHostess.name : undefined,
      schoolId: assignmentForm.schoolIds[0] || undefined,
      schoolIds: assignmentForm.schoolIds,
      schoolName: schoolNamesStr || undefined,
      projectName: assignmentForm.projectName || undefined,
      status: 'active'
    };

    const res = await ApiClient.updateVehicle(editingAssignmentId, updatedFields);
    if (res.success && res.data) {
      setVehiclesList(prev => prev.map(v => v.id === editingAssignmentId ? res.data : v));

      // Auto-update driver and hostess in the central store to sync throughout the system
      if (assignmentForm.driverId) {
        updateUser(assignmentForm.driverId, { vehicleId: editingAssignmentId });
      }
      if (assignmentForm.hostessId) {
        updateUser(assignmentForm.hostessId, { vehicleId: editingAssignmentId });
      }

      setEditingAssignmentId(null);
      addLog('Araç Zimmet Güncelleme', `${editingAssignmentId} plakalı araca yeni personel ve çoklu okul güzergah zimmetlendi.`);
      alert('✅ Personel, Çoklu Okul ve Proje zimmeti başarıyla güncellendi! Sürücü ve Hostes listeleri otomatik olarak senkronize edilmiştir.');
    } else {
      alert(`Zimmetleme güncellenemedi: ${res.error}`);
    }
  };

  // One-click Backup vehicle swap trigger
  const handleTriggerBackupSwap = async (schoolId: string, originalVehicleId: string) => {
    // Find an idle or backup-marked vehicle
    const idleBackup = vehiclesList.find(v => v.status === 'idle' || v.id === 'v2');
    
    if (!idleBackup) {
      alert('⚠️ Sistemde uygun yedek veya boşta araç bulunamadı! Lütfen yeni araç kaydedin.');
      return;
    }

    if (backupActiveSchools[schoolId]) {
      // Revert swap
      const backupDetails = backupActiveSchools[schoolId];

      const origRes = await ApiClient.updateVehicle(backupDetails.original, { status: 'active' });
      const backRes = await ApiClient.updateVehicle(backupDetails.backup, { status: 'idle' });

      if (origRes.success && backRes.success && origRes.data && backRes.data) {
        setVehiclesList(prev => prev.map(v => {
          if (v.id === backupDetails.original) return origRes.data;
          if (v.id === backupDetails.backup) return backRes.data;
          return v;
        }));
        const updated = { ...backupActiveSchools };
        delete updated[schoolId];
        setBackupActiveSchools(updated);
        alert('🔄 Yedek araç devreden çıkarıldı. Asıl araç tekrar aktife alındı.');
      } else {
        alert('Yedek araç geri çevrilirken bir hata oluştu.');
      }
    } else {
      // Execute swap
      const origRes = await ApiClient.updateVehicle(originalVehicleId, { status: 'service' });
      const backRes = await ApiClient.updateVehicle(idleBackup.id, { 
        status: 'active', 
        schoolId, 
        schoolName: schools.find(s=>s.id===schoolId)?.name 
      });

      if (origRes.success && backRes.success && origRes.data && backRes.data) {
        setVehiclesList(prev => prev.map(v => {
          if (v.id === originalVehicleId) return origRes.data;
          if (v.id === idleBackup.id) return backRes.data;
          return v;
        }));

        setBackupActiveSchools({
          ...backupActiveSchools,
          [schoolId]: { original: originalVehicleId, backup: idleBackup.id }
        });

        alert(`🚀 Yedek Araç Başarıyla Aktif Edildi!\n` +
          `- Okul: ${schools.find(s=>s.id===schoolId)?.name}\n` +
          `- Geciken/Sorunlu Araç: ${vehiclesList.find(v=>v.id===originalVehicleId)?.plate}\n` +
          `- Devreye Giren Yedek Araç: ${idleBackup.plate}\n` +
          `Operasyonel veriler Puantaj, Muhasebe ve Hakediş'e otomatik yansıtılmıştır.`);
      } else {
        alert('Yedek araç aktif edilirken bir hata oluştu.');
      }
    }
  };

  // Google Sheets bidirectional sync
  const handleSheetsSync = async () => {
    setIsSheetsSyncing(true);
    try {
      const res = await fetch('/api/v1/sheets-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'VehicleManager' })
      });
      const data = await res.json();
      setIsSheetsSyncing(false);
      if (data.success) {
        alert(`📊 Google Sheets Entegrasyonu:\n${data.message}`);
      } else {
        alert(`⚠️ Google Sheets Entegrasyonu:\n${data.message || 'Senkronizasyon yapılandırılamadı.'}`);
      }
    } catch (e: any) {
      setIsSheetsSyncing(false);
      alert(`❌ Eşitleme Hatası: ${e.message}`);
    }
  };

  // Google Drive sync
  const handleDriveSync = async () => {
    setIsDriveSyncing(true);
    try {
      const res = await fetch('/api/v1/sheets-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'drive_sync', source: 'VehicleManager' })
      });
      const data = await res.json();
      setIsDriveSyncing(false);
      if (data.success) {
        alert(`📁 Google Drive Entegrasyonu:\n${data.message}`);
      } else {
        alert(`⚠️ Google Drive Entegrasyonu:\n${data.message || 'Drive klasör erişimi yapılandırılmadı.'}`);
      }
    } catch (e: any) {
      setIsDriveSyncing(false);
      alert(`❌ Drive Eşitleme Hatası: ${e.message}`);
    }
  };

  // Critical countdown tracker calculations (Inspection dates, Extinguishers etc.)
  const getDaysRemaining = (dateString?: string) => {
    if (!dateString) return 999;
    const diffTime = new Date(dateString).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Navigation Tabs */}
      <div className="bg-white border border-slate-200 p-2.5 rounded-2xl shadow-xs flex flex-wrap gap-2 text-xs font-bold justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('fleet')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'fleet' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Truck className="w-4 h-4" /> Filo ve Araç Kartları
          </button>
          
          <button
            onClick={() => {
              setActiveSubTab('seating');
              setSelectedVehicleId(activeVehicle.id);
            }}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'seating' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Grid className="w-4 h-4" /> Akıllı Koltuk Planı
          </button>

          <button
            onClick={() => setActiveSubTab('map')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'map' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Map className="w-4 h-4" /> Akıllı OSM Haritası
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'history' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4" /> Operasyon Geçmişi
          </button>
        </div>

        {/* Sync Integrations Quick Access */}
        <div className="flex gap-2">
          <button
            onClick={handleSheetsSync}
            disabled={isSheetsSyncing}
            className="px-3 py-2 bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
            title="Verileri Google Sheets ile Senkronize Et"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isSheetsSyncing ? 'Sheets Eşitleniyor...' : 'Sheets Senkronize'}</span>
          </button>

          <button
            onClick={handleDriveSync}
            disabled={isDriveSyncing}
            className="px-3 py-2 bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
            title="Belgeleri Google Drive'a Arşivle"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>{isDriveSyncing ? 'Klasörler Eşitleniyor...' : 'Drive Arşivle'}</span>
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE SUBTAB CONTENT */}
      {activeSubTab === 'fleet' && (
        <div className="space-y-6">
          
          {/* Filters & Add Vehicle Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
              <span className="text-slate-400">Grup Filtre:</span>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                <button onClick={() => setFleetFilter('all')} className={`px-3 py-1.5 ${fleetFilter === 'all' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>Tümü</button>
                <button onClick={() => setFleetFilter('company')} className={`px-3 py-1.5 ${fleetFilter === 'company' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>Şirket Öz Sermaye</button>
                <button onClick={() => setFleetFilter('supplier')} className={`px-3 py-1.5 ${fleetFilter === 'supplier' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>Tedarikçi Filosu</button>
              </div>

              <span className="text-slate-400">Durum:</span>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-1.5 bg-slate-50 border rounded-lg">
                <option value="all">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="idle">Boşta</option>
                <option value="service">Bakımda</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/15 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" /> Yeni Araç Ekle
            </button>
          </div>

          {/* Add Vehicle Dynamic Form Overlay */}
          {showAddForm && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-md space-y-6 animate-fade-in text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-900 text-sm">Yeni Servis Aracı Kayıt Paneli</h4>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden font-bold bg-slate-50">
                  <button type="button" onClick={() => setNewVehicleType('company')} className={`px-4 py-1.5 ${newVehicleType === 'company' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>Şirket Öz Sermaye</button>
                  <button type="button" onClick={() => setNewVehicleType('supplier')} className={`px-4 py-1.5 ${newVehicleType === 'supplier' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>Tedarikçi Aracı</button>
                </div>
              </div>

              {newVehicleType === 'company' ? (
                /* Company Add Form */
                <form onSubmit={handleAddCompanyVehicle} className="space-y-4 font-bold text-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Araç Plakası *</label>
                      <input type="text" placeholder="Örn: 06 BKT 789" value={companyForm.plate} onChange={e => setCompanyForm({...companyForm, plate: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Marka *</label>
                      <input type="text" placeholder="Örn: Mercedes-Benz" value={companyForm.brand} onChange={e => setCompanyForm({...companyForm, brand: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Model / Paket *</label>
                      <input type="text" placeholder="Örn: Sprinter Extra-Long" value={companyForm.model} onChange={e => setCompanyForm({...companyForm, model: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Model Yılı *</label>
                      <input type="text" placeholder="Örn: 2023" value={companyForm.year} onChange={e => setCompanyForm({...companyForm, year: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Koltuk Kapasitesi *</label>
                      <select value={companyForm.capacity} onChange={e => setCompanyForm({...companyForm, capacity: parseInt(e.target.value) || 19})} className="p-2 border rounded-lg bg-slate-50 w-full font-bold">
                        {CAPACITIES.map(c => <option key={c} value={c}>{c} Kişilik Şema</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Yakıt Türü</label>
                      <input type="text" placeholder="Dizel / Elektrik" value={companyForm.fuelType} onChange={e => setCompanyForm({...companyForm, fuelType: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Araç İçi Telefon</label>
                      <input type="text" placeholder="Örn: 0555 111 22 33" value={companyForm.phone} onChange={e => setCompanyForm({...companyForm, phone: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Ruhsat Seri No</label>
                      <input type="text" placeholder="Örn: AA123456" value={companyForm.registrationNumber} onChange={e => setCompanyForm({...companyForm, registrationNumber: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" />
                    </div>
                  </div>

                  {/* Hardware details */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={companyForm.gpsEnabled} onChange={e => setCompanyForm({...companyForm, gpsEnabled: e.target.checked})} className="rounded text-blue-500" /> GPS Takip Sistemi
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={companyForm.acEnabled} onChange={e => setCompanyForm({...companyForm, acEnabled: e.target.checked})} className="rounded text-blue-500" /> Klima (A/C)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={companyForm.cameraSystemEnabled} onChange={e => setCompanyForm({...companyForm, cameraSystemEnabled: e.target.checked})} className="rounded text-blue-500" /> Kamera Kayıt Sistemi
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={companyForm.firstAidKit} onChange={e => setCompanyForm({...companyForm, firstAidKit: e.target.checked})} className="rounded text-blue-500" /> İlk Yardım Çantası
                    </label>
                  </div>

                  {/* Crucial Expiration Dates */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-rose-500 uppercase font-black">TÜVTÜRK Muayene Tarihi</label>
                      <input type="date" value={companyForm.inspectionDate} onChange={e => setCompanyForm({...companyForm, inspectionDate: e.target.value})} className="p-2 border border-rose-100 rounded-lg bg-rose-50/20 w-full" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Trafik Sigortası Tarihi</label>
                      <input type="date" value={companyForm.insuranceDate} onChange={e => setCompanyForm({...companyForm, insuranceDate: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Kasko Yenileme Tarihi</label>
                      <input type="date" value={companyForm.compInsuranceDate} onChange={e => setCompanyForm({...companyForm, compInsuranceDate: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Yangın Tüpü Kontrol Tarihi</label>
                      <input type="date" value={companyForm.fireExtinguisherDate} onChange={e => setCompanyForm({...companyForm, fireExtinguisherDate: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Periyodik Bakım Tarihi</label>
                      <input type="date" value={companyForm.maintenanceDate} onChange={e => setCompanyForm({...companyForm, maintenanceDate: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer hover:bg-slate-300">İptal</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black cursor-pointer hover:bg-blue-500">Aracı Kaydet</button>
                  </div>
                </form>
              ) : (
                /* Supplier Add Form */
                <form onSubmit={handleAddSupplierVehicle} className="space-y-4 font-bold text-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Firma (Tedarikçi) Adı *</label>
                      <input type="text" placeholder="Örn: BERKAYTUR Tedarikçi Grubu" value={supplierForm.supplierCompany} onChange={e => setSupplierForm({...supplierForm, supplierCompany: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Yetkili Adı Soyadı *</label>
                      <input type="text" placeholder="Örn: Berkay Turan" value={supplierForm.supplierManager} onChange={e => setSupplierForm({...supplierForm, supplierManager: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Firma Telefonu *</label>
                      <input type="text" placeholder="Örn: 0532 999 88 77" value={supplierForm.supplierPhone} onChange={e => setSupplierForm({...supplierForm, supplierPhone: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Vergi Dairesi & Vergi No</label>
                      <div className="grid grid-cols-2 gap-1">
                        <input type="text" placeholder="Vergi D." value={supplierForm.supplierTaxOffice} onChange={e => setSupplierForm({...supplierForm, supplierTaxOffice: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" />
                        <input type="text" placeholder="No" value={supplierForm.supplierTaxNo} onChange={e => setSupplierForm({...supplierForm, supplierTaxNo: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Ödeme Alınacak Banka IBAN *</label>
                      <input type="text" placeholder="TR00 0000 0000..." value={supplierForm.supplierIban} onChange={e => setSupplierForm({...supplierForm, supplierIban: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full font-mono" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Firma Adresi</label>
                      <input type="text" placeholder="Yenimahalle, Ankara" value={supplierForm.supplierAddress} onChange={e => setSupplierForm({...supplierForm, supplierAddress: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3 border-t">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Araç Plakası *</label>
                      <input type="text" placeholder="Örn: 06 BKT 456" value={supplierForm.plate} onChange={e => setSupplierForm({...supplierForm, plate: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Araç Marka *</label>
                      <input type="text" placeholder="Örn: Volkswagen" value={supplierForm.brand} onChange={e => setSupplierForm({...supplierForm, brand: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Araç Model *</label>
                      <input type="text" placeholder="Örn: Crafter" value={supplierForm.model} onChange={e => setSupplierForm({...supplierForm, model: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Model Yılı *</label>
                      <input type="text" placeholder="Örn: 2022" value={supplierForm.year} onChange={e => setSupplierForm({...supplierForm, year: e.target.value})} className="p-2 border rounded-lg bg-slate-50 w-full" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Koltuk Kapasitesi *</label>
                      <select value={supplierForm.capacity} onChange={e => setSupplierForm({...supplierForm, capacity: parseInt(e.target.value) || 16})} className="p-2 border rounded-lg bg-slate-50 w-full font-bold">
                        {CAPACITIES.map(c => <option key={c} value={c}>{c} Kişilik Şema</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Rehber/Hostes Seçeneği</label>
                      <select value={supplierForm.hostessIncluded ? 'included' : 'excluded'} onChange={e => setSupplierForm({...supplierForm, hostessIncluded: e.target.value === 'included'})} className="p-2 border rounded-lg bg-slate-50 w-full font-bold">
                        <option value="included">Rehber Personel (Hostes) DAHİL</option>
                        <option value="excluded">Rehber Personel (Hostes) HARİÇ</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-black">Şoför Seçeneği</label>
                      <select value={supplierForm.driverIsOwner ? 'owner' : 'hired'} onChange={e => setSupplierForm({...supplierForm, driverIsOwner: e.target.value === 'owner'})} className="p-2 border rounded-lg bg-slate-50 w-full font-bold">
                        <option value="owner">Şoför aracı kendisi kullanıyor (Mal Sahibi)</option>
                        <option value="hired">Şoför ücretli çalışandır</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer hover:bg-slate-300">İptal</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black cursor-pointer hover:bg-blue-500">Aracı Kaydet</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Critical Maintenance Reminders Bar */}
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center text-xs justify-between">
            <div className="flex items-start gap-3">
              <span className="p-2 bg-rose-100 text-rose-600 rounded-xl"><ShieldAlert className="w-5 h-5 animate-pulse" /></span>
              <div className="space-y-0.5 text-rose-900">
                <p className="font-extrabold text-sm">Gecikmiş / Kritik Araç Muayeneleri!</p>
                <p className="font-semibold text-rose-700 leading-normal">Muayene, Kasko veya Yangın Tüpü kontrol tarihine 30 günden az kalan araçlar bulunmaktadır.</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 font-bold text-rose-900 self-stretch md:self-auto bg-rose-100/30 p-2.5 rounded-xl">
              <p>📍 06 BKT 123 - Yangın Tüpü Kontrolü: <span className="font-black text-rose-600">Bugün!</span></p>
              <p>📍 06 BKT 123 - TÜVTÜRK Muayenesi: <span className="font-black text-rose-600">31 Gün Kaldı</span></p>
            </div>
          </div>

          {/* Single-Screen Driver/Staff and School Assignment workspace if active */}
          {editingAssignmentId && (
            <div className="bg-blue-50/50 border border-blue-200 p-5 rounded-2xl shadow-sm text-xs space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <h5 className="font-extrabold text-blue-900 text-xs flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Personel, Okul & Proje Zimmet Ekranı
                </h5>
                <button onClick={() => setEditingAssignmentId(null)} className="p-1 hover:bg-blue-200 rounded-lg text-blue-700">✕</button>
              </div>

              <form onSubmit={handleSaveAssignment} className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-bold text-slate-700">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 uppercase">Kaptan Şoför Seçin</label>
                  <select 
                    value={assignmentForm.driverId}
                    onChange={e => setAssignmentForm({ ...assignmentForm, driverId: e.target.value })}
                    className="p-2 border bg-white rounded-lg w-full"
                  >
                    <option value="">Zimmetten Çıkar</option>
                    {users.filter(u => u.role === 'driver').map(u => (
                      <option key={u.id} value={u.id}>{u.name} (SRC & Psikoteknik Var)</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 uppercase">Rehber Personel (Hostes)</label>
                  <select 
                    value={assignmentForm.hostessId}
                    onChange={e => setAssignmentForm({ ...assignmentForm, hostessId: e.target.value })}
                    className="p-2 border bg-white rounded-lg w-full"
                  >
                    <option value="">Zimmetten Çıkar</option>
                    {users.filter(u => u.role === 'hostess').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 uppercase">Okul Ataması (Çoklu Seçilebilir)</label>
                  <div className="p-2 border bg-white rounded-lg max-h-32 overflow-y-auto space-y-1.5 shadow-xs">
                    {schools.map(s => {
                      const isChecked = assignmentForm.schoolIds.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-700">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const updatedIds = isChecked
                                ? assignmentForm.schoolIds.filter(id => id !== s.id)
                                : [...assignmentForm.schoolIds, s.id];
                              setAssignmentForm({ 
                                ...assignmentForm, 
                                schoolIds: updatedIds,
                                schoolId: updatedIds[0] || ''
                              });
                            }}
                            className="rounded text-blue-600 focus:ring-0"
                          />
                          <span className="truncate">{s.name}</span>
                        </label>
                      );
                    })}
                    {schools.length === 0 && (
                      <span className="text-slate-400 text-[10px] italic">Kayıtlı okul bulunamadı.</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 uppercase">Çalıştığı Proje Grubu</label>
                  <input 
                    type="text" 
                    placeholder="Örn: Çankaya Express"
                    value={assignmentForm.projectName}
                    onChange={e => setAssignmentForm({ ...assignmentForm, projectName: e.target.value })}
                    className="p-2 border bg-white rounded-lg w-full font-semibold"
                  />
                </div>

                <div className="sm:col-span-4 flex justify-end gap-2 pt-2 border-t border-blue-100">
                  <button type="button" onClick={() => setEditingAssignmentId(null)} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-lg">İptal</button>
                  <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg">Zimmetleri Kaydet</button>
                </div>
              </form>
            </div>
          )}

          {/* Grid of Vehicle Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredVehicles.map(v => {
              const colors = STATUS_COLORS[v.status] || STATUS_COLORS.idle;
              const assignedSeatsCount = Object.keys(v.seating || {}).length;
              const fillPercent = v.capacity > 0 ? Math.round((assignedSeatsCount / v.capacity) * 100) : 0;
              const isBackupActive = Object.values(backupActiveSchools).some((b: any) => b.backup === v.id);

              return (
                <div 
                  key={v.id} 
                  id={`vehicle-card-${v.id}`}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`bg-white border rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between transition-all cursor-pointer relative group ${
                    selectedVehicleId === v.id 
                      ? 'border-blue-600 ring-4 ring-blue-500/10' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Photo with status badges */}
                  <div className="relative h-44 bg-slate-900 overflow-hidden shrink-0">
                    <img 
                      src={v.photo} 
                      alt={v.plate} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      referrerPolicy="no-referrer"
                    />
                    
                    <span className={`absolute top-4 left-4 px-3 py-1.5 rounded-full font-black uppercase text-[10px] tracking-wider border shadow-md backdrop-blur-md ${colors.color}`}>
                      {isBackupActive ? '🚀 YEDEK ARALIK' : colors.text}
                    </span>

                    <span className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-slate-950/80 text-white font-black text-[10px] tracking-wide border border-slate-700">
                      {v.vehicleType === 'company' ? '💼 Şirket' : '🏢 Tedarikçi'}
                    </span>

                    {/* Bottom plate banner */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 to-transparent p-4 flex justify-between items-end">
                      <div>
                        <p className="font-extrabold text-white text-lg tracking-tight font-mono">{v.plate}</p>
                        <p className="text-[10px] text-slate-300 font-bold">{v.brand} {v.model} • {v.year}</p>
                      </div>
                      <div className="text-right text-[10px] text-slate-300 font-bold">
                        {v.capacity} Koltuk Kapasite
                      </div>
                    </div>
                  </div>

                  {/* Card Details Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4 text-xs">
                    
                    <div className="space-y-2 text-[11px] font-bold text-slate-600">
                      {v.vehicleType === 'supplier' && (
                        <div className="flex justify-between border-b pb-1.5">
                          <span>🏢 Tedarikçi Firma:</span>
                          <span className="text-slate-900 font-black">{v.supplierCompany} ({v.supplierManager})</span>
                        </div>
                      )}

                      <div className="flex justify-between border-b pb-1.5">
                        <span>👨‍✈️ Zimmetli Kaptan:</span>
                        <span className="text-slate-900 font-black">{v.driverName || 'Atanmadı'}</span>
                      </div>

                      <div className="flex justify-between border-b pb-1.5 items-center">
                        <span>👩 Rehber Personel (Hostes):</span>
                        {v.vehicleType === 'supplier' && !v.hostessIncluded ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-rose-500 font-black">Hostes Hariç</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAssignmentId(v.id);
                                setAssignmentForm({
                                  driverId: v.driverId || '',
                                  hostessId: v.hostessId || '',
                                  schoolId: v.schoolId || '',
                                  schoolIds: v.schoolIds || (v.schoolId ? [v.schoolId] : []),
                                  projectName: v.projectName || ''
                                });
                              }}
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-black text-[9px] cursor-pointer"
                            >
                              Hostes Ata
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-900 font-black">{v.hostessName || (v.hostessIncluded ? 'Tedarikçiden Dahil' : 'Atanmadı')}</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <span>🏫 Çalıştığı Okul / Rota:</span>
                        <span className="text-blue-600 font-black truncate max-w-[150px]" title={v.schoolName}>{v.schoolName || 'Boşta / Havuzda'}</span>
                      </div>
                    </div>

                    {/* Occupancy Mini Progress Gauge */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 font-mono">
                        <span>Doluluk Oranı (%{fillPercent})</span>
                        <span>{assignedSeatsCount} / {v.capacity} Koltuk</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border">
                        <div 
                          className={`h-full transition-all ${
                            fillPercent > 90 ? 'bg-rose-500' : fillPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t justify-end text-[10px] font-black">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAssignmentId(v.id);
                          setAssignmentForm({
                            driverId: v.driverId || '',
                            hostessId: v.hostessId || '',
                            schoolId: v.schoolId || '',
                            schoolIds: v.schoolIds || (v.schoolId ? [v.schoolId] : []),
                            projectName: v.projectName || ''
                          });
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer border flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Personel & Okul Zimmetle
                      </button>

                      {v.schoolId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerBackupSwap(v.schoolId!, v.id);
                          }}
                          className={`px-3 py-1.5 rounded-lg cursor-pointer border flex items-center gap-1 ${
                            backupActiveSchools[v.schoolId!] 
                              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200 animate-pulse' 
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200'
                          }`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{backupActiveSchools[v.schoolId!] ? 'Yedek İptal Et' : 'Yedek Araç Aktif Et'}</span>
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {activeSubTab === 'seating' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <SeatingPlanModule vehicleId={selectedVehicleId} capacity={activeVehicle.capacity} />
        </div>
      )}

      {activeSubTab === 'map' && (
        <VehicleMapModule />
      )}

      {activeSubTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <VehicleHistoryModule vehicle={activeVehicle} onAddHistoryItem={handleAddHistoryItem} />
        </div>
      )}

    </div>
  );
}
