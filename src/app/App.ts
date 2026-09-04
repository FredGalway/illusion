import type Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Renderer } from '../gl/Renderer'
import { HeroBalls } from '../gl/scenes/HeroBalls'
import { HeroJacks } from '../gl/scenes/HeroJacks'
import { initTextReveal } from '../motion/textReveal'
import { initMagnetic } from '../motion/magnetic'
import { initCursor } from '../motion/cursor'
import { Router } from './Router'
import { getProject } from '../data/projects'
import { renderProjectPage, mountProjectPage, unmountProjectPage } from './ProjectPage'

gsap.registerPlugin(ScrollTrigger)

export class App {
  private lenis: Lenis | null
  private prefersReduced: boolean
  private renderer!: Renderer
  private heroBalls!: HeroBalls
  private heroJacks: HeroJacks | null = null
  private router!: Router
  private mainEl!: HTMLElement
  private homeContent = ''
  private currentView: 'home' | 'project' = 'home'
  private glActive = false

  constructor(lenis: Lenis | null, prefersReduced: boolean) {
    this.lenis = lenis
    this.prefersReduced = prefersReduced
  }

  async init(): Promise<void> {
    document.body.classList.add('is-loading')

    // Cache main element and home content
    this.mainEl = document.getElementById('main-content')!
    this.homeContent = this.mainEl.innerHTML

    // Shell setup (runs ONCE, survives route changes)
    this.setupNav()
    this.setupModal()
    this.setupPDFModal()

    if (this.prefersReduced) {
      this.reducedMotionInit()
      this.setupRouter()
      return
    }

    // Boot 3D Background
    const canvas = document.getElementById('gl-canvas') as HTMLCanvasElement
    this.renderer = new Renderer(canvas)
    await this.renderer.init()

    this.heroBalls = new HeroBalls(this.renderer)

    // Boot 3D Foreground Card (Jacks)
    const jacksContainer = document.getElementById('home-hero-visual-container')
    const jacksCanvas = document.getElementById('jacks-canvas') as HTMLCanvasElement | null
    if (jacksContainer && jacksCanvas) {
      this.heroJacks = new HeroJacks(jacksContainer, jacksCanvas)
    }

    // Lenis velocity → ball scroll impulse
    if (this.lenis) {
      this.lenis.on('scroll', ({ velocity }: { velocity: number }) => {
        const clampedV = Math.max(-60, Math.min(60, velocity))
        if (this.heroBalls) this.heroBalls.scrollVelocity = clampedV
      })
    }

    // Motion (once)
    initCursor()
    initMagnetic()

    // Run preloader, then chain intro
    await this.runPreloader()

    // Setup router AFTER preloader completes
    this.setupRouter()
  }

  // ─── Router ────────────────────────────────────────────────────────────────
  private setupRouter(): void {
    this.router = new Router({
      onHome: () => this.showHome(),
      onProject: (slug) => this.showProject(slug),
    })
    // Resolve initial route
    this.router.resolve()
  }

  private async showHome(): Promise<void> {
    if (this.currentView === 'home') return
    this.currentView = 'home'

    document.body.classList.remove('is-project-page')

    // Cleanup project page
    unmountProjectPage()

    // Restore home content
    this.mainEl.innerHTML = this.homeContent

    // Scroll to top
    window.scrollTo(0, 0)
    this.lenis?.scrollTo(0, { immediate: true })

    // Show 3D
    this.startGL()

    // Re-init anchor links for home page
    this.setupAnchorLinks()

    // Re-init text reveals for new DOM
    if (!this.prefersReduced) {
      // Small delay so DOM is settled
      requestAnimationFrame(() => {
        initTextReveal()
        initMagnetic()

        // Force hero elements visible (already past preloader)
        const heroSection = document.getElementById('hero')
        if (heroSection) {
          const headline = heroSection.querySelector<HTMLElement>('.hero__headline')
          const eyebrow = heroSection.querySelector<HTMLElement>('.eyebrow')
          if (eyebrow) gsap.set(eyebrow, { opacity: 1, y: 0 })
          if (headline) gsap.set(headline, { opacity: 1, y: 0 })
        }
      })
    }
  }

  private showProject(slug: string): void {
    const project = getProject(slug)
    if (!project) {
      Router.toHome()
      return
    }

    // If switching from home, teardown home-specific stuff
    if (this.currentView === 'home') {
      this.killHomeScrollTriggers()
      this.stopGL()
    } else {
      // Project → Project: cleanup previous project
      unmountProjectPage()
    }

    this.currentView = 'project'
    document.body.classList.add('is-project-page')

    // Render project page
    this.mainEl.innerHTML = renderProjectPage(project)

    // Scroll to top
    window.scrollTo(0, 0)
    this.lenis?.scrollTo(0, { immediate: true })

    // Add enter animation
    const article = this.mainEl.querySelector('.project')
    if (article) article.classList.add('project--entering')

    // Mount project page logic (observers, scroll-through, reveals)
    requestAnimationFrame(() => {
      mountProjectPage(this.mainEl, project)
    })
  }

