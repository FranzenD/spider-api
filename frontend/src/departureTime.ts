const stockholmClock = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

export function parseDepartureTime(value: string): number {
  const local = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2})(?:\.(\d+))?)?$/.exec(value)
  if (!local) return Date.parse(value)

  const wallTime = `${local[1]}:${local[2] ?? '00'}`
  // Test Swedish summer and standard time. Prefer the first occurrence of a repeated hour.
  for (const offset of ['+02:00', '+01:00']) {
    const instant = Date.parse(`${wallTime}.${(local[3] ?? '').padEnd(3, '0').slice(0, 3)}${offset}`)
    if (Number.isFinite(instant) && stockholmClock.format(instant).replace(' ', 'T') === wallTime) {
      return instant
    }
  }
  return NaN
}
