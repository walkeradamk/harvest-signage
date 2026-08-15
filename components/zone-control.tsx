"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const ZONES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R"] as const
type Zone = (typeof ZONES)[number]

export function ZoneControl() {
  const [supabase] = useState(() => createClient())
  const [currentZone, setCurrentZone] = useState<string | null>(null)
  const [pending, setPending] = useState<Zone | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load the current zone, then keep in sync if it changes elsewhere.
  useEffect(() => {
    let active = true

    supabase
      .from("zone_status")
      .select("current_zone")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (active && data?.current_zone) setCurrentZone(data.current_zone)
      })

    const channel = supabase
      .channel("zone_status_control")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "zone_status" },
        (payload) => {
          const next = (payload.new as { current_zone?: string })?.current_zone
          if (next) setCurrentZone(next)
        },
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [supabase])

  async function selectZone(zone: Zone) {
    if (pending) return
    setPending(zone)
    setError(null)
    setConfirmation(null)

    const { error: updateError } = await supabase
      .from("zone_status")
      .update({ current_zone: zone, updated_at: new Date().toISOString() })
      .eq("id", 1)

    if (updateError) {
      setError("Could not update the display. Please try again.")
      setPending(null)
      return
    }

    setCurrentZone(zone)
    setConfirmation(`TV displays updated to Zone ${zone}`)
    setPending(null)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center px-5 py-8">
      <header className="text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-primary text-balance sm:text-4xl">
          House of the Harvest
        </h1>
        <p className="mt-1 text-lg font-medium text-muted-foreground sm:text-xl">Zone Control</p>
      </header>

      <div className="mt-8 w-full rounded-2xl border border-border bg-card px-6 py-6 text-center shadow-sm">
        <p className="font-serif text-3xl font-bold text-card-foreground text-balance sm:text-4xl">
          Currently Serving: Zone <span className="text-primary">{currentZone ?? "…"}</span>
        </p>
      </div>

      <div className="mt-8 grid w-full grid-cols-2 gap-4">
        {ZONES.map((zone) => {
          const isActive = currentZone === zone
          const isPending = pending === zone
          return (
            <button
              key={zone}
              type="button"
              onClick={() => selectZone(zone)}
              disabled={pending !== null}
              aria-pressed={isActive}
              className={[
                "flex aspect-square items-center justify-center rounded-2xl border-2 font-serif text-5xl font-bold transition-all duration-150 select-none sm:text-6xl",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/60",
                "disabled:cursor-not-allowed active:scale-[0.97]",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-lg"
                  : "border-border bg-secondary text-secondary-foreground hover:border-primary/60",
                isPending ? "opacity-70" : "",
              ].join(" ")}
            >
              <span className="flex flex-col items-center leading-none">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] opacity-70">Zone</span>
                <span className="mt-1">{zone}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-6 h-8 text-center" aria-live="polite">
        {confirmation && <p className="text-base font-medium text-primary">{confirmation}</p>}
        {error && <p className="text-base font-medium text-destructive">{error}</p>}
      </div>
    </main>
  )
}
