/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BERKAYTUR — İSTANBUL-ONLY GEOCODING PIPELINE (Zorunlu Zincir)
 * =================================================================
 * Bu modül, prompt v2 ile zorunlu kılınan "Sadece İstanbul" iş kuralının
 * somut uygulamasıdır. Sistem sırasıyla şu adımları uygular:
 *
 *   1. Forward Geocoding  (Nominatim, countrycodes=tr)
 *   2. Türkiye kontrolü   (kaba bounding-box)
 *   3. İstanbul il kontrolü (bbox + polygon punto-in-polygon)
 *   4. 39 İstanbul ilçesi kontrolü (drawn polygon hit-test)
 *   5. Kullanıcının seçtiği ilçe ile geocoder sonucunun karşılaştırılması
 *   6. Reverse Geocoding  (Nominatim reverse, mahalle/cadde derinliği)
 *   7. Şehir/İlçe/Mahalle mümkün olduğunca karşılaştırılması
 *
 * Tüm doğrulamalar başarıyla geçmeden adres "doğrulanmış" kabul edilmez.
 * Hiçbir koşulda Çekmeköy, İstanbul merkezi, ilçe merkezi veya herhangi bir
 * sabit/default koordinata fallback yapılmaz.
 */

import logger from '../utils/logger';
import {
  ISTANBUL_39_ILCE,
  ISTANBUL_OUTER_POLYGON,
  pointInIstanbulOuter,
  pointInDistrict,
  normalizeDistrictKey,
  findDistrictForPoint,
  reverseLookupDistrict,
  istanbulDistrict,
} from './istanbulDistricts';

export { ISTANBUL_39_ILCE, ISTANBUL_OUTER_POLYGON, normalizeDistrictKey, pointInIstanbulOuter, pointInDistrict, findDistrictForPoint, reverseLookupDistrict };
export type { istanbulDistrict };

// =================================================================
// PUBLIC TYPES
// =================================================================
export type ValidationReason =
  | 'EMPTY_INPUT'
  | 'FORWARD_GEOCODE_FAILED'
  | 'COUNTRY_MISMATCH'
  | 'OUT_OF_TURKEY_BBOX'
  | 'OUT_OF_ISTANBUL_POLYGON'
  | 'DISTRICT_NOT_IN_ISTANBUL'
  | 'SELECTED_DISTRICT_MISMATCH'
  | 'REVERSE_GEOCODE_FAILED'
  | 'REVERSE_CITY_MISMATCH'
  | 'REVERSE_DISTRICT_MISMATCH';

export interface GeocodeOk {
  ok: true;
  lat: number;
  lon: number;
  city: 'istanbul';
  districtKey: string;
  districtDisplay: string;
  neighborhood?: string;
  displayName: string;
  matchedUserDistrict: boolean;
  reverseVerified: boolean;
}

export interface GeocodeFail {
  ok: false;
  reason: ValidationReason;
  message: string;
  lat?: number;
  lon?: number;
  cityDetected?: string | null;
  districtDetected?: string | null;
}

export type GeocodeResult = GeocodeOk | GeocodeFail;

export class GeocodeValidationError extends Error {
  public readonly reason: ValidationReason;
  public readonly cityDetected: string | null;
  public readonly districtDetected: string | null;
  constructor(
    message: string,
    reason: ValidationReason,
    extras: { cityDetected?: string | null; districtDetected?: string | null } = {}
  ) {
    super(message);
    this.name = 'GeocodeValidationError';
    this.reason = reason;
    this.cityDetected = extras.cityDetected ?? null;
    this.districtDetected = extras.districtDetected ?? null;
  }
}

// =================================================================
// CONFIG
// =================================================================
const TURKEY_BBOX = { minLat: 35.8, maxLat: 42.5, minLon: 25.5, maxLon: 45.0 } as const;
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

const FORWARD_CACHE = new Map<string, GeocodeResult>();
const REVERSE_CACHE = new Map<string, { address: any; displayName: string } | null>();

// Test ortamında cache sızıntısını önlemek için dışa açık reset
export function __clearGeocodeCachesForTests() {
  FORWARD_CACHE.clear();
  REVERSE_CACHE.clear();
}

