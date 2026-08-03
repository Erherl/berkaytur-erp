/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ApiClient } from '../../../infrastructure/api/apiClient';
import { 
  FileText, CheckCircle2, AlertCircle, Clock, MapPin, 
  Phone, Calendar, User, Search, Map, Layers, Plus, 
  X, ChevronDown, ChevronUp, Save, DollarSign, Send, FileCheck, Link 
} from 'lucide-react';
import { School } from '../../../types';
import { useAppStore } from '../../../store';

export interface ParentApplication {
  id: string;
  studentName: string;
  tcNo: string;
  birthDate: string;
  gender: string;
  schoolId: string;
  schoolName: string;
  classLevel: string;
  section: string;
  motherName: string;
  fatherName: string;
  phone: string;
  secondPhone: string;
  email: string;
  address: string;
  morningAddress: string;
  eveningAddress: string;
  secondAddress: string;
  locationShared: boolean;
  googleMapUrl: string;
  siblingInfo: string;
  allergy: string;
  specialCondition: string;
  medication: string;
  deliveryInstruction: string;
  emergencyContact: string;
  emergencyPhone: string;
  photoUrl: string;
  kvkkConsent: boolean;
  rulesConsent: boolean;
  contractConsent: boolean;
  appliedAt: string;
  km: number;
  calculatedFee: number;
  status: 'Bekliyor' | 'İnceleniyor' | 'Onaylandı' | 'Reddedildi';
}

interface VeliBasvurulariProps {
  schools: School[];
  allSchools?: School[];
  applications: ParentApplication[];
  onAddApplication: (app: ParentApplication) => void;
  onUpdateApplication: (id: string, updated: Partial<ParentApplication>) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

export default function VeliBasvurulari({ 
  schools, allSchools, applications, onAddApplication, onUpdateApplication, onAddNotification 
}: VeliBasvurulariProps) {
  const schoolsList = allSchools || schools;

  const [activeTab, setActiveTab] = useState<'applications' | 'form'>('applications');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Editable application states
  const [editingApp, setEditingApp] = useState<ParentApplication | null>(null);

  // Map and Geocoding Refs & States
  const veliMapContainerRef = React.useRef<HTMLDivElement>(null);
  const veliMapInstanceRef = React.useRef<any>(null);
  const veliMarkerRef = React.useRef<any>(null);

  const [addrIl, setAddrIl] = useState('İstanbul');
  const [addrIlce, setAddrIlce] = useState('Beşiktaş');
  const [addrMahalle, setAddrMahalle] = useState('');
  const [addrSokak, setAddrSokak] = useState('');
  const [addrBinaNo, setAddrBinaNo] = useState('');
  const [addrDaireNo, setAddrDaireNo] = useState('');
  const [addrAcikAdres, setAddrAcikAdres] = useState('');
  // İstanbul-Only: Doğrulanmamış koordinat varsayılanı NULL. Hardcoded Çekmeköy
  // (41.0267/29.1724) YASAK. Kullanıcı haritada konum doğrulayana kadar pin oluşturmuyoruz.
  const [addrLat, setAddrLat] = useState<number | null>(null);
  const [addrLng, setAddrLng] = useState<number | null>(null);
  const [isLocVerified, setIsLocVerified] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const hasMorningCoords = typeof addrLat === 'number' && typeof addrLng === 'number';
  const formatCoord = (value: number | null) => typeof value === 'number' ? value.toFixed(5) : '—';

  // Evening Map and Geocoding Refs & States (KURAL 2)
  const veliEveMapContainerRef = React.useRef<HTMLDivElement>(null);
  const veliEveMapInstanceRef = React.useRef<any>(null);
  const veliEveMarkerRef = React.useRef<any>(null);

  const [hasDiffEveningAddress, setHasDiffEveningAddress] = useState<'Evet' | 'Hayır'>('Hayır');
  const [eveAddrIl, setEveAddrIl] = useState('İstanbul');
  const [eveAddrIlce, setEveAddrIlce] = useState('Beşiktaş');
  const [eveAddrMahalle, setEveAddrMahalle] = useState('');
  const [eveAddrSokak, setEveAddrSokak] = useState('');
  const [eveAddrBinaNo, setEveAddrBinaNo] = useState('');
  const [eveAddrDaireNo, setEveAddrDaireNo] = useState('');
  const [eveAddrAcikAdres, setEveAddrAcikAdres] = useState('');
  const [eveAddrLat, setEveAddrLat] = useState<number | null>(null);
  const [eveAddrLng, setEveAddrLng] = useState<number | null>(null);
  const [isEveLocVerified, setIsEveLocVerified] = useState(false);
  const [isSearchingEveAddress, setIsSearchingEveAddress] = useState(false);
  const hasEveningCoords = typeof eveAddrLat === 'number' && typeof eveAddrLng === 'number';

  // Sibling States
  const [hasSibling, setHasSibling] = useState<'Evet' | 'Hayır'>('Hayır');
  const [siblingsList, setSiblingsList] = useState<any[]>([]);

  // School Type Filter
  const [selectedSchoolType, setSelectedSchoolType] = useState<'all' | 'devlet' | 'kolej' | 'state' | 'private' | 'college'>('all');

  // Link Generator States
  const [generatedLinkSchoolId, setGeneratedLinkSchoolId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Discount/Special Price Approval States
  const [showDiscountModal, setShowDiscountModal] = useState<any | null>(null);
  const [discountTargetPrice, setDiscountTargetPrice] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [discountType, setDiscountType] = useState<'discount' | 'special_price'>('discount');

  const handleRequestDiscount = (app: any, targetPrice: number, reason: string, type: 'discount' | 'special_price') => {
    if (!targetPrice || targetPrice <= 0) {
      alert("Lütfen geçerli bir hedef fiyat giriniz!");
      return;
    }
    if (!reason.trim()) {
      alert("Lütfen indirim/değişiklik gerekçesini belirtiniz (ZORUNLU)!");
      return;
    }

    const existingApprovals = JSON.parse(localStorage.getItem('bkt_approvals') || '[]');
    const newApproval = {
      id: `appr_${Date.now()}`,
      type: type,
      title: `${app.studentName} - ${type === 'discount' ? 'Fiyat İndirimi' : 'Özel Fiyat Uygulaması'}`,
      targetName: app.studentName,
      targetId: app.id,
      amount: Math.abs(app.calculatedFee - targetPrice),
      requesterName: 'Canan Kaya', // coordinator
      requesterRole: 'coordinator',
      reason: reason,
      status: 'pending',
      createdAt: new Date().toLocaleDateString('tr-TR'),
      oldValue: `${app.calculatedFee} TL`,
      newValue: `${targetPrice} TL`
    };

    localStorage.setItem('bkt_approvals', JSON.stringify([newApproval, ...existingApprovals]));
    
    useAppStore.getState().addLog(
      `Onay Talebi Gönderildi (${type === 'discount' ? 'İndirim' : 'Özel Fiyat'})`,
      `Koordinatör Canan Kaya, ${app.studentName} için fiyatın ${app.calculatedFee} TL'den ${targetPrice} TL'ye çekilmesi amacıyla Proje Müdürü onayına başvurdu. Gerekçe: ${reason}`
    );

    onAddNotification(
      'Onay Talebi İletildi',
      `${app.studentName} indirim talebi Proje Müdürü onay havuzuna gönderildi.`,
      'info'
    );

    alert(`⏳ Onay Talebi Gönderildi!\n\n${app.studentName} için talep edilen ${targetPrice} TL yeni fiyat, Proje Müdürü (Mehmet Öz) onayına sunulmuştur. Durum: ONAY BEKLİYOR.`);
    setShowDiscountModal(null);
  };

  // Pre-fill school from URL if present
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramSchoolId = params.get('schoolId');
    if (paramSchoolId) {
      const sch = schoolsList.find(s => s.id === paramSchoolId);
      if (sch) {
        setFormData(prev => ({ ...prev, schoolId: paramSchoolId }));
        if (sch.type) {
          setSelectedSchoolType(sch.type === 'college' ? 'private' : sch.type);
        }
      }
    }
  }, [schoolsList]);

