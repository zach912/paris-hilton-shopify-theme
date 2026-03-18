/* ============================================================
   PARIS HILTON SHOPIFY THEME — theme.js
   ============================================================ */

'use strict';

/* ── UTILITIES ── */
const debounce = (fn, ms = 300) => {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
};

const formatMoney = (cents) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
};

const fetchCart = async () => {
  const res = await fetch('/cart.js');
  return res.json();
};

/* ── TOAST NOTIFICATION ── */
class Toast {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'toast';
    document.body.appendChild(this.el);
    this.timer = null;
  }

  show(message, icon = '✨', duration = 3000) {
    this.el.innerHTML = `<span class="toast__icon">${icon}</span><span>${message}</span>`;
    this.el.classList.add('show');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.el.classList.remove('show'), duration);
  }
}

const toast = new Toast();

/* ── HEADER ── */
class SiteHeader {
  constructor() {
    this.header = document.querySelector('.site-header');
    if (!this.header) return;
    this.init();
  }

  init() {
    window.addEventListener('scroll', debounce(() => this.onScroll(), 10), { passive: true });
    this.onScroll();
  }

  onScroll() {
    if (window.scrollY > 40) {
      this.header.classList.add('scrolled');
    } else {
      this.header.classList.remove('scrolled');
    }
  }
}

/* ── MOBILE NAVIGATION ── */
class MobileNav {
  constructor() {
    this.nav = document.querySelector('.mobile-nav');
    this.openBtn = document.querySelector('.header-mobile-menu-btn');
    this.closeBtn = document.querySelector('.mobile-nav__close');
    this.overlay = document.querySelector('.mobile-nav__overlay');
    if (!this.nav) return;
    this.init();
  }

  init() {
    this.openBtn?.addEventListener('click', () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
  }

  open() {
    this.nav.classList.add('open');
    document.body.style.overflow = 'hidden';
    this.openBtn.setAttribute('aria-expanded', 'true');
  }

  close() {
    this.nav.classList.remove('open');
    document.body.style.overflow = '';
    this.openBtn?.setAttribute('aria-expanded', 'false');
  }
}

/* ── ANNOUNCEMENT BAR ── */
class AnnouncementBar {
  constructor() {
    this.bar = document.querySelector('.announcement-bar');
    this.dismissBtn = this.bar?.querySelector('.announcement-bar__dismiss');
    if (!this.bar) return;
    this.init();
  }

  init() {
    if (sessionStorage.getItem('announcement-dismissed')) {
      this.bar.remove();
      return;
    }
    this.dismissBtn?.addEventListener('click', () => {
      this.bar.style.maxHeight = this.bar.offsetHeight + 'px';
      requestAnimationFrame(() => {
        this.bar.style.maxHeight = '0';
        this.bar.style.overflow = 'hidden';
        this.bar.style.transition = 'max-height 0.4s ease';
      });
      setTimeout(() => this.bar.remove(), 400);
      sessionStorage.setItem('announcement-dismissed', '1');
    });
  }
}

/* ── CART DRAWER ── */
class CartDrawer {
  constructor() {
    this.drawer = document.querySelector('.cart-drawer');
    this.overlay = document.querySelector('.page-overlay');
    this.closeBtn = this.drawer?.querySelector('.cart-drawer__close');
    this.itemsContainer = this.drawer?.querySelector('.cart-drawer__items');
    this.subtotalEl = this.drawer?.querySelector('.cart-drawer__subtotal-price');
    this.countEl = this.drawer?.querySelector('.cart-drawer__count');
    this.shippingFill = this.drawer?.querySelector('.cart-drawer__shipping-fill');
    this.shippingLabel = this.drawer?.querySelector('.cart-drawer__shipping-bar-label span');
    this.FREE_SHIPPING_THRESHOLD = 10000; // $100.00 in cents

    if (!this.drawer) return;
    this.init();
  }

  init() {
    this.closeBtn?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });

    // Open on cart icon click
    document.querySelectorAll('[data-cart-trigger]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    });

    // Delegate item events
    this.drawer?.addEventListener('click', (e) => {
      if (e.target.closest('[data-cart-remove]')) {
        const key = e.target.closest('[data-cart-remove]').dataset.cartRemove;
        this.removeItem(key);
      }
      if (e.target.closest('[data-qty-change]')) {
        const btn = e.target.closest('[data-qty-change]');
        const key = btn.dataset.key;
        const delta = parseInt(btn.dataset.qtyChange);
        const current = parseInt(btn.closest('.cart-item__qty').querySelector('.cart-item__qty-num').textContent);
        this.updateQuantity(key, Math.max(0, current + delta));
      }
    });
  }

