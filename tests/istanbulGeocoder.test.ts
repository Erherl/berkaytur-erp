import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateIstanbulAddress,
  isInsideIstanbul,
  ISTANBUL_39_ILCE,
  normalizeDistrictKey,
  pointInIstanbulOuter,
  pointInDistrict,
  findDistrictForPoint,
  __clearGeocodeCachesForTests,
  GeocodeValidationError,
} from '../server/services/istanbulGeocoder';
import { getIstanbulDistrictCenter } from '../server/services/istanbulDistricts';

// =================================================================
// TEST HELPERS — Nominatim sağlayıcısını deterministik olarak mock'lıyoruz.
// global.fetch'i, her test senaryosu için önceden tasarlanmış dönüşler
// verecek şekilde override ediyoruz. Bu sayede:
//  - Gerçek ağ çağrısı yok (flaky olmaz).
//  - Her ilçe için ayrı ayrı kabul/red senaryosu kontrol edilebilir.
//  - Almanya, Ankara gibi İstanbul dışı eşleşmeleri simüle edebiliriz.
// =================================================================
type NominatimHandler = (path: string) => any;

function mockNominatim(handler: NominatimHandler) {
  const realFetch = global.fetch;
  global.fetch = vi.fn(async (url: any) => {
    const u = typeof url === 'string' ? url : (url as URL).toString();
    if (typeof u !== 'string' || !u.includes('nominatim.openstreetmap.org')) {
      return realFetch ? realFetch(url).catch(() => ({ ok: false, status: 502, json: async () => ({}) } as any))
        : ({ ok: false, status: 502, json: async () => ({}) } as any);
    }
    const path = u.replace('https://nominatim.openstreetmap.org', '');
    const result = handler(path);
    if (result === 'ERR') {
      return { ok: false, status: 500, json: async () => ({}) } as any;
    }
    return {
      ok: true,
      status: 200,
      json: async () => result,
    } as any;
  }) as any;
}

beforeEach(() => {
  __clearGeocodeCachesForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
});

// =================================================================
// I. PIPELINE — TÜM İSTANBUL-VALİD 39 İLÇE
// =================================================================
// Prompt v2: 39 ilçenin her birini tek tek doğrula. Her ilçenin
// kendi grid polygonu içinde sahte bir koordinatla Nominatim'e gidip
// tam pipeline'ı (forward→Turkey→İstanbul outer→39 ilçe→reverse) geçer.
describe('İstanbul-Only pipeline — 39 ilçe grid polygon kapsama testi', () => {
  beforeEach(() => {
    mockNominatim((path) => {
      if (path.startsWith('/search')) {
        const q = decodeURIComponent(path.split('q=')[1] || '');
        const k = normalizeDistrictKey(q);
        if (!k) return [];
        const c = getIstanbulDistrictCenter(k);
        if (!c) return [];
        return [{
          lat: String(c.lat),
          lon: String(c.lon),
          display_name: `${q}, ${k}, İstanbul`,
          address: { country_code: 'tr', city: 'İstanbul', county: k },
        }];
      }
      if (path.startsWith('/reverse')) {
        const params = new URLSearchParams(path.split('?')[1] || '');
        const lat = parseFloat(params.get('lat') || '0');
        const lon = parseFloat(params.get('lon') || '0');
        const k = findDistrictForPoint(lat, lon);
        return {
          lat,
          lon,
          display_name: k ? `Test Mahallesi, ${k.display}, İstanbul` : 'İstanbul',
          address: {
            country_code: 'tr',
            city: 'İstanbul',
            county: k ? k.display : 'İstanbul',
            suburb: k ? k.display : 'İstanbul',
            neighbourhood: 'Test Mahallesi',
          }
        };
      }
      return [];
    });
  });

  for (const d of ISTANBUL_39_ILCE) {
    it(`✅ valid adres, polygon → ${d.display} (${d.key})`, async () => {
      const result = await validateIstanbulAddress(
        `${d.display} Mahallesi, ${d.display}, İstanbul`,
        { userSelectedDistrict: d.key }
      );
      expect(result.ok).toBe(true);
      if (!result.ok) {
        // Hata varsa kullanıcıya anlaşılır şekilde göster
        throw new Error(`Beklenen başarı, alınan: reason=${result.reason}, msg=${result.message}`);
      }
      expect(result.city).toBe('istanbul');
      expect(result.districtKey).toBe(d.key);
      expect(result.districtDisplay).toBe(d.display);
      expect(result.lat).toBeGreaterThan(40.5);
      expect(result.lat).toBeLessThan(42.0);
      expect(result.lon).toBeGreaterThan(27.0);
      expect(result.lon).toBeLessThan(31.0);
    });
  }
});

