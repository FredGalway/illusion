import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { App } from './app/App'

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

// ─── Boot app ─────────────────────────────────────────────────────────────
const app = new App(lenis, prefersReduced)
app.init()
