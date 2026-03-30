// ─────────────────────────────────────────────────────────
// Business calculations – all pure functions
// ─────────────────────────────────────────────────────────
export { CONVERSIONS } from './constants';
import { CONVERSIONS } from './constants';

// ── Order calculations ──────────────────────────────────
export function calcOrder(acre) {
    const trays_required = Math.ceil(acre * CONVERSIONS.TRAYS_PER_ACRE);
    const seedlings_required = trays_required * CONVERSIONS.SEEDLINGS_PER_TRAY;
    return { trays_required, seedlings_required };
}

// ── Raw sugarcane conversion ────────────────────────────
export function calcConversionFromRaw(tons) {
    return {
        seedlings: Math.floor(tons * CONVERSIONS.SEEDLINGS_PER_TON),
        excess_sugarcane: tons * CONVERSIONS.EXCESS_KG_PER_TON,
    };
}

// ── Tray preparation ────────────────────────────────────
export function calcTrayPrep(trays) {
    return {
        seedlings_needed: trays * CONVERSIONS.SEEDLINGS_PER_TRAY,
        cocopeat_needed: trays * CONVERSIONS.COCOPEAT_PER_TRAY,
        trays_needed: trays,
    };
}

// ── How many raw tons needed to cover a seedling deficit ─
export function tonsNeeded(seedlingDeficit) {
    return seedlingDeficit / CONVERSIONS.SEEDLINGS_PER_TON;
}

// ─────────────────────────────────────────────────────────
// Stock availability checker
// Returns { status: 'green'|'yellow'|'red', message, conversionsNeeded }
// ─────────────────────────────────────────────────────────
export function checkStockAvailability(stock, order) {
    const { trays_required } = order;

    const get = (item) => {
        const s = stock.find((x) => x.item === item);
        return s ? (s.available || 0) - (s.reserved || 0) : 0;
    };

    const freeReadyTrays = get('ready_tray');
    if (freeReadyTrays >= trays_required) {
        return { status: 'green', message: 'Sufficient ready trays available.', conversionsNeeded: 0 };
    }

    // Gap to fill with loose materials
    const gapTrays = trays_required - freeReadyTrays;
    const seedlingsNeeded = gapTrays * CONVERSIONS.SEEDLINGS_PER_TRAY;
    const traysNeeded = gapTrays;
    const cocopeatNeeded = gapTrays * CONVERSIONS.COCOPEAT_PER_TRAY;

    const freeSeedlings = get('seedlings');
    const freeTray = get('tray');
    const freeCocopeat = get('cocopeat');
    const freeRaw = get('raw_sugarcane');

    const seedlingDeficit = Math.max(0, seedlingsNeeded - freeSeedlings);
    const trayDeficit = Math.max(0, traysNeeded - freeTray);
    const cocopeatDeficit = Math.max(0, cocopeatNeeded - freeCocopeat);

    // If everything is in stock as loose materials
    if (seedlingDeficit === 0 && trayDeficit === 0 && cocopeatDeficit === 0) {
        return { status: 'green', message: `Ready to prepare ${gapTrays} trays from loose materials.`, conversionsNeeded: 0 };
    }

    // If only seedlings are missing and we have raw sugarcane
    if (seedlingDeficit > 0 && trayDeficit === 0 && cocopeatDeficit === 0) {
        const tonsNeededForGap = tonsNeeded(seedlingDeficit);
        if (freeRaw >= tonsNeededForGap) {
            return {
                status: 'yellow',
                message: `Needs conversion of ~${tonsNeededForGap.toFixed(2)} ton(s) raw sugarcane for more seedlings.`,
                conversionsNeeded: tonsNeededForGap,
            };
        }
    }

    // List all shortages
    const shortages = [];
    if (seedlingDeficit > 0) shortages.push(`${seedlingDeficit.toLocaleString()} Seedlings`);
    if (trayDeficit > 0) shortages.push(`${trayDeficit} Trays`);
    if (cocopeatDeficit > 0) shortages.push(`${cocopeatDeficit.toFixed(1)} kg Cocopeat`);

    return {
        status: 'red',
        message: `Insufficient stock: Needs ${shortages.join(', ')}.`,
        conversionsNeeded: 0,
    };
}
