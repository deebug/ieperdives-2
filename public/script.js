// ---------- Helpers ----------
const eur = n => new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(isFinite(n) ? n : 0);
const dot2 = n => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v || 0));
// --- debounce om overmatig hertekenen te voorkomen tijdens ingedrukt houden
function debounce(fn, delay = 120) {
  let t; 
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
// Call dit om QR te bouwen na elke wijziging
const autoGen = debounce(() => generate(), 120);



// UTF-8 byte tools (compact)
const enc = new TextEncoder(), dec = new TextDecoder();
const byteLen = s => enc.encode(s).length;
function truncBytes(s, max) {
    let lo = 0, hi = s.length;
    while (lo < hi) { const mid = (lo + hi + 1 >> 1); byteLen(s.slice(0, mid)) <= max ? lo = mid : hi = mid - 1; }
    return s.slice(0, lo);
}
const toAscii = s => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[×]/g, 'x').replace(/[—–]/g, '-').replace(/[^\w\s\/\-\+\:\.\,]/g, '')
    .replace(/\s+/g, ' ').trim().toUpperCase();

// ---------- Lees rijen ----------
const rows = [...document.querySelectorAll('.qtywrap')].map(wrap => {
    const sku = wrap.dataset.sku;
    const isCustom = wrap.dataset.custom === '1';
    const qtyEl = wrap.querySelector('.qtyval');
    const lineEl = document.querySelector(`[data-line="${sku}"]`);

    let getLabel, getPrice;

    if (isCustom) {
        const labelInput = document.getElementById('customLabel');
        const priceInput = document.getElementById('customPrice');
        getLabel = () => (labelInput?.value || 'CUSTOM').trim();
        getPrice = () => {
            const v = (priceInput?.value || '').toString().replace(',', '.');
            const n = parseFloat(v);
            return Number.isFinite(n) ? n : 0;
        };
    } else {
        const priceEl = wrap.previousElementSibling;             // .price
        const labelEl = priceEl?.previousElementSibling;         // artikel-naam (div)
        const fixedLabel = (labelEl?.textContent || '').trim();
        const fixedPrice = parseFloat(priceEl?.dataset?.price || (priceEl?.textContent || '0').replace(',', '.')) || 0;
        getLabel = () => fixedLabel;
        getPrice = () => fixedPrice;
    }

    return { sku, isCustom, getLabel, getPrice, qtyEl, lineEl, wrap };
});

// ---------- Totals ----------
function recalc() {
    let total = 0;
    for (const r of rows) {
        const qty = clamp(parseInt(r.qtyEl.textContent, 10) || 0, 0, 999);
        const price = r.getPrice();
        const line = qty * price;
        total += line;
        r.lineEl.textContent = line > 0 ? dot2(line).replace('.', ',') : '0,00';
    }
    document.getElementById('total').textContent = eur(total);
    const remitEl = document.getElementById('remit');
    if (remitEl) remitEl.value = buildRemit(true); // toon actuele auto-mededeling
    return total;
}

// ---------- Qty knoppen (pointer-only, geen double clicks) ----------
function bindQty() {
    rows.forEach(r => {
        const dec = r.wrap.querySelector('[data-action="dec"]');
        const inc = r.wrap.querySelector('[data-action="inc"]');

        const step = d => {
            const cur = parseInt(r.qtyEl.textContent, 10) || 0;
            r.qtyEl.textContent = clamp(cur + d, 0, 999);
            autoGen();
        };

        let hold = null, rep = null;
        const start = (d) => { 
          step(d); 
          hold = setTimeout(() => rep = setInterval(() => step(d), 70), 350); 
        };
        const end = () => { 
          clearTimeout(hold); clearInterval(rep); hold = rep = null; 
          autoGen(); // laatste update na loslaten
        };

        dec.addEventListener('pointerdown', e => { e.preventDefault(); start(-1); });
        inc.addEventListener('pointerdown', e => { e.preventDefault(); start(+1); });
        ['pointerup', 'pointerleave', 'touchend', 'touchcancel', 'mouseup', 'mouseleave']
            .forEach(evt => {
                dec.addEventListener(evt, end);
                inc.addEventListener(evt, end);
            });
    });
}

// ---------- Remittance & Payload ----------
const MAX_REMIT_BYTES = 140;

function buildRemit(asPlaceholder = false) {
    const parts = rows.map(r => {
        const q = parseInt(r.qtyEl.textContent, 10) || 0;
        if (!q) return null;
        const base = r.getLabel().split('(')[0].trim();
        return `${base} x ${q}`;
    }).filter(Boolean);

    // Voeg optionele opmerkingen toe (maar respecteer limiet)
    let txt = (parts.length ? parts.join(' / ') : 'GEEN SELECTIE');
    const noteText = (noteEl?.value || '').trim();
    if (noteText) txt += ` // ${noteText}`;

    txt = toAscii(txt);
    if (byteLen(txt) > MAX_REMIT_BYTES) txt = truncBytes(txt, MAX_REMIT_BYTES);

    if (asPlaceholder) return txt;
    const remitEl = document.getElementById('remit');
    const manual = (remitEl && !remitEl.readOnly && !remitEl.hasAttribute('readonly'))
      ? (remitEl.value || '').trim()
      : '';
    const chosen = manual ? toAscii(manual) : txt;
    return byteLen(chosen) > MAX_REMIT_BYTES ? truncBytes(chosen, MAX_REMIT_BYTES) : chosen;
}

