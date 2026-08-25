// ─── Project Page Template (Lusion UI/UX Real Alignment) ───────────────────
// Renders an authentic Lusion-inspired case study page.

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Project, MediaBlock } from '../data/projects'
import { getNextProject } from '../data/projects'
import { detectTier } from '../gl/quality'
import { initMediaObserver, destroyMediaObserver } from '../motion/mediaObserver'
import {
  initNextProjectScroll,
  destroyNextProjectScroll,
  animateProjectTransition,
} from '../motion/nextProjectScroll'
import { Router } from './Router'

gsap.registerPlugin(ScrollTrigger)

let scrollTriggers: ScrollTrigger[] = []

function renderMediaBlock(block: MediaBlock, isHero: boolean, isLowTier: boolean): string {
  const lazy = isHero ? '' : 'loading="lazy"'
  const preload = isHero ? 'preload="metadata"' : 'preload="none"'

  if (block.type === 'video') {
    if (isLowTier && !isHero) {
      // Low tier: poster image + play overlay
      return `
        <div class="project__media-item" data-layout="${block.layout}">
          <div class="project__media-card">
            <img src="${block.poster || ''}"
                 alt="${block.caption || ''}"
                 ${lazy}
                 class="project__media-poster" />
            <button class="project__play-overlay" aria-label="Lire la vidéo"
                    data-video-src="${block.src}">▶</button>
            ${block.caption ? `<span class="project__media-caption">${block.caption}</span>` : ''}
          </div>
        </div>`
    }
    return `
      <div class="project__media-item" data-layout="${block.layout}">
        <div class="project__media-card">
          <video muted playsinline loop
                 ${preload}
                 ${block.poster ? `poster="${block.poster}"` : ''}
                 class="project__media-video">
            <source src="${block.src}" type="video/mp4" />
          </video>
          ${block.caption ? `<span class="project__media-caption">${block.caption}</span>` : ''}
        </div>
      </div>`
  }

  // Image
  return `
    <div class="project__media-item" data-layout="${block.layout}">
      <div class="project__media-card">
        <img src="${block.src}"
             alt="${block.caption || ''}"
             ${lazy}
             class="project__media-img" />
        ${block.caption ? `<span class="project__media-caption">${block.caption}</span>` : ''}
      </div>
    </div>`
}

export function renderProjectPage(project: Project): string {
  const tier = detectTier()
  const isLowTier = tier === 'low'
  const next = getNextProject(project.slug)

  const servicesItems = project.services.map((s) => `<li>${s}</li>`).join('')

  const mediaHtml = project.media
    .map((block) => renderMediaBlock(block, false, isLowTier))
    .join('')

  const heroMediaHtml = renderMediaBlock(project.heroMedia, true, isLowTier)

  return `
    <article class="project" data-slug="${project.slug}">
      <!-- Lusion Floating Top Header Bar -->
      <nav class="project__top-bar" aria-label="Navigation projet">
        <a class="project__brand" href="#/">
          FRÉDÉRIC MOITRY <span class="project__brand-dot"></span>
        </a>

        <div class="project__actions">
          <a class="project__pill project__pill--primary project__back" href="#/" aria-label="Retour aux projets">
            ← BACK
          </a>
          <a class="project__pill project__pill--glass" href="#/cta">
            LET'S TALK •
          </a>
        </div>
      </nav>

      <!-- Hero Section (Lusion Split Layout) -->
      <header class="project__hero">
        <div class="project__hero-content">
          <h1 class="project__title" data-reveal>${project.title}</h1>
          <p class="project__pitch" data-reveal>${project.pitch}</p>

          <div class="project__hero-meta" data-reveal>
            <div class="project__meta-group">
              <span class="project__meta-label">SERVICES</span>
              <ul class="project__meta-list">
                ${servicesItems}
              </ul>
            </div>

            <div class="project__meta-group">
              <span class="project__meta-label">CLIENT / ANNÉE</span>
              <div class="project__meta-value">${project.client}</div>
              <div class="project__meta-value" style="color: var(--proj-text-muted); font-size: 0.85rem;">${project.year}</div>
            </div>
          </div>

          ${
            project.launchUrl
              ? `<div class="project__launch-wrap" data-reveal>
                  <a class="project__launch-btn" href="${project.launchUrl}" target="_blank" rel="noopener noreferrer">
                    • LAUNCH PROJECT →
                  </a>
                </div>`
              : ''
          }
        </div>

        <div class="project__hero-showcase" data-reveal>
          ${heroMediaHtml}
        </div>

        <div class="project__scroll-hint" aria-hidden="true">
          SCROLL TO EXPLORE <span class="project__scroll-hint-arrow">»</span>
        </div>
      </header>

      <!-- Media Flow (Horizontal Scroll) -->
      <section class="project__media-flow">
        <div class="project__media-track">
          ${mediaHtml}
        </div>
      </section>

      <!-- Next Project -->
      <section class="project__next" id="project-next">
        <p class="project__next-eyebrow">PROJET SUIVANT</p>
        <a class="project__next-title" href="#/projects/${next.slug}">
          ${next.title}
        </a>
        <div class="project__next-bg"></div>

        <!-- Desktop: SVG circle gauge following cursor -->
        <svg class="project__gauge-svg" viewBox="0 0 60 60" aria-hidden="true">
          <circle class="project__gauge-track" cx="30" cy="30" r="26"
                  fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
          <circle class="project__gauge-circle" cx="30" cy="30" r="26"
                  fill="none" stroke="var(--proj-accent)" stroke-width="2"
                  stroke-linecap="round"
                  transform="rotate(-90 30 30)" />
        </svg>

        <!-- Mobile: bottom bar -->
        <div class="project__gauge-bar-wrap" aria-hidden="true">
          <div class="project__gauge-bar"></div>
        </div>
      </section>
    </article>`
}

