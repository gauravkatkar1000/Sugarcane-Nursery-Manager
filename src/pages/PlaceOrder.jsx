import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, CheckCircle, AlertCircle, XCircle, Zap, ShoppingCart, IndianRupee } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { calcOrder } from '../utils/calculations'
import { checkStockAvailability } from '../utils/calculations'
import { ALL_ITEMS, ITEM_LABELS } from '../utils/constants'
import LoadingSpinner from '../components/LoadingSpinner'

const today = () => new Date().toISOString().split('T')[0]

export default function PlaceOrder() {
    const navigate = useNavigate()
    const placeOrder = useAppStore((s) => s.placeOrder)
    const confirmOrder = useAppStore((s) => s.confirmOrder)
    const addPayment = useAppStore((s) => s.addPayment)
    const stock = useAppStore((s) => s.stock)
    const loading = useAppStore((s) => s.loading)

    const [form, setForm] = useState({
        name: '', acre: '', rate: '', delivery_date: today(),
    })
    const [advance, setAdvance] = useState('')

    const calculated = useMemo(() => {
        const acre = parseFloat(form.acre)
        if (!acre || acre <= 0) return null
        return calcOrder(acre)
    }, [form.acre])

    const availability = useMemo(() => {
        if (!calculated) return null
        return checkStockAvailability(stock, calculated)
    }, [calculated, stock])

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

    const isValid = form.name && form.acre > 0 && form.delivery_date

    const handleCreate = async (andConfirm = false) => {
        const order = await placeOrder(form)
        if (!order) return
        if (advance && Number(advance) > 0) {
            await addPayment(order.id, Number(advance), 'ADVANCE', 'Advance at order creation')
        }
        if (andConfirm) {
            await confirmOrder(order.id)
        }
        navigate('/orders')
    }

    const busy = loading.placeOrder

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="card p-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white">
                <div className="flex items-center gap-3">
                    <ShoppingCart className="w-7 h-7 opacity-80" />
                    <div>
                        <h2 className="font-semibold text-lg">New Order</h2>
                        <p className="text-brand-100 text-sm">Fill in details to place a new order</p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="card p-6 space-y-5">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="label">Customer Name *</label>
                        <input id="order-name" className="input" placeholder="e.g. Ramesh Patel" maxLength={100} value={form.name} onChange={set('name')} />
                    </div>
                    <div>
                        <label className="label">Acre *</label>
                        <input id="order-acre" type="number" min="0.1" step="0.1" className="input" placeholder="e.g. 5" value={form.acre} onChange={set('acre')} />
                    </div>
                    <div>
                        <label className="label">Rate (₹/seedling)</label>
                        <input id="order-rate" type="number" step="0.01" className="input" placeholder="e.g. 1.50" value={form.rate} onChange={set('rate')} />
                    </div>
                    <div>
                        <label className="label">Delivery Date *</label>
                        <input id="order-date" type="date" className="input" min={today()} value={form.delivery_date} onChange={set('delivery_date')} />
                    </div>
                </div>
            </div>

            {/* Auto-calculation */}
            {calculated && (
                <div className="card p-5 bg-brand-50 border-brand-200">
                    <div className="flex items-center gap-2 mb-4">
                        <Calculator className="w-4 h-4 text-brand-600" />
                        <h3 className="font-semibold text-brand-800 text-sm">Auto Calculation</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                            <p className="text-2xl font-bold text-brand-700">{calculated.trays_required}</p>
                            <p className="text-xs text-gray-500 mt-1">Trays Required</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                            <p className="text-2xl font-bold text-brand-700">{calculated.seedlings_required.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-1">Seedlings Required</p>
                        </div>
                    </div>
                    {form.rate && (() => {
                        const total = parseFloat(form.rate) * calculated.seedlings_required
                        const advanceAmt = Number(advance) || 0
                        const balance = Math.max(0, total - advanceAmt)
                        return (
                            <>
                                <div className="mt-3 bg-white rounded-xl p-3 shadow-sm">
                                    <div className="text-center mb-3">
                                        <p className="text-xl font-bold text-gray-900">₹{total.toLocaleString('en-IN')}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Total Order Value</p>
                                    </div>

                                    {/* Advance payment input */}
                                    <div className="border-t border-gray-100 pt-3">
                                        <label className="label text-brand-700">Advance Payment (optional)</label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="number"
                                                className="input pl-8"
                                                placeholder="0"
                                                min="0"
                                                max={total}
                                                value={advance}
                                                onChange={(e) => setAdvance(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Breakdown: paid + balance */}
                                    {advanceAmt > 0 && (
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                                            <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                                                <p className="text-xs font-bold text-green-700">₹{advanceAmt.toLocaleString('en-IN')}</p>
                                                <p className="text-[10px] text-green-600 mt-0.5">Advance Paid</p>
                                            </div>
                                            <div className={`rounded-lg p-2 border ${balance > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                                <p className={`text-xs font-bold ${balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                                    ₹{balance.toLocaleString('en-IN')}
                                                </p>
                                                <p className={`text-[10px] mt-0.5 ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {balance > 0 ? 'Balance Due' : 'Fully Paid'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )
                    })()}
                </div>
            )}

            {/* Stock availability */}
            {availability && (
                <div className={`card p-4 flex items-start gap-3 ${availability.status === 'green' ? 'bg-green-50  border-green-200' :
                    availability.status === 'yellow' ? 'bg-amber-50  border-amber-200' :
                        'bg-red-50    border-red-200'
                    }`}>
                    {availability.status === 'green' && <CheckCircle className="w-5 h-5 text-green-600  flex-shrink-0 mt-0.5" />}
                    {availability.status === 'yellow' && <AlertCircle className="w-5 h-5 text-amber-600  flex-shrink-0 mt-0.5" />}
                    {availability.status === 'red' && <XCircle className="w-5 h-5 text-red-600    flex-shrink-0 mt-0.5" />}

                    <div>
                        <p className={`text-sm font-semibold ${availability.status === 'green' ? 'text-green-800' :
                            availability.status === 'yellow' ? 'text-amber-800' : 'text-red-800'
                            }`}>
                            {availability.status === 'green' ? 'Stock Available' : availability.status === 'yellow' ? 'Conversion Needed' : 'Insufficient Stock'}
                        </p>
                        <p className={`text-xs mt-0.5 ${availability.status === 'green' ? 'text-green-700' : availability.status === 'yellow' ? 'text-amber-700' : 'text-red-700'
                            }`}>
                            {availability.message}
                        </p>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    id="btn-create-order"
                    onClick={() => handleCreate(false)}
                    disabled={!isValid || busy}
                    className="btn-secondary flex-1 py-3"
                >
                    {busy ? <LoadingSpinner size="sm" /> : null}
                    Create Order (Pending)
                </button>
                <button
                    id="btn-create-confirm"
                    onClick={() => handleCreate(true)}
                    disabled={!isValid || busy || availability?.status === 'red'}
                    className="btn-primary flex-1 py-3"
                >
                    <Zap className="w-4 h-4" />
                    Create & Confirm
                </button>
            </div>
        </div>
    )
}