  // Leaflet map initialization
  React.useEffect(() => {
    if (activeTab !== 'form' || !hasMorningCoords) {
      if (veliMapInstanceRef.current) {
        veliMapInstanceRef.current.remove();
        veliMapInstanceRef.current = null;
        veliMarkerRef.current = null;
      }
      return;
    }

    const stylesheetId = 'leaflet-cdn-style';
    if (!document.getElementById(stylesheetId)) {
      const link = document.createElement('link');
      link.id = stylesheetId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    const scriptId = 'leaflet-cdn-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initMap = () => {
      if (!window.L || !veliMapContainerRef.current || veliMapInstanceRef.current) return;
      
      const L = window.L;
      const lat = addrLat as number;
      const lng = addrLng as number;
      veliMapInstanceRef.current = L.map(veliMapContainerRef.current).setView([lat, lng], 14);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(veliMapInstanceRef.current);

      const customIcon = L.divIcon({
        className: 'custom-veli-marker',
        html: `
          <div style="
            background-color: #2563eb; 
            color: white; 
            width: 32px; 
            height: 32px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 16px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            border: 2px solid white;
          ">
            🏠
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      veliMarkerRef.current = L.marker([lat, lng], {
        draggable: true,
        icon: customIcon
      }).addTo(veliMapInstanceRef.current);

      veliMarkerRef.current.on('dragend', () => {
        const position = veliMarkerRef.current.getLatLng();
        setAddrLat(position.lat);
        setAddrLng(position.lng);
        setIsLocVerified(true);
      });
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.crossOrigin = '';
      script.onload = initMap;
      document.body.appendChild(script);
    } else {
      if (window.L) {
        const t = setTimeout(initMap, 200);
        return () => clearTimeout(t);
      } else {
        script.addEventListener('load', initMap);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener('load', initMap);
      }
      if (veliMapInstanceRef.current) {
        veliMapInstanceRef.current.remove();
        veliMapInstanceRef.current = null;
        veliMarkerRef.current = null;
      }
    };
  }, [activeTab, hasMorningCoords, addrLat, addrLng]);

  const updateMapMarkerPosition = (lat: number, lng: number) => {
    if (veliMapInstanceRef.current && window.L) {
      veliMapInstanceRef.current.setView([lat, lng], 15);
      if (veliMarkerRef.current) {
        veliMarkerRef.current.setLatLng([lat, lng]);
      }
    }
  };

  const handleGeocodeAddress = async () => {
    if (!addrMahalle && !addrSokak && !addrBinaNo) return;
    if (addrIl.trim().toLocaleLowerCase('tr-TR') !== 'istanbul') {
      setIsLocVerified(false);
      setAddrLat(null);
      setAddrLng(null);
      alert('Sistem yalnızca İstanbul içindeki adresleri kabul eder.');
      return;
    }
    setIsSearchingAddress(true);
    setIsLocVerified(false);

    const query = `${addrMahalle} Mahallesi, ${addrSokak} Sokak, No: ${addrBinaNo || '-'}, ${addrIlce}, İstanbul, Türkiye${addrAcikAdres ? `, ${addrAcikAdres}` : ''}`;

    try {
      const res = await ApiClient.validateApplicationAddress(query, addrIlce);
      if (res.success && res.data) {
        const lat = Number(res.data.lat);
        const lng = Number(res.data.lon);
        setAddrLat(lat);
        setAddrLng(lng);
        updateMapMarkerPosition(lat, lng);
        setIsLocVerified(true);
      } else {
        setAddrLat(null);
        setAddrLng(null);
        alert(`Adres doğrulaması başarısız: ${res.error || 'Adres İstanbul doğrulama zincirinden geçemedi.'}`);
      }
    } catch (e) {
      console.error('Geocoding failed:', e);
      setAddrLat(null);
      setAddrLng(null);
      alert('Adres doğrulama servisine bağlanılamadı.');
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Evening address map initialization (KURAL 2)
  React.useEffect(() => {
    if (activeTab !== 'form' || hasDiffEveningAddress !== 'Evet') {
      if (veliEveMapInstanceRef.current) {
        veliEveMapInstanceRef.current.remove();
        veliEveMapInstanceRef.current = null;
        veliEveMarkerRef.current = null;
      }
      return;
    }

    if (!hasEveningCoords) {
      return;
    }

    const initEveMap = () => {
      if (!window.L || !veliEveMapContainerRef.current || veliEveMapInstanceRef.current) return;
      
      const L = window.L;
      const lat = eveAddrLat as number;
      const lng = eveAddrLng as number;
      veliEveMapInstanceRef.current = L.map(veliEveMapContainerRef.current).setView([lat, lng], 14);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(veliEveMapInstanceRef.current);

      const customIcon = L.divIcon({
        className: 'custom-veli-eve-marker',
        html: `
          <div style="
            background-color: #dc2626; 
            color: white; 
            width: 32px; 
            height: 32px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 16px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            border: 2px solid white;
          ">
            🌙
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      veliEveMarkerRef.current = L.marker([lat, lng], {
        draggable: true,
        icon: customIcon
      }).addTo(veliEveMapInstanceRef.current);

      veliEveMarkerRef.current.on('dragend', () => {
        const position = veliEveMarkerRef.current.getLatLng();
        setEveAddrLat(position.lat);
        setEveAddrLng(position.lng);
        setIsEveLocVerified(true);
      });
    };

    const t = setTimeout(initEveMap, 300);
    return () => {
      clearTimeout(t);
      if (veliEveMapInstanceRef.current) {
        veliEveMapInstanceRef.current.remove();
        veliEveMapInstanceRef.current = null;
        veliEveMarkerRef.current = null;
      }
    };
  }, [activeTab, hasDiffEveningAddress, hasEveningCoords, eveAddrLat, eveAddrLng]);

  const updateEveMapMarkerPosition = (lat: number, lng: number) => {
    if (veliEveMapInstanceRef.current && window.L) {
      veliEveMapInstanceRef.current.setView([lat, lng], 15);
      if (veliEveMarkerRef.current) {
        veliEveMarkerRef.current.setLatLng([lat, lng]);
      }
    }
  };

  const handleGeocodeEveAddress = async () => {
    if (!eveAddrMahalle && !eveAddrSokak && !eveAddrBinaNo) return;
    if (eveAddrIl.trim().toLocaleLowerCase('tr-TR') !== 'istanbul') {
      setIsEveLocVerified(false);
      setEveAddrLat(null);
      setEveAddrLng(null);
      alert('Sistem yalnızca İstanbul içindeki adresleri kabul eder.');
      return;
    }
    setIsSearchingEveAddress(true);
    setIsEveLocVerified(false);

    const query = `${eveAddrMahalle} Mahallesi, ${eveAddrSokak} Sokak, No: ${eveAddrBinaNo || '-'}, ${eveAddrIlce}, İstanbul, Türkiye${eveAddrAcikAdres ? `, ${eveAddrAcikAdres}` : ''}`;

    try {
      const res = await ApiClient.validateApplicationAddress(query, eveAddrIlce);
      if (res.success && res.data) {
        const lat = Number(res.data.lat);
        const lng = Number(res.data.lon);
        setEveAddrLat(lat);
        setEveAddrLng(lng);
        updateEveMapMarkerPosition(lat, lng);
        setIsEveLocVerified(true);
      } else {
        setEveAddrLat(null);
        setEveAddrLng(null);
        alert(`Akşam adresi doğrulanamadı: ${res.error || 'Adres İstanbul doğrulama zincirinden geçemedi.'}`);
      }
    } catch (e) {
      console.error('Evening geocoding failed:', e);
      setEveAddrLat(null);
      setEveAddrLng(null);
      alert('Akşam adresi doğrulama servisine bağlanılamadı.');
    } finally {
      setIsSearchingEveAddress(false);
    }
  };

  // Bot detection stopwatch mount timestamp
  const [mountTime] = useState(Date.now());

  // Sibling Helpers
  const handleAddSibling = () => {
    setSiblingsList([...siblingsList, {
      name: '',
      schoolId: schoolsList[0]?.id || '',
      classLevel: '',
      section: '',
      usesService: 'Evet'
    }]);
  };

  const handleRemoveSibling = (idx: number) => {
    setSiblingsList(siblingsList.filter((_, i) => i !== idx));
  };

  const handleSiblingChange = (idx: number, field: string, value: string) => {
    const updated = siblingsList.map((sib, i) => {
      if (i === idx) {
        return { ...sib, [field]: value };
      }
      return sib;
    });
    setSiblingsList(updated);
  };

  // Public Form States
  const [formData, setFormData] = useState({
    studentName: '',
    tcNo: '',
    birthDate: '2016-05-15',
    gender: 'Erkek',
    schoolId: schoolsList[0]?.id || 's1',
    classLevel: '4-B',
    section: 'A',
    motherName: '',
    fatherName: '',
    phone: '',
    secondPhone: '',
    email: '',
    address: '',
    morningAddress: '',
    eveningAddress: '',
    secondAddress: '',
    locationShared: true,
    googleMapUrl: '',
    siblingInfo: '',
    allergy: '',
    specialCondition: '',
    medication: '',
    deliveryInstruction: '',
    emergencyContact: '',
    emergencyPhone: '',
    photoUrl: 'https://images.unsplash.com/photo-1597524475144-d89e43f55aae?auto=format&fit=crop&q=80&w=200',
    kvkkConsent: false,
    rulesConsent: false,
    contractConsent: false,
    website: '' // Spam honey-pot
  });

  // Load applications from server on mount
  React.useEffect(() => {
    ApiClient.fetchApplications().then(res => {
      if (res.success && res.data) {
        // Hydrate existing client state if mismatch
        res.data.forEach(app => {
          if (!applications.some(a => a.id === app.id)) {
            onAddApplication(app);
          }
        });
      }
    });
  }, []);

  const handleCalculateKmAndPrice = () => {
    return {
      km: typeof editingApp?.km === 'number' ? editingApp.km : 0,
      price: typeof editingApp?.calculatedFee === 'number' ? editingApp.calculatedFee : 0
    };
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kvkkConsent || !formData.rulesConsent || !formData.contractConsent) {
      alert("Lütfen tüm onay kutularını (KVKK, Servis Kuralları ve Sözleşme) işaretleyiniz.");
      return;
    }

    if (!addrMahalle || !addrSokak || !addrBinaNo) {
      alert("Lütfen adres bilgilerini (Mahalle, Cadde/Sokak, Bina No) eksiksiz doldurunuz.");
      return;
    }

    if (!isLocVerified) {
      alert("Lütfen haritadan konumunuzu doğrulayınız (Konum Doğru butonuna tıklayınız).");
      return;
    }

    // Class and Section validation
    if (!formData.classLevel || !formData.section) {
      alert("Öğrenci Sınıfı ve Şubesi alanları zorunludur.");
      return;
    }

    if (addrIl.trim().toLocaleLowerCase('tr-TR') !== 'istanbul') {
      alert('Sistem yalnızca İstanbul ilini kabul eder.');
      return;
    }

    if (hasDiffEveningAddress === 'Evet' && eveAddrIl.trim().toLocaleLowerCase('tr-TR') !== 'istanbul') {
      alert('Akşam bırakılış adresi de İstanbul ilinde olmalıdır.');
      return;
    }

    // Construct concatenated address from structured inputs
    const fullConcatenatedAddress = `${addrIlce} / ${addrIl}, ${addrMahalle} Mahallesi, ${addrSokak} Sokak, No: ${addrBinaNo}, Daire: ${addrDaireNo || '-'}`;
    const finalAddress = addrAcikAdres ? `${fullConcatenatedAddress} (Açık Adres Notu: ${addrAcikAdres})` : fullConcatenatedAddress;

    const finalMorningAddress = finalAddress;
    let finalEveningAddress = finalAddress;

    if (hasDiffEveningAddress === 'Evet') {
      if (!eveAddrMahalle || !eveAddrSokak || !eveAddrBinaNo) {
        alert("Lütfen akşam bırakılış adres bilgilerini (Mahalle, Cadde/Sokak, Bina No) eksiksiz doldurunuz.");
        return;
      }
      if (!isEveLocVerified) {
        alert("Lütfen akşam bırakılış adresi için haritadan konumunuzu doğrulayınız (Konum Doğru butonuna tıklayınız).");
        return;
      }
      const fullEveConcatenatedAddress = `${eveAddrIlce} / ${eveAddrIl}, ${eveAddrMahalle} Mahallesi, ${eveAddrSokak} Sokak, No: ${eveAddrBinaNo}, Daire: ${eveAddrDaireNo || '-'}`;
      finalEveningAddress = eveAddrAcikAdres ? `${fullEveConcatenatedAddress} (Açık Adres Notu: ${eveAddrAcikAdres})` : fullEveConcatenatedAddress;
    }

    // Construct sibling string info from list
    const finalSiblingInfo = hasSibling === 'Evet' && siblingsList.length > 0
      ? siblingsList.map((s, i) => `${i+1}. Kardeş: ${s.name} (${schoolsList.find(sch => sch.id === s.schoolId)?.name || 'Okul'}, Sınıf: ${s.classLevel}-${s.section}, Servis: ${s.usesService})`).join(' | ')
      : 'Yok';

    const selectedSchool = schoolsList.find(s => s.id === formData.schoolId);

    // Submit payload to the server-validated application API
    ApiClient.createApplication({
      studentName: formData.studentName,
      tcNo: formData.tcNo,
      birthDate: formData.birthDate,
      gender: formData.gender,
      schoolId: formData.schoolId,
      classLevel: formData.classLevel,
      section: formData.section,
      motherName: formData.motherName,
      fatherName: formData.fatherName,
      phone: formData.phone,
      secondPhone: formData.secondPhone,
      email: formData.email,
      address: finalMorningAddress,
      morningAddress: finalMorningAddress,
      eveningAddress: finalEveningAddress,
      morningDistrict: addrIlce,
      eveningDistrict: hasDiffEveningAddress === 'Evet' ? eveAddrIlce : addrIlce,
      schoolDistrict: selectedSchool?.district || undefined,
      secondAddress: hasDiffEveningAddress === 'Evet' ? finalEveningAddress : formData.secondAddress,
      siblingInfo: finalSiblingInfo,
      allergy: formData.allergy,
      specialCondition: formData.specialCondition,
      medication: formData.medication,
      deliveryInstruction: formData.deliveryInstruction,
      emergencyContact: formData.emergencyContact,
      emergencyPhone: formData.emergencyPhone,
      photoUrl: formData.photoUrl,
      kvkkConsent: formData.kvkkConsent,
      rulesConsent: formData.rulesConsent,
      contractConsent: formData.contractConsent,
      website: formData.website, // Honey-pot
      submitTimerMs: Date.now() - mountTime // stopwatch speed
    }).then(res => {
      if (!res.success || !res.data) {
        alert(`❌ Başvuru Gönderimi Engellendi:\n${res.error || 'Bilinmeyen bir sunucu doğrulama hatası oluştu.'}`);
        return;
      }
      
      const serverApp = res.data;
      onAddApplication(serverApp);
      onAddNotification(
        'Yeni Veli Başvurusu',
        `Öğrenci ${serverApp.studentName} için veli kayıt formu başarıyla alındı ve sunucuda doğrulandı.`,
        'info'
      );

      // Reset Form
      setFormData({
        studentName: '',
        tcNo: '',
        birthDate: '2016-05-15',
        gender: 'Erkek',
        schoolId: schools[0]?.id || 's1',
        classLevel: '',
        section: '',
        motherName: '',
        fatherName: '',
        phone: '',
        secondPhone: '',
        email: '',
        address: '',
        morningAddress: '',
        eveningAddress: '',
        secondAddress: '',
        locationShared: true,
        googleMapUrl: '',
        siblingInfo: '',
        allergy: '',
        specialCondition: '',
        medication: '',
        deliveryInstruction: '',
        emergencyContact: '',
        emergencyPhone: '',
        photoUrl: 'https://images.unsplash.com/photo-1597524475144-d89e43f55aae?auto=format&fit=crop&q=80&w=200',
        kvkkConsent: false,
        rulesConsent: false,
        contractConsent: false,
        website: ''
      });

      // Reset structured address & siblings state
      setAddrMahalle('');
      setAddrSokak('');
      setAddrBinaNo('');
      setAddrDaireNo('');
      setAddrAcikAdres('');
      setAddrLat(null);
      setAddrLng(null);
      setIsLocVerified(false);

      setHasDiffEveningAddress('Hayır');
      setEveAddrMahalle('');
      setEveAddrSokak('');
      setEveAddrBinaNo('');
      setEveAddrDaireNo('');
      setEveAddrAcikAdres('');
      setEveAddrLat(null);
      setEveAddrLng(null);
      setIsEveLocVerified(false);

      setHasSibling('Hayır');
      setSiblingsList([]);

      const alertMsg = hasDiffEveningAddress === 'Evet' 
        ? `🎉 Veli Kayıt Başvurusu başarıyla oluşturuldu!\n\nÇİFT ADRES VE COĞRAFİ ENTEGRASYON DETAYLARI:\n☀️ Sabah Alınış: ${finalMorningAddress}\n📍 Sabah Harita: Lat: ${formatCoord(addrLat)}, Lng: ${formatCoord(addrLng)}\n\n🌙 Akşam Bırakılış: ${finalEveningAddress}\n📍 Akşam Harita: Lat: ${formatCoord(eveAddrLat)}, Lng: ${formatCoord(eveAddrLng)}\n\nSUNUCU DOĞRULAMASI:\n- Başvurunuz sunucu veri tabanına işlenmiş, merkezi fiyat motoruyla (çift rota üzerinden %75 kuralı ve kardeş indirimi dahil edilerek) otomatik sözleşme altyapısı hazırlanmıştır.`
        : `🎉 Veli Kayıt Başvurusu başarıyla oluşturuldu!\n\nCOĞRAFİ ENTEGRASYON VE DOĞRU KONUM DETAYLARI:\n- Girilen Adres: ${finalMorningAddress}\n- Haritadan Alınan Konum: Lat: ${formatCoord(addrLat)}, Lng: ${formatCoord(addrLng)}\n\nSUNUCU DOĞRULAMASI:\n- Başvurunuz sunucu veri tabanına işlenmiş ve otomatik sözleşme altyapısı hazırlanmıştır.`;

      alert(alertMsg);
      setActiveTab('applications');
    });
  };

  const handleEditChange = (field: keyof ParentApplication, value: any) => {
    if (!editingApp) return;
    
    const updated = { ...editingApp, [field]: value };
    
    // Re-calculate KM & Price if any address changes (KURAL 4)
    if (field === 'address' || field === 'morningAddress' || field === 'eveningAddress' || field === 'phone') {
      const { km, price } = handleCalculateKmAndPrice();
      updated.km = km;
      updated.calculatedFee = price;
    }

    setEditingApp(updated);
  };

  const handleSaveApp = async (id: string) => {
    if (!editingApp) return;
    const res = await ApiClient.updateApplication(id, editingApp);
    if (res.success && res.data) {
      onUpdateApplication(id, res.data);
      onAddNotification(
        'Başvuru Güncellendi',
        `${editingApp.studentName} isimli öğrencinin başvuru detayları kaydedildi.`,
        'success'
      );
      setExpandedCardId(null);
      setEditingApp(null);
    } else {
      alert(`Hata: ${res.error}`);
    }
  };

  const handleStatusChange = async (id: string, status: ParentApplication['status']) => {
    const res = await ApiClient.updateApplication(id, { status });
    if (res.success && res.data) {
      onUpdateApplication(id, res.data);
      onAddNotification(
        'Başvuru Durumu Değişti',
        `Başvuru ID: ${id} yeni durum: ${status}`,
        status === 'Onaylandı' ? 'success' : 'info'
      );
      if (editingApp && editingApp.id === id) {
        setEditingApp({ ...editingApp, status });
      }
    } else {
      alert(`Hata: ${res.error}`);
    }
  };

  // Filter list
  const filteredApps = applications.filter(app => {
    const matchesSearch = app.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          app.phone.includes(searchTerm) || 
                          app.schoolName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? app.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ParentApplication['status']) => {
    switch (status) {
      case 'Onaylandı': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Reddedildi': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'İnceleniyor': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-5 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all ${
            activeTab === 'applications' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📥 Veli Başvuruları ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab('form')}
          className={`px-5 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all ${
            activeTab === 'form' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📱 Premium Veli Kayıt Formu
        </button>
      </div>

      {activeTab === 'applications' ? (
        <div className="space-y-5">
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 border border-slate-200 rounded-2xl">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Öğrenci adı, okul veya telefon ile ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-slate-700 transition-all"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full sm:w-44 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              >
                <option value="">Tüm Durumlar</option>
                <option value="Bekliyor">Bekliyor</option>
                <option value="İnceleniyor">İnceleniyor</option>
                <option value="Onaylandı">Onaylandı</option>
                <option value="Reddedildi">Reddedildi</option>
              </select>
            </div>
          </div>

          {/* Applications Grid */}
          <div className="grid grid-cols-1 gap-4">
            {filteredApps.map(app => {
              const isExpanded = expandedCardId === app.id;
              return (
                <div 
                  key={app.id} 
                  className={`bg-white border rounded-2xl transition-all shadow-xs overflow-hidden ${
                    isExpanded ? 'border-blue-400 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Card Header Section */}
                  <div 
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedCardId(null);
                        setEditingApp(null);
                      } else {
                        setExpandedCardId(app.id);
                        setEditingApp({ ...app });
                      }
                    }}
                    className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4">
                      {/* Photo or Placeholder */}
                      <img 
                        src={app.photoUrl || "https://images.unsplash.com/photo-1597524475144-d89e43f55aae?auto=format&fit=crop&q=80&w=200"} 
                        alt={app.studentName} 
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1597524475144-d89e43f55aae?auto=format&fit=crop&q=80&w=200";
                        }}
                      />
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{app.studentName}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="font-semibold text-blue-600">{app.schoolName}</span>
                          <span>• Sınıf: {app.classLevel}-{app.section}</span>
                          <span>• 📞 {app.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-left md:text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Başvuru Saati
                        </div>
                        <div className="text-xs font-semibold text-slate-600">{app.appliedAt}</div>
                      </div>

                      <div className="text-left md:text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Mesafe
                        </div>
                        <div className="text-xs font-semibold text-slate-800">{app.km} KM</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 border rounded-full text-xs font-extrabold ${getStatusBadge(app.status)}`}>
                          {app.status}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Body containing Edit Form & Detailed Info */}
                  {isExpanded && editingApp && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-6">
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-inner">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <h5 className="font-black text-slate-800 text-xs flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" /> Başvuru Bilgilerini Düzenle
                          </h5>
                          
                          {/* Quick Status Setter inside form */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500">Başvuru Durumu:</span>
                            <div className="flex border border-slate-200 rounded-lg overflow-hidden text-[10px] font-bold">
                              {(['Bekliyor', 'İnceleniyor', 'Onaylandı', 'Reddedildi'] as const).map(st => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStatusChange(app.id, st)}
                                  className={`px-2.5 py-1 transition-all cursor-pointer ${
                                    editingApp.status === st 
                                      ? st === 'Onaylandı' ? 'bg-emerald-600 text-white' : st === 'Reddedildi' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-white'
                                      : 'bg-white hover:bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Complete 20+ Editable Field Form Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          {/* Col 1: Student info */}
                          <div className="space-y-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/50">
                            <h6 className="font-bold text-slate-700 border-b pb-1">👨‍🎓 Öğrenci & Okul</h6>
                            
                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">Adı Soyadı</label>
                              <input 
                                type="text" 
                                value={editingApp.studentName} 
                                onChange={e => handleEditChange('studentName', e.target.value)}
                                className="w-full p-2 bg-white border rounded-lg focus:outline-blue-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">TC Kimlik</label>
                              <input 
                                type="text" 
                                maxLength={11}
                                value={editingApp.tcNo} 
                                onChange={e => handleEditChange('tcNo', e.target.value)}
                                className="w-full p-2 bg-white border rounded-lg focus:outline-blue-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="font-bold text-slate-500">Doğum Tarihi</label>
                                <input 
                                  type="date" 
                                  value={editingApp.birthDate} 
                                  onChange={e => handleEditChange('birthDate', e.target.value)}
                                  className="w-full p-2 bg-white border rounded-lg"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-500">Cinsiyet</label>
                                <select 
                                  value={editingApp.gender} 
                                  onChange={e => handleEditChange('gender', e.target.value)}
                                  className="w-full p-2 bg-white border rounded-lg"
                                >
                                  <option value="Erkek">Erkek</option>
                                  <option value="Kız">Kız</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">Kayıtlı Okulu</label>
                              <select 
                                value={editingApp.schoolId} 
                                onChange={e => {
                                  const sObj = schoolsList.find(sc => sc.id === e.target.value);
                                  handleEditChange('schoolId', e.target.value);
                                  handleEditChange('schoolName', sObj ? sObj.name : '');
                                }}
                                className="w-full p-2 bg-white border rounded-lg"
                              >
                                {schoolsList.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="font-bold text-slate-500">Sınıf</label>
                                <input 
                                  type="text" 
                                  value={editingApp.classLevel} 
                                  onChange={e => handleEditChange('classLevel', e.target.value)}
                                  className="w-full p-2 bg-white border rounded-lg"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-500">Şube</label>
                                <input 
                                  type="text" 
                                  value={editingApp.section} 
                                  onChange={e => handleEditChange('section', e.target.value)}
                                  className="w-full p-2 bg-white border rounded-lg"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Col 2: Parent & Family details */}
                          <div className="space-y-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/50">
                            <h6 className="font-bold text-slate-700 border-b pb-1">👨‍👩‍👧 Veliler & İletişim</h6>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="font-bold text-slate-500">Anne Adı</label>
                                <input 
                                  type="text" 
                                  value={editingApp.motherName} 
                                  onChange={e => handleEditChange('motherName', e.target.value)}
                                  className="w-full p-2 bg-white border rounded-lg"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-500">Baba Adı</label>
                                <input 
                                  type="text" 
                                  value={editingApp.fatherName} 
                                  onChange={e => handleEditChange('fatherName', e.target.value)}
                                  className="w-full p-2 bg-white border rounded-lg"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">Asil Telefon</label>
                              <input 
                                type="text" 
                                value={editingApp.phone} 
                                onChange={e => handleEditChange('phone', e.target.value)}
                                className="w-full p-2 bg-white border rounded-lg"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">İkinci Telefon</label>
                              <input 
                                type="text" 
                                value={editingApp.secondPhone} 
                                onChange={e => handleEditChange('secondPhone', e.target.value)}
                                className="w-full p-2 bg-white border rounded-lg"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">E-posta</label>
                              <input 
                                type="email" 
                                value={editingApp.email} 
                                onChange={e => handleEditChange('email', e.target.value)}
                                className="w-full p-2 bg-white border rounded-lg"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">Kardeş Bilgileri</label>
                              <input 
                                type="text" 
                                placeholder="Varsa okuldaki kardeşleri..."
                                value={editingApp.siblingInfo} 
                                onChange={e => handleEditChange('siblingInfo', e.target.value)}
                                className="w-full p-2 bg-white border rounded-lg"
                              />
                            </div>
                          </div>

                          {/* Col 3: Addresses & Health */}
                          <div className="space-y-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/50">
                            <h6 className="font-bold text-slate-700 border-b pb-1">🗺️ Adresler & Sağlık Bilgileri</h6>
                            
                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">Ana Ev Adresi (Hesaplama İçin)</label>
                              <input 
                                type="text" 
                                value={editingApp.address} 
                                onChange={e => handleEditChange('address', e.target.value)}
                                className="w-full p-2 bg-white border rounded-lg"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="font-bold text-slate-500">Sabah Alınacak Adres</label>
                                <input 
                                  type="text" 
                                  placeholder="Ev ile aynı ise boş bırakın"
                                  value={editingApp.morningAddress} 
                                  onChange={e => handleEditChange('morningAddress', e.target.value)}
                                  className="w-full p-2 bg-white border rounded-lg"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-500">Akşam Bırakılacak</label>
                                <input 
                                  type="text" 
                                  placeholder="Ev ile aynı ise boş bırakın"
                                  value={editingApp.eveningAddress} 
                                  onChange={e => handleEditChange('eveningAddress', e.target.value)}
                                  className="w-full p-2 bg-white border rounded-lg"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="font-bold text-slate-500">Alerji Bilgisi</label>
                                <input 
                                  type="text" 
                                  value={editingApp.allergy} 
                                  onChange={e => handleEditChange('allergy', e.target.value)}
                                  className="w-full p-2 bg-white border border-yellow-200 rounded-lg text-yellow-800"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-500">İlaç Kullanımı</label>
                                <input 
                                  type="text" 
                                  value={editingApp.medication} 
                                  onChange={e => handleEditChange('medication', e.target.value)}
                                  className="w-full p-2 bg-white border rounded-lg"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">Acil Durum İletişim Kişisi & Tel</label>
                              <div className="grid grid-cols-2 gap-2">
                                <input 
                                  type="text" 
                                  placeholder="İsim"
                                  value={editingApp.emergencyContact} 
                                  onChange={e => handleEditChange('emergencyContact', e.target.value)}
                                  className="w-full p-2 bg-white border rounded-lg"
                                />
                                <input 
                                  type="text" 
                                  placeholder="Telefon"
                                  value={editingApp.emergencyPhone} 
                                  onChange={e => handleEditChange('emergencyPhone', e.target.value)}
                                  className="w-full p-2 bg-white border rounded-lg"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* KM and Pricing Panel */}
                        <div className="mt-5 p-4 bg-blue-50 border border-blue-100 rounded-xl grid sm:grid-cols-3 gap-4 items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                              KM
                            </div>
                            <div>
                              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Otomatik KM</p>
                              <p className="text-sm font-black text-slate-800">{editingApp.km} Kilometre</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                              TL
                            </div>
                            <div>
                              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Servis Ücreti (Tarife)</p>
                              <p className="text-sm font-black text-emerald-700">{editingApp.calculatedFee} TL / Yıllık</p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold text-slate-500 block text-[10px] uppercase">YETKİLİ İŞLEMLERİ (KURAL 5)</label>
                            <button
                              type="button"
                              onClick={() => {
                                setShowDiscountModal(editingApp);
                                setDiscountTargetPrice(editingApp.calculatedFee);
                              }}
                              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all text-[11px]"
                            >
                              💰 İNDİRİM / ÖZEL FİYAT TALEP ET
                            </button>
                          </div>
                        </div>

                        {/* Approved Contract Notice */}
                        {editingApp.status === 'Onaylandı' && (
                          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-emerald-800">
                            <FileCheck className="w-5 h-5 text-emerald-600" />
                            <p className="text-[11px] leading-relaxed">
                              <b>Otomatik Sözleşme Sistemi Aktif!</b> Bu başvuru onaylandığında veli ve öğrenci için <b>Sözleşmeler</b> sekmesinde anında PDF formatında yıllık sözleşme oluşturulacak ve Google Drive'a kaydedilecektir.
                            </p>
                          </div>
                        )}

                        {/* Save Action Bar */}
                        <div className="mt-5 flex justify-end gap-2 text-xs">
                          <button 
                            type="button"
                            onClick={() => {
                              setExpandedCardId(null);
                              setEditingApp(null);
                            }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                          >
                            İptal
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleSaveApp(app.id)}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-200"
                          >
                            <Save className="w-4 h-4" /> Değişiklikleri Kaydet
                          </button>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredApps.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center text-slate-400">
                Arama kriterlerine uygun veli başvurusu bulunmamaktadır.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* PUBLIC VELI KAYIT FORMU VIEW */
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white p-8 space-y-2 text-center relative">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl mx-auto shadow-lg mb-2">
              B
            </div>
            <h3 className="text-2xl font-black tracking-tight">BERKAYTUR PREMIUM</h3>
            <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">Öğrenci Servisi Kayıt Başvuru Formu</p>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed pt-1">
              Değerli velimiz, servis hizmetlerimizin planlanabilmesi için lütfen formu eksiksiz doldurunuz. Bu form tamamen mobil uyumludur.
            </p>
            <span className="absolute top-4 right-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
              ONLINE BAŞVURU
            </span>
          </div>

          <div className="p-8 space-y-6">
            {/* OKULA ÖZEL KAYIT LİNKİ OLUŞTURUCU */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-3">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Link className="w-4 h-4 text-blue-600" /> Okula Özel Kayıt Linki Oluşturucu (Paylaşım Paneli)
              </h4>
              <p className="text-[11px] text-slate-500">
                Aşağıdan ilgili okulu seçerek o okula özel, formda otomatik seçili gelen ve okul türüne göre filtrelenmiş bir kayıt linki üretebilirsiniz. Bu linki WhatsApp veya SMS ile velilere gönderebilirsiniz.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <select
                  value={generatedLinkSchoolId}
                  onChange={e => {
                    setGeneratedLinkSchoolId(e.target.value);
                    const selectedSch = schoolsList.find(s => s.id === e.target.value);
                    if (selectedSch) {
                      setFormData(prev => ({ ...prev, schoolId: selectedSch.id }));
                      if (selectedSch.type) {
                        setSelectedSchoolType(selectedSch.type === 'college' ? 'private' : selectedSch.type);
                      }
                    }
                  }}
                  className="w-full sm:w-2/3 p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="">-- Okul Seçiniz --</option>
                  {schoolsList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.type === 'state' ? 'Devlet Okulu' : 'Özel Okul'})</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (!generatedLinkSchoolId) {
                      alert("Lütfen önce bir okul seçiniz.");
                      return;
                    }
                    const url = `${window.location.origin}${window.location.pathname}?schoolId=${generatedLinkSchoolId}`;
                    navigator.clipboard.writeText(url);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className={`w-full sm:w-1/3 py-2.5 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${copiedLink ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Kopyalandı!
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" /> Link Kopyala
                    </>
                  )}
                </button>
              </div>
              {generatedLinkSchoolId && (
                <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-600 break-all select-all">
                  {window.location.origin}{window.location.pathname}?schoolId={generatedLinkSchoolId}
                </div>
              )}
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-8">
              {/* Hidden honeypot field to catch automated bots/spam */}
              <div className="hidden" aria-hidden="true">
                <input 
                  type="text" 
                  name="website" 
                  value={formData.website || ''} 
                  onChange={e => setFormData({ ...formData, website: e.target.value })} 
                  tabIndex={-1} 
                  autoComplete="off" 
                />
              </div>

              {/* Öğrenci Bilgileri */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm border-b pb-1.5 uppercase tracking-wide text-blue-600 flex items-center gap-2">
                  <User className="w-4 h-4" /> 1. Öğrenci Bilgileri
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Öğrenci Adı Soyadı <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Öğrencinin tam adı"
                      value={formData.studentName}
                      onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-blue-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">TC Kimlik Numarası <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required 
                      maxLength={11}
                      placeholder="11 Haneli TC No"
                      value={formData.tcNo}
                      onChange={e => setFormData({ ...formData, tcNo: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-blue-500 font-mono font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Doğum Tarihi</label>
                      <input 
                        type="date" 
                        value={formData.birthDate}
                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Cinsiyet</label>
                      <select 
                        value={formData.gender}
                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                      >
                        <option value="Erkek">Erkek</option>
                        <option value="Kız">Kız</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Okul Türü Filtreleme ve Seçimi */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="font-bold text-slate-600">Okul Türü Filtresi</label>
                    <div className="flex flex-col gap-1">
                      {[
                        { key: 'all', label: 'Tüm Okullar' },
                        { key: 'state', label: 'Devlet Okulları' },
                        { key: 'private', label: 'Özel Okullar' }
                      ].map(typeObj => (
                        <button
                          key={typeObj.key}
                          type="button"
                          onClick={() => {
                            setSelectedSchoolType(typeObj.key as any);
                            // Preselect first school of filtered list
                            const firstFiltered = schoolsList.find(s => 
                              typeObj.key === 'all' || 
                              (typeObj.key === 'private' ? (s.type === 'private' || s.type === 'college') : s.type === typeObj.key)
                            );
                            if (firstFiltered) {
                              setFormData(prev => ({ ...prev, schoolId: firstFiltered.id }));
                            }
                          }}
                          className={`px-2.5 py-1 text-[10px] font-extrabold text-left rounded-lg transition-all border ${selectedSchoolType === typeObj.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}
                        >
                          ● {typeObj.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-1.5 space-y-1">
                        <label className="font-bold text-slate-600">Okulu <span className="text-red-500">*</span></label>
                        <select 
                          value={formData.schoolId}
                          onChange={e => setFormData({ ...formData, schoolId: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-semibold"
                        >
                          {schoolsList
                            .filter(s => 
                              selectedSchoolType === 'all' || 
                              (selectedSchoolType === 'private' ? (s.type === 'private' || s.type === 'college') : s.type === selectedSchoolType)
                            )
                            .map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 font-extrabold">Sınıfı <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Örn: 5-A, 10-C"
                          value={formData.classLevel}
                          onChange={e => setFormData({ ...formData, classLevel: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-blue-500 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 font-extrabold">Şubesi <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          required
                          placeholder="Örn: A, B, Fen vb."
                          value={formData.section}
                          onChange={e => setFormData({ ...formData, section: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-blue-500 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Veli & Aile Bilgileri */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm border-b pb-1.5 uppercase tracking-wide text-blue-600 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> 2. Veli & Aile Bilgileri
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Anne Adı Soyadı</label>
                    <input 
                      type="text" 
                      placeholder="Annenin adı"
                      value={formData.motherName}
                      onChange={e => setFormData({ ...formData, motherName: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Baba Adı Soyadı</label>
                    <input 
                      type="text" 
                      placeholder="Babanın adı"
                      value={formData.fatherName}
                      onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Birinci Veli Telefon <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required 
                      placeholder="05XX XXX XX XX"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-blue-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">İkinci Veli Telefon</label>
                    <input 
                      type="text" 
                      placeholder="05XX XXX XX XX"
                      value={formData.secondPhone}
                      onChange={e => setFormData({ ...formData, secondPhone: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">E-posta Adresi <span className="text-red-500">*</span></label>
                    <input 
                      type="email" 
                      required 
                      placeholder="veli@eposta.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Sibling (Kardeş) Add Block */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-extrabold text-slate-700 text-xs block">Okulda Başka Kardeş Öğrenci Var mı?</span>
                      <p className="text-[10px] text-slate-400">Var ise kayıt formunda tek tuşla ekleyerek eşleştirebilirsiniz.</p>
                    </div>
                    <select
                      value={hasSibling}
                      onChange={e => setHasSibling(e.target.value as any)}
                      className="p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    >
                      <option value="Hayır">Hayır</option>
                      <option value="Evet">Evet</option>
                    </select>
                  </div>

                  {hasSibling === 'Evet' && (
                    <div className="space-y-3">
                      {siblingsList.map((sib, index) => (
                        <div key={index} className="p-4 bg-white border border-slate-100 rounded-xl space-y-3 relative shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleRemoveSibling(index)}
                            className="absolute top-2 right-2 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <span className="text-[9px] font-bold text-blue-600 block uppercase">● {index + 1}. Kardeş Bilgileri</span>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <div className="space-y-1 col-span-1.5">
                              <label className="text-[10px] font-bold text-slate-500">Adı Soyadı <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                placeholder="Kardeş Adı"
                                value={sib.name}
                                onChange={e => handleSiblingChange(index, 'name', e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                              />
                            </div>
                            <div className="space-y-1 col-span-1.5">
                              <label className="text-[10px] font-bold text-slate-500">Kardeş Okulu <span className="text-red-500">*</span></label>
                              <select
                                value={sib.schoolId}
                                onChange={e => handleSiblingChange(index, 'schoolId', e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                              >
                                {schoolsList.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500">Sınıfı <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                placeholder="Örn: 2-C"
                                value={sib.classLevel}
                                onChange={e => handleSiblingChange(index, 'classLevel', e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500">Şubesi <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                placeholder="Örn: B"
                                value={sib.section}
                                onChange={e => handleSiblingChange(index, 'section', e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500">Servis? <span className="text-red-500">*</span></label>
                              <select
                                value={sib.usesService}
                                onChange={e => handleSiblingChange(index, 'usesService', e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                              >
                                <option value="Evet">Evet</option>
                                <option value="Hayır">Hayır</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddSibling}
                        className="w-full py-2 bg-blue-50 border border-dashed border-blue-200 text-blue-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-blue-100 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Yeni Kardeş Ekle
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* COĞRAFİ KONUM VE YAPILANDIRILMIŞ ADRES GİRİŞİ */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm border-b pb-1.5 uppercase tracking-wide text-blue-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> 3. Adres Bilgileri & Haritadan Doğru Konum Seçimi
                </h4>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-200/50">
                  {/* Left Column: Structured Inputs */}
                  <div className="lg:col-span-6 space-y-4">
                    <span className="text-[10px] font-extrabold text-blue-600 tracking-wider block uppercase">A. Yapılandırılmış Adres Tanımı</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">İl <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={addrIl}
                          onChange={e => setAddrIl(e.target.value)}
                          onBlur={handleGeocodeAddress}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">İlçe <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={addrIlce}
                          onChange={e => setAddrIlce(e.target.value)}
                          onBlur={handleGeocodeAddress}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Mahalle <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Ayrancı, Cumhuriyet"
                        value={addrMahalle}
                        onChange={e => setAddrMahalle(e.target.value)}
                        onBlur={handleGeocodeAddress}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1 col-span-2">
                        <label className="font-bold text-slate-600">Cadde / Sokak <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="Örn: Reşat Nuri, 12. Sokak"
                          value={addrSokak}
                          onChange={e => setAddrSokak(e.target.value)}
                          onBlur={handleGeocodeAddress}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Bina No <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="No"
                          value={addrBinaNo}
                          onChange={e => setAddrBinaNo(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Daire No</label>
                        <input
                          type="text"
                          placeholder="Daire"
                          value={addrDaireNo}
                          onChange={e => setAddrDaireNo(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleGeocodeAddress}
                          disabled={isSearchingAddress}
                          className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Search className="w-4 h-4" /> {isSearchingAddress ? 'Aranıyor...' : 'Konumu Haritada Sorgula'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Açık Adres Notu / Sürücüye Ek Tarif</label>
                      <textarea
                        rows={2}
                        placeholder="Örn: Parkın tam karşısındaki beyaz bina"
                        value={addrAcikAdres}
                        onChange={e => setAddrAcikAdres(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Right Column: Live OSM Leaflet Map preview & Draggable verification */}
                  <div className="lg:col-span-6 space-y-4">
                    <span className="text-[10px] font-extrabold text-indigo-600 tracking-wider block uppercase">B. Harita Konumu İnce Ayarı ve Doğrulama</span>
                    
                    {/* Live Map Canvas container */}
                    <div className="relative border border-slate-200 rounded-2xl overflow-hidden shadow-inner" style={{ height: '240px' }}>
                      <div ref={veliMapContainerRef} className="w-full h-full" />
                      
                      {/* Interactive Drag Hint Overlay */}
                      <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] px-2.5 py-1 rounded-lg font-bold pointer-events-none z-[1000]">
                        📍 Ev Simgesini Sürükleyerek Doğru Noktaya İnce Ayar Yapabilirsiniz.
                      </div>
                    </div>

                    {/* Coordinates & Location Verification Button */}
                    <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
                      <div>
                        <span className="font-bold text-slate-700 block">Coğrafi Koordinatlar</span>
                        <code className="text-blue-600 font-mono font-bold">Enlem: {formatCoord(addrLat)} • Boylam: {formatCoord(addrLng)}</code>
                      </div>

                      {/* Explicit "Konum Doğru" Verification Button */}
                      <button
                        type="button"
                        onClick={() => setIsLocVerified(!isLocVerified)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${isLocVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}`}
                      >
                        {isLocVerified ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-pulse" /> [✓] Konum Doğrulandı
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-rose-500 animate-bounce" /> Konum Doğru Mu? Tıklayın
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* AKŞAM BIRAKILIŞ ADRESİ SEÇİMİ VE DETAYLI HARİTASI (KURAL 4) */}
                <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-3xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="font-extrabold text-slate-800 text-sm block">Akşam bırakılış adresi sabah alınış adresinden farklı mı?</span>
                      <p className="text-xs text-slate-500">Öğrenci sabah farklı, akşam farklı adresten alınacak veya bırakılacak ise 'Evet' seçiniz.</p>
                    </div>
                    <div className="flex gap-2">
                      {(['Hayır', 'Evet'] as const).map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setHasDiffEveningAddress(option)}
                          className={`px-6 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            hasDiffEveningAddress === option 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {option === 'Evet' ? '🌙 Evet, Farklı' : '☀️ Hayır, Aynı'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasDiffEveningAddress === 'Evet' && (
                    <div className="space-y-4 pt-2 border-t border-slate-200/50">
                      <span className="text-xs font-black text-rose-600 tracking-wider block uppercase">🌙 Akşam Bırakılış Adres Bilgileri</span>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-200/50">
                        {/* Left Column: Structured Inputs */}
                        <div className="lg:col-span-6 space-y-4">
                          <span className="text-[10px] font-extrabold text-blue-600 tracking-wider block uppercase">A. Akşam Yapılandırılmış Adres Tanımı</span>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="font-bold text-slate-600">İl <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                value={eveAddrIl}
                                onChange={e => setEveAddrIl(e.target.value)}
                                onBlur={handleGeocodeEveAddress}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-bold text-slate-600">İlçe <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                value={eveAddrIlce}
                                onChange={e => setEveAddrIlce(e.target.value)}
                                onBlur={handleGeocodeEveAddress}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold text-slate-600">Mahalle <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              required
                              placeholder="Örn: Ayrancı, Cumhuriyet"
                              value={eveAddrMahalle}
                              onChange={e => setEveAddrMahalle(e.target.value)}
                              onBlur={handleGeocodeEveAddress}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1 col-span-2">
                              <label className="font-bold text-slate-600">Cadde / Sokak <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                placeholder="Örn: Reşat Nuri, 12. Sokak"
                                value={eveAddrSokak}
                                onChange={e => setEveAddrSokak(e.target.value)}
                                onBlur={handleGeocodeEveAddress}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-bold text-slate-600">Bina No <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                placeholder="No"
                                value={eveAddrBinaNo}
                                onChange={e => setEveAddrBinaNo(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="font-bold text-slate-600">Daire No</label>
                              <input
                                type="text"
                                placeholder="Daire"
                                value={eveAddrDaireNo}
                                onChange={e => setEveAddrDaireNo(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={handleGeocodeEveAddress}
                                disabled={isSearchingEveAddress}
                                className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Search className="w-4 h-4" /> {isSearchingEveAddress ? 'Aranıyor...' : 'Konumu Haritada Sına'}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold text-slate-600">Açık Adres Notu / Sürücüye Ek Tarif</label>
                            <textarea
                              rows={2}
                              placeholder="Örn: Parkın tam karşısındaki beyaz bina"
                              value={eveAddrAcikAdres}
                              onChange={e => setEveAddrAcikAdres(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Right Column: Live OSM Leaflet Map preview & Draggable verification */}
                        <div className="lg:col-span-6 space-y-4">
                          <span className="text-[10px] font-extrabold text-indigo-600 tracking-wider block uppercase">B. Harita Konumu İnce Ayarı ve Doğrulama</span>
                          
                          {/* Live Map Canvas container */}
                          <div className="relative border border-slate-200 rounded-2xl overflow-hidden shadow-inner" style={{ height: '240px' }}>
                            <div ref={veliEveMapContainerRef} className="w-full h-full" />
                            
                            {/* Interactive Drag Hint Overlay */}
                            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] px-2.5 py-1 rounded-lg font-bold pointer-events-none z-[1000]">
                              📍 Ev Simgesini Sürükleyerek Doğru Noktaya İnce Ayar Yapabilirsiniz.
                            </div>
                          </div>

                          {/* Coordinates & Location Verification Button */}
                          <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
                            <div>
                              <span className="font-bold text-slate-700 block">Coğrafi Koordinatlar</span>
                              <code className="text-rose-600 font-mono font-bold">Enlem: {formatCoord(eveAddrLat)} • Boylam: {formatCoord(eveAddrLng)}</code>
                            </div>

                            {/* Explicit "Konum Doğru" Verification Button */}
                            <button
                              type="button"
                              onClick={() => setIsEveLocVerified(!isEveLocVerified)}
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${isEveLocVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}`}
                            >
                              {isEveLocVerified ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-pulse" /> [✓] Konum Doğrulandı
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4 text-rose-500 animate-bounce" /> Konum Doğru Mu? Tıklayın
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sağlık & Güvenlik Bilgileri */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm border-b pb-1.5 uppercase tracking-wide text-blue-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> 4. Sağlık & Güvenlik Bilgileri
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 font-semibold">Öğrencinin Alerjileri var mı?</label>
                    <input 
                      type="text" 
                      placeholder="Varsa belirtiniz (Örn: Polen, Arı)"
                      value={formData.allergy}
                      onChange={e => setFormData({ ...formData, allergy: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 font-semibold">Özel Durum / Kronik Hastalık</label>
                    <input 
                      type="text" 
                      placeholder="Varsa belirtiniz (Örn: Diyabet, Astım)"
                      value={formData.specialCondition}
                      onChange={e => setFormData({ ...formData, specialCondition: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 font-semibold">Düzenli Kullandığı İlaçlar</label>
                    <input 
                      type="text" 
                      placeholder="Serviste bulundurulması gereken ilaçlar"
                      value={formData.medication}
                      onChange={e => setFormData({ ...formData, medication: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="font-bold text-slate-600 font-semibold">Öğrenci Teslim Talimatı</label>
                    <input 
                      type="text" 
                      placeholder="Öğrenciyi kimler teslim alabilir? (Örn: Sadece Anneme teslim edilsin)"
                      value={formData.deliveryInstruction}
                      onChange={e => setFormData({ ...formData, deliveryInstruction: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 font-semibold">Öğrenci Vesikalık Fotoğrafı (Sefer Kartı İçin)</label>
                    <input 
                      type="text" 
                      placeholder="Fotoğraf URL (Boş bırakılabilir)"
                      value={formData.photoUrl}
                      onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Acil Durumda Aranacak Kişi <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="İsim Soyisim (Yakınlık derecesi)"
                      value={formData.emergencyContact}
                      onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Acil Durum Telefonu <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="05XX XXX XX XX"
                      value={formData.emergencyPhone}
                      onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* KVKK & Onaylar */}
              <div className="space-y-4 bg-slate-50 p-6 border border-slate-200 rounded-3xl">
                <h4 className="font-extrabold text-slate-800 text-sm border-b pb-1.5 uppercase tracking-wide text-slate-700">
                  📄 5. KVKK Onayları & Sözleşme Şartları
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      required
                      id="kvkkCheck"
                      checked={formData.kvkkConsent}
                      onChange={e => setFormData({ ...formData, kvkkConsent: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="kvkkCheck" className="text-slate-600 leading-relaxed cursor-pointer select-none">
                      <b>KVKK Metni Onayı:</b> 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında öğrencime ve veli şahsıma ait bilgilerin Berkaytur Servis Taşımacılık A.Ş. tarafından saklanmasını, işlenmesini ve servis operasyonlarında kullanılmasını kabul ediyorum. <span className="text-red-500">*</span>
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      required
                      id="rulesCheck"
                      checked={formData.rulesConsent}
                      onChange={e => setFormData({ ...formData, rulesConsent: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="rulesCheck" className="text-slate-600 leading-relaxed cursor-pointer select-none">
                      <b>Taşımacılık Kuralları Onayı:</b> Öğrencimin sabah ve akşam biniş saatlerinde tam vaktinde servisi beklemesini, araç içi güvenlik kurallarına (emniyet kemeri, ayağa kalkmama vb.) uymasını taahhüt ediyor ve bu servis kurallarını onaylıyorum. <span className="text-red-500">*</span>
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      required
                      id="contractCheck"
                      checked={formData.contractConsent}
                      onChange={e => setFormData({ ...formData, contractConsent: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="contractCheck" className="text-slate-600 leading-relaxed cursor-pointer select-none">
                      <b>Ön Hizmet Sözleşme Onayı:</b> Başvurum okul idaresi ve taşıma sorumlusu tarafından incelenip onaylandığında, adıma yıllık taşıma sözleşmesinin PDF formatında oluşturularak tescillenmesini ve ödeme planının seçtiğim okula uygun (Özel Okul: peşin/5 taksit, Devlet Okulu: eylül-mayıs) yapılandırılmasını kabul ediyorum. <span className="text-red-500">*</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <div className="flex justify-center pt-2">
                <button
                  type="submit"
                  className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-5 h-5" /> Online Başvuruyu Tamamla & Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLIANT DISCOUNT / SPECIAL PRICE APPROVAL MODAL (KURAL 5, KURAL 8, KURAL 10) */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white">
              <h3 className="font-black text-base flex items-center gap-2">
                💰 İndirim / Özel Fiyat Onay Talebi
              </h3>
              <p className="text-white/80 text-[11px] mt-1">
                KURAL 5 - Yapılan fiyat değişiklikleri Proje Müdürü onay havuzuna gönderilir.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Öğrenci:</span>
                  <span className="font-black text-slate-800">{showDiscountModal.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Tarife Fiyatı:</span>
                  <span className="font-extrabold text-slate-700">{showDiscountModal.calculatedFee} TL / Yıllık</span>
                </div>
              </div>

              {/* Type Selection */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600">İşlem Türü (KURAL 8)</label>
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="discount">Fiyat İndirimi Talep Et</option>
                  <option value="special_price">Özel Fiyat Uygulaması Talep Et</option>
                </select>
              </div>

              {/* Target Price */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Talep Edilen Yeni Yıllık Ücret (TL)</label>
                <input
                  type="number"
                  value={discountTargetPrice}
                  onChange={e => setDiscountTargetPrice(Number(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-sm focus:bg-white text-emerald-700 focus:outline-blue-500"
                  placeholder="Hedef ücret tutarı girin"
                />
              </div>

              {/* Reason / Gerekçe */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 flex items-center justify-between">
                  <span>İşlem Gerekçesi (KURAL 10)</span>
                  <span className="text-red-500 text-[10px] font-black uppercase">ZORUNLU</span>
                </label>
                <textarea
                  value={discountReason}
                  onChange={e => setDiscountReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500 h-20 placeholder:text-slate-400"
                  placeholder="KURAL 10 - Gerekçesiz hiçbir işlem onaylanmayacaktır. Detaylı açıklama giriniz..."
                  required
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowDiscountModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded-xl transition-all cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => handleRequestDiscount(showDiscountModal, discountTargetPrice, discountReason, discountType)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-amber-200"
              >
                Onay Talebi Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
