import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { Minus, Plus, Share, Link, Download, Settings, Trash2, RefreshCw } from 'lucide-react';
import { ICONS } from '../lib/icons';



const IBAN = "BE73001942760860";
const BIC = "GEBABEBB";
const BENEF_NAME = "IEPER DIVES";
const MAX_REMIT = 140;

const eur = n => new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(n || 0);
const dot2 = n => ((n || 0)).toFixed(2);
const toAscii = s => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[×]/g, 'x').replace(/[—–]/g, '-').replace(/[^\w\s\/\-\+\:\.\,]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
const byteLen = s => new TextEncoder().encode(s).length;

function truncBytes(s, max) {
    let lo = 0, hi = s.length;
    while (lo < hi) { const mid = (lo + hi + 1 >> 1); byteLen(s.slice(0, mid)) <= max ? lo = mid : hi = mid - 1; }
    return s.slice(0, lo);
}

const useLongPress = (callback) => {
    const timerRef = useRef();
    const intervalRef = useRef();
    const cbRef = useRef(callback);
    useEffect(() => { cbRef.current = callback; }, [callback]);
    
    const start = useCallback((e) => {
        if(e) e.preventDefault();
        cbRef.current();
        timerRef.current = setTimeout(() => { intervalRef.current = setInterval(() => cbRef.current(), 70); }, 350);
    }, []);
    const end = useCallback(() => { clearTimeout(timerRef.current); clearInterval(intervalRef.current); }, []);
    return {
        onPointerDown: start,
        onPointerUp: end, onPointerLeave: end, onTouchEnd: end, onTouchCancel: end, onMouseUp: end, onMouseLeave: end
    };
};

function QtyButton({ onClick, children }) {
    const handlers = useLongPress(onClick);
    return <button className="qtybtn" {...handlers}>{children}</button>;
}

export default function Home() {
    const [dbItems, setDbItems] = useState([
        { sku: 'UITRUSTING', title: 'Volledige uitrusting', price: 30, pos: 1 },
        { sku: 'FLES', title: 'Fles + vulling', price: 10, pos: 2 },
        { sku: 'AUTOMAAT', title: 'Ademautomaat', price: 10, pos: 3 },
        { sku: 'TRIMVEST', title: 'Trimvest', price: 10, pos: 4 },
        { sku: 'COMPUTER', title: 'Duikcomputer', price: 5, pos: 5 },
        { sku: 'DUIKPAK', title: 'Duikpak', price: 10, pos: 6 },
    ]);
    
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullY, setPullY] = useState(0);
    const startY = useRef(0);

    const fetchItems = async () => {
        try {
            const res = await fetch('/api/items?t=' + Date.now(), { cache: 'no-store' });
            const data = await res.json();
            if (data && data.length) {
                setDbItems(data.sort((a,b) => (a.pos || 0) - (b.pos || 0)));
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchItems(); }, []);

    const handleTouchStart = (e) => {
        if (e.currentTarget.scrollTop <= 0) {
            startY.current = e.touches[0].clientY;
        } else {
            startY.current = 0;
        }
    };
    
    const handleTouchMove = (e) => {
        if (startY.current > 0) {
            const dy = e.touches[0].clientY - startY.current;
            if (dy > 0) {
                let resY = dy;
                if(dy > 80) resY = 80 + (dy - 80)*0.2; 
                setPullY(resY);
            } else {
                setPullY(0);
            }
        }
    };
    
    const handleTouchEnd = async () => {
        if (pullY > 60 && !isRefreshing) {
            setIsRefreshing(true);
            setPullY(60); 
            if(window.navigator?.vibrate) window.navigator.vibrate(10);
            await fetchItems();
            setTimeout(() => { setIsRefreshing(false); setPullY(0); }, 400);
        } else {
            setPullY(0);
        }
        startY.current = 0;
    };

    const [counts, setCounts] = useState({});
    const [customLabel, setCustomLabel] = useState("");
    const [customPrice, setCustomPrice] = useState("");
    const [customCount, setCustomCount] = useState(0);
    const [note, setNote] = useState("");
    const [showClearSheet, setShowClearSheet] = useState(false);
    const [showQrSheet, setShowQrSheet] = useState(false);
    const [showInstallSheet, setShowInstallSheet] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    
    const qrRef = useRef(null);

    const clearQuantities = () => {
        setCounts({});
        setCustomCount(0);
        setShowClearSheet(false);
        setShowQrSheet(false);
        if(window.navigator?.vibrate) window.navigator.vibrate(50);
    };

    const clearAll = () => {
        setCounts({});
        setCustomCount(0);
        setCustomLabel('');
        setCustomPrice('');
        setNote('');
        setShowClearSheet(false);
        setShowQrSheet(false);
        if(window.navigator?.vibrate) window.navigator.vibrate(50);
    };
    
    const hasDataToClear = Object.values(counts).some(c => c > 0) || customCount > 0 || customLabel || customPrice || note;

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(console.error);
        }
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!localStorage.getItem('pwa_declined')) {
               setShowInstallSheet(true);
            }
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const updateCount = useCallback((sku, delta) => {
        setCounts(prev => {
            const next = Math.max(0, Math.min(999, (prev[sku] || 0) + delta));
            if (window.navigator?.vibrate && next !== prev[sku]) window.navigator.vibrate(10);
            return { ...prev, [sku]: next };
        });
    }, []);

    const updateCustomCount = useCallback((delta) => {
        setCustomCount(prev => {
            const next = Math.max(0, Math.min(999, prev + delta));
            if (window.navigator?.vibrate && next !== prev) window.navigator.vibrate(10);
            return next;
        });
    }, []);

    // Hook moved to outer scope to prevent loop hook violation

    const cPriceVal = Math.max(0, parseFloat((customPrice||"0").replace(',','.')) || 0);

    const { total, remit, epc } = useMemo(() => {
        let t = 0;
        const parts = [];
        dbItems.forEach(item => {
            const q = counts[item.sku] || 0;
            if (q > 0) {
                t += q * item.price;
                parts.push(`${item.title.split('(')[0].trim()} x ${q}`);
            }
        });
        if (customCount > 0) {
            t += customCount * cPriceVal;
            parts.push(`${customLabel.trim() || 'EXTRA ITEM'} x ${customCount}`);
        }

        let r = parts.length ? parts.join(' / ') : 'GEEN SELECTIE';
        if (note.trim()) r += ` // ${note.trim()}`;
        
        let safeRemit = toAscii(r);
        if (byteLen(safeRemit) > MAX_REMIT) safeRemit = truncBytes(safeRemit, MAX_REMIT);

        const buildEpc = [
            'BCD', '001', '1', 'SCT',
            BIC, BENEF_NAME, IBAN,
            'EUR' + dot2(t), '', '', safeRemit, ''
        ].join('\n');

        return { total: t, remit: safeRemit, epc: buildEpc };
    }, [counts, customCount, customLabel, cPriceVal, note, dbItems]);

    // Share & Export Native
    const getQrBlob = async () => {
        if (!qrRef.current) return null;
        return new Promise(resolve => qrRef.current.toBlob(resolve, 'image/png'));
    };

    const handleShare = async () => {
        try {
            const blob = await getQrBlob();
            if (!blob) return;
            const file = new File([blob], 'betaal-qr.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Ieper Dives Betaal-QR', text: 'SEPA QR' });
            } else {
               // Fallback copy generic text URL
               const b64 = btoa(unescape(encodeURIComponent(epc))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '~');
               const url = window.location.origin + '/qr.html?p=' + b64;
               if (navigator.share) await navigator.share({title: 'Ieper Dives Betaal-QR', text: url});
               else {
                   await navigator.clipboard.writeText(url);
                   alert('Link gekopieerd!');
               }
            }
        } catch (e) { console.log(e); }
    };

    const installPWA = () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((c) => {
           if(c.outcome === 'accepted') setDeferredPrompt(null);
           setShowInstallSheet(false);
        });
    };

    return (
        <div className="app-shell">
            <Head><title>Ieper Dives POS</title></Head>
            
            <header className="glass-header">
                <div className="header-content">
                    <h1>Ieper Dives</h1>
                    <p>Quick Checkout</p>
                </div>
                <NextLink href="/admin" aria-label="Admin Dashboard" style={{ position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', padding: '8px', display: 'flex' }}>
                    <Settings size={22} />
                </NextLink>
            </header>

            <main 
                className="scrollable-content"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div style={{
                    height: `${isRefreshing ? 60 : pullY}px`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: (isRefreshing || pullY === 0) ? 'height 0.3s cubic-bezier(0.2, 0, 0, 1)' : 'none',
                    overflow: 'hidden'
                }}>
                    <RefreshCw size={24} color="var(--accent)" className={isRefreshing ? 'spin-anim' : ''} style={{ transform: `rotate(${pullY * 3}deg)`, opacity: isRefreshing ? 1 : Math.min(1, pullY / 50) }} />
                </div>
                <div className="items-list">
                    {dbItems.map(item => {
                        const q = counts[item.sku] || 0;
                        const IconComp = ICONS[item.icon] || ICONS['Box'];
                        const bg = item.bgColor || 'rgba(255,255,255,0.05)';
                        const fg = item.fgColor || 'var(--accent)';

                        return (
                            <div key={item.sku} className="item-card">
                                <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                                    <div style={{width: '40px', height: '40px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                                        <IconComp size={20} color={fg} />
                                    </div>
                                    <div className="item-info">
                                        <div className="item-title">{item.title}</div>
                                        <div className="item-price">€{dot2(item.price)} /st.</div>
                                    </div>
                                </div>
                                <div className="qtywrap">
                                    <QtyButton onClick={() => updateCount(item.sku, -1)}><Minus size={16} /></QtyButton>
                                    <span className="qtyval">{q}</span>
                                    <QtyButton onClick={() => updateCount(item.sku, 1)}><Plus size={16} /></QtyButton>
                                </div>
                            </div>
                        )
                    })}

                    <div className="item-card" style={{ gap: '12px' }}>
                        <div style={{width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                            <Plus size={20} color="var(--text-secondary)" />
                        </div>
                        <div className="item-info" style={{ flex: 1 }}>
                            <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} type="text" className="clean-input item-title" placeholder="Extra item" style={{ padding: 0 }} />
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                <span>€</span>
                                <input value={customPrice} onChange={e => setCustomPrice(e.target.value)} onFocus={e => e.target.select()} type="number" inputMode="decimal" step="0.01" min="0" className="clean-input" placeholder="0.00" style={{ width: '60px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, padding: 0, marginLeft: '2px' }} />
                                <span style={{ marginLeft: '4px' }}>/st.</span>
                            </div>
                        </div>
                        <div className="qtywrap">
                            <QtyButton onClick={() => updateCustomCount(-1)}><Minus size={16}/></QtyButton>
                            <span className="qtyval">{customCount}</span>
                            <QtyButton onClick={() => updateCustomCount(1)}><Plus size={16}/></QtyButton>
                        </div>
                    </div>

                </div>
                <div className="bottom-spacer" />
            </main>

            <footer className="bottom-bar glass-bottom" style={{ height: 'auto', flexDirection: 'column', alignItems: 'stretch', gap: '12px', paddingTop: '16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '0.5px solid var(--border-glass)' }}>
                    <div className="notes-header" style={{ marginBottom: '4px' }}>
                        <label style={{color: 'var(--text-secondary)'}}>Opmerking / Referentie</label>
                        <span className="char-count">{note.length}/50</span>
                    </div>
                    <textarea value={note} onChange={e => setNote(e.target.value.slice(0,50))} className="clean-textarea" rows="1" placeholder="Typ optioneel kort..." style={{minHeight: '24px'}}></textarea>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="total-wrap">
                        <span className="total-label">Subtotaal</span>
                        <span className="total-amount">{eur(total)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {hasDataToClear && (
                            <button onClick={() => { setShowClearSheet(true); if(window.navigator?.vibrate) window.navigator.vibrate(10); }} style={{background: 'rgba(255,255,255,0.08)', border: 'none', color: 'var(--text-secondary)', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}>
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button className="btn-primary" onClick={() => { setShowQrSheet(true); if(window.navigator?.vibrate) window.navigator.vibrate(50); }} disabled={total === 0} style={{ opacity: total === 0 ? 0.5 : 1 }}>
                            Betalen
                        </button>
                    </div>
                </div>
            </footer>

            {/* QR Code Bottom Sheet */}
            <div className={`sheet-overlay ${showQrSheet ? 'active' : ''}`} onClick={(e) => { if(e.target === e.currentTarget) setShowQrSheet(false) }}>
                <div className="bottom-sheet">
                    <div className="sheet-handle-wrap" onClick={() => setShowQrSheet(false)}><div className="sheet-handle"></div></div>
                    <h2 className="sheet-title">Laat klant scannen</h2>
                    <p className="sheet-subtitle">SEPA QR • {eur(total)}</p>
                    
                    <div className="qr-container">
                        <div className="qr-glow"></div>
                        <QRCodeCanvas value={epc} size={200} level="M" ref={qrRef} style={{ width: "100%", height: "100%", display: "block" }} />
                    </div>

                    <div className="sheet-actions">
                        <button className="btn-action" onClick={handleShare}><Share size={18} /> Delen</button>
                        <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={clearQuantities}>Klaar & Wis</button>
                    </div>
                </div>
            </div>

            {/* PWA Install Sheet */}
            <div className={`sheet-overlay ${showInstallSheet ? 'active' : ''}`} onClick={(e) => { if(e.target === e.currentTarget) setShowInstallSheet(false) }}>
                <div className="bottom-sheet">
                    <div className="sheet-handle-wrap" onClick={() => setShowInstallSheet(false)}><div className="sheet-handle"></div></div>
                    <div className="install-card">
                       <img src="/ieper_logo.png" className="install-icon" alt="icon"/>
                       <h2 className="sheet-title">Installeer Ieper Dives</h2>
                       <p className="sheet-subtitle">Plaats de app rechtstreeks op je startscherm voor offline toegang en een snellere opstart.</p>
                       <div className="sheet-actions" style={{width: '100%'}}>
                          <button className="btn-action" onClick={() => { setShowInstallSheet(false); localStorage.setItem('pwa_declined', '1'); }}>Nee bedankt</button>
                          <button className="btn-primary" style={{flex: 1, justifyContent: 'center'}} onClick={installPWA}><Download size={18}/> Installeer App</button>
                       </div>
                    </div>
                </div>
            </div>

            {/* Clear Action Sheet */}
            <div className={`sheet-overlay ${showClearSheet ? 'active' : ''}`} onClick={(e) => { if(e.target === e.currentTarget) setShowClearSheet(false) }}>
                <div className="bottom-sheet" style={{background: 'transparent', boxShadow: 'none', padding: '0 16px 32px'}}>
                    <div style={{background: 'var(--bg-surface)', borderRadius: '14px', marginBottom: '8px', overflow: 'hidden'}}>
                        <div style={{padding: '16px', textAlign: 'center', borderBottom: '0.5px solid var(--border-glass)', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500}}>
                            Wat wil je wissen?
                        </div>
                        <button onClick={clearQuantities} style={{width: '100%', padding: '16px', background: 'transparent', border: 'none', borderBottom: '0.5px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: '17px', cursor: 'pointer'}}>
                            Alleen aantallen
                        </button>
                        <button onClick={clearAll} style={{width: '100%', padding: '16px', background: 'transparent', border: 'none', color: '#ff3b30', fontSize: '17px', cursor: 'pointer', fontWeight: 500}}>
                            Wis alles
                        </button>
                    </div>
                    <button onClick={() => setShowClearSheet(false)} style={{width: '100%', padding: '16px', background: 'var(--bg-surface)', border: 'none', borderRadius: '14px', color: 'var(--accent)', fontSize: '17px', fontWeight: 600, cursor: 'pointer'}}>
                        Annuleer
                    </button>
                </div>
            </div>

        </div>
    );
}
