// =====================================================
// Sugarcane Nursery — Google Apps Script Web App
// Deploy as Web App: Execute as Me, Anyone can access
// =====================================================

const SHEET_ID = PropertiesService.getScriptProperties().getProperty('SHEET_ID');

function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

// ── Sheet helpers ──────────────────────────────────
function getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

function sheetToObjects(sheet) {
  const [headers, ...rows] = sheet.getDataRange().getValues();
  return rows
    .filter(r => r[0] !== '')
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
}

function objectToRow(sheet, obj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.map(h => (obj[h] !== undefined ? obj[h] : ''));
}

function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-indexed
  }
  return -1;
}

// ── CORS response ──────────────────────────────────
function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function respondError(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════
// GET handler
// ══════════════════════════════════════════════════
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === 'getOrders') {
      return respond(sheetToObjects(getSheet('Orders')));
    }
    if (action === 'getLedger') {
      const rows = sheetToObjects(getSheet('StockLedger'));
      const refId = e.parameter.reference_id;
      return respond(refId ? rows.filter(r => String(r.reference_id) === String(refId)) : rows);
    }
    if (action === 'getCurrentStock') {
      return respond(sheetToObjects(getSheet('CurrentStock')));
    }
    if (action === 'getWorkers') {
      return respond(sheetToObjects(getSheet('Workers')));
    }
    if (action === 'getAttendance') {
      const rows = sheetToObjects(getSheet('Attendance'));
      const dateFrom = e.parameter.date_from;
      const dateTo   = e.parameter.date_to;
      if (dateFrom && dateTo) {
        return respond(rows.filter(r => String(r.date) >= dateFrom && String(r.date) <= dateTo));
      }
      if (dateFrom) {
        return respond(rows.filter(r => String(r.date) === dateFrom));
      }
      return respond(rows);
    }

    return respondError('Unknown GET action: ' + action);
  } catch (err) {
    return respondError(err.message);
  }
}

// ══════════════════════════════════════════════════
// POST handler
// ══════════════════════════════════════════════════
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'createOrder')         return createOrder(payload.data);
    if (action === 'updateOrder')         return updateOrder(payload.id, payload.fields);
    if (action === 'addLedgerEntries')    return addLedgerEntries(payload.entries);
    if (action === 'addWorker')           return addWorker(payload.data);
    if (action === 'updateWorker')        return updateWorker(payload.id, payload.fields);
    if (action === 'saveAttendance')      return saveAttendance(payload.date, payload.records);

    return respondError('Unknown POST action: ' + action);
  } catch (err) {
    return respondError(err.message);
  }
}

