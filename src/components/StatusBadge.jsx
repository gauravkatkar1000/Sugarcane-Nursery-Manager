import { STATUS_COLORS } from '../utils/constants'

export default function StatusBadge({ status }) {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.PENDING
    return (
        <span className={`badge ${colors.bg} ${colors.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {status}
        </span>
    )
}
