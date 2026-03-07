"use strict";

/**
 * Taekwondo harrastesivun JavaScript
 * - Ensisijainen JSON: https://jsonplaceholder.typicode.com/albums/1/photos
 * - Fallback: paikallinen data.json (Picsum-kuvat)
 * - Näyttää 6 kuvaa korteissa
 * - Bootstrap: spinner, toast, modal, grid
 * - Haku suodattaa otsikon perusteella (debounce)
 */

const PRIMARY_API = "https://jsonplaceholder.typicode.com/albums/1/photos";
const FALLBACK_API = "data.json";        // paikallinen varadata
const GRID_COUNT = 6;                     // korttien määrä

// Pikaselektorit
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
  $("#loader")?.classList.toggle("d-none", !show);
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

let allItems = [];
let toast;

document.addEventListener("DOMContentLoaded", () => {
  // Vuosi footerissa
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Bootstrap Toast
  const toastEl = $("#mainToast");
  if (toastEl && window.bootstrap?.Toast) {
    toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2400 });
  }

  // Lomakevalidointi
  (function initFormValidation(){
    const form = document.querySelector("form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      }
      form.classList.add("was-validated");
    });
  })();

  // Tapahtumat
  $("#refreshBtn")?.addEventListener("click", fetchWithFallback);

  const searchInput = $("#searchInput");
  searchInput?.addEventListener("input", debounce(() => {
    const q = (searchInput.value || "").trim().toLowerCase();
    const filtered = allItems.filter(x => x.title.toLowerCase().includes(q));
    renderCards(filtered);
  }, 200));

  // Ensimmäinen haku
  fetchWithFallback();
});

/** Hae ensisijainen → fallback */
async function fetchWithFallback() {
  setLoading(true);
  setError("");
  $("#emptyState")?.classList.add("d-none");

  try {
    // 1) kokeile ensisijaista APIa
    const primary = await tryFetch(PRIMARY_API);
    if (primary.ok) {
      const data = await primary.json();
      allItems = normalizePrimary(data).slice(0, GRID_COUNT);
    } else {
      // 2) fallback paikalliseen dataan
      const fallback = await tryFetch(FALLBACK_API);
      if (!fallback.ok) throw new Error("Ei voitu hakea dataa (primary + fallback epäonnistuivat).");
      const data = await fallback.json();
      allItems = normalizeFallback(data).slice(0, GRID_COUNT);
    }

    renderCards(allItems);
    toast?.show();
  } catch (err) {
    console.error(err);
    setError("Kuvien lataus epäonnistui. (Tarkista verkkoyhteys tai käytä paikallista dataa.)");
  } finally {
    setLoading(false);
  }
}

async function tryFetch(url) {
  try {
    return await fetch(url, { method: "GET" });
  } catch (e) {
    return { ok: false, status: 0, json: async () => ([]) };
  }
}

// Sovitetaan ulkoisen API:n rakenne omaan käyttöön
function normalizePrimary(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(x => ({
    id: x.id,
    title: String(x.title ?? `Kuva #${x.id}`),
    url: String(x.url),
    thumbnailUrl: String(x.thumbnailUrl)
  }));
}

// Sovitetaan paikallisen fallback-datan rakenne (data.json)
function normalizeFallback(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(x => ({
    id: x.id,
    title: String(x.title ?? `Kuva #${x.id}`),
    url: String(x.url),
    thumbnailUrl: String(x.thumbnailUrl)
  }));
}

/* ==========
   RENDERÖINTI
=========== */
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

    // Ratio 4:3 ja cover → siistit, yhtenäiset thumbit
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

function openDetailModal(item) {
  const modalEl = "#infoModal";
  const modal = bootstrap.Modal.getOrCreateInstance(document.querySelector(modalEl));
  const modalRoot = document.querySelector(modalEl);
  modalRoot.querySelector(".modal-title").textContent = `Kuva #${item.id}`;
  modalRoot.querySelector(".modal-body").innerHTML = `
    <figure class="text-center">
      <img src="${escapeHtml(item.url)}" alt="Kuva #${item.id}"
           class="img-fluid rounded" decoding="async" style="max-height:70vh;object-fit:contain;" />
      <figcaption class="small text-muted mt-2">${escapeHtml(item.title)}</figcaption>
    </figure>
  `;
  modal.show();
}