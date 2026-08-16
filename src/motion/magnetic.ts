import { gsap } from 'gsap'

interface MagneticEl {
  el: HTMLElement
  inner: HTMLElement | null
  bounds: DOMRect
  active: boolean
  xTo: ReturnType<typeof gsap.quickTo>
  yTo: ReturnType<typeof gsap.quickTo>
  innerXTo: ReturnType<typeof gsap.quickTo> | null
  innerYTo: ReturnType<typeof gsap.quickTo> | null
}

const ATTRACT_PADDING = 30     // px beyond bounding box
const MAX_TRANSLATE = 10        // px button
const MAX_INNER = 4             // px inner label

export function initMagnetic(): void {
  const elements = document.querySelectorAll<HTMLElement>('.js-magnetic')
  if (!elements.length) return

  elements.forEach(el => {
    // QuickTo for smooth lerping (GSAP handles the lerp internally)
    const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3.out' })

    const inner = el.querySelector<HTMLElement>('.btn__label, span:not(.btn__icon)')
    let innerXTo: ReturnType<typeof gsap.quickTo> | null = null
    let innerYTo: ReturnType<typeof gsap.quickTo> | null = null
    if (inner) {
      innerXTo = gsap.quickTo(inner, 'x', { duration: 0.8, ease: 'power3.out' })
      innerYTo = gsap.quickTo(inner, 'y', { duration: 0.8, ease: 'power3.out' })
    }

    const entry: MagneticEl = {
      el,
      inner,
      bounds: el.getBoundingClientRect(),
      active: false,
      xTo, yTo, innerXTo, innerYTo,
    }

    // Refresh bounds on resize
    window.addEventListener('resize', () => {
      entry.bounds = el.getBoundingClientRect()
    })

    window.addEventListener('mousemove', (e) => {
      const { left, top, width, height } = entry.bounds
      const cx = left + width / 2
      const cy = top + height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy

      const inZone = (
        e.clientX > left - ATTRACT_PADDING &&
        e.clientX < left + width + ATTRACT_PADDING &&
        e.clientY > top - ATTRACT_PADDING &&
        e.clientY < top + height + ATTRACT_PADDING
      )

      if (inZone) {
        entry.active = true
        const nx = dx / (width / 2 + ATTRACT_PADDING)
        const ny = dy / (height / 2 + ATTRACT_PADDING)
        xTo(nx * MAX_TRANSLATE)
        yTo(ny * MAX_TRANSLATE)
        if (innerXTo) innerXTo(nx * MAX_INNER)
        if (innerYTo) innerYTo(ny * MAX_INNER)
      } else if (entry.active) {
        entry.active = false
        // Elastic bounce back
        gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' })
        if (inner) gsap.to(inner, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' })
      }
    })
  })
}
