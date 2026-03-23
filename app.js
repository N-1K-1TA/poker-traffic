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

// Инъекция CSS для фикса скролла в Apps и правильного отображения лимитов
const style = document.createElement('style');
style.innerHTML = `
    .table-panel td { padding: 12px 6px; font-size: 14px; }
    .pill { display: inline-block; text-align: center; line-height: 1.3; }
    .dd-item span { line-height: 1.2; }
`;
document.head.appendChild(style);

// Загрузка данных при старте
document.addEventListener('DOMContentLoaded', async () => {
    statsBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Loading...</td></tr>`;
    await loadGoogleData();
});

async function loadGoogleData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        if (data.error) {
            statsBody.innerHTML = `<tr><td colspan="8" style="color: red; text-align: center;">Error: ${data.error}</td></tr>`;
            return;
        }

        // Парсим данные Browser Sites
        siteData.browser = data.browserStats.slice(1).map(row => ({
            network: String(row[0] || '').trim(), site: String(row[1] || '').trim(), game: String(row[2] || '').trim(), limit: String(row[3] || '').trim(),
            tables: String(row[4] || '').split('\n'),
            players: String(row[5] || '').split('\n'),
            time: String(row[6] || '').split('\n')
        }));

        // Парсим данные Apps
        siteData.apps = data.appsStats.slice(1).map(row => ({
            app: String(row[0] || '').trim(), union: String(row[1] || '').trim(), club: String(row[2] || '').trim(), game: String(row[3] || '').trim(), limit: String(row[4] || '').trim(),
            tables: String(row[5] || '').split('\n'),
            players: String(row[6] || '').split('\n'),
            time: String(row[7] || '').split('\n')
        }));

        siteData.filters = data.filters;

        // Достаем дату (ищем любую ячейку в первой строке, где есть дата)
        if (siteData.filters.length > 0) {
            const dateCell = siteData.filters[1].find(val => val && String(val).trim() !== '');
            if (dateCell) {
                const updateSpan = document.querySelector('.table-head p span');
                if (updateSpan) updateSpan.textContent = dateCell;
            }
        }

        buildFiltersFromData();
        setMode(currentMode);
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        statsBody.innerHTML = `<tr><td colspan="8" style="color: red; text-align: center;">Network error while loading data</td></tr>`;
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
  if(selected.length <= 2){ 
      // Для красоты выводим без скобок в шапке фильтра, если там длинный лимит
      summaryEl.textContent = selected.map(s => s.split('\n')[0]).join(', '); 
      return; 
  }
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
      apps: getSelectedValuesFromBlock(filtersApps, 'app'),
      unions: getSelectedValuesFromBlock(filtersApps, 'union'),
      clubs: getSelectedValuesFromBlock(filtersApps, 'clubName'),
      games: getSelectedValuesFromBlock(filtersApps, 'gamesApps'),
      limits: getSelectedValuesFromBlock(filtersApps, 'limitsApps'),
      timePeaks: getSelectedValuesFromBlock(filtersApps, 'timePeakApps')
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

// Рендер таблиц с учетом логики выборки времени
function renderTable(){
  renderHead();

  if(siteData.browser.length === 0 && siteData.apps.length === 0) return;

  let rowsHtml = '';
  const isBrowser = currentMode === 'browser';
  const sel = isBrowser ? getBrowserSelections() : getAppsSelections();
  const dataToFilter = isBrowser ? siteData.browser : siteData.apps;

  const filtered = dataToFilter.filter(r => {
      // Базовая фильтрация по текстовым полям
      const textMatch = isBrowser 
        ? (matchIfSelected(r.network, sel.networks) && matchIfSelected(r.site, sel.sites) && matchIfSelected(r.game, sel.games) && matchIfSelected(r.limit, sel.limits))
        : (matchIfSelected(r.app, sel.apps) && matchIfSelected(r.union, sel.unions) && matchIfSelected(r.club, sel.clubs) && matchIfSelected(r.game, sel.games) && matchIfSelected(r.limit, sel.limits));
      
      return textMatch;
  });

  if(filtered.length === 0){
      statsBody.innerHTML = `<tr><td colspan="8" style="color: var(--muted); text-align:center;">No results for current filters</td></tr>`;
      return;
  }

  rowsHtml = filtered.map(r => {
      let tLines = [], pLines = [], timeLines = [];
      
      // Логика фильтрации Времени (выводим только выбранные часы)
      r.time.forEach((tStr, idx) => {
          if(!sel.timePeaks || sel.timePeaks.length === 0 || sel.timePeaks.some(selT => tStr.includes(selT))) {
              if (tStr.trim() !== '') {
                  tLines.push(r.tables[idx] || '-');
                  pLines.push(r.players[idx] || '-');
                  timeLines.push(tStr);
              }
          }
      });

      // Если после фильтрации времени для этой строки не осталось данных - скрываем её
      if(sel.timePeaks && sel.timePeaks.length > 0 && timeLines.length === 0) return '';

      const limitHtml = escapeHtml(r.limit).replace(/\n/g, '<br>');

      if (isBrowser) {
          return `<tr>
            <td>${escapeHtml(r.network)}</td>
            <td>${escapeHtml(r.site)}</td>
            <td>${escapeHtml(r.game)}</td>
            <td><span class="pill">${limitHtml}</span></td>
            <td>${buildStack(tLines)}</td>
            <td>${buildStack(pLines)}</td>
            <td>${buildStack(timeLines)}</td>
          </tr>`;
      } else {
          return `<tr>
            <td>${escapeHtml(r.app)}</td>
            <td>${escapeHtml(r.union)}</td>
            <td>${escapeHtml(r.club)}</td>
            <td>${escapeHtml(r.game)}</td>
            <td><span class="pill">${limitHtml}</span></td>
            <td>${buildStack(tLines)}</td>
            <td>${buildStack(pLines)}</td>
            <td>${buildStack(timeLines)}</td>
          </tr>`;
      }
  }).filter(Boolean).join('');

  if(rowsHtml === '') rowsHtml = `<tr><td colspan="8" style="color: var(--muted); text-align:center;">No results for current filters</td></tr>`;
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

// Мобильное меню
function openMenu(){ siteNav.classList.add('open'); menuToggle.classList.add('active'); menuToggle.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open'); }
function closeMenu(){ siteNav.classList.remove('open'); menuToggle.classList.remove('active'); menuToggle.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); }

if(menuToggle) menuToggle.addEventListener('click', () => { if(siteNav.classList.contains('open')) closeMenu(); else openMenu(); });
document.querySelectorAll('#siteNav a').forEach(link => { link.addEventListener('click', () => { if(window.innerWidth <= 900) closeMenu(); }); });
window.addEventListener('resize', () => { if(window.innerWidth > 900) closeMenu(); });

function toggleScrollTopButton(){ if(window.scrollY > 300) scrollTopBtn.classList.add('show'); else scrollTopBtn.classList.remove('show'); }
window.addEventListener('scroll', toggleScrollTopButton);
if(scrollTopBtn) scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });

toggleScrollTopButton();

// Кастомная сортировка чисел для лимитов
const sortLimits = (arr) => arr.sort((a, b) => {
    const numA = parseFloat(String(a).replace(',', '.').match(/[\d.]+/)) || 0;
    const numB = parseFloat(String(b).replace(',', '.').match(/[\d.]+/)) || 0;
    return numA - numB;
});

function buildFiltersFromData() {
    const filterOptions = {
        networkBrowser: [...new Set(siteData.browser.map(i => i.network))].filter(Boolean).sort(),
        sites: [...new Set(siteData.browser.map(i => i.site))].filter(Boolean).sort(),
        gamesBrowser: [...new Set(siteData.browser.map(i => i.game))].filter(Boolean).sort(),
        limitsBrowser: sortLimits([...new Set(siteData.browser.map(i => i.limit))].filter(Boolean)), 
        timePeakBrowser: [...new Set(siteData.browser.flatMap(i => i.time))].filter(Boolean),

        app: [...new Set(siteData.apps.map(i => i.app))].filter(Boolean).sort(),
        union: [...new Set(siteData.apps.map(i => i.union))].filter(Boolean).sort(),
        clubName: [...new Set(siteData.apps.map(i => i.club))].filter(Boolean).sort(),
        gamesApps: [...new Set(siteData.apps.map(i => i.game))].filter(Boolean).sort(),
        limitsApps: sortLimits([...new Set(siteData.apps.map(i => i.limit))].filter(Boolean)),
        timePeakApps: [...new Set(siteData.apps.flatMap(i => i.time))].filter(Boolean)
    };

    for (const [key, values] of Object.entries(filterOptions)) {
        const multiEl = document.querySelector(`.multi[data-key="${key}"]`);
        if (!multiEl) continue;
        
        const listEl = multiEl.querySelector('.dd-list');
        if (!listEl) continue;

        // В чекбоксах сохраняем raw-значение, а для отрисовки меняем \n на <br>
        listEl.innerHTML = values.map(val => 
            `<label class="dd-item"><input type="checkbox" value="${escapeHtml(val)}"><span>${escapeHtml(val).replace(/\n/g, '<br>')}</span></label>`
        ).join('');

        listEl.querySelectorAll('input[type="checkbox"]').forEach(c => {
            c.addEventListener('change', () => updateSummary(multiEl));
            c.addEventListener('click', (e) => e.stopPropagation());
        });
        
        updateSummary(multiEl);
    }
}