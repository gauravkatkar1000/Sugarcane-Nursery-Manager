import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Package, ShoppingCart, AlertTriangle, TrendingUp, ArrowRight, Sprout } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { ITEM_LABELS, ITEM_UNITS, LOW_STOCK_THRESHOLDS } from '../utils/constants'
import { getStockItem, netAvailable } from '../utils/stock'
import { formatFullDateIST, formatDateIST } from '../utils/dateUtils'
export default function Dashboard() {
    const orders = useAppStore((s) => s.orders)
    const stock = useAppStore((s) => s.stock)
    const loading = useAppStore((s) => s.loading)

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
        [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
        , [orders])

    return (
        <div className="space-y-6">
            {/* ── Welcome banner ────────────────────────────── */}
            <div className="card p-5 bg-gradient-to-r from-brand-600 to-brand-500 text-white">
                <div className="flex items-center gap-3">
                    <Sprout className="w-8 h-8 opacity-80" />
                    <div>
                        <h2 className="font-semibold text-lg">Sugarcane Nursery Manager</h2>
                        <p className="text-brand-100 text-sm">
                            {formatFullDateIST(new Date())}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Order stats ───────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Confirmed', value: stats.confirmed, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Prepared', value: stats.prepared, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Delivered', value: stats.delivered, color: 'text-green-600', bg: 'bg-green-50' },
                ].map(({ label, value, color, bg }) => (
                    <div key={label} className="card p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                        {loading.orders ? (
                            <p className={`text-3xl font-bold mt-1 text-gray-300 animate-pulse`}>...</p>
                        ) : (
                            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">orders</p>
                    </div>
                ))}
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
                    {lowStockItems.length === 0 ? (
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
                            <div className="py-8 flex justify-center">
                                <LoadingSpinner size="md" />
                            </div>
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
                    <div className="py-12 flex justify-center">
                        <LoadingSpinner size="lg" />
                    </div>
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
                                <div key={o.id} className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-gray-900 text-lg">{o.name}</h3>
                                        <StatusBadge status={o.status} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                                            <p className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-0.5">Acre</p>
                                            <p className="font-semibold text-gray-800">{o.acre}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                                            <p className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-0.5">Trays</p>
                                            <p className="font-semibold text-gray-800">{o.trays_required}</p>
                                        </div>
                                        <div className="bg-brand-50 rounded-lg p-2 border border-brand-100/50">
                                            <p className="text-[10px] uppercase text-brand-600/80 font-bold tracking-wider mb-0.5">Target</p>
                                            <p className="font-semibold text-brand-700 text-xs sm:text-sm mt-0.5">{formatDateIST(o.delivery_date)}</p>
                                        </div>
                                    </div>
                                    {['PENDING', 'CONFIRMED', 'PREPARED'].includes(o.status) && (
                                        <div className="border-t border-gray-100 pt-3 flex w-full">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (confirm(`Cancel order for ${o.name}?`)) {
                                                        useAppStore.getState().cancelOrder(o.id);
                                                    }
                                                }}
                                                className="w-full text-sm bg-red-100 text-red-700 px-3 py-2 flex justify-center items-center rounded-lg font-semibold hover:bg-red-200 transition-colors"
                                            >
                                                {loading[`cancel_${o.id}`] ? '...' : 'Cancel Order'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto -mx-5 px-5">
                            <table className="w-full min-w-[500px]">
                                <thead>
                                    <tr>
                                        {['Customer', 'Acre', 'Trays', 'Delivery', 'Status', 'Actions'].map((h) => (
                                            <th key={h} className="table-th first:pl-0 first:rounded-l-lg last:rounded-r-lg">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.map((o) => (
                                        <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="table-td font-medium text-gray-900">{o.name}</td>
                                            <td className="table-td">{o.acre} ac</td>
                                            <td className="table-td">{o.trays_required}</td>
                                            <td className="table-td">{formatDateIST(o.delivery_date)}</td>
                                            <td className="table-td"><StatusBadge status={o.status} /></td>
                                            <td className="table-td">
                                                {['PENDING', 'CONFIRMED', 'PREPARED'].includes(o.status) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (confirm(`Cancel order for ${o.name}?`)) {
                                                                useAppStore.getState().cancelOrder(o.id);
                                                            }
                                                        }}
                                                        className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-lg font-semibold hover:bg-red-200 transition-colors"
                                                    >
                                                        {loading[`cancel_${o.id}`] ? '...' : 'Cancel'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
