const state = {
  isFetching: false,
  viewMode: 'gallery',
  isDiscoveryMode: true,
  currentQuery: '',
  discoveryMode: 'home',
  discoveryPage: 1,
  totalDiscoveryPages: 1,
  discoveryResultsCache: [],
  searchPage: 1,
  totalSearchPages: 1,
  searchResultsCache: [],
  detailId: null,
  detailType: null,
  heroMovies: [],
  carouselTimer: null
};

export const getState = () => state;
export const isFetching = () => state.isFetching;
export const setFetching = (value) => {
  state.isFetching = value;
};

export const isDiscoveryMode = () => state.isDiscoveryMode;
export const getDiscoveryMode = () => state.discoveryMode;
export const setDiscoveryMode = (mode) => {
  state.isDiscoveryMode = true;
  state.discoveryMode = mode;
  state.currentQuery = '';
};

export const enterSearchMode = (query) => {
  state.isDiscoveryMode = false;
  state.currentQuery = query;
};

export const resetToDiscoveryHome = () => {
  state.isDiscoveryMode = true;
  state.discoveryMode = 'home';
  state.currentQuery = '';
};

export const getCurrentQuery = () => state.currentQuery;

export const setViewMode = (mode) => {
  state.viewMode = mode;
};

export const getViewMode = () => state.viewMode;

export const getCurrentPage = () =>
  state.isDiscoveryMode ? state.discoveryPage : state.searchPage;

export const setCurrentPage = (value) => {
  if (state.isDiscoveryMode) {
    state.discoveryPage = value;
  } else {
    state.searchPage = value;
  }
};

export const incrementPage = () => {
  setCurrentPage(getCurrentPage() + 1);
};

export const getTotalPages = () =>
  state.isDiscoveryMode ? state.totalDiscoveryPages : state.totalSearchPages;

export const setTotalPages = (value) => {
  if (state.isDiscoveryMode) {
    state.totalDiscoveryPages = value;
  } else {
    state.totalSearchPages = value;
  }
};

export const getCache = () =>
  state.isDiscoveryMode ? state.discoveryResultsCache : state.searchResultsCache;

export const resetCache = () => {
  if (state.isDiscoveryMode) {
    state.discoveryResultsCache = [];
  } else {
    state.searchResultsCache = [];
  }
};

export const appendToCache = (items) => {
  const cache = getCache();
  cache.push(...items);
};

export const setDetailContext = (id, type) => {
  state.detailId = id;
  state.detailType = type;
};

export const getDetailContext = () => ({
  id: state.detailId,
  type: state.detailType
});

export const setHeroMovies = (movies) => {
  state.heroMovies = movies;
};

export const getHeroMovies = () => state.heroMovies;

export const setCarouselTimer = (timer) => {
  state.carouselTimer = timer;
};

export const clearCarouselTimer = () => {
  if (state.carouselTimer) {
    clearInterval(state.carouselTimer);
    state.carouselTimer = null;
  }
};

