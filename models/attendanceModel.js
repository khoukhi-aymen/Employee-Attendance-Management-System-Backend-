import pool from '../db.js';
import { fullArabicDate,convertTo24Hour,parseDate } from '../helpers/dateHelpers.js';
import { logAction ,isLoggedIn } from '../middleware/auth.js';


// ── GET /api/attendance/months  (own employee) ───────────────────────────────

export const getMonthsModel = (empId, fullName) => {

  return new Promise((resolve, reject) => {

    if (!empId) {
      return reject({
        success: false,
        message: 'معرف الموظف غير موجود'
      });
    }

    //récupèrer tous les mois où l’employé a des pointages

    pool.execute(
      `SELECT DISTINCT DATE_FORMAT(date,'%Y-%m') as month
       FROM attendance_records
       WHERE TRIM(employee_id) = ? OR employee_id = ?
       ORDER BY month DESC`,
      [empId, empId]
    )

    .then(([rows]) => {

      if (rows.length > 0) {

        return resolve({
          success: true,
          message: 'تم جلب البيانات بنجاح',
          data: rows.map(r => r.month)
        });

      }


      //si employee_id ne marche pas on cherche par nom

      pool.execute(
        `SELECT DISTINCT DATE_FORMAT(date,'%Y-%m') as month
         FROM attendance_records
         WHERE employee_name LIKE ?
         ORDER BY month DESC`,
        [`%${fullName || ''}%`]
      )

      .then(([rows2]) => {

        return resolve({
          success: true,
          message: 'تم جلب البيانات بنجاح',
          data: rows2.map(r => r.month)
        });

      })

      .catch(() => {
        return reject({
          success: false,
          message: 'خطأ في البحث بالاسم'
        });
      });

    })

    .catch((err) => {
      return reject({
        success: false,
        message: 'خطأ في قاعدة البيانات'
      });
    });

  });

};



// ── GET /api/attendance/all-months  (HR / admin) ─────────────────────────────

export const getAllMonthsModel = () => {

  return new Promise((resolve, reject) => {

    pool.execute(
      `SELECT DISTINCT DATE_FORMAT(date,'%Y-%m') as month
       FROM attendance_records
       ORDER BY month DESC`
    )

    .then(([rows]) => {

      return resolve({
        success: true,
        message: 'تم جلب البيانات بنجاح',
        data: rows.map(r => r.month)
      });

    })

    .catch((err) => {

      return reject({
        success: false,
        message: 'خطأ في قاعدة البيانات'
      });

    });

  });

};



// ── GET /api/attendance  (one employee, one month) ───────────────────────────