function buildEpc({ name, iban, bic, amount, remit }) {
    return [
        'BCD', '001', '1', 'SCT',
        (bic || '').toUpperCase().trim(),
        toAscii((name || '').slice(0, 70)),
        (iban || '').replace(/\s+/g, '').toUpperCase(),
        'EUR' + dot2(amount || 0),
        '',
        '',
        remit,
        ''
    ].join('\n');
}

function renderQR(text) {
    const box = document.getElementById('qrcode');
    box.innerHTML = '';
    new QRCode(box, { text, width: 512, height: 512, correctLevel: QRCode.CorrectLevel.L });
}

// ---------- Actions ----------
function generate() {
    const total = recalc();
    const remit = buildRemit(false);
    const epc = buildEpc({
        name: document.getElementById('benefName').value,
        iban: document.getElementById('iban').value,
        bic: document.getElementById('bic').value,
        amount: total,
        remit
    });
    document.getElementById('payload').value = epc;
    renderQR(epc);
}

function copyPayload() {
    const txt = document.getElementById('payload').value;
    if (!txt) return alert('Geen payload om te kopiëren. Genereer eerst de QR.');
    navigator.clipboard.writeText(txt).then(() => alert('Gekopieerd!')).catch(() => alert('Kopiëren mislukt.'));
}

function savePng() {
    const c = document.querySelector('#qrcode canvas');
    const img = document.querySelector('#qrcode img');
    if (c) { const a = document.createElement('a'); a.download = 'betaal-qr.png'; a.href = c.toDataURL('image/png'); a.click(); }
    else if (img) { const a = document.createElement('a'); a.download = 'betaal-qr.png'; a.href = img.src; a.click(); }
    else alert('Genereer eerst de QR.');
}

// ---------- Opmerkingen ----------
const noteEl = document.getElementById('note');
const noteCount = document.getElementById('noteCount');

noteEl?.addEventListener('input', () => {
  if (noteCount) noteCount.textContent = (noteEl.value || '').length;
  autoGen(); // QR+payload live vernieuwen
});

function getQrDataUrl() {
    // qrcode.js rendert canvas of img; pak wat er is
    const c = document.querySelector('#qrcode canvas');
    if (c) return c.toDataURL('image/png');
    const img = document.querySelector('#qrcode img');
    if (img && img.src.startsWith('data:')) return img.src;
    return null;
}

// snellere copy helper (HTTPS/localhost: Clipboard API; anders fallback)
async function copyTextFast(text) {
  // moderne weg (vereist secure context + user gesture)
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  // fallback: hidden textarea + execCommand
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  document.body.removeChild(ta);
  return ok;
}


// --- b64url helpers voor URL-compacte payload ---
function str_to_b64u(str) {
    // UTF-8 safe base64 → base64url
    const b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '~'); // ~ als padding-marker
}

function buildQrShareUrl(payload, { size = 512, ec = 'L' } = {}) {
    const p = str_to_b64u(payload);
    const base = new URL(location.href);
    const qrUrl = new URL('qr.html', base);
    qrUrl.searchParams.set('p', p);
    qrUrl.searchParams.set('s', String(size));
    qrUrl.searchParams.set('e', ec);
    return qrUrl.toString();
}

// vervang deze functie
async function copyQrLink() {
  const payload = document.getElementById('payload').value;
  if (!payload) { alert('Genereer eerst de QR.'); return; }

  const url = buildQrShareUrl(payload);
  const btn = document.getElementById('btnCopyLink');

  try {
    const ok = await copyTextFast(url);
    if (!ok) throw new Error('copy failed');
    // kleine visuele bevestiging
    if (btn) {
      const old = btn.textContent;
      btn.textContent = 'Link gekopieerd ✓';
      setTimeout(() => (btn.textContent = old), 1200);
    } else {
      // fallback bevestiging
      alert('Link gekopieerd!');
    }
  } catch {
    // als echt niets lukt (zeer zeldzaam), toon dan nog één keer de link
    alert('Kon de link niet automatisch kopiëren.\n\nLink:\n' + url);
  }
}
function selectAllOnFocus(el) {
    if (!el) return;
    el.addEventListener('focus', () => {
        // alleen selecteren als er wat staat
        if (el.value && el.value.length) {
            // kleine delay voorkomt dat 'focus' meteen ongedaan gemaakt wordt door 'mouseup' op iOS
            setTimeout(() => el.select(), 0);
        }
    });
    // voorkom dat mouseup de selectie meteen weer verwijdert
    el.addEventListener('mouseup', (e) => e.preventDefault());
}
