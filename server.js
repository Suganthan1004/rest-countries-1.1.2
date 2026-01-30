
let allCountries = [];
let countries = [];
let currentPage = 1;
const itemsPerPage = 20;

/* STATE MANAGEMENT */
let favorites = JSON.parse(localStorage.getItem('cc_favorites') || '[]');
let currentRegion = 'all';
let currentSort = 'name-asc';
let showFavoritesOnly = false;

/* THEME HANDLING */
const THEME_KEY = 'cc_theme';

function applyTheme(theme) {
    document.body.id = theme;

    document.querySelectorAll('.country-card').forEach(card => {
        card.classList.toggle('light', theme === 'light');
        card.classList.toggle('dark', theme === 'dark');
    });

    const icon = document.querySelector('#toggle-theme i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
    }
}

function toggleTheme() {
    const nextTheme = document.body.id === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    applyTheme(saved || 'light');
}

/*  DATA LOADING  */
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

async function loadAllCountries() {
    showLoading(true);
    try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,capital,flag,region,cca2,population,area');
        if (!res.ok) throw new Error('Failed to fetch countries');

        allCountries = (await res.json()).sort((a, b) =>
            a.name.common.localeCompare(b.name.common)
        );
        countries = [...allCountries];
        currentPage = 1;
        renderPage();
    } catch (err) {
        console.error(err);
        document.getElementById('countryContainer').innerHTML =
            '<p style="color: red; margin-top: 200px;">Failed to load countries. Please refresh the page.</p>';
    } finally {
        showLoading(false);
    }
}

/*  FILTERING AND SORTING  */
function applyFiltersAndSort() {
    // Start with all countries
    let filtered = [...allCountries];

    // Apply search filter
    const query = document.getElementById('countryName').value.trim().toLowerCase();
    if (query) {
        filtered = filtered.filter(country => {
            const name = country.name.common.toLowerCase();
            const code = country.cca2.toLowerCase();
            const region = country.region.toLowerCase();
            const capital = (country.capital?.[0] || '').toLowerCase();

            return (
                name.includes(query) ||
                code.includes(query) ||
                region.includes(query) ||
                capital.includes(query)
            );
        });
    }

    // Apply region filter
    if (currentRegion !== 'all') {
        filtered = filtered.filter(country => country.region === currentRegion);
    }

    // Apply favorites filter
    if (showFavoritesOnly) {
        filtered = filtered.filter(country => favorites.includes(country.cca2));
    }

    // Apply sorting
    filtered.sort((a, b) => {
        switch (currentSort) {
            case 'name-asc':
                return a.name.common.localeCompare(b.name.common);
            case 'name-desc':
                return b.name.common.localeCompare(a.name.common);
            case 'population-desc':
                return (b.population || 0) - (a.population || 0);
            case 'population-asc':
                return (a.population || 0) - (b.population || 0);
            case 'area-desc':
                return (b.area || 0) - (a.area || 0);
            case 'area-asc':
                return (a.area || 0) - (b.area || 0);
            default:
                return 0;
        }
    });

    countries = filtered;
    currentPage = 1;
    renderPage();
}

function setRegionFilter(region) {
    currentRegion = region;
    applyFiltersAndSort();
}

function setSortOption(sort) {
    currentSort = sort;
    localStorage.setItem('cc_sort', sort);
    applyFiltersAndSort();
}

function toggleFavoritesView() {
    showFavoritesOnly = !showFavoritesOnly;
    const btn = document.getElementById('favoritesToggle');
    btn.classList.toggle('active', showFavoritesOnly);
    applyFiltersAndSort();
}