export const getAttendanceModel = (month,employee_id,sessionData) => {

  return new Promise((resolve, reject) => {

    // vérifier le mois

    if (!month) {

      return reject({
        success: false,
        message: 'الشهر مطلوب'
      });

    }

    // récupérer employee id

    const empId =employee_id?.trim() || sessionData.employeeId;

    // vérifier permissions

    if (employee_id &&!['hr', 'admin', 'superadmin'].includes(sessionData.role)) {

      return reject({
        success: false,
        message: 'غير مصرح لك بعرض بيانات موظف آخر'
      });

    }

    // vérifier mois gelé

    pool.execute(`SELECT is_frozen FROM frozen_months WHERE employee_id = ? AND month = ?`, [empId, month] )
    .then(([frozenRows]) => {

      const isFrozen = frozenRows.length > 0;

      // récupérer tous les enregistrements de présence de l’employé
      // pour le mois sélectionné
      //
      // attendance_records  → contient les pointages journaliers
      // users               → permet de récupérer les informations employé
      // stores              → permet de récupérer les paramètres magasin
      //
      // DATE_FORMAT(date,'%Y-%m')
      // sert à filtrer seulement le mois demandé
      //
      // ORDER BY date
      // trie les résultats du plus ancien jour vers le plus récent
      //
      // les données récupérées incluent :
      // - date
      // - statut de présence
      // - heure d’entrée
      // - heure de sortie
      // - pauses
      // - magasin
      // - nombre de pointages
      //
      // exemple :
      // empId = 1005
      // month = 2026-05
      //
      // résultat :
      // tous les pointages de l’employé 1005
      // durant le mois 05/2026

      pool.execute(
        `SELECT 
            ar.id as id,
            DATE_FORMAT(date,'%Y-%m-%d') as date,
            u.employee_id,
            employee_name,
            magasin,
            entree_time,
            status,
            start_break,
            finish_break,
            exit_time,
            store_entree_time,
            store_exit_time,
            store_pause_periode,
            punch_count
         FROM attendance_records ar
         JOIN users u
           ON ar.employee_id = u.employee_id
         JOIN stores s
           ON ar.magasin = s.att
         WHERE u.employee_id = ?
         AND DATE_FORMAT(date,'%Y-%m') = ?
         ORDER BY date`,
        [empId, month]
      )
      .then(([records]) => {

        // récupérer nom employé

        pool.execute(`SELECT full_name FROM users WHERE employee_id = ? LIMIT 1`, [empId])
        .then(([empRows]) => {

          const byDate = {};

          for (const r of records) {

            const dateObj = r.date instanceof Date ? r.date : new Date(r.date);
            const dateKey = `${dateObj.getFullYear()}-${ String(dateObj.getMonth() + 1).padStart(2, '0') }-${ String(dateObj.getDate()).padStart(2, '0')}`;
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

              allRecords.push({
                ...byDate[dateStr],
                day_name: arabicDate
              });

            } else {

              const status =
                dateObj.getDay() === 5
                  ? 'Week-end'
                  : 'Absence';

              allRecords.push({
                id: 0,
                employee_id: empId,
                employee_name: sessionData.fullName ?? '',
                date: dateStr,
                day_name: arabicDate,
                status,
                magasin: null,
                entree_time: null,
                start_break: null,
                finish_break: null,
                exit_time: null,
                punch_count: null,
                break_duration: null,
                work_time: null,
                late_absence: null,
                overtime: null,
                edit_count: 0,
                last_edited_by: null,
                last_edited_at: null,
                created_at: null,
              });

            }

          }

          return resolve({
            success: true,
            message: 'تم جلب البيانات بنجاح',
            data: {
              records: allRecords,
              employeeName:
                empRows[0]?.full_name ?? 'غير معروف',
              employeeId: empId,
              month,
              isFrozen,
            },
          });

        })

        .catch(() => {

          return reject({
            success: false,
            message: 'خطأ أثناء جلب بيانات الموظف'
          });

        });

      })

      .catch((err) => {

        return reject({
          success: false,
          message: err.message || 'خطأ في جلب بيانات الحضور'
        });

      });

    })

    .catch((err) => {

      return reject({
        success: false,
        message: err.message || 'خطأ في قاعدة البيانات'
      });

    });

  });

};


// ── GET /api/attendance/all  (all employees, one month via Excel) RH seulement ─────────────────────

export const getAllAttendanceModel = (month) => {

  return new Promise((resolve, reject) => {

    // vérifier si le mois existe

    if (!month) {

      return reject({
        success: false,
        message: 'الشهر مطلوب'
      });

    }

    // récupérer tous les pointages de tous les employés
    // pour le mois sélectionné avec les informations du magasin
    // et les horaires standards du magasin

    pool.execute(

      `SELECT
          date,
          u.employee_id,
          employee_name,
          magasin,
          entree_time,
          start_break,
          finish_break,
          exit_time,
          store_entree_time,
          store_exit_time,
          store_pause_periode
       FROM attendance_records ar

       JOIN users u
         ON ar.employee_id = u.employee_id

       JOIN stores s
         ON ar.magasin = s.att

       WHERE DATE_FORMAT(date,'%Y-%m') = ?

       ORDER BY u.employee_id, date`,

      [month]

    )

    .then(([rows]) => {

      return resolve({

        success: true,

        message: 'تم جلب بيانات الحضور بنجاح',

        data: {
          records: rows
        }

      });

    })

    .catch((err) => {

      return reject({

        success: false,

        message: 'خطأ في قاعدة البيانات'

      });

    });

  });

};




// ── POST /api/attendance/create (*****) ─────────────────────

