// ─────────────────────────────────────────────────────────
// stock.js — recalculate stock from ledger (client-side mirror)
// Mirrors the GAS logic for use in availability checks
// ─────────────────────────────────────────────────────────

export function recalculateStockFromLedger(ledger) {
    const map = {};

    const ensure = (item) => {
        if (!map[item]) map[item] = { item, available: 0, reserved: 0 };
    };

    ledger.forEach(({ item, change, type }) => {
        ensure(item);
        const n = Number(change);
        const s = map[item];

        if (type === 'ADD' || type === 'CONVERT_IN') {
            s.available += n;
        } else if (type === 'CONVERT_OUT' || type === 'FINAL_CONSUME') {
            s.available -= Math.abs(n);
        } else if (type === 'CONSUME_RESERVED') {
            s.available -= Math.abs(n);
            s.reserved -= Math.abs(n);
        } else if (type === 'RESERVE') {
            s.reserved += Math.abs(n);
        } else if (type === 'RELEASE') {
            s.reserved -= Math.abs(n);
        }
    });

    return Object.values(map);
}

// Net available = available − reserved
export function netAvailable(stockRow) {
    return (stockRow?.available || 0) - (stockRow?.reserved || 0);
}

export function getStockItem(stock, item) {
    return stock.find((s) => s.item === item) || { item, available: 0, reserved: 0 };
}
