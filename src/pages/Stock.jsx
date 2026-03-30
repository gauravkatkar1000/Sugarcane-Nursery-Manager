import { useState } from 'react'
import { RefreshCw, ArrowRightLeft, Archive, History, AlertCircle } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import { ITEM_LABELS, ITEM_UNITS, LOW_STOCK_THRESHOLDS } from '../utils/constants'
import { getStockItem, netAvailable } from '../utils/stock'
import { calcConversionFromRaw, calcTrayPrep, CONVERSIONS } from '../utils/calculations'
import { format } from 'date-fns'

export default function Stock() {
    const stock = useAppStore((s) => s.stock)
    const ledger = useAppStore((s) => s.ledger)
    const loading = useAppStore((s) => s.loading)
    const fetchLedger = useAppStore((s) => s.fetchLedger)
    const convertRaw = useAppStore((s) => s.convertRaw)
    const prepareTrays = useAppStore((s) => s.prepareTrays)

    const [convertModal, setConvertModal] = useState(false)
    const [prepareModal, setPrepareModal] = useState(false)
    const [ledgerModal, setLedgerModal] = useState(false)

    const [tons, setTons] = useState('')
    const [trays, setTrays] = useState('')

    const conversionPreview = calcConversionFromRaw(parseFloat(tons) || 0)
    const prepPreview = calcTrayPrep(parseInt(trays) || 0)

    const canConvert = tons > 0 && netAvailable(getStockItem(stock, 'raw_sugarcane')) >= parseFloat(tons)
    const canPrepare = trays > 0 &&
        netAvailable(getStockItem(stock, 'seedlings')) >= prepPreview.seedlings_needed &&
        netAvailable(getStockItem(stock, 'tray')) >= prepPreview.trays_needed &&
        netAvailable(getStockItem(stock, 'cocopeat')) >= prepPreview.cocopeat_needed

    const handleConvert = async () => {
        if (!canConvert) return
        await convertRaw(parseFloat(tons))
        setTons(''); setConvertModal(false)
    }
    const handlePrepareTray = async () => {
        if (!canPrepare) return
        await prepareTrays(parseInt(trays))
        setTrays(''); setPrepareModal(false)
    }
    const openLedger = () => { fetchLedger(); setLedgerModal(true) }

    return (
        <div className="space-y-4">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
                <button id="btn-convert-raw" className="btn-secondary" onClick={() => setConvertModal(true)}>
                    <ArrowRightLeft className="w-4 h-4" /> Convert Raw Sugarcane
                </button>
                <button id="btn-prepare-trays" className="btn-secondary" onClick={() => setPrepareModal(true)}>
                    <Archive className="w-4 h-4" /> Prepare Trays
                </button>
                <button id="btn-ledger" className="btn-secondary" onClick={openLedger}>
                    <History className="w-4 h-4" /> Transaction History
                </button>
            </div>

            {/* Stock table */}
            <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Current Stock</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Net = Available − Reserved</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                        <thead>
                            <tr>
                                {['Item', 'Available', 'Reserved', 'Net (Free)', 'Unit', 'Status'].map((h) => (
                                    <th key={h} className="table-th">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading.stock && (
                                <tr><td colSpan={6} className="py-12"><div className="flex justify-center"><LoadingSpinner /></div></td></tr>
                            )}
                            {!loading.stock && stock.length === 0 && (
                                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No stock entries yet. Add stock to get started.</td></tr>
                            )}
                            {stock.map((s) => {
                                const net = netAvailable(s)
                                const threshold = LOW_STOCK_THRESHOLDS[s.item]
                                const isLow = threshold > 0 && net < threshold
                                return (
                                    <tr key={s.item} className="hover:bg-gray-50 transition-colors">
                                        <td className="table-td font-medium text-gray-900">{ITEM_LABELS[s.item] || s.item}</td>
                                        <td className="table-td text-gray-700">{s.available || 0}</td>
                                        <td className="table-td text-amber-600">{s.reserved || 0}</td>
                                        <td className="table-td">
                                            <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-green-700'}`}>{net}</span>
                                        </td>
                                        <td className="table-td text-gray-400 text-xs">{ITEM_UNITS[s.item]}</td>
                                        <td className="table-td">
                                            {isLow ? (
                                                <span className="badge bg-red-100 text-red-700">⚠ Low</span>
                                            ) : (
                                                <span className="badge bg-green-100 text-green-700">OK</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Convert Raw Modal */}
            <Modal open={convertModal} onClose={() => setConvertModal(false)} title="Convert Raw Sugarcane → Seedlings">
                <div className="space-y-4">
                    <div>
                        <label className="label">Tons to Convert</label>
                        <input id="convert-tons" type="number" min="0.1" step="0.1" className="input" placeholder="e.g. 1" value={tons} onChange={(e) => setTons(e.target.value)} />
                    </div>
                    {tons > 0 && (
                        <div className="bg-brand-50 rounded-xl p-4 space-y-2">
                            <p className="text-xs font-semibold text-brand-700 uppercase">Preview</p>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Seedlings gained</span>
                                <span className="font-semibold text-brand-700">+{conversionPreview.seedlings.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Excess sugarcane</span>
                                <span className="font-semibold text-brand-700">+{conversionPreview.excess_sugarcane} kg</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Raw consumed</span>
                                <span className="font-semibold text-red-600">−{tons} ton</span>
                            </div>
                        </div>
                    )}
                    {tons > 0 && !canConvert && (
                        <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Insufficient raw sugarcane in stock.
                        </p>
                    )}
                    <button className="btn-primary w-full" onClick={handleConvert} disabled={!canConvert || loading.convertRaw}>
                        {loading.convertRaw ? <LoadingSpinner size="sm" /> : <ArrowRightLeft className="w-4 h-4" />}
                        Convert Now
                    </button>
                </div>
            </Modal>

            {/* Prepare Trays Modal */}
            <Modal open={prepareModal} onClose={() => setPrepareModal(false)} title="Prepare Trays (Loose → Ready)">
                <div className="space-y-4">
                    <div>
                        <label className="label">Number of Trays</label>
                        <input id="prepare-trays" type="number" min="1" className="input" placeholder="e.g. 60" value={trays} onChange={(e) => setTrays(e.target.value)} />
                    </div>
                    {trays > 0 && (
                        <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                            <p className="text-xs font-semibold text-purple-700 uppercase">Materials Needed</p>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Seedlings</span><span className="font-semibold text-red-600">−{prepPreview.seedlings_needed.toLocaleString()}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Empty Trays</span><span className="font-semibold text-red-600">−{prepPreview.trays_needed}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Cocopeat</span><span className="font-semibold text-red-600">−{prepPreview.cocopeat_needed} kg</span></div>
                            <div className="border-t border-purple-100 pt-2 flex justify-between text-sm"><span className="text-gray-600">Ready Trays produced</span><span className="font-semibold text-green-700">+{trays}</span></div>
                        </div>
                    )}
                    {trays > 0 && !canPrepare && (
                        <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Insufficient loose materials. Please check your Net Available stock.
                        </p>
                    )}
                    <button className="btn-primary w-full" onClick={handlePrepareTray} disabled={!canPrepare || loading.prepareTrays}>
                        {loading.prepareTrays ? <LoadingSpinner size="sm" /> : <Archive className="w-4 h-4" />}
                        Prepare Trays
                    </button>
                </div>
            </Modal>

            {/* Ledger Modal */}
            <Modal open={ledgerModal} onClose={() => setLedgerModal(false)} title="Transaction History (All Ledger Entries)" maxWidth="max-w-3xl">
                {loading.ledger ? (
                    <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
                ) : (
                    <div className="overflow-x-auto -mx-6 px-6">
                        <table className="w-full min-w-[600px]">
                            <thead>
                                <tr>
                                    {['Date', 'Item', 'Change', 'Type', 'Note', 'Ref'].map((h) => (
                                        <th key={h} className="table-th">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.length === 0 && (
                                    <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No transactions yet</td></tr>
                                )}
                                {[...ledger].reverse().map((l) => (
                                    <tr key={l.id} className="hover:bg-gray-50">
                                        <td className="table-td text-xs text-gray-400 whitespace-nowrap">
                                            {l.date ? format(new Date(l.date), 'dd MMM yy HH:mm') : '—'}
                                        </td>
                                        <td className="table-td text-xs font-medium">{ITEM_LABELS[l.item] || l.item}</td>
                                        <td className={`table-td font-semibold text-sm ${Number(l.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {Number(l.change) >= 0 ? '+' : ''}{l.change}
                                        </td>
                                        <td className="table-td">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{l.type}</span>
                                        </td>
                                        <td className="table-td text-xs text-gray-500 max-w-[200px] truncate" title={l.note}>{l.note || '—'}</td>
                                        <td className="table-td text-xs text-gray-400 font-mono truncate max-w-[80px]">{l.reference_id}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>
        </div>
    )
}