  async open() {
    await this.refresh();
    this.drawer.classList.add('open');
    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.drawer.classList.remove('open');
    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  async refresh() {
    const cart = await fetchCart();
    this.render(cart);
    this.updateHeaderCount(cart.item_count);
  }

  render(cart) {
    if (!this.itemsContainer) return;

    if (this.countEl) this.countEl.textContent = cart.item_count;

    // Update shipping bar
    if (this.shippingFill && this.shippingLabel) {
      const pct = Math.min(100, (cart.total_price / this.FREE_SHIPPING_THRESHOLD) * 100);
      this.shippingFill.style.width = pct + '%';
      const remaining = this.FREE_SHIPPING_THRESHOLD - cart.total_price;
      if (remaining <= 0) {
        this.shippingLabel.closest('.cart-drawer__shipping-bar-label').textContent = '✨ You qualify for free shipping!';
      } else {
        this.shippingLabel.textContent = formatMoney(remaining);
      }
    }

    if (cart.item_count === 0) {
      this.itemsContainer.innerHTML = `
        <div class="cart-drawer__empty">
          <div class="cart-drawer__empty-icon">🛍️</div>
          <p class="cart-drawer__empty-title">Your bag is empty</p>
          <p class="cart-drawer__empty-text">Time to add some sparkle to your life 💖</p>
          <button class="btn btn-primary" onclick="document.querySelector('.cart-drawer').querySelector('.cart-drawer__close').click()">Shop Now ✨</button>
        </div>`;
    } else {
      this.itemsContainer.innerHTML = cart.items.map(item => this.renderItem(item)).join('');
    }

    if (this.subtotalEl) {
      this.subtotalEl.textContent = formatMoney(cart.total_price);
    }
  }

  renderItem(item) {
    const imgSrc = item.image ? item.image.replace('.jpg', '_120x120.jpg') : '';
    return `
      <div class="cart-item" data-key="${item.key}">
        <img class="cart-item__img" src="${imgSrc}" alt="${item.title}" loading="lazy">
        <div class="cart-item__body">
          <p class="cart-item__title">${item.product_title}</p>
          ${item.variant_title ? `<p class="cart-item__variant">${item.variant_title}</p>` : ''}
          <div class="cart-item__footer">
            <div class="cart-item__qty">
              <button class="cart-item__qty-btn" data-qty-change="-1" data-key="${item.key}" aria-label="Decrease">−</button>
              <span class="cart-item__qty-num">${item.quantity}</span>
              <button class="cart-item__qty-btn" data-qty-change="1" data-key="${item.key}" aria-label="Increase">+</button>
            </div>
            <span class="cart-item__price">${formatMoney(item.final_line_price)}</span>
          </div>
          <button class="cart-item__remove" data-cart-remove="${item.key}">Remove</button>
        </div>
      </div>`;
  }

  async addItem(formData) {
    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Could not add item');
      const item = await res.json();
      await this.refresh();
      this.open();
      toast.show(`${item.title} added to bag!`, '💖');
      return item;
    } catch (err) {
      toast.show('Something went wrong. Please try again.', '😢');
      throw err;
    }
  }

  async removeItem(key) {
    await this.updateQuantity(key, 0);
  }

  async updateQuantity(key, quantity) {
    await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity })
    });
    await this.refresh();
  }

  updateHeaderCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = count;
      el.dataset.count = count;
    });
  }
}

const cartDrawer = new CartDrawer();

/* ── ADD TO CART ── */
class AddToCart {
  constructor() {
    this.forms = document.querySelectorAll('[data-product-form]');
    this.init();
  }

  init() {
    this.forms.forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('.btn-atc');
        if (!btn) return;

        btn.classList.add('loading');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Adding... ✨';

        try {
          const formData = new FormData(form);
          await cartDrawer.addItem(formData);
          btn.innerHTML = 'Added! 💖';
          setTimeout(() => { btn.innerHTML = originalText; btn.classList.remove('loading'); }, 2000);
        } catch {
          btn.innerHTML = originalText;
          btn.classList.remove('loading');
        }
      });
    });
  }
}

/* ── QUICK ADD ── */
class QuickAdd {
  constructor() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-quick-add]');
      if (!btn) return;
      e.preventDefault();

      const variantId = btn.dataset.quickAdd;
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '✨';
      btn.disabled = true;

      const formData = new FormData();
      formData.append('id', variantId);
      formData.append('quantity', 1);

      try {
        await cartDrawer.addItem(formData);
        btn.innerHTML = '💖';
        setTimeout(() => { btn.innerHTML = originalHTML; btn.disabled = false; }, 2000);
      } catch {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }
    });
  }
}

