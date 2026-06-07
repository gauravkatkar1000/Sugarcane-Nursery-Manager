import { useState } from 'react'
import { IndianRupee, CheckCircle } from 'lucide-react'
import StatusBadge from './StatusBadge'
import Modal from './Modal'
import useAppStore from '../store/useAppStore'
import { formatDateIST } from '../utils/dateUtils'

const PAYMENT_TYPES = ['ADVANCE', 'PARTIAL', 'SETTLEMENT']

// ── Payment helpers ──────────────────────────────────────────
export function computePayStatus(total, netPaid, isCancelled) {
    if (isCancelled) return netPaid > 0 ? 'REFUND_DUE' : null
    if (total == null || total === 0) return null
    if (netPaid <= 0) return 'UNPAID'
    if (netPaid >= total) return 'PAID'
    return 'PARTIAL'
}

const PAY_BADGE = {
    UNPAID:     { cls: 'bg-red-100 text-red-600',      label: 'Unpaid'     },
    PARTIAL:    { cls: 'bg-amber-100 text-amber-600',   label: 'Partial'    },
    PAID:       { cls: 'bg-green-100 text-green-600',   label: 'Paid'       },
    REFUND_DUE: { cls: 'bg-orange-100 text-orange-700', label: 'Refund Due' },
}

// ── Shared action button ─────────────────────────────────────
export function ActionBtn({ id, label, color, loading, disabled, onClick, fullWidth, small }) {
    const colors = {
        blue:    'bg-blue-100 text-blue-700 hover:bg-blue-200',
        purple:  'bg-purple-100 text-purple-700 hover:bg-purple-200',
        green:   'bg-green-100 text-green-700 hover:bg-green-200',
        red:     'bg-red-100 text-red-700 hover:bg-red-200',
        emerald: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
    }
    const sizeCls = fullWidth
        ? 'w-full py-2 text-sm flex justify-center items-center'
        : small
            ? 'px-2 py-1 text-[11px]'
            : 'px-2.5 py-1 text-xs'
    return (
        <button
            id={id}
            onClick={onClick}
            disabled={disabled}
            className={`${sizeCls} rounded-lg font-semibold transition-colors disabled:opacity-50 ${colors[color]}`}
        >
            {loading
                ? <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : label
            }
        </button>
    )
}

// ── Inline payment modal (shared by card + row) ──────────────
function PayModal({ order, total, paid, onClose }) {
    const addPayment = useAppStore((s) => s.addPayment)
    const loading    = useAppStore((s) => s.loading)

    const balance = total != null ? Math.max(0, total - paid) : null

    const [amount, setAmount] = useState('')
    const [type, setType]     = useState('PARTIAL')
    const [note, setNote]     = useState('')

    function fillBalance() {
        if (balance > 0) { setAmount(String(balance)); setType('SETTLEMENT') }
    }

    async function handleSubmit() {
        if (!amount || Number(amount) <= 0) return
        const ok = await addPayment(order.id, Number(amount), type, note)
        if (ok) onClose()
    }

    return (
        <Modal open onClose={onClose} title={`Add Payment — ${order.name}`} maxWidth="max-w-sm">
            <div className="space-y-4">
                {balance > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                        <span className="text-sm text-amber-700 font-medium">Balance due</span>
                        <span className="text-sm font-bold text-amber-900">₹{balance.toLocaleString('en-IN')}</span>
                    </div>
                )}
                <div>
                    <label className="label">Amount (₹)</label>
                    <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="number" className="input pl-8" placeholder="0" min="1"
                            value={amount} onChange={(e) => setAmount(e.target.value)} />
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
                    <input type="text" className="input" placeholder="e.g. cash, cheque #1234..."
                        value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                {balance > 0 && (
                    <button type="button" onClick={fillBalance}
                        className="w-full bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors">
                        <CheckCircle className="w-4 h-4" />
                        Settle Full Balance (₹{balance.toLocaleString('en-IN')})
                    </button>
                )}
                <div className="flex gap-3 pt-1">
                    <button className="flex-1 btn-ghost" onClick={onClose}>Cancel</button>
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
    )
}

// ── Mobile card ──────────────────────────────────────────────
// '-' means not applicable — treat same as empty
const hasVal = (v) => v && v !== '-'

