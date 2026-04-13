import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Save, Plus, Trash2, GripVertical, Lock } from 'lucide-react';

export default function AdminDashboard() {
    const [pin, setPin] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [draggedIdx, setDraggedIdx] = useState(null);

    const loadItems = async () => {
        try {
            const res = await fetch('/api/items');
            if (res.ok) {
                const data = await res.json();
                // Sorteer op positie (pos)
                const sorted = data.sort((a,b) => (a.pos || 0) - (b.pos || 0));
                setItems(sorted);
            }
        } catch(e) { console.error('Failed to load items'); }
    };

    const handleUnlock = (e) => {
        e.preventDefault();
        if (pin === '0208') {
            setIsUnlocked(true);
            loadItems();
        } else {
            setStatusText('Foute PIN');
            setTimeout(() => setStatusText(''), 2000);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        setStatusText('Opslaan...');
        try {
            const sortedToSave = [...items].sort((a,b) => (a.pos || 0) - (b.pos || 0));
            const res = await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin, items: sortedToSave })
            });
            if (res.ok) {
                setStatusText('Opgeslagen! ✓');
                setItems(sortedToSave);
            } else {
                setStatusText('Fout bij opslaan.');
            }
        } catch(e) {
            setStatusText('Netwerk fout.');
        }
        setIsLoading(false);
        setTimeout(() => setStatusText(''), 3000);
    };

    const handleChange = (index, field, value) => {
        const newItems = [...items];
        if (field === 'price' || field === 'pos') {
            newItems[index][field] = Number(value);
        } else {
            newItems[index][field] = value;
        }
        setItems(newItems);
    };

    const handleDelete = (index) => {
        if(confirm('Zeker dat je dit item wilt verwijderen?')) {
            const newItems = [...items];
            newItems.splice(index, 1);
            setItems(newItems);
        }
    };

    const handleDrop = (dropIndex) => {
        if (draggedIdx === null || draggedIdx === dropIndex) return;
        const newItems = [...items];
        const [moved] = newItems.splice(draggedIdx, 1);
        newItems.splice(dropIndex, 0, moved);
        // Herbereken posities lineair zodat opslaan klopt
        newItems.forEach((item, idx) => item.pos = idx + 1);
        setItems(newItems);
    };

    const handleAddNew = () => {
        const maxPos = items.length > 0 ? Math.max(...items.map(i => i.pos || 0)) : 0;
        setItems([...items, { 
            sku: 'NIEUW_' + Math.floor(Math.random()*1000), 
            title: 'Nieuw Item', 
            price: 10, 
            pos: maxPos + 1 
        }]);
    };

    if (!isUnlocked) {
        return (
            <div className="app-shell" style={{justifyContent: 'center', alignItems: 'center'}}>
                <Head><title>Admin Login</title></Head>
                <div className="item-card" style={{flexDirection: 'column', padding: '32px', width: '300px', gap: '24px'}}>
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'}}>
                        <Lock size={32} color="var(--accent)"/>
                        <h2 className="sheet-title">Admin Toegang</h2>
                    </div>
                    <form onSubmit={handleUnlock} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                        <input 
                            type="password" 
                            inputMode="numeric"
                            value={pin} onChange={e => setPin(e.target.value)} 
                            placeholder="PIN code"
                            style={{background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '20px', textAlign: 'center', letterSpacing: '4px'}}
                            autoFocus
                        />
                        <button className="btn-primary" style={{justifyContent: 'center'}}>Ontgrendel</button>
                    </form>
                    {statusText && <div style={{color: 'var(--danger)', textAlign: 'center'}}>{statusText}</div>}
                </div>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <Head><title>Database Admin</title></Head>
            <header className="glass-header" style={{justifyContent: 'space-between', alignItems: 'center'}}>
                <div className="header-content" style={{gap: '4px'}}>
                    <h1 style={{fontSize: '20px'}}>Database Beheer</h1>
                    <p>Live Inventaris Aanpassen</p>
                </div>
                <button onClick={handleSave} disabled={isLoading} style={{background: 'var(--accent)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer'}}>
                    <Save size={16}/> Save
                </button>
            </header>

            <main className="scrollable-content" style={{paddingBottom: '40px'}}>
                {statusText && <div style={{background: 'rgba(10, 132, 255, 0.2)', padding: '12px', borderRadius: '8px', textAlign: 'center', marginBottom: '16px', fontWeight: 'bold'}}>{statusText}</div>}
                
                <div className="items-list">
                    {items.map((item, i) => (
                        <div 
                            key={item.sku} 
                            className="item-card" 
                            draggable
                            onDragStart={(e) => { setDraggedIdx(i); e.dataTransfer.effectAllowed = 'move'; }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(i)}
                            onDragEnd={() => setDraggedIdx(null)}
                            style={{
                                flexDirection: 'column', alignItems: 'stretch', gap: '12px', padding: '16px',
                                opacity: draggedIdx === i ? 0.5 : 1,
                                cursor: 'move'
                            }}
                        >
                            
                            <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                                <div style={{background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px', flexShrink: 0}}><GripVertical size={16}/></div>
                                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <label style={{fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Naam</label>
                                    <input className="clean-input" style={{fontSize: '18px', fontWeight: 'bold'}} value={item.title} onChange={e => handleChange(i, 'title', e.target.value)} />
                                </div>
                                <button onClick={() => handleDelete(i)} style={{background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '8px'}}><Trash2 size={20}/></button>
                            </div>

                            <div style={{display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px'}}>
                                <div style={{flex: 1}}>
                                    <label style={{fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px'}}>Positie (Volgorde)</label>
                                    <input className="clean-input" type="number" value={item.pos} onChange={e => handleChange(i, 'pos', e.target.value)} style={{background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px'}}/>
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={{fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px'}}>Prijs (€)</label>
                                    <input className="clean-input" type="number" step="0.01" value={item.price} onChange={e => handleChange(i, 'price', e.target.value)} style={{background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px'}}/>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{display: 'flex', justifyContent: 'center', marginTop: '24px'}}>
                    <button onClick={handleAddNew} style={{background: 'transparent', border: '1px dashed var(--border-glass)', color: 'var(--text-primary)', padding: '16px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', justifyContent: 'center'}}>
                        <Plus size={20}/> Voeg nieuw item toe
                    </button>
                </div>
            </main>
        </div>
    )
}
