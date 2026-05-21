import { Router } from 'express';
import pool from '../db.js';
import { requireLogin, requireHR, logAction } from '../middleware/auth.js';
import { fullArabicDate,convertTo24Hour,parseDate } from '../helpers/dateHelpers.js';
import * as suggestionsController from '../controllers/suggestionsController.js';

const router = Router();

/*function addMidnight(time) {
  if (!time) return time;
  const parts = time.split(':');
  let h = parseInt(parts[0]);
  if (h < 24) h += 24;
  return `${String(h).padStart(2,'0')}:${parts[1] ?? '00'}:${parts[2] ?? '00'}`;
}
*/



// ── GET /api/suggestions التعديلات /mine  (logged in employee) ──────────────────────────
/*router.get('/mine', requireLogin, async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT * FROM time_edit_suggestions WHERE employee_id = ? ORDER BY created_at DESC',
    [req.session.employeeId]
  );
  res.json({ success: true, message: 'تم جلب الاقتراحات بنجاح', data: rows.map(r => ({ ...r, dayName: fullArabicDate(new Date(r.date)) })) });
});

*/



// ── GET /api/suggestions  (HR) ───────────────────────────────────────────────
/*router.get('/', requireHR, async (req, res) => {
  const { status = 'all', employee_id, month } = req.query;
  let sql = 'SELECT * FROM time_edit_suggestions WHERE 1=1';
  const params = [];
  if (status !== 'all') { sql += ' AND status = ?'; params.push(status); }
  if (employee_id)       { sql += ' AND employee_id = ?'; params.push(employee_id); }
  if (month)             { sql += " AND DATE_FORMAT(date,'%Y-%m') = ?"; params.push(month); }
  sql += ' ORDER BY status ASC, created_at DESC';

  const [rows] = await pool.execute(sql, params);
  res.json({ success: true, message: 'تم جلب الاقتراحات بنجاح', data: rows.map(r => ({ ...r, dayName: fullArabicDate(new Date(r.date)) })) });
});

*/


// ── POST /api/suggestions  (employee submits) ────────────────────────────────

/*router.post('/', requireLogin, async (req, res) => {
  let { recordId, entreeTime, startBreak, finishBreak, exitTime,
        exitAfterMidnight, reason, magasin, date } = req.body;

  if (exitAfterMidnight && exitTime) exitTime = addMidnight(exitTime);

  // Validate magasin exists if recordId == 0
  if (recordId === 0) {
    const [mg] = await pool.execute('SELECT COUNT(*) as c FROM attendance_records WHERE magasin = ?', [magasin]);
    if (!mg[0].c || !magasin || !date || !entreeTime || !exitTime || !reason) {
      return res.json({ success: false, message: 'بيانات غير مكتملة' });
    }
  } else {
    if (!reason || !recordId) return res.json({ success: false, message: 'بيانات غير مكتملة' });
  }

  // Check duplicate
  const [dup] = await pool.execute(
    'SELECT id FROM time_edit_suggestions WHERE (attendance_record_id = ? AND employee_id = ?) OR (attendance_record_id IS NULL AND employee_id = ? AND date = ?)',
    [recordId, req.session.employeeId, req.session.employeeId, date]
  );
  if (dup.length) return res.json({ success: false, message: 'لقد قمت بإرسال اقتراح لهذا السجل مسبقاً' });

  // Check frozen
  if (recordId !== 0) {
    const [rec] = await pool.execute('SELECT date FROM attendance_records WHERE id = ?', [recordId]);
    if (rec.length) {
      const month = rec[0].date.toISOString().slice(0,7);
      const [frozen] = await pool.execute(
        'SELECT is_frozen FROM frozen_months WHERE employee_id = ? AND month = ?',
        [req.session.employeeId, month]
      );
      if (frozen.length) return res.json({ success: false, message: 'هذا الشهر مجمد. لا يمكن إجراء تعديلات' });
    }
  }

  if (recordId === 0) {
    await pool.execute(
      `INSERT INTO time_edit_suggestions
       (employee_id, employee_name, date, suggested_entree_time, suggested_start_break,
        suggested_finish_break, suggested_exit_time, reason, status, suggested_magasin)
       VALUES (?,?,?,?,?,?,?,'pending',?)`,
      [req.session.employeeId, req.session.fullName, date, entreeTime, startBreak, finishBreak, exitTime, reason, magasin]
    );
    // Note: ?, is 8 placeholders; let me recount and fix
  } else {
    const [record] = await pool.execute('SELECT * FROM attendance_records WHERE id = ?', [recordId]);
    if (!record.length) return res.json({ success: false, message: 'السجل غير موجود' });
    if (record[0].employee_id != req.session.employeeId)
      return res.json({ success: false, message: 'غير مصرح لك بتعديل هذا السجل' });

    await pool.execute(
      `INSERT INTO time_edit_suggestions
       (attendance_record_id, employee_id, employee_name, date,
        suggested_entree_time, suggested_start_break, suggested_finish_break, suggested_exit_time,
        reason, status)
       VALUES (?,?,?,?,?,?,?,?,?,'pending')`,
      [recordId, req.session.employeeId, req.session.fullName, record[0].date, entreeTime, startBreak, finishBreak, exitTime, reason]
    );
  }

  await logAction(req, 'suggest_time_edit', `اقتراح تعديل للتاريخ: ${date}`);
  res.json({ success: true, message: 'تم إرسال الاقتراح بنجاح' });
});

*/



