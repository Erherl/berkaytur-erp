/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VehicleHistoryItem {
  id: string;
  date: string;
  type: 'school' | 'driver' | 'hostess' | 'repair' | 'fuel' | 'accrual' | 'penalty' | 'audit';
  title: string;
  details: string;
  cost?: number;
}

export interface DetailedVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  capacity: number;
  driverId?: string;
  driverName?: string;
  hostessId?: string;
  hostessName?: string;
  status: 'active' | 'idle' | 'event' | 'service' | 'inactive';
  schoolId?: string;
  schoolIds?: string[];
  schoolName?: string;
  projectName?: string;
  vehicleType: 'company' | 'supplier';
  photo: string;
  
  // Company Specific Fields
  fuelType?: string;
  phone?: string;
  gpsEnabled?: boolean;
  acEnabled?: boolean;
  cameraSystemEnabled?: boolean;
  registrationNumber?: string;
  inspectionDate?: string; // Muayene
  insuranceDate?: string; // Trafik Sigortası
  compInsuranceDate?: string; // Kasko
  tyreReplaceDate?: string; // Lastik Değişim
  maintenanceDate?: string; // Bakım
  fireExtinguisherDate?: string; // Yangın Tüpü Kontrolü
  firstAidKit?: boolean; // İlk Yardım Çantası

  // Supplier Specific Fields
  supplierCompany?: string;
  supplierManager?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  supplierTaxOffice?: string;
  supplierTaxNo?: string;
  supplierIban?: string;
  hostessIncluded?: boolean; // Hostes dahil mi? (True: Dahil, False: Hariç -> Buton aktif olur)
  driverIsOwner?: boolean; // Şoför aracı kendisi kullanıyor mu?

  // Seating plan mapping (seatNo -> StudentId)
  seating?: Record<number, string>;
  
  // Logs & History
  history: VehicleHistoryItem[];
}

export const CAPACITIES = [10, 13, 16, 19, 27, 31, 35, 39, 44, 46, 50, 54];

export const STATUS_COLORS = {
  active: { text: '🟢 Aktif', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  idle: { text: '🟡 Boşta', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  event: { text: '🔵 Etkinlikte', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  service: { text: '🟠 Bakımda', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  inactive: { text: '🔴 Pasif', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' }
};

export const INITIAL_DETAILED_VEHICLES: DetailedVehicle[] = [
  {
    id: 'v1',
    plate: '06 BKT 123',
    brand: 'Mercedes-Benz',
    model: 'Sprinter 2023',
    year: '2023',
    capacity: 19,
    driverId: 'u4',
    driverName: 'Ahmet Yılmaz',
    hostessId: 'u5',
    hostessName: 'Ayşe Yıldız',
    status: 'active',
    schoolId: 's1',
    schoolName: 'Atatürk Anadolu Lisesi',
    projectName: 'Çankaya Servis Grubu',
    vehicleType: 'company',
    photo: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=60',
    fuelType: 'Dizel',
    phone: '0555 444 55 66',
    gpsEnabled: true,
    acEnabled: true,
    cameraSystemEnabled: true,
    registrationNumber: 'AA778899',
    inspectionDate: '2026-08-15', // approaching
    insuranceDate: '2026-10-10',
    compInsuranceDate: '2026-09-01',
    tyreReplaceDate: '2025-11-20',
    maintenanceDate: '2026-07-05',
    fireExtinguisherDate: '2026-07-20', // urgent approaching
    firstAidKit: true,
    seating: {
      1: 'st1', // Ali Yılmaz
      2: 'st2', // Ece Yıldız
      5: 'st4', // Zeynep Yılmaz (Ali's sister)
    },
    history: [
      { id: 'h1', date: '2026-07-10', type: 'school', title: 'Atatürk Lisesi Ataması', details: 'Araç Atatürk Anadolu Lisesi güzergahına atandı.' },
      { id: 'h2', date: '2026-07-05', type: 'repair', title: 'Periyodik 10bin Bakımı', details: 'BERKAYTUR Yetkili Servisinde yağ, filtreler ve fren balataları yenilendi.', cost: 6800 },
      { id: 'h3', date: '2026-07-01', type: 'driver', title: 'Şoför Değişikliği', details: 'Araç yeni şoför Ahmet Yılmaz kaptana zimmetlendi.' },
      { id: 'h4', date: '2026-06-15', type: 'audit', title: 'Trafik Polisi Denetimi', details: 'EGM Şehir İçi Servis Denetiminde sıfır hata ile geçmiştir. Teşekkür belgesi düzenlendi.' },
      { id: 'h5', date: '2026-07-12', type: 'fuel', title: 'Mazot Alımı - Opet', details: '65 Litre Motorin yakıt alındı.', cost: 2850 },
      { id: 'h6', date: '2026-06-30', type: 'accrual', title: 'Haziran Hakediş', details: 'Şirket hakediş dökümü oluşturuldu.', cost: 32000 }
    ]
  },
  {
    id: 'v2',
    plate: '06 BKT 456',
    brand: 'Volkswagen',
    model: 'Crafter 2022',
    year: '2022',
    capacity: 16,
    driverId: 'u4',
    driverName: 'Ahmet Yılmaz',
    status: 'idle',
    schoolId: 's2',
    schoolName: 'Cumhuriyet İlkokulu',
    projectName: 'Yenimahalle Grubu',
    vehicleType: 'supplier',
    photo: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&auto=format&fit=crop&q=60',
    supplierCompany: 'BERKAYTUR Bölge Ortaklığı',
    supplierManager: 'Berkay Turan',
    supplierPhone: '0532 999 88 77',
    supplierAddress: 'Çankaya, Ankara',
    supplierTaxOffice: 'Çankaya VD',
    supplierTaxNo: '4560029871',
    supplierIban: 'TR45 0006 1000 0002 9876 5432 10',
    hostessIncluded: false, // Hostes hariç - "Hostes Ata" butonu aktif olmalı
    driverIsOwner: true,
    seating: {
      3: 'st3', // Can Öz
    },
    history: [
      { id: 'h10', date: '2026-07-08', type: 'repair', title: 'Klima Gaz Dolumu', details: 'Klima kompresörü tamir edilip gaz dolumu yapıldı.', cost: 3200 },
      { id: 'h11', date: '2026-06-20', type: 'penalty', title: 'Hız İhlali Cezası', details: 'TED Ankara Koleji bölgesinde EDS hız sınırı aşım cezası yazıldı.', cost: 1950 }
    ]
  }
];
