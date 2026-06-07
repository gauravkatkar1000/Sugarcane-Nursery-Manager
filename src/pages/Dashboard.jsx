import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, ShoppingCart, AlertTriangle, ArrowRight, Sprout, CreditCard } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import Modal from '../components/Modal'
import { OrderCard, OrderTableRow } from '../components/OrderCard'
import { ITEM_LABELS, ITEM_UNITS, LOW_STOCK_THRESHOLDS } from '../utils/constants'
import { getStockItem, netAvailable } from '../utils/stock'
import { formatFullDateIST } from '../utils/dateUtils'

export default function Dashboard() {
    const orders       = useAppStore((s) => s.orders)
    const stock        = useAppStore((s) => s.stock)
    const loading      = useAppStore((s) => s.loading)
    const payments     = useAppStore((s) => s.payments)
    const confirmOrder  = useAppStore((s) => s.confirmOrder)
    const prepareOrder  = useAppStore((s) => s.prepareOrder)
    const deliverOrder  = useAppStore((s) => s.deliverOrder)
    const cancelOrder   = useAppStore((s) => s.cancelOrder)
    const fetchOrders   = useAppStore((s) => s.fetchOrders)
    const fetchPayments = useAppStore((s) => s.fetchPayments)
    const [cancelTarget, setCancelTarget] = useState(null)

    useEffect(() => {
        fetchOrders()
        fetchPayments()
    }, [])

    const payByOrder = useMemo(() => {
        const map = {}
        payments.forEach((p) => {
            if (!map[p.order_id]) map[p.order_id] = 0
            map[p.order_id] += p.type === 'REFUND' ? -Number(p.amount) : Number(p.amount)
        })
        return map
    }, [payments])

    const stats = useMemo(() => ({
        pending: orders.filter((o) => o.status === 'PENDING').length,
        confirmed: orders.filter((o) => o.status === 'CONFIRMED').length,
        prepared: orders.filter((o) => o.status === 'PREPARED').length,
        delivered: orders.filter((o) => o.status === 'DELIVERED').length,
    }), [orders])

    const lowStockItems = useMemo(() =>
        Object.entries(LOW_STOCK_THRESHOLDS)
            .filter(([item, threshold]) => {
                if (threshold === 0) return false
                const s = getStockItem(stock, item)
                return netAvailable(s) < threshold
            })
            .map(([item]) => ({ item, net: netAvailable(getStockItem(stock, item)) }))
        , [stock])

    const recentOrders = useMemo(() =>
        [...orders].filter((o) => o.status !== 'CANCELLED').sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
        , [orders])

    const paymentStats = useMemo(() => {
        const activeOrders = orders.filter((o) => o.status !== 'CANCELLED')
        let totalBilled = 0, totalPaid = 0, totalPending = 0, refundDue = 0

        activeOrders.forEach((o) => {
            const total = o.rate && o.seedlings_required
                ? parseFloat(o.rate) * parseFloat(o.seedlings_required) : 0
            const paid = Math.max(0, payByOrder[o.id] || 0)
            totalBilled  += total
            totalPaid    += paid
            totalPending += Math.max(0, total - paid)
        })

        // Advances on cancelled orders still in hand (pending refund)
        orders.filter((o) => o.status === 'CANCELLED').forEach((o) => {
            const net = payByOrder[o.id] || 0
            if (net > 0) refundDue += net
        })

        return { totalBilled, totalPaid, totalPending, refundDue }
    }, [orders, payByOrder])

    return (
        <div className="space-y-6">
            {/* ── Welcome banner ────────────────────────────── */}
            <div className="card p-5 bg-gradient-to-r from-brand-600 to-brand-500 text-white">
                <div className="flex items-center gap-3">
                    <Sprout className="w-8 h-8 opacity-80" />
                    <div>
                        <h2 className="font-semibold text-lg">Sugarcane Nursery Manager</h2>
                        <p className="text-brand-100 text-sm">{formatFullDateIST(new Date())}</p>
                    </div>
                </div>
            </div>

            {/* ── Payment summary ───────────────────────────── */}
            <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        Payment Summary
                    </h3>
                    <Link to="/payments" className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1">
                        View all <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                {loading.payments || loading.orders ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[1,2,3,4].map((i) => <div key={i} className="shimmer h-16 rounded-xl" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Total Billed', value: paymentStats.totalBilled,  color: 'text-gray-900',    bg: 'bg-gray-50',    border: 'border-gray-100'   },
                            { label: 'Received',     value: paymentStats.totalPaid,    color: 'text-green-700',   bg: 'bg-green-50',   border: 'border-green-100'  },
                            { label: 'Pending',      value: paymentStats.totalPending, color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-100'    },
                            { label: 'Refund Due',   value: paymentStats.refundDue,    color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-100' },
                        ].map(({ label, value, color, bg, border }) => (
                            <div key={label} className={`${bg} border ${border} rounded-xl p-3 text-center`}>
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">{label}</p>
                                <p className={`text-sm font-bold ${color}`}>₹{value.toLocaleString('en-IN')}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Order stats ───────────────────────────────── */}
            <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-brand-600" />
                        Order Summary
                    </h3>
                    <Link to="/orders" className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
                        View all <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Pending',   value: stats.pending,   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-100'  },
                        { label: 'Confirmed', value: stats.confirmed, color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-100'   },
                        { label: 'Prepared',  value: stats.prepared,  color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
                        { label: 'Delivered', value: stats.delivered, color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-100'  },
                    ].map(({ label, value, color, bg, border }) => (
                        <div key={label} className={`${bg} border ${border} rounded-xl p-3 text-center`}>
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">{label}</p>
                            {loading.orders
                                ? <div className="shimmer h-5 w-8 rounded mx-auto" />
                                : <p className={`text-xl font-bold ${color}`}>{value}</p>
                            }
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Low stock alerts ──────────────────────────── */}
                <div className="card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Low Stock Alerts
                        </h3>
                        <Link to="/stock" className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {loading.stock ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl">
                                    <div className="shimmer h-4 w-32 rounded-md" />
                                    <div className="shimmer h-4 w-16 rounded-md" />
                                </div>
                            ))}
                        </div>
                    ) : lowStockItems.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">✅ All stock levels are healthy</p>
                    ) : (
                        <div className="space-y-2">
                            {lowStockItems.map(({ item, net }) => (
                                <div key={item} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                                    <span className="text-sm font-medium text-red-700">{ITEM_LABELS[item]}</span>
                                    <span className="text-sm font-bold text-red-600">
                                        {net < 0 ? '–' + Math.abs(net) : net} {ITEM_UNITS[item]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Stock summary ────────────────────────────── */}
                <div className="card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Package className="w-4 h-4 text-brand-600" />
                            Stock Summary
                        </h3>
                        <Link to="/add-stock" className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
                            Add stock <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {loading.stock ? (
                            [1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <div className="shimmer h-3.5 w-28 rounded-md" />
                                    <div className="shimmer h-3.5 w-14 rounded-md" />
                                </div>
                            ))
                        ) : stock.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No stock data yet</p>
                        ) : (
                            stock.map((s) => {
                                const net = netAvailable(s)
                                const threshold = LOW_STOCK_THRESHOLDS[s.item]
                                const isLow = threshold > 0 && net < threshold
                                return (
                                    <div key={s.item} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                        <span className="text-sm text-gray-600">{ITEM_LABELS[s.item] || s.item}</span>
                                        <span className={`text-sm font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                                            {net} <span className="text-xs font-normal text-gray-400">{ITEM_UNITS[s.item]}</span>
                                        </span>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ── Recent orders ────────────────────────────── */}
            <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-brand-600" />
                        Recent Orders
                    </h3>
                    <Link to="/orders" className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
                        View all <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                {loading.orders ? (
                    <>
                        {/* Mobile shimmer */}
                        <div className="md:hidden flex flex-col gap-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="shimmer h-5 w-32 rounded-md" />
                                        <div className="shimmer h-5 w-20 rounded-full" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[1, 2, 3, 4].map((j) => (
                                            <div key={j} className="shimmer h-12 rounded-lg" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Desktop shimmer */}
                        <div className="hidden md:block overflow-x-auto -mx-5 px-5">
                            <table className="w-full min-w-[500px]">
                                <thead>
                                    <tr>
                                        {['Customer', 'Acre', 'Trays', 'Delivery', 'Amount', 'Status', 'Actions'].map((h) => (
                                            <th key={h} className="table-th first:pl-0 first:rounded-l-lg last:rounded-r-lg">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[1, 2, 3, 4].map((i) => (
                                        <tr key={i}>
                                            <td className="table-td"><div className="shimmer h-4 w-28 rounded-md" /></td>
                                            <td className="table-td"><div className="shimmer h-4 w-10 rounded-md" /></td>
                                            <td className="table-td"><div className="shimmer h-4 w-10 rounded-md" /></td>
                                            <td className="table-td"><div className="shimmer h-4 w-20 rounded-md" /></td>
                                            <td className="table-td"><div className="shimmer h-4 w-20 rounded-md" /></td>
                                            <td className="table-td"><div className="shimmer h-5 w-20 rounded-full" /></td>
                                            <td className="table-td"><div className="shimmer h-6 w-14 rounded-lg" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : recentOrders.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-gray-400">No orders yet.</p>
                        <Link to="/place-order" className="btn-primary mt-4 inline-flex">Create First Order</Link>
                    </div>
                ) : (
                    <>
                        {/* Mobile Cards */}
                        <div className="md:hidden flex flex-col gap-3">
                            {recentOrders.map((o) => (
                                <OrderCard
                                    key={o.id}
                                    order={o}
                                    paid={payByOrder[o.id] || 0}
                                    loading={loading}
                                    onConfirm={() => confirmOrder(o.id)}
                                    onPrepare={() => prepareOrder(o.id)}
                                    onDeliver={() => deliverOrder(o.id)}
                                    onCancel={() => setCancelTarget(o)}
                                />
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto -mx-5 px-5">
                            <table className="w-full min-w-[500px]">
                                <thead>
                                    <tr>
                                        {['Customer', 'Acre', 'Trays', 'Delivery', 'Amount', 'Status', 'Actions'].map((h) => (
                                            <th key={h} className="table-th first:pl-0 first:rounded-l-lg last:rounded-r-lg">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.map((o) => (
                                        <OrderTableRow
                                            key={o.id}
                                            order={o}
                                            paid={payByOrder[o.id] || 0}
                                            loading={loading}
                                            onConfirm={() => confirmOrder(o.id)}
                                            onPrepare={() => prepareOrder(o.id)}
                                            onDeliver={() => deliverOrder(o.id)}
                                            onCancel={() => setCancelTarget(o)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <Modal
                open={!!cancelTarget}
                onClose={() => setCancelTarget(null)}
                title="Cancel Order"
                maxWidth="max-w-sm"
            >
                <p className="text-sm text-gray-600 mb-6">
                    Cancel order for <span className="font-semibold text-gray-900">{cancelTarget?.name}</span>? This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button className="flex-1 btn-ghost" onClick={() => setCancelTarget(null)}>
                        Keep Order
                    </button>
                    <button
                        className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                        disabled={loading[`cancel_${cancelTarget?.id}`]}
                        onClick={async () => {
                            await cancelOrder(cancelTarget.id)
                            setCancelTarget(null)
                        }}
                    >
                        {loading[`cancel_${cancelTarget?.id}`] ? '...' : 'Yes, Cancel'}
                    </button>
                </div>
            </Modal>
        </div>
    )
}

