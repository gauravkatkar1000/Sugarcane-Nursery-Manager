import {
    BookOpen, ShoppingCart, Package, AlertTriangle,
    Users, CalendarDays, BarChart2, UserPlus,
    Clock, CheckCircle, Archive, Truck, XCircle,
    ArrowRight, ArrowDown, TriangleAlert
} from 'lucide-react'

const ORDER_STEPS = [
    { status: 'PENDING',   icon: Clock,        bg: 'bg-amber-50',  border: 'border-amber-100',  badge: 'bg-amber-100 text-amber-700',  line: 'Order placed. No stock reserved yet.' },
    { status: 'CONFIRMED', icon: CheckCircle,  bg: 'bg-blue-50',   border: 'border-blue-100',   badge: 'bg-blue-100 text-blue-700',    line: 'Stock locked. Tap Confirm once order is finalised.' },
    { status: 'PREPARED',  icon: Archive,      bg: 'bg-purple-50', border: 'border-purple-100', badge: 'bg-purple-100 text-purple-700',line: 'Trays physically filled. Tap Prepare after field work is done.' },
    { status: 'DELIVERED', icon: Truck,        bg: 'bg-green-50',  border: 'border-green-100',  badge: 'bg-green-100 text-green-700',  line: 'Trays handed to customer. Stock permanently consumed.' },
    { status: 'CANCELLED', icon: XCircle,      bg: 'bg-gray-50',   border: 'border-gray-100',   badge: 'bg-gray-100 text-gray-500',    line: 'Reserved stock is released back automatically.' },
]

const RATIOS = [
    { label: '1 Acre', arrow: '→', value: '60 Trays' },
    { label: '1 Tray', arrow: '→', value: '70 Seedlings' },
    { label: '1 Tray', arrow: '→', value: '2.5 kg Cocopeat' },
    { label: '1 Ton Raw', arrow: '→', value: '7,000 Seedlings' },
    { label: '1 Ton Raw', arrow: '→', value: '500 kg Excess' },
    { label: 'Amount', arrow: '=', value: 'Rate × Seedlings' },
]