/* ── PRODUCT GALLERY ── */
class ProductGallery {
  constructor() {
    this.mainImg = document.querySelector('.product-gallery__main img');
    this.thumbs = document.querySelectorAll('.product-gallery__thumb');
    if (!this.mainImg) return;
    this.init();
  }

  init() {
    this.thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => this.switchTo(i));
    });

    // Swipe support on mobile
    let startX = 0;
    this.mainImg.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    this.mainImg.addEventListener('touchend', (e) => {
      const delta = e.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 50) {
        const active = [...this.thumbs].findIndex(t => t.classList.contains('active'));
        if (delta < 0 && active < this.thumbs.length - 1) this.switchTo(active + 1);
        if (delta > 0 && active > 0) this.switchTo(active - 1);
      }
    });
  }

  switchTo(index) {
    const thumb = this.thumbs[index];
    if (!thumb) return;
    const src = thumb.querySelector('img')?.src;
    if (src) {
      this.mainImg.style.opacity = '0';
      this.mainImg.style.transition = 'opacity 0.2s ease';
      setTimeout(() => {
        this.mainImg.src = src.replace('_120x120', '_800x800');
        this.mainImg.style.opacity = '1';
      }, 200);
    }
    this.thumbs.forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
  }
}

/* ── VARIANT SELECTION ── */
class VariantSelector {
  constructor() {
    this.pills = document.querySelectorAll('.variant-pill');
    this.priceEl = document.querySelector('.product-info__price');
    this.comparePriceEl = document.querySelector('.product-info__price-compare');
    this.idInput = document.querySelector('input[name="id"]');
    this.stickyPriceEl = document.querySelector('.sticky-atc__price');
    if (!this.pills.length) return;
    this.init();
  }

  init() {
    this.pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const group = pill.dataset.optionGroup;
        document.querySelectorAll(`.variant-pill[data-option-group="${group}"]`).forEach(p => {
          p.classList.remove('active');
        });
        pill.classList.add('active');

        // Update selected display
        const label = pill.closest('.product-info__option')?.querySelector('.product-info__option-selected');
        if (label) label.textContent = pill.textContent.trim();

        this.updateVariant();
      });
    });
  }

  updateVariant() {
    const selectedOptions = [];
    document.querySelectorAll('[data-option-group]').forEach(group => {
      const active = group.closest('.variant-pills')?.querySelector('.variant-pill.active');
      if (active) selectedOptions.push(active.dataset.value);
    });

    // Find matching variant from product JSON
    const productJSON = document.getElementById('product-json');
    if (!productJSON) return;
    const variants = JSON.parse(productJSON.textContent).variants;
    const match = variants.find(v => {
      return selectedOptions.every((opt, i) => v[`option${i + 1}`] === opt);
    });

    if (match) {
      if (this.idInput) this.idInput.value = match.id;
      if (this.priceEl) this.priceEl.textContent = formatMoney(match.price);
      if (this.comparePriceEl && match.compare_at_price) {
        this.comparePriceEl.textContent = formatMoney(match.compare_at_price);
        this.comparePriceEl.style.display = '';
      } else if (this.comparePriceEl) {
        this.comparePriceEl.style.display = 'none';
      }
      if (this.stickyPriceEl) this.stickyPriceEl.textContent = formatMoney(match.price);

      // Update ATC button availability
      const atcBtn = document.querySelector('.btn-atc');
      if (atcBtn) {
        if (!match.available) {
          atcBtn.textContent = 'Sold Out';
          atcBtn.disabled = true;
        } else {
          atcBtn.innerHTML = 'Add to Bag ✨';
          atcBtn.disabled = false;
        }
      }
    }
  }
}

/* ── STICKY ATC ── */
class StickyATC {
  constructor() {
    this.bar = document.querySelector('.sticky-atc');
    this.mainAtc = document.querySelector('.product-info__atc-row');
    if (!this.bar || !this.mainAtc) return;
    this.init();
  }

  init() {
    const observer = new IntersectionObserver(([entry]) => {
      this.bar.classList.toggle('visible', !entry.isIntersecting);
    }, { threshold: 0.1 });
    observer.observe(this.mainAtc);
  }
}

/* ── ACCORDION ── */
class Accordion {
  constructor() {
    document.querySelectorAll('.accordion__trigger').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.accordion__item');
        const body = item.querySelector('.accordion__body');
        const isOpen = item.classList.contains('open');

        // Close all
        document.querySelectorAll('.accordion__item').forEach(i => {
          i.classList.remove('open');
          const b = i.querySelector('.accordion__body');
          if (b) b.style.maxHeight = '0';
        });

        if (!isOpen) {
          item.classList.add('open');
          body.style.maxHeight = body.scrollHeight + 'px';
        }
      });
    });

    // Open first by default
    const first = document.querySelector('.accordion__item');
    if (first) {
      first.classList.add('open');
      const body = first.querySelector('.accordion__body');
      if (body) body.style.maxHeight = body.scrollHeight + 'px';
    }
  }
}

