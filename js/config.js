(function () {
  'use strict';

  const LOGO_FILE_ID = '1HicYHV18UaA5y4GFyHJaG9aNI-qjIzIY';

  function driveImage(fileId) {
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
      DEFAULT: driveImage('ใส่_ID_ภาพถังทั่วไป'),

      CO2: driveImage('1_f-EOMtCHFzT9ycVqsprJwzlceKu-uwt'),
      DRY_CHEMICAL: driveImage('1MnL6ozRx2mrVAd490UZF84dN5lBJhBeZ'),
      FOAM: driveImage('1n0vlxOBOc986aSCLy0YggbIZG-_k6IoS'),
      WATER: driveImage('1hMQvWQ6sZhN_M7bsVb5dZXtAGc0GTFGt'),
      LOW_PRESSURE_WATER: driveImage('1th0gYk5GU7S7YgEj4XzgOZH1bpKTDrYx')
    }
  };
  function getExtinguisherImage(typeText) {
  const text = String(typeText || '').toLowerCase();
  const images = window.APP_CONFIG.EXTINGUISHER_IMAGES || {};

  if (
    text.includes('co2') ||
    text.includes('carbon dioxide') ||
    text.includes('คาร์บอนไดออกไซด์')
  ) {
    return images.CO2 || images.DEFAULT || '';
  }

  if (
    text.includes('dry chemical') ||
    text.includes('ผงเคมี') ||
    text.includes('เคมีแห้ง')
  ) {
    return images.DRY_CHEMICAL || images.DEFAULT || '';
  }

  if (
    text.includes('foam') ||
    text.includes('โฟม')
  ) {
    return images.FOAM || images.DEFAULT || '';
  }

  if (
    text.includes('low pressure water') ||
    text.includes('low pressure') ||
    text.includes('water vapor')
  ) {
    return images.LOW_PRESSURE_WATER || images.WATER || images.DEFAULT || '';
  }

  if (
    text.includes('water') ||
    text.includes('น้ำ')
  ) {
    return images.WATER || images.DEFAULT || '';
  }

  return images.DEFAULT || '';
}
})();
