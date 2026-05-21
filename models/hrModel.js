import pool from '../db.js';
import bcrypt from 'bcryptjs';
import { fullArabicDate,convertTo24Hour,parseDate } from '../helpers/dateHelpers.js';
import { logAction ,isLoggedIn } from '../middleware/auth.js';


//************** */ HR accounts (managed by admin) **************************/


// ── GET /api/hr/accounts (admin) ─────────────────────────────────────

export const getHRAccountsModel = (req) => {

  return new Promise((resolve, reject) => {

    pool.execute(
      `SELECT 
          id,
          username,
          full_name,
          employee_id,
          is_active
       FROM users
       WHERE role = 'hr'
       ORDER BY full_name`
    )

    .then(([rows]) => {

      resolve({
        success: true,
        message: 'تم جلب البيانات بنجاح',
        data: rows
      });

    })

    .catch((err) => {

      reject({
        success: false,
        message: 'فشل في جلب حسابات HR'
      });

    });

  });

};



// ── POST /api/hr/accounts (admin) ─────────────────────────────────────

export const createHRAccountModel = (body, req) => {

  return new Promise((resolve, reject) => {

    const {
      username,
      password,
      fullName,
      employeeId,
      isActive = true
    } = body;

    // validation

    if (
      !username ||
      !password ||
      !fullName ||
      !employeeId
    ) {

      return resolve({
        success: false,
        message: 'الرجاء ملء جميع الحقول'
      });

    }

    // check duplicate username

    pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    )

    .then(([dup]) => {

      if (dup.length) {

        return resolve({
          success: false,
          message: 'اسم المستخدم موجود مسبقاً'
        });

      }

      // hash password

      bcrypt.hash(password, 10)

      .then((hashed) => {

        // insert hr account

        pool.execute(
          `INSERT INTO users
          (
            username,
            password,
            full_name,
            employee_id,
            role,
            is_active
          )
          VALUES
          (
            ?,
            ?,
            ?,
            ?,
            'hr',
            ?
          )`,
          [
            username,
            hashed,
            fullName,
            employeeId,
            isActive
          ]
        )

        .then(() => {

          // log action بدون then/catch

          logAction(req,'create_hr_account',`إنشاء حساب HR: ${fullName}`);

          // success response

          resolve({
            success: true,
            message: 'تم إنشاء حساب HR بنجاح'
          });

        })

        .catch(() => {

          reject({
            success: false,
            message: 'فشل إنشاء حساب HR'
          });

        });

      })

      .catch(() => {

        reject({
          success: false,
          message: 'فشل تشفير كلمة المرور'
        });

      });

    })

    .catch(() => {

      reject({
        success: false,
        message: 'حدث خطأ أثناء التحقق من المستخدم'
      });

    });

  });

};


// ── PUT /api/hr/accounts/:username (admin) ─────────────────────────────────────


export const updateHRAccountModel = (body, username, req) => {

  return new Promise((resolve, reject) => {

    const {
      password,
      fullName,
      employeeId,
      isActive = true
    } = body;

    // validation

    if (!fullName || !employeeId) {

      return resolve({
        success: false,
        message: 'الرجاء ملء جميع الحقول'
      });

    }

    // if password exists

    if (password) {

      bcrypt.hash(password, 10)

        .then((hashed) => {

          pool.execute(
            `UPDATE users
             SET
             password = ?,
             full_name = ?,
             employee_id = ?,
             is_active = ?
             WHERE username = ?
             AND role = 'hr'`,
            [
              hashed,
              fullName,
              employeeId,
              isActive,
              username
            ]
          )

          .then(() => {

            // log action بدون then/catch

            logAction(req,'update_hr_account',`تحديث حساب HR: ${fullName}`);

            resolve({
              success: true,
              message: 'تم تحديث الحساب بنجاح'
            });

          })

          .catch(() => {

            reject({
              success: false,
              message: 'فشل تحديث الحساب'
            });

          });

        })

        .catch(() => {

          reject({
            success: false,
            message: 'فشل تشفير كلمة المرور'
          });

        });

    }

    // without password

    else {

      pool.execute(
        `UPDATE users
         SET
         full_name = ?,
         employee_id = ?,
         is_active = ?
         WHERE username = ?
         AND role = 'hr'`,
        [
          fullName,
          employeeId,
          isActive,
          username
        ]
      )

      .then(() => {

        // log action بدون then/catch

        logAction(req,'update_hr_account',`تحديث حساب HR: ${fullName}`);

        resolve({
          success: true,
          message: 'تم تحديث الحساب بنجاح'
        });

      })

      .catch(() => {

        reject({
          success: false,
          message: 'فشل تحديث الحساب'
        });

      });

    }

  });

};


// ── DELETE /api/hr/accounts/:username (admin) ─────────────────────────────────────


export const deleteHRAccountModel = (username, req) => {

  return new Promise((resolve, reject) => {

    // delete hr account

    pool.execute(
      `DELETE FROM users
       WHERE username = ?
       AND role = 'hr'`,
      [username]
    )

    .then(() => {

      // log action 

      logAction(req,'delete_hr_account',`حذف حساب HR: ${username}`);

      resolve({
        success: true,
        message: 'تم حذف الحساب بنجاح'
      });

    })

    .catch(() => {

      reject({
        success: false,
        message: 'فشل حذف الحساب'
      });

    });

  });

};