const LABOUR_TABS = [
    { icon: CalendarDays, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100', title: 'Attendance', desc: 'Pick a date, mark Present / Absent, tap Save. Re-open any past date to edit.' },
    { icon: UserPlus,     color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', title: 'Workers',    desc: 'Add workers with name + daily rate. Deactivate to hide from attendance; reactivate anytime.' },
    { icon: BarChart2,    color: 'text-purple-600',bg: 'bg-purple-50',border: 'border-purple-100',title: 'Summary',    desc: 'Pick a month to see days present + wages. Tap the calendar icon for a day-by-day grid.' },
]

const LOW_STOCK = [
    { item: 'Raw Sugarcane', threshold: '< 1 ton' },
    { item: 'Seedlings',     threshold: '< 5,000' },
    { item: 'Ready Trays',   threshold: '< 50 trays' },
    { item: 'Empty Trays',   threshold: '< 100 trays' },
    { item: 'Cocopeat',      threshold: '< 200 kg' },
]

export default function Help() {
    return (
        <div className="max-w-2xl mx-auto space-y-5">

            {/* Header */}
            <div className="card p-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white">
                <div className="flex items-center gap-3">
                    <BookOpen className="w-7 h-7 opacity-80" />
                    <div>
                        <h2 className="font-semibold text-lg">Help & Guide</h2>
                        <p className="text-brand-100 text-sm">Quick reference for the Sugarcane Nursery Manager</p>
                    </div>
                </div>
            </div>

            {/* Order Flow */}
            <div className="card p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    <ShoppingCart className="w-4 h-4 text-brand-600" /> Order Flow
                </h3>
                <div className="space-y-2">
                    {ORDER_STEPS.map(({ status, icon: Icon, bg, border, badge, line }) => (
                        <div key={status} className={`flex items-start gap-3 rounded-xl border p-3 ${bg} ${border}`}>
                            <Icon className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />
                            <div className="min-w-0">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${badge}`}>{status}</span>
                                <p className="text-xs text-gray-600 leading-relaxed">{line}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Key Ratios */}
            <div className="card p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-brand-600" /> Key Ratios
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {RATIOS.map(({ label, arrow, value }) => (
                        <div key={label + value} className="bg-gray-50 rounded-xl p-3 flex flex-col">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{label}</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-xs text-gray-400">{arrow}</span>
                                <span className="font-bold text-gray-900 text-sm">{value}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stock Terms */}
            <div className="card p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-brand-600" /> Stock Numbers
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-gray-50 rounded-xl p-3">
                        <p className="font-bold text-gray-900">Available</p>
                        <p className="text-gray-400 mt-1 leading-snug">Total ever added or produced</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3">
                        <p className="font-bold text-amber-700">Reserved</p>
                        <p className="text-amber-600/70 mt-1 leading-snug">Locked for confirmed orders</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3">
                        <p className="font-bold text-green-700">Net</p>
                        <p className="text-green-600/70 mt-1 leading-snug">Available − Reserved (use this)</p>
                    </div>
                </div>
            </div>

            {/* Labour */}
            <div className="card p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-brand-600" /> Labour Management
                </h3>
                <div className="space-y-2">
                    {LABOUR_TABS.map(({ icon: Icon, color, bg, border, title, desc }) => (
                        <div key={title} className={`flex items-start gap-3 rounded-xl border p-3 ${bg} ${border}`}>
                            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                            <div>
                                <p className="text-xs font-semibold text-gray-800">{title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-400 px-1">Wage = Days Present × Daily Rate</p>
            </div>

            {/* Low Stock */}
            <div className="card p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alerts
                </h3>
                <div className="divide-y divide-gray-50">
                    {LOW_STOCK.map(({ item, threshold }) => (
                        <div key={item} className="flex items-center justify-between py-2 text-sm">
                            <span className="text-gray-600">{item}</span>
                            <span className="font-semibold text-red-600">{threshold}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stock Logic */}
            <div className="card p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-brand-600" /> How Stock is Used When You Confirm an Order
                </h3>

                {/* Step 1 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                        <p className="text-xs font-semibold text-gray-800">Use Ready Trays first (if any are in stock)</p>
                    </div>
                    <div className="ml-7 bg-green-50 border border-green-100 rounded-xl p-3">
                        <p className="text-xs text-green-700">Ready Trays get <strong>RESERVED</strong> directly — no conversion needed.</p>
                    </div>
                </div>

                <div className="flex justify-center">
                    <ArrowDown className="w-4 h-4 text-gray-300" />
                </div>

                {/* Step 2 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                        <p className="text-xs font-semibold text-gray-800">Remaining trays filled from loose materials</p>
                    </div>
                    <div className="ml-7 grid grid-cols-3 gap-2">
                        {[
                            { label: 'Seedlings', sub: '70 per tray', color: 'bg-brand-50 border-brand-100 text-brand-700' },
                            { label: 'Empty Trays', sub: '1 per tray', color: 'bg-amber-50 border-amber-100 text-amber-700' },
                            { label: 'Cocopeat', sub: '2.5 kg / tray', color: 'bg-orange-50 border-orange-100 text-orange-700' },
                        ].map(({ label, sub, color }) => (
                            <div key={label} className={`rounded-xl border p-2 text-center ${color}`}>
                                <p className="text-[10px] font-bold">{label}</p>
                                <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>
                            </div>
                        ))}
                    </div>
                    <p className="ml-7 text-[10px] text-gray-400">All three are reserved together if sufficient stock exists.</p>
                </div>

                <div className="flex justify-center">
                    <ArrowDown className="w-4 h-4 text-gray-300" />
                </div>

                {/* Seedlings short path */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">!</span>
                        <p className="text-xs font-semibold text-gray-800">Not enough Seedlings but have Raw Sugarcane?</p>
                    </div>
                    <div className="ml-7 bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-2">
                        <p className="text-xs text-amber-700">The system will tell you how many <strong>tons to convert</strong> first.</p>
                        <div className="flex items-center gap-2 text-xs text-amber-600">
                            <span className="font-semibold">Stock → Convert Raw Sugarcane</span>
                            <ArrowRight className="w-3 h-3 shrink-0" />
                            <span>then retry Confirm</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center">
                    <ArrowDown className="w-4 h-4 text-gray-300" />
                </div>

                {/* Hard error path */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">✕</span>
                        <p className="text-xs font-semibold text-gray-800">Trays or Cocopeat short? Order is blocked.</p>
                    </div>
                    <div className="ml-7 bg-red-50 border border-red-100 rounded-xl p-3">
                        <p className="text-xs text-red-600">Add the missing items via <strong>Stock → Add Stock</strong> before confirming.</p>
                    </div>
                </div>

                {/* Add stock note */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Adding Stock</p>
                    <p className="text-xs text-gray-500">Every item added via <strong>Add Stock</strong> creates an <code className="bg-gray-100 px-1 rounded">ADD</code> ledger entry. Stock totals recalculate immediately. Use it whenever you receive a delivery (raw cane, empty trays, cocopeat, etc.).</p>
                </div>
            </div>

        </div>
    )
}