// =================================================================
// II. PIPELINE — DIŞ ŞEHİRLER REDDEDİLMELİ
// =================================================================
describe('İstanbul-Only pipeline — İstanbul dışı adresler REDDEDİLMELİ', () => {
  beforeEach(() => {
    mockNominatim((path) => {
      if (path.startsWith('/search')) {
        const q = decodeURIComponent(path.split('q=')[1] || '');
        const qLower = q.toLocaleLowerCase('tr-TR');
        const TR_CITY: Record<string, [number, number]> = {
          'ankara':   [39.9250, 32.8350],
          'izmir':    [38.4237, 27.1428],
          'bursa':    [40.1828, 29.0665],
          'antalya':  [36.8865, 30.7060],
          'adana':    [37.0000, 35.3210],
        };
        if (qLower.includes('germany') || qLower.includes('almanya')) {
          return [{
            lat: '51.5074', lon: '7.0982',
            display_name: 'Kadıköy, Germany',
            address: { country_code: 'de', city: 'Kadıköy' },
          }];
        }
        for (const [c, coord] of Object.entries(TR_CITY)) {
          if (qLower.includes(c)) {
            return [{
              lat: String(coord[0]),
              lon: String(coord[1]),
              display_name: `${c}, Türkiye`,
              address: { country_code: 'tr', city: c[0].toUpperCase() + c.slice(1) },
            }];
          }
        }
        return [];
      }
      return [];
    });
  });

  it('REJECTS → Ankara', async () => {
    const r = await validateIstanbulAddress('Kızılay Mahallesi, Ankara');
    expect(r.ok).toBe(false);
  });
  it('REJECTS → İzmir', async () => {
    const r = await validateIstanbulAddress('Konak Mahallesi, İzmir');
    expect(r.ok).toBe(false);
  });
  it('REJECTS → Bursa', async () => {
    const r = await validateIstanbulAddress('Osmangazi Mahallesi, Bursa');
    expect(r.ok).toBe(false);
  });
  it('REJECTS → Antalya', async () => {
    const r = await validateIstanbulAddress('Muratpaşa Mahallesi, Antalya');
    expect(r.ok).toBe(false);
  });
  it('REJECTS → Adana', async () => {
    const r = await validateIstanbulAddress('Seyhan Mahallesi, Adana');
    expect(r.ok).toBe(false);
  });
  it('REJECTS → Almanya sahte Kadıköy', async () => {
    const r = await validateIstanbulAddress('Kadıköy, Germany');
    expect(r.ok).toBe(false);
  });
  it('REJECTS → Sahte/varsayılan fallback koordinatı dönmüyor', async () => {
    const r = await validateIstanbulAddress('Kızılay, Ankara');
    if (!r.ok) {
      // Eğer lat/lon döndüyse, bunun İstanbul polygonunda OLMAMASI gerek
      expect(isInsideIstanbul(r.lat ?? 999, r.lon ?? 999)).toBe(false);
    }
  });
});

// =================================================================
// III. POLYGON HELPERS — Punto-in-polygon matematiği
// =================================================================
describe('Polygon helpers — punto-in-polygon kontrolleri', () => {
  it('İstanbul içinde olan bir nokta outer polygon\'da true döner', () => {
    for (const d of ISTANBUL_39_ILCE) {
      const c = getIstanbulDistrictCenter(d.key)!;
      expect(pointInIstanbulOuter(c.lat, c.lon)).toBe(true);
    }
  });

  it('Yurt dışındaki bir nokta İstanbul outer polygon\'da false döner', () => {
    expect(pointInIstanbulOuter(39.9250, 32.8350)).toBe(false); // Ankara
    expect(pointInIstanbulOuter(38.4237, 27.1428)).toBe(false); // İzmir
    expect(pointInIstanbulOuter(36.8865, 30.7060)).toBe(false); // Antalya
    expect(pointInIstanbulOuter(37.0000, 35.3210)).toBe(false); // Adana
    expect(pointInIstanbulOuter(40.1828, 29.0665)).toBe(false); // Bursa
    expect(pointInIstanbulOuter(48.8566, 2.3522)).toBe(false);  // Paris
    expect(pointInIstanbulOuter(51.5074, -0.1278)).toBe(false); // London
  });

  it('Ankara/İzmir/Bursa/Antalya/Adana → isInsideIstanbul = false', () => {
    expect(isInsideIstanbul(39.9250, 32.8350)).toBe(false);
    expect(isInsideIstanbul(38.4237, 27.1428)).toBe(false);
    expect(isInsideIstanbul(40.1828, 29.0665)).toBe(false);
    expect(isInsideIstanbul(36.8865, 30.7060)).toBe(false);
    expect(isInsideIstanbul(37.0000, 35.3210)).toBe(false);
  });

  it('39 ilçe benzersiz key\'e sahip', () => {
    expect(ISTANBUL_39_ILCE.length).toBe(39);
    const keys = ISTANBUL_39_ILCE.map(d => d.key);
    expect(new Set(keys).size).toBe(39);
  });

  it('39 ilçe T.C. resmi listesi doğru sırada', () => {
    const expected = [
      'adalar','arnavutkoy','atasehir','avcilar','bagcilar','bahcelievler','bakirkoy',
      'basaksehir','bayrampasa','besiktas','beykoz','beylikduzu','beyoglu',
      'buyukcekmece','catalca','cekmekoy','esenler','esenyurt','eyupsultan','fatih',
      'gaziosmanpasa','gungoren','kadikoy','kagithane','kartal','kucukcekmece',
      'maltepe','pendik','sancaktepe','sariyer','silivri','sultanbeyli','sultangazi',
      'sile','sisli','tuzla','umraniye','uskudar','zeytinburnu'
    ];
    expect(ISTANBUL_39_ILCE.map(d => d.key)).toEqual(expected);
  });

  it('Her ilçenin grid polygonu findDistrictForPoint\'e kendini döndürür', () => {
    for (const d of ISTANBUL_39_ILCE) {
      const c = getIstanbulDistrictCenter(d.key)!;
      const got = findDistrictForPoint(c.lat, c.lon);
      expect(got?.key).toBe(d.key);
      expect(pointInDistrict(c.lat, c.lon, d.key)).toBe(true);
    }
  });
});