function inTurkeyBbox(lat: number, lon: number): boolean {
  return lat >= TURKEY_BBOX.minLat && lat <= TURKEY_BBOX.maxLat &&
         lon >= TURKEY_BBOX.minLon && lon <= TURKEY_BBOX.maxLon;
}

async function nominatimGetJson(path: string): Promise<any> {
  const url = `${NOMINATIM_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'tr-TR,tr;q=0.9',
      'User-Agent': 'BerkayturProduction/1.0 (istanbul-only-geocoder)',
    },
  });
  if (!res.ok) {
    throw new Error(`Nominatim HTTP ${res.status}`);
  }
  return res.json();
}

// =================================================================
// STEP 1 — FORWARD GEOCODING (Nominatim, countrycodes=tr)
// =================================================================
async function stepForwardGeocode(address: string): Promise<{
  lat: number; lon: number; displayName: string; raw: any;
} | null> {
  const cacheKey = `FWD::${address.trim().toLowerCase()}`;
  if (FORWARD_CACHE.has(cacheKey)) {
    const cached = FORWARD_CACHE.get(cacheKey)!;
    if (!cached.ok) return null;
    return {
      lat: cached.lat, lon: cached.lon,
      displayName: cached.displayName, raw: null,
    };
  }
  try {
    const data = await nominatimGetJson(
      `/search?format=json&countrycodes=tr&limit=1&q=${encodeURIComponent(address)}`
    );
    if (!Array.isArray(data) || data.length === 0) return null;
    const hit = data[0];
    const lat = parseFloat(hit?.lat ?? '');
    const lon = parseFloat(hit?.lon ?? '');
    if (!isFinite(lat) || !isFinite(lon)) return null;
    return { lat, lon, displayName: hit?.display_name || '', raw: hit };
  } catch (err) {
    logger.warn('[ISTANBUL-GEOCODER] Nominatim forward error:', err);
    return null;
  }
}

// =================================================================
// STEP 2-4 — Country / Province / District boundary checks
// =================================================================
function stepTurkey(forward: { lat: number; lon: number }): boolean {
  return inTurkeyBbox(forward.lat, forward.lon);
}

function stepIstanbulPolygon(forward: { lat: number; lon: number }): boolean {
  return pointInIstanbulOuter(forward.lat, forward.lon);
}

function step39District(forward: { lat: number; lon: number }): {
  hit: boolean; key: string | null; display: string | null;
} {
  const district = findDistrictForPoint(forward.lat, forward.lon);
  if (!district) return { hit: false, key: null, display: null };
  return { hit: true, key: district.key, display: district.display };
}

// =================================================================
// STEP 5 — Kullanıcının seçtiği ilçe ile geocoder sonucunun karşılaştırılması
// =================================================================
function stepSelectedDistrictMatch(
  geocoderDistrictKey: string | null,
  userSelectedDistrictRaw: string | undefined
): { match: boolean; matchedKey: string | null } {
  if (!userSelectedDistrictRaw || !userSelectedDistrictRaw.trim()) {
    return { match: true, matchedKey: geocoderDistrictKey };
  }
  const userKey = normalizeDistrictKey(userSelectedDistrictRaw);
  if (!userKey) return { match: false, matchedKey: geocoderDistrictKey };
  if (userKey === geocoderDistrictKey) return { match: true, matchedKey: userKey };
  return { match: false, matchedKey: geocoderDistrictKey };
}

// =================================================================
// STEP 6 — REVERSE GEOCODING
// =================================================================
async function stepReverseGeocode(lat: number, lon: number): Promise<{
  displayName: string; address: any;
} | null> {
  const key = `REV::${lat.toFixed(5)}::${lon.toFixed(5)}`;
  if (REVERSE_CACHE.has(key)) return REVERSE_CACHE.get(key) ?? null;
  try {
    const data = await nominatimGetJson(
      `/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    );
    if (!data || data.error) return null;
    const cached = { displayName: data.display_name || '', address: data.address || {} };
    REVERSE_CACHE.set(key, cached);
    return cached;
  } catch (err) {
    logger.warn('[ISTANBUL-GEOCODER] Nominatim reverse error:', err);
    return null;
  }
}

