/**
 * FinWise AI – Main JavaScript
 * Shared utilities — loaded on every page via base.html
 *
 * IMPORTANT: window.FW is defined at the very top so any page-specific
 * script that runs after this file can safely destructure it.
 */

'use strict';

// =========================================================================
// Core helpers — exposed on window.FW immediately
// =========================================================================

/**
 * Format a number as Indian Rupee string  e.g. 12500 → "₹12,500"
 */
function formatINR(n) {
  if (isNaN(n)) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * POST JSON to an endpoint and return the parsed response.
 * Throws an Error (with .message) on non-2xx responses.
 */
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Server error' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

/**
 * Debounce a function call
 */
function debounce(fn, delay) {
  delay = delay || 300;
  var t;
  return function () {
    var args = arguments;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(null, args); }, delay);
  };
}

// Expose immediately — page scripts depend on this being set
window.FW = { formatINR, debounce, postJSON };

// =========================================================================
// DOM-ready initialisation (safe to run after HTML is parsed)
// =========================================================================
document.addEventListener('DOMContentLoaded', function () {

  // -----------------------------------------------------------------------
  // Navbar active-link highlight (client-side fallback)
  // -----------------------------------------------------------------------
  var path = window.location.pathname;
  document.querySelectorAll('.fw-navbar .nav-link, .fw-navbar .btn-fw-outline')
    .forEach(function (link) {
      if (link.getAttribute('href') === path) {
        link.classList.add('active');
      }
    });

  // -----------------------------------------------------------------------
  // Auto-dismiss flash alerts after 5 seconds
  // -----------------------------------------------------------------------
  document.querySelectorAll('.alert.alert-dismissible').forEach(function (el) {
    setTimeout(function () {
      var btn = el.querySelector('.btn-close');
      if (btn) btn.click();
    }, 5000);
  });

  // -----------------------------------------------------------------------
  // Scroll-reveal: fade cards up as they enter the viewport
  // -----------------------------------------------------------------------
  if (!window.IntersectionObserver) return;

  var targets = document.querySelectorAll(
    '.feature-card, .benefit-card, .tech-card, .scam-card, .about-mission-card'
  );

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity  = '1';
        entry.target.style.transform = 'translateY(0)';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(function (el) {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    io.observe(el);
  });

});
