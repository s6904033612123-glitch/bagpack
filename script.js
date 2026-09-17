/* ==========================================================================
   AuraCarry - Global Script
   Handling Products Display, Filter, Order Submission, and Admin Dashboard
   ========================================================================== */

// Config URLs (Replace with your actual Google Apps Script & Published CSV URLs)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbylWek1oJbU3ewZyvruhRhaLtwBpI9_ixD0IlbNPVvMdKVsE9qyEjfLX2tspGurcJee/exec';
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQdEblMsO7DFYMYtIpmf_csGH-ojLcLVYD14aBpEm_hdBe6CIXCnTF0uX2VxMZbP6t1LTr6Dq0e_2Mv/pub?output=csv';

document.addEventListener('DOMContentLoaded', () => {
  initProductPage();
  initOrderPage();
  initAdminPage();
});

/* ==========================================================================
   1. PRODUCT PAGE (product.html)
   ========================================================================== */
function initProductPage() {
  const productList = document.getElementById('product-list');
  const filterBar = document.getElementById('filter-bar');

  if (!productList) return; // Exit if not on product.html

  // Read URL parameter ?mood=xxx
  const urlParams = new URLSearchParams(window.location.search);
  const selectedMood = urlParams.get('mood') || 'all';

  fetch('products.json')
    .then(response => response.json())
    .then(products => {
      renderFilterButtons(filterBar, products, selectedMood);
      renderProducts(productList, products, selectedMood);
    })
    .catch(error => {
      console.error('Error loading products:', error);
      productList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">ไม่สามารถโหลดข้อมูลสินค้าได้ในขณะนี้</p>';
    });
}

function renderFilterButtons(container, products, activeMood) {
  if (!container) return;

  const moods = ['all', 'fresh', 'relax', 'focus', 'romance'];
  container.innerHTML = '';

  moods.forEach(mood => {
    const btn = document.createElement('button');
    btn.className = `btn ${mood.toLowerCase() === activeMood.toLowerCase() ? 'btn-primary' : 'btn-outline'}`;
    btn.style.margin = '0.25rem';
    btn.style.textTransform = 'capitalize';
    btn.textContent = mood === 'all' ? 'ทั้งหมด' : mood;

    btn.addEventListener('click', () => {
      // Update Active Button Style
      container.querySelectorAll('button').forEach(b => {
        b.className = 'btn btn-outline';
      });
      btn.className = 'btn btn-primary';

      // Render Filtered Products
      const productList = document.getElementById('product-list');
      renderProducts(productList, products, mood);

      // Update URL without page refresh
      const newUrl = mood === 'all' ? window.location.pathname : `${window.location.pathname}?mood=${mood}`;
      window.history.pushState({ mood }, '', newUrl);
    });

    container.appendChild(btn);
  });
}

function renderProducts(container, products, mood) {
  if (!container) return;

  const filteredProducts = mood === 'all'
    ? products
    : products.filter(p => p.mood.toLowerCase() === mood.toLowerCase());

  if (filteredProducts.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem 0;">ไม่พบสินค้าในหมวดหมู่นี้</p>';
    return;
  }

  container.innerHTML = filteredProducts.map(product => `
    <div class="product-card">
      <div class="product-card__image-wrap">
        <img src="${product.image}" alt="${product.name}" class="product-card__image" loading="lazy">
      </div>
      <div class="product-card__body">
        <div class="product-card__meta">
          <span class="tag tag-${product.mood}">${product.mood}</span>
          <small style="color: var(--text-light); font-size: 0.8rem;">${product.size}</small>
        </div>
        <h3 class="product-card__title">${product.name}</h3>
        <p class="product-card__desc">${product.description}</p>
        <div class="product-card__footer">
          <span class="product-card__price">฿${product.price}</span>
          <a href="order.html?item=${encodeURIComponent(product.name)}&price=${encodeURIComponent(product.price)}" class="btn btn-primary" style="padding: 0.5rem 1.2rem; font-size: 0.85rem;">สั่งซื้อ</a>
        </div>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   2. ORDER PAGE (order.html)
   ========================================================================== */
function initOrderPage() {
  const orderForm = document.getElementById('orderForm');
  if (!orderForm) return; // Exit if not on order.html

  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');
  const customerNameInput = document.getElementById('customerName');
  const contactInput = document.getElementById('contact');
  const noteInput = document.getElementById('note');

  // Fill form from URL Parameters
  const urlParams = new URLSearchParams(window.location.search);
  const itemParam = urlParams.get('item');
  const priceParam = urlParams.get('price');

  if (itemParam && itemsInput) {
    itemsInput.value = itemParam;
  }
  if (priceParam && totalInput) {
    totalInput.value = priceParam;
  }

  // Form Submit Event
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const payload = {
      customerName: customerNameInput ? customerNameInput.value.trim() : '',
      contact: contactInput ? contactInput.value.trim() : '',
      items: itemsInput ? itemsInput.value.trim() : '',
      total: totalInput ? totalInput.value.trim() : '',
      note: noteInput ? noteInput.value.trim() : ''
    };

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => {
      window.location.href = 'thankyou.html';
    })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    });
  });
}

/* ==========================================================================
   3. ADMIN PAGE (admin.html)
   ========================================================================== */
function initAdminPage() {
  const tableBody = document.querySelector('#ordersTable tbody');
  if (!tableBody) return; // Exit if not on admin.html

  fetch(CSV_URL)
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.text();
    })
    .then(csvText => {
      const rows = parseCSV(csvText);
      if (rows.length < 2) {
        tableBody.innerHTML = '<tr><td colspan="100%" style="text-align: center; padding: 2rem;">ไม่พบข้อมูลรายการสั่งซื้อ</td></tr>';
        return;
      }

      // First row is header, rest are data
      const dataRows = rows.slice(1);
      
      // Reverse order to show newest items first
      dataRows.reverse();

      tableBody.innerHTML = dataRows.map(row => {
        return `
          <tr>
            ${row.map(cell => `<td style="padding: 0.85rem; border-bottom: 1px solid var(--border-light);">${escapeHTML(cell)}</td>`).join('')}
          </tr>
        `;
      }).join('');
    })
    .catch(error => {
      console.error('Error fetching CSV:', error);
      tableBody.innerHTML = '<tr><td colspan="100%" style="text-align: center; color: red; padding: 2rem;">เกิดข้อผิดพลาดในการโหลดข้อมูลตาราง</td></tr>';
    });
}

// Custom Vanilla CSV Parser (handles quoted values, commas inside quotes, & newlines)
function parseCSV(text) {
  const result = [];
  let row = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(cur.trim());
      cur = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++; // skip \n in CRLF
      }
      row.push(cur.trim());
      if (row.some(cell => cell.length > 0)) {
        result.push(row);
      }
      row = [];
      cur = '';
    } else {
      cur += c;
    }
  }

  if (cur.length > 0 || row.length > 0) {
    row.push(cur.trim());
    if (row.some(cell => cell.length > 0)) {
      result.push(row);
    }
  }

  return result;
}

// Helper to prevent XSS in admin table
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
