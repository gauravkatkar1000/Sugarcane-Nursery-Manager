import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, CheckCircle, AlertCircle, XCircle, Zap, ShoppingCart, IndianRupee, Leaf, Package } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { calcOrder } from '../utils/calculations'
import { checkStockAvailability, checkExcessStockAvailability } from '../utils/calculations'
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

    const [orderType, setOrderType] = useState('SEEDLING')

    const [form, setForm] = useState({
        name: '', acre: '', rate: '', delivery_date: today(), location: '', variety: '',
    })
    const [excessForm, setExcessForm] = useState({
        name: '', excess_qty: '', rate: '', delivery_date: today(), location: '',
    })
    const [advance, setAdvance] = useState('')

    const calculated = useMemo(() => {
        if (orderType !== 'SEEDLING') return null
        const acre = parseFloat(form.acre)
        if (!acre || acre <= 0) return null
        return calcOrder(acre)
    }, [form.acre, orderType])

    const availability = useMemo(() => {
        if (orderType !== 'SEEDLING' || !calculated) return null
        return checkStockAvailability(stock, calculated)
    }, [calculated, stock, orderType])

    const excessQty = parseFloat(excessForm.excess_qty)
    const excessAvailability = useMemo(() => {
        if (orderType !== 'EXCESS_SUGARCANE') return null
        if (!excessQty || excessQty <= 0) return null
        return checkExcessStockAvailability(stock, excessQty)
    }, [excessQty, stock, orderType])

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
    const setEx = (field) => (e) => setExcessForm((f) => ({ ...f, [field]: e.target.value }))

    const isValid = orderType === 'SEEDLING'
        ? (form.name && form.acre > 0 && form.delivery_date)
        : (excessForm.name && excessQty > 0 && excessForm.delivery_date)

    const handleCreate = async (andConfirm = false) => {
        let orderPayload
        if (orderType === 'EXCESS_SUGARCANE') {
            orderPayload = {
                name: excessForm.name,
                location: excessForm.location,
                variety: '',
                rate: excessForm.rate,
                delivery_date: excessForm.delivery_date,
                acre: '',
                order_type: 'EXCESS_SUGARCANE',
                excess_qty: excessQty,
            }
        } else {
            orderPayload = { ...form }
        }

        const order = await placeOrder(orderPayload)
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

    // Excess order total
    const excessTotal = excessForm.rate && excessQty > 0
        ? parseFloat(excessForm.rate) * excessQty
        : null

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

            {/* Order Type Toggle */}
            <div className="card p-2 flex gap-2">
                <button
                    onClick={() => { setOrderType('SEEDLING'); setAdvance('') }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${orderType === 'SEEDLING' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <Leaf className="w-4 h-4" />
                    Seedling Order
                </button>
                <button
                    onClick={() => { setOrderType('EXCESS_SUGARCANE'); setAdvance('') }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${orderType === 'EXCESS_SUGARCANE' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <Package className="w-4 h-4" />
                    Excess Sugarcane
                </button>
            </div>

            {/* Seedling Order Form */}
            {orderType === 'SEEDLING' && (
                <>
                    <div className="card p-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Customer Name *</label>
                                <input id="order-name" className="input" placeholder="e.g. Ramesh Patel" maxLength={100} value={form.name} onChange={set('name')} />
                            </div>
                            <div>
                                <label className="label">Location</label>
                                <input id="order-location" className="input" placeholder="e.g. Pune, Nashik" maxLength={100} value={form.location} onChange={set('location')} />
                            </div>
                            <div>
                                <label className="label">Variety</label>
                                <input id="order-variety" className="input" placeholder="e.g. Co-86032, Co-0238" maxLength={100} value={form.variety} onChange={set('variety')} />
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
                </>
            )}

            {/* Excess Sugarcane Order Form */}
            {orderType === 'EXCESS_SUGARCANE' && (
                <>
                    <div className="card p-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Customer Name *</label>
                                <input className="input" placeholder="e.g. Ramesh Patel" maxLength={100} value={excessForm.name} onChange={setEx('name')} />
                            </div>
                            <div>
                                <label className="label">Location</label>
                                <input className="input" placeholder="e.g. Pune, Nashik" maxLength={100} value={excessForm.location} onChange={setEx('location')} />
                            </div>
                            <div>
                                <label className="label">Quantity (kg) *</label>
                                <input type="number" min="1" step="1" className="input" placeholder="e.g. 200" value={excessForm.excess_qty} onChange={setEx('excess_qty')} />
                            </div>
                            <div>
                                <label className="label">Rate (₹/kg)</label>
                                <input type="number" step="0.01" className="input" placeholder="e.g. 5.00" value={excessForm.rate} onChange={setEx('rate')} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="label">Delivery Date *</label>
                                <input type="date" className="input" min={today()} value={excessForm.delivery_date} onChange={setEx('delivery_date')} />
                            </div>
                        </div>
                    </div>

                    {/* Excess stock availability */}
                    {excessAvailability && (
                        <div className={`card p-4 flex items-start gap-3 ${excessAvailability.status === 'green' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            {excessAvailability.status === 'green'
                                ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                            <div>
                                <p className={`text-sm font-semibold ${excessAvailability.status === 'green' ? 'text-green-800' : 'text-red-800'}`}>
                                    {excessAvailability.status === 'green' ? 'Stock Available' : 'Insufficient Stock'}
                                </p>
                                <p className={`text-xs mt-0.5 ${excessAvailability.status === 'green' ? 'text-green-700' : 'text-red-700'}`}>
                                    {excessAvailability.message}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Total calculation */}
                    {excessTotal != null && (
                        <div className="card p-5 bg-amber-50 border-amber-200">
                            <div className="bg-white rounded-xl p-3 shadow-sm">
                                <div className="text-center mb-3">
                                    <p className="text-xl font-bold text-gray-900">₹{excessTotal.toLocaleString('en-IN')}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Total Order Value ({excessQty} kg × ₹{excessForm.rate}/kg)</p>
                                </div>
                                <div className="border-t border-gray-100 pt-3">
                                    <label className="label text-amber-700">Advance Payment (optional)</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            className="input pl-8"
                                            placeholder="0"
                                            min="0"
                                            max={excessTotal}
                                            value={advance}
                                            onChange={(e) => setAdvance(e.target.value)}
                                        />
                                    </div>
                                </div>
                                {Number(advance) > 0 && (
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                                        <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                                            <p className="text-xs font-bold text-green-700">₹{Number(advance).toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] text-green-600 mt-0.5">Advance Paid</p>
                                        </div>
                                        <div className={`rounded-lg p-2 border ${excessTotal - Number(advance) > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                            <p className={`text-xs font-bold ${excessTotal - Number(advance) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                                ₹{Math.max(0, excessTotal - Number(advance)).toLocaleString('en-IN')}
                                            </p>
                                            <p className={`text-[10px] mt-0.5 ${excessTotal - Number(advance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {excessTotal - Number(advance) > 0 ? 'Balance Due' : 'Fully Paid'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
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
                    disabled={!isValid || busy || (orderType === 'SEEDLING' && availability?.status === 'red') || (orderType === 'EXCESS_SUGARCANE' && excessAvailability?.status === 'red')}
                    className="btn-primary flex-1 py-3"
                >
                    <Zap className="w-4 h-4" />
                    Create & Confirm
                </button>
            </div>
        </div>
    )
}
