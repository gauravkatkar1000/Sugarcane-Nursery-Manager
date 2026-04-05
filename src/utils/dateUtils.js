export function formatDateTimeIST(dateString) {
    if (!dateString) return '—';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        const options = { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
        const formatter = new Intl.DateTimeFormat('en-GB', options);
        return formatter.format(d).replace(',', '');
    } catch {
        return dateString;
    }
}

export function formatDateIST(dateString) {
    if (!dateString) return '—';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        const options = { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' };
        const formatter = new Intl.DateTimeFormat('en-GB', options);
        return formatter.format(d);
    } catch {
        return dateString;
    }
}

export function formatFullDateIST(date) {
    if (!date) return '—';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return String(date);
        const options = { timeZone: 'Asia/Kolkata', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
        const formatter = new Intl.DateTimeFormat('en-GB', options);
        return formatter.format(d);
    } catch {
        return String(date);
    }
}
