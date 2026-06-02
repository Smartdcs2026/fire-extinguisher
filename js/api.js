(function () {
  'use strict';

  const API_BASE = window.APP_CONFIG && window.APP_CONFIG.API_BASE
    ? String(window.APP_CONFIG.API_BASE).replace(/\/+$/, '')
    : '';

  const DEFAULT_TIMEOUT_MS = 55000;
  const READ_TIMEOUT_MS = 30000;
  const SAVE_TIMEOUT_MS = 60000;
  const EXPORT_TIMEOUT_MS = 60000;

  if (!API_BASE) {
    console.error('ไม่พบ APP_CONFIG.API_BASE กรุณาโหลด config.js ก่อน api.js');
  }

  function buildUrl(path, params = {}) {
    const cleanPath = String(path || '').startsWith('/')
      ? String(path || '')
      : `/${String(path || '')}`;

    const url = `${API_BASE}${cleanPath}`;
    const query = buildQuery({
      ...params,
      _t: Date.now()
    });

    return `${url}${query}`;
  }

  async function request(path, options = {}) {
    if (!API_BASE) {
      throw new Error('ไม่พบ API_BASE กรุณาตรวจสอบไฟล์ config.js');
    }

    const method = String(options.method || 'GET').toUpperCase();
    const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
    const params = options.params || {};
    const url = buildUrl(path, method === 'GET' ? params : {});

    const headers = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    let res;
    let text = '';
    let data;

    try {
      res = await fetch(url, {
        method,
        headers,
        body: options.body || undefined,
        cache: 'no-store',
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timer);

      if (err && err.name === 'AbortError') {
        throw new Error('API ใช้เวลาตอบสนองนานเกินไป กรุณาลองใหม่อีกครั้ง');
      }

      throw new Error('ไม่สามารถเชื่อมต่อ API ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
    }

    clearTimeout(timer);

    try {
      text = await res.text();
    } catch (err) {
      throw new Error('อ่านข้อมูลจาก API ไม่สำเร็จ');
    }

    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      console.error('API raw response:', text);
      throw new Error('API ส่งข้อมูลกลับมาไม่ถูกต้อง');
    }

    if (!res.ok || data.ok === false) {
      throw new Error(data.message || `เกิดข้อผิดพลาดจาก API (${res.status})`);
    }

    return data;
  }

  function buildQuery(params = {}) {
    const sp = new URLSearchParams();

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      const text = String(value).trim();

      if (text !== '') {
        sp.set(key, text);
      }
    });

    const q = sp.toString();
    return q ? `?${q}` : '';
  }

  function normalizeParams(params = {}) {
    return {
      period: params.period || '',
      start: params.start || '',
      end: params.end || '',

      month: params.month || '',
      inspectionMonth: params.inspectionMonth || '',
      monthKey: params.monthKey || '',

      inspector: params.inspector || 'all',
      type: params.type || 'all',
      status: params.status || 'all',
      inspectionStatus: params.inspectionStatus || 'all',
      extinguisherId: params.extinguisherId || params.id || '',
      location: params.location || '',

      page: params.page || '',
      pageSize: params.pageSize || '',
      limit: params.limit || '',

      mode: params.mode || '',
      roundStatus: params.roundStatus || 'all',

      exportDetail: params.exportDetail || '',
      includeChecklist: params.includeChecklist || '',
      autoRebuild: params.autoRebuild || '',
      includeNormalAbnormal: params.includeNormalAbnormal || ''
    };
  }

  function downloadBase64(base64, fileName, mimeType) {
    if (!base64) {
      throw new Error('ไม่พบข้อมูลไฟล์สำหรับดาวน์โหลด');
    }

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

  window.FireAPI = {
    request,

    health() {
      return request('/api/health', {
        timeoutMs: READ_TIMEOUT_MS
      });
    },

    setup() {
      return request('/api/setup', {
        timeoutMs: SAVE_TIMEOUT_MS
      });
    },

    getExtinguishers() {
      return request('/api/extinguishers', {
        timeoutMs: SAVE_TIMEOUT_MS
      });
    },

    getExtinguisher(id) {
      return request('/api/extinguisher', {
        params: { id },
        timeoutMs: READ_TIMEOUT_MS
      });
    },

    getHistory(id, limit = 5) {
      return request('/api/history', {
        params: { id, limit },
        timeoutMs: READ_TIMEOUT_MS
      });
    },

    getLatestSummary(id) {
      return request('/api/latest-summary', {
        params: { id },
        timeoutMs: READ_TIMEOUT_MS
      });
    },

    getNames() {
      return request('/api/names', {
        timeoutMs: READ_TIMEOUT_MS
      });
    },

    saveInspection(payload) {
      return request('/api/inspection/save', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
        timeoutMs: SAVE_TIMEOUT_MS
      });
    },

    getReport(params = {}) {
      return request('/api/report', {
        params: normalizeParams(params),
        timeoutMs: SAVE_TIMEOUT_MS
      });
    },

    getInspectionStatus(params = {}) {
      return request('/api/inspection/status', {
        params: normalizeParams(params),
        timeoutMs: SAVE_TIMEOUT_MS
      });
    },

    getInspectionStatusDebug(params = {}) {
      return request('/api/inspection/status-debug', {
        params: normalizeParams(params),
        timeoutMs: SAVE_TIMEOUT_MS
      });
    },

    getDashboardSummary(params = {}) {
      return request('/api/dashboard-summary', {
        params: normalizeParams(params),
        timeoutMs: READ_TIMEOUT_MS
      });
    },

    getMonthlyStatusFast(params = {}) {
      return request('/api/monthly-status-fast', {
        params: normalizeParams(params),
        timeoutMs: READ_TIMEOUT_MS
      });
    },

    exportCsv(params = {}) {
      return request('/api/export/csv', {
        params: normalizeParams(params),
        timeoutMs: EXPORT_TIMEOUT_MS
      });
    },

    exportExcel(params = {}) {
      return request('/api/export/excel', {
        params: normalizeParams(params),
        timeoutMs: EXPORT_TIMEOUT_MS
      });
    },
   rebuildMonthlyStatus(params = {}) {
  return request('/api/rebuild-monthly-status', {
    params: normalizeParams(params),
    timeoutMs: SAVE_TIMEOUT_MS
  });
},
    async downloadCsv(params = {}) {
      const res = await this.exportCsv(params);

      downloadBase64(
        res.base64,
        res.fileName || 'fire-extinguisher.csv',
        res.mimeType || 'text/csv'
      );

      return res;
    },

    async downloadExcel(params = {}) {
      const res = await this.exportExcel(params);

      downloadBase64(
        res.base64,
        res.fileName || 'fire-extinguisher.xlsx',
        res.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      return res;
    }
  };
})();