/*  PAGINATION  */
function changePage(step) {
    const totalPages = Math.ceil(countries.length / itemsPerPage);
    const newPage = currentPage + step;

    if (newPage < 1 || newPage > totalPages) return;

    currentPage = newPage;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetCountries() {
    currentRegion = 'all';
    currentSort = 'name-asc';
    showFavoritesOnly = false;
    document.getElementById('countryName').value = '';
    document.getElementById('regionFilter').value = 'all';
    document.getElementById('sortBy').value = 'name-asc';
    document.getElementById('favoritesToggle').classList.remove('active');
    hideSuggestions();
    applyFiltersAndSort();
}

/*  RENDERING  */
function renderPage() {
    const container = document.getElementById('countryContainer');
    container.innerHTML = '';

    if (countries.length === 0) {
        container.innerHTML = '<p style="margin-top: 200px;">No countries found.</p>';
        document.getElementById('pageInfo').textContent = 'Page 0 of 0';
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = countries.slice(start, start + itemsPerPage);
    const totalPages = Math.ceil(countries.length / itemsPerPage);

    pageItems.forEach(country => {
        const card = document.createElement('div');
        const isFavorited = favorites.includes(country.cca2);
        card.className = `country-card ${document.body.id}${isFavorited ? ' favorited' : ''}`;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        const flag = flagToCountryCode(country.flag).toLowerCase();

        card.innerHTML = `
            <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" data-code="${country.cca2}" title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                <i class="fa-${isFavorited ? 'solid' : 'regular'} fa-heart"></i>
            </button>
            <img src="https://flagcdn.com/${flag}.svg" 
                 alt="Flag of ${country.name.common}" 
                 onerror="this.src='https://via.placeholder.com/160x120?text=No+Flag'" 
                 width="200"/>
            <p><strong>${country.name.common}</strong></p>
            <p><strong>Capital:</strong> ${country.capital?.[0] || 'N/A'}</p>
            <p><strong>Region:</strong> ${country.region}</p>
            <p><strong>Code:</strong> ${country.cca2}</p>
        `;

        // Card click to open details
        card.onclick = (e) => {
            // Don't open modal if clicking favorite button
            if (e.target.closest('.favorite-btn')) return;
            openCountryDetails(country.cca2);
        };

        card.onkeypress = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (!e.target.closest('.favorite-btn')) {
                    openCountryDetails(country.cca2);
                }
            }
        };

        // Favorite button click handler
        const favoriteBtn = card.querySelector('.favorite-btn');
        favoriteBtn.onclick = (e) => {
            e.stopPropagation();
            toggleFavorite(country.cca2);
        };

        container.appendChild(card);
    });

    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;

    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

/*  SEARCH  */
let searchTimeout;

function fetchData() {
    applyFiltersAndSort();
}

/*  FAVORITES  */
function toggleFavorite(code) {
    const index = favorites.indexOf(code);
    if (index === -1) {
        favorites.push(code);
    } else {
        favorites.splice(index, 1);
    }

    localStorage.setItem('cc_favorites', JSON.stringify(favorites));
    renderPage(); // Re-render to update favorite button states
}

/*  SEARCH SUGGESTIONS  */
function updateSuggestions() {
    const inputEl = document.getElementById('countryName');
    const suggestionsBox = document.getElementById('suggestions');
    const value = inputEl.value.trim().toLowerCase();

    suggestionsBox.innerHTML = '';

    if (!value) {
        hideSuggestions();
        return;
    }

    const matches = allCountries
        .filter(c => {
            const name = c.name.common.toLowerCase();
            const code = c.cca2.toLowerCase();
            const region = c.region.toLowerCase();
            const capital = (c.capital?.[0] || '').toLowerCase();

            return (
                name.includes(value) ||
                code.includes(value) ||
                region.includes(value) ||
                capital.includes(value)
            );
        })
        .map(c => c.name.common);

    if (matches.length === 0) {
        hideSuggestions();
        return;
    }

    matches.forEach(name => {
        const div = document.createElement('div');
        div.textContent = name;
        div.setAttribute('role', 'option');
        div.onclick = () => {
            inputEl.value = name;
            hideSuggestions();
            fetchData();
        };
        suggestionsBox.appendChild(div);
    });

    suggestionsBox.style.display = 'block';
}

function hideSuggestions() {
    const suggestionsBox = document.getElementById('suggestions');
    if (suggestionsBox) {
        suggestionsBox.style.display = 'none';
    }
}

/*  COUNTRY DETAILS MODAL  */
async function openCountryDetails(code) {
    const modal = document.getElementById('countryModal');
    const modalBody = document.getElementById('modalBody');

    modalBody.innerHTML = '<p>Loading...</p>';
    modal.style.display = 'flex';

    try {
        const res = await fetch(`https://restcountries.com/v3.1/alpha/${code}`);
        if (!res.ok) throw new Error('Failed to fetch country details');

        const [data] = await res.json();

        modalBody.innerHTML = `
            <h2 id="modalTitle">${data.name.common}</h2>
            <img src="https://flagcdn.com/w320/${data.cca2.toLowerCase()}.png" 
                 alt="Flag of ${data.name.common}"
                 onerror="this.src='https://via.placeholder.com/320x240?text=No+Flag'" />
            <p><strong>Official Name:</strong> ${data.name.official || 'N/A'}</p>
            <p><strong>Capital:</strong> ${data.capital?.[0] || 'N/A'}</p>
            <p><strong>Region:</strong> ${data.region}</p>
            <p><strong>Subregion:</strong> ${data.subregion || 'N/A'}</p>
            <p><strong>Population:</strong> ${data.population.toLocaleString()}</p>
            <p><strong>Area:</strong> ${data.area ? data.area.toLocaleString() + ' km²' : 'N/A'}</p>
            <p><strong>Languages:</strong> ${data.languages ? Object.values(data.languages).join(', ') : 'N/A'}</p>
            <p><strong>Currencies:</strong> ${data.currencies ? Object.values(data.currencies).map(c => `${c.name} (${c.symbol || ''})`).join(', ') : 'N/A'}</p>
            <p><strong>Timezones:</strong> ${data.timezones ? data.timezones.join(', ') : 'N/A'}</p>
        `;
    } catch (err) {
        console.error(err);
        modalBody.innerHTML = '<p style="color: red;">Failed to load country details. Please try again.</p>';
    }
}

function closeModal() {
    const modal = document.getElementById('countryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/*  HELPERS  */
function flagToCountryCode(flag) {
    if (!flag) return '';
    return [...flag]
        .map(c => c.codePointAt(0) - 0x1F1E6 + 65)
        .map(c => String.fromCharCode(c))
        .join('');
}

/*  EVENT LISTENERS  */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    initTheme();

    // Initialize sort preference from localStorage
    const savedSort = localStorage.getItem('cc_sort');
    if (savedSort) {
        currentSort = savedSort;
        document.getElementById('sortBy').value = savedSort;
    }

    // Load countries
    loadAllCountries();

    // Button event listeners
    document.getElementById('prevBtn').onclick = () => changePage(-1);
    document.getElementById('nextBtn').onclick = () => changePage(1);
    document.getElementById('allCountriesBtn').onclick = resetCountries;
    document.getElementById('searchBtn').onclick = fetchData;
    document.getElementById('toggle-theme').onclick = toggleTheme;

    // New filter controls
    document.getElementById('regionFilter').onchange = (e) => setRegionFilter(e.target.value);
    document.getElementById('sortBy').onchange = (e) => setSortOption(e.target.value);
    document.getElementById('favoritesToggle').onclick = toggleFavoritesView;

    // Modal event listeners
    const closeBtn = document.getElementById('closeModal');
    const modal = document.getElementById('countryModal');

    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }

    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }

    // Search input with debouncing
    const inputEl = document.getElementById('countryName');
    if (inputEl) {
        inputEl.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(updateSuggestions, 300);
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.activeElement.id === 'countryName') {
            fetchData();
        }
        if (e.key === 'Escape') {
            if (inputEl) inputEl.value = '';
            hideSuggestions();
            closeModal();
        }
    });

    // Click outside suggestions to close
    document.addEventListener('click', (e) => {
        const suggestionsBox = document.getElementById('suggestions');
        const searchBar = document.querySelector('.search-bar');
        if (suggestionsBox && searchBar && !searchBar.contains(e.target)) {
            hideSuggestions();
        }
    });
});
