import { create } from 'zustand';
import toast from 'react-hot-toast';
import * as api from '../api/sheets';
import {
    buildConfirmPlan,
    buildPrepareEntries,
    buildDeliverEntries,
    buildCancelEntries,
    buildConversionEntries,
    buildPrepareTrayEntries,
} from '../utils/orderFlow';
import { calcOrder } from '../utils/calculations';
import { ledgerNote } from '../utils/constants';

const useAppStore = create((set, get) => ({
    orders: [],
    stock: [],
    ledger: [],
    loading: {},
    error: null,

    // ── helpers ─────────────────────────────────────────────
    setLoading: (key, val) => set((s) => ({ loading: { ...s.loading, [key]: val } })),

    _applyStockUpdate: (updatedStock) => {
        if (updatedStock?.length) set({ stock: updatedStock });
    },

    // ── fetch ────────────────────────────────────────────────
    fetchOrders: async () => {
        get().setLoading('orders', true);
        try {
            const orders = await api.getOrders();
            set({ orders });
        } catch (e) {
            toast.error('Failed to load orders: ' + e.message);
        } finally {
            get().setLoading('orders', false);
        }
    },

    fetchStock: async () => {
        get().setLoading('stock', true);
        try {
            const stock = await api.getCurrentStock();
            set({ stock });
        } catch (e) {
            toast.error('Failed to load stock: ' + e.message);
        } finally {
            get().setLoading('stock', false);
        }
    },

    fetchLedger: async (refId) => {
        get().setLoading('ledger', true);
        try {
            const ledger = await api.getLedger(refId);
            set({ ledger });
        } catch (e) {
            toast.error('Failed to load ledger: ' + e.message);
        } finally {
            get().setLoading('ledger', false);
        }
    },

    fetchAll: async () => {
        await Promise.all([get().fetchOrders(), get().fetchStock()]);
    },

    // ── place order ──────────────────────────────────────────
    placeOrder: async (formData) => {
        get().setLoading('placeOrder', true);
        try {
            const { trays_required, seedlings_required } = calcOrder(formData.acre);
            const order = await api.createOrder({ ...formData, trays_required, seedlings_required });
            set((s) => ({ orders: [order, ...s.orders] }));
            toast.success('Order created!');
            return order;
        } catch (e) {
            toast.error('Failed to create order: ' + e.message);
            return null;
        } finally {
            get().setLoading('placeOrder', false);
        }
    },

    // ── confirm order ────────────────────────────────────────
    confirmOrder: async (orderId) => {
        const { orders, stock } = get();
        const order = orders.find((o) => o.id === orderId);
        if (!order) return false;

        get().setLoading(`confirm_${orderId}`, true);
        try {
            const { ledgerEntries, reservedBreakdown, error, needsConversion } = buildConfirmPlan(order, stock);
            if (error) { toast.error(error); return false; }
            if (needsConversion) {
                toast.error(`Needs conversion of ~${needsConversion.tonsNeeded.toFixed(2)} ton(s) raw sugarcane first.`);
                return false;
            }

            // Atomic write: ledger + recalc
            const updatedStock = await api.addLedgerEntries(ledgerEntries);
            get()._applyStockUpdate(updatedStock);

            // Store reservation breakdown in order row
            const updatedOrder = await api.updateOrder(orderId, {
                status: 'CONFIRMED',
                reserved_ready_tray: reservedBreakdown.ready_tray,
                reserved_seedlings: reservedBreakdown.seedlings,
                reserved_tray: reservedBreakdown.tray,
                reserved_cocopeat: reservedBreakdown.cocopeat,
            });

            set((s) => ({ orders: s.orders.map((o) => o.id === orderId ? updatedOrder : o) }));
            toast.success('Order confirmed!');
            return true;
        } catch (e) {
            toast.error('Confirm failed: ' + e.message);
            return false;
        } finally {
            get().setLoading(`confirm_${orderId}`, false);
        }
    },

    // ── prepare order ────────────────────────────────────────
    prepareOrder: async (orderId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return false;

        get().setLoading(`prepare_${orderId}`, true);
        try {
            const entries = buildPrepareEntries(order);
            const updatedStock = entries.length > 0 ? await api.addLedgerEntries(entries) : get().stock;
            get()._applyStockUpdate(updatedStock);

            const updatedOrder = await api.updateOrder(orderId, { status: 'PREPARED' });
            set((s) => ({ orders: s.orders.map((o) => o.id === orderId ? updatedOrder : o) }));
            toast.success('Order prepared!');
            return true;
        } catch (e) {
            toast.error('Prepare failed: ' + e.message);
            return false;
        } finally {
            get().setLoading(`prepare_${orderId}`, false);
        }
    },

    // ── deliver order ────────────────────────────────────────
    deliverOrder: async (orderId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return false;

        get().setLoading(`deliver_${orderId}`, true);
        try {
            const entries = buildDeliverEntries(order);
            const updatedStock = await api.addLedgerEntries(entries);
            get()._applyStockUpdate(updatedStock);

            const updatedOrder = await api.updateOrder(orderId, { status: 'DELIVERED' });
            set((s) => ({ orders: s.orders.map((o) => o.id === orderId ? updatedOrder : o) }));
            toast.success('Order delivered!');
            return true;
        } catch (e) {
            toast.error('Deliver failed: ' + e.message);
            return false;
        } finally {
            get().setLoading(`deliver_${orderId}`, false);
        }
    },

    // ── cancel order ─────────────────────────────────────────
    cancelOrder: async (orderId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return false;

        get().setLoading(`cancel_${orderId}`, true);
        try {
            const entries = buildCancelEntries(order);
            if (entries.length > 0) {
                const updatedStock = await api.addLedgerEntries(entries);
                get()._applyStockUpdate(updatedStock);
            }
            const updatedOrder = await api.updateOrder(orderId, { status: 'CANCELLED' });
            set((s) => ({ orders: s.orders.map((o) => o.id === orderId ? updatedOrder : o) }));
            toast.success('Order cancelled.');
            return true;
        } catch (e) {
            toast.error('Cancel failed: ' + e.message);
            return false;
        } finally {
            get().setLoading(`cancel_${orderId}`, false);
        }
    },

    // ── add stock ────────────────────────────────────────────
    addStock: async (item, quantity, note) => {
        get().setLoading('addStock', true);
        try {
            const entries = [{
                item,
                change: Number(quantity),
                type: 'ADD',
                reference_id: 'manual',
                note: ledgerNote.add(item, quantity, note),
            }];
            const updatedStock = await api.addLedgerEntries(entries);
            get()._applyStockUpdate(updatedStock);
            toast.success(`Stock added: ${quantity} ${item}`);
            return true;
        } catch (e) {
            toast.error('Add stock failed: ' + e.message);
            return false;
        } finally {
            get().setLoading('addStock', false);
        }
    },

    // ── convert raw sugarcane ────────────────────────────────
    convertRaw: async (tons, refId = 'manual') => {
        get().setLoading('convertRaw', true);
        try {
            const entries = buildConversionEntries(tons, refId);
            const updatedStock = await api.addLedgerEntries(entries);
            get()._applyStockUpdate(updatedStock);
            toast.success(`Converted ${tons} ton(s) of raw sugarcane.`);
            return true;
        } catch (e) {
            toast.error('Conversion failed: ' + e.message);
            return false;
        } finally {
            get().setLoading('convertRaw', false);
        }
    },

    // ── prepare trays (manual) ───────────────────────────────
    prepareTrays: async (trays, refId = 'manual') => {
        get().setLoading('prepareTrays', true);
        try {
            const entries = buildPrepareTrayEntries(trays, refId);
            const updatedStock = await api.addLedgerEntries(entries);
            get()._applyStockUpdate(updatedStock);
            toast.success(`Prepared ${trays} tray(s).`);
            return true;
        } catch (e) {
            toast.error('Tray preparation failed: ' + e.message);
            return false;
        } finally {
            get().setLoading('prepareTrays', false);
        }
    },
}));

export default useAppStore;
