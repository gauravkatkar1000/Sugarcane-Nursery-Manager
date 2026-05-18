import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronUp, ChevronDown, Plus, ClipboardList } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import StatusBadge from '../components/StatusBadge'
import { ORDER_STATUSES } from '../utils/constants'
import { formatDateIST } from '../utils/dateUtils'

const PAGE_SIZE = 10

export default function Orders() {
    const orders = useAppStore((s) => s.orders)
    const loading = useAppStore((s) => s.loading)
    const confirmOrder = useAppStore((s) => s.confirmOrder)
    const prepareOrder = useAppStore((s) => s.prepareOrder)
    const deliverOrder = useAppStore((s) => s.deliverOrder)
    const cancelOrder = useAppStore((s) => s.cancelOrder)

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [sortKey, setSortKey] = useState('created_at')
    const [sortDir, setSortDir] = useState('desc')
    const [page, setPage] = useState(1)

    const handleSort = (key) => {
        if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(key); setSortDir('asc') }
    }

    const filtered = useMemo(() => {
        return orders
            .filter((o) => {
                if (search && !o.name.toLowerCase().includes(search.toLowerCase())) return false
                if (statusFilter && o.status !== statusFilter) return false
                if (dateFrom && o.delivery_date < dateFrom) return false
                if (dateTo && o.delivery_date > dateTo) return false
                return true
            })
            .sort((a, b) => {
                const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
                const numericKeys = ['acre', 'trays_required']
                if (numericKeys.includes(sortKey)) {
                    return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
                }
                return sortDir === 'asc'
                    ? String(av).localeCompare(String(bv))
                    : String(bv).localeCompare(String(av))
            })
    }, [orders, search, statusFilter, dateFrom, dateTo, sortKey, sortDir])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const SortIcon = ({ col }) => {
        if (sortKey !== col) return null
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="card p-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <ClipboardList className="w-7 h-7 opacity-80" />
                        <div>
                            <h2 className="font-semibold text-lg">Orders</h2>
                            <p className="text-brand-100 text-sm">{orders.length} total order{orders.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <Link to="/place-order" className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-1.5 transition-colors shrink-0">
                        <Plus className="w-4 h-4" /> New Order
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            id="search-orders"
                            className="input pl-9"
                            placeholder="Search customer..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        />
                    </div>
                    <select
                        id="filter-status"
                        className="input"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                    >
                        <option value="">All Statuses</option>
                        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input type="date" className="input" placeholder="From" value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
                    <input type="date" className="input" placeholder="To" value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                {/* Mobile Cards */}
                <div className="md:hidden flex flex-col gap-3 p-4 bg-gray-50">
                    {loading.orders && [1, 2, 3].map((i) => (
                        <div key={i} className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="shimmer h-5 w-32 rounded-md" />
                                <div className="shimmer h-5 w-20 rounded-full" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {[1, 2, 3, 4].map((j) => <div key={j} className="shimmer h-12 rounded-lg" />)}
                            </div>
                            <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-2">
                                <div className="shimmer h-9 rounded-lg" />
                                <div className="shimmer h-9 rounded-lg" />
                            </div>
                        </div>
                    ))}
                    {!loading.orders && paged.length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-8">No orders found</p>
                    )}
                    {!loading.orders && paged.map((o) => {
                        const amount = o.rate && o.seedlings_required
                            ? parseFloat(o.rate) * parseFloat(o.seedlings_required)
                            : null
                        const anyBusy = !!(loading[`confirm_${o.id}`] || loading[`prepare_${o.id}`] || loading[`deliver_${o.id}`] || loading[`cancel_${o.id}`])
                        return (
                        <div key={o.id} className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 text-lg">{o.name}</h3>
                                <StatusBadge status={o.status} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-center text-sm">
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
                                <div className="bg-green-50 rounded-lg p-2 border border-green-100/50">
                                    <p className="text-[10px] uppercase text-green-600/80 font-bold tracking-wider mb-0.5">Amount</p>
                                    <p className="font-semibold text-green-700 text-xs sm:text-sm mt-0.5">
                                        {amount != null ? `₹${amount.toLocaleString('en-IN')}` : '—'}
                                    </p>
                                </div>
                            </div>
                            <div className="border-t border-gray-100 pt-3">
                                <div className="grid grid-cols-2 gap-2">
                                    {o.status === 'PENDING' && (
                                        <ActionBtn fullWidth id={`m-confirm-${o.id}`} label="Confirm" color="blue" loading={loading[`confirm_${o.id}`]} disabled={anyBusy} onClick={() => confirmOrder(o.id)} />
                                    )}
                                    {o.status === 'CONFIRMED' && (
                                        <ActionBtn fullWidth id={`m-prepare-${o.id}`} label="Prepare" color="purple" loading={loading[`prepare_${o.id}`]} disabled={anyBusy} onClick={() => prepareOrder(o.id)} />
                                    )}
                                    {o.status === 'PREPARED' && (
                                        <ActionBtn fullWidth id={`m-deliver-${o.id}`} label="Deliver" color="green" loading={loading[`deliver_${o.id}`]} disabled={anyBusy} onClick={() => deliverOrder(o.id)} />
                                    )}
                                    {['PENDING', 'CONFIRMED', 'PREPARED'].includes(o.status) && (
                                        <ActionBtn fullWidth id={`m-cancel-${o.id}`} label="Cancel" color="red" loading={loading[`cancel_${o.id}`]} disabled={anyBusy} onClick={() => cancelOrder(o.id)} />
                                    )}
                                </div>
                            </div>
                        </div>
                        )
                    })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr>
                                {[
                                    { key: 'name', label: 'Customer' },
                                    { key: 'acre', label: 'Acre' },
                                    { key: 'trays_required', label: 'Trays' },
                                    { key: 'delivery_date', label: 'Delivery' },
                                    { key: null, label: 'Amount' },
                                    { key: 'status', label: 'Status' },
                                    { key: null, label: 'Actions' },
                                ].map(({ key, label }) => (
                                    <th
                                        key={label}
                                        className={`table-th ${key ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
                                        onClick={() => key && handleSort(key)}
                                    >
                                        <span className="flex items-center gap-1">
                                            {label}
                                            {key && <SortIcon col={key} />}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading.orders && [1, 2, 3, 4, 5].map((i) => (
                                <tr key={i}>
                                    <td className="table-td"><div className="shimmer h-4 w-28 rounded-md" /></td>
                                    <td className="table-td"><div className="shimmer h-4 w-10 rounded-md" /></td>
                                    <td className="table-td"><div className="shimmer h-4 w-10 rounded-md" /></td>
                                    <td className="table-td"><div className="shimmer h-4 w-20 rounded-md" /></td>
                                    <td className="table-td"><div className="shimmer h-4 w-20 rounded-md" /></td>
                                    <td className="table-td"><div className="shimmer h-5 w-20 rounded-full" /></td>
                                    <td className="table-td">
                                        <div className="flex gap-1">
                                            <div className="shimmer h-6 w-16 rounded-lg" />
                                            <div className="shimmer h-6 w-14 rounded-lg" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading.orders && paged.length === 0 && (
                                <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">No orders found</td></tr>
                            )}
                            {!loading.orders && paged.map((o) => (
                                <OrderRow
                                    key={o.id}
                                    order={o}
                                    loading={loading}
                                    onConfirm={() => confirmOrder(o.id)}
                                    onPrepare={() => prepareOrder(o.id)}
                                    onDeliver={() => deliverOrder(o.id)}
                                    onCancel={() => cancelOrder(o.id)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-500">{filtered.length} orders</p>
                        <div className="flex gap-2">
                            <button className="btn-ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                            <span className="text-xs text-gray-500 self-center">Page {page}/{totalPages}</span>
                            <button className="btn-ghost" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function OrderRow({ order, loading, onConfirm, onPrepare, onDeliver, onCancel }) {
    const busy = (key) => !!loading[`${key}_${order.id}`]
    const anyBusy = busy('confirm') || busy('prepare') || busy('deliver') || busy('cancel')

    const amount = order.rate && order.seedlings_required
        ? parseFloat(order.rate) * parseFloat(order.seedlings_required)
        : null

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="table-td font-medium text-gray-900">{order.name}</td>
            <td className="table-td">{order.acre}</td>
            <td className="table-td">{order.trays_required}</td>
            <td className="table-td text-gray-500">{formatDateIST(order.delivery_date)}</td>
            <td className="table-td font-medium text-gray-900">
                {amount != null ? `₹${amount.toLocaleString('en-IN')}` : <span className="text-gray-300">—</span>}
            </td>
            <td className="table-td"><StatusBadge status={order.status} /></td>
            <td className="table-td">
                <div className="flex items-center gap-1 flex-wrap">
                    {order.status === 'PENDING' && (
                        <ActionBtn id={`confirm-${order.id}`} label="Confirm" color="blue" loading={busy('confirm')} disabled={anyBusy} onClick={onConfirm} />
                    )}
                    {order.status === 'CONFIRMED' && (
                        <ActionBtn id={`prepare-${order.id}`} label="Prepare" color="purple" loading={busy('prepare')} disabled={anyBusy} onClick={onPrepare} />
                    )}
                    {order.status === 'PREPARED' && (
                        <ActionBtn id={`deliver-${order.id}`} label="Deliver" color="green" loading={busy('deliver')} disabled={anyBusy} onClick={onDeliver} />
                    )}
                    {['PENDING', 'CONFIRMED', 'PREPARED'].includes(order.status) && (
                        <ActionBtn id={`cancel-${order.id}`} label="Cancel" color="red" loading={busy('cancel')} disabled={anyBusy} onClick={onCancel} />
                    )}
                </div>
            </td>
        </tr>
    )
}

function ActionBtn({ id, label, color, loading, disabled, onClick, fullWidth }) {
    const colors = {
        blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
        purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
        green: 'bg-green-100 text-green-700 hover:bg-green-200',
        red: 'bg-red-100 text-red-700 hover:bg-red-200',
    }
    const widthClass = fullWidth ? 'w-full py-2 text-sm flex justify-center items-center' : 'px-2.5 py-1 text-xs'
    return (
        <button
            id={id}
            onClick={onClick}
            disabled={disabled}
            className={`${widthClass} rounded-lg font-semibold transition-colors disabled:opacity-50 ${colors[color]}`}
        >
            {loading
                ? <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : label
            }
        </button>
    )
}
