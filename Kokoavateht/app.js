
"use strict";

/**
 * Taekwondo harrastesivun JavaScript
 * - Ensisijainen JSON: https://jsonplaceholder.typicode.com/albums/1/photos
 * - Fallback: paikallinen data.json (Picsum-kuvat)
 * - Näyttää 6 kuvaa korteissa (oikea <img>, ei URL-tekstinä)
 * - Bootstrap: spinner, toast, modal, grid
 * - Haku suodattaa otsikon perusteella (debounce)
 */

const PRIMARY_API = "https://jsonplaceholder.typicode.com/albums/1/photos";
const FALLBACK_API = "data.json";        // paikallinen varadata
const GRID_COUNT   = 6;                  // korttien määrä

/* ---------- Apurit ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function debounce(fn, delay = 250) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function setLoading(show) { $("#loader")?.classList.toggle("d-none", !show); }

function setError(message) {
  const alertEl = $("#errorAlert");
  if (!alertEl) return;
  if (!message) { alertEl.classList.add("d-none"); alertEl.textContent = ""; }
  else { alertEl.classList.remove("d-none"); alertEl.textContent = message; }
}

function escapeText(str) {
  // Vain tekstille (otsikot, figcaption), ei HTML:ää
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- Globaalit ---------- */
let allItems = [];
let toast;

/* ---------- Alustus ---------- */
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
  const form = document.querySelector("form");
  if (form) {
    form.addEventListener("submit", (e) => {
      if (!form.checkValidity()) { e.preventDefault(); e.stopPropagation(); }
      form.classList.add("was-validated");
    });
  }

  // Tapahtumat
  $("#refreshBtn")?.addEventListener("click", fetchWithFallback);
  const searchInput = $("#searchInput");
  searchInput?.addEventListener("input", debounce(() => {
    const q = (searchInput.value || "").trim().toLowerCase();
    const filtered = allItems.filter(x => (x.title || "").toLowerCase().includes(q));
    renderCards(filtered);
  }, 200));

  // Ensimmäinen haku
  fetchWithFallback();
});

/* ---------- Haku: ensisijainen → fallback ---------- */
async function fetchWithFallback() {
  setLoading(true);
  setError("");
  $("#emptyState")?.classList.add("d-none");

  try {
    // Yritä ensisijaista APIa
    const primary = await tryFetch(PRIMARY_API);
    if (primary.ok) {
      const data = await primary.json();
      allItems = normalizeArray(data).slice(0, GRID_COUNT);
    } else {
      // Fallback paikalliseen
      const fallback = await tryFetch(FALLBACK_API);
      if (!fallback.ok) throw new Error("Ei voitu hakea dataa (primary + fallback epäonnistuivat).");
      const data = await fallback.json();
      allItems = normalizeArray(data).slice(0, GRID_COUNT);
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
  try { return await fetch(url, { method: "GET" }); }
  catch { return { ok: false, status: 0, json: async () => ([]) }; }
}

// Normalisoi taulukko: {id, title, url, thumbnailUrl}
function normalizeArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x, i) => ({
    id: Number(x.id ?? i + 1),
    title: String(x.title ?? `Kuva #${x.id ?? i + 1}`),
    url: String(x.url ?? x.thumbnailUrl ?? ""),
    thumbnailUrl: String(x.thumbnailUrl ?? x.url ?? "")
  }));
}

/* ---------- Renderöinti ---------- */
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
    const col   = document.createElement("div");
    col.className = "col-12 col-sm-6 col-lg-4";

    // Korttirunko
    const card = document.createElement("div");
    card.className = "card h-100 shadow-sm card-hover";
    card.setAttribute("aria-label", "Kuvakortti");

    // Kuvakehys (ratio 4:3)
    const ratio = document.createElement("div");
    ratio.className = "ratio ratio-4x3";

    // *** TÄRKEÄ KOHTA: LUODAAN OIKEA <img> TAGI ***
    const img = document.createElement("img");
    img.src = item.thumbnailUrl;          // pikkukuva
    img.alt = `Pikkukuva #${item.id}`;
    img.loading = "lazy";
    img.decoding = "async";
    img.style.objectFit = "cover";
    img.style.width = "100%";
    img.style.height = "100%";
    ratio.appendChild(img);

    // Sisältö
    const body = document.createElement("div");
    body.className = "card-body d-flex flex-column";

    const h3 = document.createElement("h3");
    h3.className = "h6 card-title";
    h3.textContent = escapeText(item.title);

    const actions = document.createElement("div");
    actions.className = "mt-auto d-flex justify-content-between align-items-center";

    const badge = document.createElement("span");
    badge.className = "badge text-bg-light";
    badge.textContent = `#${item.id}`;

    const btn = document.createElement("button");
    btn.className = "btn btn-outline-primary btn-sm";
    btn.textContent = "Avaa";
    btn.setAttribute("data-id", String(item.id));
    btn.addEventListener("click", () => openDetailModal(item));

    actions.appendChild(badge);
    actions.appendChild(btn);

    body.appendChild(h3);
    body.appendChild(actions);

    // Koosta kortti
    card.appendChild(ratio);
    card.appendChild(body);
    col.appendChild(card);
    frag.appendChild(col);
  });

  gridEl.appendChild(frag);
}

/* ---------- Modal ---------- */
function openDetailModal(item) {
  const modalEl = document.getElementById("infoModal");
  if (!modalEl) return;

  // Otsikko
  const titleEl = modalEl.querySelector(".modal-title");
  if (titleEl) titleEl.textContent = `Kuva #${item.id}`;

  // *** OIKEA <img> ISOA KUVARUUTUA VARTEN ***
  const bodyEl  = modalEl.querySelector(".modal-body");
  if (bodyEl) {
    // Tyhjennä ja luo DOM-solmut käsin
    bodyEl.innerHTML = "";
    const fig = document.createElement("figure");
    fig.className = "text-center";

    const big = document.createElement("img");
    big.src = item.url;                   // isompi kuva
    big.alt = `Kuva #${item.id}`;
    big.className = "img-fluid rounded";
    big.decoding = "async";
    big.style.maxHeight = "70vh";
    big.style.objectFit = "contain";

    const cap = document.createElement("figcaption");
    cap.className = "small text-muted mt-2";
    cap.textContent = escapeText(item.title);

    fig.appendChild(big);
    fig.appendChild(cap);
    bodyEl.appendChild(fig);
  }

  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}
