(function () {
  'use strict';

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function safeText(value, fallback = '-') {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setText(selector, value, root = document) {
    const el = $(selector, root);
    if (el) el.textContent = safeText(value, '');
  }

  function show(el) {
    if (typeof el === 'string') el = $(el);
    if (el) el.hidden = false;
  }

  function hide(el) {
    if (typeof el === 'string') el = $(el);
    if (el) el.hidden = true;
  }

  function setLoading(button, isLoading, text = 'กำลังโหลด...') {
    if (!button) return;

    if (isLoading) {
      button.dataset.oldText = button.textContent;
      button.disabled = true;
      button.textContent = text;
      button.classList.add('is-loading');
    } else {
      button.disabled = false;
      button.textContent = button.dataset.oldText || button.textContent;
      button.classList.remove('is-loading');
    }
  }

  function toast(message, type = 'info') {
    const old = document.querySelector('.app-toast');
    if (old) old.remove();

    const el = document.createElement('div');
    el.className = `app-toast ${type}`;
    el.textContent = message;
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.add('show');
    });

    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, 2800);
  }

  function getParam(name) {
    return new URLSearchParams(location.search).get(name) || '';
  }

  function normalizeId(value) {
    return String(value || '').trim().toUpperCase();
  }

 function goCheck(id) {
  id = normalizeId(id);

  if (!id) {
    toast('กรุณากรอกหมายเลขถัง', 'warning');
    return;
  }

  if (id.startsWith('HTTP://') || id.startsWith('HTTPS://')) {
    toast('QR Code นี้ไม่มีหมายเลขถัง กรุณาสแกน QR ของถังดับเพลิง', 'warning');
    return;
  }

  location.href = `/fire-extinguisher/check.html?id=${encodeURIComponent(id)}`;
}

  function downloadBase64File(base64, fileName, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {
      type: mimeType || 'application/octet-stream'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();

    a.remove();
    URL.revokeObjectURL(url);
  }

  function openExternalBrowserHint() {
    const current = location.href;

    return `
      <div class="line-hint">
        <strong>ถ้าเปิดกล้องใน LINE ไม่ได้</strong>
        <span>ให้กดเมนูมุมขวาบน แล้วเลือก “เปิดในเบราว์เซอร์”</span>
        <button type="button" class="btn ghost small" onclick="navigator.clipboard && navigator.clipboard.writeText('${escapeHtml(current)}')">
          คัดลอกลิงก์
        </button>
      </div>
    `;
  }

  window.FireUtils = {
    $,
    $all,
    safeText,
    escapeHtml,
    setText,
    show,
    hide,
    setLoading,
    toast,
    getParam,
    normalizeId,
    goCheck,
    downloadBase64File,
    openExternalBrowserHint
  };
})();
