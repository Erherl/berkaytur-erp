import React, { useState, useEffect } from 'react';
import { 
  X, Check, Bus, Upload, Calendar, CreditCard, 
  DollarSign, FileText, Trash2, Plus, Info, User, HelpCircle 
} from 'lucide-react';
import { useAppStore } from '../store';
import { Vehicle, Supplier, User as AppUser } from '../types';
import { generateStrongPassword } from '../utils/security';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
}

export function VehicleFormModal({ isOpen, onClose, schoolId }: VehicleFormModalProps) {
  const { vehicles, addVehicle, updateVehicle, users, suppliers, addLog, updateUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'select' | 'new'>('select');
  
  // New Vehicle form state
  const [vehicleType, setVehicleType] = useState<'company' | 'supplier'>('company');
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [modelYear, setModelYear] = useState('2023');
  const [capacity, setCapacity] = useState(19);
  const [licence, setLicence] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [insuranceDate, setInsuranceDate] = useState('');
  const [exhaustDate, setExhaustDate] = useState('');
  const [notes, setNotes] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  
  // Custom vehicle fields
  const [fuelType, setFuelType] = useState('Dizel');
  const [vehiclePhone, setVehiclePhone] = useState('');
  const [gps, setGps] = useState(true);
  const [airCond, setAirCond] = useState(true);
  const [camera, setCamera] = useState(true);
  const [firstAid, setFirstAid] = useState(true);
  const [compInsuranceDate, setCompInsuranceDate] = useState('');
  const [fireExtinguisherDate, setFireExtinguisherDate] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState('');
  
  // Supplier Driver options
  const [driverOption, setDriverOption] = useState<'owner' | 'wage' | 'later'>('later');
  
  // Inline Driver fields
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverTc, setDriverTc] = useState('');
  const [driverBirthDate, setDriverBirthDate] = useState('');
  const [driverLicenseClass, setDriverLicenseClass] = useState('D Sınıfı');
  const [driverSrc, setDriverSrc] = useState('');
  const [driverPsychotechnic, setDriverPsychotechnic] = useState('');
  const [driverHealthReport, setDriverHealthReport] = useState('');
  const [driverCriminalRecord, setDriverCriminalRecord] = useState('');
  const [driverAddress, setDriverAddress] = useState('');
  const [driverPhoto, setDriverPhoto] = useState<string | null>(null);
  const [driverDocs, setDriverDocs] = useState<{name: string, size: string}[]>([]);
  
  // Hostess options
  const [hostessOption, setHostessOption] = useState<'none' | 'active' | 'later'>('later');
  
  // Inline Hostess fields
  const [hostessName, setHostessName] = useState('');
  const [hostessPhone, setHostessPhone] = useState('');
  const [hostessTc, setHostessTc] = useState('');
  const [hostessBirthDate, setHostessBirthDate] = useState('');
  const [hostessAddress, setHostessAddress] = useState('');
  const [hostessPhoto, setHostessPhoto] = useState<string | null>(null);
  const [hostessIdCard, setHostessIdCard] = useState('');
  const [hostessHealthReport, setHostessHealthReport] = useState('');
  const [hostessCriminalRecord, setHostessCriminalRecord] = useState('');
  const [hostessDocs, setHostessDocs] = useState<{name: string, size: string}[]>([]);

  // Nested Personnel triggers
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showHostessModal, setShowHostessModal] = useState(false);
  const [createdDriverId, setCreatedDriverId] = useState<string | undefined>(undefined);
  const [createdHostessId, setCreatedHostessId] = useState<string | undefined>(undefined);

  if (!isOpen) return null;

  // Unassigned or central vehicles
  const centralVehicles = vehicles.filter(v => !v.schoolId);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDriverPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDriverPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDriverDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newList = [...driverDocs];
      for (let i = 0; i < files.length; i++) {
        newList.push({
          name: files[i].name,
          size: (files[i].size / 1024).toFixed(1) + ' KB'
        });
      }
      setDriverDocs(newList);
    }
  };

  const handleHostessPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHostessPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHostessDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newList = [...hostessDocs];
      for (let i = 0; i < files.length; i++) {
        newList.push({
          name: files[i].name,
          size: (files[i].size / 1024).toFixed(1) + ' KB'
        });
      }
      setHostessDocs(newList);
    }
  };

  const handleSelectVehicle = (id: string) => {
    updateVehicle(id, { schoolId });
    addLog('Araca Okul Atandı', `Mevcut araç (${id}) ${schoolId} okuluna atandı.`);
    onClose();
  };

  const handleCreateVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate || !brand || !model) return;

    const newVehicleId = `v_${Date.now()}`;
    let finalDriverId = createdDriverId;
    let finalHostessId = createdHostessId;

    // Create Driver inline if selected and name is entered
    if (vehicleType === 'supplier' && (driverOption === 'owner' || driverOption === 'wage') && driverName) {
      const newDriverId = `u_driver_${Date.now()}`;
      const newDriver = {
        id: newDriverId,
        role: 'driver' as const,
        name: driverName,
        username: `driver_${driverPhone.replace(/\s+/g, '') || Date.now()}`,
        password: generateStrongPassword(),
        email: `${driverPhone.replace(/\s+/g, '') || Date.now()}@berkaytur.com`,
        phone: driverPhone,
        status: 'active' as const,
        isCompany: false,
        tc: driverTc,
        birthDate: driverBirthDate,
        licenseClass: driverLicenseClass,
        src: driverSrc,
        psychotechnic: driverPsychotechnic,
        healthReport: driverHealthReport,
        criminalRecord: driverCriminalRecord,
        address: driverAddress,
        photo: driverPhoto || undefined,
        documents: driverDocs.map(d => d.name),
        vehicleId: newVehicleId,
        supplierId: supplierId || undefined
      };
      
      const { users: existingUsers } = useAppStore.getState();
      useAppStore.setState({ users: [...existingUsers, newDriver] });
      addLog('Personel Eklendi (Şoför)', `${driverName} tedarikçi şoförü olarak sisteme kaydedildi.`);
      finalDriverId = newDriverId;
    }

    // Create Hostess inline if selected and name entered
    if (hostessOption === 'active' && hostessName) {
      const newHostessId = `u_hostess_${Date.now()}`;
      const newHostess = {
        id: newHostessId,
        role: 'hostess' as const,
        name: hostessName,
        username: `hostess_${hostessPhone.replace(/\s+/g, '') || Date.now()}`,
        password: generateStrongPassword(),
        email: `${hostessPhone.replace(/\s+/g, '') || Date.now()}@berkaytur.com`,
        phone: hostessPhone,
        status: 'active' as const,
        isCompany: vehicleType === 'company',
        tc: hostessTc,
        birthDate: hostessBirthDate,
        address: hostessAddress,
        idCard: hostessIdCard,
        healthReport: hostessHealthReport,
        criminalRecord: hostessCriminalRecord,
        photo: hostessPhoto || undefined,
        documents: hostessDocs.map(d => d.name),
        vehicleId: newVehicleId
      };

      const { users: existingUsers } = useAppStore.getState();
      useAppStore.setState({ users: [...existingUsers, newHostess] });
      addLog('Personel Eklendi (Hostes)', `${hostessName} rehber hostes olarak sisteme kaydedildi.`);
      finalHostessId = newHostessId;
    }

    addVehicle({
      id: newVehicleId,
      plate: plate.toUpperCase(),
      brand,
      model,
      capacity,
      status: 'active',
      schoolId,
      vehicleType,
      modelYear,
      licence,
      inspectionDate,
      insuranceDate,
      exhaustDate,
      photo: photo || undefined,
      notes,
      supplierId: vehicleType === 'supplier' ? supplierId : undefined,
      driverId: finalDriverId,
      hostessId: finalHostessId,
      fuelType,
      vehiclePhone,
      gps,
      airCond,
      camera,
      firstAid,
      compInsuranceDate,
      fireExtinguisherDate,
      maintenanceDate
    });

    // Link pre-created personnel to the vehicle
    if (finalDriverId) {
      updateUser(finalDriverId, { vehicleId: newVehicleId });
    }
    if (finalHostessId) {
      updateUser(finalHostessId, { vehicleId: newVehicleId });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] text-slate-800 font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-xs">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Okula Araç Ekle & Ata</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aracı doğrudan bu okula bağlar</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-2.5 gap-2">
          <button
            onClick={() => setActiveTab('select')}
            className={`flex-1 py-2 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer text-center ${
              activeTab === 'select' 
                ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            📋 Araç Havuzundan Seç
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-2 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer text-center ${
              activeTab === 'new' 
                ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            ✨ Yeni Araç Kaydet ve Ata
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'select' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 text-blue-900 text-xs leading-relaxed">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p>
                  Aşağıda şu anda herhangi bir okula atanmamış, merkezi araç havuzunda bulunan araçlar listelenmiştir. Seçtiğiniz araç doğrudan bu okulun hizmetine tahsis edilecektir.
                </p>
              </div>

              {centralVehicles.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold text-xs">Havuzda boşta araç bulunmamaktadır.</p>
                  <button 
                    onClick={() => setActiveTab('new')}
                    className="mt-3 text-xs text-blue-600 hover:underline font-black uppercase tracking-wider"
                  >
                    Yeni Araç Oluştur &rarr;
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {centralVehicles.map(veh => (
                    <div 
                      key={veh.id}
                      className="border border-slate-200 rounded-2xl p-4 bg-white flex items-center justify-between hover:border-blue-300 transition-all shadow-xs"
                    >
                      <div>
                        <span className="bg-slate-900 text-white font-mono font-bold px-2 py-0.5 rounded-md text-[11px]">
                          {veh.plate}
                        </span>
                        <h4 className="font-extrabold text-slate-800 text-sm mt-1">{veh.brand} {veh.model}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kapasite: {veh.capacity} Kişi</p>
                      </div>
                      <button
                        onClick={() => handleSelectVehicle(veh.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Seç ve Ata
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'new' && (
            <form onSubmit={handleCreateVehicleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Araç Sahiplik Tipi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVehicleType('company')}
                      className={`py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                        vehicleType === 'company' 
                          ? 'bg-blue-50 border-blue-500 text-blue-700' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      🏢 Şirket Öz Mal Aracı
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleType('supplier')}
                      className={`py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                        vehicleType === 'supplier' 
                          ? 'bg-blue-50 border-blue-500 text-blue-700' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      🤝 Tedarikçi / Taşeron Aracı
                    </button>
                  </div>
                </div>

                {vehicleType === 'supplier' && (
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Tedarikçi Firma Seçimi</label>
                    <select
                      required
                      value={supplierId}
                      onChange={e => setSupplierId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                    >
                      <option value="">-- Bir Tedarikçi Seçiniz --</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.id}>{sup.companyName} ({sup.authorized})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Plaka</label>
                  <input
                    required
                    type="text"
                    placeholder="Örn: 06 BKT 123"
                    value={plate}
                    onChange={e => setPlate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Marka</label>
                  <input
                    required
                    type="text"
                    placeholder="Örn: Mercedes-Benz"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Model</label>
                  <input
                    required
                    type="text"
                    placeholder="Örn: Sprinter 319 CDI"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Model Yılı</label>
                  <input
                    required
                    type="text"
                    placeholder="Örn: 2023"
                    value={modelYear}
                    onChange={e => setModelYear(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Kapasite / Koltuk Sayısı</label>
                  <select
                    value={capacity}
                    onChange={e => setCapacity(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  >
                    <option value={16}>16 Kişilik (Yarım Otobüs/Crafter/Sprinter)</option>
                    <option value={19}>19 Kişilik (Sprinter/Crafter vb.)</option>
                    <option value={27}>27 Kişilik (Midi Bus/Novo vb.)</option>
                    <option value={35}>35 Kişilik (Midi/Otokar vb.)</option>
                    <option value={44}>44 Kişilik (Büyük Otobüs/Safir/Tourliner)</option>
                    <option value={46}>46 Kişilik (Büyük Otobüs)</option>
                    <option value={54}>54 Kişilik (Mega Çift Katlı vb.)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Ruhsat Seri No</label>
                  <input
                    type="text"
                    placeholder="Örn: AC 123456"
                    value={licence}
                    onChange={e => setLicence(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" /> Muayene Geçerlilik Tarihi
                  </label>
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={e => setInspectionDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Trafik Sigorta Tarihi
                  </label>
                  <input
                    type="date"
                    value={insuranceDate}
                    onChange={e => setInsuranceDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" /> Egzoz Emisyon Muayene Tarihi
                  </label>
                  <input
                    type="date"
                    value={exhaustDate}
                    onChange={e => setExhaustDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Yakıt Türü</label>
                  <select
                    value={fuelType}
                    onChange={e => setFuelType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  >
                    <option value="Dizel">Dizel</option>
                    <option value="Benzin">Benzin</option>
                    <option value="LPG">LPG</option>
                    <option value="Elektrik">Elektrik</option>
                    <option value="Hibrit">Hibrit</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Araç Telefonu</label>
                  <input
                    type="text"
                    placeholder="Örn: 0533 XXX XX XX"
                    value={vehiclePhone}
                    onChange={e => setVehiclePhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Kasko Tarihi
                  </label>
                  <input
                    type="date"
                    value={compInsuranceDate}
                    onChange={e => setCompInsuranceDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-red-500" /> Yangın Tüpü Kontrol Tarihi
                  </label>
                  <input
                    type="date"
                    value={fireExtinguisherDate}
                    onChange={e => setFireExtinguisherDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-500" /> Periyodik Bakım Tarihi
                  </label>
                  <input
                    type="date"
                    value={maintenanceDate}
                    onChange={e => setMaintenanceDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div className="col-span-2 space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">Araç Donanımları & Özellikleri</label>
                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gps}
                        onChange={e => setGps(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      🌐 GPS / Takip Cihazı Var
                    </label>
                    <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={airCond}
                        onChange={e => setAirCond(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      ❄️ Klima Var
                    </label>
                    <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={camera}
                        onChange={e => setCamera(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      📹 Araç İçi Kamera Var
                    </label>
                    <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={firstAid}
                        onChange={e => setFirstAid(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      🩹 İlk Yardım Çantası Var
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Araç Görseli / Fotoğrafı</label>
                  <div className="relative border border-dashed border-slate-200 bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center min-h-[42px] cursor-pointer hover:bg-slate-100 transition-all">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {photo ? (
                      <div className="flex items-center gap-2">
                        <img src={photo} alt="Car Preview" className="w-8 h-8 rounded-lg object-cover" />
                        <span className="text-[10px] text-slate-500 font-bold">Fotoğraf Seçildi</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase">
                        <Upload className="w-3.5 h-3.5" /> Görsel Seç
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Özel Notlar & Not Defteri</label>
                  <textarea
                    rows={2}
                    placeholder="Araçla ilgili bakım, kasko veya diğer idari detayları buraya yazabilirsiniz..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>

              {/* Inline Driver & Hostess fast creation buttons */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  👤 Görevli Tanımlama (Şoför & Rehber Hostes)
                </h4>

                {/* Driver Section - ONLY for Supplier Vehicle */}
                {vehicleType === 'supplier' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Şoför Atama Seçeneği</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDriverOption('owner')}
                        className={`py-2 px-1 rounded-xl text-[10px] font-extrabold border cursor-pointer transition-all ${
                          driverOption === 'owner'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                            : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        🚗 Araç sahibi kullanacak
                      </button>
                      <button
                        type="button"
                        onClick={() => setDriverOption('wage')}
                        className={`py-2 px-1 rounded-xl text-[10px] font-extrabold border cursor-pointer transition-all ${
                          driverOption === 'wage'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                            : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        💼 Ücretli şoför çalışacak
                      </button>
                      <button
                        type="button"
                        onClick={() => setDriverOption('later')}
                        className={`py-2 px-1 rounded-xl text-[10px] font-extrabold border cursor-pointer transition-all ${
                          driverOption === 'later'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                            : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        ⏳ Şoför daha sonra atanacak
                      </button>
                    </div>

                    {(driverOption === 'owner' || driverOption === 'wage') && (
                      <div className="space-y-3 pt-2 border-t border-slate-200/60 transition-all">
                        <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Şoför Kartı Bilgileri (İsteğe Bağlı)</p>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Ad Soyad</label>
                            <input
                              type="text"
                              placeholder="Ad Soyad"
                              value={driverName}
                              onChange={e => setDriverName(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Telefon</label>
                            <input
                              type="text"
                              placeholder="Telefon"
                              value={driverPhone}
                              onChange={e => setDriverPhone(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">TC Kimlik No</label>
                            <input
                              type="text"
                              maxLength={11}
                              placeholder="TC Kimlik No"
                              value={driverTc}
                              onChange={e => setDriverTc(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Doğum Tarihi</label>
                            <input
                              type="date"
                              value={driverBirthDate}
                              onChange={e => setDriverBirthDate(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Ehliyet Sınıfı</label>
                            <select
                              value={driverLicenseClass}
                              onChange={e => setDriverLicenseClass(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                            >
                              <option value="B Sınıfı">B Sınıfı</option>
                              <option value="D1 Sınıfı">D1 Sınıfı</option>
                              <option value="D Sınıfı">D Sınıfı</option>
                              <option value="E Sınıfı">E Sınıfı</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">SRC Belgeleri</label>
                            <input
                              type="text"
                              placeholder="Örn: SRC-2, SRC-4"
                              value={driverSrc}
                              onChange={e => setDriverSrc(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Psikoteknik Geçerlilik</label>
                            <input
                              type="date"
                              value={driverPsychotechnic}
                              onChange={e => setDriverPsychotechnic(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Sağlık Raporu Geçerlilik</label>
                            <input
                              type="date"
                              value={driverHealthReport}
                              onChange={e => setDriverHealthReport(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Sabıka Kaydı Geçerlilik</label>
                            <input
                              type="date"
                              value={driverCriminalRecord}
                              onChange={e => setDriverCriminalRecord(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Şoför Fotoğrafı</label>
                            <div className="relative border border-dashed border-slate-200 bg-white rounded-lg p-2 flex flex-col items-center justify-center min-h-[36px] cursor-pointer hover:bg-slate-50 transition-all">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleDriverPhotoUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                              {driverPhoto ? (
                                <span className="text-[9px] text-emerald-600 font-bold">✓ Fotoğraf Seçildi</span>
                              ) : (
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Görsel Seç</span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1 col-span-2">
                            <label className="text-[10px] font-bold text-slate-500">Adres</label>
                            <textarea
                              rows={1}
                              placeholder="İkametgah Adresi"
                              value={driverAddress}
                              onChange={e => setDriverAddress(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <label className="text-[10px] font-bold text-slate-500">Dosya / Evrak Yükleme</label>
                            <div className="relative border border-dashed border-slate-200 bg-white rounded-lg p-2.5 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all">
                              <input 
                                type="file" 
                                multiple
                                onChange={handleDriverDocUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                              <span className="text-[9px] text-slate-400 font-bold uppercase">+ Belge/Evrak Ekle ({driverDocs.length})</span>
                            </div>
                            {driverDocs.length > 0 && (
                              <div className="mt-1 space-y-1">
                                {driverDocs.map((d, i) => (
                                  <div key={i} className="flex justify-between items-center bg-white border border-slate-100 rounded p-1 text-[9px] text-slate-500">
                                    <span className="truncate">{d.name}</span>
                                    <span className="text-slate-400 font-bold">{d.size}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {driverOption === 'later' && (
                      <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-semibold">Mevcut tanımlı şoförlerden atama yapmak ister misiniz?</span>
                        <button
                          type="button"
                          onClick={() => setShowDriverModal(true)}
                          className="py-1 px-3 rounded-lg text-[9px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-all"
                        >
                          {createdDriverId ? '✅ Şoför Atandı' : '🔍 Şoför Seç / Ekle'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Company driver fallback button for company vehicles */}
                {vehicleType === 'company' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-700">Şirket Şoförü</h5>
                      <p className="text-[9px] text-slate-500">Bu şirkete ait araç için sistemdeki havuzdan şoför atayabilirsiniz.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDriverModal(true)}
                      className={`py-1.5 px-3 rounded-xl text-[10px] font-extrabold border cursor-pointer transition-all flex items-center gap-1.5 ${
                        createdDriverId 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                          : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" /> {createdDriverId ? '✅ Şoför Atandı' : '+ Şoför Ata'}
                    </button>
                  </div>
                )}

                {/* Hostess Section - for ALL vehicles */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Rehber Hostes Atama Seçeneği</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setHostessOption('none')}
                      className={`py-2 px-1 rounded-xl text-[10px] font-extrabold border cursor-pointer transition-all ${
                        hostessOption === 'none'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      ❌ Hostes bulunmayacak
                    </button>
                    <button
                      type="button"
                      onClick={() => setHostessOption('active')}
                      className={`py-2 px-1 rounded-xl text-[10px] font-extrabold border cursor-pointer transition-all ${
                        hostessOption === 'active'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      🌸 Hostes çalışacak
                    </button>
                    <button
                      type="button"
                      onClick={() => setHostessOption('later')}
                      className={`py-2 px-1 rounded-xl text-[10px] font-extrabold border cursor-pointer transition-all ${
                        hostessOption === 'later'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      ⏳ Daha sonra atanacak
                    </button>
                  </div>

                  {hostessOption === 'active' && (
                    <div className="space-y-3 pt-2 border-t border-slate-200/60 transition-all">
                      <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Hostes Kartı Bilgileri (İsteğe Bağlı)</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Ad Soyad</label>
                          <input
                            type="text"
                            placeholder="Ad Soyad"
                            value={hostessName}
                            onChange={e => setHostessName(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Telefon</label>
                          <input
                            type="text"
                            placeholder="Telefon"
                            value={hostessPhone}
                            onChange={e => setHostessPhone(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">TC Kimlik No</label>
                          <input
                            type="text"
                            maxLength={11}
                            placeholder="TC Kimlik No"
                            value={hostessTc}
                            onChange={e => setHostessTc(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Doğum Tarihi</label>
                          <input
                            type="date"
                            value={hostessBirthDate}
                            onChange={e => setHostessBirthDate(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Kimlik Kartı Seri No</label>
                          <input
                            type="text"
                            placeholder="Örn: A01-B12"
                            value={hostessIdCard}
                            onChange={e => setHostessIdCard(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Sağlık Raporu Geçerlilik</label>
                          <input
                            type="date"
                            value={hostessHealthReport}
                            onChange={e => setHostessHealthReport(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Sabıka Kaydı Geçerlilik</label>
                          <input
                            type="date"
                            value={hostessCriminalRecord}
                            onChange={e => setHostessCriminalRecord(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Hostes Fotoğrafı</label>
                          <div className="relative border border-dashed border-slate-200 bg-white rounded-lg p-2 flex flex-col items-center justify-center min-h-[36px] cursor-pointer hover:bg-slate-50 transition-all">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleHostessPhotoUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            {hostessPhoto ? (
                              <span className="text-[9px] text-emerald-600 font-bold">✓ Fotoğraf Seçildi</span>
                            ) : (
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Görsel Seç</span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] font-bold text-slate-500">Adres</label>
                          <textarea
                            rows={1}
                            placeholder="İkametgah Adresi"
                            value={hostessAddress}
                            onChange={e => setHostessAddress(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] font-bold text-slate-500">Dosya / Evrak Yükleme</label>
                          <div className="relative border border-dashed border-slate-200 bg-white rounded-lg p-2.5 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all">
                            <input 
                              type="file" 
                              multiple
                              onChange={handleHostessDocUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-400 font-bold uppercase">+ Belge/Evrak Ekle ({hostessDocs.length})</span>
                          </div>
                          {hostessDocs.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {hostessDocs.map((d, i) => (
                                <div key={i} className="flex justify-between items-center bg-white border border-slate-100 rounded p-1 text-[9px] text-slate-500">
                                  <span className="truncate">{d.name}</span>
                                  <span className="text-slate-400 font-bold">{d.size}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {hostessOption === 'later' && (
                    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-semibold">Mevcut rehberlerden atama yapmak ister misiniz?</span>
                      <button
                        type="button"
                        onClick={() => setShowHostessModal(true)}
                        className="py-1 px-3 rounded-lg text-[9px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-all"
                      >
                        {createdHostessId ? '✅ Hostes Atandı' : '🔍 Hostes Seç / Ekle'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 cursor-pointer text-xs"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs shadow-md shadow-blue-500/10"
                >
                  <Check className="w-4 h-4" /> Aracı Kaydet ve Ata
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Driver Addition Form Modal */}
      <DriverFormModal 
        isOpen={showDriverModal}
        onClose={() => setShowDriverModal(false)}
        onSaved={(id) => {
          setCreatedDriverId(id);
          setShowDriverModal(false);
        }}
      />

      {/* Hostess Addition Form Modal */}
      <HostessFormModal
        isOpen={showHostessModal}
        onClose={() => setShowHostessModal(false)}
        onSaved={(id) => {
          setCreatedHostessId(id);
          setShowHostessModal(false);
        }}
      />
    </div>
  );
}

interface DriverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
}

export function DriverFormModal({ isOpen, onClose, onSaved }: DriverFormModalProps) {
  const { users, addLog } = useAppStore();
  const [isCompany, setIsCompany] = useState<boolean>(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tc, setTc] = useState('');
  const [licenseClass, setLicenseClass] = useState('D Sınıfı');
  const [src, setSrc] = useState('');
  const [psychotechnic, setPsychotechnic] = useState('');
  const [criminalRecord, setCriminalRecord] = useState('');
  const [healthReport, setHealthReport] = useState('');
  const [address, setAddress] = useState('');
  const [iban, setIban] = useState('');
  const [monthlySalary, setMonthlySalary] = useState(25000);
  const [dailyWage, setDailyWage] = useState(1000);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<{name: string, size: string}[]>([]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newList = [...uploadedDocs];
      for (let i = 0; i < files.length; i++) {
        newList.push({
          name: files[i].name,
          size: (files[i].size / 1024).toFixed(1) + ' KB'
        });
      }
      setUploadedDocs(newList);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    // Save driver as user role='driver'
    const newId = `u_driver_${Date.now()}`;
    const newDriver: AppUser = {
      id: newId,
      role: 'driver',
      name,
      username: `driver_${phone.replace(/\s+/g, '')}`,
      password: generateStrongPassword(),
      email: `${phone.replace(/\s+/g, '')}@berkaytur.com`,
      phone,
      status: 'active',
      isCompany,
      tc,
      licenseClass,
      src,
      psychotechnic,
      criminalRecord,
      healthReport,
      address,
      iban: isCompany ? iban : undefined,
      monthlySalary: isCompany ? monthlySalary : undefined,
      dailyWage: isCompany ? dailyWage : undefined,
      notes,
      photo: photo || undefined,
      documents: uploadedDocs.map(d => d.name)
    };

    // We can push to the centralized store users list
    const { users: existingUsers } = useAppStore.getState();
    useAppStore.setState({ users: [...existingUsers, newDriver] });
    addLog('Personel Eklendi (Şoför)', `${name} sisteme şoför olarak eklendi.`);

    onSaved(newId);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] text-slate-800 font-sans">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
            🧑‍✈️ Şoför Ekleme Formu
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Question: Company driver or supplier? */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-500 uppercase text-[10px]">Şirket Şoförü mü?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsCompany(true)}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                  isCompany 
                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Evet, Şirketimizin Kadrolu Şoförü
              </button>
              <button
                type="button"
                onClick={() => setIsCompany(false)}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                  !isCompany 
                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Hayır, Tedarikçi / Dış Şoför
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Ad Soyad</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none text-xs" />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Telefon</label>
              <input required type="text" placeholder="05XX XXX XX XX" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none text-xs" />
            </div>

            {isCompany && (
              <>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">T.C. Kimlik No</label>
                  <input type="text" maxLength={11} value={tc} onChange={e => setTc(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none text-xs font-mono" />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Ehliyet Sınıfı</label>
                  <select value={licenseClass} onChange={e => setLicenseClass(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none text-xs">
                    <option>D Sınıfı</option>
                    <option>E Sınıfı</option>
                    <option>C Sınıfı</option>
                    <option>D1 Sınıfı</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">SRC Belgesi No</label>
                  <input type="text" placeholder="Örn: SRC-1 / SRC-2" value={src} onChange={e => setSrc(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none text-xs font-mono" />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Psikoteknik Durumu</label>
                  <input type="text" placeholder="Geçerli / Süresi Dolmuş" value={psychotechnic} onChange={e => setPsychotechnic(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none text-xs" />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Şoför Görseli</label>
              <div className="relative border border-dashed border-slate-200 bg-slate-50 rounded-lg p-2 flex flex-col items-center justify-center min-h-[36px] cursor-pointer hover:bg-slate-100">
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                {photo ? (
                  <span className="text-[10px] text-emerald-600 font-bold">Fotoğraf Seçildi</span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Yükle</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Çoklu Evrak / Belge Yükleme</label>
              <div className="relative border border-dashed border-slate-200 bg-slate-50 rounded-lg p-2 flex flex-col items-center justify-center min-h-[36px] cursor-pointer hover:bg-slate-100">
                <input type="file" multiple accept=".pdf,image/*" onChange={handleDocUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <span className="text-[10px] text-slate-400 font-bold uppercase">Evrak Yükle (PDF/JPG)</span>
              </div>
            </div>
          </div>

          {uploadedDocs.length > 0 && (
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 text-[10px]">
              <p className="font-bold text-slate-500 uppercase">Yüklenen Evraklar ({uploadedDocs.length})</p>
              {uploadedDocs.map((d, dIdx) => (
                <div key={dIdx} className="flex items-center justify-between bg-white px-2 py-1 border border-slate-100 rounded-md">
                  <span className="truncate max-w-[180px] font-mono text-[9px] text-slate-600">{d.name}</span>
                  <span className="font-bold text-slate-400">{d.size}</span>
                </div>
              ))}
            </div>
          )}

          {isCompany && (
            <div className="border-t border-slate-100 pt-3 space-y-3 bg-slate-50/50 p-3 rounded-2xl border">
              <h4 className="font-black text-slate-700 text-[10px] uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-blue-500" /> Şoför Finansal / Maaş Tanımları
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Aylık Sabit Maaş (TL)</label>
                  <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(Number(e.target.value))} className="w-full p-2 bg-white border rounded-lg focus:outline-none font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Günlük Sefer Yevmiyesi (TL)</label>
                  <input type="number" value={dailyWage} onChange={e => setDailyWage(Number(e.target.value))} className="w-full p-2 bg-white border rounded-lg focus:outline-none font-mono text-xs" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-slate-500">IBAN Adresi</label>
                  <input type="text" placeholder="TR98 0006 ..." value={iban} onChange={e => setIban(e.target.value)} className="w-full p-2 bg-white border rounded-lg focus:outline-none font-mono text-xs" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-bold text-slate-500">Adres Bilgisi</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-500">Notlar</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-1.5 bg-slate-100 rounded-xl font-bold cursor-pointer">İptal</button>
            <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Personeli Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface HostessFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
}

export function HostessFormModal({ isOpen, onClose, onSaved }: HostessFormModalProps) {
  const { users, addLog } = useAppStore();
  const [isCompany, setIsCompany] = useState<boolean>(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tc, setTc] = useState('');
  const [criminalRecord, setCriminalRecord] = useState('');
  const [healthReport, setHealthReport] = useState('');
  const [address, setAddress] = useState('');
  const [iban, setIban] = useState('');
  const [monthlySalary, setMonthlySalary] = useState(18000);
  const [dailyWage, setDailyWage] = useState(700);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<{name: string, size: string}[]>([]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newList = [...uploadedDocs];
      for (let i = 0; i < files.length; i++) {
        newList.push({
          name: files[i].name,
          size: (files[i].size / 1024).toFixed(1) + ' KB'
        });
      }
      setUploadedDocs(newList);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    // Save hostess as user role='hostess'
    const newId = `u_hostess_${Date.now()}`;
    const newHostess: AppUser = {
      id: newId,
      role: 'hostess',
      name,
      username: `hostess_${phone.replace(/\s+/g, '')}`,
      password: generateStrongPassword(),
      email: `${phone.replace(/\s+/g, '')}@berkaytur.com`,
      phone,
      status: 'active',
      isCompany,
      tc,
      criminalRecord,
      healthReport,
      address,
      iban: isCompany ? iban : undefined,
      monthlySalary: isCompany ? monthlySalary : undefined,
      dailyWage: isCompany ? dailyWage : undefined,
      notes,
      photo: photo || undefined,
      documents: uploadedDocs.map(d => d.name)
    };

    const { users: existingUsers } = useAppStore.getState();
    useAppStore.setState({ users: [...existingUsers, newHostess] });
    addLog('Personel Eklendi (Hostes)', `${name} sisteme rehber personel/hostes olarak eklendi.`);

    onSaved(newId);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] text-slate-800 font-sans">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
            💁‍♀️ Hostes / Rehber Ekleme Formu
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Question: Company hostess or supplier? */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-500 uppercase text-[10px]">Şirket Hostesi mi?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsCompany(true)}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                  isCompany 
                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Evet, Şirketimizin Kadrolu Hostesi
              </button>
              <button
                type="button"
                onClick={() => setIsCompany(false)}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                  !isCompany 
                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Hayır, Tedarikçi Hostesi
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Ad Soyad</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none text-xs" />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Telefon</label>
              <input required type="text" placeholder="05XX XXX XX XX" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none text-xs" />
            </div>

            {isCompany && (
              <>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">T.C. Kimlik No</label>
                  <input type="text" maxLength={11} value={tc} onChange={e => setTc(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none text-xs font-mono" />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Sabıka Kaydı Durumu</label>
                  <input type="text" placeholder="Temiz / Yüklendi" value={criminalRecord} onChange={e => setCriminalRecord(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none text-xs" />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Hostes Görseli</label>
              <div className="relative border border-dashed border-slate-200 bg-slate-50 rounded-lg p-2 flex flex-col items-center justify-center min-h-[36px] cursor-pointer hover:bg-slate-100">
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                {photo ? (
                  <span className="text-[10px] text-emerald-600 font-bold">Fotoğraf Seçildi</span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Yükle</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Çoklu Evrak / Belge Yükleme</label>
              <div className="relative border border-dashed border-slate-200 bg-slate-50 rounded-lg p-2 flex flex-col items-center justify-center min-h-[36px] cursor-pointer hover:bg-slate-100">
                <input type="file" multiple accept=".pdf,image/*" onChange={handleDocUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <span className="text-[10px] text-slate-400 font-bold uppercase">Evrak Yükle (PDF/JPG)</span>
              </div>
            </div>
          </div>

          {uploadedDocs.length > 0 && (
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 text-[10px]">
              <p className="font-bold text-slate-500 uppercase">Yüklenen Evraklar ({uploadedDocs.length})</p>
              {uploadedDocs.map((d, dIdx) => (
                <div key={dIdx} className="flex items-center justify-between bg-white px-2 py-1 border border-slate-100 rounded-md">
                  <span className="truncate max-w-[180px] font-mono text-[9px] text-slate-600">{d.name}</span>
                  <span className="font-bold text-slate-400">{d.size}</span>
                </div>
              ))}
            </div>
          )}

          {isCompany && (
            <div className="border-t border-slate-100 pt-3 space-y-3 bg-slate-50/50 p-3 rounded-2xl border">
              <h4 className="font-black text-slate-700 text-[10px] uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-blue-500" /> Hostes Finansal / Maaş Tanımları
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Aylık Sabit Maaş (TL)</label>
                  <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(Number(e.target.value))} className="w-full p-2 bg-white border rounded-lg focus:outline-none font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Günlük Sefer Yevmiyesi (TL)</label>
                  <input type="number" value={dailyWage} onChange={e => setDailyWage(Number(e.target.value))} className="w-full p-2 bg-white border rounded-lg focus:outline-none font-mono text-xs" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-slate-500">IBAN Adresi</label>
                  <input type="text" placeholder="TR98 0006 ..." value={iban} onChange={e => setIban(e.target.value)} className="w-full p-2 bg-white border rounded-lg focus:outline-none font-mono text-xs" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-bold text-slate-500">Adres Bilgisi</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-500">Notlar</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-1.5 bg-slate-100 rounded-xl font-bold cursor-pointer">İptal</button>
            <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Rehber Personeli Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupplierFormModal({ isOpen, onClose }: SupplierFormModalProps) {
  const { addSupplier } = useAppStore();
  const [companyName, setCompanyName] = useState('');
  const [authorized, setAuthorized] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNo, setTaxNo] = useState('');
  const [iban, setIban] = useState('');
  const [email, setEmail] = useState('');
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<'company' | 'supplier'>('supplier');
  const [capacity, setCapacity] = useState(19);
  const [driverInfo, setDriverInfo] = useState('');
  const [hostessInfo, setHostessInfo] = useState('');
  const [pricingType, setPricingType] = useState<'hostess_included' | 'hostess_excluded'>('hostess_included');
  const [monthlyPrice, setMonthlyPrice] = useState(35000);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !authorized || !phone) return;

    addSupplier({
      companyName,
      authorized,
      phone,
      address,
      taxOffice,
      taxNo,
      iban,
      email,
      plate: plate.toUpperCase(),
      vehicleType,
      capacity,
      driverInfo,
      hostessInfo,
      pricingType,
      monthlyPrice
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] text-slate-800 font-sans">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">🤝 Yeni Tedarikçi Ekle</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hakediş Entegrasyonlu Taşıma İş Ortağı</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="font-bold text-slate-500">Firma Adı / Unvanı</label>
              <input required type="text" placeholder="Örn: BERKAYTUR Taşıma Hizmetleri A.Ş." value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none" />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Yetkili Adı Soyadı</label>
              <input required type="text" placeholder="Örn: Mustafa Sağlam" value={authorized} onChange={e => setAuthorized(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none" />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Telefon Numarası</label>
              <input required type="text" placeholder="Örn: 0533 XXX XX XX" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none" />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Vergi Dairesi</label>
              <input type="text" value={taxOffice} onChange={e => setTaxOffice(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none" />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Vergi Numarası</label>
              <input type="text" maxLength={10} value={taxNo} onChange={e => setTaxNo(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none font-mono" />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="font-bold text-slate-500">Banka IBAN Numarası</label>
              <input required type="text" placeholder="TRXX XXXX XXXX ..." value={iban} onChange={e => setIban(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none font-mono" />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">E-Posta Adresi</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none" />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Fatura / Tebligat Adresi</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3 bg-blue-50/40 p-3 rounded-2xl border border-blue-100/50">
            <h4 className="font-black text-slate-700 text-[10px] uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-blue-500" /> Sözleşme & Hakediş Modeli Fiyatlandırma
            </h4>
            
            <div className="space-y-2">
              <label className="font-bold text-slate-500 uppercase text-[9px]">Sözleşme Tipi</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPricingType('hostess_included')}
                  className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer flex flex-col ${
                    pricingType === 'hostess_included' 
                      ? 'bg-blue-100/50 border-blue-400 text-blue-800' 
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="text-[11px]">🌸 Hostes Dahil</span>
                  <span className="text-[9px] opacity-75 font-medium mt-0.5">Ekstra bir kesinti yapılmaz</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPricingType('hostess_excluded')}
                  className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer flex flex-col ${
                    pricingType === 'hostess_excluded' 
                      ? 'bg-blue-100/50 border-blue-400 text-blue-800' 
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="text-[11px]">⚠️ Hostes Hariç</span>
                  <span className="text-[9px] opacity-75 font-medium mt-0.5">Şirket Hostesi atandığında hakediş kesilir</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Sözleşmeli Aylık Hakediş Tutarı (TL)</label>
                <input required type="number" value={monthlyPrice} onChange={e => setMonthlyPrice(Number(e.target.value))} className="w-full p-2 bg-white border rounded-lg focus:outline-none font-mono text-xs" />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">İlk Aracın Plakası</label>
                <input required type="text" placeholder="Örn: 06 SLT 999" value={plate} onChange={e => setPlate(e.target.value)} className="w-full p-2 bg-white border rounded-lg focus:outline-none text-xs font-mono" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-1.5 bg-slate-100 rounded-xl font-bold cursor-pointer">İptal</button>
            <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer">
              Tedarikçiyi Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
