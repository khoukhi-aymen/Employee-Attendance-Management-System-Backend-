import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAdmin, requireSuperAdmin, logAction } from '../middleware/auth.js';
import * as hrController from '../controllers/hrController.js';

const router = Router();

// ── HR accounts (managed by admin) ─────────────────────────────────────────

/*router.get('/accounts', requireAdmin, async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, username, full_name, employee_id, is_active FROM users WHERE role='hr' ORDER BY full_name"
  );
  res.json({ success: true, message: 'تم جلب البيانات بنجاح', data: rows });
});

*/


/*router.post('/accounts', requireAdmin, async (req, res) => {
  const { username, password, fullName, employeeId, isActive = true } = req.body;
  if (!username || !password || !fullName || !employeeId)
    return res.json({ success: false, message: 'الرجاء ملء جميع الحقول' });

  const [dup] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
  if (dup.length) return res.json({ success: false, message: 'اسم المستخدم موجود مسبقاً' });

  const hashed = await bcrypt.hash(password, 10);
  await pool.execute(
    "INSERT INTO users (username, password, full_name, employee_id, role, is_active) VALUES (?,?,?,?,'hr',?)",
    [username, hashed, fullName, employeeId, isActive]
  );
  await logAction(req, 'create_hr_account', `إنشاء حساب HR: ${fullName}`);
  res.json({ success: true, message: 'تم إنشاء حساب HR بنجاح' });
});
*/


/*router.put('/accounts/:username', requireAdmin, async (req, res) => {
  const { username } = req.params;
  const { password, fullName, employeeId, isActive = true } = req.body;
  if (!fullName || !employeeId) return res.json({ success: false, message: 'الرجاء ملء جميع الحقول' });

  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    await pool.execute(
      "UPDATE users SET password=?, full_name=?, employee_id=?, is_active=? WHERE username=? AND role='hr'",
      [hashed, fullName, employeeId, isActive, username]
    );
  } else {
    await pool.execute(
      "UPDATE users SET full_name=?, employee_id=?, is_active=? WHERE username=? AND role='hr'",
      [fullName, employeeId, isActive, username]
    );
  }
  await logAction(req, 'update_hr_account', `تحديث حساب HR: ${fullName}`);
  res.json({ success: true, message: 'تم تحديث الحساب بنجاح' });
});
*/


/*router.delete('/accounts/:username', requireAdmin, async (req, res) => {
  const { username } = req.params;
  await pool.execute("DELETE FROM users WHERE username=? AND role='hr'", [username]);
  await logAction(req, 'delete_hr_account', `حذف حساب HR: ${username}`);
  res.json({ success: true, message: 'تم حذف الحساب بنجاح' });
});
*/



// ── Admin accounts (managed by superadmin only) ─────────────────────────────

/*router.get('/admin-accounts', requireSuperAdmin, async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, username, full_name, employee_id, is_active FROM users WHERE role='admin' ORDER BY full_name"
  );
  res.json({ success: true, message: 'تم جلب البيانات بنجاح', data: rows });
});
*/



/*router.post('/admin-accounts', requireSuperAdmin, async (req, res) => {
  const { username, password, fullName, employeeId, isActive = true } = req.body;
  if (!username || !password || !fullName || !employeeId)
    return res.json({ success: false, message: 'الرجاء ملء جميع الحقول' });

  const [dup] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
  if (dup.length) return res.json({ success: false, message: 'اسم المستخدم موجود مسبقاً' });

  const hashed = await bcrypt.hash(password, 10);
  await pool.execute(
    "INSERT INTO users (username, password, full_name, employee_id, role, is_active) VALUES (?,?,?,?,'admin',?)",
    [username, hashed, fullName, employeeId, isActive]
  );
  await logAction(req, 'create_admin_account', `إنشاء حساب Admin: ${fullName}`);
  res.json({ success: true, message: 'تم إنشاء حساب Admin بنجاح' });
});
*/



/*router.put('/admin-accounts/:username', requireSuperAdmin, async (req, res) => {
  const { username } = req.params;
  const { password, fullName, employeeId, isActive = true } = req.body;
  if (!fullName || !employeeId) return res.json({ success: false, message: 'الرجاء ملء جميع الحقول' });

  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    await pool.execute(
      "UPDATE users SET password=?, full_name=?, employee_id=?, is_active=? WHERE username=? AND role='admin'",
      [hashed, fullName, employeeId, isActive, username]
    );
  } else {
    await pool.execute(
      "UPDATE users SET full_name=?, employee_id=?, is_active=? WHERE username=? AND role='admin'",
      [fullName, employeeId, isActive, username]
    );
  }
  await logAction(req, 'update_admin_account', `تحديث حساب Admin: ${fullName}`);
  res.json({ success: true, message: 'تم تحديث الحساب بنجاح' });
});
*/


/*router.delete('/admin-accounts/:username', requireSuperAdmin, async (req, res) => {
  const { username } = req.params;
  await pool.execute("DELETE FROM users WHERE username=? AND role='admin'", [username]);
  await logAction(req, 'delete_admin_account', `حذف حساب Admin: ${username}`);
  res.json({ success: true, message: 'تم حذف الحساب بنجاح' });
});
*/



//************** */ HR accounts (managed by admin) **************************/

// ── GET /api/hr/accounts ─────────────────────────────────────

router.get('/accounts',requireAdmin,hrController.getHRAccountsController);


// ── POST /api/hr/accounts (admin) ─────────────────────────────────────

router.post('/accounts',requireAdmin,hrController.createHRAccountController);


// ── PUT /api/hr/accounts/:username (admin) ─────────────────────────────────────

router.put('/accounts/:username',requireAdmin,hrController.updateHRAccountController);


// ── DELETE /api/hr/accounts/:username (admin) ─────────────────────────────────────


router.delete('/accounts/:username',requireAdmin,hrController.deleteHRAccountController);


//************ Admin accounts (managed by superadmin only)  **************************/

// ── GET /api/hr/admin-accounts (superadmin) ────────────────────────────────

router.get('/admin-accounts',requireSuperAdmin,hrController.getAdminAccountsController);


// ── POST /api/hr/admin-accounts (superadmin) ─────────────────────────────────────

router.post('/admin-accounts',requireSuperAdmin,hrController.createAdminAccountController);


// ── PUT /api/hr/admin-accounts/:username (superadmin) ─────────────────────────────────────

router.put('/admin-accounts/:username',requireSuperAdmin,hrController.updateAdminAccountController);


// ── DELETE /api/hr/admin-accounts/:username (superadmin) ─────────────────────

router.delete('/admin-accounts/:username',requireSuperAdmin,hrController.deleteAdminAccountController);

export default router;