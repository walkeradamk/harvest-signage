'use client'

import { useEffect, useState } from 'react'
import { Wheat } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type ConnectionState = 'connecting' | 'live' | 'error'

export function SignageDisplay() {
  const [zone, setZone] = useState<string | null>(null)
  const [status, setStatus] = useState<ConnectionState>('connecting')

  useEffect(() => {
    const supabase = createClient()
    let active = true

    async function loadInitial() {
      const { data, error } = await supabase
        .from('zone_status')
        .select('current_zone')
        .eq('id', 1)
        .single()

      if (!active) return

      if (error) {
        console.log('[v0] initial zone fetch error:', error.message)
        setStatus('error')
        return
      }

      setZone(data?.current_zone ?? null)
      setStatus('live')
    }

    loadInitial()

    // Subscribe to realtime changes so TVs update without a refresh.
    const channel = supabase
      .channel('zone_status_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'zone_status' },
        (payload) => {
          const next = (payload.new as { current_zone?: string } | null)
            ?.current_zone
          if (next) {
            console.log('[v0] realtime zone update:', next)
            setZone(next)
            setStatus('live')
          }
        },
      )
      .subscribe((state) => {
        console.log('[v0] realtime channel state:', state)
      })

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden px-8 py-10 text-center">
      {/* Brand header */}
      <header className="flex items-center gap-4">
        <Wheat className="size-9 text-primary md:size-11" aria-hidden="true" />
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
          House of the Harvest
        </h1>
      </header>

      {/* Center: now serving */}
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <p className="font-sans text-2xl font-medium uppercase tracking-[0.35em] text-muted-foreground md:text-4xl">
          Now Serving
        </p>

        <div className="flex flex-col items-center leading-none">
          <span className="mt-2 font-serif text-[9rem] font-semibold uppercase tracking-widest text-muted-foreground md:text-[12vw]">
            Zone
          </span>
          <span
            aria-live="polite"
            className="font-serif font-bold uppercase text-primary drop-shadow-sm"
            style={{ fontSize: 'min(60vh, 55vw)', lineHeight: 0.85 }}
          >
            {zone ?? '—'}
          </span>
        </div>
      </div>

      {/* Footer / status */}
      <footer className="flex items-center gap-3 text-muted-foreground">
        <span
          className={`size-3 rounded-full ${
            status === 'live'
              ? 'bg-primary'
              : status === 'error'
                ? 'bg-destructive'
                : 'bg-muted-foreground animate-pulse'
          }`}
          aria-hidden="true"
        />
        <span className="font-sans text-base uppercase tracking-widest md:text-lg">
          {status === 'live'
            ? 'Live'
            : status === 'error'
              ? 'Reconnecting'
              : 'Connecting'}
        </span>
      </footer>
    </main>
  )
}
