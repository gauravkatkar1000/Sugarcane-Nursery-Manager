import { useState, useMemo } from 'react'
import { PlusCircle } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { ALL_ITEMS, ITEM_LABELS, ITEM_UNITS } from '../utils/constants'
import LoadingSpinner from '../components/LoadingSpinner'

const CUSTOM_KEY = '__custom__'

export default function AddStock() {
    const addStock = useAppStore((s) => s.addStock)
    const stock    = useAppStore((s) => s.stock)
    const loading  = useAppStore((s) => s.loading)

    const [form, setForm] = useState({ item: 'raw_sugarcane', quantity: '', note: '' })
    const [customItem, setCustomItem] = useState('')
    const [done, setDone] = useState(false)

    const set = (field) => (e) => {
        setForm((f) => ({ ...f, [field]: e.target.value }))
        setDone(false)
    }

    // Items in stock that aren't in the standard list
    const extraItems = useMemo(
        () => stock.map((s) => s.item).filter((i) => !ALL_ITEMS.includes(i)),
        [stock]
    )

    const isCustom   = form.item === CUSTOM_KEY
    const activeItem = isCustom ? customItem.trim() : form.item
    const unit       = ITEM_UNITS[activeItem] || ''

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!activeItem) return
        const ok = await addStock(activeItem, form.quantity, form.note)
        if (ok) {
            setForm({ item: form.item, quantity: '', note: '' })
            setCustomItem('')
            setDone(true)
        }
    }

    const isValid = activeItem && parseFloat(form.quantity) > 0

    return (
        <div className="max-w-lg mx-auto">
            <div className="card p-6 space-y-5">
                <h2 className="font-semibold text-gray-900 text-lg">Add Stock Entry</h2>
                <p className="text-sm text-gray-500 -mt-3">All stock is tracked via ledger. Select item, quantity and a note.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Item *</label>
                        <select
                            id="stock-item"
                            className="input"
                            value={form.item}
                            onChange={(e) => { set('item')(e); setDone(false) }}
                        >
                            {/* Standard items */}
                            {ALL_ITEMS.map((item) => (
                                <option key={item} value={item}>
                                    {ITEM_LABELS[item]} ({ITEM_UNITS[item]})
                                </option>
                            ))}

                            {/* Custom items already in stock */}
                            {extraItems.length > 0 && (
                                <optgroup label="Custom items">
                                    {extraItems.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </optgroup>
                            )}

                            {/* New custom item */}
                            <optgroup label="Other">
                                <option value={CUSTOM_KEY}>+ New custom item…</option>
                            </optgroup>
                        </select>
                    </div>

                    {/* Custom item name input */}
                    {isCustom && (
                        <div>
                            <label className="label">Item Name *</label>
                            <input
                                className="input"
                                placeholder="e.g. chemical1, fertilizer, bags"
                                maxLength={40}
                                value={customItem}
                                onChange={(e) => { setCustomItem(e.target.value); setDone(false) }}
                            />
                        </div>
                    )}

                    <div>
                        <label className="label">Quantity *{unit ? ` (${unit})` : ''}</label>
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
                    <li>• Custom items can be added and will appear in the stock table</li>
                </ul>
            </div>
        </div>
    )
}
