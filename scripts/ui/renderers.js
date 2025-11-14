import { IMAGE_BASE_URL } from '../core/config.js';
import { ui, queryAll, getById } from './ui-elements.js';
import { buildImageUrl, createCircularRating, formatCurrency } from '../utils/utils.js';

const PLACEHOLDER_POSTER = (text) =>
  `https://placehold.co/500x750/181818/d4d4d4?text=${encodeURIComponent(text)}`;

const PLACEHOLDER_PROFILE =
  'https://placehold.co/185x185/181818/d4d4d4?text=No+Pic';

export const showNotification = (message, type = 'error') => {
  ui.notifyText.textContent = message;
  ui.notifyModal.setAttribute('role', 'alert');
  ui.notifyModal.setAttribute('aria-live', 'assertive');
  ui.notifyModal.classList.remove('hidden', 'notification-exit');
  ui.notifyModal.classList.add('flex', 'notification-enter');
  
  // Focus management for accessibility
  const okButton = ui.notifyOk;
  setTimeout(() => okButton.focus(), 100);
};

export const hideNotification = () => {
  ui.notifyModal.classList.add('notification-exit');
  setTimeout(() => {
    ui.notifyModal.classList.add('hidden');
    ui.notifyModal.classList.remove('flex', 'notification-enter', 'notification-exit');
    ui.notifyModal.removeAttribute('role');
    ui.notifyModal.removeAttribute('aria-live');
  }, 250);
};

export const showPrimaryLoader = (message = 'Loading content...') => {
  const skeletonCount = 12;
  const skeletons = Array(skeletonCount)
    .fill(0)
    .map(
      () => `
      <div class="skeleton-card">
        <div class="skeleton-poster"></div>
        <div class="skeleton-info">
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line"></div>
        </div>
      </div>
    `
    )
    .join('');

  ui.results.innerHTML = `
    <div class="skeleton-gallery">
      ${skeletons}
    </div>
  `;
};

export const togglePaginationLoader = (show) => {
  const loaderId = 'paginationLoader';
  const existing = getById(loaderId);
  if (show) {
    if (!existing) {
      const skeletonCount = 6;
      const skeletons = Array(skeletonCount)
        .fill(0)
        .map(
          () => `
          <div class="skeleton-card">
            <div class="skeleton-poster"></div>
            <div class="skeleton-info">
              <div class="skeleton skeleton-line"></div>
              <div class="skeleton skeleton-line"></div>
            </div>
          </div>
        `
        )
        .join('');

      ui.results.insertAdjacentHTML(
        'beforeend',
        `<div id="${loaderId}" class="skeleton-gallery">
          ${skeletons}
        </div>`
      );
    }
  } else if (existing) {
    existing.remove();
  }
};

export const renderAutocomplete = (results, query, { onSelect, onSearchAll }) => {
  ui.autocomplete.innerHTML = '';
  const limited = results.slice(0, 10);
  if (!limited.length) {
    ui.autocomplete.classList.add('hidden');
    return;
  }

  const fragment = document.createDocumentFragment();

  limited.forEach((media) => {
    const title = media.title || media.name;
    const typeLabel = (media.media_type || 'movie') === 'movie' ? 'Movie' : 'TV';
    const year = (media.release_date || media.first_air_date)
      ? new Date(media.release_date || media.first_air_date).getFullYear()
      : 'N/A';

    const item = document.createElement('button');
    item.className =
      'suggestion-item p-3 cursor-pointer border-b border-gray-600 text-sm flex justify-between items-center w-full text-left';
    item.setAttribute('role', 'option');
    item.setAttribute('aria-label', `${title} - ${typeLabel} (${year})`);
    item.innerHTML = `
      <span class="truncate">${title}</span>
      <span class="text-xs text-gray-400 font-semibold">${typeLabel} (${year})</span>
    `;
    item.addEventListener('click', () => {
      onSelect?.(media);
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect?.(media);
      }
    });
    fragment.appendChild(item);
  });

  const searchItem = document.createElement('button');
  searchItem.className =
    'suggestion-item p-3 cursor-pointer text-sm text-center text-netflix-red font-semibold w-full';
  searchItem.setAttribute('role', 'option');
  searchItem.setAttribute('aria-label', `See all results for ${query}`);
  searchItem.textContent = `See all results for "${query}"`;
  searchItem.addEventListener('click', () => onSearchAll?.(query));
  searchItem.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSearchAll?.(query);
    }
  });
  fragment.appendChild(searchItem);

  ui.autocomplete.appendChild(fragment);
  ui.autocomplete.classList.remove('hidden');
};

