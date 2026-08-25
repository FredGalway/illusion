import gsap from 'gsap';

const VIDEO_ID = 'AKueRGrUSPY';

export function initReelModal(lenis: { stop(): void; start(): void }) {
  const modal = document.getElementById('reel-modal')!;
  const iframe = document.getElementById('reel-iframe') as HTMLIFrameElement;
  const closeBtn = modal.querySelector('.reel-modal__close')!;

  const open = () => {
    lenis.stop();
    // src posé à l'ouverture -> l'autoplay part avec le geste utilisateur
    iframe.src = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&vq=hd720&start=20&playsinline=0`;
    modal.removeAttribute('hidden');
    gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
  };

  const close = () => {
    gsap.to(modal, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        modal.setAttribute('hidden', '');
        iframe.src = ''; // stoppe la lecture ET le son
        lenis.start();
      },
    });
  };

  document.querySelectorAll('[data-open-reel]').forEach((b) =>
    b.addEventListener('click', open),
  );
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) close();
  });
}