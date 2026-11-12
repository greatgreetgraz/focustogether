import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import type { FinishedStatus, SessionDoc } from './types'

const sessionsCol = () => collection(db, 'sessions')

/** Sessions that stay "active" this long past their planned end are treated as abandoned. */
const STALE_GRACE_MS = 3 * 60 * 60 * 1000

/** Max sessions loaded into History (newest first). */
const HISTORY_LIMIT = 300

/** Client-generated id, so the Focus screen can start without waiting for the network. */
export function newSessionId(): string {
  return doc(sessionsCol()).id
}

/** "YYYY-MM-DD" in the device's local time zone. */
export function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function createSessionDoc(p: {
  id: string
  uid: string
  task: string
  plannedMinutes: number
  startedAtMs: number
  tripId?: string | null
}) {
  return setDoc(doc(db, 'sessions', p.id), {
    uid: p.uid,
    task: p.task,
    plannedMinutes: p.plannedMinutes,
    actualMinutes: 0,
    startedAt: Timestamp.fromMillis(p.startedAtMs),
    endedAt: null,
    status: 'active',
    roomId: null, // week 2
    friendsActiveCount: 0, // week 2
    localDate: localDateKey(new Date(p.startedAtMs)),
    tripId: p.tripId ?? null, // the journey this session moves forward, if you chose one
  })
}

export function finishSessionDoc(p: {
  id: string
  status: FinishedStatus
  actualMinutes: number
  endedAtMs: number
}) {
  return updateDoc(doc(db, 'sessions', p.id), {
    status: p.status,
    actualMinutes: p.actualMinutes,
    endedAt: Timestamp.fromMillis(p.endedAtMs),
  })
}

function toSession(snap: QueryDocumentSnapshot): SessionDoc {
  const d = snap.data()
  const startedAt = (d.startedAt as Timestamp).toDate()
  return {
    id: snap.id,
    uid: d.uid,
    task: d.task ?? '',
    plannedMinutes: d.plannedMinutes,
    actualMinutes: d.actualMinutes ?? 0,
    startedAt,
    endedAt: d.endedAt ? (d.endedAt as Timestamp).toDate() : null,
    status: d.status,
    roomId: d.roomId ?? null,
    friendsActiveCount: d.friendsActiveCount ?? 0,
    localDate: d.localDate ?? localDateKey(startedAt),
    tripId: typeof d.tripId === 'string' ? d.tripId : null,
  }
}

/** Live list of the user's sessions, newest first. */
export function subscribeToSessions(
  uid: string,
  onData: (sessions: SessionDoc[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(
    sessionsCol(),
    where('uid', '==', uid),
    orderBy('startedAt', 'desc'),
    limit(HISTORY_LIMIT),
  )
  return onSnapshot(q, (snap) => onData(snap.docs.map(toSession)), onError)
}

/**
 * Tidy up sessions left "active" by a lost tab / cleared storage. Only sessions
 * well past their planned end are touched, so a session running on another
 * device is never closed by mistake. We can't know how long the user really
 * focused, so these are recorded as ended early with 0 minutes.
 */
export async function closeStaleActiveSessions(
  uid: string,
  keepId: string | null,
  nowMs = Date.now(),
): Promise<void> {
  const snap = await getDocs(
    query(sessionsCol(), where('uid', '==', uid), where('status', '==', 'active')),
  )
  const stale = snap.docs.filter((d) => {
    if (d.id === keepId) return false
    const s = toSession(d)
    return nowMs - s.startedAt.getTime() > s.plannedMinutes * 60_000 + STALE_GRACE_MS
  })
  await Promise.all(
    stale.map((d) =>
      finishSessionDoc({
        id: d.id,
        status: 'ended_early',
        actualMinutes: 0,
        endedAtMs: nowMs,
      }),
    ),
  )
}
