/**
 * The journey theme: each region of Thailand is an *imagined* train line from
 * its top to its bottom. Distances are a rough vibe, not a timetable — they
 * only decide how far apart the stations feel.
 *
 * Speed is set by the trip's focus goal: km per focus minute = route km / goal
 * minutes (e.g. 600 km with a 120-minute goal = 5 km per minute). Every focused
 * minute, from any session, moves the train forward; stopping early just means
 * the train is somewhere between two stations.
 */

export type RegionId = 'north' | 'northeast' | 'central' | 'east' | 'west' | 'south'

export interface Stop {
  th: string
  en: string
  /** distance from the first stop */
  km: number
}

export interface Region {
  id: RegionId
  th: string
  en: string
  stops: Stop[]
}

const s = (th: string, en: string, km: number): Stop => ({ th, en, km })

export const REGIONS: Region[] = [
  {
    id: 'north',
    th: 'ภาคเหนือ',
    en: 'The North',
    stops: [
      s('แม่สาย', 'Mae Sai', 0),
      s('เชียงราย', 'Chiang Rai', 60),
      s('เชียงใหม่', 'Chiang Mai', 250),
      s('ลำพูน', 'Lamphun', 275),
      s('ลำปาง', 'Lampang', 350),
      s('แพร่', 'Phrae', 465),
      s('อุตรดิตถ์', 'Uttaradit', 535),
      s('พิษณุโลก', 'Phitsanulok', 645),
      s('พิจิตร', 'Phichit', 705),
      s('นครสวรรค์', 'Nakhon Sawan', 820),
    ],
  },
  {
    id: 'northeast',
    th: 'ภาคอีสาน',
    en: 'Isan',
    stops: [
      s('หนองคาย', 'Nong Khai', 0),
      s('อุดรธานี', 'Udon Thani', 55),
      s('ขอนแก่น', 'Khon Kaen', 170),
      s('มหาสารคาม', 'Maha Sarakham', 245),
      s('ร้อยเอ็ด', 'Roi Et', 290),
      s('บุรีรัมย์', 'Buriram', 400),
      s('สุรินทร์', 'Surin', 450),
      s('ศรีสะเกษ', 'Sisaket', 550),
      s('อุบลราชธานี', 'Ubon Ratchathani', 610),
    ],
  },
  {
    id: 'central',
    th: 'ภาคกลาง',
    en: 'Central',
    stops: [
      s('นครสวรรค์', 'Nakhon Sawan', 0),
      s('ชัยนาท', 'Chai Nat', 60),
      s('สิงห์บุรี', 'Sing Buri', 110),
      s('อ่างทอง', 'Ang Thong', 145),
      s('อยุธยา', 'Ayutthaya', 185),
      s('ปทุมธานี', 'Pathum Thani', 225),
      s('กรุงเทพฯ', 'Bangkok', 255),
      s('สมุทรสาคร', 'Samut Sakhon', 290),
      s('สมุทรสงคราม', 'Samut Songkhram', 320),
    ],
  },
  {
    id: 'east',
    th: 'ภาคตะวันออก',
    en: 'The East',
    stops: [
      s('ปราจีนบุรี', 'Prachin Buri', 0),
      s('ฉะเชิงเทรา', 'Chachoengsao', 70),
      s('ชลบุรี', 'Chon Buri', 130),
      s('พัทยา', 'Pattaya', 180),
      s('ระยอง', 'Rayong', 245),
      s('จันทบุรี', 'Chanthaburi', 355),
      s('ตราด', 'Trat', 425),
    ],
  },
  {
    id: 'west',
    th: 'ภาคตะวันตก',
    en: 'The West',
    stops: [
      s('ตาก', 'Tak', 0),
      s('อุทัยธานี', 'Uthai Thani', 230),
      s('สุพรรณบุรี', 'Suphan Buri', 340),
      s('กาญจนบุรี', 'Kanchanaburi', 430),
      s('ราชบุรี', 'Ratchaburi', 500),
      s('เพชรบุรี', 'Phetchaburi', 555),
      s('หัวหิน', 'Hua Hin', 620),
      s('ประจวบคีรีขันธ์', 'Prachuap Khiri Khan', 710),
    ],
  },
  {
    id: 'south',
    th: 'ภาคใต้',
    en: 'The South',
    stops: [
      s('ชุมพร', 'Chumphon', 0),
      s('สุราษฎร์ธานี', 'Surat Thani', 190),
      s('นครศรีธรรมราช', 'Nakhon Si Thammarat', 320),
      s('พัทลุง', 'Phatthalung', 430),
      s('หาดใหญ่', 'Hat Yai', 520),
      s('ปัตตานี', 'Pattani', 620),
      s('ยะลา', 'Yala', 660),
      s('เบตง', 'Betong', 800),
    ],
  },
]

