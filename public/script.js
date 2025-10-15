// ---------- Helpers ----------
const eur = n => new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(isFinite(n) ? n : 0);
const dot2 = n => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v || 0));

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
    document.getElementById('remit').placeholder = buildRemit(true);
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
            recalc();
        };

        let hold = null, rep = null;
        const start = (d) => { step(d); hold = setTimeout(() => rep = setInterval(() => step(d), 70), 350); };
        const end = () => { clearTimeout(hold); clearInterval(rep); hold = rep = null; };

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
    const note = (document.getElementById('note').value || '').trim();
    let txt = (parts.length ? parts.join(' / ') : 'GEEN SELECTIE');
    if (note) txt += ` // ${note}`;

    txt = toAscii(txt);
    if (byteLen(txt) > MAX_REMIT_BYTES) txt = truncBytes(txt, MAX_REMIT_BYTES);

    if (asPlaceholder) return txt;
    const manual = (document.getElementById('remit').value || '').trim();
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
    new QRCode(box, { text, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.L });
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

// ---------- Opmerkingen teller ----------
const note = document.getElementById('note');
const noteCount = document.getElementById('noteCount');
note.addEventListener('input', () => {
    noteCount.textContent = (note.value || '').length;
    // update placeholder mededeling live
    document.getElementById('remit').placeholder = buildRemit(true);
});

function getQrDataUrl() {
    // qrcode.js rendert canvas of img; pak wat er is
    const c = document.querySelector('#qrcode canvas');
    if (c) return c.toDataURL('image/png');
    const img = document.querySelector('#qrcode img');
    if (img && img.src.startsWith('data:')) return img.src;
    return null;
}

async function shareQrUrl() {
    const payload = document.getElementById('payload').value;
    if (!payload) { alert('Genereer eerst de QR.'); return; }
    const url = buildQrShareUrl(payload, { size: 512, ec: 'L' });

    if (navigator.share) {
        try {
            await navigator.share({ title: 'Ieper Dives Betaal-QR', url });
            return;
        } catch { /* user cancel of niet beschikbaar → fallback */ }
    }
    // Fallback: open WhatsApp met link
    const wa = `https://wa.me/?text=${encodeURIComponent(url)}`;
    window.open(wa, '_blank');
}


// --- b64url helpers voor URL-compacte payload ---
function str_to_b64u(str) {
    // UTF-8 safe base64 → base64url
    const b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '~'); // ~ als padding-marker
}

function buildQrShareUrl(payload, { size = 512, ec = 'L' } = {}) {
    const p = str_to_b64u(payload);
    // Bouw absolute URL naar qr.html in dezelfde root
    const base = new URL(location.href);
    const qrUrl = new URL('qr.html', base); // werkt ook als index.html op / staat
    qrUrl.searchParams.set('p', p);
    qrUrl.searchParams.set('s', String(size));
    qrUrl.searchParams.set('e', ec);
    return qrUrl.toString();
}
