import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { ALL_ITEMS, ITEM_LABELS, ITEM_UNITS } from '../utils/constants'
import LoadingSpinner from '../components/LoadingSpinner'

export default function AddStock() {
    const addStock = useAppStore((s) => s.addStock)
    const loading = useAppStore((s) => s.loading)

    const [form, setForm] = useState({ item: 'raw_sugarcane', quantity: '', note: '' })
    const [done, setDone] = useState(false)

    const set = (field) => (e) => {
        setForm((f) => ({ ...f, [field]: e.target.value }))
        setDone(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const ok = await addStock(form.item, form.quantity, form.note)
        if (ok) {
            setForm({ item: 'raw_sugarcane', quantity: '', note: '' })
            setDone(true)
        }
    }

    const isValid = form.item && parseFloat(form.quantity) > 0

    return (
        <div className="max-w-lg mx-auto">
            <div className="card p-6 space-y-5">
                <h2 className="font-semibold text-gray-900 text-lg">Add Stock Entry</h2>
                <p className="text-sm text-gray-500 -mt-3">All stock is tracked via ledger. Select item, quantity and a note.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Item *</label>
                        <select id="stock-item" className="input" value={form.item} onChange={set('item')}>
                            {ALL_ITEMS.map((item) => (
                                <option key={item} value={item}>
                                    {ITEM_LABELS[item]} ({ITEM_UNITS[item]})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label">Quantity * ({ITEM_UNITS[form.item]})</label>
                        <input
                            id="stock-quantity"
                            type="number"
                            min="0.01"
                            step="any"
                            className="input"
                            placeholder={`e.g. ${form.item === 'raw_sugarcane' ? '5' : form.item === 'seedlings' ? '7000' : '100'}`}
                            value={form.quantity}
                            onChange={set('quantity')}
                        />
                    </div>

                    <div>
                        <label className="label">Note (required for audit)</label>
                        <input
                            id="stock-note"
                            className="input"
                            placeholder="e.g. Received from supplier / truck delivery"
                            maxLength={200}
                            value={form.note}
                            onChange={set('note')}
                        />
                    </div>

                    {done && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 font-medium">
                            ✅ Stock added successfully! Ledger entry recorded.
                        </div>
                    )}

                    <button
                        id="btn-add-stock"
                        type="submit"
                        disabled={!isValid || loading.addStock}
                        className="btn-primary w-full py-3"
                    >
                        {loading.addStock ? <LoadingSpinner size="sm" /> : <PlusCircle className="w-4 h-4" />}
                        Add Stock
                    </button>
                </form>
            </div>

            {/* Info card */}
            <div className="mt-4 card p-4 bg-blue-50 border-blue-100">
                <p className="text-xs text-blue-700 font-semibold mb-2">📋 How this works</p>
                <ul className="text-xs text-blue-600 space-y-1">
                    <li>• Every addition is recorded as an <code className="bg-blue-100 px-1 rounded">ADD</code> ledger entry</li>
                    <li>• Stock totals are recalculated automatically</li>
                    <li>• Notes are mandatory in ledger for full auditability</li>
                </ul>
            </div>
        </div>
    )
}
