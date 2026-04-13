const USERS_KEY = 'btp_users';
const CURRENT_USER_KEY = 'btp_current_user';
const FAVORITES_KEY = 'btp_favorites';
const THEME_KEY = 'btp_theme';
const TRIPS_KEY = 'btp_trip_plans';
const LOGIN_REDIRECT_KEY = 'btp_login_redirect';

const budgetRank = { Low: 1, Medium: 2, High: 3 };
const destinations = window.travelDestinations || [];

function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

function qsa(selector, scope = document) {
  return [...scope.querySelectorAll(selector)];
}

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
}

function setCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

function getFavorites() {
  return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '{}');
}

function saveFavorites(data) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(data));
}

function getTripPlans() {
  return JSON.parse(localStorage.getItem(TRIPS_KEY) || '{}');
}

function saveTripPlans(data) {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(data));
}

function getUserTrips() {
  const user = getCurrentUser();
  if (!user) return [];
  const allTrips = getTripPlans();
  return allTrips[user.email] || [];
}

function createTripId() {
  return `trip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function saveTripForCurrentUser(trip) {
  const user = getCurrentUser();
  if (!user) return false;

  const allTrips = getTripPlans();
  const currentTrips = allTrips[user.email] || [];
  allTrips[user.email] = [{
    id: createTripId(),
    createdAt: new Date().toISOString(),
    ...trip
  }, ...currentTrips];
  saveTripPlans(allTrips);

  if (document.body.dataset.page === 'profile') renderProfilePage();
  return true;
}

function getUserFavorites() {
  const user = getCurrentUser();
  if (!user) return [];
  const allFavorites = getFavorites();
  return allFavorites[user.email] || [];
}

function rememberLoginRedirect() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  const hash = window.location.hash || '';
  localStorage.setItem(LOGIN_REDIRECT_KEY, `${path}${hash}`);
}

function getLoginRedirect() {
  const redirect = localStorage.getItem(LOGIN_REDIRECT_KEY) || 'profile.html';
  localStorage.removeItem(LOGIN_REDIRECT_KEY);
  return redirect;
}

function redirectToLogin(message) {
  if (message) showToast(message);
  rememberLoginRedirect();
  setTimeout(() => {
    window.location.href = 'login.html';
  }, message ? 700 : 0);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toggleFavorite(destinationId) {
  const user = getCurrentUser();
  if (!user) {
    redirectToLogin('Please login to save favorites.');
    return;
  }

  const allFavorites = getFavorites();
  const current = allFavorites[user.email] || [];
  const exists = current.includes(destinationId);
  allFavorites[user.email] = exists
    ? current.filter((id) => id !== destinationId)
    : [...current, destinationId];

  saveFavorites(allFavorites);
  if (document.body.dataset.page === 'home') applyFilters();
  if (document.body.dataset.page === 'profile') renderProfilePage();
}

function findDestinationById(id) {
  return destinations.find((item) => item.id === id);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value) {
  if (!value) return 'Today';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function getDayCount(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / 86400000) + 1;
}

function todayInputValue() {
  return new Date().toISOString().split('T')[0];
}

function showToast(message) {
  const toast = qs('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 2400);
}

function applyTheme(savedTheme) {
  const theme = savedTheme || localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  const btn = qs('#themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function initThemeToggle() {
  applyTheme();
  const btn = qs('#themeToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

function updateAuthUI() {
  const authArea = qs('#authArea');
  if (!authArea) return;

  const user = getCurrentUser();
  if (user) {
    authArea.innerHTML = `
      <span class="welcome-pill">Hi, ${escapeHtml(user.name.split(' ')[0])}</span>
      <a class="secondary-btn" href="index.html">Home</a>
      <a class="secondary-btn" href="profile.html">Profile</a>
      <button id="logoutBtn" class="primary-btn alt-btn" type="button">Logout</button>
    `;

    qs('#logoutBtn')?.addEventListener('click', () => {
      logoutUser();
      showToast('Logged out successfully.');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
    });
  } else {
    authArea.innerHTML = `
      <a class="secondary-btn" href="login.html">Login</a>
      <a class="primary-btn" href="signup.html">Sign up</a>
    `;
  }
}

function createList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderDestinations(list) {
  const grid = qs('#destinationGrid');
  const emptyState = qs('#emptyState');
  if (!grid) return;

  const favorites = getUserFavorites();

  if (!list.length) {
    grid.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');
  grid.innerHTML = list.map((item) => `
    <article class="destination-card">
      <div class="card-media-wrap">
        <img class="card-media" src="${item.image}" alt="${escapeHtml(item.name)}" data-open-id="${item.id}" />
        <button class="favorite-btn ${favorites.includes(item.id) ? 'active' : ''}" data-favorite-id="${item.id}" type="button" aria-label="Save favorite">
          ${favorites.includes(item.id) ? '♥' : '♡'}
        </button>
      </div>
      <div class="card-body">
        <div class="card-topline">
          <h3>${escapeHtml(item.name)}</h3>
          <span class="budget-tag ${item.budget.toLowerCase()}">${escapeHtml(item.budget)}</span>
        </div>
        <p>${escapeHtml(item.description)}</p>
        <div class="card-meta">
          <span>🗺️ ${escapeHtml(item.region)}</span>
          <span>📅 ${escapeHtml(item.suggestedDuration)}</span>
          <span>💸 ${escapeHtml(item.budgetEstimate)}</span>
        </div>
        <button class="card-link" data-open-id="${item.id}" type="button">View details</button>
      </div>
    </article>
  `).join('');

  qsa('[data-open-id]').forEach((el) => {
    el.addEventListener('click', () => handleOpenDetails(Number(el.dataset.openId)));
  });

  qsa('[data-favorite-id]').forEach((el) => {
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleFavorite(Number(el.dataset.favoriteId));
    });
  });
}

function applyFilters() {
  const search = (qs('#searchInput')?.value || '').trim().toLowerCase();
  const budget = qs('#budgetFilter')?.value || 'All';
  const days = qs('#daysFilter')?.value || 'All';
  const sort = qs('#sortFilter')?.value || 'default';

  let filtered = [...destinations].filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      item.region.toLowerCase().includes(search) ||
      item.places.join(' ').toLowerCase().includes(search);
    const matchesBudget = budget === 'All' || item.budget === budget;
    const matchesDays = days === 'All' || item.daysCategory === days;
    return matchesSearch && matchesBudget && matchesDays;
  });

  if (sort === 'budget-asc') {
    filtered.sort((a, b) => budgetRank[a.budget] - budgetRank[b.budget]);
  } else if (sort === 'budget-desc') {
    filtered.sort((a, b) => budgetRank[b.budget] - budgetRank[a.budget]);
  } else if (sort === 'name-asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  renderDestinations(filtered);

  const resultsInfo = qs('#resultsInfo');
  if (resultsInfo) {
    resultsInfo.textContent = `Showing ${filtered.length} of ${destinations.length} destinations`;
  }
}

function renderPlanTripButton(destination) {
  const planTripPanel = qs('#planTripPanel');
  if (!planTripPanel) return;

  planTripPanel.innerHTML = '<button id="planTripTrigger" class="primary-btn full-width" type="button">Book Trip</button>';
  qs('#planTripTrigger')?.addEventListener('click', () => renderPlanTripForm(destination));
}

function renderPlanTripForm(destination) {
  const planTripPanel = qs('#planTripPanel');
  if (!planTripPanel) return;

  planTripPanel.innerHTML = `
    <form id="planTripForm" class="booking-form">
      <div class="filter-group">
        <label for="bookingStartLocation">Start Location</label>
        <input id="bookingStartLocation" type="text" placeholder="Enter your start location" required />
      </div>
      <div class="filter-group">
        <label for="bookingDestination">Destination</label>
        <input id="bookingDestination" class="readonly-field" type="text" value="${escapeHtml(destination.name)}" readonly />
      </div>
      <div class="filter-group">
        <label for="bookingTravelDate">Travel Date</label>
        <input id="bookingTravelDate" type="date" min="${todayInputValue()}" required />
      </div>
      <div class="filter-group">
        <label for="bookingHotel">Hotel selection</label>
        <select id="bookingHotel" required>
          ${destination.hotels.map((hotel) => `<option value="${escapeHtml(hotel)}">${escapeHtml(hotel)}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label for="bookingAdults">Adults</label>
        <input id="bookingAdults" type="number" min="1" value="1" required />
      </div>
      <div class="filter-group">
        <label for="bookingChildren">Children</label>
        <input id="bookingChildren" type="number" min="0" value="0" required />
      </div>
      <div class="filter-group">
        <label for="bookingOldAge">Old Age</label>
        <input id="bookingOldAge" type="number" min="0" value="0" required />
      </div>
      <button class="primary-btn full-width" type="submit">Book Trip</button>
    </form>
  `;

  qs('#planTripForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const user = getCurrentUser();
    if (!user) {
      redirectToLogin('Please login to save your trip plan.');
      return;
    }

    const startLocation = qs('#bookingStartLocation')?.value.trim();
    const travelDate = qs('#bookingTravelDate')?.value;
    const hotel = qs('#bookingHotel')?.value;
    const adults = Math.max(0, Number(qs('#bookingAdults')?.value || 0));
    const children = Math.max(0, Number(qs('#bookingChildren')?.value || 0));
    const oldAge = Math.max(0, Number(qs('#bookingOldAge')?.value || 0));
    const people = adults + children + oldAge;

    if (!startLocation || !travelDate || !hotel) {
      showToast('Please complete the trip form.');
      return;
    }

    if (people <= 0) {
      showToast('Please add at least one traveler.');
      return;
    }

    saveTripForCurrentUser({
      type: 'booking',
      title: `${destination.name} booking`,
      userName: user.name,
      destination: destination.name,
      fromDestination: startLocation,
      toDestination: destination.name,
      fromDate: travelDate,
      toDate: travelDate,
      travelDate,
      hotel,
      people,
      adults,
      children,
      oldAge,
      estimatedBudget: null
    });

    planTripPanel.innerHTML = `
      <div class="budget-result success-result">
        <h3>Trip booked successfully</h3>
        <p><strong>${escapeHtml(user.name)}</strong> booked <strong>${escapeHtml(destination.name)}</strong> from <strong>${escapeHtml(startLocation)}</strong> on <strong>${formatDate(travelDate)}</strong> for <strong>${people}</strong> traveler(s).</p>
        <p>Hotel: <strong>${escapeHtml(hotel)}</strong> • Adults: <strong>${adults}</strong> • Children: <strong>${children}</strong> • Old Age: <strong>${oldAge}</strong></p>
      </div>
    `;
    showToast('Trip booking saved to your profile.');
  });
}

function handleOpenDetails(id) {
  const user = getCurrentUser();
  if (!user) {
    redirectToLogin('Please login to view full destination details.');
    return;
  }

  const destination = findDestinationById(id);
  if (!destination) return;

  const modal = qs('#detailModal');
  const content = qs('#modalContent');
  if (!modal || !content) return;

  const itinerary = destination.package.slice(0, 3);

  content.innerHTML = `
    <div class="modal-hero">
      <img src="${destination.image}" alt="${escapeHtml(destination.name)}" />
      <div class="modal-hero-content">
        <span class="budget-tag ${destination.budget.toLowerCase()}">${escapeHtml(destination.budget)} Budget</span>
        <h2>📍 ${escapeHtml(destination.name)}</h2>
        <p>${escapeHtml(destination.description)}</p>
        <div class="modal-badges">
          <span>🗺️ ${escapeHtml(destination.region)}</span>
          <span>📅 ${escapeHtml(destination.suggestedDuration)}</span>
          <span>💰 ${escapeHtml(destination.budgetEstimate)}</span>
        </div>
      </div>
    </div>

    <div class="detail-grid">
      <div class="detail-card">
        <h3>📌 Place info</h3>
        ${createList(destination.places)}
      </div>
      <div class="detail-card">
        <h3>🏨 Hotels</h3>
        ${createList(destination.hotels)}
      </div>
      <div class="detail-card">
        <h3>🍽️ Food options</h3>
        ${createList(destination.food)}
      </div>
      <div class="detail-card">
        <h3>🗓️ 2–3 day itinerary</h3>
        ${createList(itinerary)}
      </div>
    </div>

    <div id="planTripPanel" class="plan-trip-panel"></div>
  `;

  renderPlanTripButton(destination);
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeModal() {
  const modal = qs('#detailModal');
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function fillDestinationInputs() {
  const destinationSelect = qs('#destinationSelect');
  const fromDestinationSelect = qs('#fromDestinationSelect');
  const routeFrom = qs('#routeFrom');
  const routeDestinations = qs('#routeDestinations');
  const count = qs('#destinationCount');
  const today = todayInputValue();
  const afterTomorrow = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

  if (count) count.textContent = String(destinations.length);

  if (destinationSelect) {
    destinationSelect.innerHTML = destinations
      .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} (${escapeHtml(item.budget)})</option>`)
      .join('');
  }

  if (fromDestinationSelect) {
    fromDestinationSelect.innerHTML = destinations
      .map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`)
      .join('');
  }

  if (destinationSelect && fromDestinationSelect && destinations.length > 1) {
    destinationSelect.value = String(destinations[0].id);
    fromDestinationSelect.value = String(destinations[1].id);
    syncBudgetDestinationOptions();
  }

  if (routeFrom) {
    routeFrom.innerHTML = destinations
      .map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`)
      .join('');
  }

  if (routeDestinations) {
    routeDestinations.innerHTML = destinations
      .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} — ${escapeHtml(item.region)}</option>`)
      .join('');
  }

  if (qs('#fromDateInput')) {
    qs('#fromDateInput').value = today;
    qs('#fromDateInput').min = today;
  }

  if (qs('#toDateInput')) {
    qs('#toDateInput').value = afterTomorrow;
    qs('#toDateInput').min = today;
  }

  syncRouteDestinationOptions();
}

