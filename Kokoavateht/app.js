// DOM-viittaukset
const yearEl = document.getElementById('year');
const loaderEl = document.getElementById('loader');
const errorAlertEl = document.getElementById('errorAlert');
const gridEl = document.getElementById('cardsGrid');
const emptyStateEl = document.getElementById('emptyState');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const carouselInner = document.getElementById('carouselInner');

// Vuosi footerissa
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Bootstrap Toast
let toast;
document.addEventListener('DOMContentLoaded', () => {
  const toastEl = document.getElementById('mainToast');
  if (toastEl) {
    toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2400 });
  }
});

// Kevyt lomakevalidointi
(() => {
  const form = document.querySelector('form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    if (!form.checkValidity()) {
      e.preventDefault();
      e.stopPropagation();
    }
    form.classList.add('was-validated');
  });
})();

/* -----------------------------
   JSON-datan haku (KUVAT)
   Lähde: https://jsonplaceholder.typicode.com/albums/1/photos
   Otamme 6 ensimmäistä kuvaa
------------------------------ */
const API_URL = 'https://jsonplaceholder.typicode.com/albums/1/photos';
let allItems = [];

async function fetchData() {
  setLoading(true);
  setError('');
  emptyStateEl?.classList.add('d-none');

  try {
    const resp = await fetch(API_URL, { method: 'GET' });
    if (!resp.ok) throw new Error(`Palvelinvirhe: ${resp.status}`);
    const data = await resp.json();

    // 6 kuvaa
    allItems = (Array.isArray(data) ? data : []).slice(0, 6);
    renderCards(allItems);
    renderCarousel(allItems.slice(0, 3)); // 3 kuvaa karuselliin

    // Onnistumistoast
    toast?.show();
  } catch (err) {
    console.error(err);
    setError('Kuvien lataus epäonnistui. Yritä myöhemmin uudelleen.');
  } finally {
    setLoading(false);
  }
}

function renderCards(items) {
  if (!gridEl) return;
  gridEl.innerHTML = '';
  if (!items || items.length === 0) {
    emptyStateEl?.classList.remove('d-none');
    return;
  }

  const frag = document.createDocumentFragment();

  items.forEach((item) => {
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-lg-4';

    col.innerHTML = `
      <div class="card h-100 shadow-sm card-hover" aria-label="Kuvakortti">
        <img src="${escapeHtml(item.thumbnailUrl)}" class="card-img-top" alt="Pikkukuva #${item.id}" />
        <div class="card-body d-flex flex-column">
          <h3 class="h6 card-title">${escapeHtml(item.title)}</h3>
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <span class="badge text-bg-light">#${item.id}</span>
            <button class="btn btn-outline-primary btn-sm" data-id="${item.id}">Avaa</button>
          </div>
        </div>
      </div>
    `;

    frag.appendChild(col);
  });

  gridEl.appendChild(frag);

  // Modalin avaus
  gridEl.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-id'));
      const found = allItems.find((x) => x.id === id);
      if (found) {
        openDetailModal(found);
      }
    });
  });
}

function renderCarousel(items) {
  if (!carouselInner) return;
  carouselInner.innerHTML = '';
  items.forEach((it, idx) => {
    const div = document.createElement('div');
    div.className = 'carousel-item' + (idx === 0 ? ' active' : '');
    div.innerHTML = `
      <img src="${escapeHtml(it.url)}" class="d-block w-100" alt="Karusellikuva #${it.id}" />
      <div class="carousel-caption d-none d-md-block">
        <h5>${escapeHtml(it.title.substring(0, 32))}${it.title.length > 32 ? '…' : ''}</h5>
        <p>JSONPlaceholder • album ${it.albumId}</p>
      </div>
    `;
    carouselInner.appendChild(div);
  });
}

function openDetailModal(item) {
  const modalEl = document.getElementById('infoModal');
  if (!modalEl) return;
  const titleEl = modalEl.querySelector('.modal-title');
  const bodyEl = modalEl.querySelector('.modal-body');
  if (titleEl) titleEl.textContent = `Kuva #${item.id}`;
  if (bodyEl) bodyEl.innerHTML = `
    <figure class="text-center">
      <img src="${escapeHtml(item.url)}" class="img-fluid rounded" alt="Kuva #${item.id}" />
      <figcaption class="small text-muted mt-2">${escapeHtml(item.title)}</figcaption>
    </figure>
  `;
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function setLoading(isLoading) {
  loaderEl?.classList.toggle('d-none', !isLoading);
}

function setError(message) {
  if (!errorAlertEl) return;
  if (!message) {
    errorAlertEl.classList.add('d-none');
    errorAlertEl.textContent = '';
  } else {
    errorAlertEl.classList.remove('d-none');
    errorAlertEl.textContent = message;
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Suodatus otsikon perusteella
searchInput?.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = allItems.filter((x) => x.title.toLowerCase().includes(q));
  renderCards(filtered);
});

// Päivitä-nappi
refreshBtn?.addEventListener('click', fetchData);

// Lataa data heti
fetchData();