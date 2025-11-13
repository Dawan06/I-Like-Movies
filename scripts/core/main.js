import {
  DEBOUNCE_DELAY,
  CAROUSEL_INTERVAL_MS,
  DISCOVERY_CONFIG
} from './config.js';
import {
  isFetching,
  setFetching,
  isDiscoveryMode,
  getDiscoveryMode,
  setDiscoveryMode,
  enterSearchMode,
  getCurrentQuery,
  getViewMode,
  setViewMode,
  getCurrentPage,
  setCurrentPage,
  incrementPage,
  getTotalPages,
  setTotalPages,
  getCache,
  resetCache,
  appendToCache,
  setDetailContext,
  getDetailContext,
  setHeroMovies,
  setCarouselTimer,
  clearCarouselTimer
} from './state.js';
import { ui, queryAll, getById } from '../ui/ui-elements.js';
import { debounce } from '../utils/utils.js';
import { throttle, setupLazyImages } from '../utils/performance.js';
import {
  fetchTMDB,
  fetchMediaDetails,
  fetchMediaCredits,
  fetchMediaVideos
} from '../api/api.js';
import {
  showNotification,
  hideNotification,
  showPrimaryLoader,
  togglePaginationLoader,
  renderAutocomplete,
  clearAutocomplete,
  renderGallery,
  renderDetailView,
  renderHeroCarousel,
  renderShelf
} from '../ui/renderers.js';

let currentSlideIndex = 0;

const updateUrlHash = () => {
  const detail = getDetailContext();
  if (getViewMode() === 'detail' && detail.id && detail.type) {
    window.location.hash = `${detail.type}-${detail.id}`;
  } else {
    window.history.pushState(null, '', ' ');
  }
};

const setActiveTab = (mode) => {
  queryAll('.tab-button').forEach((button) => {
    const isActive = button.dataset.type === mode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive);
    button.setAttribute('tabindex', isActive ? '0' : '-1');
  });
};

const stopCarousel = () => {
  clearCarouselTimer();
};

const showSlide = (items, indicators, index) => {
  if (!items.length) return;
  if (index >= items.length) {
    currentSlideIndex = 0;
  } else if (index < 0) {
    currentSlideIndex = items.length - 1;
  } else {
    currentSlideIndex = index;
  }

  items.forEach((item, idx) => {
    item.classList.toggle('active', idx === currentSlideIndex);
  });
  indicators.forEach((indicator, idx) => {
    indicator.classList.toggle('active', idx === currentSlideIndex);
  });
};

const startCarousel = (items, indicators) => {
  stopCarousel();
  if (items.length <= 1) return;

  const timer = window.setInterval(() => {
    showSlide(items, indicators, currentSlideIndex + 1);
  }, CAROUSEL_INTERVAL_MS);

  setCarouselTimer(timer);
};

const bindHeroInteractions = (items, indicators) => {
  queryAll('.hero-more-info').forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = event.currentTarget;
      loadDetailView(target.dataset.id, target.dataset.type, true);
    });
  });

  indicators.forEach((indicator) => {
    indicator.addEventListener('click', (event) => {
      const index = Number.parseInt(event.currentTarget.dataset.index, 10);
      showSlide(items, indicators, index);
    });
  });
};

const renderHeroSection = (movies) => {
  const { items, indicators, movies: heroMovies } = renderHeroCarousel(movies);
  setHeroMovies(heroMovies);
  currentSlideIndex = 0;
  bindHeroInteractions(items, indicators);
  showSlide(items, indicators, 0);
  startCarousel(items, indicators);
};

