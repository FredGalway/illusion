import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import type { Renderer } from '../Renderer'

interface BallBody {
  body: RAPIER.RigidBody
  radius: number
  isChrome: boolean
  instanceIdx: number
}

export class HeroBalls {
  private renderer: Renderer
  private world!: RAPIER.World
  private balls: BallBody[] = []
  private cursorBody!: RAPIER.RigidBody

  private whiteInstancedMesh!: THREE.InstancedMesh
  private chromeInstancedMesh!: THREE.InstancedMesh
  private shadowFloor!: THREE.Mesh

  private dummy = new THREE.Object3D()

  // Mouse state
  private mouse3D = new THREE.Vector3(0, 0, 0)
  private cursorLerp = new THREE.Vector3(0, 0, 0)

  // Scroll velocity (provided externally)
  scrollVelocity = 0

  // Frustum bounds (updated on resize)
  private frustumW = 0
  private frustumH = 0

  // FPS tracking
  private fpsBuffer: number[] = []
  private fpsDegraded = 0
  private degradeTimer = 0

  // Collider refs for walls
  private wallHandles: RAPIER.Collider[] = []

  // Bounded physics loop accumulator (Phase A fix for mobile freeze)
  private accumulator = 0
  private FIXED_DT = 1 / 60
  private MAX_STEPS = 3
  private nanCheckTimer = 0

  private TOTAL_BALLS = 110
  private CHROME_COUNT = 12

  constructor(renderer: Renderer) {
    this.renderer = renderer
  }

