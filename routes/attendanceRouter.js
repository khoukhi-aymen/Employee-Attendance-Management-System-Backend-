import { Router } from 'express';
import pool from '../db.js';
import { requireLogin, requireAdmin, requireAdminOrHR, logAction } from '../middleware/auth.js';
import * as attendanceController from '../controllers/attendaceController.js';
import { fullArabicDate,convertTo24Hour,parseDate } from '../helpers/dateHelpers.js';

const router = Router();


// ── Helpers ──────────────────────────────────────────────────────────────────

/*const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const AR_MONTHS_IDX = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const AR_MONTHS_PAD = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل', '05': 'مايو', '06': 'يونيو',
  '07': 'يوليو', '08': 'أغسطس', '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

function convertTo24Hour(time) {
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

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Try DD/MM/YYYY
  let m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  // Try YYYY-MM-DD
  const d = new Date(dateStr);
  return isNaN(d) ? null : d;
}

function fullArabicDate(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = AR_MONTHS_IDX[dateObj.getMonth()];
  return `${AR_DAYS[dateObj.getDay()]} ${day} ${month} ${dateObj.getFullYear()}`;
}*/


// ── GET /api/attendance/months  (own employee) ───────────────────────────────
/*router.get('/months', requireLogin, async (req, res) => {
  const empId = req.session.employeeId;
  try {
    let [rows] = await pool.execute(
      "SELECT DISTINCT DATE_FORMAT(date,'%Y-%m') as month FROM attendance_records WHERE TRIM(employee_id) = ? OR employee_id = ? ORDER BY month DESC",
      [empId, empId]
    );
    if (!rows.length) {
      const fullName = req.session.fullName ?? '';
      [rows] = await pool.execute(
        "SELECT DISTINCT DATE_FORMAT(date,'%Y-%m') as month FROM attendance_records WHERE employee_name LIKE ? ORDER BY month DESC",
        [`%${fullName}%`]
      );
    }
    res.json({ success: true, message: 'تم جلب البيانات بنجاح', data: rows.map(r => r.month) });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});*/


// ── GET /api/attendance/all-months  (HR / admin) ─────────────────────────────
/*router.get('/all-months', requireAdminOrHR, async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT DISTINCT DATE_FORMAT(date,'%Y-%m') as month FROM attendance_records ORDER BY month DESC"
  );
  res.json({ success: true, data: rows.map(r => r.month) });
});*/


// ── GET /api/attendance  (one employee, one month) ───────────────────────────
/*router.get('/', requireLogin, async (req, res) => {
  const { month, employee_id } = req.query;

  if (!month) return res.json({ success: false, message: 'الشهر مطلوب' });

  const empId = employee_id?.trim() || req.session.employeeId;
  const sess = req.session;
  if (employee_id && !['hr', 'admin', 'superadmin'].includes(sess.role)) {
    return res.json({ success: false, message: 'غير مصرح لك بعرض بيانات موظف آخر' });
  }

  try {
    const [frozenRows] = await pool.execute(
      'SELECT is_frozen FROM frozen_months WHERE employee_id = ? AND month = ?',
      [empId, month]
    );
    const isFrozen = frozenRows.length > 0;
    const [records] = await pool.execute(
      `SELECT ar.id as id, DATE_FORMAT(date,'%Y-%m-%d') as date, u.employee_id, employee_name, magasin, entree_time, status,
              start_break, finish_break, exit_time,
              store_entree_time, store_exit_time, store_pause_periode, punch_count
       FROM attendance_records ar
       JOIN users u ON ar.employee_id = u.employee_id
       JOIN stores s ON ar.magasin = s.att
       WHERE u.employee_id = ? AND DATE_FORMAT(date,'%Y-%m') = ?
       ORDER BY date`,
      [empId, month]
    );

    const [empRows] = await pool.execute(
      'SELECT full_name FROM users WHERE employee_id = ? LIMIT 1',
      [empId]
    );
    const byDate = {};
    for (const r of records) {
      const dateObj = r.date instanceof Date ? r.date : new Date(r.date);
      const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      byDate[dateKey] = r;
    }

    const [year, monthNum] = month.split('-');
    const daysInMonth = new Date(+year, +monthNum, 0).getDate();
    const allRecords = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${monthNum}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(dateStr);
      const arabicDate = fullArabicDate(dateObj);
      if (byDate[dateStr]) {
        allRecords.push({ ...byDate[dateStr], day_name: arabicDate });
      } else {
        const status = dateObj.getDay() === 5 ? 'Week-end' : 'Absence';
        allRecords.push({
          id: 0, employee_id: empId,
          employee_name: sess.fullName ?? '',
          date: dateStr, day_name: arabicDate, status,
          magasin: null, entree_time: null, start_break: null,
          finish_break: null, exit_time: null, punch_count: null,
          break_duration: null, work_time: null, late_absence: null,
          overtime: null, edit_count: 0, last_edited_by: null,
          last_edited_at: null, created_at: null,
        });
      }
    }
    res.json({
      success: true,
      message: 'تم جلب البيانات بنجاح',
      data: {
        records: allRecords,
        employeeName: empRows[0]?.full_name ?? 'غير معروف',
        employeeId: empId,
        month,
        isFrozen,
      },
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

*/


