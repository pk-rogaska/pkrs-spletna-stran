// Plezalni klub Rogaška Slatina — galerija
// Hibridni model: "Izbrane fotografije" so optimizirane sličice, ki živijo na tej strani
// (glej assets/data/featured-photos.json), celotni arhivi po albumih pa so povezave na
// zunanje deljene albume (glej assets/data/albums.json). Tako stran ostane hitra tudi,
// če ima klub v arhivu tisoče fotografij.
// Karusel na Domov strani uporablja svoj, ročno izbran nabor slik
// (glej assets/data/home-carousel.json) — ni nujno enak "Izbranim fotografijam".

document.addEventListener('DOMContentLoaded', function () {

  var BATCH_SIZE = 12;
  var featuredData = [];
  var shown = 0;

  var grid = document.querySelector('[data-featured-grid]');
  var emptyMsg = document.querySelector('[data-featured-empty]');
  var loadMoreBtn = document.querySelector('[data-load-more]');
  var albumsContainer = document.querySelector('[data-albums-container]');
  var albumsSearch = document.querySelector('[data-albums-search]');
  var carousel = document.querySelector('[data-home-carousel]');

  var lightbox, lightboxImg, lightboxIndex = -1;

  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('Ni bilo mogoče naložiti ' + url);
      return r.json();
    });
  }

  /* ---------------- Izbrane fotografije (lokalna, optimizirana galerija) ---------------- */

  function renderNextBatch() {
    if (!grid) return;
    var next = featuredData.slice(shown, shown + BATCH_SIZE);
    next.forEach(function (photo, i) {
      var idx = shown + i;
      var fig = document.createElement('button');
      fig.type = 'button';
      fig.className = 'featured-thumb';
      fig.setAttribute('aria-label', photo.alt || 'Fotografija ' + (idx + 1));
      var img = document.createElement('img');
      img.src = photo.thumb;
      img.alt = photo.alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      fig.appendChild(img);
      fig.addEventListener('click', function () { openLightbox(idx); });
      grid.appendChild(fig);
    });
    shown += next.length;
    if (loadMoreBtn) {
      loadMoreBtn.hidden = shown >= featuredData.length;
    }
  }

  function initFeaturedGrid() {
    if (!grid) return;
    fetchJSON('assets/data/featured-photos.json')
      .then(function (data) {
        featuredData = Array.isArray(data) ? data : [];
        if (featuredData.length === 0) {
          if (emptyMsg) emptyMsg.hidden = false;
          if (loadMoreBtn) loadMoreBtn.hidden = true;
          return;
        }
        if (emptyMsg) emptyMsg.hidden = true;
        renderNextBatch();
      })
      .catch(function () {
        if (emptyMsg) emptyMsg.hidden = false;
      });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', renderNextBatch);
  }

  /* ---------------- Lightbox (povečan prikaz) ---------------- */

  function buildLightbox() {
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.hidden = true;
    lightbox.innerHTML =
      '<button type="button" class="lightbox-close" aria-label="Zapri">✕</button>' +
      '<button type="button" class="lightbox-nav prev" aria-label="Prejšnja fotografija">‹</button>' +
      '<figure><img alt=""></figure>' +
      '<button type="button" class="lightbox-nav next" aria-label="Naslednja fotografija">›</button>';
    document.body.appendChild(lightbox);
    lightboxImg = lightbox.querySelector('img');

    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.prev').addEventListener('click', function () { step(-1); });
    lightbox.querySelector('.next').addEventListener('click', function () { step(1); });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }

  function openLightbox(idx) {
    if (!lightbox) buildLightbox();
    // poskrbi, da so vse fotografije do tega indeksa že "naložene" v mreži
    while (shown <= idx && shown < featuredData.length) renderNextBatch();
    lightboxIndex = idx;
    updateLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function updateLightbox() {
    var photo = featuredData[lightboxIndex];
    if (!photo) return;
    lightboxImg.src = photo.full || photo.thumb;
    lightboxImg.alt = photo.alt || '';
  }

  function step(dir) {
    lightboxIndex = (lightboxIndex + dir + featuredData.length) % featuredData.length;
    updateLightbox();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }

  /* ---------------- Albumi (zunanje povezave) ---------------- */

  function albumYear(name) {
    var matches = name.match(/(19|20)\d{2}/g);
    return matches ? matches[matches.length - 1] : null;
  }

  function buildAlbumCard(album) {
    var isVideo = album.type === 'video';
    var hasLink = !!album.link;
    var el = document.createElement(hasLink ? 'a' : 'div');
    el.className = 'album-card' + (isVideo ? ' video-card' : '');
    el.setAttribute('data-album-name', album.name.toLowerCase());
    if (hasLink) {
      el.href = album.link;
      el.target = '_blank';
      el.rel = 'noopener';
    } else {
      el.classList.add('is-pending');
    }
    var coverHtml = album.cover
      ? '<img src="' + album.cover + '" alt="" loading="lazy">'
      : '<div class="album-card-ph"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z"/></svg></div>';
    var playHtml = isVideo
      ? '<span class="video-play" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>'
      : '';
    var linkText = isVideo ? 'Poglej video na YouTube ↗' : 'Poglej celoten album ↗';
    el.innerHTML =
      '<div class="album-card-cover' + (isVideo ? ' video-card-cover' : '') + '">' + coverHtml + playHtml + '</div>' +
      '<div class="album-card-body">' +
        '<span class="album-card-name">' + album.name + '</span>' +
        (hasLink
          ? '<span class="album-card-link">' + linkText + '</span>'
          : '<span class="album-card-link is-muted">Povezava bo dodana kmalu</span>') +
      '</div>';
    return el;
  }

  function renderAlbums(albums) {
    albumsContainer.innerHTML = '';
    if (!albums.length) {
      albumsContainer.innerHTML = '<p class="small">Albumi so v pripravi in bodo kmalu na voljo.</p>';
      return;
    }

    var groups = {};
    var order = [];
    albums.forEach(function (album) {
      var year = albumYear(album.name) || 'Ostalo';
      if (!groups[year]) { groups[year] = []; order.push(year); }
      groups[year].push(album);
    });

    order.sort(function (a, b) {
      if (a === 'Ostalo') return 1;
      if (b === 'Ostalo') return -1;
      return Number(b) - Number(a);
    });

    order.forEach(function (year) {
      var groupEl = document.createElement('div');
      groupEl.className = 'albums-year-group';
      groupEl.setAttribute('data-year-group', '');

      var heading = document.createElement('h3');
      heading.className = 'albums-year-heading';
      heading.textContent = year;
      groupEl.appendChild(heading);

      var albumGrid = document.createElement('div');
      albumGrid.className = 'albums-grid';
      groups[year].forEach(function (album) {
        albumGrid.appendChild(buildAlbumCard(album));
      });
      groupEl.appendChild(albumGrid);

      albumsContainer.appendChild(groupEl);
    });
  }

  function filterAlbums(query) {
    var groups = albumsContainer.querySelectorAll('[data-year-group]');
    groups.forEach(function (group) {
      var cards = group.querySelectorAll('.album-card');
      var anyVisible = false;
      cards.forEach(function (card) {
        var match = !query || card.getAttribute('data-album-name').indexOf(query) !== -1;
        card.hidden = !match;
        if (match) anyVisible = true;
      });
      group.hidden = !anyVisible;
    });
  }

  function initAlbums() {
    if (!albumsContainer) return;
    Promise.all([
      fetchJSON('assets/data/albums.json').catch(function () { return []; }),
      fetchJSON('assets/data/videos.json').catch(function () { return []; })
    ]).then(function (results) {
      var albums = results[0] || [];
      var videos = (results[1] || []).map(function (v) {
        return { name: v.name, cover: v.cover, link: v.link, type: 'video' };
      });
      renderAlbums(albums.concat(videos));
      if (albumsSearch) {
        albumsSearch.addEventListener('input', function () {
          filterAlbums(albumsSearch.value.trim().toLowerCase());
        });
      }
    }).catch(function () {
      albumsContainer.innerHTML = '<p class="small">Albumov trenutno ni bilo mogoče naložiti.</p>';
    });
  }

  /* ---------------- Karusel na Domov strani (iz istih izbranih fotografij) ---------------- */

  function initHomeCarousel() {
    if (!carousel) return;
    var track = carousel.querySelector('.carousel-track');
    if (!track) return;
    fetchJSON('assets/data/home-carousel.json')
      .then(function (data) {
        var photos = Array.isArray(data) ? data : [];
        if (photos.length === 0) return; // ohrani statične placeholder slide iz HTML-ja
        track.innerHTML = '';
        photos.forEach(function (photo, i) {
          var slide = document.createElement('div');
          slide.className = 'carousel-slide';
          // Prva slika karusela je takoj vidna (nad pregibom), zato naj se naloži
          // takoj (brez loading="lazy" in z visoko prioriteto); ostale pa leno.
          var loadAttr = i === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
          slide.innerHTML = '<img src="' + (photo.full || photo.thumb) + '" alt="' + (photo.alt || '') + '" ' + loadAttr + '>';
          track.appendChild(slide);
        });
        // znova sproži inicializacijo karusela iz main.js
        if (window.initCarousel) window.initCarousel(carousel);
      })
      .catch(function () {});
  }

  initFeaturedGrid();
  initAlbums();
  initHomeCarousel();
});
