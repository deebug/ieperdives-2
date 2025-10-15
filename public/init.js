// Init
bindQty();
recalc();
document.getElementById('btnGen').addEventListener('pointerdown', e => { e.preventDefault(); generate(); });
document.getElementById('btnCopy').addEventListener('pointerdown', e => { e.preventDefault(); copyPayload(); });
document.getElementById('btnSave').addEventListener('pointerdown', e => { e.preventDefault(); savePng(); });
document.getElementById('customLabel')?.addEventListener('input', recalc);
document.getElementById('customPrice')?.addEventListener('input', recalc);
document.getElementById('btnShareUrl').addEventListener('pointerdown', e => {
    e.preventDefault();
    shareQrUrl();
});
