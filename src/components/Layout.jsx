import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
    LayoutDashboard, Package,
    ClipboardList, Menu, X, Sprout, HelpCircle, Users
} from 'lucide-react'
import useAppStore from '../store/useAppStore'

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/orders', label: 'Orders', icon: ClipboardList },
    { to: '/stock', label: 'Stock', icon: Package },
    { to: '/labour', label: 'Labour', icon: Users },
    { to: '/help', label: 'Help', icon: HelpCircle },
]

// Primary 5 shown in the mobile bottom tab bar
const bottomNavItems = [
    { to: '/dashboard', label: 'Home',   icon: LayoutDashboard },
    { to: '/orders',    label: 'Orders', icon: ClipboardList },
    { to: '/stock',     label: 'Stock',  icon: Package },
    { to: '/labour',    label: 'Labour', icon: Users },
    { to: '/help',      label: 'Help',   icon: HelpCircle },
]

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const fetchAll = useAppStore((s) => s.fetchAll)

    useEffect(() => { fetchAll() }, [])

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* ── Mobile overlay ─────────────────────────────── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar ────────────────────────────────────── */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col
          bg-white border-r border-gray-100 shadow-sm
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
                        <Sprout className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 leading-tight text-sm">Sugarcane</p>
                        <p className="text-xs text-gray-400 leading-tight">Nursery Manager</p>
                    </div>
                    <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                                    ? 'bg-brand-50 text-brand-700 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`
                            }
                        >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="px-4 py-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 text-center">© 2025 Sugarcane Nursery</p>
                </div>
            </aside>

            {/* ── Main content ───────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar */}
                <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center gap-4 shadow-sm">
                    <button
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-5 h-5 text-gray-600" />
                    </button>
                    <PageTitle />
                </header>

                {/* Page */}
                <main className="flex-1 p-4 sm:p-6 overflow-auto pb-24 md:pb-6">
                    <Outlet />
                </main>
            </div>

            {/* ── Mobile bottom tab bar ───────────────────────── */}
            <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-[0_-1px_6px_rgba(0,0,0,0.06)] md:hidden safe-bottom">
                <div className="flex">
                    {bottomNavItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-semibold transition-colors ${
                                    isActive ? 'text-brand-600' : 'text-gray-400'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                                    {label}
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    )
}

function PageTitle() {
    const { pathname } = useLocation()
    const titles = {
        '/dashboard': 'Dashboard',
        '/orders': 'Orders',
        '/place-order': 'New Order',
        '/stock': 'Stock',
        '/add-stock': 'Add Stock',
        '/labour': 'Labour',
        '/help': 'Help',
    }
    return <h1 className="font-semibold text-gray-900 text-base">{titles[pathname] || 'Nursery Manager'}</h1>
}