function syncBudgetDestinationOptions() {
  const fromDestinationSelect = qs('#fromDestinationSelect');
  const destinationSelect = qs('#destinationSelect');
  if (!fromDestinationSelect || !destinationSelect) return;

  const fromId = Number(fromDestinationSelect.value);
  [...destinationSelect.options].forEach((option) => {
    const optionId = Number(option.value);
    option.disabled = optionId === fromId;
  });

  if (Number(destinationSelect.value) === fromId) {
    const availableOption = [...destinationSelect.options].find((option) => !option.disabled);
    if (availableOption) destinationSelect.value = availableOption.value;
  }
}

function syncRouteDestinationOptions() {
  const routeFrom = qs('#routeFrom');
  const routeDestinations = qs('#routeDestinations');
  if (!routeFrom || !routeDestinations) return;

  const fromId = Number(routeFrom.value);
  [...routeDestinations.options].forEach((option) => {
    const optionId = Number(option.value);
    option.disabled = optionId === fromId;
    if (option.disabled) option.selected = false;
  });
}

function initRoutePlanner() {
  const form = qs('#routePlannerForm');
  const routeFrom = qs('#routeFrom');
  const routeDestinations = qs('#routeDestinations');
  const routeResult = qs('#routeResult');
  if (!form || !routeFrom || !routeDestinations || !routeResult) return;

  routeFrom.addEventListener('change', syncRouteDestinationOptions);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const from = findDestinationById(Number(routeFrom.value));
    const selectedIds = [...routeDestinations.selectedOptions].map((option) => Number(option.value));
    const selectedDestinations = selectedIds.map(findDestinationById).filter(Boolean);

    if (!from || !selectedDestinations.length) {
      routeResult.innerHTML = '<p>Please choose a starting point and at least one destination.</p>';
      return;
    }

    const routeNames = [from.name, ...selectedDestinations.map((item) => item.name)];
    const estimatedRouteBudget = selectedDestinations.reduce((sum, item) => sum + item.dailyCost * 2 + item.transportBase, 0);

    routeResult.innerHTML = `
      <h3>${routeNames.map(escapeHtml).join(' → ')}</h3>
      <p><strong>Start from:</strong> ${escapeHtml(from.name)} • <strong>Stops:</strong> ${selectedDestinations.length}</p>
      <p><strong>Suggested route budget:</strong> ${formatCurrency(estimatedRouteBudget)} for a short multi-city plan.</p>
      <div class="route-chip-wrap">
        ${selectedDestinations.map((item) => `<span>${escapeHtml(item.name)}</span>`).join('')}
      </div>
    `;
  });
}

