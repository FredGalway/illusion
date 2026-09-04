import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { App } from './app/App'

// Silence legacy third-party deprecation warnings (e.g. three-bvh-csg maxLeafSize)
const _origWarn = console.warn
console.warn = function (...args: any[]) {
  if (typeof args[0] === 'string' && args[0].includes('maxLeafSize')) return
  _origWarn.apply(console, args)
}

gsap.registerPlugin(ScrollTrigger)

// ─── Reduced-motion check ──────────────────────────────────────────────────
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ─── Lenis smooth scroll ───────────────────────────────────────────────────
let lenis: Lenis | null = null

if (!prefersReduced) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 })

  // Drive Lenis with GSAP ticker (synced to rAF, no duplicate loops)
  gsap.ticker.add((t: number) => lenis!.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)

  lenis.on('scroll', ScrollTrigger.update)
}

import { i18n } from './i18n/i18nEngine'

// Boot i18n immediately so preloader & initial texts are translated upon load
i18n.init().catch(console.error)

// ─── Boot app ─────────────────────────────────────────────────────────────
const app = new App(lenis, prefersReduced)
app.init()