export const REGION_IDS = REGIONS.map((r) => r.id)

/** Default trip for a brand-new user: the North, 5 hours of focus. */
export const DEFAULT_REGION: RegionId = 'north'
export const DEFAULT_GOAL_MINUTES = 300
export const GOAL_PRESETS_MINUTES = [120, 300, 600]
export const MIN_GOAL_MINUTES = 30
export const MAX_GOAL_MINUTES = 6000

export function getRegion(id: RegionId): Region {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0]
}

/**
 * The route as actually travelled. `reversed` flips it (e.g. Betong → Chumphon);
 * distances are recomputed so km always counts up from the first stop.
 */
export function getRoute(id: RegionId, reversed = false): Region {
  const r = getRegion(id)
  if (!reversed) return r
  const total = routeKm(r)
  return {
    ...r,
    stops: [...r.stops].reverse().map((st) => ({ ...st, km: total - st.km })),
  }
}

export function isRegionId(v: unknown): v is RegionId {
  return typeof v === 'string' && (REGION_IDS as string[]).includes(v)
}

/** The region after this one (wraps around), for "next journey" suggestions. */
export function nextRegion(id: RegionId): RegionId {
  const i = REGION_IDS.indexOf(id)
  return REGION_IDS[(i + 1) % REGION_IDS.length]
}

export function routeKm(region: Region): number {
  return region.stops[region.stops.length - 1].km
}

export function kmPerMinute(region: Region, goalMinutes: number): number {
  return routeKm(region) / goalMinutes
}

export function stopName(stop: Stop, lang: string): string {
  return lang === 'en' ? stop.en : stop.th
}

export function regionName(region: Region, lang: string): string {
  return lang === 'en' ? region.en : region.th
}

export interface Position {
  /** 0–1 along the whole route */
  fraction: number
  km: number
  /** index of the last stop reached (0 = the start) */
  passedIndex: number
  prev: Stop
  /** null once the final stop is reached */
  next: Stop | null
  /** 0–1 between prev and next */
  segmentFraction: number
  arrived: boolean
}

/** Where the train is after `focusedMinutes` of a trip with goal `goalMinutes`. */
export function positionAt(region: Region, focusedMinutes: number, goalMinutes: number): Position {
  const fraction = Math.min(1, Math.max(0, focusedMinutes / goalMinutes))
  const total = routeKm(region)
  const km = fraction * total
  const stops = region.stops
  let i = 0
  while (i < stops.length - 1 && stops[i + 1].km <= km + 1e-9) i++
  const arrived = fraction >= 1 - 1e-9
  const next = i < stops.length - 1 ? stops[i + 1] : null
  // At the final stop there is no next segment, so no progress "towards" anything.
  const segmentFraction = next ? (km - stops[i].km) / (next.km - stops[i].km) : 0
  return { fraction, km, passedIndex: i, prev: stops[i], next, segmentFraction, arrived }
}

/** Focus minutes still needed to reach the next stop. */
export function minutesToNext(region: Region, pos: Position, goalMinutes: number): number {
  if (!pos.next) return 0
  return (pos.next.km - pos.km) / kmPerMinute(region, goalMinutes)
}