const loadDiscoveryDashboard = async () => {
  if (isFetching()) return;
  setFetching(true);
  setViewMode('gallery');
  stopCarousel();
  showPrimaryLoader();

  try {
    const categories = ['trending_weekly', 'now_playing', 'top_rated'];
    const responses = await Promise.all(
      categories.map((key) => fetchTMDB(DISCOVERY_CONFIG[key].endpoint, 1))
    );

    ui.hero.innerHTML = '';
    ui.results.innerHTML = '';

    const trendingResults = responses[0].results;
    if (trendingResults.length) {
      renderHeroSection(trendingResults);
      const shelfItems = trendingResults.slice(5);
      if (shelfItems.length) {
        renderShelf('All Trending This Week', shelfItems);
      }
    }

    responses.slice(1).forEach((response, index) => {
      const key = categories[index + 1];
      renderShelf(DISCOVERY_CONFIG[key].title, response.results);
    });
  } catch (error) {
    console.error(error);
    showNotification(
      `Unable to load content. ${error.message || 'Please check your connection and try again.'}`,
      'error'
    );
    ui.results.innerHTML = '';
  } finally {
    setFetching(false);
    updateUrlHash();
  }
};

const renderDiscoveryList = async (isPagination = false) => {
  if (getDiscoveryMode() === 'home' && !isPagination) {
    await loadDiscoveryDashboard();
    return;
  }

  if (isFetching()) return;
  if (getDiscoveryMode() === 'home') return;

  if (isPagination && getCurrentPage() >= getTotalPages()) return;

  stopCarousel();
  setViewMode('gallery');
  if (!isPagination) {
    ui.hero.innerHTML = '';
    setCurrentPage(1);
    resetCache();
  } else {
    incrementPage();
  }

  setFetching(true);
  if (isPagination) {
    togglePaginationLoader(true);
  } else {
    showPrimaryLoader();
  }

  try {
    const { endpoint, title } = DISCOVERY_CONFIG[getDiscoveryMode()];
    const response = await fetchTMDB(endpoint, getCurrentPage());
    const mediaList = response.results;
    setTotalPages(response.totalPages);

    appendToCache(mediaList);

    renderGallery(mediaList, {
      isNewLoad: !isPagination,
      title,
      reachedEnd: getCurrentPage() >= getTotalPages()
    });
  } catch (error) {
    console.error(error);
    showNotification(
      `Unable to load results. ${error.message || 'Please check your connection and try again.'}`,
      'error'
    );
    if (!isPagination) {
      ui.results.innerHTML = '';
    }
  } finally {
    setFetching(false);
    togglePaginationLoader(false);
    updateUrlHash();
  }
};

const renderSearchResults = async (isPagination = false) => {
  const query = getCurrentQuery();
  if (!query) {
    changeDiscoveryMode('home');
    return;
  }

  if (isFetching()) return;
  if (isPagination && getCurrentPage() >= getTotalPages()) return;

  stopCarousel();
  setViewMode('gallery');
  if (!isPagination) {
    ui.hero.innerHTML = '';
    setCurrentPage(1);
    resetCache();
  } else {
    incrementPage();
  }

  setFetching(true);
  if (isPagination) {
    togglePaginationLoader(true);
  } else {
    showPrimaryLoader();
  }

  try {
    const response = await fetchTMDB('/search/multi', getCurrentPage(), query);
    const mediaList = response.results;
    setTotalPages(response.totalPages);

    if (!mediaList.length && !isPagination) {
      ui.results.innerHTML = `<p class="text-gray-400 text-xl p-8 w-full text-center">Sorry, no results were found for "${query}". Please try a different name.</p>`;
      return;
    }

    appendToCache(mediaList);

    renderGallery(mediaList, {
      isNewLoad: !isPagination,
      title: `Search Results for "${query}"`,
      reachedEnd: getCurrentPage() >= getTotalPages()
    });
  } catch (error) {
    console.error(error);
    showNotification(
      `Unable to load results. ${error.message || 'Please check your connection and try again.'}`,
      'error'
    );
    if (!isPagination) {
      ui.results.innerHTML = '';
    }
  } finally {
    setFetching(false);
    togglePaginationLoader(false);
    updateUrlHash();
  }
};