export const clearAutocomplete = () => {
  ui.autocomplete.classList.add('hidden');
  ui.autocomplete.innerHTML = '';
};

export const renderGallery = (mediaList, { isNewLoad, title, reachedEnd }) => {
  let gallery = getById('mediaGallery');
  if (isNewLoad) {
    ui.results.innerHTML = `
      <div id="galleryHeader" class="w-full px-2 mb-8 text-3xl md:text-4xl font-extrabold text-white border-b-4 border-netflix-red/50 pb-3 tracking-tight">
        ${title}
      </div>
      <div id="mediaGallery" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 p-2 w-full"></div>
    `;
    gallery = getById('mediaGallery');
  }

  const header = getById('galleryHeader');
  if (header) {
    header.textContent = title;
  }

  if (!gallery) return;

  const cards = mediaList
    .filter((media) => media.poster_path)
    .map((media, index) => {
      const titleText = media.title || media.name;
      const mediaType = media.media_type || 'movie';
      const isMovie = mediaType === 'movie';
      const typeLabel = isMovie ? 'Movie' : mediaType === 'tv' ? 'TV Show' : 'N/A';
      const releaseDate = isMovie ? media.release_date : media.first_air_date;
      const posterUrl = buildImageUrl('w342', media.poster_path);
      const placeholder = encodeURIComponent(`No Poster for ${titleText}`);
      const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
      const rating = media.vote_average ? media.vote_average.toFixed(1) : 'N/A';

      return `
        <article class="media-card bg-card-bg rounded-xl shadow-2xl cursor-pointer transition duration-300 transform overflow-hidden relative group"
          data-id="${media.id}" data-type="${mediaType}" data-title="${titleText.replace(/"/g, '&quot;')}"
          style="animation-delay: ${index * 0.05}s;"
          role="button"
          tabindex="0"
          aria-label="${titleText} - ${typeLabel} (${year}) - Rating: ${rating}">
          
          <div class="relative" data-id="${media.id}" data-type="${mediaType}">
            <img src="${posterUrl}" alt="${titleText} Poster"
              class="w-full aspect-[2/3] object-cover rounded-t-xl transition duration-500 group-hover:opacity-80 image-loading"
              loading="lazy"
              onload="this.classList.add('image-loaded');"
              onerror="this.onerror=null;this.src='https://placehold.co/342x513/181818/d4d4d4?text=${placeholder}';this.classList.add('image-loaded');">

            <!-- Sleek Minimal Rating Badge -->
            <div class="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-sm font-semibold px-2.5 py-1.5 rounded-lg shadow-md flex items-center gap-1"
              aria-label="Rating: ${rating} out of 10">
              <svg class="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <span>${rating}</span>
            </div>
          </div>

          <div class="p-4" data-id="${media.id}" data-type="${mediaType}">
            <h3 class="text-base font-extrabold text-light-gray truncate group-hover:text-netflix-red">${titleText}</h3>
            <p class="text-sm text-gray-500 mt-1">${typeLabel} • ${year}</p>
          </div>
        </article>
      `;
    })
    .join('');

  gallery.insertAdjacentHTML('beforeend', cards);

  if (reachedEnd && !gallery.querySelector('[data-end-marker]')) {
    gallery.insertAdjacentHTML(
      'beforeend',
      '<p data-end-marker class="text-gray-400 text-center w-full mt-8 pb-12">-- End of Results --</p>'
    );
  }
};

const getCertification = (details, isMovie) => {
  if (isMovie) {
    const usResult = details.release_dates?.results?.find((result) => result.iso_3166_1 === 'US');
    if (usResult?.release_dates?.length) {
      const entry = usResult.release_dates.find((release) => release.certification);
      if (entry?.certification) return entry.certification;
    }
  } else {
    const rating = details.content_ratings?.results?.find(
      (result) => result.iso_3166_1 === 'US'
    )?.rating;
    if (rating) return rating;
  }
  return 'N/A';
};

