/**
 * Custom cursor: dot 8px + circle 36px, lerped toward mouse.
 * Hidden on touch devices.
 */

let dotEl: HTMLElement | null = null
let circleEl: HTMLElement | null = null

let mouseX = 0
let mouseY = 0
let dotX = 0
let dotY = 0
let circleX = 0
let circleY = 0
let circleScale = 1

const DOT_LERP = 0.25
const CIRCLE_LERP = 0.15

export function initCursor(): void {
  // Abort on touch devices
  if (window.matchMedia('(hover: none)').matches) return

  dotEl = document.getElementById('cursor-dot')
  circleEl = document.getElementById('cursor-circle')
  if (!dotEl || !circleEl) return

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
  })

  // Scale up on interactive elements
  const interactiveSelector = 'a, button, .js-magnetic, [role="button"]'
  document.addEventListener('mouseover', (e) => {
    if ((e.target as Element).closest(interactiveSelector)) {
      circleScale = 1.6
    }
  })
  document.addEventListener('mouseout', (e) => {
    if ((e.target as Element).closest(interactiveSelector)) {
      circleScale = 1
    }
  })

  requestAnimationFrame(tick)
}

function tick(): void {
  if (!dotEl || !circleEl) return

  dotX += (mouseX - dotX) * DOT_LERP
  dotY += (mouseY - dotY) * DOT_LERP

  circleX += (mouseX - circleX) * CIRCLE_LERP
  circleY += (mouseY - circleY) * CIRCLE_LERP

  dotEl.style.transform = `translate(${dotX - 4}px, ${dotY - 4}px)`
  circleEl.style.transform = `translate(${circleX - 18}px, ${circleY - 18}px) scale(${circleScale})`

  requestAnimationFrame(tick)
}
