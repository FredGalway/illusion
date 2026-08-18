import type Lenis from 'lenis'
import { gsap } from 'gsap'
import { Renderer } from '../gl/Renderer'
import { HeroBalls } from '../gl/scenes/HeroBalls'
import { HeroJacks } from '../gl/scenes/HeroJacks'
import { initTextReveal } from '../motion/textReveal'
import { initMagnetic } from '../motion/magnetic'
import { initCursor } from '../motion/cursor'

export class App {
  private lenis: Lenis | null
  private prefersReduced: boolean
  private renderer!: Renderer
  private heroBalls!: HeroBalls
  private heroJacks: HeroJacks | null = null

  constructor(lenis: Lenis | null, prefersReduced: boolean) {
    this.lenis = lenis
    this.prefersReduced = prefersReduced
  }

  async init(): Promise<void> {
    document.body.classList.add('is-loading')
    this.setupNav()
    this.setupModal()

    if (this.prefersReduced) {
      this.reducedMotionInit()
      return
    }

    // Boot 3D Background
    const canvas = document.getElementById('gl-canvas') as HTMLCanvasElement
    this.renderer = new Renderer(canvas)
    await this.renderer.init()

    this.heroBalls = new HeroBalls(this.renderer)
    // Don't init balls yet — wait for preloader to complete

    // Boot 3D Foreground Card (Jacks)
    const jacksContainer = document.getElementById('home-hero-visual-container')
    const jacksCanvas = document.getElementById('jacks-canvas') as HTMLCanvasElement | null
    if (jacksContainer && jacksCanvas) {
      this.heroJacks = new HeroJacks(jacksContainer, jacksCanvas)
    }

    // Lenis velocity → ball scroll impulse
    if (this.lenis) {
      this.lenis.on('scroll', ({ velocity }: { velocity: number }) => {
        this.heroBalls.scrollVelocity = velocity
      })
    }

    // Motion
    if (!this.prefersReduced) {
      initCursor()
      initMagnetic()
      // Text reveals triggered AFTER preloader completes
    }

    // Run preloader, then chain intro
    await this.runPreloader()
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
        'https://www.youtube.com/embed/KNh7BQc3KeU' +
        '?autoplay=1&fullscreen=1&fs=1&playsinline=0&rel=0&enablejsapi=1'

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

  // ─── Preloader — master GSAP timeline ─────────────────────────────────────
  private runPreloader(): Promise<void> {
    return new Promise((resolve) => {
      const preloader  = document.getElementById('preloader')
      const countEl    = preloader?.querySelector<HTMLElement>('.preloader__count')
      const labelEl    = preloader?.querySelector<HTMLElement>('.preloader__label') ?? null
      if (!preloader || !countEl) {
        resolve()
        return
      }

      const startTime = performance.now()
      const MIN_DURATION = 1200 // ms

      // Animate counter 0 → 100
      const counter = { value: 0 }
      const tl = gsap.timeline()

      tl.to(counter, {
        value: 100,
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          countEl.textContent = `${Math.round(counter.value)}%`
        },
      })

      tl.call(() => {
        // Ensure minimum duration has passed
        const elapsed = performance.now() - startTime
        const wait = Math.max(0, MIN_DURATION - elapsed)

        setTimeout(() => {
          this.playOutro(preloader, labelEl, countEl, resolve)
        }, wait)
      })
    })
  }

  private playOutro(
    preloader: HTMLElement,
    labelEl: HTMLElement | null,
    countEl: HTMLElement,
    onComplete: () => void
  ): void {
    const tl = gsap.timeline()

    // 1. Count slides up
    tl.to([labelEl, countEl], {
      yPercent: -120,
      opacity: 0,
      duration: 0.9,
      ease: 'power4.inOut',
      stagger: 0.05,
    })

    // 2. Clip-path overlay reveal (top to bottom)
    tl.fromTo(preloader,
      { clipPath: 'inset(0% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'power4.inOut' },
      '-=0.3'
    )

    // 3. Balls fall (init physics world)
    tl.call(async () => {
      preloader.setAttribute('hidden', '')
      preloader.removeAttribute('aria-hidden')

      document.body.classList.remove('is-loading')
      document.body.style.cursor = ''

      // Init hero balls (they'll start falling from above)
      await this.heroBalls.init()

      // Init interactive jacks if present
      if (this.heroJacks) {
        await this.heroJacks.init()
      }
    })

    // 4. Short delay, then text reveals
    tl.call(() => {
      initTextReveal()
      // Trigger hero headline immediately (not scroll-based)
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
    // No 3D, no reveals, no Lenis — page is fully readable static
  }
}
