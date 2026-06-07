// ─────────────────────────────────────────────────────────
// orderFlow.js — ledger entry builders, registry pattern
//
// Adding a new order type = one new entry in HANDLERS.
// Public API (buildConfirmPlan etc.) never branches on type.
// ─────────────────────────────────────────────────────────
import { CONVERSIONS, LEDGER_TYPES, ledgerNote } from './constants';
import { getStockItem, netAvailable } from './stock';

// ═════════════════════════════════════════════════════════
// SEEDLING handlers
// ═════════════════════════════════════════════════════════

function seedlingConfirm(order, stock) {
    const { trays_required, id } = order;
    const avail = (item) => netAvailable(getStockItem(stock, item));

    let traysToFill = trays_required;
    const entries = [];
    const breakdown = { ready_tray: 0, seedlings: 0, tray: 0, cocopeat: 0 };

    const readyUse = Math.min(avail('ready_tray'), traysToFill);
    if (readyUse > 0) {
        entries.push({ item: 'ready_tray', change: -readyUse, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('ready_tray', readyUse, id) });
        breakdown.ready_tray = readyUse;
        traysToFill -= readyUse;
    }

    if (traysToFill > 0) {
        const seedNeeded = traysToFill * CONVERSIONS.SEEDLINGS_PER_TRAY;
        const trayNeeded = traysToFill;
        const cocoNeeded = traysToFill * CONVERSIONS.COCOPEAT_PER_TRAY;

        const seedHave = avail('seedlings');
        const trayHave = avail('tray');
        const cocoHave = avail('cocopeat');

        const seedDeficit = Math.max(0, seedNeeded - seedHave);
        const trayDeficit = Math.max(0, trayNeeded - trayHave);
        const cocoDeficit = Math.max(0, cocoNeeded - cocoHave);

        if (seedDeficit === 0 && trayDeficit === 0 && cocoDeficit === 0) {
            entries.push(
                { item: 'seedlings', change: -seedNeeded, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('seedlings', seedNeeded, id) },
                { item: 'tray',      change: -trayNeeded, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('tray', trayNeeded, id) },
                { item: 'cocopeat',  change: -cocoNeeded, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('cocopeat', cocoNeeded, id) }
            );
            breakdown.seedlings = seedNeeded;
            breakdown.tray      = trayNeeded;
            breakdown.cocopeat  = cocoNeeded;
        } else {
            if (seedDeficit > 0 && trayDeficit === 0 && cocoDeficit === 0) {
                const tonsRequired = seedDeficit / CONVERSIONS.SEEDLINGS_PER_TON;
                if (avail('raw_sugarcane') >= tonsRequired) {
                    if (seedHave > 0) entries.push({ item: 'seedlings', change: -seedHave, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('seedlings', seedHave, id) });
                    if (trayHave > 0) entries.push({ item: 'tray',      change: -trayHave, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('tray', trayHave, id) });
                    if (cocoHave > 0) entries.push({ item: 'cocopeat',  change: -cocoHave, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('cocopeat', cocoHave, id) });
                    breakdown.seedlings = seedHave;
                    breakdown.tray      = trayHave;
                    breakdown.cocopeat  = cocoHave;
                    return { ledgerEntries: entries, reservedBreakdown: breakdown, needsConversion: { tonsNeeded: tonsRequired, seedlingsShortfall: seedDeficit }, error: null };
                }
            }

            const shortages = [];
            if (seedDeficit > 0) shortages.push(`${seedDeficit.toLocaleString()} Seedlings`);
            if (trayDeficit > 0) shortages.push(`${trayDeficit} Trays`);
            if (cocoDeficit > 0) shortages.push(`${cocoDeficit.toFixed(1)} kg Cocopeat`);
            return { ledgerEntries: [], reservedBreakdown: breakdown, needsConversion: null, error: `Insufficient stock: Needs ${shortages.join(', ')}.` };
        }
    }

    return { ledgerEntries: entries, reservedBreakdown: breakdown, needsConversion: null, error: null };
}

function seedlingPrepare(order) {
    const id = order.id;
    const entries = [];
    const looseTrays = order.reserved_tray || 0;
    if (looseTrays > 0) {
        const seedlings = looseTrays * CONVERSIONS.SEEDLINGS_PER_TRAY;
        const cocopeat  = looseTrays * CONVERSIONS.COCOPEAT_PER_TRAY;
        entries.push({ item: 'seedlings',  change: -seedlings,   type: LEDGER_TYPES.CONSUME_RESERVED, reference_id: id, note: ledgerNote.consume('seedlings', seedlings, id) });
        entries.push({ item: 'tray',       change: -looseTrays,  type: LEDGER_TYPES.CONSUME_RESERVED, reference_id: id, note: ledgerNote.consume('tray', looseTrays, id) });
        entries.push({ item: 'cocopeat',   change: -cocopeat,    type: LEDGER_TYPES.CONSUME_RESERVED, reference_id: id, note: ledgerNote.consume('cocopeat', cocopeat, id) });
        entries.push({ item: 'ready_tray', change:  looseTrays,  type: LEDGER_TYPES.CONVERT_IN,       reference_id: id, note: ledgerNote.convertIn('ready_tray', looseTrays, id) });
        entries.push({ item: 'ready_tray', change:  looseTrays,  type: LEDGER_TYPES.RESERVE,          reference_id: id, note: ledgerNote.reserve('ready_tray', looseTrays, id) });
    }
    return entries;
}

function seedlingDeliver(order) {
    return [{ item: 'ready_tray', change: -order.trays_required, type: LEDGER_TYPES.CONSUME_RESERVED, reference_id: order.id, note: ledgerNote.deliver(order.trays_required, order.id) }];
}

