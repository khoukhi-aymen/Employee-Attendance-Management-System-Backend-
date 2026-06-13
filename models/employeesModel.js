import pool from '../db.js';
import bcrypt from 'bcryptjs';
import { fullArabicDate,convertTo24Hour,parseDate } from '../helpers/dateHelpers.js';
import { logAction ,isLoggedIn } from '../middleware/auth.js';


// ── GET /api/employees (admin or HR) ─────────────────────────────────────

export const getEmployeesModel = (activeOnly) => {

  return new Promise((resolve, reject) => {

    const sql = activeOnly

      ? `
        SELECT
          id,
          username,
          full_name,
          employee_id,
          is_active
        FROM users
        WHERE role = 'employee'
        AND is_active = 1
        ORDER BY full_name
      `

      : `
        SELECT
          id,
          username,
          full_name,
          employee_id,
          is_active
        FROM users
        WHERE role = 'employee'
        ORDER BY full_name
      `;

    pool.execute(sql)

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
          message: err.message
        });

      });

  });

};



// POST /api/employees (admin) ─────────────────────────────────────


export const createEmployeeModel = (body, req) => {

  return new Promise((resolve, reject) => {

    const { username, password, fullName, employeeId, isActive = true } = body;

    if (!username || !password || !fullName || !employeeId) {
      return resolve({
        success: false,
        message: 'الرجاء ملء جميع الحقول'
      });
    }

    // 1. check username
    pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    )

      .then(([existing]) => {

        if (existing.length) {
          return resolve({
            success: false,
            message: 'اسم المستخدم موجود مسبقاً'
          });
        }

        // 2. check employee_id
        return pool.execute(
          "SELECT id FROM users WHERE employee_id = ? AND role = 'employee'",
          [employeeId]
        );

      })

      .then(([dup]) => {

        if (!dup) return; // safety

        if (dup.length) {
          return resolve({
            success: false,
            message: 'المعرف موجود مسبقاً'
          });
        }

        // 3. hash password
        return bcrypt.hash(password, 10);

      })

      .then((hashed) => {

        if (!hashed) return; // if already resolved above

        // 4. insert employee
        return pool.execute(
          `INSERT INTO users 
          (username, password, full_name, employee_id, role, is_active)
          VALUES (?,?,?,?, 'employee', ?)`,
          [username, hashed, fullName, employeeId, isActive]
        );

      })

      .then(() => {

        // 5. log action
        return logAction(req, 'create_employee', `إنشاء موظف: ${fullName}`);

      })

      .then(() => {

        resolve({
          success: true,
          message: 'تم إنشاء الحساب بنجاح'
        });

      })

      .catch((err) => {

        reject({
          success: false,
          message: err.message
        });

      });

  });

};




// ── PUT /api/employees/:username ─────────────────────────────────────

export const updateEmployeeModel = (username, body, req) => {

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

    let hashedPassword = null;

    // hash password if exists

    const hashPromise = password

      ? bcrypt.hash(password, 10)

      : Promise.resolve(null);

    hashPromise

      .then((hashed) => {

        hashedPassword = hashed;

        // update with password

        if (password) {

          return pool.execute(
            `UPDATE users 
             SET 
               password = ?,
               full_name = ?,
               employee_id = ?,
               is_active = ?
             WHERE username = ?
             AND role = 'employee'`,
            [
              hashedPassword,
              fullName,
              employeeId,
              isActive,
              username
            ]
          );

        }

        // update without password

        return pool.execute(
          `UPDATE users 
           SET 
             full_name = ?,
             employee_id = ?,
             is_active = ?
           WHERE username = ?
           AND role = 'employee'`,
          [
            fullName,
            employeeId,
            isActive,
            username
          ]
        );

      })

      .then(() => {

        // log action

        return logAction(req,'update_employee',`تحديث موظف: ${fullName}`);
      })

      .then(() => {

        resolve({
          success: true,
          message: 'تم تحديث الحساب بنجاح'
        });

      })

      .catch((err) => {

        reject({
          success: false,
          message: err.message
        });

      });

  });

};


// ── DELETE /api/employees/:username ─────────────────────────────────────

export const deleteEmployeeModel = (username, req) => {

  return new Promise((resolve, reject) => {

    // delete employee

    pool.execute(
      "DELETE FROM users WHERE username = ? AND role = 'employee'",
      [username]
    )

      .then(() => {

        // log action

        return logAction(req,'delete_employee',`حذف موظف: ${username}`);
      })

      .then(() => {

        resolve({
          success: true,
          message: 'تم حذف الموظف بنجاح'
        });

      })

      .catch((err) => {

        reject({
          success: false,
          message: err.message
        });

      });

  });

};


// ── POST /api/employees/bulk (via excel  admin seulement) ─────────────────────────────────────

export const bulkCreateEmployeesModel = (body, req) => {

  return new Promise(async (resolve, reject) => {

    const { employees = [] } = body;

    // validation

    if (!employees.length) {

      return resolve({
        success: false,
        message: 'لا توجد بيانات'
      });

    }

    let successCount = 0;
    let failCount = 0;

    try {

      // loop employees

      for (const emp of employees) {

        const {
          username,
          password,
          fullName,
          employeeId,
          isActive = true
        } = emp;

        // validation

        if (
          !username ||
          !password ||
          !fullName ||
          !employeeId
        ) {

          failCount++;
          continue;

        }

        // check username exists

        const [dup] = await pool.execute(
          'SELECT id FROM users WHERE username = ?',
          [username]
        );

        if (dup.length) {

          failCount++;
          continue;

        }

        // hash password

        const hashed = await bcrypt.hash(
          password,
          10
        );

        // insert employee

        const [result] = await pool.execute(
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
            'employee',
            ?
          )`,
          [
            username,
            hashed,
            fullName,
            employeeId,
            isActive
          ]
        );

        // result

        if (result.affectedRows) {

          successCount++;

        } else {

          failCount++;

        }

      }

      // log action

      await logAction(
        req,
        'bulk_create_employees',
        `رفع دفعة: ${successCount} نجح، ${failCount} فشل`
      );

      // response

      resolve({
        success: true,
        message: `تم إضافة ${successCount} موظف، فشل ${failCount}`
      });

    } catch (err) {

      reject({
        success: false,
        message: 'خطأ أثناء إضافة الموظفين'
      });

    }

  });

};