  async init(): Promise<void> {
    await RAPIER.init()

    this.world = new RAPIER.World({ x: 0, y: -3.5, z: 0 })

    this.computeFrustum()
    this.createEnclosure()
    this.createBalls()
    this.createCursorCollider()
    this.createShadowFloor()

    this.renderer.onFrame(this.update.bind(this))
    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true })
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true })
    window.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true })
    window.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: true })
    window.addEventListener('click', this.onClick.bind(this))
    window.addEventListener('resize', this.onResize.bind(this))
  }

  // ─── Frustum helpers ─────────────────────────────────────────────────────

  private computeFrustum(): void {
    const cam = this.renderer.camera
    const fovRad = THREE.MathUtils.degToRad(cam.fov)
    const dist = cam.position.z // ~9
    this.frustumH = 2 * Math.tan(fovRad / 2) * dist
    this.frustumW = this.frustumH * cam.aspect
  }

  // ─── World enclosure ─────────────────────────────────────────────────────

  private createEnclosure(): void {
    const hw = this.frustumW / 2 + 1
    const hh = this.frustumH / 2 + 1
    const thickness = 1

    // Remove old wall colliders if any
    for (const c of this.wallHandles) {
      this.world.removeCollider(c, false)
    }
    this.wallHandles = []

    // Floor
    this.wallHandles.push(this.addStaticBox(0, -hh, 0, hw * 2, thickness, 20))
    // Ceiling
    this.wallHandles.push(this.addStaticBox(0, hh + 2, 0, hw * 2, thickness, 20))
    // Left
    this.wallHandles.push(this.addStaticBox(-hw, 0, 0, thickness, hh * 2 + 4, 20))
    // Right
    this.wallHandles.push(this.addStaticBox(hw, 0, 0, thickness, hh * 2 + 4, 20))
    // Back
    this.wallHandles.push(this.addStaticBox(0, 0, -2, hw * 2, hh * 2 + 4, thickness))
  }

  private addStaticBox(x: number, y: number, z: number, hw: number, hh: number, hd: number): RAPIER.Collider {
    const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z))
    return this.world.createCollider(RAPIER.ColliderDesc.cuboid(hw / 2, hh / 2, hd / 2), rb)
  }

  // ─── Balls ───────────────────────────────────────────────────────────────

  private createBalls(): void {
    const q = this.renderer.quality
    this.TOTAL_BALLS = q.spheresCount
    this.CHROME_COUNT = Math.max(4, Math.round(this.TOTAL_BALLS * 0.11))
    const whiteCount = this.TOTAL_BALLS - this.CHROME_COUNT

    const segs = q.sphereSegments
    const geo = new THREE.SphereGeometry(1, segs, segs)
    const whiteMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f5f5f3'),
      roughness: 0.85,
      metalness: 0,
    })
    const chromeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e0e0df'),
      roughness: 0.08,
      metalness: 1,
    })

    const castShadows = q.shadows !== 'none'

    this.whiteInstancedMesh = new THREE.InstancedMesh(geo, whiteMat, whiteCount)
    this.whiteInstancedMesh.castShadow = castShadows
    this.whiteInstancedMesh.receiveShadow = false
    this.renderer.scene.add(this.whiteInstancedMesh)

    this.chromeInstancedMesh = new THREE.InstancedMesh(geo, chromeMat, this.CHROME_COUNT)
    this.chromeInstancedMesh.castShadow = castShadows
    this.chromeInstancedMesh.receiveShadow = false
    this.renderer.scene.add(this.chromeInstancedMesh)

    let whiteIdx = 0
    let chromeIdx = 0

    for (let i = 0; i < this.TOTAL_BALLS; i++) {
      const isChrome = i < this.CHROME_COUNT
      const r = 0.18 + Math.pow(Math.random(), 2) * 0.37

      // Spawn above frustum top
      const spawnX = (Math.random() - 0.5) * this.frustumW * 0.9
      const spawnY = this.frustumH / 2 + r + Math.random() * this.frustumH * 1.5
      const spawnZ = (Math.random() - 0.5) * 1.5

      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawnX, spawnY, spawnZ)
        .setLinearDamping(0.6)
        .setAngularDamping(0.8)

      const body = this.world.createRigidBody(bodyDesc)

      const colliderDesc = RAPIER.ColliderDesc.ball(r)
        .setRestitution(0.25)
        .setFriction(0.4)

      this.world.createCollider(colliderDesc, body)

      const instanceIdx = isChrome ? chromeIdx++ : whiteIdx++
      this.balls.push({ body, radius: r, isChrome, instanceIdx })
    }
  }

  private createCursorCollider(): void {
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -999, 0)
    this.cursorBody = this.world.createRigidBody(bodyDesc)
    this.world.createCollider(RAPIER.ColliderDesc.ball(0.9), this.cursorBody)
  }

  private createShadowFloor(): void {
    const floorY = -(this.frustumH / 2 + 0.5)

    // Invisible physics floor is handled by the enclosure.
    // Visual shadow receiver slightly above it.
    const geo = new THREE.PlaneGeometry(this.frustumW * 3, this.frustumW * 3)
    const mat = new THREE.ShadowMaterial({ opacity: 0.12 })
    this.shadowFloor = new THREE.Mesh(geo, mat)
    this.shadowFloor.rotation.x = -Math.PI / 2
    this.shadowFloor.position.y = floorY
    this.shadowFloor.receiveShadow = true
    this.renderer.scene.add(this.shadowFloor)
  }

  private updateMouseFromCoords(clientX: number, clientY: number): void {
    const nx = (clientX / window.innerWidth) * 2 - 1
    const ny = -((clientY / window.innerHeight) * 2 - 1)

    const cam = this.renderer.camera
    const vec = new THREE.Vector3(nx, ny, 0.5)
    vec.unproject(cam)
    const dir = vec.sub(cam.position).normalize()
    const t = -cam.position.z / dir.z
    const pos = cam.position.clone().add(dir.multiplyScalar(t))

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

  private lastBurstTime = 0

  public triggerBurst(): void {
    const now = performance.now()
    if (now - this.lastBurstTime < 1500) return // 1.5s cooldown requirement (Phase B)
    this.lastBurstTime = now

    for (const ball of this.balls) {
      const force = 1.5 + Math.random() * 2.0
      const angle = Math.random() * Math.PI * 2
      ball.body.applyImpulse(
        {
          x: Math.cos(angle) * force,
          y: Math.sin(angle) * force + 1.0,
          z: (Math.random() - 0.5) * force,
        },
        true
      )
    }
  }

  private onClick(e: MouseEvent): void {
    const nx = (e.clientX / window.innerWidth) * 2 - 1
    const ny = -((e.clientY / window.innerHeight) * 2 - 1)

    const cam = this.renderer.camera
    const vec = new THREE.Vector3(nx, ny, 0.5)
    vec.unproject(cam)
    const dir = vec.sub(cam.position).normalize()
    const t = -cam.position.z / dir.z
    const clickPos = cam.position.clone().add(dir.multiplyScalar(t))

    const cp = { x: clickPos.x, y: clickPos.y, z: 0 }
    const radius = 3
    const force = 2.5

    for (const ball of this.balls) {
      const t2 = ball.body.translation()
      const dx = t2.x - cp.x
      const dy = t2.y - cp.y
      const dz = t2.z - cp.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < radius && dist > 0.01) {
        const f = (1 - dist / radius) * force
        ball.body.applyImpulse({ x: (dx / dist) * f, y: (dy / dist) * f + 0.5 * f, z: (dz / dist) * f }, true)
      }
    }
  }

  private onResize(): void {
    this.computeFrustum()
    this.createEnclosure()
  }

  // ─── Update loop ─────────────────────────────────────────────────────────

  private update(deltaTime: number): void {
    this.trackFPS(deltaTime)

    // Lerp cursor collider position
    this.cursorLerp.x += (this.mouse3D.x - this.cursorLerp.x) * 0.1
    this.cursorLerp.y += (this.mouse3D.y - this.cursorLerp.y) * 0.1
    this.cursorBody.setNextKinematicTranslation({
      x: this.cursorLerp.x,
      y: this.cursorLerp.y,
      z: 0,
    })

    // Scroll impulse with clamped velocity & impulse (Phase B fix)
    if (Math.abs(this.scrollVelocity) > 0.01) {
      const v = Math.max(-60, Math.min(60, this.scrollVelocity))
      const impulseY = Math.max(-0.08, Math.min(0.08, v * 0.002))
      for (const ball of this.balls) {
        ball.body.applyImpulse({ x: 0, y: impulseY * ball.radius * 4, z: 0 }, true)
      }
    }

    // Bounded physics loop (Phase A fix)
    this.accumulator += Math.min(deltaTime, 0.1)
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

    // Sync Three.js instances
    for (const ball of this.balls) {
      const t = ball.body.translation()
      const rot = ball.body.rotation()

      this.dummy.position.set(t.x, t.y, t.z)
      this.dummy.quaternion.set(rot.x, rot.y, rot.z, rot.w)
      this.dummy.scale.setScalar(ball.radius)
      this.dummy.updateMatrix()

      if (ball.isChrome) {
        this.chromeInstancedMesh.setMatrixAt(ball.instanceIdx, this.dummy.matrix)
      } else {
        this.whiteInstancedMesh.setMatrixAt(ball.instanceIdx, this.dummy.matrix)
      }
    }

    this.whiteInstancedMesh.instanceMatrix.needsUpdate = true
    this.chromeInstancedMesh.instanceMatrix.needsUpdate = true
  }

  // ─── FPS degradation ladder ───────────────────────────────────────────────

  private warmupTimer = 0

  private trackFPS(dt: number): void {
    if (this.fpsDegraded >= 3) return

    // Allow 3.5 seconds warmup after init before measuring FPS to avoid startup spike false alarms
    if (this.warmupTimer < 3.5) {
      this.warmupTimer += dt
      return
    }

    const fps = 1 / dt
    this.fpsBuffer.push(fps)
    if (this.fpsBuffer.length > 60) this.fpsBuffer.shift()

    const avg = this.fpsBuffer.reduce((a, b) => a + b, 0) / this.fpsBuffer.length

    if (avg < 40 && this.fpsBuffer.length === 60) {
      this.degradeTimer += dt
      if (this.degradeTimer >= 4.0) {
        this.degradeTimer = 0
        this.fpsBuffer = []
        this.applyNextDegradation()
      }
    } else {
      this.degradeTimer = 0
    }
  }

  private applyNextDegradation(): void {
    this.fpsDegraded++

    if (this.fpsDegraded === 1) {
      console.info('[HeroBalls] Adaptive performance optimization: reducing pixelRatio to 1.25')
      this.renderer.setPixelRatio(1.25)
    } else if (this.fpsDegraded === 2) {
      console.info('[HeroBalls] Adaptive performance optimization: disabling shadows')
      this.renderer.disableShadows()
    } else if (this.fpsDegraded === 3) {
      console.info('[HeroBalls] Adaptive performance optimization: reducing to 70 balls')
      this.reduceBalls(70)
    }
  }

  private reduceBalls(targetCount: number): void {
    const toRemove = this.balls.splice(targetCount)
    for (const ball of toRemove) {
      this.world.removeRigidBody(ball.body)
    }
    // Hide extra instances by moving them far away
    const dummy = new THREE.Object3D()
    dummy.position.set(0, -9999, 0)
    dummy.scale.setScalar(0.001)
    dummy.updateMatrix()

    for (let i = targetCount; i < this.TOTAL_BALLS - this.CHROME_COUNT; i++) {
      this.whiteInstancedMesh.setMatrixAt(i, dummy.matrix)
    }
    this.whiteInstancedMesh.instanceMatrix.needsUpdate = true
  }

  // ─── NaN Safeguard ────────────────────────────────────────────────────────
  private checkNaN(): void {
    if (this.balls.length === 0) return
    const pos = this.balls[0].body.translation()
    if (Number.isNaN(pos.x) || Number.isNaN(pos.y) || Number.isNaN(pos.z)) {
      console.warn('[HeroBalls] NaN position detected! Resetting ball positions.')
      this.resetBallPositions()
    }
  }

  private resetBallPositions(): void {
    for (const ball of this.balls) {
      const spawnX = (Math.random() - 0.5) * this.frustumW * 0.9
      const spawnY = this.frustumH / 2 + ball.radius + Math.random() * this.frustumH * 1.5
      const spawnZ = (Math.random() - 0.5) * 1.5
      ball.body.setTranslation({ x: spawnX, y: spawnY, z: spawnZ }, true)
      ball.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      ball.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
  }
}
