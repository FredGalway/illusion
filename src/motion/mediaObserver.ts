// ─── Media Observer ─────────────────────────────────────────────────────────
// IntersectionObserver for auto-play/pause of project page videos.
// - Threshold 0.4: play when ≥40% visible, pause otherwise
// - Max 2 concurrent decoding videos

const MAX_CONCURRENT = 2
let activeVideos: HTMLVideoElement[] = []
let observer: IntersectionObserver | null = null

function tryPlay(video: HTMLVideoElement): void {
  if (activeVideos.length >= MAX_CONCURRENT) return
  if (activeVideos.includes(video)) return

  activeVideos.push(video)
  video.play().catch(() => {
    // Autoplay blocked — ignore silently
    activeVideos = activeVideos.filter((v) => v !== video)
  })
}

function tryPause(video: HTMLVideoElement): void {
  if (!activeVideos.includes(video)) return
  video.pause()
  activeVideos = activeVideos.filter((v) => v !== video)
}

export function initMediaObserver(root: HTMLElement): void {
  destroyMediaObserver()

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement
        if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          tryPlay(video)
        } else {
          tryPause(video)
        }
      }
    },
    { threshold: [0, 0.4] }
  )

  root.querySelectorAll<HTMLVideoElement>('.project__media-item video').forEach((v) => {
    observer!.observe(v)
  })
}

export function destroyMediaObserver(): void {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  activeVideos.forEach((v) => v.pause())
  activeVideos = []
}
