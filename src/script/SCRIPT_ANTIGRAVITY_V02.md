# SCRIPT ANTIGRAVITY — V-02 « Rendu & Fluidité »

> À coller tel quel dans Antigravity, dans le projet D:\Dev\Lusion\V-01.
> Objectif V-02 : se rapprocher de la qualité graphique et de la fluidité
> d'interaction de https://lusion.co/ — rendu doux type studio, inertie
> partout, 60 fps. Exécuter les phases DANS L'ORDRE, valider chaque phase
> dans le navigateur avant la suivante.

---

## RÈGLES GLOBALES (à respecter dans tout le code)

1. Un seul canvas `position:fixed; inset:0; z-index:0`, DOM au-dessus (z-index:1).
2. Aucune valeur animée sans easing. Interdits : mouvements linéaires,
   `transition: all`, snapping brutal.
3. Tout ce qui suit le curseur passe par un lerp : `value += (target - value) * 0.08`
   (0.06–0.12 selon l'élément). Jamais de position curseur appliquée directement.
4. `deltaTime` clampé à 1/30 max dans la boucle physique (pas d'explosion au retour d'onglet).
5. TypeScript strict, pas de `any`.
6. Ne jamais lancer `npm audit fix --force`.

---

## PHASE 0 — Dépendances

Installer et verrouiller :

```
npm i three gsap lenis @dimforge/rapier3d-compat
npm i -D @types/three
```

Vérifier que `npm run dev` démarre toujours. Ne rien changer d'autre.

---

## PHASE 1 — Renderer « qualité studio »

Créer/réécrire `src/gl/Renderer.ts` :

- `import { WebGPURenderer } from 'three/webgpu'` avec `await renderer.init()` ;
  si l'init échoue, fallback silencieux vers `WebGLRenderer({ antialias: true })`.
- Réglages OBLIGATOIRES (c'est ça le « look » propre) :
  - `renderer.toneMapping = THREE.ACESFilmicToneMapping`
  - `renderer.toneMappingExposure = 1.1`
  - `outputColorSpace = SRGBColorSpace`
  - `setPixelRatio(Math.min(devicePixelRatio, 2))`
- Fond de scène : `#f2f2f0` (identique au CSS → le canvas se fond dans la page).
- Environnement : `RoomEnvironment` via `PMREMGenerator` comme `scene.environment`,
  intensité ~0.5. AUCUNE lumière ambiante plate.
- Lumières : 1 `DirectionalLight` (intensité 2.2, position 4/8/6) avec shadow map
  2048, `shadow.radius = 8` (PCFSoftShadowMap en fallback WebGL).
- Caméra : PerspectiveCamera 35° (focale longue = look produit, moins de distorsion),
  position (0, 0.6, 9), légère parallaxe pilotée par le curseur :
  cible ±0.25 en X, ±0.15 en Y, lerp 0.05.
- Boucle : `renderer.setAnimationLoop`, exposer `onFrame(cb)` pour les scènes.
- Resize : observer + debounce, mettre à jour caméra et pixelRatio.

Critère de validation : une simple sphère blanche test doit avoir un dégradé
doux (pas de gris plat), une ombre floue, et bouger légèrement avec le curseur.

---

## PHASE 2 — Hero Balls (la pièce signature)

Créer `src/gl/scenes/HeroBalls.ts` :

**Physique (Rapier)**
- `await RAPIER.init()` puis `new RAPIER.World({ x: 0, y: -3.5, z: 0 })`
  (gravité douce, pas -9.81 : le monde doit sembler « léger »).
- 110 sphères, rayons aléatoires entre 0.18 et 0.55 (distribution biaisée
  vers les petites : `0.18 + Math.pow(Math.random(), 2) * 0.37`).
- `linearDamping = 0.6`, `angularDamping = 0.8`, `restitution = 0.25`,
  `friction = 0.4` → mouvement amorti, jamais nerveux.
- Enceinte invisible : sol + 4 murs colliders dimensionnés depuis le frustum
  caméra à z=0 (recalculés au resize).
- Spawn : positions aléatoires au-dessus du frustum, chute à l'arrivée
  (c'est l'animation d'intro).

**Interaction**
- Curseur = collider sphérique cinématique (rayon 0.9) projeté sur le plan z=0
  via raycast. Sa position suit la souris avec lerp 0.1 → il « pousse »
  les sphères avec inertie.
- Vélocité du scroll (fournie par Lenis) → impulsion verticale douce sur
  toutes les sphères : `impulse.y = scrollVelocity * 0.002`, clampé.
- Au clic : impulsion radiale depuis le point cliqué (force 2.5, rayon 3).

**Rendu**
- UN SEUL `InstancedMesh` (SphereGeometry 32 segments), matériau de base :
  `MeshStandardMaterial` blanc `#f5f5f3`, `roughness 0.85`, `metalness 0`.
- 12 instances « chrome » : second InstancedMesh, `roughness 0.08`,
  `metalness 1` (l'environnement RoomEnvironment fait les reflets).
- `castShadow` + sol invisible receveur d'ombre :
  `ShadowMaterial` avec `opacity 0.12` → ombres de contact douces, essentiel
  pour l'ancrage visuel.
- Synchro physique→rendu chaque frame via `setMatrixAt` + `instanceMatrix.needsUpdate`.

**Budget perf**
- Compteur FPS interne (moyenne glissante 60 frames). Si < 50 fps pendant 2 s :
  réduire pixelRatio à 1.25, puis désactiver les ombres, puis réduire à 70 sphères.
  Ne jamais remonter la qualité (pas de yo-yo).

Critère de validation : les sphères tombent à l'arrivée, se poussent mollement
au passage du curseur, sursautent légèrement au scroll, 60 fps stables.

---

## PHASE 3 — Scroll & motion DOM

1. **Lenis** dans `src/main.ts` : `new Lenis({ lerp: 0.09, wheelMultiplier: 1 })`,
   raf piloté par `gsap.ticker` :
   ```ts
   gsap.ticker.add((t) => lenis.raf(t * 1000));
   gsap.ticker.lagSmoothing(0);
   lenis.on('scroll', ScrollTrigger.update);
   ```
   Exposer `lenis.velocity` au HeroBalls.

2. **Text reveal** (`src/motion/textReveal.ts`) :
   - Split des headlines par lignes (wrapper `overflow:hidden` par ligne).
   - `yPercent: 110 → 0`, `duration 1.1`, `ease: 'power4.out'`, `stagger 0.08`,
     déclenché quand la section entre à 85% du viewport, une seule fois.
   - Les eyebrows : simple fade + `y: 12 → 0`, 0.6 s, précèdent les headlines de 0.15 s.

3. **Boutons magnétiques** (`src/motion/magnetic.ts`) :
   - Zone d'attraction = bounding box + 30 px.
   - Translation max 10 px (bouton) et 4 px (label interne, pour l'effet de
     profondeur), lerp 0.12.
   - Sortie : retour avec `elastic.out(1, 0.4)`, 0.8 s.

4. **Marquee** « CONTINUE TO SCROLL » : translation X infinie en CSS
   (`@keyframes`, 20 s, linear — SEULE exception autorisée au « pas de linear »),
   dupliquer le contenu 2× pour la boucle seamless, `will-change: transform`.

5. **Parallaxe sections** : chaque section a un léger décalage interne au scroll
   (`y: ±40px` via ScrollTrigger scrub 1) → sensation de profondeur.

Critère de validation : le scroll a de l'inertie, les titres se révèlent ligne
par ligne, les boutons « collent » au curseur puis rebondissent en douceur.

---

## PHASE 4 — Intro & finitions

1. **Preloader** : overlay `--bg` avec compteur 0→100 (durée réelle du
   préchargement, minimum 1.2 s), typo display géante. À 100 : le compteur
   glisse vers le haut (`power4.inOut`, 0.9 s), l'overlay se révèle par un
   clip-path vertical, PUIS les sphères tombent, PUIS le headline se révèle.
   Séquence orchestrée dans une seule timeline GSAP maîtresse.
2. **Curseur custom** : point 8 px + cercle 36 px qui suit avec lerp 0.15 ;
   le cercle grossit (scale 1.6) sur les éléments interactifs. Masquer sur mobile.
3. **`prefers-reduced-motion`** : pas de preloader animé, pas de reveals,
   sphères statiques (gravité 0, positions figées), Lenis désactivé.
4. Vérifier : aucun layout shift, la page est lisible canvas désactivé.

---

## DÉFINITION DE « TERMINÉ » POUR LA V-02

- [ ] 60 fps desktop sur la home, scroll compris
- [ ] Rendu : ombres douces visibles sous les sphères, reflets sur les chromées,
      aucun aplat gris
- [ ] Toute interaction (curseur, boutons, scroll) a de l'inertie perceptible
- [ ] Séquence d'intro complète : compteur → reveal → chute → headline
- [ ] Zéro erreur console, TypeScript strict OK