// ══════════════════════════════════════════════════
// createOrder
// ══════════════════════════════════════════════════
function createOrder(data) {
  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    const sheet = getSheet('Orders');
    const id = Utilities.getUuid();
    const order = {
      id,
      name: data.name,
      acre: data.acre,
      rate: data.rate,
      trays_required: data.trays_required,
      seedlings_required: data.seedlings_required,
      delivery_date: data.delivery_date,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      reserved_ready_tray: 0,
      reserved_seedlings: 0,
      reserved_tray: 0,
      reserved_cocopeat: 0,
    };
    sheet.appendRow(objectToRow(sheet, order));
    return respond(order);
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════
// updateOrder — enforces valid state transitions
// ══════════════════════════════════════════════════
const VALID_TRANSITIONS = {
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARED', 'CANCELLED'],
  PREPARED:  ['DELIVERED', 'CANCELLED'],
};

function updateOrder(id, fields) {
  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    const sheet = getSheet('Orders');
    const rowIdx = findRowById(sheet, id);
    if (rowIdx === -1) return respondError('Order not found: ' + id);

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowData = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
    const current = {};
    headers.forEach((h, i) => { current[h] = rowData[i]; });

    // Enforce state transition if status is changing
    if (fields.status && fields.status !== current.status) {
      const allowed = VALID_TRANSITIONS[current.status] || [];
      if (!allowed.includes(fields.status)) {
        return respondError(
          `Invalid transition: ${current.status} → ${fields.status}`
        );
      }
    }

    // Merge fields into row
    headers.forEach((h, i) => {
      if (fields[h] !== undefined) {
        sheet.getRange(rowIdx, i + 1).setValue(fields[h]);
      }
    });

    return respond({ id, ...current, ...fields });
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════
// addLedgerEntries — atomic: write + recalc stock
// ══════════════════════════════════════════════════
function addLedgerEntries(entries) {
  if (!entries || entries.length === 0) return respond([]);

  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    const ledgerSheet = getSheet('StockLedger');
    const stockSheet  = getSheet('CurrentStock');

    // 1. Append all ledger entries
    entries.forEach(entry => {
      const row = {
        id: Utilities.getUuid(),
        item: entry.item,
        change: entry.change,
        type: entry.type,
        reference_id: entry.reference_id || '',
        note: entry.note || '',
        date: new Date().toISOString(),
      };
      ledgerSheet.appendRow(objectToRow(ledgerSheet, row));
    });

    // 2. Recalculate CurrentStock from full ledger
    const allLedger = sheetToObjects(ledgerSheet);
    const stockMap = recalcFromLedger(allLedger);

    // 3. Rewrite CurrentStock sheet
    const stockHeaders = stockSheet.getRange(1, 1, 1, stockSheet.getLastColumn()).getValues()[0];
    const existingItems = sheetToObjects(stockSheet).map(r => r.item);

    stockMap.forEach((vals, item) => {
      const rowIdx = existingItems.indexOf(item);
      const rowData = stockHeaders.map(h => {
        if (h === 'item') return item;
        if (h === 'available') return vals.available;
        if (h === 'reserved') return vals.reserved;
        return '';
      });
      if (rowIdx === -1) {
        stockSheet.appendRow(rowData);
        existingItems.push(item);
      } else {
        stockSheet.getRange(rowIdx + 2, 1, 1, rowData.length).setValues([rowData]);
      }
    });

    // Return updated stock
    const updatedStock = Array.from(stockMap.entries()).map(([item, vals]) => ({ item, ...vals }));
    return respond(updatedStock);
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════
// recalcFromLedger (internal GAS helper)
// available = ADD + CONVERT_IN - CONVERT_OUT - CONSUME_RESERVED - FINAL_CONSUME
// reserved  = RESERVE - RELEASE - CONSUME_RESERVED
// ══════════════════════════════════════════════════
function recalcFromLedger(ledger) {
  const map = new Map();

  const ensure = (item) => {
    if (!map.has(item)) map.set(item, { available: 0, reserved: 0 });
  };

  ledger.forEach(({ item, change, type }) => {
    ensure(item);
    const s = map.get(item);
    const n = Number(change);

    if (type === 'ADD' || type === 'CONVERT_IN') {
      s.available += n;
    } else if (type === 'CONVERT_OUT' || type === 'FINAL_CONSUME') {
      s.available -= Math.abs(n);
    } else if (type === 'CONSUME_RESERVED') {
      s.available -= Math.abs(n);
      s.reserved  -= Math.abs(n);
    } else if (type === 'RESERVE') {
      s.reserved   += Math.abs(n);
    } else if (type === 'RELEASE') {
      s.reserved   -= Math.abs(n);
    } else if (type === 'REVERSAL') {
      s.available  += n;
    }
  });

  return map;
}

// ══════════════════════════════════════════════════
// addWorker
// ══════════════════════════════════════════════════
function addWorker(data) {
  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    const sheet = getSheet('Workers');
    const worker = {
      id:         Utilities.getUuid(),
      name:       data.name,
      daily_rate: Number(data.daily_rate) || 0,
      phone:      data.phone || '',
      active:     true,
      created_at: new Date().toISOString(),
    };
    sheet.appendRow(objectToRow(sheet, worker));
    return respond(worker);
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════
// updateWorker (used for deactivation)
// ══════════════════════════════════════════════════
function updateWorker(id, fields) {
  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    const sheet = getSheet('Workers');
    const rowIdx = findRowById(sheet, id);
    if (rowIdx === -1) return respondError('Worker not found: ' + id);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowData = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
    const current = {};
    headers.forEach((h, i) => { current[h] = rowData[i]; });
    headers.forEach((h, i) => {
      if (fields[h] !== undefined) sheet.getRange(rowIdx, i + 1).setValue(fields[h]);
    });
    return respond({ ...current, ...fields });
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════
// saveAttendance — replaces all records for the date
// ══════════════════════════════════════════════════
function saveAttendance(date, records) {
  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    const sheet = getSheet('Attendance');
    if (sheet.getLastRow() > 1) {
      const all = sheet.getDataRange().getValues();
      const dateIdx = all[0].indexOf('date');
      // Delete existing rows for this date (bottom-up to preserve indices)
      for (let i = all.length - 1; i >= 1; i--) {
        if (String(all[i][dateIdx]) === String(date)) sheet.deleteRow(i + 1);
      }
    }
    const created_at = new Date().toISOString();
    records.forEach(r => {
      const row = {
        id:         Utilities.getUuid(),
        worker_id:  r.worker_id,
        date:       date,
        present:    r.present === true || r.present === 'true',
        created_at,
      };
      sheet.appendRow(objectToRow(sheet, row));
    });
    return respond(records);
  } finally {
    lock.releaseLock();
  }
}
