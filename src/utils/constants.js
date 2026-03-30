// ─────────────────────────────────────────────────────────
// constants.js — single source of truth for config values
// ─────────────────────────────────────────────────────────

export const CONVERSIONS = {
    SEEDLINGS_PER_TON: 10000,
    EXCESS_KG_PER_TON: 500,
    SEEDLINGS_PER_TRAY: 70,
    COCOPEAT_PER_TRAY: 2.5,
    TRAYS_PER_ACRE: 60,
};

export const ALL_ITEMS = [
    'raw_sugarcane',
    'seedlings',
    'ready_tray',
    'tray',
    'cocopeat',
    'excess_sugarcane',
];

export const ITEM_LABELS = {
    raw_sugarcane: 'Raw Sugarcane',
    seedlings: 'Seedlings',
    ready_tray: 'Ready Trays',
    tray: 'Empty Trays',
    cocopeat: 'Cocopeat',
    excess_sugarcane: 'Excess Sugarcane',
};

export const ITEM_UNITS = {
    raw_sugarcane: 'ton',
    seedlings: 'count',
    ready_tray: 'tray',
    tray: 'tray',
    cocopeat: 'kg',
    excess_sugarcane: 'kg',
};

export const LOW_STOCK_THRESHOLDS = {
    raw_sugarcane: 1,      // ton
    seedlings: 5000,   // count
    ready_tray: 50,     // trays
    tray: 100,    // trays
    cocopeat: 200,    // kg
    excess_sugarcane: 0,      // no alert
};

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARED', 'DELIVERED', 'CANCELLED'];

export const STATUS_COLORS = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
    CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
    PREPARED: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-400' },
    DELIVERED: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
};

// ─────────────────────────────────────────────────────────
// Ledger type enum — these are the ONLY valid types
// ─────────────────────────────────────────────────────────
export const LEDGER_TYPES = {
    ADD: 'ADD',              // Manual stock addition
    RESERVE: 'RESERVE',          // On order confirm
    RELEASE: 'RELEASE',          // Cancel confirmed order
    CONVERT_IN: 'CONVERT_IN',       // Output of conversion (seedlings/ready_tray gained)
    CONVERT_OUT: 'CONVERT_OUT',      // Input consumed in conversion (raw/tray/cocopeat used)
    CONSUME_RESERVED: 'CONSUME_RESERVED', // Materials consumed during prepare
    FINAL_CONSUME: 'FINAL_CONSUME',    // Delivery — ready_tray deducted
};

// Auto-generated note templates (mandatory in code, no UI input needed)
export const ledgerNote = {
    add: (item, qty, note) => `Manual ADD: ${qty} ${ITEM_UNITS[item] || ''} — ${note || 'stock addition'}`,
    reserve: (item, qty, orderId) => `RESERVE ${qty} ${ITEM_UNITS[item] || ''} for order ${orderId}`,
    release: (item, qty, orderId) => `RELEASE ${qty} ${ITEM_UNITS[item] || ''} for cancelled order ${orderId}`,
    convertIn: (item, qty, refId) => `CONVERT_IN: +${qty} ${ITEM_LABELS[item] || item} [ref: ${refId}]`,
    convertOut: (item, qty, refId) => `CONVERT_OUT: -${qty} ${ITEM_LABELS[item] || item} [ref: ${refId}]`,
    consume: (item, qty, orderId) => `CONSUME_RESERVED: -${qty} ${ITEM_UNITS[item] || ''} for prepare order ${orderId}`,
    deliver: (qty, orderId) => `FINAL_CONSUME: -${qty} ready_tray delivered for order ${orderId}`,
};
