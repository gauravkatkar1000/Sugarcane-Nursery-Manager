import {
    BookOpen, ShoppingCart, Package, ArrowRightLeft,
    Archive, CheckCircle, Clock, Truck, XCircle, AlertTriangle,
    Leaf, Box, FlaskConical, Layers, Wind, Sprout, Calculator, RotateCcw,
    Users, CalendarDays, BarChart2, UserPlus, UserX
} from 'lucide-react'

const Section = ({ title, icon: Icon, children }) => (
    <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-base">
            <Icon className="w-4 h-4 text-brand-600" />
            {title}
        </h2>
        {children}
    </div>
)

const Row = ({ label, children, labelClass = 'text-gray-700' }) => (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2.5 border-b border-gray-50 last:border-0">
        <span className={`text-sm font-semibold w-44 shrink-0 ${labelClass}`}>{label}</span>
        <span className="text-sm text-gray-500 leading-relaxed">{children}</span>
    </div>
)

const Badge = ({ label, bg, text }) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${text}`}>
        {label}
    </span>
)

export default function Help() {
    return (
        <div className="max-w-3xl mx-auto space-y-6">

            {/* Intro */}
            <div className="card p-5 bg-gradient-to-r from-brand-600 to-brand-500 text-white">
                <div className="flex items-center gap-3">
                    <BookOpen className="w-7 h-7 opacity-80" />
                    <div>
                        <h1 className="font-bold text-lg">Help & Guide</h1>
                        <p className="text-brand-100 text-sm mt-0.5">Everything you need to know about using the Sugarcane Nursery Manager</p>
                    </div>
                </div>
            </div>

            {/* Order Workflow */}
            <Section title="Order Workflow" icon={ShoppingCart}>
                <p className="text-sm text-gray-500">Every order moves through a fixed pipeline from creation to delivery.</p>
                <div className="flex flex-wrap gap-2 items-center text-xs font-semibold">
                    <Badge label="PENDING" bg="bg-amber-100" text="text-amber-700" />
                    <span className="text-gray-300">→</span>
                    <Badge label="CONFIRMED" bg="bg-blue-100" text="text-blue-700" />
                    <span className="text-gray-300">→</span>
                    <Badge label="PREPARED" bg="bg-purple-100" text="text-purple-700" />
                    <span className="text-gray-300">→</span>
                    <Badge label="DELIVERED" bg="bg-green-100" text="text-green-700" />
                </div>
                <div className="space-y-3">
                    {[
                        {
                            status: 'PENDING',
                            icon: Clock,
                            iconColor: 'text-amber-500',
                            bg: 'bg-amber-50',
                            border: 'border-amber-100',
                            badge: { bg: 'bg-amber-100', text: 'text-amber-700' },
                            what: 'Order has been placed but no stock has been allocated yet.',
                            when: 'Automatically set when you create a new order. No action needed — just review the order details are correct.',
                        },
                        {
                            status: 'CONFIRMED',
                            icon: CheckCircle,
                            iconColor: 'text-blue-500',
                            bg: 'bg-blue-50',
                            border: 'border-blue-100',
                            badge: { bg: 'bg-blue-100', text: 'text-blue-700' },
                            what: 'Stock (ready trays or loose materials) has been reserved against this order. Reserved quantities are locked and unavailable for other orders.',
                            when: 'Click Confirm once you have verified stock is available and the customer order is finalized. The system will automatically check stock and block the required quantity.',
                        },
                        {
                            status: 'PREPARED',
                            icon: Archive,
                            iconColor: 'text-purple-500',
                            bg: 'bg-purple-50',
                            border: 'border-purple-100',
                            badge: { bg: 'bg-purple-100', text: 'text-purple-700' },
                            what: 'Loose materials (seedlings + empty trays + cocopeat) have been physically assembled into ready trays in the field.',
                            when: 'Click Prepare only after your team has actually finished filling and labelling the trays physically. This converts the reserved loose materials into ready trays in the system.',
                        },
                        {
                            status: 'DELIVERED',
                            icon: Truck,
                            iconColor: 'text-green-500',
                            bg: 'bg-green-50',
                            border: 'border-green-100',
                            badge: { bg: 'bg-green-100', text: 'text-green-700' },
                            what: 'Ready trays have been physically handed over to the customer. Stock is permanently consumed from inventory.',
                            when: 'Click Deliver only after the truck has left and the customer has received the trays. This is irreversible — ready trays are deducted from stock.',
                        },
                        {
                            status: 'CANCELLED',
                            icon: XCircle,
                            iconColor: 'text-gray-400',
                            bg: 'bg-gray-50',
                            border: 'border-gray-100',
                            badge: { bg: 'bg-gray-100', text: 'text-gray-500' },
                            what: 'Order was cancelled. Any reserved stock is automatically released back to available inventory.',
                            when: 'Click Cancel if the customer backs out or the order cannot be fulfilled. Reserved stock will be freed immediately. Cannot cancel after delivery.',
                        },
                    ].map(({ status, icon: Icon, iconColor, bg, border, badge, what, when }) => (
                        <div key={status} className={`rounded-xl border p-4 ${bg} ${border}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Icon className={`w-4 h-4 ${iconColor}`} />
                                <Badge label={status} bg={badge.bg} text={badge.text} />
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{what}</p>
                            <div className="flex items-start gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5 shrink-0">When →</span>
                                <p className="text-xs text-gray-500 leading-relaxed">{when}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Stock Items */}
            <Section title="Stock Items" icon={Package}>
                <p className="text-sm text-gray-500">Six types of items are tracked in inventory. Each flows into the next during production.</p>
                <div className="divide-y divide-gray-50">
                    <Row label={<span className="flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5 text-green-600" /> Raw Sugarcane</span>}>
                        Unprocessed sugarcane measured in <strong>tons</strong>. The starting raw material. Must be converted into seedlings before use.
                    </Row>
                    <Row label={<span className="flex items-center gap-1.5"><Sprout className="w-3.5 h-3.5 text-green-500" /> Seedlings</span>}>
                        Individual sugarcane seedlings cut from raw cane. Measured in <strong>count</strong>. Goes into trays during preparation.
                    </Row>
                    <Row label={<span className="flex items-center gap-1.5"><Box className="w-3.5 h-3.5 text-amber-600" /> Empty Trays</span>}>
                        Physical trays (containers) measured in <strong>count</strong>. Combined with seedlings and cocopeat to make ready trays.
                    </Row>
                    <Row label={<span className="flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5 text-orange-500" /> Cocopeat</span>}>
                        Growing medium (coconut peat) measured in <strong>kg</strong>. Filled into each tray during preparation.
                    </Row>
                    <Row label={<span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-brand-600" /> Ready Trays</span>}>
                        Fully prepared trays containing seedlings + cocopeat, ready to ship. Measured in <strong>count</strong>. This is what gets delivered to customers.
                    </Row>
                    <Row label={<span className="flex items-center gap-1.5"><Wind className="w-3.5 h-3.5 text-gray-400" /> Excess Sugarcane</span>}>
                        Leftover material (non-seedling portions) after converting raw cane. Measured in <strong>kg</strong>. No alert threshold — informational only.
                    </Row>
                </div>
            </Section>

            {/* Stock Numbers */}
            <Section title="Available vs Reserved vs Net" icon={AlertTriangle}>
                <div className="divide-y divide-gray-50">
                    <Row label="Available">
                        Total quantity ever added or produced (through ADD or CONVERT_IN entries). Includes stock that may already be reserved.
                    </Row>
                    <Row label="Reserved">
                        Quantity locked for confirmed orders. Cannot be used for anything else until the order is delivered or cancelled.
                    </Row>
                    <Row label="Net (Free)">
                        <strong>Available − Reserved.</strong> This is the actual quantity you can work with right now. Always check Net before confirming a new order.
                    </Row>
                </div>
            </Section>

            {/* Key Calculations */}
            <Section title="Auto-Calculations" icon={Calculator}>
                <p className="text-sm text-gray-500">All quantities are calculated automatically from these fixed ratios.</p>
                <div className="divide-y divide-gray-50">
                    <Row label="Trays per Acre">1 acre = <strong>60 trays</strong></Row>
                    <Row label="Seedlings per Tray">1 tray = <strong>70 seedlings</strong></Row>
                    <Row label="Cocopeat per Tray">1 tray = <strong>2.5 kg</strong> cocopeat</Row>
                    <Row label="Seedlings per Ton">1 ton raw sugarcane = <strong>7,000 seedlings</strong></Row>
                    <Row label="Excess per Ton">1 ton raw sugarcane = <strong>500 kg</strong> excess sugarcane</Row>
                    <Row label="Order Amount">Rate (₹/seedling) × Seedlings required</Row>
                </div>
            </Section>

            {/* Stock Operations */}
            <Section title="Stock Operations" icon={ArrowRightLeft}>
                <div className="divide-y divide-gray-50">
                    <Row label="Add Stock">
                        Manually add any item to inventory (e.g. received a truck delivery of raw sugarcane or empty trays). Always requires a note for audit.
                    </Row>
                    <Row label="Convert Raw Sugarcane">
                        Converts raw sugarcane (tons) into seedlings and excess sugarcane using the fixed ratios. Use this before confirming orders that need more seedlings.
                    </Row>
                    <Row label="Prepare Trays">
                        Assembles loose materials (seedlings + empty trays + cocopeat) into ready trays manually, outside of any specific order.
                    </Row>
                    <Row label="Reverse Transaction">
                        Found in Transaction History. Undoes a specific ledger entry if it was entered by mistake. Creates a REVERSAL record for audit trail.
                    </Row>
                </div>
            </Section>

            {/* Transaction Types */}
            <Section title="Transaction Types (Ledger)" icon={RotateCcw}>
                <p className="text-sm text-gray-500">Every stock change is recorded as a ledger entry with one of these types.</p>
                <div className="divide-y divide-gray-50">
                    <Row label={<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">ADD</code>}>Manual stock addition (e.g. Add Stock page).</Row>
                    <Row label={<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">RESERVE</code>}>Stock locked for a confirmed order.</Row>
                    <Row label={<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">RELEASE</code>}>Reserved stock freed when an order is cancelled.</Row>
                    <Row label={<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">CONVERT_IN</code>}>Item gained from a conversion (e.g. seedlings gained from raw cane).</Row>
                    <Row label={<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">CONVERT_OUT</code>}>Item consumed in a conversion (e.g. raw cane used up).</Row>
                    <Row label={<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">CONSUME_RESERVED</code>}>Reserved materials consumed when an order moves to PREPARED.</Row>
                    <Row label={<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">FINAL_CONSUME</code>}>Ready trays deducted on delivery.</Row>
                    <Row label={<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">REVERSAL</code>}>Manual correction — reverses a previous entry.</Row>
                </div>
            </Section>

            {/* Labour Management */}
            <Section title="Labour Management" icon={Users}>
                <p className="text-sm text-gray-500">Track your daily workers, mark attendance, and calculate monthly wages — all from one place.</p>

                {/* Three tabs explained */}
                <div className="space-y-3">
                    {[
                        {
                            icon: CalendarDays,
                            iconColor: 'text-brand-600',
                            bg: 'bg-brand-50',
                            border: 'border-brand-100',
                            title: 'Attendance Tab',
                            desc: 'Select a date and mark each worker as Present or Absent. The daily wage total updates live as you toggle. Tap Save Attendance to record — you can re-open the same date anytime to edit it.',
                        },
                        {
                            icon: UserPlus,
                            iconColor: 'text-green-600',
                            bg: 'bg-green-50',
                            border: 'border-green-100',
                            title: 'Workers Tab',
                            desc: 'Add workers with their name, daily rate (₹/day), and optional phone number. Deactivate a worker to remove them from the attendance list — their past records are preserved. Inactive workers can be reactivated anytime.',
                        },
                        {
                            icon: BarChart2,
                            iconColor: 'text-purple-600',
                            bg: 'bg-purple-50',
                            border: 'border-purple-100',
                            title: 'Summary Tab',
                            desc: 'Pick a month to see each worker\'s days present, daily rate, and total earned. Tap the calendar icon on any row to see a day-by-day attendance grid for that worker — green = present, red = absent, grey = not yet recorded.',
                        },
                    ].map(({ icon: Icon, iconColor, bg, border, title, desc }) => (
                        <div key={title} className={`rounded-xl border p-4 ${bg} ${border}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                                <Icon className={`w-4 h-4 ${iconColor}`} />
                                <p className="text-sm font-semibold text-gray-800">{title}</p>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>

                <div className="divide-y divide-gray-50">
                    <Row label={<span className="flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5 text-green-600" /> Add Worker</span>}>
                        Go to Workers tab → tap <strong>Add Worker</strong>. Enter name and daily rate (required) and an optional phone number. The worker immediately appears in the attendance list.
                    </Row>
                    <Row label={<span className="flex items-center gap-1.5"><UserX className="w-3.5 h-3.5 text-red-500" /> Deactivate / Activate</span>}>
                        Deactivating hides a worker from the daily attendance screen. All their historical attendance and wage data is kept intact. You can reactivate them at any time from the Workers tab.
                    </Row>
                    <Row label="Wage Calculation">
                        Total earned = <strong>Days Present × Daily Rate</strong>. Rates are per worker and can differ. The summary always reflects the current daily rate — if you change a rate, past months recalculate automatically.
                    </Row>
                    <Row label="Re-opening a past date">
                        The attendance tab pre-loads whatever was saved for the selected date. You can change it and save again — the previous record is replaced.
                    </Row>
                </div>
            </Section>

            {/* Low Stock Alerts */}
            <Section title="Low Stock Alerts" icon={AlertTriangle}>
                <p className="text-sm text-gray-500">The dashboard warns you when Net stock falls below these thresholds.</p>
                <div className="divide-y divide-gray-50">
                    <Row label="Raw Sugarcane">Below <strong>1 ton</strong></Row>
                    <Row label="Seedlings">Below <strong>5,000</strong></Row>
                    <Row label="Ready Trays">Below <strong>50 trays</strong></Row>
                    <Row label="Empty Trays">Below <strong>100 trays</strong></Row>
                    <Row label="Cocopeat">Below <strong>200 kg</strong></Row>
                    <Row label="Excess Sugarcane">No alert (informational only)</Row>
                </div>
            </Section>

        </div>
    )
}