  // ─── GL lifecycle ──────────────────────────────────────────────────────────
  private startGL(): void {
    if (this.prefersReduced || this.glActive) return
    const canvas = document.getElementById('gl-canvas') as HTMLCanvasElement
    if (canvas) canvas.style.display = ''
    this.glActive = true
  }

  private stopGL(): void {
    if (!this.glActive) return
    const canvas = document.getElementById('gl-canvas') as HTMLCanvasElement
    if (canvas) canvas.style.display = 'none'
    this.glActive = false
  }

  private killHomeScrollTriggers(): void {
    // Kill ScrollTrigger instances created by textReveal on home
    ScrollTrigger.getAll().forEach((st) => st.kill())
  }

  // ─── Navigation ────────────────────────────────────────────────────────────
  private setupNav(): void {
    const burger = document.getElementById('js-burger')
    const menu   = document.getElementById('js-menu')
    const nav    = document.querySelector('.nav')
    if (!burger || !menu || !nav) return

    let isOpen = false

    const toggleMenu = (open: boolean) => {
      isOpen = open
      burger.setAttribute('aria-expanded', String(open))
      if (open) {
        menu.removeAttribute('hidden')
        nav.classList.add('nav--menu-open')
        this.lenis?.stop()
      } else {
        menu.setAttribute('hidden', '')
        nav.classList.remove('nav--menu-open')
        this.lenis?.start()
      }
    }

    burger.addEventListener('click', () => toggleMenu(!isOpen))
    menu.querySelectorAll('.menu-overlay__link').forEach(link => {
      link.addEventListener('click', () => toggleMenu(false))
    })
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) toggleMenu(false)
    })
  }

  // ─── Anchor navigation (Lenis controlled) ──────────────────────────────
  private setupAnchorLinks(): void {
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
      // Skip router-style links (#/projects/...)
      const href = a.getAttribute('href')
      if (!href || href === '#' || href.startsWith('#/')) return

      a.addEventListener('click', (e) => {
        const target = document.querySelector(href)
        if (target) {
          e.preventDefault()
          if (this.lenis) {
            this.lenis.scrollTo(target as HTMLElement, {
              duration: 1.4,
              easing: (t: number) => 1 - Math.pow(1 - t, 4),
            })
          } else {
            target.scrollIntoView({ behavior: 'smooth' })
          }
        }
      })
    })
  }

  // ─── Video modal ───────────────────────────────────────────────────────────
  private setupModal(): void {
    const reelBtn  = document.getElementById('js-reel-btn')
    const modal    = document.getElementById('js-modal')
    const closeBtn = document.getElementById('js-modal-close')
    const iframe   = document.getElementById('js-modal-iframe') as HTMLIFrameElement | null
    if (!reelBtn || !modal || !closeBtn || !iframe) return

    const openModal = async () => {
      modal.removeAttribute('hidden')

      iframe.src =
        'https://www.youtube-nocookie.com/embed/AKueRGrUSPY' +
        '?autoplay=1&fs=1&rel=0&enablejsapi=1&start=20&vq=hd720&playsinline=0'

      this.lenis?.stop()

      try {
        if (modal.requestFullscreen) {
          await modal.requestFullscreen()
        } else if ((modal as any).webkitRequestFullscreen) {
          await (modal as any).webkitRequestFullscreen()
        }
      } catch (error) {
        console.warn('Le plein écran a été refusé par le navigateur :', error)
      }
    }

    const closeModal = async () => {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if ((document as any).webkitFullscreenElement) {
        (document as any).webkitExitFullscreen()
      }

      modal.setAttribute('hidden', '')
      iframe.src = ''

      this.lenis?.start()
    }

    const onFullscreenChange = () => {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (!modal.hasAttribute('hidden')) {
          closeModal()
        }
      }
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('webkitfullscreenchange', onFullscreenChange)

    reelBtn.addEventListener('click', openModal)
    closeBtn.addEventListener('click', closeModal)
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal() })
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal()
    })
  }

  // ─── PDF modal ─────────────────────────────────────────────────────────────
  private setupPDFModal(): void {
    const cvLink   = document.getElementById('js-cv-link')
    const modal    = document.getElementById('js-pdf-modal')
    const closeBtn = document.getElementById('js-pdf-modal-close')
    const iframe   = document.getElementById('js-pdf-modal-iframe') as HTMLIFrameElement | null
    if (!cvLink || !modal || !closeBtn || !iframe) return

    const openModal = () => {
      modal.removeAttribute('hidden')
      iframe.src = '/cv/CV-FREDERIC-MOITRY-2026-Fr.pdf#view=FitH&zoom=125'
      this.lenis?.stop()
    }

    const closeModal = () => {
      modal.setAttribute('hidden', '')
      iframe.src = ''
      this.lenis?.start()
    }

    cvLink.addEventListener('click', (e) => {
      const isMobile = window.innerWidth <= 800 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      if (isMobile) {
        // On mobile/tablet, open directly in native browser PDF reader for native zoom, download, print, share
        return
      }
      e.preventDefault()
      openModal()
    })

    const handleClose = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      closeModal()
    }

    closeBtn.addEventListener('click', handleClose)
    closeBtn.addEventListener('pointerdown', handleClose)

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal()
    })
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal()
    })
  }

  // ─── Preloader — master GSAP timeline ─────────────────────────────────────
  private runPreloader(): Promise<void> {
    return new Promise((resolve) => {
      const preloader = document.getElementById('preloader')
      const countEl   = preloader?.querySelector<HTMLElement>('.preloader__count')
      const labelEl   = preloader?.querySelector<HTMLElement>('.preloader__label')
      const logoEl    = preloader?.querySelector<HTMLElement>('.preloader__logo')
      const footerEl  = preloader?.querySelector<HTMLElement>('.preloader__footer')
      if (!preloader || !countEl) {
        resolve()
        return
      }

      // Initial gentle reveal for logo, label & footer
      if (logoEl) gsap.fromTo(logoEl, { scale: 0.88, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'power2.out' })
      if (labelEl) gsap.fromTo(labelEl, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.1 })
      if (footerEl) gsap.fromTo(footerEl, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.15 })

      const startTime = performance.now()
      const MIN_DURATION = 1200

      const counter = { value: 0 }
      const tl = gsap.timeline()

      tl.to(counter, {
        value: 100,
        duration: 1.4,
        ease: 'power2.inOut',
        onUpdate: () => {
          countEl.textContent = `${Math.round(counter.value)}%`
        },
      })

      tl.call(() => {
        const elapsed = performance.now() - startTime
        const wait = Math.max(0, MIN_DURATION - elapsed)

        setTimeout(() => {
          this.playOutro(preloader, logoEl, labelEl, countEl, footerEl, resolve)
        }, wait)
      })
    })
  }

  private playOutro(
    preloader: HTMLElement,
    logoEl: HTMLElement | null | undefined,
    labelEl: HTMLElement | null | undefined,
    countEl: HTMLElement,
    footerEl: HTMLElement | null | undefined,
    onComplete: () => void
  ): void {
    const tl = gsap.timeline()

    tl.to([logoEl, labelEl, countEl, footerEl].filter(Boolean), {
      y: -24,
      opacity: 0,
      duration: 0.75,
      ease: 'power3.inOut',
      stagger: 0.04,
    })

    tl.fromTo(preloader,
      { clipPath: 'inset(0% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.0, ease: 'power4.inOut' },
      '-=0.25'
    )

    tl.call(async () => {
      preloader.setAttribute('hidden', '')
      preloader.removeAttribute('aria-hidden')

      document.body.classList.remove('is-loading')
      document.body.style.cursor = ''

      await this.heroBalls.init()

      if (this.heroJacks) {
        await this.heroJacks.init()
      }

      this.glActive = true
    })

    tl.call(() => {
      initTextReveal()
      this.setupAnchorLinks()

      const heroSection = document.getElementById('hero')
      if (heroSection) {
        const headline = heroSection.querySelector<HTMLElement>('.hero__headline')
        const eyebrow = heroSection.querySelector<HTMLElement>('.eyebrow')
        if (eyebrow) {
          gsap.to(eyebrow, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.2 })
        }
        if (headline) {
          gsap.to(headline, {
            opacity: 1,
            y: 0,
            duration: 1.0,
            ease: 'power3.out',
            delay: 0.4,
          })
        }
      }
      onComplete()
    }, [], '+=0.4')
  }

  // ─── Reduced-motion fallback ────────────────────────────────────────────
  private reducedMotionInit(): void {
    const preloader = document.getElementById('preloader')
    if (preloader) {
      preloader.setAttribute('hidden', '')
    }
    document.body.classList.remove('is-loading')
  }
}