// ── POST /api/suggestions/:id/approve  (HR) ──────────────────────────────────
/*router.post('/:id/approve', requireHR, async (req, res) => {
  const { id } = req.params;
  const { adminNotes = '' } = req.body;

  const [rows] = await pool.execute(
    `SELECT tes.*, ar.*, tes.status as suggested_status,
       tes.employee_id as suggested_employee_id,
       tes.employee_name as suggested_employee_name,
       tes.date as suggested_date
     FROM time_edit_suggestions tes
     LEFT JOIN attendance_records ar ON tes.attendance_record_id = ar.id
     WHERE tes.id = ?`,
    [id]
  );
  const suggestion = rows[0];
  if (!suggestion) return res.json({ success: false, message: 'الاقتراح غير موجود' });
  if (suggestion.suggested_status !== 'pending') return res.json({ success: false, message: 'هذا الاقتراح تمت معالجته مسبقاً' });

  // Build ordered times
  const rawTimes = [
    suggestion.suggested_entree_time  || suggestion.entree_time,
    suggestion.suggested_start_break  || suggestion.start_break,
    suggestion.suggested_finish_break || suggestion.finish_break,
    suggestion.suggested_exit_time    || suggestion.exit_time,
  ].filter(t => t && t.toLowerCase() !== 'null' && t !== '00:00:00');

  const times = [...new Set(rawTimes)].sort();
  const punch_count = times.length;
  let [entree_time, start_break, finish_break, exit_time] = [null, null, null, null];
  if (punch_count >= 1) entree_time = times[0];
  if (punch_count === 2) exit_time = times[1];
  else if (punch_count === 3) { start_break = times[1]; exit_time = times[2]; }
  else if (punch_count >= 4) { start_break = times[1]; finish_break = times[2]; exit_time = times[3]; }

  let recordId = suggestion.attendance_record_id;

  try {
    if (!recordId) {
      const arabicDate = suggestion.suggested_date;
      const [ins] = await pool.execute(
        `INSERT INTO attendance_records
         (entree_time, start_break, finish_break, exit_time, last_edited_by,
          employee_id, employee_name, magasin, date, day_name, status, punch_count)
         VALUES (?,?,?,?,?,?,?,?,?,?,'Présence',?)`,
        [entree_time, start_break, finish_break, exit_time, req.session.username,
         suggestion.suggested_employee_id, suggestion.suggested_employee_name,
         suggestion.suggested_magasin, arabicDate, arabicDate, punch_count]
      );
      recordId = ins.insertId;
    } else {
      const updates = [];
      const params = [];
      if (entree_time) { updates.push('entree_time = ?'); params.push(entree_time); }
      if (start_break) { updates.push('start_break = ?'); params.push(start_break); }
      if (finish_break){ updates.push('finish_break = ?'); params.push(finish_break); }
      if (exit_time)   { updates.push('exit_time = ?');   params.push(exit_time); }
      updates.push('punch_count = ?'); params.push(punch_count);
      updates.push('edit_count = edit_count + 1');
      updates.push('last_edited_by = ?'); params.push(req.session.username);
      updates.push('last_edited_at = NOW()');
      params.push(recordId);
      await pool.execute(`UPDATE attendance_records SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    await pool.execute(
      "UPDATE time_edit_suggestions SET attendance_record_id=?, status='approved', admin_notes=?, reviewed_at=NOW(), reviewed_by=? WHERE id=?",
      [recordId, adminNotes, req.session.userId, id]
    );

    await logAction(req, 'approve_suggestion', `قبول اقتراح تعديل - موظف: ${suggestion.suggested_employee_name}`);
    res.json({ success: true, message: 'تم قبول الاقتراح وتحديث البيانات بنجاح' });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

*/



// ── POST /api/suggestions/:id/reject  (HR) ───────────────────────────────────
/*router.post('/:id/reject', requireHR, async (req, res) => {
  const { id } = req.params;
  const { adminNotes = '' } = req.body;

  const [rows] = await pool.execute('SELECT * FROM time_edit_suggestions WHERE id = ?', [id]);
  const suggestion = rows[0];
  if (!suggestion) return res.json({ success: false, message: 'الاقتراح غير موجود' });
  if (suggestion.status !== 'pending') return res.json({ success: false, message: 'هذا الاقتراح تمت معالجته مسبقاً' });

  await pool.execute(
    "UPDATE time_edit_suggestions SET status='rejected', admin_notes=?, reviewed_at=NOW(), reviewed_by=? WHERE id=?",
    [adminNotes, req.session.userId, id]
  );
  await logAction(req, 'reject_suggestion', `رفض اقتراح تعديل - موظف: ${suggestion.employee_name}`);
  res.json({ success: true, message: 'تم رفض الاقتراح' });
});
*/