const loadContent = (isPagination = false) => {
  if (isDiscoveryMode()) {
    renderDiscoveryList(isPagination);
  } else {
    renderSearchResults(isPagination);
  }
};

const goBackToGallery = () => {
  setViewMode('gallery');
  const cache = getCache();
  if (isDiscoveryMode() && getDiscoveryMode() === 'home') {
    loadDiscoveryDashboard();
    return;
  }

  if (!isDiscoveryMode() && !getCurrentQuery()) {
    changeDiscoveryMode('home');
    return;
  }

  const title = isDiscoveryMode()
    ? DISCOVERY_CONFIG[getDiscoveryMode()].title
    : `Search Results for "${getCurrentQuery()}"`;

  if (!cache.length) {
    loadContent(false);
    return;
  }

  ui.results.innerHTML = '';
  renderGallery(cache, {
    isNewLoad: true,
    title,
    reachedEnd: getCurrentPage() >= getTotalPages()
  });

  updateUrlHash();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const loadDetailView = async (id, type, updateHistory = true) => {
  if (isFetching()) return;
  setFetching(true);
  setViewMode('detail');
  setDetailContext(id, type);
  stopCarousel();
  ui.hero.innerHTML = '';
  showPrimaryLoader('Loading details...');

  try {
    const [details, trailerKey, credits] = await Promise.all([
      fetchMediaDetails(type, id),
      fetchMediaVideos(type, id),
      fetchMediaCredits(type, id)
    ]);

    const contextLabel = isDiscoveryMode()
      ? getDiscoveryMode() === 'home'
        ? 'Discovery'
        : DISCOVERY_CONFIG[getDiscoveryMode()].title
      : `Search Results`;

    renderDetailView(details, {
      trailerKey,
      credits,
      mediaType: type,
      onBack: goBackToGallery,
      contextLabel
    });

    if (updateHistory) {
      updateUrlHash();
    }
  } catch (error) {
    console.error(error);
    showNotification(
      `Unable to load details. ${error.message || 'Please try again later.'}`,
      'error'
    );
    goBackToGallery();
  } finally {
    setFetching(false);
  }
};

const changeDiscoveryMode = (mode) => {
  if (getDiscoveryMode() === mode && isDiscoveryMode()) {
    return;
  }

  setDiscoveryMode(mode);
  ui.mediaInput.value = '';
  setActiveTab(mode);
  loadContent(false);
};

const startSearch = (query) => {
  if (!query) {
    changeDiscoveryMode('home');
    return;
  }

  ui.mediaInput.value = query;
  enterSearchMode(query);
  setActiveTab('');
  loadContent(false);
};

const startSearchFromInput = () => {
  const query = ui.mediaInput.value.trim();
  clearAutocomplete();
  startSearch(query);
};

const handleAutocompleteInput = debounce(async (event) => {
  const query = event.target.value.trim();
  if (query.length < 2) {
    clearAutocomplete();
    return;
  }

  try {
    const { results } = await fetchTMDB('/search/multi', 1, query);
    renderAutocomplete(results, query, {
      onSelect: (media) => {
        ui.mediaInput.value = media.title || media.name || '';
        clearAutocomplete();
        loadDetailView(media.id, media.media_type || 'movie', true);
      },
      onSearchAll: (value) => {
        clearAutocomplete();
        startSearch(value);
      }
    });
  } catch (error) {
    console.error(error);
    clearAutocomplete();
  }
}, DEBOUNCE_DELAY);

const handleInfiniteScroll = throttle(() => {
  if (
    isFetching() ||
    getViewMode() !== 'gallery' ||
    (isDiscoveryMode() && getDiscoveryMode() === 'home') ||
    !getById('mediaGallery')
  ) {
    return;
  }

  const scrollThreshold = 800;
  const scrollPosition = window.innerHeight + window.scrollY;
  const totalHeight = document.body.offsetHeight;

  if (scrollPosition >= totalHeight - scrollThreshold) {
    const hasMore = getCurrentPage() < getTotalPages();
    if (hasMore) {
      loadContent(true);
    }
  }
}, 200);

const handleHashChange = () => {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('movie-') || hash.startsWith('tv-')) {
    const [type, id] = hash.split('-');
    loadDetailView(id, type, false);
    return;
  }

  if (getViewMode() === 'detail') {
    goBackToGallery();
  } else {
    init();
  }
};

