import pool from '../db.js';

/** Refresh session activity; returns false if session expired */
export function isLoggedIn(req) {
  if (!req.session?.userId) return false;
  const now = Date.now();
  if (req.session.lastActivity && now - req.session.lastActivity > 900_000) {
    req.session.destroy(() => {});
    return false;
  }
  req.session.lastActivity = now;
  return true;
}

export const requireLogin = (req, res, next) => {
   console.log("===== SESSION =====");
  console.log(req.session);
  if (!isLoggedIn(req)) {
    return res.json({ success: false, message: 'الرجاء تسجيل الدخول' });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!isLoggedIn(req)) return res.json({ success: false, message: 'الرجاء تسجيل الدخول' });
  if (!['admin', 'superadmin'].includes(req.session.role)) {
    return res.json({ success: false, message: 'غير مصرح لك بهذا الإجراء' });
  }
  next();
};

export const requireSuperAdmin = (req, res, next) => {
  if (!isLoggedIn(req)) return res.json({ success: false, message: 'الرجاء تسجيل الدخول' });
  if (req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'غير مصرح لك بهذا الإجراء - SuperAdmin فقط' });
  }
  next();
};

export const requireHR = (req, res, next) => {
  if (!isLoggedIn(req)) return res.json({ success: false, message: 'الرجاء تسجيل الدخول' });
  if (req.session.role !== 'hr') {
    return res.json({ success: false, message: 'غير مصرح لك بهذا الإجراء - HR فقط' });
  }
  next();
};

export const requireAdminOrHR = (req, res, next) => {
  if (!isLoggedIn(req)) return res.json({ success: false, message: 'الرجاء تسجيل الدخول' });
  if (!['admin', 'superadmin', 'hr'].includes(req.session.role)) {
    return res.json({ success: false, message: 'غير مصرح لك بهذا الإجراء' });
  }
  next();
};

/** Write an entry to system_logs */
export async function logAction(req, action, description = '') {
  try {
    await pool.execute(
      'INSERT INTO system_logs (user_id, username, action, description, ip_address, user_agent) VALUES (?,?,?,?,?,?)',
      [
        req?.session?.userId ?? null,
        req?.session?.username ?? 'guest',
        action,
        description,
        req?.ip ?? '',
        req?.headers?.['user-agent'] ?? '',
      ]
    );
  } catch (e) {
    console.error('logAction failed:', e.message);
  }
}
