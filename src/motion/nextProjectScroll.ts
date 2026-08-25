// ─── Next Project Scroll-Through ────────────────────────────────────────────
// Lusion-style overscroll detection: when at the bottom and scrolling further,
// accumulate delta to fill a gauge (SVG circle on desktop, bar on mobile).
// Reaching the threshold triggers a page transition.

import { gsap } from 'gsap'

const THRESHOLD = 600
const DECAY_RATE = 0.4 // units/frame (~60fps)

interface ScrollState {
  accumulated: number
  isAtBottom: boolean
  rafId: number | null
  wheelHandler: ((e: WheelEvent) => void) | null
  touchState: { startY: number; lastY: number } | null
  touchStartHandler: ((e: TouchEvent) => void) | null
  touchMoveHandler: ((e: TouchEvent) => void) | null
  touchEndHandler: (() => void) | null
  gaugeCircle: SVGCircleElement | null
  gaugeBar: HTMLElement | null
  circumference: number
  onTransition: (() => void) | null
  destroyed: boolean
}

let state: ScrollState = createEmptyState()

function createEmptyState(): ScrollState {
  return {
    accumulated: 0,
    isAtBottom: false,
    rafId: null,
    wheelHandler: null,
    touchState: null,
    touchStartHandler: null,
    touchMoveHandler: null,
    touchEndHandler: null,
    gaugeCircle: null,
    gaugeBar: null,
    circumference: 0,
    onTransition: null,
    destroyed: true,
  }
}

function isDocumentAtBottom(): boolean {
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const scrollHeight = document.documentElement.scrollHeight
  const clientHeight = document.documentElement.clientHeight
  return scrollTop + clientHeight >= scrollHeight - 5
}

function updateGauge(progress: number): void {
  // Desktop: SVG circle
  if (state.gaugeCircle && state.circumference > 0) {
    const offset = state.circumference * (1 - progress)
    state.gaugeCircle.style.strokeDashoffset = `${offset}`
  }
  // Mobile: bar
  if (state.gaugeBar) {
    state.gaugeBar.style.transform = `scaleX(${progress})`
    state.gaugeBar.style.opacity = progress > 0.01 ? '1' : '0'
  }
}

function tick(): void {
  if (state.destroyed) return

  // Decay toward 0 when no input
  if (state.accumulated > 0) {
    state.accumulated = Math.max(0, state.accumulated - DECAY_RATE)
  }

  const progress = Math.min(1, state.accumulated / THRESHOLD)
  updateGauge(progress)

  // Trigger transition
  if (state.accumulated >= THRESHOLD && state.onTransition) {
    const cb = state.onTransition
    state.onTransition = null // prevent double-fire
    cb()
    return
  }

  state.rafId = requestAnimationFrame(tick)
}

export function initNextProjectScroll(
  nextSection: HTMLElement,
  onTransition: () => void
): void {
  destroyNextProjectScroll()

  state = createEmptyState()
  state.destroyed = false
  state.onTransition = onTransition

  // Find gauge elements
  state.gaugeCircle = nextSection.querySelector<SVGCircleElement>('.project__gauge-circle')
  state.gaugeBar = nextSection.querySelector<HTMLElement>('.project__gauge-bar')

  if (state.gaugeCircle) {
    const r = state.gaugeCircle.r.baseVal.value
    state.circumference = 2 * Math.PI * r
    state.gaugeCircle.style.strokeDasharray = `${state.circumference}`
    state.gaugeCircle.style.strokeDashoffset = `${state.circumference}`
  }

  // Desktop cursor-follow for gauge SVG
  const gaugeSvg = nextSection.querySelector<SVGElement>('.project__gauge-svg')
  if (gaugeSvg) {
    const moveHandler = (e: MouseEvent) => {
      gaugeSvg.style.left = `${e.clientX}px`
      gaugeSvg.style.top = `${e.clientY}px`
    }
    window.addEventListener('mousemove', moveHandler)
    // Store for cleanup
    ;(state as any)._mouseMoveHandler = moveHandler
  }

  // Wheel handler
  state.wheelHandler = (e: WheelEvent) => {
    if (!isDocumentAtBottom()) {
      // Not at bottom — reset accumulator
      if (state.accumulated > 0) state.accumulated = 0
      return
    }

    if (e.deltaY > 0) {
      // Scrolling down past the end
      state.accumulated += Math.abs(e.deltaY) * 0.5
    } else if (e.deltaY < 0) {
      // Reverse scroll drains gauge
      state.accumulated = Math.max(0, state.accumulated - Math.abs(e.deltaY) * 0.8)
    }
  }
  window.addEventListener('wheel', state.wheelHandler, { passive: true })

  // Touch handlers
  state.touchStartHandler = (e: TouchEvent) => {
    state.touchState = {
      startY: e.touches[0].clientY,
      lastY: e.touches[0].clientY,
    }
  }
  state.touchMoveHandler = (e: TouchEvent) => {
    if (!state.touchState) return
    if (!isDocumentAtBottom()) {
      state.touchState.lastY = e.touches[0].clientY
      if (state.accumulated > 0) state.accumulated = 0
      return
    }

    const deltaY = state.touchState.lastY - e.touches[0].clientY
    state.touchState.lastY = e.touches[0].clientY

    if (deltaY > 0) {
      state.accumulated += deltaY * 0.8
    } else {
      state.accumulated = Math.max(0, state.accumulated + deltaY * 1.2)
    }
  }
  state.touchEndHandler = () => {
    state.touchState = null
  }

  window.addEventListener('touchstart', state.touchStartHandler, { passive: true })
  window.addEventListener('touchmove', state.touchMoveHandler, { passive: true })
  window.addEventListener('touchend', state.touchEndHandler)

  // Start tick loop
  state.rafId = requestAnimationFrame(tick)
}

export function destroyNextProjectScroll(): void {
  state.destroyed = true

  if (state.rafId) {
    cancelAnimationFrame(state.rafId)
  }
  if (state.wheelHandler) {
    window.removeEventListener('wheel', state.wheelHandler)
  }
  if (state.touchStartHandler) {
    window.removeEventListener('touchstart', state.touchStartHandler)
  }
  if (state.touchMoveHandler) {
    window.removeEventListener('touchmove', state.touchMoveHandler)
  }
  if (state.touchEndHandler) {
    window.removeEventListener('touchend', state.touchEndHandler)
  }
  if ((state as any)._mouseMoveHandler) {
    window.removeEventListener('mousemove', (state as any)._mouseMoveHandler)
  }

  state = createEmptyState()
}

/** FLIP-style transition animation for the next project */
export function animateProjectTransition(
  nextSection: HTMLElement,
  onComplete: () => void
): void {
  const title = nextSection.querySelector<HTMLElement>('.project__next-title')
  const media = nextSection.querySelector<HTMLElement>('.project__next-media')

  const tl = gsap.timeline({
    onComplete,
  })

  // Title slides up to hero position
  if (title) {
    tl.to(title, {
      y: -window.innerHeight * 0.4,
      scale: 1.1,
      duration: 0.7,
      ease: 'power3.inOut',
    }, 0)
  }

  // Media expands to fill viewport
  if (media) {
    tl.to(media, {
      scale: 1.2,
      opacity: 1,
      duration: 0.7,
      ease: 'power3.inOut',
    }, 0)
  }

  // Fade out current content
  const article = nextSection.closest('.project')
  if (article) {
    tl.to(article, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in',
    }, 0.3)
  }
}
