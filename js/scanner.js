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
      throw new Error('Browser นี้ไม่อนุญาตให้เปิดกล้อง กรุณาเปิดผ่าน Chrome/Safari หรือกรอกหมายเลขถังแทน');
    }

    stop();
    scanning = true;

    const hasNative = 'BarcodeDetector' in window;
    const hasZxing = window.ZXing && window.ZXing.BrowserQRCodeReader;

    // 1) ใช้ BarcodeDetector ก่อน ถ้ามี
    if (hasNative) {
      try {
        scanMode = 'native';
        await startNativeCamera();
        detector = new BarcodeDetector({ formats: ['qr_code'] });
        scanWithBarcodeDetector();
        return;
      } catch (err) {
        console.warn('Native scanner failed, fallback to ZXing:', err);
        stopSoft_();
      }
    }

    // 2) ใช้ ZXing fallback
    if (hasZxing) {
      try {
        scanMode = 'zxing';
        await startZxingScanner();
        return;
      } catch (err) {
        console.warn('ZXing scanner failed:', err);
        stop();
        throw new Error('เปิดกล้องไม่สำเร็จ กรุณาตรวจสอบสิทธิ์กล้อง หรือกรอกหมายเลขถังแทน');
      }
    }

    // 3) ถ้าไม่มีตัวอ่าน QR แต่ยังขอเปิดกล้องได้ ให้แจ้งตรง ๆ
    stop();
    throw new Error('ไม่พบตัวอ่าน QR Code ใน Browser นี้ กรุณากรอกหมายเลขถังแทน');
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

    let selectedDeviceId = null;

    try {
      const devices = await zxingReader.listVideoInputDevices();

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

        selectedDeviceId = backCamera
          ? backCamera.deviceId
          : devices[devices.length - 1].deviceId;
      }
    } catch (err) {
      selectedDeviceId = null;
    }

    await zxingReader.decodeFromVideoDevice(
      selectedDeviceId,
      videoEl,
      function (result, err) {
        if (!scanning) return;

        if (result && result.text) {
          handleDetected(result.text);
        }
      }
    );
  }

  function stopSoft_() {
    scanning = false;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
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
    scanning = true;
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

  // กรณี QR เป็น URL
  try {
    const url = new URL(value);

    const id =
      url.searchParams.get('id') ||
      url.searchParams.get('extinguisherId') ||
      '';

    // ถ้า URL มี id ให้ใช้ id
    if (id) return normalizeId(id);

    // ถ้าเป็น URL แต่ไม่มี id ห้ามเอา URL ทั้งก้อนไปค้นหา
    return '';
  } catch (err) {}

  // กรณี QR เป็นรหัสถังโดยตรง เช่น 9, 001, FE-001
  const text = normalizeId(value);

  // ป้องกันกรณีเป็น URL แต่ parse ไม่ผ่าน
  if (text.startsWith('HTTP://') || text.startsWith('HTTPS://')) {
    return '';
  }

  return text;
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
