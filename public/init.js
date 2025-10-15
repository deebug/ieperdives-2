// Init
bindQty();
generate(); // in plaats van recalc(); meteen een QR tonen bij load

document.getElementById('btnGen').addEventListener('pointerdown', e => { e.preventDefault(); generate(); });
document.getElementById('btnCopy').addEventListener('pointerdown', e => { e.preventDefault(); copyPayload(); });
document.getElementById('btnSave').addEventListener('pointerdown', e => { e.preventDefault(); savePng(); });
document.getElementById('btnCopyLink').addEventListener('pointerdown', e => { e.preventDefault(); copyQrLink(); });

// live updates
const customLabel = document.getElementById('customLabel');
const customPrice = document.getElementById('customPrice');
const remitInput = document.getElementById('remit');

customLabel?.addEventListener('input', autoGen);
customPrice?.addEventListener('input', autoGen);

noteEl?.addEventListener('input', () => {
  if (noteCount) noteCount.textContent = (noteEl.value || '').length;
  autoGen();
});

// als iemand de mededeling manueel invult/wijzigt, direct meenemen in QR
remitInput?.addEventListener('input', autoGen);
