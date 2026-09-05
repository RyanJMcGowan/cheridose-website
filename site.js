const config = window.CHERIDOSE_SITE_CONFIG ?? {};
const appStoreUrl = /^https:\/\/apps\.apple\.com\//.test(config.appStoreUrl)
  ? config.appStoreUrl
  : '';
const interestFormUrl = /^https:\/\//.test(config.interestFormUrl) ? config.interestFormUrl : '';
const supportEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.supportEmail)
  ? config.supportEmail
  : '';
const legalName = typeof config.legalName === 'string' ? config.legalName.trim() : '';

for (const link of document.querySelectorAll('[data-app-store-link]')) {
  if (appStoreUrl) {
    link.href = appStoreUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.removeAttribute('aria-disabled');
    link.removeAttribute('tabindex');
    link.classList.remove('is-pending');
    const kicker = link.querySelector('[data-store-kicker]');
    const name = link.querySelector('[data-store-name]');
    if (kicker && name) {
      kicker.textContent = 'Download on the';
      name.textContent = 'App Store';
    } else {
      link.textContent = 'App Store';
    }
  } else {
    link.tabIndex = -1;
    link.addEventListener('click', (event) => event.preventDefault());
  }
}

for (const link of document.querySelectorAll('[data-support-email]')) {
  if (!supportEmail) continue;

  link.href = `mailto:${supportEmail}`;
  link.textContent = supportEmail;
}

for (const link of document.querySelectorAll('[data-interest-link]')) {
  const label = link.querySelector('[data-interest-link-label]');

  if (interestFormUrl) {
    link.href = interestFormUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    continue;
  }

  if (supportEmail) {
    const subject = encodeURIComponent('Cheridose early access');
    const body = encodeURIComponent(
      'I’m interested in:\n\n[ ] Beta testing Cheridose\n[ ] Being notified when Cheridose reaches the App Store\n\nPlease add this email address to the Cheridose early-access list.',
    );
    link.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    if (label) label.textContent = 'Email us to join';
    continue;
  }

  link.setAttribute('aria-disabled', 'true');
  link.tabIndex = -1;
  link.addEventListener('click', (event) => event.preventDefault());
}

for (const year of document.querySelectorAll('[data-current-year]')) {
  year.textContent = String(new Date().getFullYear());
}

if (legalName) {
  for (const name of document.querySelectorAll('[data-legal-name]')) {
    name.textContent = legalName;
  }
}

for (const menuRoot of document.querySelectorAll('[data-menu-root]')) {
  const menuToggle = menuRoot.querySelector('[data-menu-toggle]');
  const menuPanel = menuRoot.querySelector('[data-menu-panel]');
  if (!menuToggle || !menuPanel) continue;

  const setMenuOpen = (isOpen, returnFocus = false) => {
    menuRoot.dataset.menuOpen = String(isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    menuPanel.setAttribute('aria-hidden', String(!isOpen));
    menuPanel.toggleAttribute('inert', !isOpen);

    if (!isOpen && returnFocus) menuToggle.focus();
  };

  menuToggle.addEventListener('click', () => {
    setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
  });

  menuPanel.addEventListener('click', (event) => {
    const target = event.target;
    const link = target instanceof Element ? target.closest('a') : null;
    if (link && link.getAttribute('aria-disabled') !== 'true') setMenuOpen(false);
  });

  document.addEventListener('click', (event) => {
    if (menuToggle.getAttribute('aria-expanded') !== 'true') return;
    if (event.target instanceof Node && !menuRoot.contains(event.target)) setMenuOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false, true);
    }
  });

  setMenuOpen(false);
}

const demoPhone = document.querySelector('[data-demo-phone]');
const demoProduct = document.querySelector('[data-demo-product]');
const demoOrbit = document.querySelector('[data-demo-orbit]');
const demoClock = document.querySelector('[data-demo-clock]');
const demoTimerLabel = document.querySelector('[data-demo-timer-label]');
const demoTimerValue = document.querySelector('[data-demo-timer-value]');
const demoTimerUnit = document.querySelector('[data-demo-timer-unit]');
const demoPrimary = document.querySelector('[data-demo-primary]');

