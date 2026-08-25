// ─── Hash-Based SPA Router ─────────────────────────────────────────────────
// Minimal client-side router. Routes:
//   /              → home
//   /projects/:slug → project page

export type RouteHandler = {
  onHome: () => void | Promise<void>
  onProject: (slug: string) => void | Promise<void>
}

export class Router {
  private handlers: RouteHandler

  constructor(handlers: RouteHandler) {
    this.handlers = handlers
    window.addEventListener('hashchange', () => this.resolve())
  }

  /** Parse current hash and call the matching handler */
  resolve(): void {
    const hash = location.hash.replace(/^#\/?/, '') // strip leading #/

    // Project page: projects/<slug>
    const projectMatch = hash.match(/^projects\/([a-z0-9-]+)$/i)
    if (projectMatch) {
      this.handlers.onProject(projectMatch[1])
      return
    }

    // Everything else → home
    this.handlers.onHome()
  }

  /** Programmatic navigation */
  static navigate(path: string): void {
    location.hash = `#/${path}`
  }

  /** Navigate to project */
  static toProject(slug: string): void {
    Router.navigate(`projects/${slug}`)
  }

  /** Navigate home */
  static toHome(): void {
    location.hash = ''
  }
}
