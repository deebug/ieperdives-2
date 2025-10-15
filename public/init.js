// Init
bindQty();
recalc();
document.getElementById('btnGen').addEventListener('pointerdown', e => { e.preventDefault(); generate(); });
document.getElementById('btnCopy').addEventListener('pointerdown', e => { e.preventDefault(); copyPayload(); });
document.getElementById('btnSave').addEventListener('pointerdown', e => { e.preventDefault(); savePng(); });
document.getElementById('btnCopyLink').addEventListener('pointerdown', e => {
  e.preventDefault();
  copyQrLink();
});
const customLabel = document.getElementById('customLabel');
const customPrice = document.getElementById('customPrice');

selectAllOnFocus(customLabel);
selectAllOnFocus(customPrice);

// Live herberekenen als gebruiker typt
customLabel?.addEventListener('input', () => { recalc(); });
customPrice?.addEventListener('input', () => { recalc(); });