//************ Admin accounts (managed by superadmin only)  **************************/


// ── GET /api/hr/admin-accounts (superadmin) ─────────────────────────────────────

export const getAdminAccountsModel = () => {

  return new Promise((resolve, reject) => {

    pool.execute(
      `SELECT
        id,
        username,
        full_name,
        employee_id,
        is_active
       FROM users
       WHERE role = 'admin'
       ORDER BY full_name`
    )

    .then(([rows]) => {

      resolve({
        success: true,
        message: 'تم جلب البيانات بنجاح',
        data: rows
      });

    })

    .catch(() => {

      reject({
        success: false,
        message: 'فشل جلب حسابات Admin'
      });

    });

  });

};



// ── POST /api/hr/admin-accounts (superadmin) ─────────────────────────────────────

export const createAdminAccountModel = (body, req) => {

  return new Promise((resolve, reject) => {

    const {
      username,
      password,
      fullName,
      employeeId,
      isActive = true
    } = body;

    // validation

    if (
      !username ||
      !password ||
      !fullName ||
      !employeeId
    ) {

      return resolve({
        success: false,
        message: 'الرجاء ملء جميع الحقول'
      });

    }

    // check duplicate username

    pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    )

    .then(([dup]) => {

      if (dup.length) {

        return resolve({
          success: false,
          message: 'اسم المستخدم موجود مسبقاً'
        });

      }

      // hash password

      bcrypt.hash(password, 10)

      .then((hashed) => {

        // insert admin account

        pool.execute(
          `INSERT INTO users
          (
            username,
            password,
            full_name,
            employee_id,
            role,
            is_active
          )
          VALUES
          (
            ?,
            ?,
            ?,
            ?,
            'admin',
            ?
          )`,
          [
            username,
            hashed,
            fullName,
            employeeId,
            isActive
          ]
        )

        .then(() => {

          // log action

          logAction(req,'create_admin_account',`إنشاء حساب Admin: ${fullName}`);

          resolve({
            success: true,
            message: 'تم إنشاء حساب Admin بنجاح'
          });

        })

        .catch(() => {

          reject({
            success: false,
            message: 'فشل إنشاء حساب Admin'
          });

        });

      })

      .catch(() => {

        reject({
          success: false,
          message: 'فشل تشفير كلمة المرور'
        });

      });

    })

    .catch(() => {

      reject({
        success: false,
        message: 'حدث خطأ أثناء التحقق من المستخدم'
      });

    });

  });

};




// ── PUT /api/hr/admin-accounts/:username (superadmin) ─────────────────────────────────────

export const updateAdminAccountModel = (body, username, req) => {

  return new Promise((resolve, reject) => {

    const {
      password,
      fullName,
      employeeId,
      isActive = true
    } = body;

    // validation

    if (!fullName || !employeeId) {

      return resolve({
        success: false,
        message: 'الرجاء ملء جميع الحقول'
      });

    }

    // if password exists

    if (password) {

      bcrypt.hash(password, 10)

      .then((hashed) => {

        pool.execute(
          `UPDATE users
           SET
           password = ?,
           full_name = ?,
           employee_id = ?,
           is_active = ?
           WHERE username = ?
           AND role = 'admin'`,
          [
            hashed,
            fullName,
            employeeId,
            isActive,
            username
          ]
        )

        .then(() => {

          // log action

          logAction(req,'update_admin_account',`تحديث حساب Admin: ${fullName}`);

          resolve({
            success: true,
            message: 'تم تحديث الحساب بنجاح'
          });

        })

        .catch(() => {

          reject({
            success: false,
            message: 'فشل تحديث الحساب'
          });

        });

      })

      .catch(() => {

        reject({
          success: false,
          message: 'فشل تشفير كلمة المرور'
        });

      });

    }

    // without password

    else {

      pool.execute(
        `UPDATE users
         SET
         full_name = ?,
         employee_id = ?,
         is_active = ?
         WHERE username = ?
         AND role = 'admin'`,
        [
          fullName,
          employeeId,
          isActive,
          username
        ]
      )

      .then(() => {

        // log action

        logAction(req,'update_admin_account',`تحديث حساب Admin: ${fullName}`);

        resolve({
          success: true,
          message: 'تم تحديث الحساب بنجاح'
        });

      })

      .catch(() => {

        reject({
          success: false,
          message: 'فشل تحديث الحساب'
        });

      });

    }

  });

};



// ── DELETE /api/hr/admin-accounts/:username (superadmin) ─────────────────────

export const deleteAdminAccountModel = (username, req) => {

  return new Promise((resolve, reject) => {

    // delete account

    pool.execute(
      `DELETE FROM users
       WHERE username = ?
       AND role = 'admin'`,
      [username]
    )

    .then(() => {

      // log action بدون then/catch

      logAction(req,'delete_admin_account',`حذف حساب Admin: ${username}`);

      // success response

      resolve({
        success: true,
        message: 'تم حذف الحساب بنجاح'
      });

    })

    .catch(() => {

      reject({
        success: false,
        message: 'فشل حذف الحساب'
      });

    });

  });

};