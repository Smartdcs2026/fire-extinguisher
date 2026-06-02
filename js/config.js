(function () {
  'use strict';

  const LOGO_FILE_ID = '1HicYHV18UaA5y4GFyHJaG9aNI-qjIzIY';

  function driveImage(fileId) {
    if (!fileId || String(fileId).includes('ใส่_ID')) return '';
    return `https://lh5.googleusercontent.com/d/${fileId}`;
  }

  window.APP_CONFIG = {
    APP_NAME: 'Fire Extinguisher',
    APP_TITLE: 'ระบบตรวจเช็คถังดับเพลิง',
    API_BASE: 'https://fireextinguisher.somchaibutphon.workers.dev',
    GITHUB_BASE: 'https://smartdcs2026.github.io/fire-extinguisher',
    DEFAULT_PERIOD: 'thisMonth',

    LOGO_FILE_ID,
    LOGO_URL: driveImage(LOGO_FILE_ID),

    EXTINGUISHER_IMAGES: {
      DEFAULT: '',

      CO2: driveImage('1_f-EOMtCHFzT9ycVqsprJwzlceKu-uwt'),
      DRY_CHEMICAL: driveImage('1MnL6ozRx2mrVAd490UZF84dN5lBJhBeZ'),
      FOAM: driveImage('1n0vlxOBOc986aSCLy0YggbIZG-_k6IoS'),
      WATER: driveImage('1hMQvWQ6sZhN_M7bsVb5dZXtAGc0GTFGt'),
      LOW_PRESSURE_WATER: driveImage('1th0gYk5GU7S7YgEj4XzgOZH1bpKTDrYx')
    }
  };
})();
