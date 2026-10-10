/* Copyright 2026 AIDevKSH. Licensed under the Apache License, Version 2.0. */
(() => {
  'use strict';
  const progress = document.getElementById('reading-progress');
  let queued = false;
  function updateProgress() {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${available > 0 ? Math.min(100, window.scrollY / available * 100) : 0}%`;
    queued = false;
  }
  window.addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();
  document.querySelectorAll('.print-button').forEach(button => button.addEventListener('click', () => window.print()));
  const links = Array.from(document.querySelectorAll('.toc-link'));
  const sections = links.map(link => document.querySelector(link.getAttribute('href')));
  function markCurrent() {
    let current = sections[0];
    sections.forEach(section => { if (section.getBoundingClientRect().top <= 180) current = section; });
    links.forEach(link => {
      const active = link.getAttribute('href') === `#${current.id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', markCurrent, { passive: true });
  markCurrent();
})();
