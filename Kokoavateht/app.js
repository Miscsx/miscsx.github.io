// Vuosi
document.getElementById('year').textContent = new Date().getFullYear();

/* Picsum ID -haku */
const picsumForm = document.getElementById('picsumForm');
const picsumId = document.getElementById('picsumId');
const picsumW = document.getElementById('picsumW');
const picsumH = document.getElementById('picsumH');

const picsumLoading = document.getElementById('picsumLoading');
const picsumError = document.getElementById('picsumError');
const picsumResult = document.getElementById('picsumResult');
const picsumImg = document.getElementById('picsumImg');
const picsumImgLink = document.getElementById('picsumImgLink');
const picsumJson = document.getElementById('picsumJson');

function show(el, on) {
  el.classList.toggle('d-none', !on);
}

function validNumber(value, min = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min;
}

async function fetchPicsumMeta(id) {
  const url = `https://picsum.photos/id/${id}/info`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function buildImageUrl(id, w = 200, h = 300) {
  const width = validNumber(w, 1) ? Number(w) : 200;
  const height = validNumber(h, 1) ? Number(h) : 300;
  return `https://picsum.photos/id/${id}/${width}/${height}`;
}

picsumForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validointi
  let ok = true;
  if (!validNumber(picsumId.value, 0)) {
    ok = false;
    picsumId.classList.add('is-invalid');
  } else {
    picsumId.classList.remove('is-invalid');
  }
  if (!ok) return;

  show(picsumLoading, true);
  show(picsumError, false);
  show(picsumResult, false);

  const id = String(picsumId.value).trim();
  const w = picsumW.value;
  const h = picsumH.value;

  try {
    // JSON-meta
    const meta = await fetchPicsumMeta(id);

    // kuva-URL syötetyllä koolla
    const imgUrl = buildImageUrl(id, w, h);

    // kuva keskellä, JSON alla
    picsumImg.src = imgUrl;
    picsumImg.alt = `Picsum-kuva ID: ${id}, tekijä: ${meta.author}`;
    picsumImg.width = Number(w) || 200;   // valinnainen
    picsumImg.height = Number(h) || 300;  // valinnainen

    picsumImgLink.href = imgUrl;
    picsumJson.textContent = JSON.stringify(meta, null, 2);

    show(picsumResult, true);
  } catch (err) {
    console.error(err);
    show(picsumError, true);
  } finally {
    show(picsumLoading, false);
  }
});

picsumForm.addEventListener('reset', () => {
  show(picsumError, false);
  show(picsumResult, false);
  picsumImg.src = '';
  picsumImg.removeAttribute('width');
  picsumImg.removeAttribute('height');
  picsumJson.textContent = '';
  picsumId.classList.remove('is-invalid');
});