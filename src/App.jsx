import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import PlaceOrder from './pages/PlaceOrder'
import Orders from './pages/Orders'
import Stock from './pages/Stock'
import AddStock from './pages/AddStock'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="place-order" element={<PlaceOrder />} />
          <Route path="stock" element={<Stock />} />
          <Route path="add-stock" element={<AddStock />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
