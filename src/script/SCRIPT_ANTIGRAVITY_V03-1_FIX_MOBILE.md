# SCRIPT ANTIGRAVITY — V-03.1 « Fix freeze mobile/tablette »

> Symptôme : gel complet sur smartphone/tablette en bas de page ou au clic
> sur un lien d'ancre. Desktop OK.
> Causes traitées (par ordre d'impact) :
> A. Spirale de la mort physique (boucle Rapier non bornée)
> B. Ancres natives court-circuitant Lenis → vélocité géante → explosion
> C. Budget GPU mobile dépassé → contexte WebGL tué par iOS/Android
> D. Absence de garde-fous (context lost, onglet en arrière-plan)
> Appliquer TOUTES les phases. Tester sur vrai device après chaque phase.

---

## PHASE A — Boucle physique à pas fixe borné (le fix du gel)

Dans HeroBalls / le stepper Rapier, remplacer tout `world.step()` piloté
par le deltaTime brut par un accumulateur BORNÉ :

```ts
const FIXED_DT = 1 / 60;
const MAX_STEPS = 3;          // JAMAIS plus, même en retard
let accumulator = 0;

update(dt: number) {
  // dt clampé : un retour d'onglet ou un gros frame ne crée pas de rattrapage
  accumulator += Math.min(dt, 0.1);
  let steps = 0;
  while (accumulator >= FIXED_DT && steps < MAX_STEPS) {
    this.world.step();
    accumulator -= FIXED_DT;
    steps++;
  }
  // si on est en retard de plus de MAX_STEPS : on JETTE le surplus
  if (accumulator > FIXED_DT * MAX_STEPS) accumulator = 0;
}
```

Règle absolue : le nombre de `world.step()` par frame est plafonné.
Si le device rame, la physique ralentit visuellement (acceptable) au lieu
de bloquer le thread principal (inacceptable).

Ajouter aussi un garde NaN : une fois par seconde, vérifier la position du
premier body ; si `Number.isNaN`, reset des positions de toutes les sphères
dans le frustum (respawn silencieux).

---

## PHASE B — Ancres pilotées par Lenis + vélocité bornée

1. Intercepter TOUS les liens d'ancre internes :

```ts
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(a.hash);
    if (target) lenis.scrollTo(target as HTMLElement, {
      duration: 1.4,
      easing: (t: number) => 1 - Math.pow(1 - t, 4), // power4.out
    });
  });
});
```

→ plus jamais de saut instantané : le scroll vers l'ancre est animé,
la vélocité reste réaliste, le SceneDirector joue ses transitions normalement.

2. Borner la vélocité injectée dans la physique, quoi qu'il arrive :

```ts
const v = clamp(lenis.velocity, -60, 60);
const impulseY = clamp(v * 0.002, -0.08, 0.08);
```

3. Le mode `burst` de la section CTA : ajouter un cooldown de 1.5 s
(impossible de le re-déclencher en boucle si on scrolle vite autour du seuil).

---

## PHASE C — Profil de qualité par device (budget GPU mobile)

Créer `src/gl/quality.ts` :

```ts
export type Tier = 'high' | 'medium' | 'low';

export function detectTier(): Tier {
  const coarse = matchMedia('(pointer: coarse)').matches; // tactile
  const mem = (navigator as any).deviceMemory ?? 4;       // Go, Chrome only
  const small = Math.min(screen.width, screen.height) < 800;
  if (coarse && (small || mem <= 4)) return 'low';        // smartphone
  if (coarse) return 'medium';                            // tablette
  return 'high';                                          // desktop
}
```

Table de réglages À APPLIQUER PARTOUT (Renderer + HeroBalls + Gallery) :

| Réglage            | high  | medium | low   |
|--------------------|-------|--------|-------|
| pixelRatio max     | 2     | 1.5    | 1.25  |
| antialias          | true  | true   | false |
| Sphères            | 110   | 70     | 45    |
| Segments sphère    | 32    | 24     | 16    |
| Ombres             | 2048 PCFSoft | 1024 PCF | AUCUNE (fake : disque radial-gradient sous l'amas, en CSS ou plane texturé) |
| RoomEnvironment    | 256   | 128    | 128   |
| RGB shift galerie  | on    | on     | off   |
| Screen-shake       | on    | off    | off   |
| Sons collision     | on    | on     | off   |

La FPS ladder existante reste active EN PLUS (elle ne fait que descendre).

---

## PHASE D — Garde-fous vitaux

1. **Contexte WebGL perdu** (iOS le fait sans prévenir) :

```ts
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  renderer.setAnimationLoop(null);   // stoppe tout proprement
});
canvas.addEventListener('webglcontextrestored', () => {
  // Recréer renderer + rebind des scènes, ou à minima :
  location.reload();
});
```

Le site DOIT rester lisible même sans canvas (le DOM porte tout le contenu —
vérifier qu'aucun texte n'attend une animation GSAP pour devenir visible :
les reveals doivent avoir un fallback `visibility` après 2 s max).

2. **Onglet en arrière-plan** :

```ts
document.addEventListener('visibilitychange', () => {
  if (document.hidden) renderer.setAnimationLoop(null);
  else renderer.setAnimationLoop(loop); // accumulator déjà protégé Phase A
});
```

3. **Tactile propre** :
- CSS sur le canvas : `touch-action: pan-y;` (le scroll vertical reste natif,
  pas de blocage du geste).
- Le collider curseur : sur tactile, il suit le dernier touch UNIQUEMENT
  pendant le contact, puis se gare hors frustum (sinon il reste au milieu
  et pousse les sphères en continu).
- `deviceorientation` : ne JAMAIS attacher le listener au chargement.
  Uniquement dans le Playground, après tap explicite sur un bouton
  « Activer le gyroscope » (iOS exige `DeviceOrientationEvent.requestPermission()`
  dans un geste utilisateur, sinon exception).

4. **Écouteurs passifs** : tous les `touchstart/touchmove` ajoutés à la main
   doivent être `{ passive: true }` (sauf si preventDefault indispensable).

---

## PHASE E — Vérification

1. `npm run build && npm run preview -- --host` puis tester sur le device
   via l'IP locale, OU redéployer sur Vercel.
2. Debug distant : Android → chrome://inspect ; iPhone/iPad → Safari macOS
   → Réglages iOS > Safari > Avancé > Inspecteur web. Regarder la console
   AU MOMENT du gel : « context lost », erreur Rapier, ou rien (= spirale CPU).
3. Checklist device réel (pas le mode responsive du navigateur, qui ne
   simule NI le GPU ni la mémoire) :
   - [ ] Scroll rapide jusqu'en bas ×5 : pas de gel
   - [ ] Clic sur chaque lien d'ancre : scroll animé fluide, pas de saut
   - [ ] Section CTA : burst joué une fois, pas en rafale
   - [ ] Verrouiller/déverrouiller l'écran : le site reprend
   - [ ] Basculer d'app et revenir : le site reprend, sphères sages
