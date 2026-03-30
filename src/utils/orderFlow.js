// ─────────────────────────────────────────────────────────
// orderFlow.js — builds ledger entries for each order action
// Every entry has a mandatory auto-generated note (no UI input)
// ─────────────────────────────────────────────────────────
import { CONVERSIONS, LEDGER_TYPES, ledgerNote } from './constants';
import { getStockItem, netAvailable } from './stock';
import { checkStockAvailability } from './calculations';

// ── Confirm Order ────────────────────────────────────────
// Returns { ledgerEntries, reservedBreakdown, error? }
export function buildConfirmPlan(order, stock) {
    const { trays_required, seedlings_required, id } = order;

    const avail = (item) => netAvailable(getStockItem(stock, item));

    let traysToFill = trays_required;
    const entries = [];
    const breakdown = { ready_tray: 0, seedlings: 0, tray: 0, cocopeat: 0 };

    // ── Step 1: use ready_trays ──────────────────────────
    const readyUse = Math.min(avail('ready_tray'), traysToFill);
    if (readyUse > 0) {
        entries.push({
            item: 'ready_tray',
            change: -readyUse,
            type: LEDGER_TYPES.RESERVE,
            reference_id: id,
            note: ledgerNote.reserve('ready_tray', readyUse, id),
        });
        breakdown.ready_tray = readyUse;
        traysToFill -= readyUse;
    }

    // ── Step 2: identify deficits for loose preparation ──
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

        // If no deficit, use all loose materials
        if (seedDeficit === 0 && trayDeficit === 0 && cocoDeficit === 0) {
            entries.push(
                { item: 'seedlings', change: -seedNeeded, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('seedlings', seedNeeded, id) },
                { item: 'tray', change: -trayNeeded, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('tray', trayNeeded, id) },
                { item: 'cocopeat', change: -cocoNeeded, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('cocopeat', cocoNeeded, id) }
            );
            breakdown.seedlings = seedNeeded;
            breakdown.tray = trayNeeded;
            breakdown.cocopeat = cocoNeeded;
            traysToFill = 0;
        } else {
            // If only seedlings are missing and we have raw sugarcane
            if (seedDeficit > 0 && trayDeficit === 0 && cocoDeficit === 0) {
                const tonsRequired = seedDeficit / CONVERSIONS.SEEDLINGS_PER_TON;
                if (avail('raw_sugarcane') >= tonsRequired) {
                    // Reserve what we currently have as loose materials
                    if (seedHave > 0) entries.push({ item: 'seedlings', change: -seedHave, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('seedlings', seedHave, id) });
                    if (trayHave > 0) entries.push({ item: 'tray', change: -trayHave, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('tray', trayHave, id) });
                    if (cocoHave > 0) entries.push({ item: 'cocopeat', change: -cocoHave, type: LEDGER_TYPES.RESERVE, reference_id: id, note: ledgerNote.reserve('cocopeat', cocoHave, id) });

                    breakdown.seedlings = seedHave;
                    breakdown.tray = trayHave;
                    breakdown.cocopeat = cocoHave;

                    return {
                        ledgerEntries: entries,
                        reservedBreakdown: breakdown,
                        needsConversion: { tonsNeeded: tonsRequired, seedlingsShortfall: seedDeficit },
                        error: null,
                    };
                }
            }

            // Otherwise, we have a hard shortage (especially cocopeat or trays)
            const shortages = [];
            if (seedDeficit > 0) shortages.push(`${seedDeficit.toLocaleString()} Seedlings`);
            if (trayDeficit > 0) shortages.push(`${trayDeficit} Trays`);
            if (cocoDeficit > 0) shortages.push(`${cocoDeficit.toFixed(1)} kg Cocopeat`);

            return {
                ledgerEntries: [],
                reservedBreakdown: breakdown,
                error: `Insufficient stock: Needs ${shortages.join(', ')}.`,
            };
        }
    }

    return { ledgerEntries: entries, reservedBreakdown: breakdown, error: null };
}

// ── Convert Raw Sugarcane ────────────────────────────────
export function buildConversionEntries(tons, refId = 'manual') {
    const seedlings = Math.floor(tons * CONVERSIONS.SEEDLINGS_PER_TON);
    const excess = tons * CONVERSIONS.EXCESS_KG_PER_TON;
    return [
        { item: 'raw_sugarcane', change: -tons, type: LEDGER_TYPES.CONVERT_OUT, reference_id: refId, note: ledgerNote.convertOut('raw_sugarcane', tons, refId) },
        { item: 'seedlings', change: seedlings, type: LEDGER_TYPES.CONVERT_IN, reference_id: refId, note: ledgerNote.convertIn('seedlings', seedlings, refId) },
        { item: 'excess_sugarcane', change: excess, type: LEDGER_TYPES.CONVERT_IN, reference_id: refId, note: ledgerNote.convertIn('excess_sugarcane', excess, refId) },
    ];
}

