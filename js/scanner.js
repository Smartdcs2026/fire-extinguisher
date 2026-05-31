(function () {
  'use strict';

  let stream = null;
  let rafId = null;
  let detector = null;
  let videoEl = null;
  let onResultCallback = null;
  let scanning = false;
  let detectedLocked = false;
  let zxingReader = null;
  let scanMode = '';
  let selectedDeviceId = '';

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
    detectedLocked = false;
    selectedDeviceId = '';

    prepareVideoElement();

    const hasNative = 'BarcodeDetector' in window;
    const hasZxing = window.ZXing && window.ZXing.BrowserQRCodeReader;

    /*
      ลำดับการทำงาน:
      1) ใช้ BarcodeDetector ก่อน เพราะเร็วและเบา
      2) ถ้าเปิดไม่ได้หรือ detect ไม่ได้ ให้ fallback ไป ZXing
    */

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

    stop();
    throw new Error('ไม่พบตัวอ่าน QR Code ใน Browser นี้ กรุณากรอกหมายเลขถังแทน');
  }

  function prepareVideoElement() {
    if (!videoEl) return;

    videoEl.setAttribute('playsinline', 'true');
    videoEl.setAttribute('webkit-playsinline', 'true');
    videoEl.setAttribute('muted', 'true');
    videoEl.muted = true;
    videoEl.autoplay = true;
  }

  async function startNativeCamera() {
    const constraintsList = await buildCameraConstraintsList();

    let lastError = null;

    for (const constraints of constraintsList) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err) {
        lastError = err;
        stream = null;
      }
    }

    if (!stream) {
      throw lastError || new Error('ไม่สามารถเปิดกล้องได้');
    }

    videoEl.srcObject = stream;

    try {
      await videoEl.play();
    } catch (err) {
      await waitForCanPlay(videoEl);
      await videoEl.play();
    }
  }

  async function buildCameraConstraintsList() {
    const backDeviceId = await getBestBackCameraId();

    const list = [];

    if (backDeviceId) {
      list.push({
        video: {
          deviceId: { exact: backDeviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });
    }

    list.push({
      video: {
        facingMode: { exact: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: false
    });

    list.push({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: false
    });

    list.push({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: false
    });

    return list;
  }

  async function getBestBackCameraId() {
    try {
      /*
        บาง Browser จะไม่คืน label ของกล้องจนกว่าจะเคยขอ permission ก่อน
        ดังนั้นถ้า label ว่าง ให้ขอ permission สั้น ๆ แล้วปิดทันที
      */
      let devices = await enumerateVideoDevices();

      const hasLabel = devices.some(device => String(device.label || '').trim());

      if (!hasLabel) {
        let tempStream = null;

        try {
          tempStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' }
            },
            audio: false
          });
        } catch (err) {}

        if (tempStream) {
          tempStream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (err) {}
          });
        }

        devices = await enumerateVideoDevices();
      }

      if (!devices.length) return '';

      const scored = devices
        .map((device, index) => {
          const label = String(device.label || '').toLowerCase();
          let score = 0;

          if (label.includes('back')) score += 100;
          if (label.includes('rear')) score += 100;
          if (label.includes('environment')) score += 100;
          if (label.includes('หลัง')) score += 100;

          if (label.includes('wide')) score += 30;
          if (label.includes('main')) score += 30;
          if (label.includes('camera 0')) score += 20;
          if (label.includes('0,')) score += 20;

          if (label.includes('front')) score -= 100;
          if (label.includes('user')) score -= 100;
          if (label.includes('หน้า')) score -= 100;
          if (label.includes('facetime')) score -= 80;
          if (label.includes('webcam')) score -= 50;

          /*
            บนมือถือหลายรุ่น กล้องหลังมักอยู่รายการท้าย ๆ
            ถ้า label ไม่ชัด ให้ให้น้ำหนักตัวท้ายมากขึ้นเล็กน้อย
          */
          score += index;

          return {
            device,
            score
          };
        })
        .sort((a, b) => b.score - a.score);

      const best = scored[0];

      if (best && best.device && best.device.deviceId) {
        selectedDeviceId = best.device.deviceId;
        return best.device.deviceId;
      }

      return '';
    } catch (err) {
      return '';
    }
  }

  async function enumerateVideoDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    const devices = await navigator.mediaDevices.enumerateDevices();

    return devices.filter(device => device.kind === 'videoinput');
  }

  async function startZxingScanner() {
    zxingReader = new ZXing.BrowserQRCodeReader();

    const deviceId = await getBestZxingDeviceId();

    await zxingReader.decodeFromVideoDevice(
      deviceId || null,
      videoEl,
      function (result, err) {
        if (!scanning || detectedLocked) return;

        if (result && result.text) {
          handleDetected(result.text);
        }
      }
    );
  }

  async function getBestZxingDeviceId() {
    try {
      const devices = await zxingReader.listVideoInputDevices();

      if (!devices || !devices.length) {
        return null;
      }

      const scored = devices
        .map((device, index) => {
          const label = String(device.label || '').toLowerCase();
          let score = 0;

          if (label.includes('back')) score += 100;
          if (label.includes('rear')) score += 100;
          if (label.includes('environment')) score += 100;
          if (label.includes('หลัง')) score += 100;

          if (label.includes('wide')) score += 30;
          if (label.includes('main')) score += 30;
          if (label.includes('camera 0')) score += 20;

          if (label.includes('front')) score -= 100;
          if (label.includes('user')) score -= 100;
          if (label.includes('หน้า')) score -= 100;
          if (label.includes('facetime')) score -= 80;
          if (label.includes('webcam')) score -= 50;

          score += index;

          return {
            device,
            score
          };
        })
        .sort((a, b) => b.score - a.score);

      const best = scored[0];

      if (best && best.device && best.device.deviceId) {
        selectedDeviceId = best.device.deviceId;
        return best.device.deviceId;
      }

      return devices[devices.length - 1].deviceId || null;
    } catch (err) {
      return selectedDeviceId || null;
    }
  }

  function stopSoft_() {
    /*
      ใช้ตอน Native เปิดไม่สำเร็จแล้วจะ fallback ไป ZXing
      ต้องหยุดกล้องเดิม แต่ยังให้ start() ทำงานต่อได้
    */
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
    detectedLocked = false;
    scanning = true;
  }

  function stop() {
    scanning = false;
    detectedLocked = false;

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
    if (!scanning || detectedLocked || !videoEl || !detector) return;

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
    if (detectedLocked) return;

    const id = extractIdFromQr(rawValue);

    if (!id) {
      if (window.FireUtils) {
        window.FireUtils.toast('QR Code ไม่ใช่ของระบบนี้', 'warning');
      }

      return;
    }

    detectedLocked = true;
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

      const id =
        url.searchParams.get('id') ||
        url.searchParams.get('extinguisherId') ||
        url.searchParams.get('autoId') ||
        '';

      if (id) return normalizeId(id);

      return '';
    } catch (err) {}

    const text = normalizeId(value);

    if (text.startsWith('HTTP://') || text.startsWith('HTTPS://')) {
      return '';
    }

    return text;
  }

  function normalizeId(value) {
    if (window.FireUtils && window.FireUtils.normalizeId) {
      return window.FireUtils.normalizeId(value);
    }

    return String(value || '').trim().toUpperCase();
  }

  function waitForCanPlay(video) {
    return new Promise((resolve, reject) => {
      if (!video) {
        reject(new Error('ไม่พบ video element'));
        return;
      }

      if (video.readyState >= 2) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('กล้องใช้เวลาตอบสนองนานเกินไป'));
      }, 8000);

      function cleanup() {
        clearTimeout(timer);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('loadedmetadata', onCanPlay);
        video.removeEventListener('error', onError);
      }

      function onCanPlay() {
        cleanup();
        resolve();
      }

      function onError() {
        cleanup();
        reject(new Error('เปิดภาพจากกล้องไม่สำเร็จ'));
      }

      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('loadedmetadata', onCanPlay);
      video.addEventListener('error', onError);
    });
  }

  function getScanMode() {
    return scanMode;
  }

  function getSelectedDeviceId() {
    return selectedDeviceId;
  }

  window.FireScanner = {
    start,
    stop,
    extractIdFromQr,
    getScanMode,
    getSelectedDeviceId
  };
})();
