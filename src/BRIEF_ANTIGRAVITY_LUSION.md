# BRIEF ANTIGRAVITY — Site immersif inspiré de lusion.co

> Fichier à placer à la racine du projet (ou coller dans le premier prompt Antigravity).
> Objectif : un site studio immersif reprenant le **langage** de lusion.co
> (structure, typo, motion, une pièce 3D signature) — pas un clone de leur moteur.

---

## 1. CONTEXTE & INTENTION

Site vitrine de studio créatif, single-page-app avec pages Home / About / Projects.
Référence principale : https://lusion.co/
Ambiance : fond blanc cassé, typographie noire massive, la couleur vient uniquement
de la 3D et des médias. Sobriété du design / spectaculaire de la 3D.

## 2. STACK IMPOSÉ

- **Vite + TypeScript** (vanilla, pas de React)
- **Three.js** ≥ r170, renderer via `import { WebGPURenderer } from 'three/webgpu'`
  (fallback WebGL 2 automatique). Shaders custom en **TSL** (`three/tsl`).
- **Lenis** pour le smooth scroll
- **GSAP + ScrollTrigger** pour les animations DOM et le séquençage scroll
- **@dimforge/rapier3d-compat** pour la physique des sphères
- Assets : glTF + Draco, textures KTX2 (basis)
- Pas de framework CSS. CSS custom avec variables, `clamp()` pour la typo fluide.

## 3. ARCHITECTURE

```
src/
  main.ts              // bootstrap : Lenis + App
  app/App.ts           // orchestrateur : scroll <-> scènes <-> DOM
  gl/Renderer.ts       // WebGPURenderer + resize + pixelRatio adaptatif
  gl/scenes/HeroBalls.ts       // pièce signature (physique)
  gl/scenes/GalleryDistort.ts  // hover distortion des vignettes projets
  motion/textReveal.ts // split lines + reveal au scroll
  motion/magnetic.ts   // boutons magnétiques
  styles/              // tokens.css, base.css, sections.css
index.html             // HTML sémantique complet (SEO), canvas fixed en fond
```

Règles :
- **Un seul canvas** `position: fixed; inset: 0; z-index: 0`, DOM au-dessus.
- Le DOM contient TOUT le texte réel (accessibilité + SEO). La 3D est décorative.
- `prefers-reduced-motion` : désactiver physique + reveals, tout rester lisible.

## 4. DESIGN SYSTEM

### Couleurs
```css
--bg: #f2f2f0;        /* blanc cassé */
--ink: #0a0a0a;       /* texte */
--muted: #8a8a86;     /* eyebrows, meta */
--accent: #0a0a0a;    /* pas de couleur d'accent : le contraste EST l'accent */
```

### Typographie
- Display : sans-serif grasse condensée (ex. "Archivo Expanded/Black", "Anton",
  ou variable font libre équivalente). Headlines en `clamp(2.5rem, 8vw, 8rem)`,
  line-height 0.95, letter-spacing léger négatif.
- Eyebrows : 0.75rem, uppercase, letter-spacing 0.15em, couleur --muted.
- Corps : sans-serif neutre 1rem/1.6.

### Composants
- Bouton pill (bordure 1px, fond transparent → invert au hover) + effet magnétique
- Marquee horizontal infini ("CONTINUE TO SCROLL")
- Menu overlay plein écran (burger → liste géante Home/About/Projects/Contact)
- Footer : adresse, socials, emails, newsletter, copyright

## 5. STRUCTURE DE LA HOME (sections)

1. **Hero** — headline plein écran "We create 3D visual storytelling…",
   ball pit 3D interactif derrière, mention "scroll to explore".
2. **Manifesto** — eyebrow "Bold Ideas, Brought to Life" + long statement
   en gros corps, CTA "Our Approach" + bouton "Play Reel" (modal vidéo).
3. **Featured Work** — liste de 6–10 projets : titre + tags
   (web • design • development • 3d), vignette média avec distorsion au hover,
   lien "See all projects".
4. **Vision** — "Where Creative Ideas Become Immersive Experiences" + 2 paragraphes.
5. **CTA** — "Is Your Big Idea Ready to Go Wild? Let's work together!"
   typo massive, marquee.
6. **Footer**.

## 6. LA PIÈCE SIGNATURE — HERO BALLS

- 80–150 sphères (rayon varié 0.15–0.6), matériaux :
  90% blanc mat (roughness 0.9), 10% chrome (metalness 1, envMap).
- Physique Rapier : gravité douce vers le centre-bas, murs invisibles = frustum caméra.
- Interaction : le curseur est un collider sphérique invisible (repulsion),
  le scroll ajoute une impulsion verticale.
- Éclairage : environment IBL neutre (studio HDR faible intensité) + 1 directional.
- Ombres de contact douces (plan avec shadow material ou AO baked).
- Perf : instancedMesh, 60fps desktop / 30fps mobile mini,
  réduire le nombre de sphères si `dpr` élevé ou fps < seuil (qualité adaptative).

## 7. MOTION SPEC

- Smooth scroll Lenis (lerp 0.1), synchronisé avec ScrollTrigger
  (`lenis.on('scroll', ScrollTrigger.update)`).
- Text reveal : split par lignes (masque overflow), translateY 100% → 0,
  stagger 0.06s, ease "power3.out", déclenché à 80% du viewport.
- Boutons magnétiques : translation max 8px vers le curseur, retour elastic.
- Hover vignettes projets : plan WebGL avec UV distortion (TSL, noise + velocity
  du curseur), fallback CSS scale(1.03) si WebGL indisponible.
- Transitions de page : fade + slide du DOM (300ms), la scène 3D persiste
  et interpole son état (position caméra, densité de sphères).

## 8. PERFORMANCE & QUALITÉ (critères d'acceptation)

- Lighthouse mobile ≥ 85 perf, ≥ 95 accessibilité.
- Aucun layout shift au chargement (canvas derrière, DOM stable).
- Chargement : écran d'intro avec compteur % (préchargement assets),
  puis reveal du hero.
- Draco + KTX2 pour tout asset 3D. Images en AVIF/WebP, lazy.
- Fallback complet sans WebGL : site 100% lisible et navigable.

## 9. PLAN D'EXÉCUTION (un prompt par milestone)

- **M1** — Scaffold Vite+TS, Lenis, HTML sémantique des 6 sections, tokens CSS.
- **M2** — Design system complet : typo fluide, eyebrows, boutons, menu overlay,
  footer, marquee. Zéro 3D à ce stade. Valider visuellement.
- **M3** — Renderer.ts : WebGPURenderer + fallback, resize, loop, stats fps en dev.
- **M4** — HeroBalls.ts : Rapier + instancedMesh + interaction curseur/scroll.
- **M5** — Motion : textReveal, magnetic, ScrollTrigger sur toutes les sections.
- **M6** — GalleryDistort + page Projects + template page projet.
- **M7** — Preloader, qualité adaptative, compression assets, audit Lighthouse,
  prefers-reduced-motion.

Après chaque milestone : lancer le dev server, vérifier dans le navigateur,
corriger avant de passer au suivant. Ne jamais empiler deux milestones
dans une même itération.
