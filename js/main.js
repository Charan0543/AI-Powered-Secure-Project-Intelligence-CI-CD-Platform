/**
 * Nexorian Landing Page JavaScript
 * Handles:
 * - 3-Stage Choreographed Scroll Motion Flow:
 *     Stage 1: Hero Text 3D Inward Recession (moves inward away from viewer without upward movement)
 *     Stage 2: Minimal Studio Display (smooth straight upward reveal without zoom/scale artifacts)
 *     Stage 3: 6 Context Bars (rises smoothly from below into position, then gentle visible floating)
 * - Core Capabilities Section Staggered Entrance
 * - Sticky Header Dynamic Atmosphere
 * - Milestone Toast Notifications for Secondary Actions
 * - Accessible Mobile Navigation Toggle
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const toastNotification = document.getElementById('cta-toast');
  const toastMessageText = document.getElementById('toast-message-text');
  const toastCloseBtn = document.getElementById('toast-close-btn');
  const secondaryCtaButtons = document.querySelectorAll('.cta-action-btn');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const headerNav = document.getElementById('header-nav');
  const siteHeader = document.getElementById('site-header');

  // Stage Elements
  const heroTextBlock = document.getElementById('hero-text-block');
  const monitorStage = document.getElementById('monitor-stage');
  const stage3Cards = document.querySelectorAll('.stage3-card');
  const featuresSection = document.getElementById('features');
  const trustSection = document.getElementById('trust');

  const TOAST_DEFAULT_MESSAGE = 'This flow will be available in the next milestone.';
  let toastTimer = null;

  /**
   * Shows the accessible live region toast notification
   * @param {string} message 
   */
  function showToast(message = TOAST_DEFAULT_MESSAGE) {
    if (!toastNotification) return;

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    if (toastMessageText) {
      toastMessageText.textContent = message;
    }

    toastNotification.removeAttribute('hidden');
    void toastNotification.offsetWidth;
    toastNotification.classList.add('is-visible');

    toastTimer = setTimeout(() => {
      hideToast();
    }, 4500);
  }

  /**
   * Hides the toast notification
   */
  function hideToast() {
    if (!toastNotification) return;

    toastNotification.classList.remove('is-visible');

    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }

    setTimeout(() => {
      if (!toastNotification.classList.contains('is-visible')) {
        toastNotification.setAttribute('hidden', '');
      }
    }, 300);
  }

  // Attach click events to secondary CTA buttons
  secondaryCtaButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showToast(TOAST_DEFAULT_MESSAGE);
    });
  });

  if (toastCloseBtn) {
    toastCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      hideToast();
    });
  }

  // Dismiss toast on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toastNotification && toastNotification.classList.contains('is-visible')) {
      hideToast();
    }
  });

  // Mobile Navigation Toggle
  if (mobileMenuBtn && headerNav) {
    mobileMenuBtn.addEventListener('click', () => {
      const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      mobileMenuBtn.setAttribute('aria-expanded', String(!isExpanded));
      headerNav.classList.toggle('is-open');
    });

    document.addEventListener('click', (e) => {
      if (headerNav.classList.contains('is-open') && !headerNav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        headerNav.classList.remove('is-open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Check for prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    if (heroTextBlock) {
      heroTextBlock.style.opacity = '1';
      heroTextBlock.style.transform = 'none';
    }
    if (monitorStage) monitorStage.classList.add('is-revealed');
    stage3Cards.forEach(c => c.classList.add('is-revealed'));
    if (featuresSection) featuresSection.classList.add('is-revealed');
    if (trustSection) trustSection.classList.add('is-revealed');
    return;
  }

  /* --------------------------------------------------------------------------
     Three-Stage Scroll Orchestration (Inward Hero Recession without upward shift)
     -------------------------------------------------------------------------- */

  let stage2Triggered = false;
  let stage3Triggered = false;

  const onScrollHandler = () => {
    const scrollY = window.scrollY || window.pageYOffset;

    // Sticky Header Styling on Scroll
    if (siteHeader) {
      if (scrollY > 20) {
        siteHeader.style.boxShadow = '0 4px 20px -4px rgba(15, 23, 42, 0.08)';
        siteHeader.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
      } else {
        siteHeader.style.boxShadow = 'none';
        siteHeader.style.backgroundColor = 'rgba(255, 255, 255, 0.88)';
      }
    }

    // Stage 1: Hero Text 3D Inward Recession (Strictly inward Z-space, NO upward shift)
    if (heroTextBlock) {
      const scrollProgress = Math.min(1, Math.max(0, scrollY / 220));
      
      if (scrollProgress === 0) {
        heroTextBlock.style.transform = 'perspective(1000px) translateZ(0px) scale(1)';
        heroTextBlock.style.opacity = '1';
        heroTextBlock.style.pointerEvents = 'auto';
      } else {
        const translateZ = -scrollProgress * 280;
        const scale = 1 - (scrollProgress * 0.14);
        const opacity = Math.max(0, 1 - (scrollProgress * 1.05));

        // Note: No translateY movement at all - strictly inward recession
        heroTextBlock.style.transform = `perspective(1000px) translateZ(${translateZ.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        heroTextBlock.style.opacity = opacity.toFixed(3);
        heroTextBlock.style.pointerEvents = opacity < 0.15 ? 'none' : 'auto';
      }
    }

    // Stage 2: Monitor Section Straight Upward Reveal (No scale/zoom artifact)
    if (!stage2Triggered && scrollY > 35) {
      stage2Triggered = true;
      if (monitorStage) {
        monitorStage.classList.add('is-revealed');
      }

      // Stage 3: 6 Context Bars Rise from Below and Settle after monitor
      if (!stage3Triggered) {
        stage3Triggered = true;
        setTimeout(() => {
          stage3Cards.forEach(card => {
            card.classList.add('is-revealed');
          });
        }, 220);
      }
    }
  };

  window.addEventListener('scroll', onScrollHandler, { passive: true });
  onScrollHandler(); // Run on initial load

  // IntersectionObserver for Stage 2 & 3 as additional guarantee on all viewports
  if ('IntersectionObserver' in window) {
    const ecosystemSection = document.getElementById('platform-visual');
    if (ecosystemSection) {
      const ecosystemObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (!stage2Triggered) {
              stage2Triggered = true;
              if (monitorStage) monitorStage.classList.add('is-revealed');
            }
            if (!stage3Triggered) {
              stage3Triggered = true;
              setTimeout(() => {
                stage3Cards.forEach(c => c.classList.add('is-revealed'));
              }, 220);
            }
          }
        });
      }, {
        threshold: 0.08
      });

      ecosystemObserver.observe(ecosystemSection);
    }

    // Features Section & Trust Section Staggered Reveal
    const sectionObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12
    });

    if (featuresSection) sectionObserver.observe(featuresSection);
    if (trustSection) sectionObserver.observe(trustSection);
  }
});