function updateCalculatorAccess() {
  const user = getCurrentUser();
  const lock = qs('#calculatorLock');
  const form = qs('#budgetForm');
  if (!lock || !form) return;

  if (user) {
    lock.classList.add('hidden');
    qsa('input, select, button', form).forEach((el) => {
      el.disabled = false;
    });
  } else {
    lock.classList.remove('hidden');
    qsa('input, select, button', form).forEach((el) => {
      el.disabled = true;
    });

    lock.onclick = (event) => {
      event.preventDefault();
      redirectToLogin();
    };
    qs('a', lock)?.addEventListener('click', (event) => {
      event.preventDefault();
      redirectToLogin();
    });
  }
}

function initCalculator() {
  const form = qs('#budgetForm');
  if (!form) return;

  qs('#fromDestinationSelect')?.addEventListener('change', syncBudgetDestinationOptions);
  qs('#fromDateInput')?.addEventListener('change', () => {
    const fromDateInput = qs('#fromDateInput');
    const toDateInput = qs('#toDateInput');
    if (!fromDateInput || !toDateInput) return;
    toDateInput.min = fromDateInput.value || todayInputValue();
    if (toDateInput.value && toDateInput.value < toDateInput.min) {
      toDateInput.value = toDateInput.min;
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const user = getCurrentUser();
    if (!user) {
      redirectToLogin('Login required to use calculator.');
      return;
    }

    const fromDestinationId = Number(qs('#fromDestinationSelect')?.value);
    const destinationId = Number(qs('#destinationSelect')?.value);
    const people = Math.max(1, Number(qs('#peopleInput')?.value || 1));
    const fromDate = qs('#fromDateInput')?.value;
    const toDate = qs('#toDateInput')?.value;
    const fromDestination = findDestinationById(fromDestinationId);
    const destination = findDestinationById(destinationId);
    const result = qs('#budgetResult');
    if (!fromDestination || !destination || !result) return;

    if (!fromDate || !toDate) {
      showToast('Please select your travel dates.');
      return;
    }

    if (fromDestinationId === destinationId) {
      showToast('Please choose different start and end destinations.');
      return;
    }

    const days = getDayCount(fromDate, toDate);
    if (days <= 0) {
      showToast('To Date must be after From Date.');
      return;
    }

    const routeAdjustment = Math.max(600, Math.abs(destination.id - fromDestination.id) * 120);
    const total = ((destination.dailyCost * days) + destination.transportBase + routeAdjustment) * people;

    result.innerHTML = `
      <h3>Estimated Total: ${formatCurrency(total)}</h3>
      <p><strong>${escapeHtml(fromDestination.name)}</strong> to <strong>${escapeHtml(destination.name)}</strong> for <strong>${people}</strong> traveler(s) from <strong>${formatDate(fromDate)}</strong> to <strong>${formatDate(toDate)}</strong>.</p>
      <p>Includes an approximate stay, food, local travel, and a basic transport base cost.</p>
    `;

    saveTripForCurrentUser({
      type: 'budget',
      title: `${fromDestination.name} to ${destination.name}`,
      destination: destination.name,
      fromDestination: fromDestination.name,
      toDestination: destination.name,
      fromDate,
      toDate,
      people,
      days,
      estimatedBudget: total,
      hotel: '',
      userName: user.name
    });

    showToast('Trip saved to your profile.');
  });
}

function initHomePage() {
  updateAuthUI();
  fillDestinationInputs();
  updateCalculatorAccess();
  renderDestinations(destinations);
  applyFilters();
  initRoutePlanner();
  initCalculator();

  ['#searchInput', '#budgetFilter', '#daysFilter', '#sortFilter'].forEach((selector) => {
    qs(selector)?.addEventListener(selector === '#searchInput' ? 'input' : 'change', applyFilters);
  });

  qs('#closeModal')?.addEventListener('click', closeModal);
  qs('#detailModal')?.addEventListener('click', (event) => {
    if (event.target.dataset.close === 'true') closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}

function renderProfileFavorites(favoriteDestinations) {
  const grid = qs('#profileFavoritesGrid');
  const emptyState = qs('#profileEmptyState');
  if (!grid) return;

  if (!favoriteDestinations.length) {
    grid.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');
  grid.innerHTML = favoriteDestinations.map((item) => `
    <article class="destination-card">
      <div class="card-media-wrap">
        <img class="card-media" src="${item.image}" alt="${escapeHtml(item.name)}" />
      </div>
      <div class="card-body">
        <div class="card-topline">
          <h3>${escapeHtml(item.name)}</h3>
          <span class="budget-tag ${item.budget.toLowerCase()}">${escapeHtml(item.budget)}</span>
        </div>
        <p>${escapeHtml(item.description)}</p>
        <div class="card-meta">
          <span>🗺️ ${escapeHtml(item.region)}</span>
          <span>📅 ${escapeHtml(item.suggestedDuration)}</span>
          <span>💸 ${escapeHtml(item.budgetEstimate)}</span>
        </div>
        <div class="profile-card-actions">
          <a class="secondary-btn" href="index.html">Open on home</a>
          <button class="primary-btn alt-btn" type="button" data-remove-favorite="${item.id}">Remove</button>
        </div>
      </div>
    </article>
  `).join('');

  qsa('[data-remove-favorite]').forEach((button) => {
    button.addEventListener('click', () => toggleFavorite(Number(button.dataset.removeFavorite)));
  });
}

function formatTripDateLabel(trip) {
  if (trip.fromDate && trip.toDate && trip.fromDate !== trip.toDate) {
    return `${formatDate(trip.fromDate)} – ${formatDate(trip.toDate)}`;
  }
  if (trip.travelDate) return formatDate(trip.travelDate);
  if (trip.fromDate) return formatDate(trip.fromDate);
  return 'Date not set';
}

function getTripTotalPeople(trip) {
  const countedPeople = Number(trip.people || 0);
  if (countedPeople > 0) return countedPeople;
  return Number(trip.adults || 0) + Number(trip.children || 0) + Number(trip.oldAge || 0) || 1;
}

function renderProfileTrips(trips) {
  const grid = qs('#profileTripsGrid');
  const emptyState = qs('#profileTripsEmpty');
  const currentUser = getCurrentUser();
  if (!grid) return;

  if (!trips.length) {
    grid.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');
  grid.innerHTML = trips.map((trip) => `
    <article class="trip-card">
      <div class="trip-card-head">
        <div>
          <span class="budget-tag ${trip.type === 'booking' ? 'medium' : 'low'}">${trip.type === 'booking' ? 'Booking' : 'Budget Plan'}</span>
          <h3>${escapeHtml(trip.title || trip.destination || 'Trip Plan')}</h3>
        </div>
        ${trip.estimatedBudget ? `<strong>${formatCurrency(trip.estimatedBudget)}</strong>` : `<strong>${escapeHtml(trip.destination || trip.toDestination || '-')}</strong>`}
      </div>
      <div class="trip-meta-grid">
        <div class="trip-meta-item">
          <span>User name</span>
          <strong>${escapeHtml(trip.userName || currentUser?.name || '-')}</strong>
        </div>
        <div class="trip-meta-item">
          <span>From</span>
          <strong>${escapeHtml(trip.fromDestination || '-')}</strong>
        </div>
        <div class="trip-meta-item">
          <span>Destination</span>
          <strong>${escapeHtml(trip.toDestination || trip.destination || '-')}</strong>
        </div>
        <div class="trip-meta-item">
          <span>Dates</span>
          <strong>${escapeHtml(formatTripDateLabel(trip))}</strong>
        </div>
        <div class="trip-meta-item">
          <span>Total people</span>
          <strong>${escapeHtml(getTripTotalPeople(trip))}</strong>
        </div>
        <div class="trip-meta-item">
          <span>Adults</span>
          <strong>${escapeHtml(trip.adults ?? (trip.type === 'booking' ? 0 : '-'))}</strong>
        </div>
        <div class="trip-meta-item">
          <span>Children</span>
          <strong>${escapeHtml(trip.children ?? (trip.type === 'booking' ? 0 : '-'))}</strong>
        </div>
        <div class="trip-meta-item">
          <span>Old Age</span>
          <strong>${escapeHtml(trip.oldAge ?? (trip.type === 'booking' ? 0 : '-'))}</strong>
        </div>
        <div class="trip-meta-item">
          <span>Hotel</span>
          <strong>${escapeHtml(trip.hotel || 'Not selected')}</strong>
        </div>
      </div>
    </article>
  `).join('');
}

function renderProfilePage() {
  const gate = qs('#profileGate');
  const content = qs('#profileContent');
  const user = getCurrentUser();

  if (!user) {
    gate?.classList.remove('hidden');
    content?.classList.add('hidden');
    return;
  }

  gate?.classList.add('hidden');
  content?.classList.remove('hidden');

  const favoriteIds = getUserFavorites();
  const favoriteDestinations = favoriteIds.map(findDestinationById).filter(Boolean);
  const trips = getUserTrips();

  qs('#profileName').textContent = user.name;
  qs('#profileEmail').textContent = user.email;
  qs('#profileFavoriteCount').textContent = String(favoriteDestinations.length);
  qs('#profileDestinationCount').textContent = String(destinations.length);
  qs('#profileMemberSince').textContent = formatDate(user.createdAt);
  qs('#profileDetailName').textContent = user.name;
  qs('#profileDetailEmail').textContent = user.email;
  qs('#profileDetailFavorites').textContent = String(favoriteDestinations.length);
  qs('#profileDetailPlans').textContent = String(trips.length);
  qs('#profileFavoritesInfo').textContent = `You have saved ${favoriteDestinations.length} favorite destination${favoriteDestinations.length === 1 ? '' : 's'}.`;
  qs('#profileTripsInfo').textContent = `You have ${trips.length} saved trip plan${trips.length === 1 ? '' : 's'} and booking${trips.length === 1 ? '' : 's'}.`;

  renderProfileTrips(trips);
  renderProfileFavorites(favoriteDestinations);
}

function initProfilePage() {
  updateAuthUI();
  renderProfilePage();
}

function initLoginPage() {
  if (getCurrentUser()) {
    window.location.href = 'profile.html';
    return;
  }

  const form = qs('#loginForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = qs('#loginEmail').value.trim().toLowerCase();
    const password = qs('#loginPassword').value;

    const user = getUsers().find((item) => item.email === email && item.password === password);
    if (!user) {
      showToast('Invalid email or password.');
      return;
    }

    setCurrentUser({
      name: user.name,
      email: user.email,
      createdAt: user.createdAt || new Date().toISOString()
    });

    showToast('Login successful. Redirecting...');
    setTimeout(() => {
      window.location.href = getLoginRedirect();
    }, 800);
  });
}

function initSignupPage() {
  if (getCurrentUser()) {
    window.location.href = 'profile.html';
    return;
  }

  const form = qs('#signupForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = qs('#signupName').value.trim();
    const email = qs('#signupEmail').value.trim().toLowerCase();
    const password = qs('#signupPassword').value;

    const users = getUsers();
    const exists = users.some((item) => item.email === email);

    if (exists) {
      showToast('Account already exists. Please login.');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 900);
      return;
    }

    const createdAt = new Date().toISOString();
    users.push({ name, email, password, createdAt });
    saveUsers(users);
    setCurrentUser({ name, email, createdAt });
    showToast('Signup successful. Redirecting...');
    setTimeout(() => {
      window.location.href = getLoginRedirect();
    }, 800);
  });
}

function initCommon() {
  initThemeToggle();
  updateAuthUI();
  const year = qs('#year');
  if (year) year.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', () => {
  initCommon();
  const page = document.body.dataset.page;

  if (page === 'home') initHomePage();
  if (page === 'login') initLoginPage();
  if (page === 'signup') initSignupPage();
  if (page === 'profile') initProfilePage();
});