// ── GET /api/attendance/all  (all employees, one month via Excel) RH seulement ─────────────────────
/*router.get('/all', requireAdminOrHR, async (req, res) => {
  const { month } = req.query;
  if (!month) return res.json({ success: false, message: 'الشهر مطلوب' });

  try {
    const [rows] = await pool.execute(
      `SELECT date, u.employee_id, employee_name, magasin, entree_time,
              start_break, finish_break, exit_time,
              store_entree_time, store_exit_time, store_pause_periode
       FROM attendance_records ar
       JOIN users u ON ar.employee_id = u.employee_id
       JOIN stores s ON ar.magasin = s.att
       WHERE DATE_FORMAT(date,'%Y-%m') = ?
       ORDER BY u.employee_id, date`,
      [month]
    );
    res.json({ success: true, data: { records: rows } });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});
*/

// ── POST /api/attendance/upload  (admin) ─────────────────────────────────────

/*router.post('/upload', requireAdmin, async (req, res) => {
  const { records = [] } = req.body;
  if (!records.length) return res.json({ success: false, message: 'لا توجد بيانات' });

  let successCount = 0, updateCount = 0;

  for (const record of records) {
    let { personId, name, date, dayName, status = 'Présence', magasin,
      entreeTime, startBreak, finishBreak, exitTime,
      count = 1, breakDuration, workTime, lateAbsence, overtime } = record;

    if (!name || !date) continue;

    const dateObj = parseDate(date);
    if (!dateObj) continue;
    const formattedDate = dateObj.toISOString().slice(0, 10);

    entreeTime = convertTo24Hour(entreeTime);
    startBreak = convertTo24Hour(startBreak);
    finishBreak = convertTo24Hour(finishBreak);
    exitTime = convertTo24Hour(exitTime);

    if (!personId) {
      personId = name.replace(/\s+/g, '').slice(0, 3) + Math.floor(100 + Math.random() * 900);
    }
    personId = String(personId).trim();

    if (!dayName) {
      dayName = fullArabicDate(dateObj);
    }

    const [existing] = await pool.execute(
      'SELECT id FROM attendance_records WHERE employee_id = ? AND date = ?',
      [personId, formattedDate]
    );

    if (existing.length) {
      await pool.execute(
        `UPDATE attendance_records SET employee_name=?, day_name=?, status=?, magasin=?,
         entree_time=?, start_break=?, finish_break=?, exit_time=?,
         punch_count=?, break_duration=?, work_time=?, late_absence=?, overtime=?
         WHERE id=?`,
        [name, dayName, status, magasin, entreeTime, startBreak, finishBreak, exitTime,
          count, breakDuration, workTime, lateAbsence, overtime, existing[0].id]
      );
      updateCount++;
    } else {
      await pool.execute(
        `INSERT INTO attendance_records
         (employee_id, employee_name, date, day_name, status, magasin,
          entree_time, start_break, finish_break, exit_time, punch_count,
          break_duration, work_time, late_absence, overtime)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [personId, name, formattedDate, dayName, status, magasin, entreeTime,
          startBreak, finishBreak, exitTime, count, breakDuration, workTime, lateAbsence, overtime]
      );
      successCount++;
    }
  }

  await logAction(req, 'upload_attendance', `رفع حضور: ${successCount} إضافة، ${updateCount} تحديث`);
  res.json({ success: true, message: `تم رفع ${successCount} سجل جديد وتحديث ${updateCount} سجل` });
});


*/

