# SCRIPT ANTIGRAVITY — V-03.2 « Template page projet, patterns Lusion »

> Référence analysée : lusion.co/projects/ddd_2024
> Objectif : aligner le template de page projet (Phase 7) sur leurs patterns
> réels. Prérequis : V-03 Phase 7 + fixes V-03.1 appliqués.

---

## 1. STRUCTURE DU TEMPLATE (DOM minimal, comme Lusion)

```
<article class="project">
  <header>              — hero : titre géant + média principal (WebGL/vidéo)
  <p class="pitch">     — 2 phrases MAX
  <a class="launch">    — « Voir le projet » (lien externe si dispo)
  <dl class="meta">     — Services (4-6 items) / Année / Client / Links
  <section class="media-flow">  — 3 à 6 blocs média full-bleed (voir §2)
  <section class="next">        — projet suivant (voir §3)
</article>
+ shell persistant (déjà existant) : CTA global, marquee, footer, PLAY/MUTE.
```

Règle : AUCUN paragraphe de plus de 3 lignes. Le média raconte, le texte
légende. Les données viennent de `src/data/projects.ts` (ajouter les champs
`services: string[]`, `year`, `client`, `launchUrl?`, `media: MediaBlock[]`).

## 2. MEDIA-FLOW (le corps du case study)

- Chaque `MediaBlock` = { type: 'video' | 'image', src, caption?, layout:
  'full' | 'left' | 'right' }.
- Vidéos : mp4 H.264 auto-hébergées, `muted playsinline loop`, SANS contrôles,
  lecture/pause pilotée par IntersectionObserver (play à 40% visible,
  pause sinon) → jamais plus de 2 vidéos qui décodent en même temps.
- `loading="lazy"` + `preload="none"` partout ; le hero média est le SEUL
  préchargé.
- Parallaxe interne : chaque média translate de ±6% dans son masque au scroll
  (ScrollTrigger scrub 1) — le « slide dans la fenêtre » signature.
- Tier `low` (mobile) : les vidéos deviennent des posters image + bouton play.

## 3. LE PATTERN « SCROLL-THROUGH » VERS LE PROJET SUIVANT

Le pattern signature de Lusion : pas de clic pour continuer, on SCROLLE.

- Section `.next` en bas : eyebrow « NEXT PROJECT » + titre géant du projet
  suivant + son média hero en fond (déjà chargé, discret).
- Quand la section est pleinement visible ET que l'utilisateur continue de
  scroller au-delà de la fin : une jauge circulaire fine autour du curseur
  (desktop) / une barre en bas d'écran (mobile) se remplit proportionnellement
  à l'overscroll accumulé (Lenis expose le dépassement ; sinon cumuler les
  deltas wheel/touch en butée, avec fuite de 0.4/s quand on s'arrête).
- Jauge pleine (~600 unités de delta) → navigation vers le projet suivant :
  le titre `.next` remonte et DEVIENT le hero de la page suivante
  (position partagée, FLIP ou tween manuel), le média s'étend en plein cadre.
- Annulation possible tant que la jauge n'est pas pleine (scroll inverse).
- Fallback : le titre est aussi un lien cliquable normal (accessibilité,
  et c'est ce que fait Lusion).
- Ordre : dernier projet → boucle vers le premier.

## 4. SHELL PERSISTANT

- Vérifier que CTA global, marquee, footer, PLAY/MUTE, curseur custom sont
  montés UNE FOIS dans App.ts et survivent aux navigations du router maison
  (jamais re-créés, jamais re-animés à l'identique).
- Le lien « back » en haut de page projet → retour à /projects avec la
  transition inverse de l'ouverture.

## 5. À NE PAS COPIER DE LUSION

- INTERDIT : `user-scalable=no` / `maximum-scale=1` dans le viewport meta.
  On garde le zoom utilisateur. Les conflits gestuels sont déjà réglés par
  `touch-action: pan-y` (V-03.1 Phase D).

## VALIDATION

- [ ] Page projet : DOM léger, texte minimal, médias lazy, vidéos qui se
      coupent hors viewport
- [ ] Overscroll en bas → jauge → transition vers le projet suivant,
      annulable, ET titre cliquable en fallback
- [ ] Navigation projet→projet en boucle sans rechargement, shell intact
- [ ] Mobile tier low : posters à la place des vidéos, tout reste fluide
