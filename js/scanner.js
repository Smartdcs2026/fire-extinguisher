(function () {
  'use strict';

  let stream = null;
  let rafId = null;
  let detector = null;
  let videoEl = null;
  let onResultCallback = null;
  let scanning = false;

  async function start(options = {}) {
    videoEl = options.video;
    onResultCallback = options.onResult;

    if (!videoEl) {
      throw new Error('ไม่พบ video element สำหรับเปิดกล้อง');
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('อุปกรณ์นี้ไม่รองรับการเปิดกล้องผ่าน Browser');
    }

    stop();

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    videoEl.srcObject = stream;
    videoEl.setAttribute('playsinline', 'true');
    videoEl.setAttribute('webkit-playsinline', 'true');

    await videoEl.play();

    scanning = true;

    if ('BarcodeDetector' in window) {
      try {
        detector = new BarcodeDetector({
          formats: ['qr_code']
        });
        scanWithBarcodeDetector();
      } catch (err) {
        scanWithCanvasFallback();
      }
    } else {
      scanWithCanvasFallback();
    }
  }

  function stop() {
    scanning = false;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }

    if (videoEl) {
      videoEl.pause();
      videoEl.srcObject = null;
    }
  }

  async function scanWithBarcodeDetector() {
    if (!scanning || !videoEl || !detector) return;

    try {
      const codes = await detector.detect(videoEl);

      if (codes && codes.length) {
        const raw = codes[0].rawValue || '';
        handleDetected(raw);
        return;
      }
    } catch (err) {
      // Continue scanning
    }

    rafId = requestAnimationFrame(scanWithBarcodeDetector);
  }

  function scanWithCanvasFallback() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const loop = () => {
      if (!scanning || !videoEl) return;

      try {
        const w = videoEl.videoWidth;
        const h = videoEl.videoHeight;

        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(videoEl, 0, 0, w, h);

          /**
           * หมายเหตุ:
           * ตัว fallback จริงด้วย ZXing จะใส่ในรอบถัดไป
           * รอบนี้ใช้ BarcodeDetector เป็นหลัก
           */
        }
      } catch (err) {}

      rafId = requestAnimationFrame(loop);
    };

    loop();
  }

  function handleDetected(rawValue) {
    const id = extractIdFromQr(rawValue);

    if (!id) {
      window.FireUtils.toast('QR Code ไม่ใช่ของระบบนี้', 'warning');
      return;
    }

    stop();

    if (typeof onResultCallback === 'function') {
      onResultCallback(id, rawValue);
    }
  }

  function extractIdFromQr(value) {
    value = String(value || '').trim();

    if (!value) return '';

    try {
      const url = new URL(value);
      const id = url.searchParams.get('id') || '';
      if (id) return window.FireUtils.normalizeId(id);
    } catch (err) {}

    return window.FireUtils.normalizeId(value);
  }

  window.FireScanner = {
    start,
    stop,
    extractIdFromQr
  };
})();