const goToHome = () => {
  setDiscoveryMode('home');
  setActiveTab('home');
  loadDiscoveryDashboard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateUrlHash();
};

const init = () => {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('movie-') || hash.startsWith('tv-')) {
    const [type, id] = hash.split('-');
    loadDetailView(id, type, false);
  } else {
    loadDiscoveryDashboard();
  }
  
  const homeTitle = getById('homeTitle');
  if (homeTitle) {
    homeTitle.addEventListener('click', goToHome);
    homeTitle.setAttribute('role', 'button');
    homeTitle.setAttribute('aria-label', 'Go to home page');
    homeTitle.setAttribute('tabindex', '0');
    homeTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goToHome();
      }
    });
  }
};

ui.mediaInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    startSearchFromInput();
    clearAutocomplete();
    ui.mediaInput.blur();
  }
});

ui.mediaInput.addEventListener('input', handleAutocompleteInput);
ui.searchBtn.addEventListener('click', startSearchFromInput);

ui.tabs.addEventListener('click', (event) => {
  const button = event.target.closest('.tab-button');
  if (button) {
    changeDiscoveryMode(button.dataset.type);
  }
});

ui.tabs.addEventListener('keydown', (event) => {
  const buttons = Array.from(ui.tabs.querySelectorAll('.tab-button'));
  const currentIndex = buttons.findIndex((btn) => btn === document.activeElement);
  
  if (currentIndex === -1) return;
  
  let targetIndex = currentIndex;
  
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault();
    targetIndex = (currentIndex + 1) % buttons.length;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault();
    targetIndex = (currentIndex - 1 + buttons.length) % buttons.length;
  } else if (event.key === 'Home') {
    event.preventDefault();
    targetIndex = 0;
  } else if (event.key === 'End') {
    event.preventDefault();
    targetIndex = buttons.length - 1;
  }
  
  if (targetIndex !== currentIndex) {
    buttons[targetIndex].focus();
    changeDiscoveryMode(buttons[targetIndex].dataset.type);
  }
});

const handleCardInteraction = (card) => {
  if (!card || card.closest('.hero-more-info')) return;
  loadDetailView(card.dataset.id, card.dataset.type, true);
};

ui.results.addEventListener('click', (event) => {
  const card = event.target.closest('[data-id][data-type]');
  handleCardInteraction(card);
});

ui.results.addEventListener('keydown', (event) => {
  const card = event.target.closest('[data-id][data-type]');
  if (!card) return;
  
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleCardInteraction(card);
  }
});

window.addEventListener('scroll', () => {
  if (window.scrollY > 400) {
    ui.scrollTop.classList.remove('hidden');
    ui.scrollTop.classList.add('flex');
  } else {
    ui.scrollTop.classList.add('hidden');
    ui.scrollTop.classList.remove('flex');
  }

  handleInfiniteScroll();
});

ui.scrollTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('popstate', handleHashChange);
window.addEventListener('hashchange', handleHashChange);

document.addEventListener('click', (event) => {
  if (
    !ui.mediaInput.contains(event.target) &&
    !ui.autocomplete.contains(event.target)
  ) {
    clearAutocomplete();
  }
});

ui.notifyOk.addEventListener('click', hideNotification);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!ui.notifyModal.classList.contains('hidden')) {
      hideNotification();
    }
    if (!ui.autocomplete.classList.contains('hidden')) {
      clearAutocomplete();
      ui.mediaInput.focus();
    }
  }
});

setupLazyImages();

init();