export function OrderCard({ order, paid = 0, loading, onConfirm, onPrepare, onDeliver, onCancel }) {
    const [showPay, setShowPay] = useState(false)

    const isExcess  = order.order_type === 'EXCESS_SUGARCANE'
    const excessQty = isExcess ? Number(order.excess_qty || 0) : 0
    const isCancelled = order.status === 'CANCELLED'
    // Prefer saved total_amount; fall back to computed for old orders
    const total = order.total_amount
        ? Number(order.total_amount)
        : order.rate
            ? isExcess
                ? excessQty ? parseFloat(order.rate) * excessQty : null
                : order.seedlings_required ? parseFloat(order.rate) * parseFloat(order.seedlings_required) : null
            : null
    const balance    = total != null ? Math.max(0, total - paid) : null
    const payStatus  = computePayStatus(total, paid, isCancelled)
    const canPay     = !isCancelled && total != null && payStatus !== 'PAID'
    const anyBusy    = !!(
        loading[`confirm_${order.id}`] ||
        loading[`prepare_${order.id}`] ||
        loading[`deliver_${order.id}`] ||
        loading[`cancel_${order.id}`]
    )

    return (
        <>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                {/* Header strip */}
                <div className="flex items-start justify-between px-4 pt-4 pb-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-base leading-tight">{order.name}</h3>
                            {isExcess && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Excess Sugarcane</span>
                            )}
                        </div>
                        {(hasVal(order.location) || (hasVal(order.variety) && !isExcess)) && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {hasVal(order.location) && (
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">📍 {order.location}</span>
                                )}
                                {hasVal(order.variety) && !isExcess && (
                                    <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full font-medium">🌿 {order.variety}</span>
                                )}
                            </div>
                        )}
                    </div>
                    <StatusBadge status={order.status} />
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-0 px-4 pb-3 border-b border-gray-100">
                    {isExcess ? (
                        <>
                            <div className="flex-1 text-center">
                                <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Qty (kg)</p>
                                <p className="text-sm font-semibold text-amber-700 mt-0.5">{excessQty}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex-1 text-center">
                                <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Acre</p>
                                <p className="text-sm font-semibold text-gray-800 mt-0.5">{order.acre}</p>
                            </div>
                            <div className="w-px h-8 bg-gray-100" />
                            <div className="flex-1 text-center">
                                <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Trays</p>
                                <p className="text-sm font-semibold text-gray-800 mt-0.5">{order.trays_required}</p>
                            </div>
                        </>
                    )}
                    <div className="w-px h-8 bg-gray-100" />
                    <div className="flex-1 text-center">
                        <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Delivery</p>
                        <p className="text-sm font-semibold text-brand-700 mt-0.5">{formatDateIST(order.delivery_date)}</p>
                    </div>
                </div>

                {/* Amount + payment status */}
                <div className="px-4 py-3">
                    {total != null ? (
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className={`text-lg font-bold ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                    ₹{total.toLocaleString('en-IN')}
                                </p>
                                {/* Payment info */}
                                {isCancelled && paid > 0 && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">Refund Due</span>
                                        <span className="text-xs text-orange-600">₹{paid.toLocaleString('en-IN')} advance</span>
                                    </div>
                                )}
                                {!isCancelled && payStatus && (
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${PAY_BADGE[payStatus].cls}`}>
                                            {PAY_BADGE[payStatus].label}
                                        </span>
                                        {paid > 0 && payStatus !== 'PAID' && (
                                            <span className="text-xs text-green-600">₹{paid.toLocaleString('en-IN')} paid</span>
                                        )}
                                        {balance > 0 && (
                                            <span className="text-xs text-red-500">₹{balance.toLocaleString('en-IN')} due</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {canPay && (
                                <button
                                    onClick={() => setShowPay(true)}
                                    className="shrink-0 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                                >
                                    + Pay
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">No rate set</p>
                    )}
                </div>

                {/* Action buttons */}
                {['PENDING', 'CONFIRMED', 'PREPARED'].includes(order.status) && (
                    <div className="px-4 pb-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                        {order.status === 'PENDING' && (
                            <ActionBtn fullWidth id={`m-confirm-${order.id}`} label="Confirm" color="blue"
                                loading={loading[`confirm_${order.id}`]} disabled={anyBusy} onClick={onConfirm} />
                        )}
                        {order.status === 'CONFIRMED' && !isExcess && (
                            <ActionBtn fullWidth id={`m-prepare-${order.id}`} label="Prepare" color="purple"
                                loading={loading[`prepare_${order.id}`]} disabled={anyBusy} onClick={onPrepare} />
                        )}
                        {(order.status === 'PREPARED' || (isExcess && order.status === 'CONFIRMED')) && (
                            <ActionBtn fullWidth id={`m-deliver-${order.id}`} label="Deliver" color="green"
                                loading={loading[`deliver_${order.id}`]} disabled={anyBusy} onClick={onDeliver} />
                        )}
                        <ActionBtn fullWidth id={`m-cancel-${order.id}`} label="Cancel" color="red"
                            loading={loading[`cancel_${order.id}`]} disabled={anyBusy} onClick={onCancel} />
                    </div>
                )}
            </div>

            {showPay && (
                <PayModal order={order} total={total} paid={paid} onClose={() => setShowPay(false)} />
            )}
        </>
    )
}

