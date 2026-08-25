import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Split an element's text into per-line wrappers for reveal animations.
 * Uses a DOM-based measurement approach (no external lib required).
 */
function splitLines(el: HTMLElement): HTMLElement[] {
  const lines = el.innerHTML.split(/<br\s*\/?>/i)

  el.innerHTML = lines.map(lineText => {
    const cleanText = lineText.trim()
    if (!cleanText) return ''
    return `
      <span class="reveal-line-outer" style="display:block;overflow:hidden;">
        <span class="reveal-line-inner" style="display:block;">${cleanText}</span>
      </span>
    `
  }).filter(Boolean).join('')

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

  // H1 Headline — clean global fade + slide (no JS span splitting)
  document.querySelectorAll<HTMLElement>('h1[data-reveal]').forEach(h1 => {
    gsap.set(h1, { opacity: 0, y: 24 })

    ScrollTrigger.create({
      trigger: h1,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(h1, {
          opacity: 1,
          y: 0,
          duration: 1.0,
          ease: 'power3.out',
        })
      },
    })
  })

  // H2 Headlines — line-by-line reveal
  document.querySelectorAll<HTMLElement>('h2[data-reveal]').forEach(h2 => {
    const lines = splitLines(h2)
    gsap.set(lines, { yPercent: 110 })

    ScrollTrigger.create({
      trigger: h2,
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

  // Fallback: Ensure all text reveals become visible after max 2s if animation/trigger delayed
  setTimeout(() => {
    document.querySelectorAll<HTMLElement>('[data-reveal], .reveal-line-inner').forEach(el => {
      const computed = window.getComputedStyle(el)
      if (computed.opacity === '0' || computed.visibility === 'hidden') {
        gsap.to(el, { opacity: 1, y: 0, yPercent: 0, duration: 0.4, overwrite: 'auto' })
      }
    })
  }, 2000)
}