// ── POST /api/attendance/create  (HR) ─────────────────────────────────────────
/*router.post('/create', requireAdminOrHR, async (req, res) => {
  const { data } = req.body;
  const { employee_name, employee_id, date, day_name, magasin,
    entree_time, start_break, finish_break, exit_time,
    punch_count, status } = data || {};

  const [magCheck] = await pool.execute('SELECT COUNT(*) as c FROM stores WHERE att = ?', [magasin]);
  if (!magCheck[0].c) return res.json({ success: false, message: 'المحل غير موجود' });

  if (!employee_name || !employee_id || !date || !magasin || !entree_time || !exit_time) {
    return res.json({ success: false, message: 'الرجاء ملء جميع الحقول' });
  }

  try {
    await pool.execute(
      `INSERT INTO attendance_records
       (employee_name, employee_id, date, day_name, magasin, entree_time, start_break, finish_break, exit_time, punch_count, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [employee_name, employee_id, date, day_name, magasin, entree_time, start_break, finish_break, exit_time, punch_count, status]
    );
    await logAction(req, 'create_attendance', 'إنشاء حضور بنجاح');
    res.json({ success: true, message: 'تم إنشاء حضور بنجاح' });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});
*/


// ── POST /api/attendance/freeze  ─────────────────────────────────────────────
/*router.post('/freeze', requireLogin, async (req, res) => {
  const { month, employee_id } = req.body;
  const empId = employee_id?.trim();
  if (!month || !empId) return res.json({ success: false, message: 'الشهر والموظف مطلوبان' });

  const [dup] = await pool.execute(
    'SELECT id FROM frozen_months WHERE employee_id = ? AND month = ?',
    [empId, month]
  );
  if (dup.length) return res.json({ success: false, message: 'هذا الشهر مجمد مسبقاً' });

  const [missing] = await pool.execute(
    `SELECT COUNT(*) as count FROM attendance_records
     WHERE employee_id = ? AND DATE_FORMAT(date,'%Y-%m') = ?
     AND status = 'Présence' AND (entree_time IS NULL OR exit_time IS NULL)`,
    [empId, month]
  );
  if (missing[0].count > 0) {
    return res.json({ success: false, message: `يوجد ${missing[0].count} سجل يحتوي على أوقات ناقصة` });
  }

  await pool.execute(
    'INSERT INTO frozen_months (employee_id, month, frozen_by) VALUES (?,?,?)',
    [empId, month, req.session.userId]
  );
  await logAction(req, 'freeze_month', `تجميد شهر ${month} للموظف ${empId}`);
  res.json({ success: true, message: 'تم تجميد الشهر بنجاح' });
});

*/


// ── DELETE /api/attendance/clear  (admin) ─────────────────────────────────────

/*router.delete('/clear', requireAdmin, async (req, res) => {
  await pool.execute('DELETE FROM attendance_records');
  await logAction(req, 'clear_attendance', 'إفراغ قاعدة بيانات الحضور');
  res.json({ success: true, message: 'تم إفراغ قاعدة البيانات بنجاح' });
});
*/


// ── GET /api/attendance/report  (HR/admin) ───────────────────────────────────

/*router.get('/report', requireAdminOrHR, async (req, res) => {
  const { employeeId, month } = req.query;
  if (!employeeId || !month) return res.json({ success: false, message: 'الرجاء اختيار الموظف والشهر' });

  const [records] = await pool.execute(
    "SELECT * FROM attendance_records WHERE employee_id = ? AND DATE_FORMAT(date,'%Y-%m') = ? ORDER BY date ASC",
    [employeeId, month]
  );
  const [empRows] = await pool.execute('SELECT full_name FROM users WHERE employee_id = ? LIMIT 1', [employeeId]);
  const [frozenRows] = await pool.execute('SELECT is_frozen FROM frozen_months WHERE employee_id = ? AND month = ?', [employeeId, month]);

  res.json({
    success: true,
    data: {
      records,
      employeeName: empRows[0]?.full_name ?? 'غير معروف',
      employeeId,
      month,
      isFrozen: frozenRows.length > 0,
    },
  });
});*/


// ── GET /api/attendance/months  (own employee) ───────────────────────────────
router.get('/months', requireLogin,attendanceController.getMonthsController);


// ── GET /api/attendance/all-months  (HR / admin) ─────────────────────────────

router.get('/all-months', requireAdminOrHR, attendanceController.getAllMonthsController);

// ── GET /api/attendance  (one employee, one month) ───────────────────────────

router.get('/',requireLogin,attendanceController.getAttendanceController);


// ── GET /api/attendance/all  (all employees, one month via Excel) RH seulement ─────────────────────


router.get('/all',requireAdminOrHR,attendanceController.getAllAttendanceController );



// ── POST /api/attendance/create (*****) ────────────────────────────────────────────

router.post('/create', requireAdminOrHR, attendanceController.createAttendanceController);

// ── POST /api/attendance/freeze (RH + employee)  ───────────────────────────

router.post('/freeze',requireLogin,attendanceController.freezeMonthController);


// ── GET /api/attendance/report (*****) ─────────────────────────────────────────────

router.get('/report',requireAdminOrHR,attendanceController.getAttendanceReportController);


export default router;