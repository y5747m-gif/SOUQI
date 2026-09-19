'use strict';

// The rectangle is an initial query envelope, NOT an administrative boundary.
// Every result must also have Egyptian country + an allowed admin level 1.
const BOUNDS = { south: 27.0, north: 30.6, west: 27.0, east: 32.7 };
const MESSAGES = {
  INVALID_INPUT: 'بيانات البحث غير صحيحة. النطاق المسموح من 300 متر إلى 25 كم.',
  OUTSIDE_SERVICE_AREA: 'سوقي يعمل حاليًا داخل القاهرة والجيزة فقط. اختر منطقة داخل النطاق.',
  PLACES_NOT_CONFIGURED: 'البحث غير مفعّل بعد. يحتاج الخادم إلى مفتاح Google Places.',
  PLACES_UNAVAILABLE: 'تعذّر الاتصال بـ Google Places. حاول مرة أخرى لاحقًا.',
  PLACES_TIMEOUT: 'استغرق البحث وقتًا طويلًا. حاول مرة أخرى.',
  RATE_LIMITED: 'طلبات كثيرة حاليًا. انتظر دقيقة ثم حاول مرة أخرى.',
  FORBIDDEN: 'مصدر الطلب غير مسموح.',
  NOT_FOUND: 'المسار غير موجود.',
  METHOD_NOT_ALLOWED: 'طريقة الطلب غير مسموحة.',
  PAYLOAD_TOO_LARGE: 'حجم الطلب أكبر من المسموح.',
  UNSUPPORTED_MEDIA_TYPE: 'يجب إرسال الطلب بصيغة JSON.'
};
class ApiError extends Error {
  constructor(status, code) { super(MESSAGES[code]); this.status = status; this.code = code; }
}
const norm = value => String(value || '').normalize('NFKC').toLowerCase()
  .replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ').trim();
