import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import TimerFace from '../components/TimerFace'
import ToggleRow from '../components/ToggleRow'
import { notifySupport, previewChime, requestNotifyPermission, unlockAudio } from '../lib/alerts'
import { parseYouTube } from '../lib/youtube'
import { updateSettings, useSettings, type TimerStyle } from '../lib/settings'

export default function Settings() {
  const { t } = useTranslation()
  const settings = useSettings()
  // Re-render after the permission prompt resolves.
  const [, setTick] = useState(0)
  const support = notifySupport()
  const [chime, setChime] = useState<'idle' | 'playing' | 'blocked' | 'unsupported'>('idle')
  const [triedChime, setTriedChime] = useState(false)

  async function tryChime() {
    setTriedChime(true)
    setChime('playing')
    const result = await previewChime()
    if (result === 'ok') window.setTimeout(() => setChime('idle'), 2200)
    else setChime(result)
  }

  async function toggleNotify(next: boolean) {
    if (!next) {
      updateSettings({ notify: false })
      return
    }
    const result = await requestNotifyPermission()
    updateSettings({ notify: result === 'granted' })
    setTick((n) => n + 1)
  }

  const notifyHelp =
    support === 'unsupported'
      ? t('settings.notifyUnsupported')
      : support === 'denied'
        ? t('settings.notifyDenied')
        : t('settings.notifyHelp')

  const [draft, setDraft] = useState(settings.musicUrl)
  const parsed = parseYouTube(draft)
  const musicInvalid = draft.trim() !== '' && !parsed

  function changeMusic(v: string) {
    setDraft(v)
    // Only a valid link (or an empty box) is saved.
    if (v.trim() === '') updateSettings({ musicUrl: '' })
    else if (parseYouTube(v)) updateSettings({ musicUrl: v.trim().slice(0, 300) })
  }

  const styles: { id: TimerStyle; label: string }[] = [
    { id: 'ring', label: t('settings.styleRing') },
    { id: 'disc', label: t('settings.styleDisc') },
  ]

  return (
    <section className="flex flex-col gap-6 pt-2">
      <h1 className="text-3xl font-extrabold tracking-tight">{t('settings.title')}</h1>

      <div className="flex flex-col gap-3">
        <h2 className="px-1 font-bold text-muted">{t('settings.whenDone')}</h2>
        <ToggleRow
          checked={settings.sound}
          onChange={(v) => {
            unlockAudio()
            updateSettings({ sound: v })
          }}
          title={t('settings.soundTitle')}
          help={t('settings.soundHelp')}
        >
          <button
            type="button"
            onClick={() => void tryChime()}
            disabled={chime === 'playing'}
            className="mt-3 min-h-11 rounded-xl border-2 border-field px-4 text-sm font-bold hover:bg-surface-2 disabled:opacity-70"
          >
            {chime === 'playing' ? t('settings.playing') : t('settings.tryChime')}
          </button>
          {(chime === 'blocked' || chime === 'unsupported') && (
            <p role="alert" className="mt-3 rounded-xl bg-warm px-3 py-2 text-sm text-warm-ink">
              {t(chime === 'blocked' ? 'settings.chimeBlocked' : 'settings.chimeUnsupported')}
            </p>
          )}
          {triedChime && chime !== 'blocked' && chime !== 'unsupported' && (
            <p className="mt-3 text-sm text-muted" role="status">
              {t('settings.chimeHint')}
            </p>
          )}
        </ToggleRow>
        <ToggleRow
          checked={settings.notify && support === 'granted'}
          onChange={(v) => void toggleNotify(v)}
          disabled={support === 'unsupported' || support === 'denied'}
          title={t('settings.notifyTitle')}
          help={notifyHelp}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="px-1 font-bold text-muted">{t('settings.timerSection')}</h2>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="font-bold" id="style-label">
            {t('settings.styleTitle')}
          </p>
          <div role="radiogroup" aria-labelledby="style-label" className="mt-3 grid grid-cols-2 gap-3">
            {styles.map((s) => {
              const selected = settings.timerStyle === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => updateSettings({ timerStyle: s.id })}
                  className={`flex min-h-14 flex-col items-center gap-2 rounded-2xl border-2 p-3 font-bold transition-colors ${
                    selected ? 'border-primary bg-primary-soft' : 'border-field bg-surface'
                  }`}
                >
                  <span className="block w-24">
                    <TimerFace
                      ratio={0.7}
                      style={s.id}
                      hideDigits
                      clock="--:--"
                      subLabel=""
                      compact
                    />
                  </span>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        <ToggleRow
          checked={settings.hideDigits}
          onChange={(v) => updateSettings({ hideDigits: v })}
          title={t('settings.hideDigitsTitle')}
          help={t('settings.hideDigitsHelp')}
        />
        <ToggleRow
          checked={settings.showJourney}
          onChange={(v) => updateSettings({ showJourney: v })}
          title={t('settings.showJourneyTitle')}
          help={t('settings.showJourneyHelp')}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="px-1 font-bold text-muted">{t('music.title')}</h2>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-sm text-muted">{t('music.help')}</p>
          <label htmlFor="music-url" className="mt-3 block text-sm font-bold">
            {t('music.label')}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="music-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              value={draft}
              onChange={(e) => changeMusic(e.target.value)}
              placeholder={t('music.placeholder')}
              aria-invalid={musicInvalid}
              className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-field bg-bg px-3 text-base"
            />
            {draft && (
              <button
                type="button"
                onClick={() => changeMusic('')}
                className="min-h-12 rounded-xl border-2 border-field px-4 text-sm font-bold hover:bg-surface-2"
              >
                {t('music.clear')}
              </button>
            )}
          </div>
          {musicInvalid && (
            <p role="alert" className="mt-3 rounded-xl bg-warm px-3 py-2 text-sm text-warm-ink">
              {t('music.invalid')}
            </p>
          )}
          {parsed && (
            <p role="status" className="mt-3 text-sm text-muted">
              {t(parsed.kind === 'playlist' ? 'music.ok_playlist' : 'music.ok_video')}
            </p>
          )}
          <p className="mt-3 text-xs text-muted">{t('music.note')}</p>
        </div>
      </div>
    </section>
  )
}
