(function () {
  'use strict';

  const API_BASE = window.APP_CONFIG.API_BASE;

  async function request(path, options = {}) {
    const url = `${API_BASE}${path}`;

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    let res;
    let data;

    try {
      res = await fetch(url, {
        ...options,
        headers,
        cache: 'no-store'
      });
    } catch (err) {
      throw new Error('ไม่สามารถเชื่อมต่อ API ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
    }

    try {
      data = await res.json();
    } catch (err) {
      throw new Error('API ส่งข้อมูลกลับมาไม่ถูกต้อง');
    }

    if (!res.ok || data.ok === false) {
      throw new Error(data.message || 'เกิดข้อผิดพลาดจาก API');
    }

    return data;
  }

  function buildQuery(params = {}) {
    const sp = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        sp.set(key, String(value).trim());
      }
    });

    const q = sp.toString();
    return q ? `?${q}` : '';
  }

  window.FireAPI = {
    health() {
      return request('/api/health');
    },

    getExtinguishers() {
      return request('/api/extinguishers');
    },

    getExtinguisher(id) {
      return request(`/api/extinguisher${buildQuery({ id })}`);
    },

    getHistory(id, limit = 5) {
      return request(`/api/history${buildQuery({ id, limit })}`);
    },

    getNames() {
      return request('/api/names');
    },

    saveInspection(payload) {
      return request('/api/inspection/save', {
        method: 'POST',
        body: JSON.stringify(payload || {})
      });
    },

    getReport(params = {}) {
      return request(`/api/report${buildQuery(params)}`);
    },

    getInspectionStatus(params = {}) {
      return request(`/api/inspection/status${buildQuery(params)}`);
    },

    exportCsv(params = {}) {
      return request(`/api/export/csv${buildQuery(params)}`);
    },

    exportExcel(params = {}) {
      return request(`/api/export/excel${buildQuery(params)}`);
    }
  };
})();
