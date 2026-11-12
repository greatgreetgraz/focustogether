import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { trackEvent } from '../lib/analytics'
import type { RegionId } from '../lib/routes'
import { endTripDoc, startTripDoc, subscribeToActiveTrip } from '../lib/trips'
import type { Trip } from '../lib/types'

export interface TripState {
  /** The journey you chose, or null — journeys are always optional. */
  trip: Trip | null
  /** false until we know whether you're on a journey */
  ready: boolean
  startTrip: (p: { regionId: RegionId; goalMinutes: number; reversed: boolean }) => Promise<void>
  /** Leave the journey. */
  leaveTrip: () => Promise<void>
}

// Exported so screens can be rendered with fake data in tests.
export const TripContext = createContext<TripState | null>(null)

export function TripProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [trip, setTrip] = useState<Trip | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!uid) {
      setTrip(null)
      setReady(false)
      return
    }
    return subscribeToActiveTrip(
      uid,
      (t) => {
        setTrip(t)
        setReady(true)
      },
      (err) => {
        console.warn('Trip subscription failed', err)
        setReady(true) // the app works fine without a journey
      },
    )
  }, [uid])

  const startTrip = useCallback<TripState['startTrip']>(
    async ({ regionId, goalMinutes, reversed }) => {
      if (!uid) return
      await startTripDoc({ uid, regionId, goalMinutes, reversed, endingTripId: trip?.id ?? null })
      trackEvent('journey_start', { regionId, goalMinutes, reversed })
    },
    [uid, trip?.id],
  )

  const leaveTrip = useCallback(async () => {
    if (!trip) return
    await endTripDoc(trip.id)
    trackEvent('journey_leave', { regionId: trip.regionId, focusedMinutes: trip.focusedMinutes })
  }, [trip])

  const value = useMemo(
    () => ({ trip, ready, startTrip, leaveTrip }),
    [trip, ready, startTrip, leaveTrip],
  )
  return <TripContext.Provider value={value}>{children}</TripContext.Provider>
}

export function useTrip(): TripState {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTrip must be used inside <TripProvider>')
  return ctx
}
