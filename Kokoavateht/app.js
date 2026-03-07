
"use strict";

/**
 * Taekwondo harrastesivun JavaScript
 * - JSON-haku: https://jsonplaceholder.typicode.com/albums/1/photos
 * - Näyttää 6 kuvaa korteissa, 3 kuvaa karusellissa
 * - Bootstrap: spinner, toast, modal, ratio, grid
 * - Haku suodattaa otsikon perusteella (debounce)
 */

/* =====================
   KONFIGURAATIO
===================== */
const API_URL = "https://jsonplaceholder.typicode.com/albums/1/photos";
const GRID_COUNT = 6;        // kortteihin
const CAROUSEL_COUNT = 3;    // karuselliin

/* =====================
   APUMETODIT
===================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function debounce(fn, delay = 250) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setLoading(show) {
  const loaderEl = $("#loader");
  loaderEl?.classList.toggle("d-none", !show);
}

function setError(message) {
  const alertEl = $("#errorAlert");
  if (!alertEl) return;
  if (!message) {
    alertEl.classList.add("d-none");
    alertEl.textContent = "";
  } else {
    alertEl.classList.remove("d-none");
    alertEl.textContent = message;
  }
}

/* =====================
   GLOBAALIT MUUTTUJAT
===================== */
let allItems = [];               // täysi vastaus (lyhennetty .slice)
let toast;                       // Bootstrap toast -instanssi

/* =====================
   ALUSTUS
===================== */
document.addEventListener("DOMContentLoaded", () => {
  // Vuosi footerissa
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Bootstrap Toast
  const toastEl = $("#mainToast");
  if (toastEl && window.bootstrap?.Toast) {
    toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2400 });
  }

  // Lomakevalidointi (kevyt)
  (function initFormValidation(){
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

  // Tapahtumat
  const refreshBtn = $("#refreshBtn");
  refreshBtn?.addEventListener("click", fetchData);

  const searchInput = $("#searchInput");
  const onSearch = debounce(() => {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const filtered = allItems.filter(x => x.title.toLowerCase().includes(q));
    renderCards(filtered);
  }, 200);
  searchInput?.addEventListener("input", onSearch);

  // Ensimmäinen haku
  fetchData();
});

/* =====================
   DATAHAKU
===================== */
async function fetchData() {
  setLoading(true);
  setError("");
  $("#emptyState")?.classList.add("d-none");

  try {
    const resp = await fetch(API_URL, { method: "GET" });
    if (!resp.ok) throw new Error(`Palvelinvirhe: ${resp.status}`);
    const data = await resp.json();

    allItems = (Array.isArray(data) ? data : []).slice(0, GRID_COUNT);
    renderCards(allItems);
    renderCarousel(allItems.slice(0, CAROUSEL_COUNT));

    // Onnistumistoast
    toast?.show();
  } catch (err) {
    console.error(err);
    setError("Kuvien lataus epäonnistui. Yritä myöhemmin uudelleen.");
  } finally {
    setLoading(false);
  }
}

/* =====================
   RENDERÖINTI – KORTIT
===================== */
function renderCards(items) {
  const gridEl = $("#cardsGrid");
  if (!gridEl) return;
  gridEl.innerHTML = "";

  if (!items || items.length === 0) {
    $("#emptyState")?.classList.remove("d-none");
    return;
  }

  const frag = document.createDocumentFragment();

  items.forEach((item) => {
    const col = document.createElement("div");
    col.className = "col-12 col-sm-6 col-lg-4";

    // Ratio 4:3 ja cover → siistit, saman kokoiset thumbit
    col.innerHTML = `
      <div class="card h-100 shadow-sm card-hover" aria-label="Kuvakortti">
        <div class="ratio ratio-4x3">
          <img src="${escapeHtml(item.thumbnailUrl)}" alt="Pikkukuva #${item.id}"
               class="card-thumb" loading="lazy" decoding="async"
               style="object-fit:cover;width:100%;height:100%;" />
        </div>
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

  // Modal-kuuntelijat
  $$("button[data-id]", gridEl).forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      const found = allItems.find((x) => x.id === id);
      if (found) openDetailModal(found);
    });
  });
}

/* =====================
   RENDERÖINTI – KARUSELLI
===================== */
function renderCarousel(items) {
  const carouselInner = $("#carouselInner");
  if (!carouselInner) return;

  carouselInner.innerHTML = "";

  items.forEach((it, idx) => {
    const slide = document.createElement("div");
    slide.className = "carousel-item" + (idx === 0 ? " active" : "");
    slide.innerHTML = `
      <div class="ratio ratio-16x9">
        <img src="${escapeHtml(it.url)}" alt="Karusellikuva #${it.id}"
             class="img-fluid" loading="lazy" decoding="async"
             style="object-fit:cover;width:100%;height:100%;" />
      </div>
      <div class="carousel-caption d-none d-md-block">
        <h5>${escapeHtml(it.title.substring(0, 40))}${it.title.length > 40 ? "…" : ""}</h5>
        <p>JSONPlaceholder • album ${it.albumId}</p>
      </div>`;
    carouselInner.appendChild(slide);
  });
}

/* =====================
   MODAL – KUVAN TARKASTELU
===================== */
function openDetailModal(item) {
  const modalEl = $("#infoModal");
  if (!modalEl) return;

  const titleEl = modalEl.querySelector(".modal-title");
  const bodyEl = modalEl.querySelector(".modal-body");

  if (titleEl) titleEl.textContent = `Kuva #${item.id}`;
  if (bodyEl) bodyEl.innerHTML = `
    <figure class="text-center">
      <img src="${escapeHtml(item.url)}" alt="Kuva #${item.id}"
           class="img-fluid rounded" decoding="async" style="max-height:70vh;object-fit:contain;" />
      <figcaption class="small text-muted mt-2">${escapeHtml(item.title)}</figcaption>
    </figure>
  `;

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}
