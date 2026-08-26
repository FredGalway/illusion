// ─── Project Data Layer ────────────────────────────────────────────────────
// Typed registry of all projects. Media paths are placeholders until real
// assets are added to /public/media/projects/<slug>/.

export interface MediaBlock {
  type: 'video' | 'image'
  src: string
  poster?: string
  caption?: string
  layout: 'full' | 'left' | 'right'
}

export interface Project {
  slug: string
  title: string
  pitch: string
  client: string
  year: number
  services: string[]
  launchUrl?: string
  heroMedia: MediaBlock
  media: MediaBlock[]
}

export const projects: Project[] = [
  {
    slug: 'alison-landing',
    title: 'Alison Landing Pages',
    pitch: `Refonte compl\u00e8te des pages d'acquisition du leader mondial de la formation gratuite. Un design system modulaire qui a boost\u00e9 les taux de conversion de +34%.`,
    client: 'Alison',
    year: 2024,
    services: ['UX/UI', 'Design System', 'Prototyping', 'A/B Testing'],
    launchUrl: undefined,
    heroMedia: {
      type: 'image',
      src: '/media/projects/alison-landing/hero.jpg',
      layout: 'full',
    },
    media: [
      { type: 'image', src: '/media/projects/alison-landing/01.jpg', layout: 'full', caption: `Page d'accueil \u2014 Desktop` },
      { type: 'image', src: '/media/projects/alison-landing/02.jpg', layout: 'left', caption: 'Composants UI' },
      { type: 'image', src: '/media/projects/alison-landing/03.jpg', layout: 'right', caption: 'Mobile responsive' },
      { type: 'video', src: '/media/projects/alison-landing/scroll.mp4', poster: '/media/projects/alison-landing/scroll-poster.jpg', layout: 'full', caption: 'Scroll interaction' },
    ],
  },
  {
    slug: 'alison-app',
    title: 'Alison Mobile App',
    pitch: `Prototype haute fid\u00e9lit\u00e9 d'une application mobile \u00e9ducative pens\u00e9e pour l'engagement des apprenants \u00e0 travers la gamification.`,
    client: 'Alison',
    year: 2023,
    services: ['UX/UI', 'Prototype XD', 'User Research', 'Gamification'],
    launchUrl: undefined,
    heroMedia: {
      type: 'image',
      src: '/media/projects/alison-app/hero.jpg',
      layout: 'full',
    },
    media: [
      { type: 'image', src: '/media/projects/alison-app/01.jpg', layout: 'full', caption: `\u00c9cran d'accueil` },
      { type: 'image', src: '/media/projects/alison-app/02.jpg', layout: 'left', caption: 'Parcours utilisateur' },
      { type: 'image', src: '/media/projects/alison-app/03.jpg', layout: 'right', caption: 'Dashboard apprenant' },
    ],
  },
  {
    slug: 'alison-publisher',
    title: 'Alison Publishing',
    pitch: `Conception d'un progiciel de cr\u00e9ation de cours en ligne avec un design system complet et une interface pens\u00e9e pour la productivit\u00e9.`,
    client: 'Alison',
    year: 2023,
    services: ['UX/UI', 'Design System', 'Progiciel', 'Accessibility'],
    launchUrl: '/05-alison-publishing.html',
    heroMedia: {
      type: 'image',
      src: '/src/ui/alison/publishing/01-HomePage.png',
      layout: 'full',
    },
    media: [
      { type: 'image', src: '/media/projects/alison-publisher/01.jpg', layout: 'full', caption: `Interface \u00e9diteur` },
      { type: 'video', src: '/media/projects/alison-publisher/flow.mp4', poster: '/media/projects/alison-publisher/flow-poster.jpg', layout: 'full', caption: 'Workflow de publication' },
      { type: 'image', src: '/media/projects/alison-publisher/02.jpg', layout: 'left', caption: 'Composants' },
      { type: 'image', src: '/media/projects/alison-publisher/03.jpg', layout: 'right', caption: 'Analytics' },
    ],
  },
  {
    slug: 'bnp-ia-secure',
    title: 'BNP & IA Secure',
    pitch: `Interface prim\u00e9e par Adobe pour la meilleure UI internationale. Solution de s\u00e9curit\u00e9 bancaire aliment\u00e9e par l'intelligence artificielle.`,
    client: 'BNP Paribas',
    year: 2019,
    services: ['UI Design', 'Direction Artistique', 'IA', 'S\u00e9curit\u00e9'],
    launchUrl: undefined,
    heroMedia: {
      type: 'image',
      src: '/media/projects/bnp-ia-secure/hero.jpg',
      layout: 'full',
    },
    media: [
      { type: 'image', src: '/media/projects/bnp-ia-secure/01.jpg', layout: 'full', caption: 'Dashboard principal' },
      { type: 'image', src: '/media/projects/bnp-ia-secure/02.jpg', layout: 'left', caption: 'D\u00e9tection IA' },
      { type: 'image', src: '/media/projects/bnp-ia-secure/03.jpg', layout: 'right', caption: 'Mobile view' },
      { type: 'video', src: '/media/projects/bnp-ia-secure/demo.mp4', poster: '/media/projects/bnp-ia-secure/demo-poster.jpg', layout: 'full', caption: 'D\u00e9mo live' },
    ],
  },
  {
    slug: 'smartphone-gobelins',
    title: 'Smartphone Gobelins',
    pitch: `Prototype mobile innovant pour les Gobelins, l'\u00c9cole de l'Image \u2014 une exp\u00e9rience tactile qui repense l'apprentissage num\u00e9rique.`,
    client: 'Gobelins',
    year: 2018,
    services: ['UX Innovation', 'Prototype', 'Mobile', 'Recherche'],
    launchUrl: undefined,
    heroMedia: {
      type: 'image',
      src: '/media/projects/smartphone-gobelins/hero.jpg',
      layout: 'full',
    },
    media: [
      { type: 'image', src: '/media/projects/smartphone-gobelins/01.jpg', layout: 'full', caption: '\u00c9cran principal' },
      { type: 'image', src: '/media/projects/smartphone-gobelins/02.jpg', layout: 'left', caption: 'Navigation tactile' },
      { type: 'image', src: '/media/projects/smartphone-gobelins/03.jpg', layout: 'right', caption: 'Mode lecture' },
    ],
  },
  {
    slug: 'godot-ia-scenarios',
    title: 'GODOT & IA Scenarios',
    pitch: `Exploration FullStack alliant Game Design et intelligence artificielle. Des sc\u00e9narios interactifs g\u00e9n\u00e9r\u00e9s par IA dans le moteur GODOT.`,
    client: 'Projet Personnel',
    year: 2024,
    services: ['FullStack', 'Game Design', 'Python', 'IA'],
    launchUrl: undefined,
    heroMedia: {
      type: 'image',
      src: '/media/projects/godot-ia-scenarios/hero.jpg',
      layout: 'full',
    },
    media: [
      { type: 'video', src: '/media/projects/godot-ia-scenarios/gameplay.mp4', poster: '/media/projects/godot-ia-scenarios/gameplay-poster.jpg', layout: 'full', caption: 'Gameplay IA' },
      { type: 'image', src: '/media/projects/godot-ia-scenarios/01.jpg', layout: 'left', caption: '\u00c9diteur sc\u00e9nario' },
      { type: 'image', src: '/media/projects/godot-ia-scenarios/02.jpg', layout: 'right', caption: 'Pipeline Python' },
      { type: 'image', src: '/media/projects/godot-ia-scenarios/03.jpg', layout: 'full', caption: 'Architecture syst\u00e8me' },
    ],
  },
]

/** Find a project by slug, returns undefined if not found */
export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}

/** Get the next project in the loop (wraps around) */
export function getNextProject(currentSlug: string): Project {
  const idx = projects.findIndex((p) => p.slug === currentSlug)
  return projects[(idx + 1) % projects.length]
}
