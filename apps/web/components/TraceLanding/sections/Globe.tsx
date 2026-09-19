'use client'

import { useEffect, useRef } from 'react'
import { GlobeIcon } from '../icons'

function GlobeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const points: { lat: number; lon: number }[] = []
    for (let lat = -80; lat <= 80; lat += 10) {
      const lonStep = lat === 0 ? 6 : 10
      for (let lon = 0; lon < 360; lon += lonStep) points.push({ lat, lon })
    }

    let rotation = 0
    let raf = 0
    let running = true
    const render = () => {
      if (!running) return
      const radius = canvas.width * 0.42
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const projected = points.map((point) => {
        const lat = (point.lat * Math.PI) / 180
        const lon = ((point.lon + rotation) * Math.PI) / 180
        const x = radius * Math.cos(lat) * Math.sin(lon)
        const y = radius * Math.sin(lat)
        const z = radius * Math.cos(lat) * Math.cos(lon)
        return { px: canvas.width / 2 + x, py: canvas.height / 2 - y, z }
      })
      projected.sort((a, b) => a.z - b.z)
      for (const point of projected) {
        const depth = (point.z + radius) / (2 * radius)
        ctx.beginPath()
        ctx.arc(point.px, point.py, 1.5 + depth * 4.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(59, 130, 246, ${(0.12 + depth * 0.68).toFixed(3)})`
        ctx.fill()
      }
      rotation += 0.3
      raf = requestAnimationFrame(render)
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !running) {
        running = true
        raf = requestAnimationFrame(render)
      } else if (entry && !entry.isIntersecting && running) {
        running = false
        cancelAnimationFrame(raf)
      }
    })
    observer.observe(canvas)
    raf = requestAnimationFrame(render)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} width={1200} height={1200} className="h-full w-full" />
}

export function Globe() {
  return <section className="px-6 md:px-12 lg:px-20"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-white nice-shadow"><div className="grid md:grid-cols-2"><div className="flex flex-col justify-center gap-6 p-10 md:p-16"><div className="inline-flex items-center gap-2 self-start"><span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-neutral-50 px-3 py-1 text-sm font-medium text-black/70"><GlobeIcon size={14} className="text-brand-blue" />Открытые источники</span><span className="rounded-full bg-brand-blue/10 px-2.5 py-1 text-xs font-semibold text-brand-blue">TRACE</span></div><h2 className="text-3xl font-bold tracking-tight text-black md:text-4xl">Смотрите шире одного сайта</h2><p className="max-w-md text-base leading-relaxed text-black/60">TRACE связывает материалы из разных публичных источников, чтобы вы видели контекст университета, а не одну удачную фотографию.</p></div><div className="relative flex min-h-[360px] items-center justify-center bg-white md:min-h-[520px]"><div className="relative aspect-square w-full max-w-[560px]"><GlobeCanvas /></div><div className="pointer-events-none absolute inset-y-0 start-0 w-16 bg-gradient-to-r from-white to-transparent md:w-32" /><div className="pointer-events-none absolute inset-y-0 end-0 w-16 bg-gradient-to-l from-white to-transparent md:w-32" /><div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent md:h-32" /></div></div></div></section>
}
