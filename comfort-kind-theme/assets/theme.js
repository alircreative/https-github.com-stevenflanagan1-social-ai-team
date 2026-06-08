/* ============================================================
   Comfort Kind Theme — JavaScript
   Handles: variant selection, gallery sync, quantity input,
   AJAX add-to-cart with cart drawer update.
   No framework dependencies.
   ============================================================ */

(function () {
  'use strict';

  /* ── Variant Selection ── */
  document.querySelectorAll('.ck-product__form').forEach(function (form) {
    var variantInputs = form.querySelectorAll('.ck-product__option-input');
    var hiddenVariantInput = form.querySelector('input[name="id"]');
    var atcBtn = form.querySelector('.ck-product__atc-btn');
    var priceEl = form.closest('.ck-product__info')
      ? form.closest('.ck-product__info').querySelector('.ck-product__price')
      : null;

    // Build variant map from Shopify's global product JSON
    var productData = null;
    var productJsonEl = document.querySelector('[data-product-json]');
    if (productJsonEl) {
      try { productData = JSON.parse(productJsonEl.textContent); } catch (e) {}
    }

    function getSelectedOptions() {
      var opts = {};
      variantInputs.forEach(function (input) {
        if (input.checked) opts[input.name] = input.value;
      });
      return opts;
    }

    function findMatchingVariant(selectedOpts) {
      if (!productData) return null;
      return productData.variants.find(function (variant) {
        return variant.options.every(function (val, idx) {
          var optionName = productData.options[idx];
          return selectedOpts[optionName] === val;
        });
      });
    }

    function updateVariant() {
      var selectedOpts = getSelectedOptions();
      var variant = findMatchingVariant(selectedOpts);

      if (!variant) return;

      // Update hidden ID input
      if (hiddenVariantInput) {
        hiddenVariantInput.value = variant.id;
        hiddenVariantInput.disabled = false;
      }

      // Update URL without reload
      var url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());

      // Update ATC button
      if (atcBtn) {
        var btnText = atcBtn.querySelector('.ck-product__atc-btn-text');
        if (variant.available) {
          atcBtn.disabled = false;
          atcBtn.classList.remove('ck-product__atc-btn--disabled');
          if (btnText) btnText.textContent = 'Add to Cart';
        } else {
          atcBtn.disabled = true;
          atcBtn.classList.add('ck-product__atc-btn--disabled');
          if (btnText) btnText.textContent = 'Sold Out';
        }
      }

      // Update price display
      if (priceEl && variant.price) {
        var priceCurrentEl = priceEl.querySelector('.ck-price__current');
        var priceCompareEl = priceEl.querySelector('.ck-price__compare');
        if (priceCurrentEl) {
          priceCurrentEl.textContent = formatMoney(variant.price);
        }
        if (priceCompareEl) {
          if (variant.compare_at_price && variant.compare_at_price > variant.price) {
            priceCompareEl.textContent = formatMoney(variant.compare_at_price);
            priceCompareEl.style.display = '';
          } else {
            priceCompareEl.style.display = 'none';
          }
        }
      }

      // Update gallery if variant has featured media
      if (variant.featured_media) {
        var mediaId = variant.featured_media.id;
        var mediaItems = document.querySelectorAll('.ck-product__media-item');
        mediaItems.forEach(function (item) {
          item.classList.toggle('ck-product__media-item--active',
            item.dataset.mediaId === String(mediaId));
        });
        var thumbs = document.querySelectorAll('.ck-product__thumb');
        thumbs.forEach(function (thumb) {
          thumb.classList.toggle('ck-product__thumb--active',
            thumb.dataset.mediaId === String(mediaId));
        });
      }
    }

    variantInputs.forEach(function (input) {
      input.addEventListener('change', updateVariant);
    });
  });

  /* ── Gallery Thumbnail Clicks ── */
  document.querySelectorAll('.ck-product__thumb').forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      var mediaId = this.dataset.mediaId;
      var mediaItems = document.querySelectorAll('.ck-product__media-item');
      var thumbs = document.querySelectorAll('.ck-product__thumb');

      mediaItems.forEach(function (item) {
        item.classList.toggle('ck-product__media-item--active',
          item.dataset.mediaId === mediaId);
      });
      thumbs.forEach(function (t) {
        t.classList.toggle('ck-product__thumb--active',
          t.dataset.mediaId === mediaId);
      });
    });
  });

  /* ── Quantity Input ── */
  document.querySelectorAll('.ck-product__quantity-wrapper').forEach(function (wrapper) {
    var input = wrapper.querySelector('.ck-product__quantity-input');
    wrapper.querySelectorAll('.ck-product__quantity-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var current = parseInt(input.value, 10) || 1;
        var action = this.dataset.action;
        if (action === 'increase') {
          input.value = current + 1;
        } else if (action === 'decrease' && current > 1) {
          input.value = current - 1;
        }
      });
    });
  });

  /* ── AJAX Add to Cart ── */
  document.querySelectorAll('[data-type="add-to-cart-form"]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var atcBtn = form.querySelector('.ck-product__atc-btn');
      var btnText = atcBtn ? atcBtn.querySelector('.ck-product__atc-btn-text') : null;
      var btnLoader = atcBtn ? atcBtn.querySelector('.ck-product__atc-btn-loading') : null;
      var errorEl = form.querySelector('.ck-product__error');

      // Show loading state
      if (atcBtn) atcBtn.disabled = true;
      if (btnText) btnText.hidden = true;
      if (btnLoader) btnLoader.hidden = false;
      if (errorEl) errorEl.hidden = true;

      var formData = new FormData(form);
      var body = {
        id: formData.get('id'),
        quantity: parseInt(formData.get('quantity'), 10) || 1,
        sections: 'cart-icon-bubble'
      };

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(body)
      })
        .then(function (res) {
          if (!res.ok) return res.json().then(function (data) { throw data; });
          return res.json();
        })
        .then(function () {
          // Update cart count
          return fetch('/cart.js', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        })
        .then(function (res) { return res.json(); })
        .then(function (cart) {
          // Update cart count badge
          var cartCounts = document.querySelectorAll('.ck-cart-count');
          cartCounts.forEach(function (el) {
            el.textContent = cart.item_count;
            el.style.display = cart.item_count > 0 ? '' : 'none';
          });

          // Open cart drawer if available, else redirect
          var cartDrawer = document.querySelector('cart-drawer');
          if (cartDrawer && typeof cartDrawer.open === 'function') {
            cartDrawer.open(atcBtn);
          } else if (typeof routes !== 'undefined' && routes.cart_url) {
            window.location.href = routes.cart_url;
          }
        })
        .catch(function (err) {
          if (errorEl) {
            errorEl.textContent = err.description || 'Something went wrong. Please try again.';
            errorEl.hidden = false;
          }
        })
        .finally(function () {
          if (atcBtn) atcBtn.disabled = false;
          if (btnText) btnText.hidden = false;
          if (btnLoader) btnLoader.hidden = true;
        });
    });
  });

  /* ── Money formatting helper ── */
  function formatMoney(cents) {
    var value = (cents / 100).toFixed(2);
    return '$' + value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* ── Mobile Nav ── */
  var mobileToggle = document.querySelector('.ck-header__mobile-toggle');
  var nav = document.querySelector('.ck-nav');
  if (mobileToggle && nav) {
    mobileToggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('ck-nav--open');
      mobileToggle.setAttribute('aria-expanded', isOpen);
      nav.style.display = isOpen ? 'block' : '';
    });
  }

})();
