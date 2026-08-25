export type Tier = 'high' | 'medium' | 'low'

export interface QualityProfile {
  tier: Tier
  maxPixelRatio: number
  antialias: boolean
  spheresCount: number
  sphereSegments: number
  shadows: 'pcfsoft' | 'pcf' | 'none'
  shadowMapSize: number
  roomEnvResolution: number
  rgbShift: boolean
  screenShake: boolean
  collisionSounds: boolean
}

export function detectTier(): Tier {
  const coarse = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
  const mem = (navigator as any).deviceMemory ?? 4
  const small = typeof window !== 'undefined' && Math.min(screen.width, screen.height) < 800
  if (coarse && (small || mem <= 4)) return 'low'
  if (coarse) return 'medium'
  return 'high'
}

export function getQualityProfile(tier: Tier = detectTier()): QualityProfile {
  switch (tier) {
    case 'low':
      return {
        tier: 'low',
        maxPixelRatio: 1.25,
        antialias: false,
        spheresCount: 45,
        sphereSegments: 16,
        shadows: 'none',
        shadowMapSize: 512,
        roomEnvResolution: 128,
        rgbShift: false,
        screenShake: false,
        collisionSounds: false,
      }
    case 'medium':
      return {
        tier: 'medium',
        maxPixelRatio: 1.5,
        antialias: true,
        spheresCount: 70,
        sphereSegments: 24,
        shadows: 'pcf',
        shadowMapSize: 1024,
        roomEnvResolution: 128,
        rgbShift: true,
        screenShake: false,
        collisionSounds: true,
      }
    case 'high':
    default:
      return {
        tier: 'high',
        maxPixelRatio: 2.0,
        antialias: true,
        spheresCount: 110,
        sphereSegments: 32,
        shadows: 'pcfsoft',
        shadowMapSize: 2048,
        roomEnvResolution: 256,
        rgbShift: true,
        screenShake: true,
        collisionSounds: true,
      }
  }
}