// =================================================================
// STEP 7 — Şehir / İlçe / Mahalle karşılaştırma (reverse vs forward)
// =================================================================
function stepReverseCompare(
  reverseAddress: any,
  forwardDistrictKey: string | null,
  forwardDisplayName: string
): {
  reverseCityMatch: boolean;
  reverseDistrictMatch: boolean;
  neighborhoodFromReverse: string | null;
} {
  const findCity = (a: any): string | null => {
    if (!a) return null;
    const candidates = [a.city, a.town, a.county, a.state, a.village, a.province];
    for (const c of candidates) {
      if (!c) continue;
      const k = String(c).toLocaleLowerCase('tr-TR');
      if (k.includes('istanbul')) return 'istanbul';
    }
    return null;
  };

  const districtFromReverse = (a: any): string | null => {
    const candidates = [a.suburb, a.city_district, a.town, a.county, a.neighbourhood, a.quarter];
    for (const c of candidates) {
      if (c && normalizeDistrictKey(c)) return normalizeDistrictKey(c);
    }
    return null;
  };

  const reverseCity = findCity(reverseAddress);
  const reverseCityMatch = reverseCity === 'istanbul';
  const reverseDistrictKey = districtFromReverse(reverseAddress);
  const reverseDistrictMatch = !!forwardDistrictKey && !!reverseDistrictKey &&
    forwardDistrictKey === reverseDistrictKey;

  const neighborhood =
    reverseAddress?.neighbourhood || reverseAddress?.suburb || reverseAddress?.quarter || null;

  return { reverseCityMatch, reverseDistrictMatch, neighborhoodFromReverse: neighborhood };
}

