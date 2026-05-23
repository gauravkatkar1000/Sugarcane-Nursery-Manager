// ─────────────────────────────────────────────────────────
// sheets.js — API layer for Google Apps Script Web App
// ─────────────────────────────────────────────────────────

const GAS_URL = import.meta.env.VITE_GAS_URL;

async function get(action, params = {}) {
    try {
        const url = new URL(GAS_URL);
        url.searchParams.set('action', action);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const res = await fetch(url.toString(), { redirect: 'follow' });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'GAS error');
        return json.data;
    } catch (e) {
        console.error('Fetch error:', e);
        throw new Error('Network or GAS error: ' + e.message);
    }
}

async function post(body) {
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            mode: 'cors', // Explicitly set mode
            redirect: 'follow', // Explicitly follow redirects
            headers: { 'Content-Type': 'text/plain' }, // Standard GAS trick
            body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'GAS error');
        return json.data;
    } catch (e) {
        console.error('Post error:', e);
        throw new Error('Network or GAS error: ' + e.message);
    }
}

// ── Orders ────────────────────────────────────────────────
export const getOrders = () => get('getOrders');

export const createOrder = (data) =>
    post({ action: 'createOrder', data });

export const updateOrder = (id, fields) =>
    post({ action: 'updateOrder', id, fields });

// ── Ledger ────────────────────────────────────────────────
export const getLedger = (reference_id) =>
    get('getLedger', reference_id ? { reference_id } : {});

/**
 * addLedgerEntries — atomic: writes all entries + recalcs stock in GAS.
 * Returns updated CurrentStock array.
 * @param {Array} entries — each entry must include { item, change, type, reference_id, note }
 */
export const addLedgerEntries = (entries) =>
    post({ action: 'addLedgerEntries', entries });

// ── Stock ─────────────────────────────────────────────────
export const getCurrentStock = () => get('getCurrentStock');

// ── Payments ──────────────────────────────────────
export const getPayments = (order_id) =>
    get('getPayments', order_id ? { order_id } : {});

export const addPayment = (data) =>
    post({ action: 'addPayment', data });

// ── Labour ────────────────────────────────────────────────
export const getWorkers = () => get('getWorkers');

export const addWorker = (data) =>
    post({ action: 'addWorker', data });

export const updateWorker = (id, fields) =>
    post({ action: 'updateWorker', id, fields });

export const saveAttendance = (date, records) =>
    post({ action: 'saveAttendance', date, records });
