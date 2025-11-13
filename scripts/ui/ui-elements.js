const byId = (id) => document.getElementById(id);

export const ui = {
  results: byId('resultsContainer'),
  hero: byId('heroContainer'),
  mediaInput: byId('mediaInput'),
  autocomplete: byId('autocomplete-results'),
  notifyModal: byId('notificationModal'),
  notifyText: byId('notificationText'),
  notifyOk: byId('notifyOk'),
  scrollTop: byId('scrollTopBtn'),
  tabs: byId('discoveryTabs'),
  searchBtn: byId('searchBtn')
};

export const queryAll = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
export const getById = byId;

