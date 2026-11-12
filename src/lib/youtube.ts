/**
 * Turn a YouTube link the user pasted into an embeddable player URL.
 * Accepts video and playlist links (youtube.com, music.youtube.com, youtu.be,
 * shorts, live). Anything else returns null, so only YouTube is ever embedded.
 * The privacy-friendly youtube-nocookie.com domain is used.
 */

const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
])

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const LIST_ID = /^[A-Za-z0-9_-]{10,64}$/

export interface YouTubeEmbed {
  kind: 'video' | 'playlist'
  src: string
}

export function parseYouTube(input: string): YouTubeEmbed | null {
  const raw = input.trim()
  if (!raw) return null
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.toLowerCase()
  if (!HOSTS.has(host)) return null

  let video: string | null = null
  const parts = url.pathname.split('/').filter(Boolean)
  if (host.endsWith('youtu.be')) {
    video = parts[0] ?? null
  } else if (parts[0] === 'watch') {
    video = url.searchParams.get('v')
  } else if (parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'embed') {
    video = parts[1] ?? null
  }
  if (video && !VIDEO_ID.test(video)) video = null

  const listParam = url.searchParams.get('list')
  const list = listParam && LIST_ID.test(listParam) ? listParam : null

  const base = 'https://www.youtube-nocookie.com/embed'
  const common = 'rel=0&playsinline=1'
  if (video && list) {
    return { kind: 'playlist', src: `${base}/${video}?list=${list}&${common}` }
  }
  if (video) return { kind: 'video', src: `${base}/${video}?${common}` }
  if (list) return { kind: 'playlist', src: `${base}/videoseries?list=${list}&${common}` }
  return null
}