// ── Prepare Trays (loose → ready_tray) ──────────────────
export function buildPrepareTrayEntries(trays, refId = 'manual') {
    const seedlings = trays * CONVERSIONS.SEEDLINGS_PER_TRAY;
    const cocopeat = trays * CONVERSIONS.COCOPEAT_PER_TRAY;
    return [
        { item: 'seedlings', change: -seedlings, type: LEDGER_TYPES.CONVERT_OUT, reference_id: refId, note: ledgerNote.convertOut('seedlings', seedlings, refId) },
        { item: 'tray', change: -trays, type: LEDGER_TYPES.CONVERT_OUT, reference_id: refId, note: ledgerNote.convertOut('tray', trays, refId) },
        { item: 'cocopeat', change: -cocopeat, type: LEDGER_TYPES.CONVERT_OUT, reference_id: refId, note: ledgerNote.convertOut('cocopeat', cocopeat, refId) },
        { item: 'ready_tray', change: trays, type: LEDGER_TYPES.CONVERT_IN, reference_id: refId, note: ledgerNote.convertIn('ready_tray', trays, refId) },
    ];
}

// ── Prepare Order (CONFIRMED → PREPARED) ─────────────────
// Uses stored reserved_breakdown — deterministic, no stock re-check
export function buildPrepareEntries(order) {
    const id = order.id;
    const entries = [];

    // If ready_trays were reserved — they stay as FINAL_CONSUME will handle them
    // For loose materials reserved — consume them and create ready_trays
    const looseTrays = order.reserved_tray || 0;
    if (looseTrays > 0) {
        const seedlings = looseTrays * CONVERSIONS.SEEDLINGS_PER_TRAY;
        const cocopeat = looseTrays * CONVERSIONS.COCOPEAT_PER_TRAY;

        entries.push({ item: 'seedlings', change: -seedlings, type: LEDGER_TYPES.CONSUME_RESERVED, reference_id: id, note: ledgerNote.consume('seedlings', seedlings, id) });
        entries.push({ item: 'tray', change: -looseTrays, type: LEDGER_TYPES.CONSUME_RESERVED, reference_id: id, note: ledgerNote.consume('tray', looseTrays, id) });
        entries.push({ item: 'cocopeat', change: -cocopeat, type: LEDGER_TYPES.CONSUME_RESERVED, reference_id: id, note: ledgerNote.consume('cocopeat', cocopeat, id) });
        entries.push({ item: 'ready_tray', change: looseTrays, type: LEDGER_TYPES.CONVERT_IN, reference_id: id, note: ledgerNote.convertIn('ready_tray', looseTrays, id) });
    }

    return entries;
}

// ── Deliver Order (PREPARED → DELIVERED) ─────────────────
export function buildDeliverEntries(order) {
    return [
        {
            item: 'ready_tray',
            change: -order.trays_required,
            type: LEDGER_TYPES.FINAL_CONSUME,
            reference_id: order.id,
            note: ledgerNote.deliver(order.trays_required, order.id),
        },
    ];
}

// ── Cancel Order ──────────────────────────────────────────
export function buildCancelEntries(order) {
    const id = order.id;
    const entries = [];

    if (order.status === 'CONFIRMED') {
        // Release all reserved stock using stored breakdown
        const bd = {
            ready_tray: order.reserved_ready_tray || 0,
            seedlings: order.reserved_seedlings || 0,
            tray: order.reserved_tray || 0,
            cocopeat: order.reserved_cocopeat || 0,
        };
        Object.entries(bd).forEach(([item, qty]) => {
            if (qty > 0) {
                entries.push({ item, change: qty, type: LEDGER_TYPES.RELEASE, reference_id: id, note: ledgerNote.release(item, qty, id) });
            }
        });
    } else if (order.status === 'PREPARED') {
        // Return ready_trays to pool
        entries.push({
            item: 'ready_tray',
            change: order.trays_required,
            type: LEDGER_TYPES.ADD,
            reference_id: id,
            note: ledgerNote.add('ready_tray', order.trays_required, `cancelled prepared order ${id}`),
        });
    }

    return entries;
}
