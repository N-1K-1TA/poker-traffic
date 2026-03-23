const API_URL = 'https://script.google.com/macros/s/AKfycbxWkShEIzELPIOvWmeDs-uxNHMSdufhDp-dQeP6n_isJ2KDN-mPeasEcOxtSNXZuq4m/exec';

let siteData = { browser: [], apps: [], filters: [] };

// Элементы интерфейса
const btnBrowser = document.getElementById('btnBrowser');
const btnApps = document.getElementById('btnApps');
const filtersBrowser = document.getElementById('filtersBrowser');
const filtersApps = document.getElementById('filtersApps');
const statsBody = document.getElementById('statsBody');
const statsHeadRow = document.getElementById('statsHeadRow');
const menuToggle = document.getElementById('menuToggle');
const siteNav = document.getElementById('siteNav');
const scrollTopBtn = document.getElementById('scrollTopBtn');

let currentMode = 'browser';

// Загрузка данных при старте
document.addEventListener('DOMContentLoaded', async () => {
    statsBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Загрузка данных из Google таблиц...</td></tr>`;
    await loadGoogleData();
});

async function loadGoogleData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        if (data.error) {
            statsBody.innerHTML = `<tr><td colspan="8" style="color: red; text-align: center;">Ошибка: ${data.error}</td></tr>`;
            return;
        }

        // Парсим данные Browser Sites
        siteData.browser = data.browserStats.slice(1).map(row => ({
            network: row[0] || '', site: row[1] || '', game: row[2] || '', limit: row[3] || '',
            tables: String(row[4] || '').split('\n'),
            players: String(row[5] || '').split('\n'),
            time: String(row[6] || '').split('\n')
        }));

        // Парсим данные Apps
        siteData.apps = data.appsStats.slice(1).map(row => ({
            app: row[0] || '', union: row[1] || '', club: row[2] || '', game: row[3] || '', limit: row[4] || '',
            tables: String(row[5] || '').split('\n'),
            players: String(row[6] || '').split('\n'),
            time: String(row[7] || '').split('\n')
        }));

        siteData.filters = data.filters;
        const dateRow = siteData.filters.find(row => String(row[0]).includes('Last update:'));
        if (dateRow && dateRow[1]) {
            const updateSpan = document.querySelector('.table-head p span');
            if (updateSpan) updateSpan.textContent = dateRow[1];
        }

        buildFiltersFromData();

        setMode(currentMode);
        console.log('✅ Данные успешно загружены');
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        statsBody.innerHTML = `<tr><td colspan="8" style="color: red; text-align: center;">Ошибка сети при загрузке данных</td></tr>`;
    }
}

function setMode(mode){
  currentMode = mode;
  const isBrowser = mode === 'browser';

  filtersBrowser.style.display = isBrowser ? 'block' : 'none';
  filtersApps.style.display = isBrowser ? 'none' : 'block';

  btnBrowser.classList.toggle('active', isBrowser);
  btnApps.classList.toggle('active', !isBrowser);
  btnBrowser.setAttribute('aria-pressed', isBrowser ? 'true' : 'false');
  btnApps.setAttribute('aria-pressed', !isBrowser ? 'true' : 'false');

  document.querySelectorAll('.multi.open').forEach(m => m.classList.remove('open'));
  renderTable();
}

btnBrowser.addEventListener('click', () => setMode('browser'));
btnApps.addEventListener('click', () => setMode('apps'));

// Утилиты для UI и фильтров
const multis = document.querySelectorAll('.multi');

function updateSummary(multi){
  const checks = multi.querySelectorAll('.dd-list input[type="checkbox"]');
  const selected = [...checks].filter(c => c.checked).map(c => c.value);
  const summaryEl = multi.querySelector('[data-summary]');
  const countEl = multi.querySelector('[data-count]');

  if(countEl) countEl.textContent = String(selected.length);

  if(selected.length === 0){ summaryEl.textContent = 'All'; return; }
  if(selected.length <= 2){ summaryEl.textContent = selected.join(', '); return; }
  summaryEl.textContent = `${selected.length} selected`;
}

function openMulti(multi){
  document.querySelectorAll('.multi').forEach(m => { if(m !== multi) m.classList.remove('open'); });
  multi.classList.add('open');
  const search = multi.querySelector('.dd-search');
  if(search){ search.value = ''; filterList(multi, ''); search.focus(); }
}

function closeMulti(multi){ multi.classList.remove('open'); }

function filterList(multi, q){
  const query = q.trim().toLowerCase();
  multi.querySelectorAll('.dd-item').forEach(item => {
    item.style.display = item.innerText.toLowerCase().includes(query) ? 'flex' : 'none';
  });
}

multis.forEach(multi => {
  const btn = multi.querySelector('.multi-btn');
  const closeBtn = multi.querySelector('.close');
  const search = multi.querySelector('.dd-search');
  const allBtn = multi.querySelector('[data-action="all"]');
  const clearBtn = multi.querySelector('[data-action="clear"]');
  const dropdown = multi.querySelector('.dropdown');

  updateSummary(multi);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if(multi.classList.contains('open')) closeMulti(multi);
    else openMulti(multi);
  });

  if(closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeMulti(multi); });
  if(dropdown) dropdown.addEventListener('click', (e) => e.stopPropagation());
  if(search){
    search.addEventListener('input', (e) => filterList(multi, e.target.value));
    search.addEventListener('click', (e) => e.stopPropagation());
  }

  if(allBtn) allBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    multi.querySelectorAll('.dd-list input[type="checkbox"]').forEach(c => c.checked = true);
    updateSummary(multi);
  });

  if(clearBtn) clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    multi.querySelectorAll('.dd-list input[type="checkbox"]').forEach(c => c.checked = false);
    updateSummary(multi);
  });

  multi.querySelectorAll('.dd-list input[type="checkbox"]').forEach(c => {
    c.addEventListener('change', () => updateSummary(multi));
    c.addEventListener('click', (e) => e.stopPropagation());
  });
});

document.addEventListener('click', () => { document.querySelectorAll('.multi.open').forEach(m => m.classList.remove('open')); });
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){
    document.querySelectorAll('.multi.open').forEach(m => m.classList.remove('open'));
    closeMenu();
  }
});

function getSelectedValuesFromBlock(blockEl, dataKey){
  const multi = blockEl.querySelector(`.multi[data-key="${dataKey}"]`);
  if(!multi) return [];
  return [...multi.querySelectorAll('.dd-list input[type="checkbox"]:checked')].map(x => x.value);
}

function getBrowserSelections(){
  return {
    networks: getSelectedValuesFromBlock(filtersBrowser, 'networkBrowser'),
    sites: getSelectedValuesFromBlock(filtersBrowser, 'sites'),
    games: getSelectedValuesFromBlock(filtersBrowser, 'gamesBrowser'),
    limits: getSelectedValuesFromBlock(filtersBrowser, 'limitsBrowser'),
    timePeaks: getSelectedValuesFromBlock(filtersBrowser, 'timePeakBrowser')
  };
}

function getAppsSelections(){
    return {
      apps: getSelectedValuesFromBlock(filtersApps, 'appsApp'),
      unions: getSelectedValuesFromBlock(filtersApps, 'unionsApp'),
      games: getSelectedValuesFromBlock(filtersApps, 'gamesApp'),
      limits: getSelectedValuesFromBlock(filtersApps, 'limitsApp')
    };
  }

function matchIfSelected(value, selectedArr){
  if(!selectedArr || selectedArr.length === 0) return true;
  return selectedArr.includes(value);
}

function escapeHtml(str){
  return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function buildStack(lines){
  const safe = lines.map(l => `<div class="line">${escapeHtml(l)}</div>`).join('');
  return `<div class="stack">${safe}</div>`;
}

function renderHead(){
  if(currentMode === 'browser'){
    statsHeadRow.innerHTML = `<th>Networks</th><th>Sites</th><th>Type of games</th><th>Limits</th><th>Number of tables</th><th>Number of players</th><th>Time peak (UTC +3)</th>`;
  } else {
    statsHeadRow.innerHTML = `<th>Apps</th><th>Unions</th><th>Clubs | IDs</th><th>Type of games</th><th>Limits</th><th>Number of tables</th><th>Number of players</th><th>Time peak (UTC +3)</th>`;
  }
}

function renderTable(){
  renderHead();

  if(siteData.browser.length === 0 && siteData.apps.length === 0) {
      return; // Данные еще не загрузились
  }

  let rowsHtml = '';

  if(currentMode === 'browser'){
    const sel = getBrowserSelections();
    const filtered = siteData.browser.filter(r => (
      matchIfSelected(r.network, sel.networks) &&
      matchIfSelected(r.site, sel.sites) &&
      matchIfSelected(r.game, sel.games) &&
      matchIfSelected(r.limit, sel.limits)
    ));

    if(filtered.length === 0){
      statsBody.innerHTML = `<tr><td colspan="7" style="color: var(--muted); text-align:center;">No results for current filters</td></tr>`;
      return;
    }

    rowsHtml = filtered.map(r => `
      <tr>
        <td>${escapeHtml(r.network)}</td>
        <td>${escapeHtml(r.site)}</td>
        <td>${escapeHtml(r.game)}</td>
        <td><span class="pill">${escapeHtml(r.limit)}</span></td>
        <td>${buildStack(r.tables)}</td>
        <td>${buildStack(r.players)}</td>
        <td>${buildStack(r.time)}</td>
      </tr>
    `).join('');
  } else {
    const sel = getAppsSelections();
    const filtered = siteData.apps.filter(r => (
      matchIfSelected(r.app, sel.apps) &&
      matchIfSelected(r.union, sel.unions) &&
      matchIfSelected(r.game, sel.games) &&
      matchIfSelected(r.limit, sel.limits)
    ));

    if(filtered.length === 0){
        statsBody.innerHTML = `<tr><td colspan="8" style="color: var(--muted); text-align:center;">No results for current filters</td></tr>`;
        return;
    }

    rowsHtml = filtered.map(r => `
        <tr>
          <td>${escapeHtml(r.app)}</td>
          <td>${escapeHtml(r.union)}</td>
          <td>${escapeHtml(r.club)}</td>
          <td>${escapeHtml(r.game)}</td>
          <td><span class="pill">${escapeHtml(r.limit)}</span></td>
          <td>${buildStack(r.tables)}</td>
          <td>${buildStack(r.players)}</td>
          <td>${buildStack(r.time)}</td>
        </tr>
      `).join('');
  }

  statsBody.innerHTML = rowsHtml;
}

document.getElementById('resetBtn').addEventListener('click', () => {
  const visibleBlock = (filtersApps.style.display === 'block') ? filtersApps : filtersBrowser;
  visibleBlock.querySelectorAll('.dd-list input[type="checkbox"]').forEach(c => c.checked = false);
  visibleBlock.querySelectorAll('.multi').forEach(m => updateSummary(m));
  document.querySelectorAll('.multi.open').forEach(m => m.classList.remove('open'));
  renderTable();
});

document.getElementById('applyBtn').addEventListener('click', () => {
  document.querySelectorAll('.multi.open').forEach(m => m.classList.remove('open'));
  renderTable();
});

// Мобильное меню и скролл (оставил как было)
function openMenu(){ siteNav.classList.add('open'); menuToggle.classList.add('active'); menuToggle.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open'); }
function closeMenu(){ siteNav.classList.remove('open'); menuToggle.classList.remove('active'); menuToggle.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); }

if(menuToggle) menuToggle.addEventListener('click', () => { if(siteNav.classList.contains('open')) closeMenu(); else openMenu(); });
document.querySelectorAll('#siteNav a').forEach(link => { link.addEventListener('click', () => { if(window.innerWidth <= 900) closeMenu(); }); });
window.addEventListener('resize', () => { if(window.innerWidth > 900) closeMenu(); });

function toggleScrollTopButton(){ if(window.scrollY > 300) scrollTopBtn.classList.add('show'); else scrollTopBtn.classList.remove('show'); }
window.addEventListener('scroll', toggleScrollTopButton);
if(scrollTopBtn) scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });

toggleScrollTopButton();

function buildFiltersFromData() {
    // Собираем уникальные значения напрямую из боевых данных
    const filterOptions = {
        networkBrowser: [...new Set(siteData.browser.map(i => i.network))].filter(Boolean).sort(),
        sites: [...new Set(siteData.browser.map(i => i.site))].filter(Boolean).sort(),
        gamesBrowser: [...new Set(siteData.browser.map(i => i.game))].filter(Boolean).sort(),
        limitsBrowser: [...new Set(siteData.browser.map(i => i.limit))].filter(Boolean), 
        timePeakBrowser: [...new Set(siteData.browser.flatMap(i => i.time))].filter(Boolean),

        app: [...new Set(siteData.apps.map(i => i.app))].filter(Boolean).sort(),
        union: [...new Set(siteData.apps.map(i => i.union))].filter(Boolean).sort(),
        clubName: [...new Set(siteData.apps.map(i => i.club))].filter(Boolean).sort(),
        gamesApps: [...new Set(siteData.apps.map(i => i.game))].filter(Boolean).sort(),
        limitsApps: [...new Set(siteData.apps.map(i => i.limit))].filter(Boolean),
        timePeakApps: [...new Set(siteData.apps.flatMap(i => i.time))].filter(Boolean)
    };

    // Динамически заполняем HTML-списки фильтров
    for (const [key, values] of Object.entries(filterOptions)) {
        const multiEl = document.querySelector(`.multi[data-key="${key}"]`);
        if (!multiEl) continue;
        
        const listEl = multiEl.querySelector('.dd-list');
        if (!listEl) continue;

        // Рендерим чекбоксы
        listEl.innerHTML = values.map(val => 
            `<label class="dd-item"><input type="checkbox" value="${escapeHtml(val)}"><span>${escapeHtml(val)}</span></label>`
        ).join('');

        // Сразу навешиваем слушатели событий, чтобы фильтры работали
        listEl.querySelectorAll('input[type="checkbox"]').forEach(c => {
            c.addEventListener('change', () => updateSummary(multiEl));
            c.addEventListener('click', (e) => e.stopPropagation());
        });
        
        updateSummary(multiEl);
    }
}