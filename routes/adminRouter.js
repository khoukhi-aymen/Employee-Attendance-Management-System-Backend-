import { Router } from 'express';
import pool from '../db.js';
import { requireAdmin, logAction } from '../middleware/auth.js';
import * as adminController from '../controllers/adminController.js';
import { fullArabicDate,convertTo24Hour,parseDate } from '../helpers/dateHelpers.js';

const router = Router();

// GET /api/admin/logs
/*router.get('/logs', requireAdmin, async (req, res) => {
  const { limit = 100, action_filter, user_filter, date_from, date_to } = req.query;

  let sql = 'SELECT * FROM system_logs WHERE 1=1';
  const params = [];
  if (action_filter && action_filter !== 'all') { sql += ' AND action = ?'; params.push(action_filter); }
  if (user_filter && user_filter !== 'all')     { sql += ' AND username = ?'; params.push(user_filter); }
  if (date_from) { sql += ' AND DATE(created_at) >= ?'; params.push(date_from); }
  if (date_to)   { sql += ' AND DATE(created_at) <= ?'; params.push(date_to); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const [rows] = await pool.execute(sql, params);
  res.json({ success: true, data: rows });
});

*/



// DELETE /api/admin/logs
/*router.delete('/logs', requireAdmin, async (req, res) => {
  await pool.execute('DELETE FROM system_logs');
  await logAction(req, 'clear_logs', 'محو جميع السجلات');
  res.json({ success: true, message: 'تم محو السجلات بنجاح' });
});
*/


// GET /api/admin/users  (distinct usernames for filter)
/*router.get('/users', requireAdmin, async (req, res) => {
  const [rows] = await pool.execute('SELECT DISTINCT username FROM users ORDER BY username');
  res.json({ success: true, data: rows });
});
*/



// ── GET /api/admin/logs ─────────────────────────────────────

router.get('/logs',requireAdmin,adminController.getLogsController);


// ── DELETE /api/admin/logs ─────────────────────────────────────

router.delete('/logs',requireAdmin,adminController.clearLogsController);

// ── GET /api/admin/users ─────────────────────────────────────

router.get('/users',requireAdmin,adminController.getUsersController);

export default router;