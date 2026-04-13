import { getStore } from '@netlify/blobs';
import fs from 'fs';
import path from 'path';

const INITIAL_DB = [
    { sku: 'UITRUSTING', title: 'Volledige uitrusting', price: 30, pos: 1 },
    { sku: 'FLES', title: 'Fles + vulling', price: 10, pos: 2 },
    { sku: 'AUTOMAAT', title: 'Ademautomaat', price: 10, pos: 3 },
    { sku: 'TRIMVEST', title: 'Trimvest', price: 10, pos: 4 },
    { sku: 'COMPUTER', title: 'Duikcomputer', price: 5, pos: 5 },
    { sku: 'DUIKPAK', title: 'Duikpak', price: 10, pos: 6 },
];

const LOCAL_FALLBACK_FILE = path.join(process.cwd(), '.local_items_db.json');

// Helper to determine if we can safely use Blobs
async function getItems() {
    try {
        const store = getStore('ieper-inventory');
        const data = await store.get('items', { type: 'json' });
        if (data && Array.isArray(data)) return data;
        
        // Seed initial data if blob is empty
        await store.setJSON('items', INITIAL_DB);
        return INITIAL_DB;
    } catch (error) {
        // Fallback for local testing without Netlify CLI
        if (fs.existsSync(LOCAL_FALLBACK_FILE)) {
            return JSON.parse(fs.readFileSync(LOCAL_FALLBACK_FILE, 'utf8'));
        }
        fs.writeFileSync(LOCAL_FALLBACK_FILE, JSON.stringify(INITIAL_DB));
        return INITIAL_DB;
    }
}

async function saveItems(itemsArray) {
    try {
        const store = getStore('ieper-inventory');
        await store.setJSON('items', itemsArray);
    } catch (error) {
        fs.writeFileSync(LOCAL_FALLBACK_FILE, JSON.stringify(itemsArray));
    }
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const items = await getItems();
        return res.status(200).json(items);
    }
    
    if (req.method === 'POST') {
        const { pin, items } = req.body;
        // Basic Security Lock
        if (pin !== '0208') {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid format' });
        }
        
        await saveItems(items);
        return res.status(200).json({ success: true, items });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