// ── POST /api/suggestions/hr-edit  (HR direct time edit) ─────────────────────
/*router.post('/hr-edit', requireHR, async (req, res) => {
  const { recordId, field, value, exit_after_midnight } = req.body;
  const allowed = ['entree_time', 'start_break', 'finish_break', 'exit_time'];
  if (!recordId || !field || !allowed.includes(field)) {
    return res.json({ success: false, message: 'البيانات غير كاملة أو حقل غير مسموح' });
  }

  let finalValue = value;
  if (field === 'exit_time' && exit_after_midnight && value) {
    finalValue = addMidnight(value);
  }

  const [rows] = await pool.execute('SELECT * FROM attendance_records WHERE id = ?', [recordId]);
  if (!rows.length) return res.json({ success: false, message: 'السجل غير موجود' });

  await pool.execute(
    `UPDATE attendance_records SET ${field} = ?, edit_count = edit_count + 1, last_edited_by = ?, last_edited_at = NOW() WHERE id = ?`,
    [finalValue, req.session.username, recordId]
  );
  await logAction(req, 'hr_edit_time', `تعديل HR - ${rows[0].employee_name} - ${field} = ${finalValue}`);
  res.json({ success: true, message: 'تم التعديل بنجاح' });
});
*/





// ── POST /api/suggestions/manual-entry  (HR manual entry) ────────────────────
/*router.post('/manual-entry', requireHR, async (req, res) => {
  const { recordId, missingFields = {}, exit_after_midnight, notes = '' } = req.body;
  if (!recordId || !Object.keys(missingFields).length) {
    return res.json({ success: false, message: 'البيانات غير كاملة' });
  }

  const [rows] = await pool.execute('SELECT * FROM attendance_records WHERE id = ?', [recordId]);
  const record = rows[0];
  if (!record) return res.json({ success: false, message: 'السجل غير موجود' });

  const updates = [];
  const params = [];
  for (const [f, v] of Object.entries(missingFields)) {
    if (!v) continue;
    let finalV = v;
    if (f === 'exit_time' && exit_after_midnight) finalV = addMidnight(v);
    updates.push(`${f} = ?`);
    params.push(finalV);
  }

  if (updates.length) {
    updates.push('edit_count = edit_count + 1');
    updates.push('last_edited_by = ?'); params.push(req.session.username);
    updates.push('last_edited_at = NOW()');
    params.push(recordId);
    await pool.execute(`UPDATE attendance_records SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  await pool.execute(
    `INSERT INTO time_edit_suggestions
     (attendance_record_id, employee_id, employee_name, date,
      suggested_entree_time, suggested_start_break, suggested_finish_break, suggested_exit_time,
      reason, status, admin_notes, manual_entry, reviewed_by, reviewed_at)
     VALUES (?,?,?,?,?,?,?,?,'إدخال يدوي من HR','approved',?,1,?,NOW())`,
    [recordId, record.employee_id, record.employee_name, record.date,
     missingFields.entree_time ?? null, missingFields.start_break ?? null,
     missingFields.finish_break ?? null, missingFields.exit_time ?? null,
     notes, req.session.userId]
  );

  await logAction(req, 'manual_time_entry', `إدخال يدوي - موظف: ${record.employee_name}`);
  res.json({ success: true, message: 'تم الإدخال اليدوي بنجاح' });
});

*/



// ── GET /api/suggestions/export  (HR) ────────────────────────────────────────


/*router.get('/export', requireHR, async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM time_edit_suggestions ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
});
*/



// ── GET /api/suggestions التعديلات /mine  (logged in employee) ──────────────────────────

router.get('/mine', requireLogin, suggestionsController.getMySuggestionsController);


// ── GET /api/suggestions  التعديلات (HR) ───────────────────────────────────────────────

router.get('/', requireHR, suggestionsController.getSuggestionsController);


// ── POST /api/suggestions  (employee submits) ────────────────────────────────


router.post('/', requireLogin, suggestionsController.createSuggestionController);



// ── POST /api/suggestions/:id/approve  (HR) ──────────────────────────────────


router.post('/:id/approve',requireHR,suggestionsController.approveSuggestionController);


// ── POST /api/suggestions/:id/reject  (HR) ───────────────────────────────────


router.post('/:id/reject',requireHR,suggestionsController.rejectSuggestionController);


// ── POST /api/suggestions/hr-edit  (HR direct time edit) ─────────────────────



router.post('/hr-edit',requireHR,suggestionsController.hrEditTimeController);



// ── POST /api/suggestions/manual-entry  (HR manual entry) ────────────────────


router.post("/manual-entry", requireHR, suggestionsController.manualEntryController);


// ── GET /api/suggestions/export  (HR) (*****) ────────────────────────────────────────


router.get('/export',requireHR,suggestionsController.exportSuggestionsController);


export default router;