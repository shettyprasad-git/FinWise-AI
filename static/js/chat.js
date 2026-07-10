/**
 * FinWise AI – Chat Page JavaScript
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

  var formatINR = window.FW.formatINR;
  var postJSON  = window.FW.postJSON;

  // -------------------------------------------------------------------------
  // DOM references
  // -------------------------------------------------------------------------
  var chatMessages    = document.getElementById('chatMessages');
  var chatForm        = document.getElementById('chatForm');
  var chatInput       = document.getElementById('chatInput');
  var sendBtn         = document.getElementById('sendBtn');
  var typingIndicator = document.getElementById('typingIndicator');
  var charCounter     = document.getElementById('charCounter');
  var clearBtns       = document.querySelectorAll('#clearChatBtn, #clearChatBtnMobile');
  var topicBtns       = document.querySelectorAll('.topic-btn');

  if (!chatForm || !chatInput || !sendBtn) return; // not on chat page

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/`(.+?)`/g,       '<code>$1</code>')
      .replace(/\n/g,             '<br />');
  }

  function nowTime() {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // -------------------------------------------------------------------------
  // Append a message bubble
  // -------------------------------------------------------------------------
  function appendMessage(role, text, time) {
    var isUser     = role === 'user';
    var wrapper    = document.createElement('div');
    wrapper.className = 'message-wrapper ' + role;

    var avatarIcon = isUser ? 'bi-person-fill' : 'bi-cpu-fill';
    var metaName   = isUser ? 'You' : 'FinWise AI';
    var rendered   = isUser
      ? escapeHTML(text)
      : renderMarkdown(escapeHTML(text));

    wrapper.innerHTML =
      '<div class="msg-avatar"><i class="bi ' + avatarIcon + '"></i></div>' +
      '<div class="msg-content">' +
        '<div class="msg-bubble">' + rendered + '</div>' +
        '<div class="msg-meta">' + metaName + ' &middot; ' + (time || nowTime()) + '</div>' +
      '</div>';

    chatMessages.appendChild(wrapper);
    scrollToBottom();
    return wrapper;
  }

  // -------------------------------------------------------------------------
  // Typing indicator
  // -------------------------------------------------------------------------
  function showTyping() {
    typingIndicator.classList.remove('d-none');
    scrollToBottom();
  }
  function hideTyping() {
    typingIndicator.classList.add('d-none');
  }

  // -------------------------------------------------------------------------
  // Send a message
  // -------------------------------------------------------------------------
  function sendMessage(text) {
    text = (text || '').trim();
    if (!text) return;

    appendMessage('user', text);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    charCounter.textContent = '0 / 500';
    sendBtn.disabled = true;
    showTyping();

    postJSON('/api/chat', { message: text })
      .then(function (data) {
        hideTyping();
        appendMessage('assistant', data.reply, data.timestamp);
      })
      .catch(function () {
        hideTyping();
        appendMessage('assistant', 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.');
      })
      .finally(function () {
        sendBtn.disabled = false;
        chatInput.focus();
      });
  }

  // -------------------------------------------------------------------------
  // Form submit
  // -------------------------------------------------------------------------
  chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    sendMessage(chatInput.value);
  });

  // -------------------------------------------------------------------------
  // Enter = send, Shift+Enter = new line
  // -------------------------------------------------------------------------
  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput.value);
    }
  });

  // -------------------------------------------------------------------------
  // Auto-resize textarea + char counter
  // -------------------------------------------------------------------------
  chatInput.addEventListener('input', function () {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    charCounter.textContent = chatInput.value.length + ' / 500';
    charCounter.style.color = chatInput.value.length > 450 ? '#da1e28' : '';
  });

  // -------------------------------------------------------------------------
  // Clear chat
  // -------------------------------------------------------------------------
  function clearChat() {
    if (!confirm('Clear the entire chat history?')) return;
    chatMessages.innerHTML = '';
    appendMessage('assistant', 'Chat cleared. How can I help you with your finances today?');
  }

  clearBtns.forEach(function (btn) {
    btn.addEventListener('click', clearChat);
  });

  // -------------------------------------------------------------------------
  // Suggested topic buttons
  // -------------------------------------------------------------------------
  topicBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var query = btn.dataset.query;
      if (!query) return;
      // Close mobile offcanvas if open
      var offcanvas = document.getElementById('topicsOffcanvas');
      if (offcanvas && window.bootstrap) {
        var bsOff = bootstrap.Offcanvas.getInstance(offcanvas);
        if (bsOff) bsOff.hide();
      }
      sendMessage(query);
    });
  });

  // Focus input on load
  chatInput.focus();

}); // end DOMContentLoaded
