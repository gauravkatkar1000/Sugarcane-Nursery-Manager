// ─────────────────────────────────────────────────────────
// Business calculations – all pure functions
// ─────────────────────────────────────────────────────────

export const CONVERSIONS = {
    SEEDLINGS_PER_TON: 10000,
    EXCESS_KG_PER_TON: 500,
    SEEDLINGS_PER_TRAY: 70,
    COCOPEAT_PER_TRAY: 2.5,
    TRAYS_PER_ACRE: 60,
};

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
    const { trays_required, seedlings_required } = order;

    const get = (item) => {
        const s = stock.find((x) => x.item === item);
        return s ? (s.available || 0) - (s.reserved || 0) : 0;
    };

    const freeReadyTrays = get('ready_tray');
    const freeSeedlings = get('seedlings');
    const freeTray = get('tray');
    const freeCocopeat = get('cocopeat');
    const freeRaw = get('raw_sugarcane');

    // Check 1: do we have enough ready trays?
    if (freeReadyTrays >= trays_required) {
        return { status: 'green', message: 'Sufficient ready trays available.', conversionsNeeded: 0 };
    }

    // Check 2: can we fill with loose materials?
    const traysFromLoose = Math.min(
        Math.floor(freeSeedlings / CONVERSIONS.SEEDLINGS_PER_TRAY),
        Math.floor(freeTray),
        Math.floor(freeCocopeat / CONVERSIONS.COCOPEAT_PER_TRAY)
    );
    const totalTraysCoveredByLoose = freeReadyTrays + traysFromLoose;

    if (totalTraysCoveredByLoose >= trays_required) {
        return {
            status: 'green',
            message: 'Sufficient loose materials available.',
            conversionsNeeded: 0,
        };
    }

    // Check 3: can we convert raw sugarcane to cover the gap?
    const remainingTrays = trays_required - totalTraysCoveredByLoose;
    const remainingSeedlings = remainingTrays * CONVERSIONS.SEEDLINGS_PER_TRAY;
    const tonsRequired = tonsNeeded(remainingSeedlings);

    if (freeRaw >= tonsRequired) {
        return {
            status: 'yellow',
            message: `Needs conversion of ~${tonsRequired.toFixed(2)} ton(s) raw sugarcane.`,
            conversionsNeeded: tonsRequired,
        };
    }

    return {
        status: 'red',
        message: 'Insufficient stock. Cannot fulfill this order.',
        conversionsNeeded: 0,
    };
}