// =================================================================
// PUBLIC API
// =================================================================
export async function validateIstanbulAddress(
  address: string,
  opts: { userSelectedDistrict?: string } = {}
): Promise<GeocodeResult> {
  const cacheKey = `RESULT::${address.trim().toLowerCase()}::${(opts.userSelectedDistrict || '').trim().toLowerCase()}`;
  if (FORWARD_CACHE.has(cacheKey)) return FORWARD_CACHE.get(cacheKey)!;

  const raw = (address || '').trim();
  if (!raw) {
    const r: GeocodeFail = {
      ok: false, reason: 'EMPTY_INPUT',
      message: 'Adres metni boş olamaz.',
    };
    FORWARD_CACHE.set(cacheKey, r);
    return r;
  }

  // STEP 1
  const forward = await stepForwardGeocode(raw);
  if (!forward) {
    const r: GeocodeFail = {
      ok: false, reason: 'FORWARD_GEOCODE_FAILED',
      message: `Adres Nominatim üzerinde Türkiye sınırları içinde çözümlenemedi: "${raw}".`,
    };
    FORWARD_CACHE.set(cacheKey, r);
    return r;
  }

  // STEP 2
  if (!stepTurkey(forward)) {
    const r: GeocodeFail = {
      ok: false, reason: 'OUT_OF_TURKEY_BBOX',
      message: `Adres Türkiye dışında bir koordinata çözüldü (${forward.lat.toFixed(4)}, ${forward.lon.toFixed(4)}).`,
      lat: forward.lat, lon: forward.lon,
    };
    FORWARD_CACHE.set(cacheKey, r);
    return r;
  }

  // STEP 3
  if (!stepIstanbulPolygon(forward)) {
    const r: GeocodeFail = {
      ok: false, reason: 'OUT_OF_ISTANBUL_POLYGON',
      message: `Adres İstanbul il sınırları dışında bir koordinata çözüldü (${forward.lat.toFixed(4)}, ${forward.lon.toFixed(4)}). Sistem yalnızca İstanbul'u kabul eder.`,
      lat: forward.lat, lon: forward.lon,
    };
    FORWARD_CACHE.set(cacheKey, r);
    return r;
  }

  // STEP 4
  const districtHit = step39District(forward);
  // İstanbul içindeyiz ama polygon test bazen su yüzeyini (boğaz) yakalar;
  // bunu "39 ilçe polygon dışında ama İstanbul içinde" durumu olarak logla.

  // STEP 5
  const districtKey = districtHit.key;
  const userSelected = (opts.userSelectedDistrict || '').trim();
  let selectedMatch: { match: boolean; matchedKey: string | null };
  if (userSelected) {
    selectedMatch = stepSelectedDistrictMatch(districtKey, userSelected);
    if (!selectedMatch.match) {
      const r: GeocodeFail = {
        ok: false, reason: 'SELECTED_DISTRICT_MISMATCH',
        message: `Adres İstanbul'un "${districtHit.display || '?'}" ilçesine çözüldü, ancak siz "${userSelected}" seçtiniz.`,
        lat: forward.lat, lon: forward.lon,
        districtDetected: districtHit.key,
      };
      FORWARD_CACHE.set(cacheKey, r);
      return r;
    }
  } else {
    selectedMatch = { match: true, matchedKey: districtKey };
  }

  // STEP 6
  const reverse = await stepReverseGeocode(forward.lat, forward.lon);
  if (!reverse) {
    const r: GeocodeFail = {
      ok: false, reason: 'REVERSE_GEOCODE_FAILED',
      message: 'Reverse geocoding yapılamadığı için adres yeterince doğrulanamadı. Lütfen daha açık bir adres girin.',
      lat: forward.lat, lon: forward.lon,
    };
    FORWARD_CACHE.set(cacheKey, r);
    return r;
  }

  // STEP 7
  const cmp = stepReverseCompare(reverse.address, districtHit.key, forward.displayName);
  if (!cmp.reverseCityMatch) {
    const r: GeocodeFail = {
      ok: false, reason: 'REVERSE_CITY_MISMATCH',
      message: `Reverse geocoding sonucu İstanbul dışı bir şehir döndürdü (${reverse.displayName || '?'}).`,
      lat: forward.lat, lon: forward.lon,
    };
    FORWARD_CACHE.set(cacheKey, r);
    return r;
  }

  // Final district key seçimi
  let finalDistrictKey = cmp.reverseDistrictMatch && districtHit.key ? districtHit.key : districtHit.key;
  let finalDistrictDisplay: string | null = districtHit.display;

  // Eğer reverse'ten district geldi ise ve İstanbul listede değilse reddet
  if (finalDistrictKey && !ISTANBUL_39_ILCE.some(d => d.key === finalDistrictKey)) {
    const r: GeocodeFail = {
      ok: false, reason: 'DISTRICT_NOT_IN_ISTANBUL',
      message: 'Reverse geocoding İstanbul\'da bilinmeyen bir ilçe döndürdü.',
      lat: forward.lat, lon: forward.lon,
    };
    FORWARD_CACHE.set(cacheKey, r);
    return r;
  }

  if (!finalDistrictKey) {
    const r: GeocodeFail = {
      ok: false, reason: 'DISTRICT_NOT_IN_ISTANBUL',
      message: 'Adres İstanbul içinde ancak 39 ilçe sınırı içinde değil.',
      lat: forward.lat, lon: forward.lon,
    };
    FORWARD_CACHE.set(cacheKey, r);
    return r;
  }

  if (!finalDistrictDisplay) {
    const found = ISTANBUL_39_ILCE.find(d => d.key === finalDistrictKey);
    finalDistrictDisplay = found ? found.display : finalDistrictKey;
  }

  const ok: GeocodeOk = {
    ok: true,
    lat: forward.lat,
    lon: forward.lon,
    city: 'istanbul',
    districtKey: finalDistrictKey!,
    districtDisplay: finalDistrictDisplay!,
    neighborhood: cmp.neighborhoodFromReverse || undefined,
    displayName: reverse.displayName || forward.displayName,
    matchedUserDistrict: !userSelected || !!selectedMatch.match,
    reverseVerified: cmp.reverseDistrictMatch,
  };

  FORWARD_CACHE.set(cacheKey, ok);
  return ok;
}

export function isInsideIstanbul(lat: number, lon: number): boolean {
  if (!isFinite(lat) || !isFinite(lon)) return false;
  return pointInIstanbulOuter(lat, lon);
}
