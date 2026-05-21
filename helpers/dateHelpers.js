// ── Helpers ──────────────────────────────────────────────────────────────────

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const AR_MONTHS_IDX = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const AR_MONTHS_PAD = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل', '05': 'مايو', '06': 'يونيو',
  '07': 'يوليو', '08': 'أغسطس', '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

export  function convertTo24Hour(time) {
  if (!time) return null;
  time = time.trim();
  const ampm = time.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const m = ampm[2], s = ampm[3] || '00', p = ampm[4].toUpperCase();
    if (p === 'PM' && h !== 12) h += 12;
    else if (p === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}:${s}`;
  }
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(time)) {
    const parts = time.split(':');
    return `${String(+parts[0]).padStart(2, '0')}:${parts[1]}:${parts[2] ?? '00'}`;
  }
  return time;
}

export function parseDate(dateStr) {
  if (!dateStr) return null;
  // Try DD/MM/YYYY
  let m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  // Try YYYY-MM-DD
  const d = new Date(dateStr);
  return isNaN(d) ? null : d;
}

export  function fullArabicDate(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = AR_MONTHS_IDX[dateObj.getMonth()];
  return `${AR_DAYS[dateObj.getDay()]} ${day} ${month} ${dateObj.getFullYear()}`;
}