export const renderDetailView = (
  details,
  { trailerKey, credits, mediaType, onBack, contextLabel }
) => {
  const isMovie = mediaType === 'movie';
  const {
    title: movieTitle,
    name,
    tagline = '',
    release_date,
    first_air_date,
    genres,
    poster_path,
    backdrop_path,
    status,
    runtime,
    episode_run_time,
    budget,
    revenue,
    number_of_seasons,
    number_of_episodes,
    overview,
    production_companies,
    vote_average,
    vote_count
  } = details;

  const titleText = movieTitle || name;
  const safeTitle = encodeURIComponent(titleText);
  const mediaTypeLabel = isMovie ? 'Movie' : 'TV Show';
  const certification = getCertification(details, isMovie);
  let durationString = 'N/A';

  if (isMovie) {
    durationString = runtime ? `${Math.floor(runtime / 60)}h ${runtime % 60}m` : 'N/A';
  } else if (episode_run_time?.length) {
    durationString = `~${episode_run_time[0]}m / Ep`;
  }

  const crewRole = isMovie ? 'Director' : 'Creator';
  const crewName =
    credits.crew?.find((member) => member.job === crewRole)?.name || 'N/A';

  const productionLogos = (production_companies || [])
    .filter((company) => company.logo_path)
    .map((company) => {
      const safeName = encodeURIComponent(company.name);
      return `
        <div class="detail-production-logo-item" data-company-name="${safeName}" role="button" tabindex="0" aria-label="Search Google for ${company.name}">
          <img src="${buildImageUrl('w92', company.logo_path)}" alt="${company.name} Logo"
            title="${company.name}" class="detail-production-logo"
            onerror="this.onerror=null;this.style.display='none';">
        </div>
      `;
    })
    .join('');

  const trailerUrl = trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : '#';
  const movies123Url = `https://ww7.123moviesfree.net/search/?q=${safeTitle}`;
  const soap2dayUrl = `https://ww25.soap2day.day/?s=${safeTitle}`;
  const gokuUrl = `https://goku.sx/search?keyword=${safeTitle}`;

  const financialOrSeriesCard = isMovie
    ? `
      <div class="detail-info-box">
        <h4 class="detail-info-box-title">
          <i class="fas fa-chart-line"></i>Financials
        </h4>
        <div class="detail-info-box-content">
          <p><span>Budget:</span> ${formatCurrency(budget)}</p>
          <p><span>Revenue:</span> ${formatCurrency(revenue)}</p>
        </div>
      </div>
    `
    : `
      <div class="detail-info-box">
        <h4 class="detail-info-box-title">
          <i class="fas fa-tv"></i>Series Info
        </h4>
        <div class="detail-info-box-content">
          <p><span>Seasons:</span> ${number_of_seasons || 'N/A'}</p>
          <p><span>Episodes:</span> ${number_of_episodes || 'N/A'}</p>
        </div>
      </div>
    `;

  const crewFocusCard = `
    <div class="detail-info-box">
      <h4 class="detail-info-box-title">
        <i class="fas fa-hand-point-right"></i>Crew Focus
      </h4>
      <div class="detail-info-box-content">
        <p><span>${crewRole}:</span> ${crewName}</p>
      </div>
    </div>
  `;

  const certTag =
    certification !== 'N/A'
      ? `<span class="detail-meta-cert">${certification}</span>`
      : '';

  const posterFull = buildImageUrl('w500', poster_path) || PLACEHOLDER_POSTER('Poster Unavailable');
  const backdropFull = buildImageUrl('original', backdrop_path);

  const castList = (credits.cast || []).slice(0, 6).map((member) => {
    const profilePath = member.profile_path
      ? `${IMAGE_BASE_URL}w185${member.profile_path}`
      : PLACEHOLDER_PROFILE;
    const safeName = encodeURIComponent(member.name);
    return `
      <div class="detail-cast-item" data-actor-name="${safeName}" role="button" tabindex="0" aria-label="Search Google for ${member.name}">
        <img src="${profilePath}" alt="${member.name}" class="detail-cast-image"
          onerror="this.onerror=null;this.src='${PLACEHOLDER_PROFILE}';">
        <div class="detail-cast-name">${member.name}</div>
        <div class="detail-cast-character">${member.character || 'N/A'}</div>
      </div>
    `;
  }).join('');

  // Quick facts for poster section
  const releaseYear = (release_date || first_air_date)
    ? new Date(release_date || first_air_date).getFullYear()
    : 'N/A';
  const language = details.original_language?.toUpperCase() || 'N/A';
  const country = details.production_countries?.[0]?.name || 'N/A';
  const genreList = genres?.map(genre => genre.name).join(', ') || 'N/A';
  
  const quickFacts = `
    <div class="detail-quick-facts">
      <div class="detail-quick-facts-title">
        <i class="fas fa-info-circle"></i>Quick Facts
      </div>
      <div class="detail-quick-fact-item">
        <span class="detail-quick-fact-label">Release Year</span>
        <span class="detail-quick-fact-value">${releaseYear}</span>
      </div>
      <div class="detail-quick-fact-item">
        <span class="detail-quick-fact-label">Language</span>
        <span class="detail-quick-fact-value">${language}</span>
      </div>
      <div class="detail-quick-fact-item">
        <span class="detail-quick-fact-label">Country</span>
        <span class="detail-quick-fact-value">${country}</span>
      </div>
      <div class="detail-quick-fact-item detail-quick-fact-genres">
        <span class="detail-quick-fact-label">Genres</span>
        <span class="detail-quick-fact-value">${genreList}</span>
      </div>
    </div>
  `;

  ui.results.innerHTML = `
    <div class="detail-view-container">
      <button id="backBtn" class="detail-back-button">
        <i class="fas fa-arrow-left"></i>Back to ${contextLabel}
      </button>
      <div class="detail-card-wrapper ${backdropFull ? 'has-backdrop' : ''}">
        ${backdropFull ? `
          <div class="detail-backdrop-section">
            <img src="${backdropFull}" alt="${titleText} Backdrop" class="detail-backdrop-image">
          </div>
        ` : ''}
        <div class="detail-main-content">
          <div class="detail-content-grid">
            <div class="detail-poster-section">
              <img src="${posterFull}" alt="${titleText} Poster" class="detail-poster-image"
                onerror="this.onerror=null;this.src='${PLACEHOLDER_POSTER('Poster Unavailable')}';">
              <div class="detail-rating-box">
                ${createCircularRating(vote_average)}
                <div class="detail-rating-info">
                  <div class="detail-rating-label">User Score</div>
                  <div class="detail-rating-votes">${(vote_count || 0).toLocaleString()} Votes</div>
                </div>
              </div>
              ${quickFacts}
              <div class="detail-poster-info-boxes">
                ${crewFocusCard}
                ${financialOrSeriesCard}
              </div>
            </div>
            <div class="detail-info-section">
              <h1 class="detail-title">${titleText}</h1>
              ${tagline ? `<p class="detail-tagline">${tagline}</p>` : ''}
              <div class="detail-meta-row">
                <span class="detail-meta-item detail-meta-duration">${durationString}</span>
                ${certTag}
                <span class="detail-meta-item detail-meta-type">${mediaTypeLabel}</span>
                <span class="detail-meta-item">•</span>
                <span class="detail-meta-item detail-meta-status">${status}</span>
              </div>
              <div class="detail-overview-section">
                <h2 class="detail-overview-title">Overview</h2>
                <div class="detail-overview-text">${overview || 'No detailed overview available.'}</div>
              </div>
              ${castList ? `
                <div class="detail-cast-section">
                  <h3 class="detail-cast-title">
                    <i class="fas fa-mask"></i>Top Cast
                  </h3>
                  <div class="detail-cast-list">${castList}</div>
                </div>
              ` : ''}
              ${productionLogos ? `
                <div class="detail-production-section">
                  <h3 class="detail-production-title">Production Companies</h3>
                  <div class="detail-production-logos">${productionLogos}</div>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="detail-streaming-section">
            <h3 class="detail-streaming-title">Streaming Options</h3>
            <div class="detail-streaming-buttons">
              <a href="${trailerUrl}" target="_blank"
                class="button-link btn-youtube ${trailerKey ? '' : 'cursor-not-allowed opacity-75'}"
                ${trailerKey ? '' : 'onclick="event.preventDefault()" title="Trailer not found." aria-disabled="true"'}
              >
                <i class="fab fa-youtube mr-2"></i> Trailer
              </a>
              <a href="${movies123Url}" target="_blank" class="button-link btn-stream">
                <i class="fas fa-video mr-2"></i> 123movies
              </a>
              <a href="${soap2dayUrl}" target="_blank" class="button-link btn-stream soap2day">
                <i class="fas fa-video mr-2"></i> soap2day
              </a>
              <a href="${gokuUrl}" target="_blank" class="button-link btn-stream goku">
                <i class="fas fa-video mr-2"></i> goku
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  getById('backBtn')?.addEventListener('click', () => onBack?.());

  // Use event delegation for Google search - scoped to detail view container
  const detailContainer = getById('resultsContainer')?.querySelector('.detail-view-container');
  if (detailContainer) {
    const handleGoogleSearch = (e) => {
      const target = e.target.closest('[data-actor-name], [data-company-name]');
      if (!target) return;

      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      if (e.type === 'keydown') e.preventDefault();

      const searchQuery = target.getAttribute('data-actor-name') || target.getAttribute('data-company-name');
      if (searchQuery) {
        window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
      }
    };

    detailContainer.addEventListener('click', handleGoogleSearch);
    detailContainer.addEventListener('keydown', handleGoogleSearch);
  }
};

