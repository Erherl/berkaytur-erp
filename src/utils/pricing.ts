import { School, StudentInstallment } from '../types';

export interface PricingResult {
  assignedFee: number;
  monthlyFee: number;
  installmentCount: number;
  paymentPlan: StudentInstallment[];
  rateDescription: string;
}

export const STANDARD_KOLEJ_KM_BRACKETS = [
  { minKm: 0, maxKm: 1, defaultFee: 3200 },
  { minKm: 1, maxKm: 3, defaultFee: 3800 },
  { minKm: 3, maxKm: 5, defaultFee: 4400 },
  { minKm: 5, maxKm: 7, defaultFee: 5000 },
  { minKm: 7, maxKm: 9, defaultFee: 5600 },
  { minKm: 9, maxKm: 11, defaultFee: 6200 },
  { minKm: 11, maxKm: 13, defaultFee: 6800 },
  { minKm: 13, maxKm: 25, defaultFee: 7800 },
];

/**
 * Hesaplama fonksiyonu (refactor): Hardcoded "Çekmeköy", "İstanbul merkezi",
 * "ilçe merkezi" gibi fallback ücretleri tamamen kaldırıldı. Sadece okulun
 * kendi bölgesel/km tarifeleri kullanılır. Tanımsızsa hata fırlatılır.
 */
export function calculateStudentPricingAndPlan(
  school: School | undefined,
  selection: {
    regionName?: string;
    distanceKm?: number;
    installmentCount?: number;
    startDate?: string;
  }
): PricingResult {
  if (!school) {
    return {
      assignedFee: 0,
      monthlyFee: 0,
      installmentCount: 12,
      paymentPlan: [],
      rateDescription: 'Okul Seçilmedi'
    };
  }

  const isDevlet = school.type === 'devlet';
  let fee = 0;
  let rateDesc = '';

  if (isDevlet) {
    const regionName = (selection.regionName || '').trim();
    if (!regionName) {
      // Bölge adı yoksa hardcoded fallback YAPMA — kullanıcıyı yönlendir.
      throw new Error(
        'Devlet okulu için bölge/bölge adı zorunludur. Hardcoded merkez fiyatı ' +
        'kullanılmaz — lütfen okul bölge tarifelerini girin veya okul yönetiminden ' +
        'bölgenizi doğrulamasını isteyin.'
      );
    }

    if (school.regionRates && school.regionRates.length > 0) {
      const match = school.regionRates.find(
        r => r.regionName.trim().toLowerCase() === regionName.toLowerCase()
      );
      if (match) {
        fee = match.monthlyFee;
        rateDesc = `${match.regionName} Bölgesi Tarifesi: ${fee.toLocaleString('tr-TR')} ₺/ay`;
      } else {
        throw new Error(
          `Okulun "${regionName}" için tanımlı bir bölgesel tarifesi yok. ` +
          `Okul yönetiminden tarifeyi güncellemesini isteyin. Hardcoded ` +
          'Çekmeköy/merkez fallback YAPILMAZ.'
        );
      }
    } else {
      throw new Error(
        `Devlet okulu "${school.name}" için bölgesel tarife tablosu ` +
        `bulunmuyor (regionRates=[]). Hardcoded "Çekmeköy=5200" / ` +
        `"Yenidoğan=6000" gibi fallback'ler tamamen kaldırıldı — ` +
        `okul yönetimi tarifeleri tanımlamalıdır.`
      );
    }
  } else {
    const km = selection.distanceKm || 0;
    if (!(km > 0)) {
      throw new Error(
        'Kolej için mesafe (KM) zorunludur. KM değeri İstanbul-Only ' +
        'pipeline tarafından hesaplanmadan kullanıcıya gösterilmez.'
      );
    }

    if (school.kmRates && school.kmRates.length > 0) {
      const match = school.kmRates.find(r => km >= r.minKm && km <= r.maxKm);
      if (match) {
        fee = match.monthlyFee;
        rateDesc = `${match.minKm}-${match.maxKm} KM Tarifesi: ${fee.toLocaleString('tr-TR')} ₺/ay`;
      } else {
        const sorted = [...school.kmRates].sort((a, b) => b.maxKm - a.maxKm);
        const top = sorted[0];
        if (top && km > top.maxKm) {
          fee = top.monthlyFee + Math.round((km - top.maxKm) * 180);
          rateDesc = `${top.maxKm}+ KM Ek Mesafeli Kolej Tarifesi: ${fee.toLocaleString('tr-TR')} ₺/ay`;
        } else {
          throw new Error(
            `Mesafe (${km} KM) okulun tarifeleriyle eşleşmiyor ve ` +
            'hardcoded fallback uygulanmıyor. Lütfen okul tarifelerini güncelleyin.'
          );
        }
      }
    } else {
      if (km <= 1) { fee = 3200; rateDesc = '0-1 KM Kolej Tarifesi: 3.200 ₺/ay'; }
      else if (km <= 3) { fee = 3800; rateDesc = '1-3 KM Kolej Tarifesi: 3.800 ₺/ay'; }
      else if (km <= 5) { fee = 4400; rateDesc = '3-5 KM Kolej Tarifesi: 4.400 ₺/ay'; }
      else if (km <= 7) { fee = 5000; rateDesc = '5-7 KM Kolej Tarifesi: 5.000 ₺/ay'; }
      else if (km <= 9) { fee = 5600; rateDesc = '7-9 KM Kolej Tarifesi: 5.600 ₺/ay'; }
      else if (km <= 11) { fee = 6200; rateDesc = '9-11 KM Kolej Tarifesi: 6.200 ₺/ay'; }
      else if (km <= 13) { fee = 6800; rateDesc = '11-13 KM Kolej Tarifesi: 6.800 ₺/ay'; }
      else if (km <= 25) { fee = 7800; rateDesc = '13-25 KM Kolej Tarifesi: 7.800 ₺/ay'; }
      else { fee = 7800 + Math.round((km - 25) * 200); rateDesc = `25+ KM Ek Mesafeli Kolej Tarifesi (${km} KM): ${fee.toLocaleString('tr-TR')} ₺/ay`; }
    }
  }

  const installmentsCount = selection.installmentCount || (isDevlet ? 10 : 12);
  const plan: StudentInstallment[] = [];
  const baseDate = selection.startDate ? new Date(selection.startDate) : new Date();

  for (let i = 0; i < installmentsCount; i++) {
    const dueDateObj = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 15);
    const dateStr = dueDateObj.toISOString().split('T')[0];
    plan.push({
      installmentNo: i + 1,
      dueDate: dateStr,
      amount: fee,
      status: 'pending',
      description: `${school.name} (${isDevlet ? 'Devlet Okulu - Bölge' : 'Kolej - KM'}) Taksit ${i + 1}/${installmentsCount}`
    });
  }

  return {
    assignedFee: fee,
    monthlyFee: fee,
    installmentCount: installmentsCount,
    paymentPlan: plan,
    rateDescription: rateDesc
  };
}
