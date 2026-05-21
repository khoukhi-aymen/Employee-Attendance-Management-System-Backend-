import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAdmin, requireAdminOrHR, logAction } from '../middleware/auth.js';
import * as employeesController from '../controllers/employeesController.js';

const router = Router();

// GET /api/employees  (admin or HR)

/*router.get('/', requireAdminOrHR, async (req, res) => {
  const activeOnly = req.query.activeOnly === 'true';
  try {
    const sql = activeOnly
      ? "SELECT id, username, full_name, employee_id, is_active FROM users WHERE role = 'employee' AND is_active = 1 ORDER BY full_name"
      : "SELECT id, username, full_name, employee_id, is_active FROM users WHERE role = 'employee' ORDER BY full_name";
    const [rows] = await pool.execute(sql);
    res.json({ success: true, message: 'تم جلب البيانات بنجاح', data: rows });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});
*/

// POST /api/employees  (admin)

/*router.post('/', requireAdmin, async (req, res) => {
  const { username, password, fullName, employeeId, isActive = true } = req.body;
  if (!username || !password || !fullName || !employeeId) {
    return res.json({ success: false, message: 'الرجاء ملء جميع الحقول' });
  }

  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length) return res.json({ success: false, message: 'اسم المستخدم موجود مسبقاً' });

    const [dup] = await pool.execute(
      "SELECT id FROM users WHERE employee_id = ? AND role = 'employee'",
      [employeeId]
    );
    if (dup.length) return res.json({ success: false, message: 'المعرف موجود مسبقاً' });

    const hashed = await bcrypt.hash(password, 10);
    await pool.execute(
      "INSERT INTO users (username, password, full_name, employee_id, role, is_active) VALUES (?,?,?,?,'employee',?)",
      [username, hashed, fullName, employeeId, isActive]
    );
    await logAction(req, 'create_employee', `إنشاء موظف: ${fullName}`);
    res.json({ success: true, message: 'تم إنشاء الحساب بنجاح' });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});
*/



// PUT /api/employees/:username  (admin)

/*router.put('/:username', requireAdmin, async (req, res) => {
  const { username } = req.params;
  const { password, fullName, employeeId, isActive = true } = req.body;
  if (!fullName || !employeeId) return res.json({ success: false, message: 'الرجاء ملء جميع الحقول' });

  try {
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await pool.execute(
        "UPDATE users SET password=?, full_name=?, employee_id=?, is_active=? WHERE username=? AND role='employee'",
        [hashed, fullName, employeeId, isActive, username]
      );
    } else {
      await pool.execute(
        "UPDATE users SET full_name=?, employee_id=?, is_active=? WHERE username=? AND role='employee'",
        [fullName, employeeId, isActive, username]
      );
    }
    await logAction(req, 'update_employee', `تحديث موظف: ${fullName}`);
    res.json({ success: true, message: 'تم تحديث الحساب بنجاح' });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

*/



// DELETE /api/employees/:username  (admin)

/*router.delete('/:username', requireAdmin, async (req, res) => {
  const { username } = req.params;
  try {
    await pool.execute("DELETE FROM users WHERE username=? AND role='employee'", [username]);
    await logAction(req, 'delete_employee', `حذف موظف: ${username}`);
    res.json({ success: true, message: 'تم حذف الموظف بنجاح' });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

*/



// POST /api/employees/bulk  (admin) - bulk create

/*router.post('/bulk', requireAdmin, async (req, res) => {
  const { employees = [] } = req.body;
  if (!employees.length) return res.json({ success: false, message: 'لا توجد بيانات' });

  let successCount = 0, failCount = 0;
  for (const emp of employees) {
    const { username, password, fullName, employeeId, isActive = true } = emp;
    if (!username || !password || !fullName || !employeeId) { failCount++; continue; }

    const [dup] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (dup.length) { failCount++; continue; }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      "INSERT INTO users (username, password, full_name, employee_id, role, is_active) VALUES (?,?,?,?,'employee',?)",
      [username, hashed, fullName, employeeId, isActive]
    );
    result.affectedRows ? successCount++ : failCount++;
  }

  await logAction(req, 'bulk_create_employees', `رفع دفعة: ${successCount} نجح، ${failCount} فشل`);
  res.json({ success: true, message: `تم إضافة ${successCount} موظف، فشل ${failCount}` });
});

*/



// ── GET /api/employees (admin or HR) ─────────────────────────────────────

router.get('/',requireAdminOrHR,employeesController.getEmployeesController);


// POST /api/employees (admin) ─────────────────────────────────────


router.post( '/',requireAdmin,employeesController.createEmployeeController);


// ── PUT /api/employees/:username ─────────────────────────────────────

router.put('/:username',requireAdmin,employeesController.updateEmployeeController);


// ── DELETE /api/employees/:username ─────────────────────────────────────

router.delete('/:username',requireAdmin,employeesController.deleteEmployeeController);


// ── POST /api/employees/bulk (via excel  admin seulement) ─────────────────────────────────────

router.post('/bulk',requireAdmin,employeesController.bulkCreateEmployeesController);

export default router;