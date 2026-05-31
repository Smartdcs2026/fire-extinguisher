(function () {
  'use strict';

  let stream = null;
  let rafId = null;
  let detector = null;
  let videoEl = null;
  let onResultCallback = null;
  let scanning = false;
  let zxingReader = null;
  let scanMode = '';

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

    scanning = true;

    if ('BarcodeDetector' in window) {
      try {
        scanMode = 'native';
        await startNativeCamera();
        detector = new BarcodeDetector({ formats: ['qr_code'] });
        scanWithBarcodeDetector();
        return;
      } catch (err) {
        stop();
      }
    }

    if (window.ZXing && window.ZXing.BrowserQRCodeReader) {
      scanMode = 'zxing';
      await startZxingScanner();
      return;
    }

    throw new Error('Browser นี้ยังไม่รองรับการสแกน QR Code กรุณากรอกหมายเลขถังแทน');
  }

  async function startNativeCamera() {
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
    videoEl.muted = true;

    await videoEl.play();
  }

  async function startZxingScanner() {
    zxingReader = new ZXing.BrowserQRCodeReader();

    const devices = await ZXing.BrowserCodeReader.listVideoInputDevices();
    let selectedDeviceId = '';

    if (devices && devices.length) {
      const backCamera = devices.find(device => {
        const label = String(device.label || '').toLowerCase();
        return (
          label.includes('back') ||
          label.includes('rear') ||
          label.includes('environment') ||
          label.includes('หลัง')
        );
      });

      selectedDeviceId = backCamera ? backCamera.deviceId : devices[devices.length - 1].deviceId;
    }

    await zxingReader.decodeFromVideoDevice(
      selectedDeviceId || null,
      videoEl,
      (result, err) => {
        if (!scanning) return;

        if (result && result.text) {
          handleDetected(result.text);
        }
      }
    );
  }

  function stop() {
    scanning = false;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (zxingReader) {
      try {
        zxingReader.reset();
      } catch (err) {}
      zxingReader = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (err) {}
      });
      stream = null;
    }

    if (videoEl) {
      try {
        videoEl.pause();
        videoEl.srcObject = null;
      } catch (err) {}
    }

    detector = null;
    scanMode = '';
  }

  async function scanWithBarcodeDetector() {
    if (!scanning || !videoEl || !detector) return;

    try {
      if (videoEl.readyState >= 2) {
        const codes = await detector.detect(videoEl);

        if (codes && codes.length) {
          const raw = codes[0].rawValue || '';
          handleDetected(raw);
          return;
        }
      }
    } catch (err) {}

    rafId = requestAnimationFrame(scanWithBarcodeDetector);
  }

  function handleDetected(rawValue) {
    const id = extractIdFromQr(rawValue);

    if (!id) {
      if (window.FireUtils) {
        window.FireUtils.toast('QR Code ไม่ใช่ของระบบนี้', 'warning');
      }
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
      if (id) return normalizeId(id);
    } catch (err) {}

    return normalizeId(value);
  }

  function normalizeId(value) {
    if (window.FireUtils && typeof window.FireUtils.normalizeId === 'function') {
      return window.FireUtils.normalizeId(value);
    }

    return String(value || '').trim().toUpperCase();
  }

  function getScanMode() {
    return scanMode || '';
  }

  window.FireScanner = {
    start,
    stop,
    extractIdFromQr,
    getScanMode
  };
})();