export const createAttendanceModel = (data, req) => {
  return new Promise((resolve, reject) => {

    let {
      employee_name, employee_id, date, day_name, magasin,
      entree_time, start_break, finish_break, exit_time,
      punch_count, status
    } = data || {};

    if (!employee_name || !employee_id || !date || !magasin || !entree_time || !exit_time) {
      return resolve({
        success: false,
        message: 'الرجاء ملء جميع الحقول'
      });
    }

    pool.execute(
      'SELECT COUNT(*) as c FROM stores WHERE att = ?',
      [magasin]
    )
    .then(([magCheck]) => {

      if (!magCheck[0].c) {
        return resolve({
          success: false,
          message: 'المحل غير موجود'
        });
      }

      // IMPORTANT: return INSERT
      return pool.execute(
        `INSERT INTO attendance_records
        (employee_name, employee_id, date, day_name, magasin,
         entree_time, start_break, finish_break, exit_time,
         punch_count, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          employee_name,
          employee_id,
          date,
          day_name,
          magasin,
          entree_time,
          start_break,
          finish_break,
          exit_time,
          punch_count,
          status
        ]
      );
    })
    .then(([insertResult]) => {

      if (!insertResult) return;

      return logAction(req, 'create_attendance', 'إنشاء حضور بنجاح');
    })
    .then(() => {
      resolve({
        success: true,
        message: 'تم إنشاء حضور بنجاح'
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


// ── POST /api/attendance/freeze (RH + employee)  ───────────────────────────

export const freezeMonthModel = ({ month, employee_id }, req) => {

  return new Promise((resolve, reject) => {

    const empId = employee_id?.trim();

    if (!month || !empId) {
      return resolve({
        success: false,
        message: 'الشهر والموظف مطلوبان'
      });
    }

    // 1. check duplicate freeze
    pool.execute(
      'SELECT id FROM frozen_months WHERE employee_id = ? AND month = ?',
      [empId, month]
    )
    .then(([dup]) => {

      if (dup.length) {
        return resolve({
          success: false,
          message: 'هذا الشهر مجمد مسبقاً'
        });
      }

      // 2. check missing attendance
      return pool.execute(
        `SELECT COUNT(*) as count FROM attendance_records
         WHERE employee_id = ?
         AND DATE_FORMAT(date,'%Y-%m') = ?
         AND status = 'Présence'
         AND (entree_time IS NULL OR exit_time IS NULL)`,
        [empId, month]
      );
    })
    .then(([missing]) => {

      if (missing[0].count > 0) {
        return resolve({
          success: false,
          message: `يوجد ${missing[0].count} سجل يحتوي على أوقات ناقصة`
        });
      }

      // 3. insert freeze
      return pool.execute(
        'INSERT INTO frozen_months (employee_id, month, frozen_by) VALUES (?,?,?)',
        [empId, month, req.session.userId]
      );
    })
    .then(() => {

      // 4. log action
      logAction(req, 'freeze_month', `تجميد شهر ${month} للموظف ${empId}`);
    })
    .then(() => {

      resolve({
        success: true,
        message: 'تم تجميد الشهر بنجاح'
      });

    })
    .catch(err => {
      reject({
        success: false,
        message: err.message
      });
    });

  });
};



// ── GET /api/attendance/report(*****) ─────────────────────

export const getAttendanceReportModel = (data, req) => {

  return new Promise((resolve, reject) => {

    const { employeeId, month } = data || {};

    // validation
    if (!employeeId || !month) {
      return resolve({
        success: false,
        message: 'الرجاء اختيار الموظف والشهر'
      });
    }

    let attendanceRecords = [];
    let employeeName = 'غير معروف';
    let isFrozen = false;

    // 1. get attendance records
    pool.execute(
      `SELECT * FROM attendance_records
       WHERE employee_id = ?
       AND DATE_FORMAT(date,'%Y-%m') = ?
       ORDER BY date ASC`,
      [employeeId, month]
    )

    .then(([records]) => {

      attendanceRecords = records;

      // 2. get employee name
      return pool.execute(
        'SELECT full_name FROM users WHERE employee_id = ? LIMIT 1',
        [employeeId]
      );

    })

    .then(([empRows]) => {

      employeeName = empRows[0]?.full_name || 'غير معروف';

      // 3. check frozen month
      return pool.execute(
        'SELECT is_frozen FROM frozen_months WHERE employee_id = ? AND month = ?',
        [employeeId, month]
      );

    })

    .then(([frozenRows]) => {

      isFrozen = frozenRows.length > 0;

      resolve({
        success: true,
        data: {
          records: attendanceRecords,
          employeeName,
          employeeId,
          month,
          isFrozen
        }
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