function seedlingCancel(order) {
    const id = order.id;
    const entries = [];
    if (order.status === 'CONFIRMED') {
        const bd = { ready_tray: order.reserved_ready_tray || 0, seedlings: order.reserved_seedlings || 0, tray: order.reserved_tray || 0, cocopeat: order.reserved_cocopeat || 0 };
        Object.entries(bd).forEach(([item, qty]) => {
            if (qty > 0) entries.push({ item, change: qty, type: LEDGER_TYPES.RELEASE, reference_id: id, note: ledgerNote.release(item, qty, id) });
        });
    } else if (order.status === 'PREPARED') {
        entries.push({ item: 'ready_tray', change: order.trays_required, type: LEDGER_TYPES.ADD, reference_id: id, note: ledgerNote.add('ready_tray', order.trays_required, `cancelled prepared order ${id}`) });
    }
    return entries;
}

// ═════════════════════════════════════════════════════════
// EXCESS_SUGARCANE handlers
// ═════════════════════════════════════════════════════════

function resolveExcessQty(order) {
    return Number(order.excess_qty || 0);
}

function excessConfirm(order, stock) {
    const qty  = resolveExcessQty(order);
    const id   = order.id;
    const avail = netAvailable(getStockItem(stock, 'excess_sugarcane'));
    if (avail < qty) {
        return { ledgerEntries: [], reservedBreakdown: {}, needsConversion: null, error: `Insufficient excess sugarcane: need ${qty} kg, only ${avail.toFixed(0)} kg available.` };
    }
    return {
        ledgerEntries: [{ item: 'excess_sugarcane', change: -qty, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('excess_sugarcane', qty, id) }],
        reservedBreakdown: {},
        needsConversion: null,
        error: null,
    };
}

function excessDeliver(order) {
    const qty = resolveExcessQty(order);
    return [{ item: 'excess_sugarcane', change: -qty, type: LEDGER_TYPES.CONSUME_RESERVED, reference_id: order.id, note: `FINAL_CONSUME: -${qty} kg excess_sugarcane delivered for order ${order.id}` }];
}

function excessCancel(order) {
    const qty = resolveExcessQty(order);
    if (order.status === 'CONFIRMED' && qty > 0) {
        return [{ item: 'excess_sugarcane', change: qty, type: LEDGER_TYPES.RELEASE, reference_id: order.id, note: ledgerNote.release('excess_sugarcane', qty, order.id) }];
    }
    return [];
}

// ═════════════════════════════════════════════════════════
// Handler registry — add new order types here only
// ═════════════════════════════════════════════════════════

const HANDLERS = {
    SEEDLING: {
        confirm: seedlingConfirm,
        prepare: seedlingPrepare,
        deliver: seedlingDeliver,
        cancel:  seedlingCancel,
    },
    EXCESS_SUGARCANE: {
        confirm: excessConfirm,
        prepare: () => [],
        deliver: excessDeliver,
        cancel:  excessCancel,
    },
};

function getHandler(order) {
    return HANDLERS[order.order_type] || HANDLERS.SEEDLING;
}

// ═════════════════════════════════════════════════════════
// Public API — zero branching, dispatches via registry
// ═════════════════════════════════════════════════════════

export const buildConfirmPlan    = (order, stock) => getHandler(order).confirm(order, stock);
export const buildPrepareEntries = (order)        => getHandler(order).prepare(order);
export const buildDeliverEntries = (order)        => getHandler(order).deliver(order);
export const buildCancelEntries  = (order)        => getHandler(order).cancel(order);

// ── Utility builders (not order-type-specific) ────────────

export function buildConversionEntries(tons, refId = 'manual') {
    const seedlings = Math.floor(tons * CONVERSIONS.SEEDLINGS_PER_TON);
    const excess    = tons * CONVERSIONS.EXCESS_KG_PER_TON;
    return [
        { item: 'raw_sugarcane',    change: -tons,     type: LEDGER_TYPES.CONVERT_OUT, reference_id: refId, note: ledgerNote.convertOut('raw_sugarcane', tons, refId) },
        { item: 'seedlings',        change: seedlings,  type: LEDGER_TYPES.CONVERT_IN,  reference_id: refId, note: ledgerNote.convertIn('seedlings', seedlings, refId) },
        { item: 'excess_sugarcane', change: excess,     type: LEDGER_TYPES.CONVERT_IN,  reference_id: refId, note: ledgerNote.convertIn('excess_sugarcane', excess, refId) },
    ];
}

export function buildPrepareTrayEntries(trays, refId = 'manual') {
    const seedlings = trays * CONVERSIONS.SEEDLINGS_PER_TRAY;
    const cocopeat  = trays * CONVERSIONS.COCOPEAT_PER_TRAY;
    return [
        { item: 'seedlings',  change: -seedlings, type: LEDGER_TYPES.CONVERT_OUT, reference_id: refId, note: ledgerNote.convertOut('seedlings', seedlings, refId) },
        { item: 'tray',       change: -trays,     type: LEDGER_TYPES.CONVERT_OUT, reference_id: refId, note: ledgerNote.convertOut('tray', trays, refId) },
        { item: 'cocopeat',   change: -cocopeat,  type: LEDGER_TYPES.CONVERT_OUT, reference_id: refId, note: ledgerNote.convertOut('cocopeat', cocopeat, refId) },
        { item: 'ready_tray', change:  trays,     type: LEDGER_TYPES.CONVERT_IN,  reference_id: refId, note: ledgerNote.convertIn('ready_tray', trays, refId) },
    ];
}