export const renderHeroCarousel = (movies) => {
  if (!movies?.length) {
    ui.hero.innerHTML = '';
    return { items: [], indicators: [] };
  }

  const heroMovies = movies.slice(0, 5).filter((movie) => movie.backdrop_path);
  if (!heroMovies.length) {
    ui.hero.innerHTML = '';
    return { items: [], indicators: [] };
  }

  const itemsMarkup = heroMovies
    .map((movie, index) => {
      const titleText = movie.title || movie.name;
      const type = movie.media_type || 'movie';
      const backdropPath = buildImageUrl('original', movie.backdrop_path);
      const overviewText = movie.overview
        ? movie.overview.length > 200
          ? `${movie.overview.substring(0, 200)}...`
          : movie.overview
        : 'No overview available.';
      const activeClass = index === 0 ? 'active' : '';

      return `
        <div class="hero-item ${activeClass}" data-id="${movie.id}" data-type="${type}" data-title="${titleText.replace(/"/g, '&quot;')}">
          <img src="${backdropPath}" alt="${titleText} Backdrop" class="w-full h-full object-cover filter brightness-[0.6]">
          <div class="absolute inset-0" style="background: linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,0.8) 80%, rgba(10,10,10,1) 100%);"></div>
          <div class="hero-content p-6 md:p-12">
            <h2 class="text-3xl md:text-6xl font-extrabold text-white mb-3 tracking-tight">${titleText}</h2>
            <p class="text-sm md:text-base text-gray-300 max-w-xl mb-4 md:mb-6 leading-relaxed hidden sm:block">${overviewText}</p>
            <button class="button-link bg-netflix-red text-white py-2 px-6 text-base md:text-lg hero-more-info"
              data-id="${movie.id}" data-type="${type}" data-title="${titleText.replace(/"/g, '&quot;')}">
              <i class="fas fa-info-circle mr-2"></i> More Info
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  const indicatorMarkup = heroMovies
    .map(
      (_, index) =>
        `<span class="hero-indicator ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`
    )
    .join('');

  ui.hero.innerHTML = `
    <div class="relative w-full h-[60vh] rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
      <div id="carouselItems" class="relative w-full h-full">${itemsMarkup}</div>
      <div id="carouselIndicators" class="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 p-2 rounded-full bg-black/50 backdrop-blur-sm">
        ${indicatorMarkup}
      </div>
    </div>
  `;

  const container = getById('carouselItems');
  const indicatorContainer = getById('carouselIndicators');

  return {
    movies: heroMovies,
    items: queryAll('.hero-item', container),
    indicators: queryAll('.hero-indicator', indicatorContainer)
  };
};

export const renderShelf = (title, mediaList) => {
  const cards = mediaList
    .filter((item) => item.poster_path)
    .map((media) => {
      const posterUrl = buildImageUrl('w342', media.poster_path);
      const placeholder = encodeURIComponent('No Poster');
      const titleText = media.title || media.name;
      return `
        <div class="media-card-shelf group" data-id="${media.id}" data-type="${media.media_type || 'movie'}"
          data-title="${titleText.replace(/"/g, '&quot;')}">
          <img src="${posterUrl}" alt="${titleText} Poster" loading="lazy"
            onerror="this.onerror=null;this.src='https://placehold.co/342x513/181818/d4d4d4?text=${placeholder}';">
          <div class="p-3">
            <h3 class="text-sm font-bold text-light-gray truncate group-hover:text-netflix-red">${titleText}</h3>
          </div>
        </div>
      `;
    })
    .join('');

  if (!cards.length) return;

  ui.results.insertAdjacentHTML(
    'beforeend',
    `
      <section class="w-full mb-8 media-shelf">
        <h2 class="text-2xl md:text-3xl font-extrabold text-white mb-2 px-2 tracking-tight">${title}</h2>
        <div class="shelf-scroll-container">${cards}</div>
      </section>
    `
  );
};

