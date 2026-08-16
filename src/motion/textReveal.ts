import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Split an element's text into per-line wrappers for reveal animations.
 * Uses a DOM-based measurement approach (no external lib required).
 */
function splitLines(el: HTMLElement): HTMLElement[] {
  const originalText = el.innerText
  const words = originalText.split(' ')
  const lines: string[][] = []
  let currentLine: string[] = []

  // Build words spans to measure lines
  el.innerHTML = words.map(w => `<span class="word">${w} </span>`).join('')
  const wordSpans = Array.from(el.querySelectorAll<HTMLElement>('.word'))

  let lastTop = -1
  for (const span of wordSpans) {
    const top = span.offsetTop
    if (top !== lastTop) {
      if (currentLine.length > 0) lines.push(currentLine)
      currentLine = [span.innerText]
      lastTop = top
    } else {
      currentLine.push(span.innerText)
    }
  }
  if (currentLine.length > 0) lines.push(currentLine)

  // Re-build with line wrappers
  el.innerHTML = lines.map(lineWords => `
    <span class="reveal-line-outer" style="display:block;overflow:hidden;">
      <span class="reveal-line-inner" style="display:block;">${lineWords.join(' ')}</span>
    </span>
  `).join('')

  return Array.from(el.querySelectorAll<HTMLElement>('.reveal-line-inner'))
}

export function initTextReveal(): void {
  // Eyebrows — simple fade + slide
  document.querySelectorAll<HTMLElement>('.eyebrow[data-reveal]').forEach(eyebrow => {
    gsap.set(eyebrow, { opacity: 0, y: 12 })

    ScrollTrigger.create({
      trigger: eyebrow,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(eyebrow, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
        })
      },
    })
  })

  // Headlines — line-by-line reveal
  const headlines = document.querySelectorAll<HTMLElement>('h1[data-reveal], h2[data-reveal]')

  headlines.forEach(headline => {
    const lines = splitLines(headline)
    gsap.set(lines, { yPercent: 110 })

    ScrollTrigger.create({
      trigger: headline,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(lines, {
          yPercent: 0,
          duration: 1.1,
          ease: 'power4.out',
          stagger: 0.08,
        })
      },
    })
  })

  // Sub-text / hero__sub — fade + slide (same pattern as eyebrow, delayed)
  document.querySelectorAll<HTMLElement>('.hero__sub[data-reveal], .manifesto__statement[data-reveal]').forEach(el => {
    gsap.set(el, { opacity: 0, y: 20 })

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          delay: 0.2,
        })
      },
    })
  })

  // CTA group
  document.querySelectorAll<HTMLElement>('.manifesto__ctas[data-reveal], .work__footer[data-reveal]').forEach(el => {
    gsap.set(el, { opacity: 0, y: 16 })

    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(el, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.1 })
      },
    })
  })

  // Work items — staggered per-item
  const workItems = document.querySelectorAll<HTMLElement>('.work__item[data-reveal]')
  if (workItems.length) {
    gsap.set(workItems, { opacity: 0, y: 40 })
    ScrollTrigger.create({
      trigger: workItems[0].parentElement,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.to(workItems, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.1,
        })
      },
    })
  }

  // Generic [data-reveal] catch-all (not already handled)
  document.querySelectorAll<HTMLElement>('[data-reveal]:not(h1):not(h2):not(.eyebrow):not(.hero__sub):not(.manifesto__statement):not(.manifesto__ctas):not(.work__footer):not(.work__item)').forEach(el => {
    gsap.set(el, { opacity: 0, y: 24 })
    ScrollTrigger.create({
      trigger: el,
      start: 'top 87%',
      once: true,
      onEnter: () => {
        gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
      },
    })
  })

  // Section parallax — subtle depth
  document.querySelectorAll<HTMLElement>('.section').forEach(section => {
    if (section.id === 'hero') return // hero is pinned, skip
    ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1,
      onUpdate: (self) => {
        const y = (self.progress - 0.5) * 40
        ;(section as HTMLElement).style.setProperty('--parallax-y', `${y}px`)
      },
    })
  })
}