/* ── QUANTITY SELECTOR ── */
class QuantitySelector {
  constructor() {
    document.querySelectorAll('.quantity-selector').forEach(sel => {
      const input = sel.querySelector('.quantity-input');
      sel.querySelector('[data-qty-dec]')?.addEventListener('click', () => {
        const val = Math.max(1, parseInt(input.value) - 1);
        input.value = val;
        input.dispatchEvent(new Event('change'));
      });
      sel.querySelector('[data-qty-inc]')?.addEventListener('click', () => {
        const val = parseInt(input.value) + 1;
        input.value = val;
        input.dispatchEvent(new Event('change'));
      });
    });
  }
}

/* ── MARQUEE STRIP (pause on hover) ── */
class MarqueeStrip {
  constructor() {
    document.querySelectorAll('.marquee-strip').forEach(strip => {
      const inner = strip.querySelector('.marquee-strip__inner');
      if (!inner) return;
      // Duplicate content for seamless loop
      inner.innerHTML += inner.innerHTML;
      strip.addEventListener('mouseenter', () => inner.style.animationPlayState = 'paused');
      strip.addEventListener('mouseleave', () => inner.style.animationPlayState = 'running');
    });
  }
}

/* ── SPARKLE CURSOR ── */
class SparkleCursor {
  constructor() {
    this.container = document.getElementById('sparkle-cursor');
    if (!this.container || window.matchMedia('(pointer: coarse)').matches) return;
    this.init();
  }

  init() {
    let lastX = 0, lastY = 0, frame = 0;
    document.addEventListener('mousemove', (e) => {
      const dx = Math.abs(e.clientX - lastX);
      const dy = Math.abs(e.clientY - lastY);
      if (dx < 8 && dy < 8) return; // only on movement

      lastX = e.clientX;
      lastY = e.clientY;
      frame++;

      if (frame % 3 !== 0) return; // throttle

      const particle = document.createElement('div');
      particle.className = 'sparkle-cursor__particle';
      particle.style.left = (e.clientX + (Math.random() * 16 - 8)) + 'px';
      particle.style.top  = (e.clientY + (Math.random() * 16 - 8)) + 'px';
      this.container.appendChild(particle);
      setTimeout(() => particle.remove(), 700);
    }, { passive: true });
  }
}

/* ── SCROLL ANIMATIONS ── */
class ScrollAnimations {
  constructor() {
    const els = document.querySelectorAll('[data-animate]');
    if (!els.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-up');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => observer.observe(el));
  }
}

/* ── EMAIL SIGNUP ── */
class EmailSignup {
  constructor() {
    document.querySelectorAll('[data-email-form]').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.querySelector('input[type="email"]')?.value;
        const btn = form.querySelector('button[type="submit"]');
        if (!email || !btn) return;

        const orig = btn.textContent;
        btn.textContent = 'Sending... ✨';
        btn.disabled = true;

        // Shopify contact form submission
        const data = new FormData();
        data.append('contact[email]', email);
        data.append('contact[tags]', 'newsletter');
        data.append('form_type', 'customer');

        try {
          await fetch('/contact', { method: 'POST', body: data });
          btn.textContent = '💖 You\'re in!';
          form.querySelector('input[type="email"]').value = '';
          toast.show('Welcome to the sparkle fam! 💖', '✨');
        } catch {
          btn.textContent = orig;
          btn.disabled = false;
        }
      });
    });
  }
}

/* ── FILTER PILLS ── */
class FilterPills {
  constructor() {
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const group = pill.dataset.filterGroup || 'main';
        document.querySelectorAll(`.filter-pill[data-filter-group="${group}"]`).forEach(p => {
          p.classList.remove('active');
        });
        pill.classList.add('active');
      });
    });
  }
}

/* ── COUNTDOWN TIMER ── */
class CountdownTimer {
  constructor() {
    document.querySelectorAll('[data-countdown]').forEach(el => {
      const target = new Date(el.dataset.countdown).getTime();
      const update = () => {
        const diff = target - Date.now();
        if (diff <= 0) { el.textContent = 'Expired'; return; }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        el.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
      };
      update();
      setInterval(update, 1000);
    });
  }
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  new SiteHeader();
  new MobileNav();
  new AnnouncementBar();
  new AddToCart();
  new QuickAdd();
  new ProductGallery();
  new VariantSelector();
  new StickyATC();
  new Accordion();
  new QuantitySelector();
  new MarqueeStrip();
  new SparkleCursor();
  new ScrollAnimations();
  new EmailSignup();
  new FilterPills();
  new CountdownTimer();
});