// ── Desktop table row ────────────────────────────────────────
export function OrderTableRow({ order, paid = 0, loading, onConfirm, onPrepare, onDeliver, onCancel }) {
    const [showPay, setShowPay] = useState(false)

    const isExcess    = order.order_type === 'EXCESS_SUGARCANE'
    const excessQty   = isExcess ? Number(order.excess_qty || 0) : 0
    const isCancelled = order.status === 'CANCELLED'
    const busy = (key) => !!loading[`${key}_${order.id}`]
    const anyBusy = busy('confirm') || busy('prepare') || busy('deliver') || busy('cancel')

    const total = order.total_amount
        ? Number(order.total_amount)
        : order.rate
            ? isExcess
                ? excessQty ? parseFloat(order.rate) * excessQty : null
                : order.seedlings_required ? parseFloat(order.rate) * parseFloat(order.seedlings_required) : null
            : null
    const balance   = total != null ? Math.max(0, total - paid) : null
    const payStatus = computePayStatus(total, paid, isCancelled)
    const canPay    = !isCancelled && total != null && payStatus !== 'PAID'

    return (
        <>
            <tr className="hover:bg-gray-50 transition-colors">
                <td className="table-td">
                    <div className="flex items-center gap-1.5">
                        <p className="font-medium text-gray-900">{order.name}</p>
                        {isExcess && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Excess Sugarcane</span>
                        )}
                    </div>
                    {(hasVal(order.location) || (hasVal(order.variety) && !isExcess)) && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                            {hasVal(order.location) && (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">📍 {order.location}</span>
                            )}
                            {hasVal(order.variety) && !isExcess && (
                                <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full font-medium">🌿 {order.variety}</span>
                            )}
                        </div>
                    )}
                </td>
                <td className="table-td">
                    {isExcess
                        ? <span className="text-amber-700 font-medium">{excessQty} kg</span>
                        : order.acre}
                </td>
                <td className="table-td">
                    {isExcess ? <span className="text-gray-400">—</span> : order.trays_required}
                </td>
                <td className="table-td text-gray-500">{formatDateIST(order.delivery_date)}</td>
                <td className="table-td">
                    {order.rate && order.rate !== '-'
                        ? <span className="text-gray-700">₹{parseFloat(order.rate).toLocaleString('en-IN')}<span className="text-gray-400 text-[10px]">/{isExcess ? 'kg' : 'seedling'}</span></span>
                        : <span className="text-gray-300">—</span>}
                </td>
                <td className="table-td">
                    {total != null ? (
                        <div>
                            <p className={`font-medium ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                ₹{total.toLocaleString('en-IN')}
                            </p>
                            {isCancelled && paid > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">Refund Due</span>
                                    <span className="text-[10px] text-orange-600 font-medium">₹{paid.toLocaleString('en-IN')} advance</span>
                                </div>
                            )}
                            {!isCancelled && payStatus && (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${PAY_BADGE[payStatus].cls}`}>
                                        {PAY_BADGE[payStatus].label}
                                    </span>
                                    {paid > 0 && payStatus !== 'PAID' && (
                                        <span className="text-[10px] text-green-600 font-medium">₹{paid.toLocaleString('en-IN')} paid</span>
                                    )}
                                    {balance > 0 && (
                                        <span className="text-[10px] text-red-500 font-medium">₹{balance.toLocaleString('en-IN')} due</span>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="text-gray-300">—</span>
                    )}
                </td>
                <td className="table-td"><StatusBadge status={order.status} /></td>
                <td className="table-td">
                    <div className="flex items-center gap-1 flex-wrap">
                        {order.status === 'PENDING' && (
                            <ActionBtn id={`confirm-${order.id}`} label="Confirm" color="blue"
                                loading={busy('confirm')} disabled={anyBusy} onClick={onConfirm} />
                        )}
                        {order.status === 'CONFIRMED' && !isExcess && (
                            <ActionBtn id={`prepare-${order.id}`} label="Prepare" color="purple"
                                loading={busy('prepare')} disabled={anyBusy} onClick={onPrepare} />
                        )}
                        {(order.status === 'PREPARED' || (isExcess && order.status === 'CONFIRMED')) && (
                            <ActionBtn id={`deliver-${order.id}`} label="Deliver" color="green"
                                loading={busy('deliver')} disabled={anyBusy} onClick={onDeliver} />
                        )}
                        {['PENDING', 'CONFIRMED', 'PREPARED'].includes(order.status) && (
                            <ActionBtn id={`cancel-${order.id}`} label="Cancel" color="red"
                                loading={busy('cancel')} disabled={anyBusy} onClick={onCancel} />
                        )}
                        {canPay && (
                            <ActionBtn id={`pay-${order.id}`} label="Pay" color="emerald"
                                disabled={anyBusy} onClick={() => setShowPay(true)} />
                        )}
                    </div>
                </td>
            </tr>

            {showPay && (
                <PayModal order={order} total={total} paid={paid} onClose={() => setShowPay(false)} />
            )}
        </>
    )
}
