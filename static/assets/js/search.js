(function () {
  'use strict';

  var partialUrl = '/search/partial/';
  var suggestUrl = '/search/suggest/?q=';
  var currentParams = new URLSearchParams(window.location.search);

  function buildPartialUrl(params) {
    return partialUrl + '?' + params.toString();
  }

  function fetchPartial(params, callback) {
    var loadingArea = document.getElementById('lux-loading-area');
    if (loadingArea) loadingArea.classList.add('is-active');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', buildPartialUrl(params), true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (loadingArea) loadingArea.classList.remove('is-active');
        if (xhr.status === 200) {
          callback(xhr.responseText);
        }
      }
    };
    xhr.send();
  }

  function applyPartial(html) {
    var container = document.querySelector('.lux-section-dark .container');
    if (!container) return;

    var temp = document.createElement('div');
    temp.innerHTML = html;

    var newChips = temp.querySelector('#lux-filter-chips');
    var oldChips = document.getElementById('lux-filter-chips');
    if (newChips && oldChips) {
      oldChips.replaceWith(newChips);
    } else if (newChips && !oldChips) {
      var searchBar = container.querySelector('.lux-search-bar');
      if (searchBar) searchBar.insertAdjacentElement('afterend', newChips);
    } else if (!newChips && oldChips) {
      oldChips.remove();
    }

    var newGrid = temp.querySelector('#lux-prop-grid');
    var oldGrid = document.getElementById('lux-prop-grid');
    if (newGrid && oldGrid) {
      oldGrid.replaceWith(newGrid);
    } else if (!newGrid && oldGrid) {
      oldGrid.innerHTML = '';
    }

    var newHeader = temp.querySelector('.lux-results-header');
    var oldHeader = container.querySelector('.lux-results-header');
    if (newHeader && oldHeader) {
      oldHeader.replaceWith(newHeader);
    } else if (newHeader && !oldHeader) {
      var grid2 = document.getElementById('lux-prop-grid');
      if (grid2) grid2.insertAdjacentElement('beforebegin', newHeader);
    } else if (!newHeader && oldHeader) {
      oldHeader.remove();
    }

    var newPag = temp.querySelector('#lux-pagination');
    var oldPag = document.getElementById('lux-pagination');
    if (newPag && oldPag) {
      oldPag.replaceWith(newPag);
    } else if (newPag && !oldPag) {
      var grid = document.getElementById('lux-prop-grid');
      if (grid) grid.insertAdjacentElement('afterend', newPag);
    } else if (!newPag && oldPag) {
      oldPag.remove();
    }

    bindChipRemoval();
    bindSortLinks();
    bindPagination();
    updateFilterBadge();
  }

  function navigateTo(params) {
    currentParams = params;
    var url = '/properties' + (params.toString() ? '?' + params.toString() : '');
    history.pushState(null, '', url);
    fetchPartial(params, applyPartial);
  }

  function updateFilterBadge() {
    var badge = document.querySelector('.lux-filter-badge');
    var count = 0;
    var keys = ['bedrooms', 'bathrooms', 'floor', 'furnished', 'size',
                'min_price', 'max_price', 'currency', 'type', 'amenities'];
    keys.forEach(function (k) {
      if (currentParams.get(k)) count++;
    });
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    } else if (count > 0) {
      var toggle = document.getElementById('lux-filter-toggle');
      if (toggle) {
        var span = document.createElement('span');
        span.className = 'lux-filter-badge';
        span.textContent = count;
        toggle.appendChild(span);
      }
    }
  }

  function bindChipRemoval() {
    document.querySelectorAll('.lux-chip-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var removeKey = btn.dataset.remove;
        var removeValue = btn.dataset.value;
        var params = new URLSearchParams(currentParams);
        if (removeKey === 'price') {
          params.delete('currency');
          params.delete('min_price');
          params.delete('max_price');
        } else if (removeKey === 'amenities' && removeValue) {
          var current = params.getAll('amenities');
          params.delete('amenities');
          current.filter(function (v) { return v !== removeValue; }).forEach(function (v) {
            params.append('amenities', v);
          });
        } else {
          params.delete(removeKey);
        }
        navigateTo(params);
      });
    });
  }

  function bindSortLinks() {
    document.querySelectorAll('#lux-sort-links .lux-sort-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var sortVal = link.dataset.sort;
        var params = new URLSearchParams(currentParams);
        if (sortVal) {
          params.set('sort', sortVal);
        } else {
          params.delete('sort');
        }
        navigateTo(params);
      });
    });
  }

  function bindPagination() {
    document.querySelectorAll('.lux-page-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var page = link.dataset.page;
        var params = new URLSearchParams(currentParams);
        params.set('page', page);
        navigateTo(params);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function bindPills() {
    document.querySelectorAll('.lux-pill').forEach(function (pill) {
      pill.addEventListener('click', function (e) {
        e.preventDefault();
        var filterVal = pill.dataset.filter || '';
        var params = new URLSearchParams(currentParams);
        if (filterVal) {
          params.set('filter', filterVal);
        } else {
          params.delete('filter');
        }
        params.delete('page');
        document.querySelectorAll('.lux-pill').forEach(function (p) {
          p.classList.remove('is-active');
        });
        pill.classList.add('is-active');
        navigateTo(params);
      });
    });
  }

  function bindDrawerApply() {
    var applyBtn = document.querySelector('.lux-btn-apply');
    if (applyBtn) {
      applyBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (applyBtn.disabled) return;
        var drawer = document.getElementById('lux-filter-drawer');
        var params = new URLSearchParams(currentParams);

        var typeChip = drawer.querySelector('.lux-type-chip.is-active');
        var typeVal = typeChip ? (typeChip.dataset.type || '') : '';
        if (typeVal) {
          params.set('type', typeVal);
        } else {
          params.delete('type');
        }

        var bedrooms = drawer.querySelector('select[name="bedrooms"]');
        if (bedrooms && bedrooms.value) params.set('bedrooms', bedrooms.value);
        else params.delete('bedrooms');

        var bathrooms = drawer.querySelector('select[name="bathrooms"]');
        if (bathrooms && bathrooms.value) params.set('bathrooms', bathrooms.value);
        else params.delete('bathrooms');

        var currency = drawer.querySelector('select[name="currency"]');
        if (currency && currency.value) params.set('currency', currency.value);
        else params.delete('currency');

        var minPrice = drawer.querySelector('input[name="min_price"]');
        if (minPrice && minPrice.value) params.set('min_price', minPrice.value);
        else params.delete('min_price');

        var maxPrice = drawer.querySelector('input[name="max_price"]');
        if (maxPrice && maxPrice.value) params.set('max_price', maxPrice.value);
        else params.delete('max_price');

        var furnished = drawer.querySelector('select[name="furnished"]');
        if (furnished && furnished.value) params.set('furnished', furnished.value);
        else params.delete('furnished');

        var floor = drawer.querySelector('input[name="floor"]');
        if (floor && floor.value) params.set('floor', floor.value);
        else params.delete('floor');

        params.delete('amenities');
        drawer.querySelectorAll('input[name="amenities"]:checked').forEach(function (cb) {
          params.append('amenities', cb.value);
        });

        params.delete('page');
        closeDrawer();
        navigateTo(params);
      });
    }
  }

  function bindDrawerClear() {
    var clearBtn = document.getElementById('lux-drawer-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function (e) {
        e.preventDefault();
        closeDrawer();
        navigateTo(new URLSearchParams());
      });
    }
  }

  function getDrawerParams() {
    var drawer = document.getElementById('lux-filter-drawer');
    if (!drawer) return new URLSearchParams(currentParams);
    var params = new URLSearchParams(currentParams);

    var typeChip = drawer.querySelector('.lux-type-chip.is-active');
    var typeVal = typeChip ? (typeChip.dataset.type || '') : '';
    params.delete('type');
    if (typeVal) params.set('type', typeVal);

    var bedrooms = drawer.querySelector('select[name="bedrooms"]');
    if (bedrooms && bedrooms.value) params.set('bedrooms', bedrooms.value);

    var bathrooms = drawer.querySelector('select[name="bathrooms"]');
    if (bathrooms && bathrooms.value) params.set('bathrooms', bathrooms.value);

    var currency = drawer.querySelector('select[name="currency"]');
    if (currency && currency.value) params.set('currency', currency.value);

    var minPrice = drawer.querySelector('input[name="min_price"]');
    if (minPrice && minPrice.value) params.set('min_price', minPrice.value);

    var maxPrice = drawer.querySelector('input[name="max_price"]');
    if (maxPrice && maxPrice.value) params.set('max_price', maxPrice.value);

    var furnished = drawer.querySelector('select[name="furnished"]');
    if (furnished && furnished.value) params.set('furnished', furnished.value);

    var floor = drawer.querySelector('input[name="floor"]');
    if (floor && floor.value) params.set('floor', floor.value);

    var size = drawer.querySelector('input[name="size"]');
    if (size && size.value) params.set('size', size.value);

    drawer.querySelectorAll('input[name="amenities"]:checked').forEach(function (cb) {
      params.append('amenities', cb.value);
    });

    return params;
  }

  function updateDrawerCount() {
    var applyBtn = document.querySelector('.lux-btn-apply');
    if (!applyBtn) return;
    var params = getDrawerParams();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/search/count/?' + params.toString(), true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        applyBtn.textContent = 'Show ' + data.count + ' result' + (data.count !== 1 ? 's' : '');
        applyBtn.disabled = data.count === 0;
        applyBtn.style.opacity = data.count === 0 ? '0.4' : '';
        applyBtn.style.cursor = data.count === 0 ? 'not-allowed' : '';
      }
    };
    xhr.send();
  }

  function bindDrawerLiveCount() {
    var drawer = document.getElementById('lux-filter-drawer');
    if (!drawer) return;
    drawer.addEventListener('change', updateDrawerCount);
    drawer.addEventListener('input', updateDrawerCount);
  }

  function bindTypeChips() {
    document.querySelectorAll('.lux-type-chip').forEach(function (chip) {
      chip.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.lux-type-chip').forEach(function (c) {
          c.classList.remove('is-active');
        });
        chip.classList.add('is-active');
        updateContextualFilters(chip.dataset.type || '');
        updateDrawerCount();
      });
    });
  }

  var CONTEXT_MAP = {
    apartment: 'residential', house: 'residential', villa: 'residential',
    penthouse: 'residential', condo: 'residential', condominium: 'residential',
    office: 'commercial', warehouse: 'commercial', building: 'commercial',
    land: 'land',
  };

  var AMENITY_CONTEXT = {
    'Swimming_pool': 'residential',
    'Fitness_center_gym': 'residential',
    'Playground_park': 'residential',
    'Rooftop_terrace': 'residential,commercial',
    'Elevators': 'residential,commercial',
    'Security_system': 'residential,commercial',
    'Reception': 'commercial',
    'Kitchen': 'commercial',
    'Wi-Fi': 'commercial',
    'HVAC': 'commercial',
    'Fire': 'commercial',
    'parking': 'residential,commercial',
    'generator': 'residential,commercial',
  };

  function updateContextualFilters(typeSlug) {
    var context = CONTEXT_MAP[typeSlug] || '';

    // Hide/show drawer groups by data-context
    var groups = document.querySelectorAll('#lux-filter-drawer [data-context]');
    groups.forEach(function (el) {
      var contexts = el.dataset.context.split(',');
      if (!typeSlug) {
        el.style.display = '';
      } else if (contexts.indexOf(context) !== -1) {
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });

    // Hide/show individual amenities by their slug context
    var amenityChecks = document.querySelectorAll('#lux-filter-drawer .lux-amenity-check');
    amenityChecks.forEach(function (label) {
      var slug = label.querySelector('input[name="amenities"]');
      if (!slug) return;
      var slugVal = slug.dataset.amenityContext || '';
      var amenityCtx = AMENITY_CONTEXT[slugVal] || 'residential,commercial';
      var contexts = amenityCtx.split(',');
      if (!typeSlug) {
        label.style.display = '';
      } else if (contexts.indexOf(context) !== -1) {
        label.style.display = '';
      } else {
        label.style.display = 'none';
        label.querySelector('input').checked = false;
      }
    });
  }

  /* ---- Autosuggest ---- */
  var searchInput = document.getElementById('lux-search-input');
  var suggestDropdown = document.getElementById('lux-suggest-dropdown');
  var debounceTimer = null;
  var highlightIndex = -1;
  var suggestItems = [];

  function fetchSuggestions(query) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', suggestUrl + encodeURIComponent(query), true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        renderSuggestions(data.results);
      }
    };
    xhr.send();
  }

  function renderSuggestions(results) {
    suggestItems = results;
    highlightIndex = -1;
    if (!results.length) {
      suggestDropdown.classList.remove('is-open');
      return;
    }
    var html = '';
    var lastType = '';
    results.forEach(function (r, i) {
      if (r.type !== lastType) {
        html += '<div class="lux-suggest-group-label">' + r.type + 's</div>';
        lastType = r.type;
      }
      html += '<div class="lux-suggest-item" data-index="' + i +
        '" data-type="' + r.type + '" data-value="' + r.value + '">' +
        '<span>' + escapeHtml(r.label) + '</span>';
      if (r.count !== undefined) {
        html += '<span class="count">(' + r.count + ')</span>';
      }
      html += '</div>';
    });
    suggestDropdown.innerHTML = html;
    suggestDropdown.classList.add('is-open');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function selectSuggestion(index) {
    var item = suggestItems[index];
    if (!item) return;
    if (item.type === 'location') {
      searchInput.value = item.value;
    } else if (item.type === 'type') {
      searchInput.value = '';
    }
    suggestDropdown.classList.remove('is-open');
    var params = new URLSearchParams(currentParams);
    if (item.type === 'location') {
      params.set('q', item.value);
    } else if (item.type === 'type') {
      params.set('type', item.value);
    }
    params.delete('page');
    navigateTo(params);
  }

  function submitSearch() {
    suggestDropdown.classList.remove('is-open');
    var params = new URLSearchParams(currentParams);
    var q = searchInput.value.trim();
    if (q) params.set('q', q);
    else params.delete('q');
    params.delete('page');
    navigateTo(params);
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var q = searchInput.value.trim();
      if (q.length < 1) {
        suggestDropdown.classList.remove('is-open');
        return;
      }
      debounceTimer = setTimeout(function () {
        fetchSuggestions(q);
      }, 150);
    });

    searchInput.addEventListener('keydown', function (e) {
      var allItems = suggestDropdown.querySelectorAll('.lux-suggest-item');
      if (e.key === 'ArrowDown' && allItems.length) {
        e.preventDefault();
        highlightIndex = Math.min(highlightIndex + 1, allItems.length - 1);
        allItems.forEach(function (el, i) { el.classList.toggle('is-highlighted', i === highlightIndex); });
      } else if (e.key === 'ArrowUp' && allItems.length) {
        e.preventDefault();
        highlightIndex = Math.max(highlightIndex - 1, 0);
        allItems.forEach(function (el, i) { el.classList.toggle('is-highlighted', i === highlightIndex); });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightIndex >= 0 && suggestItems[highlightIndex]) {
          selectSuggestion(highlightIndex);
        } else {
          submitSearch();
        }
      } else if (e.key === 'Escape') {
        suggestDropdown.classList.remove('is-open');
        highlightIndex = -1;
      }
    });
  }

  var searchBtn = document.getElementById('lux-search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', submitSearch);
  }

  if (suggestDropdown) {
    suggestDropdown.addEventListener('click', function (e) {
      var item = e.target.closest('.lux-suggest-item');
      if (item) {
        selectSuggestion(parseInt(item.dataset.index, 10));
      }
    });
  }

  document.addEventListener('click', function (e) {
    if (searchInput && suggestDropdown && !searchInput.contains(e.target) && !suggestDropdown.contains(e.target)) {
      suggestDropdown.classList.remove('is-open');
    }
  });

  /* ---- Filter Drawer ---- */
  var filterToggle = document.getElementById('lux-filter-toggle');
  var drawer = document.getElementById('lux-filter-drawer');
  var drawerClose = document.getElementById('lux-drawer-close');
  var drawerOverlay = document.getElementById('lux-drawer-overlay');

  function openDrawer() {
    if (drawer) drawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    updateDrawerCount();
  }

  function closeDrawer() {
    if (drawer) drawer.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  if (filterToggle) filterToggle.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) {
      closeDrawer();
    }
  });

  /* ---- Clear all ---- */
  document.querySelectorAll('.lux-clear-all').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      navigateTo(new URLSearchParams());
    });
  });

  /* ---- Init ---- */
  bindPills();
  bindChipRemoval();
  bindSortLinks();
  bindPagination();
  bindDrawerApply();
  bindDrawerClear();
  bindDrawerLiveCount();
  bindTypeChips();

  var activeType = currentParams.get('type') || '';
  if (activeType) updateContextualFilters(activeType);

  window.addEventListener('popstate', function () {
    currentParams = new URLSearchParams(window.location.search);
    fetchPartial(currentParams, applyPartial);
  });

})();
