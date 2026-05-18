import { useState, useEffect, useMemo } from 'react'
import { Users, CalendarDays, BarChart2, UserPlus, CheckCircle, Calendar } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import Modal from '../components/Modal'

function todayStr() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function currentMonthStr() {
    return todayStr().slice(0, 7)
}

function monthRange(monthStr) {
    const [y, m] = monthStr.split('-').map(Number)
    return { first: `${monthStr}-01`, last: new Date(y, m, 0).toISOString().slice(0, 10) }
}

function buildCalendarDays(monthStr, worker) {
    const [y, m]     = monthStr.split('-').map(Number)
    const firstDow   = new Date(y, m - 1, 1).getDay() // 0=Sun
    const daysInMonth = new Date(y, m, 0).getDate()
    const today      = todayStr()
    const cells      = []
    for (let i = 0; i < firstDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
        const date = `${monthStr}-${String(d).padStart(2, '0')}`
        const val  = worker[date]
        cells.push({
            day:      d,
            date,
            present:  val === true || val === 'TRUE' || val === 1,
            recorded: val !== undefined && val !== '',
            future:   date > today,
        })
    }
    return cells
}

const isDateKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k)
const isActive  = (w) => w.active === true || w.active === 'TRUE' || w.active === 1
const isPresent = (v) => v === true || v === 'TRUE' || v === 1

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function Labour() {
    const workers          = useAppStore((s) => s.workers)
    const loading          = useAppStore((s) => s.loading)
    const fetchWorkers     = useAppStore((s) => s.fetchWorkers)
    const saveAttendance   = useAppStore((s) => s.saveAttendance)
    const addWorkerFn      = useAppStore((s) => s.addWorker)
    const deactivateWorker = useAppStore((s) => s.deactivateWorker)
    const activateWorker   = useAppStore((s) => s.activateWorker)

    const [tab, setTab] = useState('attendance')

    // Attendance tab
    const [date, setDate]       = useState(todayStr())
    const [present, setPresent] = useState({})
    const [saved, setSaved]     = useState(false)

    // Workers tab
    const [addModal, setAddModal]                 = useState(false)
    const [deactivateTarget, setDeactivateTarget] = useState(null)
    const [workerForm, setWorkerForm]             = useState({ name: '', daily_rate: '', phone: '' })

    // Summary tab
    const [month, setMonth]           = useState(currentMonthStr())
    const [calendarTarget, setCalendarTarget] = useState(null) // { worker }

    const activeWorkers = useMemo(() => workers.filter(isActive), [workers])

    useEffect(() => { fetchWorkers() }, [])

    useEffect(() => {
        const map = {}
        activeWorkers.forEach((w) => { map[w.id] = isPresent(w[date]) })
        setPresent(map)
        setSaved(false)
    }, [workers, date])

    const presentCount = useMemo(() => Object.values(present).filter(Boolean).length, [present])
    const dailyTotal   = useMemo(
        () => activeWorkers.reduce((s, w) => present[w.id] ? s + (Number(w.daily_rate) || 0) : s, 0),
        [present, activeWorkers]
    )

    const wageSummary = useMemo(() => {
        const { first, last } = monthRange(month)
        return activeWorkers.map((w) => {
            const days = Object.keys(w)
                .filter((k) => isDateKey(k) && k >= first && k <= last && isPresent(w[k]))
                .length
            return { worker: w, id: w.id, name: w.name, daily_rate: Number(w.daily_rate) || 0, days, total: days * (Number(w.daily_rate) || 0) }
        })
    }, [activeWorkers, month])

    const grandTotal = useMemo(() => wageSummary.reduce((s, r) => s + r.total, 0), [wageSummary])

    async function handleSaveAttendance() {
        const records = activeWorkers.map((w) => ({ worker_id: w.id, present: !!present[w.id] }))
        const ok = await saveAttendance(date, records)
        if (ok) setSaved(true)
    }

    async function handleAddWorker(e) {
        e.preventDefault()
        const ok = await addWorkerFn(workerForm)
        if (ok) { setAddModal(false); setWorkerForm({ name: '', daily_rate: '', phone: '' }) }
    }

    async function handleDeactivate() {
        if (!deactivateTarget) return
        const ok = await deactivateWorker(deactivateTarget.id)
        if (ok) setDeactivateTarget(null)
    }

    // Calendar modal data
    const calendarDays = useMemo(
        () => calendarTarget ? buildCalendarDays(month, calendarTarget.worker) : [],
        [calendarTarget, month]
    )
    const [calY, calM] = month.split('-').map(Number)

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="card p-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white">
                <div className="flex items-center gap-3">
                    <Users className="w-7 h-7 opacity-80" />
                    <div>
                        <h2 className="font-semibold text-lg">Labour Management</h2>
                        <p className="text-brand-100 text-sm">{activeWorkers.length} active worker{activeWorkers.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <div className="card p-1 flex gap-1">
                {[
                    { key: 'attendance', label: 'Attendance', icon: CalendarDays },
                    { key: 'workers',    label: 'Workers',    icon: Users },
                    { key: 'summary',    label: 'Summary',    icon: BarChart2 },
                ].map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2.5 px-1 rounded-lg text-[10px] sm:text-sm font-semibold transition-colors min-h-[48px] ${
                            tab === key ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}>
                        <Icon className="w-4 h-4" />{label}
                    </button>
                ))}
            </div>

            {/* ── Attendance ──────────────────────────────────── */}
            {tab === 'attendance' && (
                <div className="card p-5 space-y-4">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                            <label className="label">Date</label>
                            <input type="date" className="input w-44 mt-1" value={date} max={todayStr()}
                                onChange={(e) => { setDate(e.target.value); setSaved(false) }} />
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Daily Wages</p>
                            <p className="text-2xl font-bold text-brand-700">₹{dailyTotal.toLocaleString('en-IN')}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{presentCount} of {activeWorkers.length} present</p>
                        </div>
                    </div>

                    {loading.workers ? (
                        <div className="space-y-1">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50">
                                    <div className="space-y-1.5">
                                        <div className="shimmer h-4 w-28 rounded-md" />
                                        <div className="shimmer h-3 w-16 rounded-md" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="shimmer h-8 w-20 rounded-lg" />
                                        <div className="shimmer h-8 w-20 rounded-lg" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activeWorkers.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No active workers. Add workers first.</p>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {activeWorkers.map((w) => (
                                <div key={w.id} className="flex items-center justify-between py-3 gap-3">
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{w.name}</p>
                                        <p className="text-xs text-gray-400">₹{Number(w.daily_rate).toLocaleString('en-IN')}/day</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => setPresent((p) => ({ ...p, [w.id]: true }))}
                                            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-w-[80px] ${
                                                present[w.id]
                                                    ? 'bg-green-600 text-white shadow-sm'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'
                                            }`}>Present</button>
                                        <button onClick={() => setPresent((p) => ({ ...p, [w.id]: false }))}
                                            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-w-[80px] ${
                                                present[w.id] === false
                                                    ? 'bg-red-100 text-red-600'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'
                                            }`}>Absent</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeWorkers.length > 0 && (
                        <div className="flex items-center gap-3 pt-1">
                            <button onClick={handleSaveAttendance} disabled={loading.saveAttendance} className="btn-primary flex-1">
                                {loading.saveAttendance ? 'Saving...' : 'Save Attendance'}
                            </button>
                            {saved && (
                                <span className="flex items-center gap-1 text-green-600 text-sm font-semibold shrink-0">
                                    <CheckCircle className="w-4 h-4" /> Saved
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Workers ─────────────────────────────────────── */}
            {tab === 'workers' && (
                <div className="card overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-50">
                        <h3 className="font-semibold text-gray-900">Workers</h3>
                        <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-1.5 text-sm py-1.5">
                            <UserPlus className="w-4 h-4" /> Add Worker
                        </button>
                    </div>

                    {loading.workers ? (
                        <div className="divide-y divide-gray-50">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4">
                                    <div className="space-y-1.5">
                                        <div className="shimmer h-4 w-32 rounded-md" />
                                        <div className="shimmer h-3 w-20 rounded-md" />
                                    </div>
                                    <div className="shimmer h-8 w-24 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    ) : workers.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-12">No workers yet. Add your first worker.</p>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {workers.map((w) => {
                                const active = isActive(w)
                                return (
                                    <div key={w.id} className="flex items-center justify-between p-4 gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-900 truncate">{w.name}</p>
                                                {!active && <span className="badge bg-gray-100 text-gray-400">Inactive</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                ₹{Number(w.daily_rate).toLocaleString('en-IN')}/day
                                                {w.phone ? ` · ${w.phone}` : ''}
                                            </p>
                                        </div>
                                        {active ? (
                                            <button onClick={() => setDeactivateTarget(w)}
                                                disabled={loading[`deactivate_${w.id}`]}
                                                className="text-sm bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 px-4 py-2.5 rounded-lg font-semibold transition-colors shrink-0 min-h-[44px]">
                                                {loading[`deactivate_${w.id}`] ? '...' : 'Deactivate'}
                                            </button>
                                        ) : (
                                            <button onClick={() => activateWorker(w.id)}
                                                disabled={loading[`activate_${w.id}`]}
                                                className="text-sm bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2.5 rounded-lg font-semibold transition-colors shrink-0 min-h-[44px]">
                                                {loading[`activate_${w.id}`] ? '...' : 'Activate'}
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Summary ─────────────────────────────────────── */}
            {tab === 'summary' && (
                <div className="card overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-50 flex-wrap gap-3">
                        <h3 className="font-semibold text-gray-900">Wage Summary</h3>
                        <input type="month" className="input w-40" value={month} max={currentMonthStr()}
                            onChange={(e) => setMonth(e.target.value)} />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[320px]">
                            <thead>
                                <tr>
                                    {['Worker', 'Days', 'Rate', 'Total', ''].map((h, i) => (
                                        <th key={i} className="table-th first:pl-4">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {wageSummary.length === 0 ? (
                                    <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-400">No workers yet.</td></tr>
                                ) : (
                                    wageSummary.map((r) => (
                                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="table-td pl-4 font-medium text-gray-900">{r.name}</td>
                                            <td className="table-td">{r.days}</td>
                                            <td className="table-td text-gray-500">₹{r.daily_rate.toLocaleString('en-IN')}</td>
                                            <td className="table-td font-semibold text-green-700">₹{r.total.toLocaleString('en-IN')}</td>
                                            <td className="table-td pr-4">
                                                <button
                                                    onClick={() => setCalendarTarget({ worker: r.worker })}
                                                    className="p-1.5 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors"
                                                    title="View attendance"
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {wageSummary.some((r) => r.days > 0) && (
                                <tfoot>
                                    <tr className="border-t-2 border-gray-100 bg-gray-50">
                                        <td colSpan={3} className="table-td pl-4 font-bold text-gray-900">Grand Total</td>
                                        <td className="table-td font-bold text-green-700 text-lg">₹{grandTotal.toLocaleString('en-IN')}</td>
                                        <td className="table-td pr-4" />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}

            {/* ── Add Worker Modal ─────────────────────────────── */}
            <Modal open={addModal} onClose={() => { setAddModal(false); setWorkerForm({ name: '', daily_rate: '', phone: '' }) }}
                title="Add Worker" maxWidth="max-w-sm">
                <form onSubmit={handleAddWorker} className="space-y-4">
                    <div>
                        <label className="label">Name *</label>
                        <input className="input" placeholder="e.g. Ramu" maxLength={80} required
                            value={workerForm.name} onChange={(e) => setWorkerForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                        <label className="label">Daily Rate (₹) *</label>
                        <input type="number" className="input" placeholder="e.g. 400" min={0} required
                            value={workerForm.daily_rate} onChange={(e) => setWorkerForm((f) => ({ ...f, daily_rate: e.target.value }))} />
                    </div>
                    <div>
                        <label className="label">Phone (optional)</label>
                        <input className="input" placeholder="e.g. 9876543210" maxLength={15}
                            value={workerForm.phone} onChange={(e) => setWorkerForm((f) => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" className="flex-1 btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
                        <button type="submit" className="flex-1 btn-primary" disabled={loading.addWorker}>
                            {loading.addWorker ? 'Adding...' : 'Add Worker'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ── Deactivate Modal ─────────────────────────────── */}
            <Modal open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} title="Deactivate Worker" maxWidth="max-w-sm">
                <p className="text-sm text-gray-600 mb-6">
                    Deactivate <span className="font-semibold text-gray-900">{deactivateTarget?.name}</span>?
                    They won't appear in attendance. Past records are kept.
                </p>
                <div className="flex gap-3">
                    <button className="flex-1 btn-ghost" onClick={() => setDeactivateTarget(null)}>Cancel</button>
                    <button className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                        disabled={loading[`deactivate_${deactivateTarget?.id}`]} onClick={handleDeactivate}>
                        {loading[`deactivate_${deactivateTarget?.id}`] ? '...' : 'Deactivate'}
                    </button>
                </div>
            </Modal>

            {/* ── Attendance Calendar Modal ────────────────────── */}
            <Modal open={!!calendarTarget} onClose={() => setCalendarTarget(null)}
                title={calendarTarget ? `${calendarTarget.worker.name} — ${MONTH_NAMES[calM - 1]} ${calY}` : ''}
                maxWidth="max-w-sm">
                {calendarTarget && (
                    <div className="space-y-3">
                        {/* Legend */}
                        <div className="flex gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Present</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-200 inline-block" />Absent</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-100 inline-block" />Not recorded</span>
                        </div>

                        {/* Day-of-week headers */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
                                <div key={d} className="text-[10px] font-bold text-gray-400 py-1">{d}</div>
                            ))}
                            {calendarDays.map((cell, i) => {
                                if (!cell) return <div key={`pad-${i}`} />
                                const base = 'w-full aspect-square flex items-center justify-center rounded-full text-xs font-semibold'
                                let cls
                                if (cell.future)        cls = `${base} text-gray-300`
                                else if (cell.present)  cls = `${base} bg-green-500 text-white`
                                else if (cell.recorded) cls = `${base} bg-red-100 text-red-500`
                                else                    cls = `${base} bg-gray-50 text-gray-400`
                                return <div key={cell.date} className={cls}>{cell.day}</div>
                            })}
                        </div>

                        {/* Summary line */}
                        <div className="pt-2 border-t border-gray-50 flex justify-between text-sm">
                            <span className="text-gray-500">
                                {wageSummary.find((r) => r.id === calendarTarget.worker.id)?.days ?? 0} days present
                            </span>
                            <span className="font-semibold text-green-700">
                                ₹{(wageSummary.find((r) => r.id === calendarTarget.worker.id)?.total ?? 0).toLocaleString('en-IN')} earned
                            </span>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
