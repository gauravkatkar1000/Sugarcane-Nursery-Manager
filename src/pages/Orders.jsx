import { useState, useMemo, useCallback } from 'react'
import { Search, Filter, ChevronUp, ChevronDown } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { ORDER_STATUSES } from '../utils/constants'
import { format, isWithinInterval, parseISO } from 'date-fns'

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
                const av = a[sortKey] || '', bv = b[sortKey] || ''
                return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
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
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr>
                                {[
                                    { key: 'name', label: 'Customer' },
                                    { key: 'acre', label: 'Acre' },
                                    { key: 'trays_required', label: 'Trays' },
                                    { key: 'delivery_date', label: 'Delivery' },
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
                            {loading.orders && (
                                <tr><td colSpan={6} className="py-12 text-center"><LoadingSpinner /></td></tr>
                            )}
                            {!loading.orders && paged.length === 0 && (
                                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No orders found</td></tr>
                            )}
                            {paged.map((o) => (
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

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="table-td font-medium text-gray-900">{order.name}</td>
            <td className="table-td">{order.acre}</td>
            <td className="table-td">{order.trays_required}</td>
            <td className="table-td text-gray-500">{order.delivery_date}</td>
            <td className="table-td"><StatusBadge status={order.status} /></td>
            <td className="table-td">
                <div className="flex items-center gap-1 flex-wrap">
                    {order.status === 'PENDING' && (
                        <ActionBtn id={`confirm-${order.id}`} label="Confirm" color="blue" loading={busy('confirm')} onClick={onConfirm} />
                    )}
                    {order.status === 'CONFIRMED' && (
                        <ActionBtn id={`prepare-${order.id}`} label="Prepare" color="purple" loading={busy('prepare')} onClick={onPrepare} />
                    )}
                    {order.status === 'PREPARED' && (
                        <ActionBtn id={`deliver-${order.id}`} label="Deliver" color="green" loading={busy('deliver')} onClick={onDeliver} />
                    )}
                    {['PENDING', 'CONFIRMED', 'PREPARED'].includes(order.status) && (
                        <ActionBtn id={`cancel-${order.id}`} label="Cancel" color="red" loading={busy('cancel')} onClick={onCancel} />
                    )}
                </div>
            </td>
        </tr>
    )
}

function ActionBtn({ id, label, color, loading, onClick }) {
    const colors = {
        blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
        purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
        green: 'bg-green-100 text-green-700 hover:bg-green-200',
        red: 'bg-red-100 text-red-700 hover:bg-red-200',
    }
    return (
        <button
            id={id}
            onClick={onClick}
            disabled={loading}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${colors[color]}`}
        >
            {loading ? <LoadingSpinner size="sm" /> : label}
        </button>
    )
}