export function mountProjectPage(container: HTMLElement, project: Project): void {
  const article = container.querySelector<HTMLElement>('.project')
  if (!article) return

  // ─── Back link ───
  const backLink = article.querySelector<HTMLAnchorElement>('.project__back')
  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault()
      Router.toHome()
    })
  }

  // ─── Media observer (video auto-play/pause) ───
  initMediaObserver(article)

  // ─── Low-tier play overlay buttons ───
  article.querySelectorAll<HTMLButtonElement>('.project__play-overlay').forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = btn.dataset.videoSrc
      if (!src) return
      const card = btn.closest('.project__media-card')
      if (!card) return
      // Replace poster with actual video
      card.innerHTML = `
        <video muted playsinline controls autoplay
               class="project__media-video">
          <source src="${src}" type="video/mp4" />
        </video>`
    })
  })

  // ─── GSAP Pinned Horizontal Scroll for Media Flow ───
  const mediaSection = article.querySelector<HTMLElement>('.project__media-flow')
  const mediaTrack = article.querySelector<HTMLElement>('.project__media-track')

  if (mediaSection && mediaTrack) {
    const getScrollAmount = () => -(mediaTrack.scrollWidth - window.innerWidth)

    const horizontalSt = ScrollTrigger.create({
      trigger: mediaSection,
      start: 'top top',
      end: () => `+=${Math.max(window.innerWidth, mediaTrack.scrollWidth - window.innerWidth)}`,
      pin: true,
      scrub: 1,
      onUpdate: (self) => {
        const x = self.progress * getScrollAmount()
        gsap.set(mediaTrack, { x })
      },
      invalidateOnRefresh: true,
    })

    scrollTriggers.push(horizontalSt)
  }

  // ─── Text reveals on project page ───
  article.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.set(el, { opacity: 0, y: 30 })
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' })
      },
    })
    scrollTriggers.push(st)
  })

  // ─── Scroll-through next project ───
  const nextSection = article.querySelector<HTMLElement>('.project__next')
  if (nextSection) {
    const next = getNextProject(project.slug)
    initNextProjectScroll(nextSection, () => {
      animateProjectTransition(nextSection, () => {
        Router.toProject(next.slug)
      })
    })
  }
}

export function unmountProjectPage(): void {
  destroyMediaObserver()
  destroyNextProjectScroll()

  // Kill all project-specific ScrollTrigger instances
  scrollTriggers.forEach((st) => st.kill())
  scrollTriggers = []
}
