import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  Timestamp,
  where,
  writeBatch,
  updateDoc,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { isRegionId, type RegionId } from './routes'
import type { Trip, TripStatus } from './types'

const tripsCol = () => collection(db, 'trips')

function toTrip(snap: QueryDocumentSnapshot): Trip | null {
  const d = snap.data()
  if (!isRegionId(d.regionId) || typeof d.goalMinutes !== 'number') return null
  return {
    id: snap.id,
    uid: d.uid,
    regionId: d.regionId,
    goalMinutes: d.goalMinutes,
    reversed: d.reversed === true,
    focusedMinutes: typeof d.focusedMinutes === 'number' ? d.focusedMinutes : 0,
    startedAt: (d.startedAt as Timestamp).toDate(),
    endedAt: d.endedAt ? (d.endedAt as Timestamp).toDate() : null,
    status: d.status as TripStatus,
  }
}

/** Live "the journey you're on" — the newest active trip, or null if you haven't chosen one. */
export function subscribeToActiveTrip(
  uid: string,
  onData: (trip: Trip | null) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(tripsCol(), where('uid', '==', uid), where('status', '==', 'active'))
  return onSnapshot(
    q,
    (snap) => {
      const trips = snap.docs
        .map(toTrip)
        .filter((t): t is Trip => t !== null)
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      onData(trips[0] ?? null)
    },
    onError,
  )
}

/**
 * Begin a new journey. If you're already on one it is ended where the train
 * is, in the same atomic write, so you never have two at once.
 */
export async function startTripDoc(p: {
  uid: string
  regionId: RegionId
  goalMinutes: number
  reversed: boolean
  endingTripId: string | null
}): Promise<string> {
  const batch = writeBatch(db)
  const now = Timestamp.now()
  if (p.endingTripId) {
    batch.update(doc(db, 'trips', p.endingTripId), { status: 'ended', endedAt: now })
  }
  const ref = doc(tripsCol())
  batch.set(ref, {
    uid: p.uid,
    regionId: p.regionId,
    goalMinutes: p.goalMinutes,
    reversed: p.reversed,
    focusedMinutes: 0,
    startedAt: now,
    endedAt: null,
    status: 'active',
  })
  await batch.commit()
  return ref.id
}

/** Leave the journey. Nothing is lost; the plain timer carries on. */
export function endTripDoc(id: string) {
  return updateDoc(doc(db, 'trips', id), { status: 'ended', endedAt: Timestamp.now() })
}

/** Add a finished session's minutes to its journey (and mark it arrived if that did it). */
export function addTripProgress(p: { id: string; minutes: number; arrived: boolean }) {
  return updateDoc(doc(db, 'trips', p.id), {
    focusedMinutes: increment(p.minutes),
    ...(p.arrived ? { status: 'arrived', endedAt: Timestamp.now() } : {}),
  })
}
