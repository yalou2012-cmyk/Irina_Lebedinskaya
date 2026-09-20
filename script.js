'use strict';

document.documentElement.classList.add('js');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const mobileViewport = window.matchMedia('(max-width: 800px)');

function closeMenu(returnFocus = false) {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.innerHTML = 'Меню <span aria-hidden="true">＋</span>';
  if (returnFocus) menuButton.focus();
}

function syncMenu() {
  menuButton.hidden = !mobileViewport.matches;
  closeMenu();
}

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  if (isOpen) closeMenu();
  else {
    navigation.classList.add('is-open');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.innerHTML = 'Закрыть <span aria-hidden="true">−</span>';
  }
});
navigation.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || !mobileViewport.matches) return;
  closeMenu();
  const destination = document.querySelector(link.getAttribute('href'));
  if (destination) {
    destination.setAttribute('tabindex', '-1');
    destination.focus({ preventScroll: true });
    destination.addEventListener('blur', () => destination.removeAttribute('tabindex'), { once: true });
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.header')) closeMenu();
});
mobileViewport.addEventListener('change', syncMenu);
syncMenu();
document.querySelector('#year').textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('is-pending');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(element => {
    element.classList.add('is-pending');
    observer.observe(element);
  });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      observer.disconnect();
      document.querySelectorAll('.is-pending').forEach(element => element.classList.remove('is-pending'));
    }
  });
}

// Содержимое редактируется отдельно, в data/reflections.js.
(() => {
  const block = document.querySelector('#reflections');
  const phrases = typeof reflections === 'undefined' || !Array.isArray(reflections)
    ? [] : reflections.filter(text => typeof text === 'string' && text.trim()).map(text => text.trim());
  if (!block || !phrases.length) return;
  const text = block.querySelector('.reflection-text');
  const stage = block.querySelector('.reflection-stage');
  const toggle = block.querySelector('.reflection-toggle');
  const next = block.querySelector('.reflection-next');
  const controls = block.querySelector('.reflection-controls');
  let index = 0;
  let timer;
  let transitionTimer;
  let hovering = false;
  let touching = false;
  let focused = false;
  let paused = reducedMotion.matches;
  text.textContent = phrases[index];
  block.hidden = false;
  controls.hidden = phrases.length < 2;

  function stop() {
    clearTimeout(timer);
    clearTimeout(transitionTimer);
    text.classList.remove('is-changing');
  }
  function schedule() {
    clearTimeout(timer);
    if (phrases.length > 1 && !paused && !hovering && !touching && !focused && !document.hidden) {
      timer = setTimeout(() => change(false), 7000);
    }
  }
  function change(manual) {
    stop();
    const replace = () => {
      index = (index + 1) % phrases.length;
      text.setAttribute('aria-live', manual ? 'polite' : 'off');
      text.textContent = phrases[index];
      text.classList.remove('is-changing');
      schedule();
    };
    if (reducedMotion.matches) replace();
    else {
      text.classList.add('is-changing');
      transitionTimer = setTimeout(replace, 450);
    }
  }
  function label() {
    toggle.textContent = paused ? 'Продолжить смену' : 'Остановить смену';
  }
  toggle.addEventListener('click', () => { paused = !paused; label(); stop(); schedule(); });
  next.addEventListener('click', () => change(true));
  block.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') { hovering = true; stop(); }
  });
  block.addEventListener('pointerleave', () => { hovering = false; schedule(); });
  block.addEventListener('pointerdown', () => { touching = true; stop(); });
  window.addEventListener('pointerup', () => { if (touching) { touching = false; schedule(); } });
  window.addEventListener('pointercancel', () => { touching = false; schedule(); });
  block.addEventListener('focusin', () => { focused = true; stop(); });
  block.addEventListener('focusout', event => {
    if (!block.contains(event.relatedTarget)) { focused = false; stop(); schedule(); }
  });
  document.addEventListener('visibilitychange', () => { stop(); schedule(); });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) { paused = true; label(); stop(); }
  });

  // Измеряем длиннейшую фразу: при смене текста соседние секции не прыгают.
  const measure = document.createElement('p');
  measure.className = 'reflection-text reflection-measure';
  measure.setAttribute('aria-hidden', 'true');
  stage.append(measure);
  function reserveSpace() {
    let height = 0;
    phrases.forEach(phrase => { measure.textContent = phrase; height = Math.max(height, measure.getBoundingClientRect().height); });
    stage.style.minHeight = `${Math.ceil(height)}px`;
  }
  reserveSpace();
  window.addEventListener('resize', reserveSpace);
  if (document.fonts) document.fonts.ready.then(reserveSpace);
  label();
  schedule();
})();