// =================================================================
// IV. SELECTED DISTRICT MISMATCH
// =================================================================
describe('İstanbul-Only — Kullanıcının seçtiği ilçe ile karşılaştırma', () => {
  beforeEach(() => {
    // Şişli grid polygon'unun gerçek merkez coord değerini kullanıyoruz;
    // test mock'undaki her Şişli ilçesi gridine giriyor olmalıdır.
    const sisliCenter = getIstanbulDistrictCenter('sisli')!;
    const koord = { lat: sisliCenter.lat, lon: sisliCenter.lon };
    const kadinKoyCenter = getIstanbulDistrictCenter('kadikoy')!;
    void kadinKoyCenter;
    mockNominatim((path) => {
      if (path.startsWith('/search')) {
        return [{
          lat: String(koord.lat),
          lon: String(koord.lon),
          display_name: 'Şişli Merkez, Şişli, İstanbul',
          address: { country_code: 'tr', city: 'İstanbul' },
        }];
      }
      if (path.startsWith('/reverse')) {
        return {
          lat: koord.lat,
          lon: koord.lon,
          display_name: 'Şişli Merkez Mah., Şişli, İstanbul',
          address: {
            country_code: 'tr', city: 'İstanbul',
            county: 'Şişli', suburb: 'Şişli', neighbourhood: 'Şişli Merkez',
          }
        };
      }
      return [];
    });
  });

  it('REJECTS → kullanıcı Kadıköy seçti ama Nominatim Şişli döndü', async () => {
    const r = await validateIstanbulAddress(
      'Şişli Merkez, Şişli, İstanbul',
      { userSelectedDistrict: 'kadikoy' }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('SELECTED_DISTRICT_MISMATCH');
  });

  it('ACCEPTS → kullanıcı doğru ilçe seçti', async () => {
    const r = await validateIstanbulAddress(
      'Şişli Merkez, Şişli, İstanbul',
      { userSelectedDistrict: 'sisli' }
    );
    expect(r.ok).toBe(true);
  });
});

// =================================================================
// V. HARDCODE FALLBACK YASAKLARI
// =================================================================
describe('Hardcoded fallback YASAK testleri', () => {
  beforeEach(() => {
    mockNominatim(() => 'ERR');
  });

  it('FAIL-FAST → Nominatim erişilemezse pin oluşturulmamalı', async () => {
    const r = await validateIstanbulAddress('Beşiktaş, İstanbul');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // KRİTİK: failed result fallback koordinat taşımaz
      expect(isInsideIstanbul(r.lat ?? 999, r.lon ?? 999)).toBe(false);
    }
  });

  it('FAIL-FAST → boş input reddedilir', async () => {
    const r = await validateIstanbulAddress('');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('EMPTY_INPUT');
  });

  it('GeocodeValidationError fırlatılır', () => {
    const ex = new GeocodeValidationError(
      'Ankara reddedildi', 'OUT_OF_ISTANBUL_POLYGON',
      { cityDetected: 'ankara', districtDetected: null }
    );
    expect(ex.name).toBe('GeocodeValidationError');
    expect(ex.reason).toBe('OUT_OF_ISTANBUL_POLYGON');
    expect(ex.cityDetected).toBe('ankara');
  });
});

// =================================================================
// VI. District name normalization
// =================================================================
describe('İlçe normalize fonksiyonu', () => {
  it('Canonical keyler normalize edilir', () => {
    expect(normalizeDistrictKey('Kadıköy')).toBe('kadikoy');
    expect(normalizeDistrictKey('BESIKTAS')).toBe('besiktas');
    expect(normalizeDistrictKey('Güngören')).toBe('gungoren');
    expect(normalizeDistrictKey('Şişli')).toBe('sisli');
  });

  it('Alias\'lar tanınır (Levent→Beşiktaş, Taksim→Beyoğlu)', () => {
    expect(normalizeDistrictKey('Levent')).toBe('besiktas');
    expect(normalizeDistrictKey('Bostancı')).toBe('kadikoy');
    expect(normalizeDistrictKey('Taksim')).toBe('beyoglu');
  });

  it('İstanbul\'da olmayan isimler null döner', () => {
    expect(normalizeDistrictKey('Türkiye')).toBeNull();
    expect(normalizeDistrictKey('Avrupa')).toBeNull();
    expect(normalizeDistrictKey('')).toBeNull();
  });
});
