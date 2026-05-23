import { useState, useMemo } from 'react'
import { CreditCard, Plus, CheckCircle, Search, IndianRupee, RotateCcw } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import Modal from '../components/Modal'
import { formatDateIST } from '../utils/dateUtils'

const PAYMENT_TYPES = ['ADVANCE', 'PARTIAL', 'SETTLEMENT']

function activePayStatus(totalAmount, paidAmount) {
    if (totalAmount == null || totalAmount === 0) return 'NO_AMOUNT'
    if (paidAmount <= 0) return 'UNPAID'
    if (paidAmount >= totalAmount) return 'PAID'
    return 'PARTIAL'
}

function PayBadge({ status }) {
    const cfg = {
        UNPAID:     { cls: 'bg-red-100 text-red-700',      label: 'Unpaid'     },
        PARTIAL:    { cls: 'bg-amber-100 text-amber-700',   label: 'Partial'    },
        PAID:       { cls: 'bg-green-100 text-green-700',   label: 'Paid'       },
        NO_AMOUNT:  { cls: 'bg-gray-100 text-gray-400',     label: 'No Rate'    },
        REFUND_DUE: { cls: 'bg-orange-100 text-orange-700', label: 'Refund Due' },
        REFUNDED:   { cls: 'bg-green-100 text-green-700',   label: 'Refunded'   },
    }
    const { cls, label } = cfg[status] || cfg.NO_AMOUNT
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
    )
}

