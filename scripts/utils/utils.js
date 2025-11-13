import { IMAGE_BASE_URL } from '../core/config.js';

export const wait = (ms) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => fn.apply(null, args), delay);
  };
};

export const normalizeType = (type) => (type === 'tv' ? 'tv' : 'movie');

export const formatCurrency = (amount) => {
  if (!amount) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount);
};

export const buildImageUrl = (size, path) =>
  path ? `${IMAGE_BASE_URL}${size}${path}` : null;

export const createCircularRating = (voteAverage = 0) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const percentage = (voteAverage / 10) * 100;
  const offset = circumference - (percentage / 100) * circumference;
  const colorClass =
    voteAverage >= 7 ? 'text-netflix-red' : voteAverage >= 5 ? 'text-yellow-400' : 'text-red-500';
  const displayValue = voteAverage > 0 ? voteAverage.toFixed(1) : 'N/A';

  return `
    <div class="relative progress-ring mx-auto">
      <svg class="progress-ring" viewBox="0 0 70 70">
        <circle class="text-gray-600" stroke-width="5" fill="transparent" r="${radius}" cx="35" cy="35" stroke="currentColor"></circle>
        <circle class="progress-ring__circle ${colorClass}" stroke-width="5" fill="transparent" r="${radius}" cx="35" cy="35" stroke="currentColor"
          style="stroke-dasharray:${circumference} ${circumference};stroke-dashoffset:${offset};">
        </circle>
      </svg>
      <span class="rating-text text-white">${displayValue}</span>
    </div>
  `;
};

