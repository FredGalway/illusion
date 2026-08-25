import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import RAPIER from '@dimforge/rapier3d-compat'
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg'
import { getQualityProfile, type QualityProfile } from '../quality'

interface JackBody {
  body: RAPIER.RigidBody
  radius: number
  instanceIdx: number
}

export class HeroJacks {
  private container: HTMLElement
  private canvas: HTMLCanvasElement
  private renderer!: THREE.WebGLRenderer
  private quality: QualityProfile = getQualityProfile()
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private world!: RAPIER.World
  private jacks: JackBody[] = []
  private cursorBody!: RAPIER.RigidBody
  private active = false
  private resizeObserver: ResizeObserver | null = null

  private instancedMesh!: THREE.InstancedMesh
  private dummy = new THREE.Object3D()

  // Color Palette state
  private currentPalette: THREE.Color[] = [
    new THREE.Color('#f5f5f3'), // Off-white
    new THREE.Color('#000000'), // Glossy Grey
    new THREE.Color('#fbc531'), // Vibrant Golden Yellow
  ]

  // Mouse state
  private mouse3D = new THREE.Vector3(0, 0, 0)
  private cursorLerp = new THREE.Vector3(0, 0, 0)

  // Collider refs for walls
  private wallHandles: RAPIER.Collider[] = []

  private clock = new THREE.Clock()
  private accumulator = 0
  private FIXED_DT = 1 / 60
  private MAX_STEPS = 3
  private nanCheckTimer = 0

  private TOTAL_JACKS = 32

  constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
    this.container = container
    this.canvas = canvas
    this.TOTAL_JACKS = this.quality.tier === 'low' ? 12 : this.quality.tier === 'medium' ? 20 : 32
  }

  async init(): Promise<void> {
    await RAPIER.init()

    this.world = new RAPIER.World({ x: 0, y: -4.0, z: 0 })

    this.initThree()
    this.setupLights()
    this.setupEnclosure()
    this.createJacks()
    this.createCursorCollider()

    this.active = true
    this.renderer.setAnimationLoop(this.loop.bind(this))

    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true })
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true })
    window.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true })
    window.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: true })
    window.addEventListener('click', this.onClick.bind(this))
    
    this.resizeObserver = new ResizeObserver(() => {
      this.onResize()
    })
    this.resizeObserver.observe(this.container)
  }

  private initThree(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.quality.antialias,
      alpha: true, // Transparent background so CSS styles the card background
    })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    if (this.quality.shadows === 'none') {
      this.renderer.shadowMap.enabled = false
    } else {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type =
        this.quality.shadows === 'pcf' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap
    }

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
      console.warn('[HeroJacks] WebGL context lost!')
      this.active = false
      this.renderer.setAnimationLoop(null)
    })
    this.canvas.addEventListener('webglcontextrestored', () => {
      console.info('[HeroJacks] WebGL context restored! Reloading page.')
      location.reload()
    })

    this.scene = new THREE.Scene()

    // 35 degree view angle camera aligned to local space
    this.camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100)
    // Distance designed to wrap current scale of colliders
    
    // Zoom in
    this.camera.position.set(0, 0.8, 2.1)
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.25)
    this.scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5)
    dirLight.position.set(4, 8, 4)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    dirLight.shadow.radius = 6
    dirLight.shadow.bias = -0.0005
    this.scene.add(dirLight)

    const fillLight = new THREE.PointLight(0xffeaad, 1.2, 20)
    fillLight.position.set(-4, -2, 2)
    this.scene.add(fillLight)
  }

  private setupEnclosure(): void {
    // Clean old colliders
    for (const c of this.wallHandles) {
      this.world.removeCollider(c, false)
    }
    this.wallHandles = []

    // Map container size to frustum at z=0 plane
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov)
    const dist = this.camera.position.z 
    const frustumH = 2 * Math.tan(fovRad / 2) * dist
    const frustumW = frustumH * this.camera.aspect

    const hw = frustumW / 2 + 0.3
    const hh = frustumH / 2 + 0.3
    const thickness = 1.0

    // Floor
    this.wallHandles.push(this.addStaticBox(0, -hh, 0, hw * 2, thickness, 10))
    // Ceiling
    this.wallHandles.push(this.addStaticBox(0, hh + 1, 0, hw * 2, thickness, 10))
    // Left
    this.wallHandles.push(this.addStaticBox(-hw, 0, 0, thickness, hh * 2 + 2, 10))
    // Right
    this.wallHandles.push(this.addStaticBox(hw, 0, 0, thickness, hh * 2 + 2, 10))
    // Back
    this.wallHandles.push(this.addStaticBox(0, 0, -1, hw * 2, hh * 2 + 2, thickness))
    // Front wall to contain them
    this.wallHandles.push(this.addStaticBox(0, 0, 1, hw * 2, hh * 2 + 2, thickness))

    // Clamp jacks positions to keep them inside new boundaries on resize
    const margin = 0.3
    for (const jack of this.jacks) {
      if (!jack.body) continue
      const pos = jack.body.translation()
      let nextX = pos.x
      let nextY = pos.y
      let nextZ = pos.z
      let modified = false

      // Clamp X position with margin
      const limitX = hw - margin
      if (Math.abs(pos.x) > limitX) {
        nextX = Math.sign(pos.x) * limitX
        modified = true
      }

      // Clamp Y position with margin (floor is -hh, ceiling is hh + 1)
      const limitYLow = -hh + margin
      const limitYHigh = hh + 1.0 - margin
      if (pos.y < limitYLow) {
        nextY = limitYLow
        modified = true
      } else if (pos.y > limitYHigh) {
        nextY = limitYHigh
        modified = true
      }

      // Clamp Z position with margin
      const limitZ = 1.0 - margin
      if (Math.abs(pos.z) > limitZ) {
        nextZ = Math.sign(pos.z) * limitZ
        modified = true
      }

      if (modified) {
        jack.body.setTranslation({ x: nextX, y: nextY, z: nextZ }, true)
        jack.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        jack.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
    }
  }

  private addStaticBox(x: number, y: number, z: number, hw: number, hh: number, hd: number): RAPIER.Collider {
    const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z))
    return this.world.createCollider(RAPIER.ColliderDesc.cuboid(hw / 2, hh / 2, hd / 2), rb)
  }

  private createCrossGeometry(): THREE.BufferGeometry {
    // 1. Build the solid outer geometry structure
    const points: THREE.Vector2[] = []
    const rOuter = 0.28
    const rBevel = 0.02   // Sharper corners as requested by user (decreased from 0.05)
    const hHalf = 0.5
    const bevelSegs = 12

    // Bottom solid cap center
    points.push(new THREE.Vector2(0, -hHalf))
    // Bottom cap flat to bevel boundary
    points.push(new THREE.Vector2(rOuter - rBevel, -hHalf))
    
    // Bottom outer bevel curve (quarter circle from y = -hHalf to y = -hHalf + rBevel)
    for (let i = 0; i <= bevelSegs; i++) {
      const t = (i / bevelSegs) * (Math.PI / 2)
      const x = (rOuter - rBevel) + rBevel * Math.sin(t)
      const y = (-hHalf + rBevel) - rBevel * Math.cos(t)
      points.push(new THREE.Vector2(x, y))
    }
    
    // Top outer bevel curve (quarter circle from y = hHalf - rBevel to y = hHalf)
    for (let i = 0; i <= bevelSegs; i++) {
      const t = (i / bevelSegs) * (Math.PI / 2)
      const x = (rOuter - rBevel) + rBevel * Math.cos(t)
      const y = (hHalf - rBevel) + rBevel * Math.sin(t)
      points.push(new THREE.Vector2(x, y))
    }
    
    // Top solid cap center
    points.push(new THREE.Vector2(0, hHalf))

    // Revolve path to create the solid beveled cylinder
    const cylY = new THREE.LatheGeometry(points, 64)
    const cylX = cylY.clone().rotateZ(Math.PI / 2)
    const cylZ = cylY.clone().rotateX(Math.PI / 2)
    
    // Central sphere to bridge cylinders smooth intersection
    const sphere = new THREE.SphereGeometry(rOuter * 1.15, 64, 64)

    const solidGeoms = [cylY, cylX, cylZ, sphere]
    const outerGeometry = BufferGeometryUtils.mergeGeometries(solidGeoms)

    // Dispose intermediate solids
    cylY.dispose()
    cylX.dispose()
    cylZ.dispose()
    sphere.dispose()

    // 2. Build the inner drill geometry channels to pierce the jack
    const rHole = 0.12     // Hole radius
    const drillLength = 1.2 // Made slightly longer than jack diameter (1.0) for a clean cut
    
    const drillY = new THREE.CylinderGeometry(rHole, rHole, drillLength, 64, 1)
    const drillX = drillY.clone().rotateZ(Math.PI / 2)
    const drillZ = drillY.clone().rotateX(Math.PI / 2)

    const drillGeoms = [drillX, drillY, drillZ]
    const innerGeometry = BufferGeometryUtils.mergeGeometries(drillGeoms)

    // Dispose intermediate drills
    drillY.dispose()
    drillX.dispose()
    drillZ.dispose()

    // 3. Subtract innerGeometry from outerGeometry using fast BVH-CSG
    const evaluator = new Evaluator()
    const outerBrush = new Brush(outerGeometry)
    const innerBrush = new Brush(innerGeometry)
    
    const resultBrush = evaluator.evaluate(outerBrush, innerBrush, SUBTRACTION)
    const finalGeometry = resultBrush.geometry

    // Clean up brushes and temporary composite geometries
    outerGeometry.dispose()
    innerGeometry.dispose()

    return finalGeometry
  }

  private generateRandomColorsSet(): THREE.Color[] {
    const set: THREE.Color[] = []
    for (let i = 0; i < 3; i++) {
      const hue = Math.random()
      const saturation = 0.75 + Math.random() * 0.20 // 75% - 95%
      const lightness = 0.45 + Math.random() * 0.15  // 45% - 60%
      set.push(new THREE.Color().setHSL(hue, saturation, lightness))
    }
    return set
  }

  private getRandomPaletteColor(): THREE.Color {
    const idx = Math.floor(Math.random() * this.currentPalette.length)
    return this.currentPalette[idx].clone()
  }

  private createJacks(): void {
    const geo = this.createCrossGeometry()
    
    // Explicitly compute and set large bounding box & sphere so raycast is never clipped.
    geo.computeBoundingSphere()
    geo.computeBoundingBox()
    
    // Override with a static volume covering the entire containment/physics bounds
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 10.0)
    geo.boundingBox = new THREE.Box3(
      new THREE.Vector3(-5, -5, -5),
      new THREE.Vector3(5, 5, 5)
    )
    
    // Glossy physical material with reflections and clearcoat lacquer
    const glossMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    })

    this.instancedMesh = new THREE.InstancedMesh(geo, glossMat, this.TOTAL_JACKS)
    this.instancedMesh.castShadow = true
    this.instancedMesh.receiveShadow = true
    this.scene.add(this.instancedMesh)

    for (let i = 0; i < this.TOTAL_JACKS; i++) {
      const r = 0.22 + Math.random() * 0.16 // Slightly smaller jacks to fit the card wrapper bounds

      // Spawn near top center
      const spawnX = (Math.random() - 0.5) * 1.0
      const spawnY = 1.2 + Math.random() * 0.8
      const spawnZ = (Math.random() - 0.5) * 0.4

      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawnX, spawnY, spawnZ)
        .setLinearDamping(0.6)
        .setAngularDamping(0.8)

      const body = this.world.createRigidBody(bodyDesc)

      // Compound collider representing 3 orthogonally intersecting beams
      const hRadius = r * 0.28
      const hLength = r * 0.48 

      const colY = RAPIER.ColliderDesc.cuboid(hRadius, hLength, hRadius)
        .setRestitution(0.2)
        .setFriction(0.4)
      const colX = RAPIER.ColliderDesc.cuboid(hLength, hRadius, hRadius)
        .setRestitution(0.2)
        .setFriction(0.4)
      const colZ = RAPIER.ColliderDesc.cuboid(hRadius, hRadius, hLength)
        .setRestitution(0.2)
        .setFriction(0.4)

      this.world.createCollider(colY, body)
      this.world.createCollider(colX, body)
      this.world.createCollider(colZ, body)

      const color = this.getRandomPaletteColor()
      this.instancedMesh.setColorAt(i, color)

      this.jacks.push({ body, radius: r, instanceIdx: i })
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true
    }
  }

  private createCursorCollider(): void {
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -999, 0)
    this.cursorBody = this.world.createRigidBody(bodyDesc)
    this.world.createCollider(RAPIER.ColliderDesc.ball(0.55), this.cursorBody)
  }

  private updateMouseFromCoords(clientX: number, clientY: number): void {
    const rect = this.container.getBoundingClientRect()
    const rx = clientX - rect.left
    const ry = clientY - rect.top

    const nx = (rx / rect.width) * 2 - 1
    const ny = -((ry / rect.height) * 2 - 1)

    const vec = new THREE.Vector3(nx, ny, 0.5)
    vec.unproject(this.camera)
    const dir = vec.sub(this.camera.position).normalize()
    const t = -this.camera.position.z / dir.z
    const pos = this.camera.position.clone().add(dir.multiplyScalar(t))

    this.mouse3D.set(pos.x, pos.y, 0)
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouseFromCoords(e.clientX, e.clientY)
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length > 0) {
      this.updateMouseFromCoords(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length > 0) {
      this.updateMouseFromCoords(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  private onTouchEnd(): void {
    // Park cursor collider far outside frustum when touch ends (Phase D fix)
    this.mouse3D.set(0, -999, 0)
  }

  private onClick(e: MouseEvent): void {
    const rect = this.container.getBoundingClientRect()
    const rx = e.clientX - rect.left
    const ry = e.clientY - rect.top

    if (rx >= 0 && rx <= rect.width && ry >= 0 && ry <= rect.height) {
      const nx = (rx / rect.width) * 2 - 1
      const ny = -((ry / rect.height) * 2 - 1)

      // Project click NDC back to world plane
      const vec = new THREE.Vector3(nx, ny, 0.5)
      vec.unproject(this.camera)
      const dir = vec.sub(this.camera.position).normalize()
      const t = -this.camera.position.z / dir.z
      const clickPos = this.camera.position.clone().add(dir.multiplyScalar(t))

      let hit = false

      // 1. Raycast check
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera)
      const intersects = raycaster.intersectObject(this.instancedMesh)
      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        hit = true
      }

      // 2. Distance-based fallback check (click target radius around each jack center)
      if (!hit) {
        for (const jack of this.jacks) {
          const t2 = jack.body.translation()
          const dx = t2.x - clickPos.x
          const dy = t2.y - clickPos.y
          const dz = t2.z - clickPos.z
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (dist < jack.radius * 1.6) {
            hit = true
            break
          }
        }
      }

      // Swap pallete and recolor
      if (hit) {
        this.currentPalette = this.generateRandomColorsSet()
        for (let i = 0; i < this.TOTAL_JACKS; i++) {
          const color = this.getRandomPaletteColor()
          this.instancedMesh.setColorAt(i, color)
        }
        if (this.instancedMesh.instanceColor) {
          this.instancedMesh.instanceColor.needsUpdate = true
        }
      }

      const cp = { x: clickPos.x, y: clickPos.y, z: 0 }
      const radius = 2.0
      const force = 1.8

      for (const jack of this.jacks) {
        const t2 = jack.body.translation()
        const dx = t2.x - cp.x
        const dy = t2.y - cp.y
        const dz = t2.z - cp.z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < radius && dist > 0.01) {
          const f = (1 - dist / radius) * force
          jack.body.applyImpulse({ x: (dx / dist) * f, y: (dy / dist) * f + 0.3 * f, z: (dz / dist) * f }, true)
        }
      }
    }
  }

  private onResize(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.setupEnclosure()
  }

  private loop(): void {
    if (!this.active) return

    const deltaTime = Math.min(this.clock.getDelta(), 0.1)

    // Bounded physics loop (Phase A fix)
    this.accumulator += deltaTime
    let steps = 0
    while (this.accumulator >= this.FIXED_DT && steps < this.MAX_STEPS) {
      this.world.step()
      this.accumulator -= this.FIXED_DT
      steps++
    }
    if (this.accumulator > this.FIXED_DT * this.MAX_STEPS) {
      this.accumulator = 0
    }

    // 1-second NaN check safeguard
    this.nanCheckTimer += deltaTime
    if (this.nanCheckTimer >= 1.0) {
      this.nanCheckTimer = 0
      this.checkNaN()
    }

    // Lerp cursor collider positional placement
    this.cursorLerp.x += (this.mouse3D.x - this.cursorLerp.x) * 0.1
    this.cursorLerp.y += (this.mouse3D.y - this.cursorLerp.y) * 0.1
    this.cursorBody.setNextKinematicTranslation({
      x: this.cursorLerp.x,
      y: this.cursorLerp.y,
      z: 0,
    })

    // Update InstancedMesh matrices
    for (const jack of this.jacks) {
      const t = jack.body.translation()
      const rot = jack.body.rotation()

      this.dummy.position.set(t.x, t.y, t.z)
      this.dummy.quaternion.set(rot.x, rot.y, rot.z, rot.w)
      this.dummy.scale.setScalar(jack.radius)
      this.dummy.updateMatrix()

      this.instancedMesh.setMatrixAt(jack.instanceIdx, this.dummy.matrix)
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.active = false
    window.removeEventListener('mousemove', this.onMouseMove.bind(this))
    window.removeEventListener('click', this.onClick.bind(this))
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    this.renderer.dispose()
    this.instancedMesh.geometry.dispose()
    if (Array.isArray(this.instancedMesh.material)) {
      this.instancedMesh.material.forEach(m => m.dispose())
    } else {
      this.instancedMesh.material.dispose()
    }
  }

  // ─── NaN Safeguard ────────────────────────────────────────────────────────
  private checkNaN(): void {
    if (this.jacks.length === 0) return
    const pos = this.jacks[0].body.translation()
    if (Number.isNaN(pos.x) || Number.isNaN(pos.y) || Number.isNaN(pos.z)) {
      console.warn('[HeroJacks] NaN position detected! Resetting jack positions.')
      this.resetJackPositions()
    }
  }

  private resetJackPositions(): void {
    for (const jack of this.jacks) {
      const spawnX = (Math.random() - 0.5) * 1.0
      const spawnY = 1.2 + Math.random() * 0.8
      const spawnZ = (Math.random() - 0.5) * 0.4
      jack.body.setTranslation({ x: spawnX, y: spawnY, z: spawnZ }, true)
      jack.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      jack.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
  }
}