function TypeTag({ type }) {
    const cfg = {
        ADVANCE:    'bg-blue-100 text-blue-700',
        PARTIAL:    'bg-amber-100 text-amber-700',
        SETTLEMENT: 'bg-green-100 text-green-700',
        REFUND:     'bg-red-100 text-red-700',
    }
    return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${cfg[type] || 'bg-gray-100 text-gray-500'}`}>
            {type}
        </span>
    )
}

export default function Payments() {
    const orders     = useAppStore((s) => s.orders)
    const payments   = useAppStore((s) => s.payments)
    const loading    = useAppStore((s) => s.loading)
    const addPayment = useAppStore((s) => s.addPayment)

    // Payment modal state
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [amount, setAmount] = useState('')
    const [type, setType]     = useState('PARTIAL')
    const [note, setNote]     = useState('')

    // Refund modal state
    const [refundOrder, setRefundOrder]   = useState(null)
    const [refundAmount, setRefundAmount] = useState('')
    const [refundNote, setRefundNote]     = useState('')

    const [search, setSearch]       = useState('')
    const [filterPay, setFilterPay] = useState('')

    // Group payment objects by order_id
    const payByOrder = useMemo(() => {
        const map = {}
        payments.forEach((p) => {
            if (!map[p.order_id]) map[p.order_id] = []
            map[p.order_id].push(p)
        })
        return map
    }, [payments])

    // Enrich each order with payment summary
    const rows = useMemo(() => {
        return orders
            .map((o) => {
                const isCancelled = o.status === 'CANCELLED'
                const total = (o.rate && o.seedlings_required)
                    ? parseFloat(o.rate) * parseFloat(o.seedlings_required)
                    : null
                const orderPayments = (payByOrder[o.id] || []).slice().sort(
                    (a, b) => new Date(a.date) - new Date(b.date)
                )
                // REFUND type subtracts from net paid
                const netPaid = orderPayments.reduce((s, p) =>
                    p.type === 'REFUND' ? s - Number(p.amount) : s + Number(p.amount)
                , 0)
                const balance = total != null ? Math.max(0, total - netPaid) : null

                let payStatus
                if (isCancelled) {
                    if (orderPayments.length === 0) payStatus = null
                    else if (netPaid > 0) payStatus = 'REFUND_DUE'
                    else payStatus = 'REFUNDED'
                } else {
                    payStatus = activePayStatus(total, netPaid)
                }

                return { ...o, total, paid: netPaid, balance, payStatus, orderPayments, isCancelled }
            })
            .filter((o) => {
                // Cancelled with no payment history → nothing to show
                if (o.isCancelled && o.orderPayments.length === 0) return false
                return true
            })
            .filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()))
            .filter((o) => !filterPay || o.payStatus === filterPay)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }, [orders, payByOrder, search, filterPay])

    // Summary:
    // - Total Billed & Pending → active orders only
    // - Received → all net payments (includes advance on cancelled orders until refunded)
    const stats = useMemo(() => {
        const active = rows.filter((o) => !o.isCancelled)
        return {
            totalBilled:  active.reduce((s, o) => s + (o.total || 0), 0),
            totalPaid:    rows.reduce((s, o) => s + Math.max(0, o.paid), 0), // net across all, refunds reduce it
            totalPending: active.reduce((s, o) => s + (o.balance || 0), 0),
        }
    }, [rows])

    const refundDueCount = rows.filter((o) => o.payStatus === 'REFUND_DUE').length

    // ── Payment modal handlers ──
    function openModal(order) {
        setSelectedOrder(order)
        setAmount('')
        setType('PARTIAL')
        setNote('')
    }

    function fillFullBalance() {
        if (selectedOrder?.balance > 0) {
            setAmount(String(selectedOrder.balance))
            setType('SETTLEMENT')
        }
    }

    async function handleSubmit() {
        if (!amount || Number(amount) <= 0 || !selectedOrder) return
        const ok = await addPayment(selectedOrder.id, Number(amount), type, note)
        if (ok) setSelectedOrder(null)
    }

    // ── Refund modal handlers ──
    function openRefundModal(order) {
        setRefundOrder(order)
        setRefundAmount(String(order.paid))
        setRefundNote('')
    }

    function fillFullRefund() {
        if (refundOrder?.paid > 0) setRefundAmount(String(refundOrder.paid))
    }

    async function handleRefundSubmit() {
        if (!refundAmount || Number(refundAmount) <= 0 || !refundOrder) return
        const ok = await addPayment(refundOrder.id, Number(refundAmount), 'REFUND', refundNote || 'Refund issued')
        if (ok) setRefundOrder(null)
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="card p-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <CreditCard className="w-7 h-7 opacity-80" />
                        <div>
                            <h2 className="font-semibold text-lg">Payments</h2>
                            <p className="text-emerald-100 text-sm">
                                {rows.filter((o) => !o.isCancelled).length} active order{rows.filter((o) => !o.isCancelled).length !== 1 ? 's' : ''}
                                {refundDueCount > 0 && ` · ${refundDueCount} refund${refundDueCount !== 1 ? 's' : ''} pending`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary cards — active orders only */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Total Billed', value: stats.totalBilled,  color: 'text-gray-900'  },
                    { label: 'Received',     value: stats.totalPaid,    color: 'text-green-600' },
                    { label: 'Pending',      value: stats.totalPending, color: 'text-red-600'   },
                ].map(({ label, value, color }) => (
                    <div key={label} className="card p-3 text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">{label}</p>
                        {loading.payments
                            ? <div className="shimmer h-5 w-16 rounded mx-auto" />
                            : <p className={`text-sm font-bold ${color}`}>₹{value.toLocaleString('en-IN')}</p>
                        }
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="card p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            className="input pl-9"
                            placeholder="Search customer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select className="input" value={filterPay} onChange={(e) => setFilterPay(e.target.value)}>
                        <option value="">All Payment Status</option>
                        <option value="UNPAID">Unpaid</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="PAID">Paid</option>
                        <option value="REFUND_DUE">Refund Due</option>
                        <option value="REFUNDED">Refunded</option>
                    </select>
                </div>
            </div>

            {/* Order payment cards */}
            <div className="space-y-3">
                {loading.payments && [1, 2, 3].map((i) => (
                    <div key={i} className="card p-4 space-y-3">
                        <div className="flex justify-between">
                            <div className="shimmer h-5 w-36 rounded" />
                            <div className="shimmer h-5 w-16 rounded-full" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[1,2,3].map((j) => <div key={j} className="shimmer h-14 rounded-lg" />)}
                        </div>
                    </div>
                ))}

                {!loading.payments && rows.length === 0 && (
                    <div className="card p-10 text-center text-gray-400 text-sm">No orders found</div>
                )}

                {!loading.payments && rows.map((o) => (
                    <div key={o.id} className="card p-4 space-y-3">
                        {/* Order header */}
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h3 className={`font-bold ${o.isCancelled ? 'text-gray-400' : 'text-gray-900'}`}>{o.name}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {o.status} · Delivery {formatDateIST(o.delivery_date)}
                                </p>
                            </div>
                            <PayBadge status={o.payStatus} />
                        </div>

                        {/* Cancelled banners */}
                        {o.isCancelled && o.payStatus === 'REFUND_DUE' && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-orange-800">Order Cancelled — Refund Pending</p>
                                    <p className="text-xs text-orange-600 mt-0.5">
                                        ₹{o.paid.toLocaleString('en-IN')} advance received — needs to be returned
                                    </p>
                                </div>
                                <span className="text-lg font-bold text-orange-700 shrink-0 ml-2">
                                    ₹{o.paid.toLocaleString('en-IN')}
                                </span>
                            </div>
                        )}
                        {o.isCancelled && o.payStatus === 'REFUNDED' && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                                <p className="text-sm font-semibold text-green-800">Order Cancelled — Refund Completed</p>
                            </div>
                        )}

                        {/* Amount breakdown — active orders only */}
                        {!o.isCancelled && (
                            o.total != null ? (
                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                                        <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Total</p>
                                        <p className="font-bold text-gray-800">₹{o.total.toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-2.5 border border-green-100/60">
                                        <p className="text-[10px] uppercase text-green-600/80 font-bold tracking-wider mb-1">Received</p>
                                        <p className="font-bold text-green-700">₹{o.paid.toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className={`rounded-xl p-2.5 border ${o.balance > 0 ? 'bg-red-50 border-red-100/60' : 'bg-gray-50 border-gray-100'}`}>
                                        <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${o.balance > 0 ? 'text-red-600/80' : 'text-gray-400'}`}>
                                            Pending
                                        </p>
                                        <p className={`font-bold ${o.balance > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                                            ₹{o.balance.toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">No rate set — amount not available</p>
                            )
                        )}

                        {/* Payment history */}
                        {o.orderPayments.length > 0 && (
                            <div className="border-t border-gray-100 pt-3 space-y-2">
                                <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Payment History</p>
                                {o.orderPayments.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <TypeTag type={p.type} />
                                            <span className="text-xs text-gray-400 truncate">
                                                {p.note || formatDateIST(p.date)}
                                            </span>
                                        </div>
                                        <span className={`text-sm font-semibold shrink-0 ml-2 ${p.type === 'REFUND' ? 'text-red-600' : 'text-gray-800'}`}>
                                            {p.type === 'REFUND' ? '−' : '+'}₹{Number(p.amount).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        {!o.isCancelled && o.payStatus !== 'PAID' && o.payStatus !== 'NO_AMOUNT' && (
                            <div className="border-t border-gray-100 pt-3">
                                <button
                                    className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                    onClick={() => openModal(o)}
                                >
                                    <Plus className="w-4 h-4" /> Add Payment
                                </button>
                            </div>
                        )}
                        {!o.isCancelled && o.payStatus === 'PAID' && (
                            <div className="border-t border-gray-100 pt-3 flex items-center justify-center gap-1.5 text-green-600 text-sm font-semibold">
                                <CheckCircle className="w-4 h-4" /> Fully Settled
                            </div>
                        )}
                        {o.isCancelled && o.payStatus === 'REFUND_DUE' && (
                            <div className="border-t border-gray-100 pt-3">
                                <button
                                    className="w-full bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                    onClick={() => openRefundModal(o)}
                                >
                                    <RotateCcw className="w-4 h-4" /> Record Refund
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Payment Modal */}
            <Modal
                open={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                title={`Add Payment — ${selectedOrder?.name}`}
                maxWidth="max-w-sm"
            >
                <div className="space-y-4">
                    {selectedOrder?.balance > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                            <span className="text-sm text-amber-700 font-medium">Balance due</span>
                            <span className="text-sm font-bold text-amber-900">
                                ₹{selectedOrder.balance.toLocaleString('en-IN')}
                            </span>
                        </div>
                    )}
                    <div>
                        <label className="label">Amount (₹)</label>
                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="number"
                                className="input pl-8"
                                placeholder="0"
                                min="1"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="label">Payment Type</label>
                        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                            {PAYMENT_TYPES.map((t) => (
                                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label">Note (optional)</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g. cash, cheque #1234..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                    {selectedOrder?.balance > 0 && (
                        <button
                            type="button"
                            className="w-full bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            onClick={fillFullBalance}
                        >
                            <CheckCircle className="w-4 h-4" />
                            Settle Full Balance (₹{selectedOrder.balance.toLocaleString('en-IN')})
                        </button>
                    )}
                    <div className="flex gap-3 pt-1">
                        <button className="flex-1 btn-ghost" onClick={() => setSelectedOrder(null)}>Cancel</button>
                        <button
                            className="flex-1 bg-emerald-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                            disabled={!amount || Number(amount) <= 0 || loading.addPayment}
                            onClick={handleSubmit}
                        >
                            {loading.addPayment
                                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : 'Record Payment'
                            }
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Record Refund Modal */}
            <Modal
                open={!!refundOrder}
                onClose={() => setRefundOrder(null)}
                title={`Record Refund — ${refundOrder?.name}`}
                maxWidth="max-w-sm"
            >
                <div className="space-y-4">
                    {/* Before/after preview */}
                    {(() => {
                        const current = refundOrder?.paid || 0
                        const refAmt  = Number(refundAmount) || 0
                        const after   = Math.max(0, current - refAmt)
                        return (
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Advance received</span>
                                    <span className="font-semibold text-gray-800">₹{current.toLocaleString('en-IN')}</span>
                                </div>
                                {refAmt > 0 && (
                                    <>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-orange-600">Refund amount</span>
                                            <span className="font-semibold text-orange-700">− ₹{refAmt.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-sm">
                                            <span className="font-semibold text-gray-600">Remaining with you</span>
                                            <span className={`font-bold ${after === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                                ₹{after.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })()}

                    <div>
                        <label className="label">Refund Amount (₹)</label>
                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="number"
                                className="input pl-8"
                                placeholder="0"
                                min="1"
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="label">Note (optional)</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g. cash returned, bank transfer..."
                            value={refundNote}
                            onChange={(e) => setRefundNote(e.target.value)}
                        />
                    </div>
                    {refundOrder?.paid > 0 && (
                        <button
                            type="button"
                            className="w-full bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            onClick={fillFullRefund}
                        >
                            <RotateCcw className="w-4 h-4" />
                            Refund Full Amount (₹{refundOrder.paid.toLocaleString('en-IN')})
                        </button>
                    )}
                    <div className="flex gap-3 pt-1">
                        <button className="flex-1 btn-ghost" onClick={() => setRefundOrder(null)}>Cancel</button>
                        <button
                            className="flex-1 bg-orange-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                            disabled={!refundAmount || Number(refundAmount) <= 0 || loading.addPayment}
                            onClick={handleRefundSubmit}
                        >
                            {loading.addPayment
                                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : 'Confirm Refund'
                            }
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
