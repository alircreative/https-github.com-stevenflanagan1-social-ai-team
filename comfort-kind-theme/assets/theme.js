/* ============================================================
   ComfortKind Theme — theme.js
   ============================================================ */

(function () {
  'use strict';

  /* ── Cart count update ── */
  function updateCartCount() {
    fetch('/cart.js', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        var counts = document.querySelectorAll('[data-cart-count]');
        counts.forEach(function (el) {
          el.textContent = cart.item_count;
          el.setAttribute('data-count', cart.item_count);
        });
      })
      .catch(function () {});
  }

  /* ── Mobile nav toggle ── */
  function initMobileNav() {
    var toggle = document.getElementById('ck-nav-toggle');
    var nav = document.getElementById('ck-mobile-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
      var open = nav.getAttribute('aria-hidden') === 'false';
      nav.setAttribute('aria-hidden', open ? 'true' : 'false');
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  }

  /* ── Announcement bar rotation ── */
  function initAnnouncementBar() {
    var items = document.querySelectorAll('.ck-utility__item');
    if (items.length < 2) return;
    if (window.innerWidth > 768) return;

    var current = 0;
    items.forEach(function (item, i) {
      if (i !== 0) item.style.display = 'none';
    });

    setInterval(function () {
      items[current].style.display = 'none';
      current = (current + 1) % items.length;
      items[current].style.display = 'flex';
    }, 4000);
  }

  /* ── Accordion (global) ── */
  function initAccordions() {
    document.querySelectorAll('.ck-accordion__trigger').forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var item = this.closest('.ck-accordion__item');
        if (!item) return;
        var isOpen = item.classList.contains('is-open');
        item.classList.toggle('is-open', !isOpen);
        this.setAttribute('aria-expanded', !isOpen);
      });
    });
  }

  /* ── FAQ tabs ── */
  function initFaqTabs() {
    var tabs = document.querySelectorAll('.ck-faq__tab');
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.ck-faq__panel').forEach(function (p) {
          p.classList.remove('is-active');
        });
        this.classList.add('is-active');
        this.setAttribute('aria-selected', 'true');
        var target = document.getElementById(this.dataset.target);
        if (target) target.classList.add('is-active');
      });
    });

    // FAQ entry accordion inside panels
    document.querySelectorAll('.ck-faq__entry').forEach(function (entry) {
      var btn = entry.querySelector('.ck-faq__q');
      if (btn) {
        btn.addEventListener('click', function () {
          entry.classList.toggle('is-open');
        });
      }
    });
  }

  /* ── PDP: variant selection, qty stepper, add to cart, thumbnails ── */
  function initPDP() {
    var form = document.querySelector('[id^="product-form-"]');
    if (!form) return;

    // Qty stepper
    var qtyInput = document.getElementById('ck-qty');
    var qtyMinus = document.getElementById('ck-qty-minus');
    var qtyPlus = document.getElementById('ck-qty-plus');

    if (qtyInput && qtyMinus && qtyPlus) {
      qtyMinus.addEventListener('click', function () {
        var val = parseInt(qtyInput.value) || 1;
        if (val > 1) qtyInput.value = val - 1;
      });
      qtyPlus.addEventListener('click', function () {
        var val = parseInt(qtyInput.value) || 1;
        qtyInput.value = val + 1;
      });
    }

    // Thumbnail gallery swap
    var mainImg = document.getElementById('ck-main-img');
    document.querySelectorAll('.ck-pdp__thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        document.querySelectorAll('.ck-pdp__thumb').forEach(function (t) {
          t.classList.remove('is-active');
        });
        this.classList.add('is-active');
        if (mainImg) {
          mainImg.style.opacity = '0';
          var src = this.dataset.imageSrc;
          var alt = this.dataset.imageAlt || '';
          setTimeout(function () {
            mainImg.src = src;
            mainImg.alt = alt;
            mainImg.style.opacity = '1';
          }, 150);
        }
      });
    });

    // Add to cart fetch
    var addBtn = document.getElementById('ck-add-to-cart');
    if (form && addBtn) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (addBtn.disabled) return;

        var formData = new FormData(form);
        var originalText = addBtn.textContent.trim();
        addBtn.textContent = 'Adding...';
        addBtn.disabled = true;
        addBtn.classList.add('is-loading');

        fetch('/cart/add.js', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          body: formData
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Cart add failed');
            return res.json();
          })
          .then(function () {
            addBtn.textContent = 'Added!';
            addBtn.classList.remove('is-loading');
            updateCartCount();
            setTimeout(function () {
              addBtn.textContent = originalText;
              addBtn.disabled = false;
            }, 2000);
          })
          .catch(function (err) {
            console.error('Add to cart error:', err);
            addBtn.textContent = originalText;
            addBtn.disabled = false;
            addBtn.classList.remove('is-loading');
          });
      });
    }
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', function () {
    updateCartCount();
    initMobileNav();
    initAnnouncementBar();
    initAccordions();
    initFaqTabs();
    initPDP();
  });

})();
