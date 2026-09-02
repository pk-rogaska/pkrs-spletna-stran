// Plezalni klub Rogaška Slatina — skupna JS logika (meni + karusel)
document.addEventListener('DOMContentLoaded', function () {

  /* ---- Mobilni meni ---- */
  var hamburger = document.querySelector('[data-menu-open]');
  var closeBtn = document.querySelector('[data-menu-close]');
  var mobileMenu = document.querySelector('.mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      mobileMenu.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    });
  }
  if (closeBtn && mobileMenu) {
    closeBtn.addEventListener('click', function () {
      mobileMenu.classList.remove('is-open');
      document.body.style.overflow = '';
    });
  }
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobileMenu.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---- Karusel (za okno s fotografijami na Domov strani) ----
     Zasnovan tako, da ga je mogoče znova pognati (window.initCarousel), potem
     ko gallery.js zamenja slide-e z dejanskimi izbranimi fotografijami. */

  function setupCarousel(carousel) {
    var track = carousel.querySelector('.carousel-track');
    if (!track) return;
    var dotsWrap = carousel.querySelector('.carousel-dots');
    var state = carousel._carouselState || (carousel._carouselState = { index: 0 });

    function getSlides() { return carousel.querySelectorAll('.carousel-slide'); }

    function rebuildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      getSlides().forEach(function (_, i) {
        var dot = document.createElement('button');
        if (i === state.index) dot.className = 'is-active';
        dot.setAttribute('aria-label', 'Slika ' + (i + 1));
        dot.addEventListener('click', function () { goTo(i); });
        dotsWrap.appendChild(dot);
      });
    }

    function update() {
      var slides = getSlides();
      if (state.index >= slides.length) state.index = 0;
      track.style.transform = 'translateX(-' + (state.index * 100) + '%)';
      if (dotsWrap) {
        Array.prototype.forEach.call(dotsWrap.children, function (d, i) {
          d.classList.toggle('is-active', i === state.index);
        });
      }
    }

    function goTo(i) {
      var slides = getSlides();
      if (slides.length === 0) return;
      state.index = (i + slides.length) % slides.length;
      update();
    }

    function resetTimer() {
      clearInterval(carousel._timer);
      if (getSlides().length > 1) {
        carousel._timer = setInterval(function () { goTo(state.index + 1); }, 5000);
      }
    }

    carousel._carouselRefresh = function () {
      state.index = 0;
      rebuildDots();
      update();
      resetTimer();
    };

    if (!carousel._carouselBound) {
      carousel._carouselBound = true;
      var prev = carousel.querySelector('.carousel-arrow.prev');
      var next = carousel.querySelector('.carousel-arrow.next');
      if (prev) prev.addEventListener('click', function () { goTo(state.index - 1); });
      if (next) next.addEventListener('click', function () { goTo(state.index + 1); });
      carousel.addEventListener('mouseenter', function () { clearInterval(carousel._timer); });
      carousel.addEventListener('mouseleave', resetTimer);
    }

    rebuildDots();
    update();
    resetTimer();
  }

  document.querySelectorAll('[data-carousel]').forEach(setupCarousel);

  /* ---- Kontaktni obrazec (Kontakt stran) ----
     Stran je statična (brez strežnika), zato gumb "Pošlji sporočilo" pripravi
     e-poštno sporočilo z vsemi podatki in ga odpre v uporabnikovem e-poštnem
     programu (mailto:), namesto da bi ga poslal neposredno s strežnika. */
  var contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (contactForm.name.value || '').trim();
      var email = (contactForm.email.value || '').trim();
      var subject = (contactForm.subject.value || '').trim() || 'Sporočilo s spletne strani';
      var message = (contactForm.message.value || '').trim();
      var body = 'Ime in priimek: ' + name + '\nE-pošta: ' + email + '\n\n' + message;
      var mailto = 'mailto:plezalniklub.rogaskaslatina@gmail.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);
      window.location.href = mailto;
    });
  }

  // Omogoči gallery.js, da po zamenjavi slide-ov (prave fotografije namesto
  // placeholderjev) karusel varno znova inicializira.
  window.initCarousel = function (carousel) {
    if (carousel._carouselRefresh) {
      carousel._carouselRefresh();
    } else {
      setupCarousel(carousel);
    }
  };

});
