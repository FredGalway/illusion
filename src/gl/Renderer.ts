import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { getQualityProfile, type QualityProfile } from './quality'

type FrameCallback = (deltaTime: number, elapsed: number) => void

export class Renderer {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer!: THREE.WebGLRenderer
  quality: QualityProfile = getQualityProfile()
  private canvas: HTMLCanvasElement
  private frameCallbacks: FrameCallback[] = []
  private clock = new THREE.Clock()

  // Cursor parallax targets
  private cursorTargetX = 0
  private cursorTargetY = 0
  private cameraOffsetX = 0
  private cameraOffsetY = 0

  // Resize debounce
  private resizeTimer: ReturnType<typeof setTimeout> | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#f2f2f0')

    this.camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100)
    this.camera.position.set(0, 0.6, 9)
  }

  async init(): Promise<void> {
    this.initRenderer()
    this.setupEnvironment()
    this.setupLights()
    this.setupCursorParallax()
    this.setupResize()
    this.setupContextAndVisibility()
    this.renderer.setAnimationLoop(this.loop.bind(this))
  }

  private setupContextAndVisibility(): void {
    // 1. WebGL Context Lost & Restored Safeguards
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
      console.warn('[Renderer] WebGL context lost!')
      this.renderer.setAnimationLoop(null)
    })
    this.canvas.addEventListener('webglcontextrestored', () => {
      console.info('[Renderer] WebGL context restored! Reloading page.')
      location.reload()
    })

    // 2. Background tab performance guard
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.renderer.setAnimationLoop(null)
      } else {
        this.renderer.setAnimationLoop(this.loop.bind(this))
      }
    })
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.quality.antialias,
    })
    console.log(`[Renderer] WebGL active (Tier: ${this.quality.tier})`)

    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.quality.maxPixelRatio))

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    if (this.quality.shadows === 'none') {
      this.renderer.shadowMap.enabled = false
    } else {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type =
        this.quality.shadows === 'pcf' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap
    }
  }

  private setupEnvironment(): void {
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    pmrem.compileEquirectangularShader()
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04)
    this.scene.environment = env.texture
    this.scene.environmentIntensity = 0.5
    pmrem.dispose()
  }

  private setupLights(): void {
    const sun = new THREE.DirectionalLight(0xffffff, 2.2)
    sun.position.set(4, 8, 6)
    if (this.quality.shadows !== 'none') {
      sun.castShadow = true
      sun.shadow.mapSize.set(this.quality.shadowMapSize, this.quality.shadowMapSize)
      sun.shadow.camera.near = 0.5
      sun.shadow.camera.far = 50
      sun.shadow.camera.left = -12
      sun.shadow.camera.right = 12
      sun.shadow.camera.top = 12
      sun.shadow.camera.bottom = -12
      ;(sun.shadow as THREE.DirectionalLightShadow & { radius: number }).radius = 8
    } else {
      sun.castShadow = false
    }
    this.scene.add(sun)
  }

  private setupCursorParallax(): void {
    window.addEventListener('mousemove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = -((e.clientY / window.innerHeight) * 2 - 1)
      this.cursorTargetX = nx * 0.25
      this.cursorTargetY = ny * 0.15
    })
  }

  private setupResize(): void {
    const ro = new ResizeObserver(() => {
      if (this.resizeTimer) clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => this.handleResize(), 150)
    })
    ro.observe(document.body)
  }

  private handleResize(): void {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  }

  private loop(): void {
    const rawDt = this.clock.getDelta()
    const deltaTime = Math.min(rawDt, 1 / 30) // clamp to 30fps max step
    const elapsed = this.clock.getElapsedTime()

    // Cursor parallax — lerp camera target
    this.cameraOffsetX += (this.cursorTargetX - this.cameraOffsetX) * 0.05
    this.cameraOffsetY += (this.cursorTargetY - this.cameraOffsetY) * 0.05
    this.camera.position.x = this.cameraOffsetX
    this.camera.lookAt(0, 0.6 + this.cameraOffsetY * 0.5, 0)

    // Run registered frame callbacks
    for (const cb of this.frameCallbacks) {
      cb(deltaTime, elapsed)
    }

    this.renderer.render(this.scene, this.camera)
  }

  onFrame(cb: FrameCallback): void {
    this.frameCallbacks.push(cb)
  }

  /** Reduce pixel ratio (perf degradation) */
  setPixelRatio(ratio: number): void {
    this.renderer.setPixelRatio(ratio)
  }

  /** Disable shadows (perf degradation) */
  disableShadows(): void {
    this.renderer.shadowMap.enabled = false
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = false
        obj.receiveShadow = false
      }
    })
  }
}
