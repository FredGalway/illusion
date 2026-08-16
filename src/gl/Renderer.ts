import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

type FrameCallback = (deltaTime: number, elapsed: number) => void

export class Renderer {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer!: THREE.WebGLRenderer
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
    this.renderer.setAnimationLoop(this.loop.bind(this))
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    console.log('[Renderer] WebGL active')

    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
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
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 50
    sun.shadow.camera.left = -12
    sun.shadow.camera.right = 12
    sun.shadow.camera.top = 12
    sun.shadow.camera.bottom = -12
    ;(sun.shadow as THREE.DirectionalLightShadow & { radius: number }).radius = 8
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
