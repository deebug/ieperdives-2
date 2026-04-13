import { useState, useEffect } from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
import { Save, Plus, Trash2, GripVertical, Lock, Home } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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
            newItems[index][field] = value === '' ? '' : Number(value);
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

    const onDragEnd = (result) => {
        if (!result.destination) return;
        if (result.source.index === result.destination.index) return;
        const newItems = [...items];
        const [moved] = newItems.splice(result.source.index, 1);
        newItems.splice(result.destination.index, 0, moved);
        // Herbereken posities lineair zodat opslaan klopt
        newItems.forEach((item, idx) => item.pos = idx + 1);
        setItems(newItems);
    };

    const handleAddNew = () => {
        const maxPos = items.length > 0 ? Math.max(...items.map(i => i.pos || 0)) : 0;
        setItems([...items, { 
            sku: 'NIEUW_' + Math.floor(Math.random()*1000), 
            title: '', 
            price: '', 
            pos: maxPos + 1 
        }]);
    };

    if (!isUnlocked) {
        return (
            <div className="app-shell" style={{justifyContent: 'center', alignItems: 'center'}}>
                <Head><title>Admin Login</title></Head>
                <NextLink href="/" style={{position: 'absolute', top: '24px', left: '24px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-glass)', color: 'var(--text-primary)', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10}}>
                    <Home size={24} />
                </NextLink>
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
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <NextLink href="/" style={{background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <Home size={20} />
                    </NextLink>
                    <div className="header-content" style={{gap: '4px'}}>
                        <h1 style={{fontSize: '20px'}}>Beheer</h1>
                        <p>Live Inventaris Aanpassen</p>
                    </div>
                </div>
                <button onClick={handleSave} disabled={isLoading} style={{background: statusText.includes('Opgeslagen') ? '#34c759' : (statusText.includes('Fout') ? '#ff3b30' : 'var(--accent)'), border: 'none', color: 'white', padding: '8px 16px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)', whiteSpace: 'nowrap'}}>
                    <Save size={16}/> {statusText || 'Save'}
                </button>
            </header>

            <main className="scrollable-content" style={{paddingBottom: '40px'}}>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="items">
                        {(provided) => (
                            <div className="items-list" {...provided.droppableProps} ref={provided.innerRef}>
                                {items.map((item, i) => (
                                    <Draggable key={item.sku} draggableId={item.sku} index={i}>
                                        {(provided, snapshot) => (
                                            <div 
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className="item-card" 
                                                style={{
                                                    flexDirection: 'column', alignItems: 'stretch', gap: '12px', padding: '16px',
                                                    background: snapshot.isDragging ? 'var(--bg-glass-heavy)' : 'var(--bg-surface)',
                                                    opacity: snapshot.isDragging ? 0.9 : 1,
                                                    boxShadow: snapshot.isDragging ? 'var(--shadow-glow)' : 'none',
                                                    ...provided.draggableProps.style,
                                                }}
                                            >
                                                
                                                <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                                                    <div {...provided.dragHandleProps} style={{background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px', flexShrink: 0}}><GripVertical size={16}/></div>
                                                    <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                                        <label style={{fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Naam</label>
                                                        <input className="clean-input" style={{fontSize: '18px', fontWeight: 'bold'}} placeholder="Nieuw Item" value={item.title} onChange={e => handleChange(i, 'title', e.target.value)} />
                                                    </div>
                                                    <button onClick={() => handleDelete(i)} style={{background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '8px'}}><Trash2 size={20}/></button>
                                                </div>

                                                <div style={{display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px'}}>
                                                    <div style={{flex: 1}}>
                                                        <label style={{fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px'}}>Positie (Volgorde)</label>
                                                        <input className="clean-input" type="number" inputMode="numeric" placeholder="1" onFocus={e => e.target.select()} value={item.pos} onChange={e => handleChange(i, 'pos', e.target.value)} style={{background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px'}}/>
                                                    </div>
                                                    <div style={{flex: 1}}>
                                                        <label style={{fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px'}}>Prijs (€)</label>
                                                        <input className="clean-input" type="number" inputMode="decimal" step="0.01" placeholder="0.00" onFocus={e => e.target.select()} value={item.price} onChange={e => handleChange(i, 'price', e.target.value)} style={{background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px'}}/>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <div style={{display: 'flex', justifyContent: 'center', marginTop: '24px'}}>
                    <button onClick={handleAddNew} style={{background: 'transparent', border: '1px dashed var(--border-glass)', color: 'var(--text-primary)', padding: '16px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', justifyContent: 'center'}}>
                        <Plus size={20}/> Voeg nieuw item toe
                    </button>
                </div>
            </main>
        </div>
    )
}
