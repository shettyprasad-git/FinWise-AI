/**
 * FinWise AI – Contact Page JavaScript
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

  var form      = document.getElementById('contactForm');
  var msgInput  = document.getElementById('message');
  var msgCount  = document.getElementById('msgCharCount');

  if (!form) return; // not on contact page

  // -------------------------------------------------------------------------
  // Character counter for message textarea
  // -------------------------------------------------------------------------
  if (msgInput && msgCount) {
    msgInput.addEventListener('input', function () {
      var len = msgInput.value.length;
      msgCount.textContent = len + ' / 1000';
      msgCount.style.color = len > 900 ? '#da1e28' : '';
      if (msgInput.value.trim().length > 0) clearError('message');
    });
  }

  // -------------------------------------------------------------------------
  // Show / clear inline field errors
  // -------------------------------------------------------------------------
  function showError(fieldId, msg) {
    var errEl = document.getElementById(fieldId + 'Error');
    var input = document.getElementById(fieldId);
    if (errEl) errEl.textContent = msg;
    if (input) {
      input.style.borderColor = '#da1e28';
      input.style.boxShadow   = '0 0 0 3px rgba(218,30,40,0.12)';
    }
  }

  function clearError(fieldId) {
    var errEl = document.getElementById(fieldId + 'Error');
    var input = document.getElementById(fieldId);
    if (errEl) errEl.textContent = '';
    if (input) {
      input.style.borderColor = '';
      input.style.boxShadow   = '';
    }
  }

  ['name', 'email', 'subject'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { clearError(id); });
  });

  // -------------------------------------------------------------------------
  // Validate on submit
  // -------------------------------------------------------------------------
  form.addEventListener('submit', function (e) {
    var nameEl    = document.getElementById('name');
    var emailEl   = document.getElementById('email');
    var subjEl    = document.getElementById('subject');
    var messageEl = document.getElementById('message');

    var name    = nameEl    ? nameEl.value.trim()    : '';
    var email   = emailEl   ? emailEl.value.trim()   : '';
    var subject = subjEl    ? subjEl.value            : '';
    var message = messageEl ? messageEl.value.trim() : '';

    var valid = true;
    var emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || name.length < 2) {
      showError('name', name ? 'Name must be at least 2 characters.' : 'Full name is required.');
      valid = false;
    } else { clearError('name'); }

    if (!email || !emailRx.test(email)) {
      showError('email', email ? 'Please enter a valid email address.' : 'Email address is required.');
      valid = false;
    } else { clearError('email'); }

    if (!subject) {
      showError('subject', 'Please select a subject.');
      valid = false;
    } else { clearError('subject'); }

    if (!message || message.length < 10) {
      showError('message', message ? 'Message must be at least 10 characters.' : 'Message cannot be empty.');
      valid = false;
    } else { clearError('message'); }

    if (!valid) {
      e.preventDefault();
      // Scroll to first visible error
      var firstErr = form.querySelector('[style*="border-color"]');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

}); // end DOMContentLoaded
