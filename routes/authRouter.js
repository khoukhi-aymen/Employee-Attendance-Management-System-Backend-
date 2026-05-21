import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { isLoggedIn, logAction } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';

const router = Router();

// POST /api/auth/login

/*router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, message: 'الرجاء إدخال اسم المستخدم وكلمة المرور' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = 1',
      [username]
    );
    const user = rows[0];

    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.fullName = user.full_name;
      req.session.employeeId = String(user.employee_id).trim();
      req.session.role = user.role;
      req.session.lastActivity = Date.now();

      await logAction(req, 'login_success', `تسجيل دخول ناجح - ${user.role}`);

      return res.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        data: { role: user.role, fullName: user.full_name, employeeId: user.employee_id },
      });
    }

    await logAction(req, 'login_failed', `محاولة دخول فاشلة - ${username}`);
    return res.json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  } catch (e) {
    return res.json({ success: false, message: 'خطأ في قاعدة البيانات: ' + e.message });
  }
});

*/



// POST /api/auth/logout
/*router.post('/logout', async (req, res) => {
  await logAction(req, 'logout', 'تسجيل خروج');
  req.session.destroy(() => {});
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});*/


// GET /api/auth/session

/*router.get('/session', (req, res) => {
  if (isLoggedIn(req)) {
    return res.json({
      success: true,
      message: 'الجلسة نشطة',
      data: {
        role: req.session.role,
        fullName: req.session.fullName,
        employeeId: req.session.employeeId,
      },
    });
  }
  res.json({ success: false, message: 'انتهت الجلسة' });
});*/



// POST /api/auth/update-password
/*router.post('/update-password', async (req, res) => {
  if (!isLoggedIn(req)) return res.json({ success: false, message: 'الرجاء تسجيل الدخول' });

  const { newPassword } = req.body;
  if (!newPassword) return res.json({ success: false, message: 'كلمة المرور الجديدة مطلوبة' });

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.session.userId]);
    await logAction(req, 'update_pwd', `تحديث كلمة المرور للمستخدم: ${req.session.userId}`);
    res.json({ success: true, message: 'تم التحديث بنجاح' });
  } catch (e) {
    res.json({ success: false, message: 'خطأ: ' + e.message });
  }
});*/



// POST /api/auth/login
router.post('/login', authController.loginController);

// POST /api/auth/logout
router.post('/logout', authController.logoutController);

// GET /api/auth/session (*****)
router.get('/session', authController.sessionController);

// POST /api/auth/update-password
router.post('/update-password', authController.updatePasswordController);



export default router;