const PROVINCES = new Map([
  ...['القاهرة', 'محافظة القاهرة', 'Cairo', 'Cairo Governorate', 'Al Qahirah', 'EG-C'].map(v => [norm(v), 'القاهرة']),
  ...['الجيزة', 'محافظة الجيزة', 'Giza', 'Giza Governorate', 'Al Jizah', 'EG-GZ'].map(v => [norm(v), 'الجيزة'])
]);
function provinceOf(place) {
  const components = place.addressComponents;
  if (!Array.isArray(components)) return null;
  const country = components.find(c => c.types?.includes('country'));
  if (country?.shortText !== 'EG') return null;
  const admin = components.find(c => c.types?.includes('administrative_area_level_1'));
  return admin && (PROVINCES.get(norm(admin.longText)) || PROVINCES.get(norm(admin.shortText))) || null;
}
function inBounds(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= BOUNDS.south && lat <= BOUNDS.north && lon >= BOUNDS.west && lon <= BOUNDS.east;
}
function distanceKm(lat, lon, lat2, lon2) {
  const rad = n => n * Math.PI / 180;
  const a = Math.sin(rad(lat2 - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}
function objectInput(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) throw new ApiError(400, 'INVALID_INPUT');
}
function textInput(value, required = false) {
  if (typeof value !== 'string' || value.length > 120 || /[\x00-\x1f\x7f]/.test(value) || (required && value.trim().length < 2)) throw new ApiError(400, 'INVALID_INPUT');
  return value.trim();
}
function validateSearch(input) {
  objectInput(input, ['lat', 'lon', 'radiusKm', 'keyword']);
  const { lat, lon, radiusKm = 3 } = input;
  if (![lat, lon, radiusKm].every(Number.isFinite) || radiusKm < 0.3 || radiusKm > 25) throw new ApiError(400, 'INVALID_INPUT');
  if (!inBounds(lat, lon)) throw new ApiError(422, 'OUTSIDE_SERVICE_AREA');
  return { lat, lon, radiusKm, keyword: textInput(input.keyword ?? '') };
}
const TYPE_CATS = {
  supermarket: 'supermarket', grocery_store: 'supermarket', convenience_store: 'supermarket',
  pharmacy: 'pharmacy', drugstore: 'pharmacy', electronics_store: 'electronics',
  cell_phone_store: 'mobile', clothing_store: 'clothing', shoe_store: 'shoes',
  book_store: 'books', hardware_store: 'tools', home_improvement_store: 'tools',
  furniture_store: 'home', home_goods_store: 'home', pet_store: 'home', florist: 'home',
  sporting_goods_store: 'sports', bicycle_store: 'sports', car_dealer: 'auto', car_repair: 'auto',
  car_wash: 'auto', gas_station: 'auto', beauty_salon: 'beauty', hair_salon: 'beauty',
  restaurant: 'restaurant', cafe: 'restaurant', bakery: 'restaurant', meal_takeaway: 'restaurant'
};
const NEARBY_TYPES = ['store', 'supermarket', 'pharmacy', 'restaurant', 'cafe', 'bakery', 'car_repair', 'car_wash', 'gas_station', 'beauty_salon'];
const FIELDS = ['id', 'displayName', 'location', 'addressComponents', 'formattedAddress', 'primaryType', 'types', 'primaryTypeDisplayName', 'googleMapsUri', 'nationalPhoneNumber', 'websiteUri', 'currentOpeningHours', 'businessStatus', 'attributions'];
const AREA_FIELDS = ['id', 'displayName', 'location', 'addressComponents', 'formattedAddress'];
function safeUrl(value) {
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
}
function normalizePlace(p, center) {
  const city = provinceOf(p), lat = p.location?.latitude, lon = p.location?.longitude;
  if (!city || !inBounds(lat, lon) || typeof p.id !== 'string' || !/^[\w-]{1,200}$/.test(p.id)) return null;
  if (p.businessStatus === 'CLOSED_PERMANENTLY') return null;
  const types = Array.isArray(p.types) ? p.types : [];
  if (!types.some(t => t === 'store' || TYPE_CATS[t])) return null;
  const distKm = distanceKm(center.lat, center.lon, lat, lon);
  if (distKm > center.radiusKm) return null;
  const cat = TYPE_CATS[p.primaryType] || types.map(t => TYPE_CATS[t]).find(Boolean) || 'other';
  const hours = p.currentOpeningHours;
  return {
    id: 'google-' + p.id, placeId: p.id, source: 'google', real: true,
    name: p.displayName?.text || 'محل بدون اسم مسجّل', lat, lon, city, area: '',
    address: p.formattedAddress || '', cat, cats: [cat], catAr: p.primaryTypeDisplayName?.text || 'متجر',
    phone: p.nationalPhoneNumber || '', website: safeUrl(p.websiteUri),
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}&query_place_id=${encodeURIComponent(p.id)}`,
    hoursRaw: Array.isArray(hours?.weekdayDescriptions) ? hours.weekdayDescriptions.join(' · ') : '',
    openNow: p.businessStatus === 'CLOSED_TEMPORARILY' ? false : typeof hours?.openNow === 'boolean' ? hours.openNow : null,
    distKm,
    attributions: (Array.isArray(p.attributions) ? p.attributions : []).map(a => ({ name: String(a.provider || ''), url: safeUrl(a.providerUri) }))
  };
}
function createPlaces({ apiKey, fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  async function request(method, body, fields) {
    if (!apiKey) throw new ApiError(503, 'PLACES_NOT_CONFIGURED');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Fixed upstream and field masks: callers cannot forward arbitrary URLs/fields.
      const response = await fetchImpl(`https://places.googleapis.com/v1/places:${method}`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': fields.map(f => 'places.' + f).join(',') },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 502, response.status === 429 ? 'RATE_LIMITED' : 'PLACES_UNAVAILABLE');
      const data = await response.json();
      if (!data || (data.places !== undefined && !Array.isArray(data.places))) throw new ApiError(502, 'PLACES_UNAVAILABLE');
      return data.places || [];
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(controller.signal.aborted ? 504 : 502, controller.signal.aborted ? 'PLACES_TIMEOUT' : 'PLACES_UNAVAILABLE');
    } finally { clearTimeout(timer); }
  }
  return {
    async search(input) {
      const center = validateSearch(input);
      const { lat, lon, radiusKm, keyword } = center;
      let places;
      if (keyword) {
        const dy = radiusKm / 110.57, dx = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));
        places = await request('searchText', {
          textQuery: keyword, languageCode: 'ar', regionCode: 'EG', pageSize: 20,
          locationRestriction: { rectangle: {
            low: { latitude: Math.max(BOUNDS.south, lat - dy), longitude: Math.max(BOUNDS.west, lon - dx) },
            high: { latitude: Math.min(BOUNDS.north, lat + dy), longitude: Math.min(BOUNDS.east, lon + dx) }
          } }
        }, FIELDS);
      } else {
        places = await request('searchNearby', {
          languageCode: 'ar', regionCode: 'EG', maxResultCount: 20, rankPreference: 'DISTANCE',
          includedTypes: NEARBY_TYPES,
          locationRestriction: { circle: { center: { latitude: lat, longitude: lon }, radius: radiusKm * 1000 } }
        }, FIELDS);
      }
      const items = places.map(p => normalizePlace(p, center)).filter(Boolean);
      const unique = [...new Map(items.map(p => [p.placeId, p])).values()].sort((a, b) => a.distKm - b.distKm);
      return { items: unique, source: 'Google Maps', limit: 20, scope: ['القاهرة', 'الجيزة'] };
    },
    async area(input) {
      objectInput(input, ['q']);
      const q = textInput(input.q, true);
      const places = await request('searchText', {
        textQuery: q, languageCode: 'ar', regionCode: 'EG', pageSize: 10,
        locationRestriction: { rectangle: { low: { latitude: BOUNDS.south, longitude: BOUNDS.west }, high: { latitude: BOUNDS.north, longitude: BOUNDS.east } } }
      }, AREA_FIELDS);
      const p = places.find(p => provinceOf(p) && inBounds(p.location?.latitude, p.location?.longitude));
      if (!p) throw new ApiError(422, 'OUTSIDE_SERVICE_AREA');
      return { lat: p.location.latitude, lon: p.location.longitude, where: p.formattedAddress || p.displayName?.text || provinceOf(p) };
    }
  };
}
module.exports = { ApiError, BOUNDS, createPlaces, provinceOf, normalizePlace, validateSearch, inBounds };