if (
  demoPhone &&
  demoProduct &&
  demoOrbit &&
  demoClock &&
  demoTimerLabel &&
  demoTimerValue &&
  demoTimerUnit &&
  demoPrimary &&
  typeof window.matchMedia === 'function'
) {
  const mobileDemo = window.matchMedia('(max-width: 720px)');
  const initialClockMinutes = 7 * 60 + 43;
  const initialRemainingMinutes = 17;
  let animationFrame = 0;

  const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
  const easeInOut = (progress) => progress * progress * (3 - 2 * progress);

  const formatClock = (totalMinutes) => {
    const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const hours24 = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period} local`;
  };

  const resetDemo = () => {
    demoPhone.dataset.demoState = 'upcoming';
    demoProduct.dataset.demoState = 'upcoming';
    demoClock.textContent = formatClock(initialClockMinutes);
    demoTimerLabel.textContent = 'Due in';
    demoTimerValue.textContent = String(initialRemainingMinutes);
    demoTimerUnit.textContent = 'min';
    demoTimerUnit.hidden = false;
    demoPrimary.textContent = 'I took these';
    demoPhone.style.setProperty('--demo-progress-angle', '45deg');
    demoPhone.style.setProperty('--demo-progress-start', '-45deg');
    demoPhone.style.setProperty('--demo-phone-tilt', '-2.25deg');
  };

  const renderDemo = () => {
    animationFrame = 0;
    if (!mobileDemo.matches) {
      resetDemo();
      return;
    }

    const orbitRect = demoOrbit.getBoundingClientRect();
    const orbitCenter = orbitRect.top + orbitRect.height / 2;
    const viewportHeight = window.innerHeight;
    const countdownStart = viewportHeight * 0.69;
    const dueStart = viewportHeight * 0.18;
    const overdueStart = viewportHeight * 0.1;
    const tiltEnd = viewportHeight * -0.12;
    const tiltProgress = clamp((countdownStart - orbitCenter) / (countdownStart - tiltEnd), 0, 1);
    const phoneTilt = -2.25 + easeInOut(tiltProgress) * 4.5;
    let minutesUntil;

    if (orbitCenter >= countdownStart) {
      minutesUntil = initialRemainingMinutes;
    } else if (orbitCenter > dueStart) {
      const progress = clamp((countdownStart - orbitCenter) / (countdownStart - dueStart), 0, 1);
      minutesUntil = Math.max(1, Math.ceil(initialRemainingMinutes * (1 - progress)));
    } else if (orbitCenter > overdueStart) {
      const progress = clamp((dueStart - orbitCenter) / (dueStart - overdueStart), 0, 1);
      minutesUntil = -Math.round(progress * 5);
    } else {
      const progress = clamp((overdueStart - orbitCenter) / (viewportHeight * 0.22), 0, 1);
      minutesUntil = -(6 + Math.round(progress * 39));
    }

    const state = minutesUntil > 0 ? 'upcoming' : minutesUntil >= -5 ? 'due' : 'overdue';
    const elapsedMinutes = initialRemainingMinutes - minutesUntil;
    const progressAngle =
      state === 'upcoming'
        ? Math.round((minutesUntil / initialRemainingMinutes) * 45)
        : state === 'overdue'
          ? Math.round((Math.min(Math.abs(minutesUntil), 12 * 60) / (12 * 60)) * 360)
          : 0;

    demoPhone.dataset.demoState = state;
    demoProduct.dataset.demoState = state;
    demoClock.textContent = formatClock(initialClockMinutes + elapsedMinutes);
    demoPhone.style.setProperty('--demo-progress-angle', `${progressAngle}deg`);
    demoPhone.style.setProperty(
      '--demo-progress-start',
      state === 'upcoming' ? `${-progressAngle}deg` : '0deg',
    );
    demoPhone.style.setProperty('--demo-phone-tilt', `${phoneTilt.toFixed(3)}deg`);

    if (state === 'due') {
      demoTimerLabel.textContent = 'Due';
      demoTimerValue.textContent = 'Now';
      demoTimerUnit.hidden = true;
      demoPrimary.textContent = 'I took these';
      return;
    }

    demoTimerLabel.textContent = state === 'overdue' ? 'Overdue' : 'Due in';
    demoTimerValue.textContent = String(Math.abs(minutesUntil));
    demoTimerUnit.textContent = 'min';
    demoTimerUnit.hidden = false;
    demoPrimary.textContent = state === 'overdue' ? 'I took these now' : 'I took these';
  };

  const requestDemoRender = () => {
    if (animationFrame) return;
    animationFrame = window.requestAnimationFrame(renderDemo);
  };

  window.addEventListener('scroll', requestDemoRender, { passive: true });
  window.addEventListener('resize', requestDemoRender);
  mobileDemo.addEventListener?.('change', requestDemoRender);
  requestDemoRender();
}
