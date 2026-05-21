import pool from '../db.js';
import { fullArabicDate,convertTo24Hour,parseDate } from '../helpers/dateHelpers.js';
import { logAction ,isLoggedIn } from '../middleware/auth.js';



// ── GET /api/admin/logs ─────────────────────────────────────

export const getLogsModel = (query) => {

    return new Promise((resolve, reject) => {

        const {limit = 100,action_filter,user_filter,date_from,date_to} = query;

        let sql = `SELECT * FROM system_logs WHERE 1 = 1 `;

        const params = [];

        // filtre action

        if (action_filter && action_filter !== 'all') {

            sql += ' AND action = ?';
            params.push(action_filter);

        }

        // filtre utilisateur

        if (user_filter && user_filter !== 'all') {

            sql += ' AND username = ?';
            params.push(user_filter);

        }

        // date début

        if (date_from) {

            sql += ' AND DATE(created_at) >= ?';
            params.push(date_from);

        }

        // date fin

        if (date_to) {

            sql += ' AND DATE(created_at) <= ?';
            params.push(date_to);

        }

        // tri + limit

        sql += ' ORDER BY created_at DESC LIMIT ?';

        params.push(parseInt(limit));

        // execute query

        pool.execute(sql, params)

            .then(([rows]) => {

                resolve({
                    success: true,
                    message: 'تم جلب السجلات بنجاح',
                    data: rows
                });

            })

            .catch((err) => {

                reject({
                    success: false,
                    message: 'خطأ أثناء جلب السجلات'
                });

            });

    });

};


// ── DELETE /api/admin/logs ─────────────────────────────────────

export const clearLogsModel = (req) => {

  return new Promise((resolve, reject) => {

    // supprimer tous les logs

    pool.execute('DELETE FROM system_logs')

      .then(() => {

        // enregistrer action

        return logAction(req, 'clear_logs', 'محو جميع السجلات');

      })

      .then(() => {

        resolve({
          success: true,
          message: 'تم محو السجلات بنجاح'
        });

      })

      .catch((err) => {

        reject({
          success: false,
          message: 'خطأ أثناء محو السجلات'
        });

      });

  });

};


// ── GET /api/admin/users ─────────────────────────────────────

export const getUsersModel = () => {

  return new Promise((resolve, reject) => {

    pool.execute(` SELECT DISTINCT username FROM users ORDER BY username `)

    .then(([rows]) => {

      resolve({
        success: true,
        message: 'تم جلب المستخدمين بنجاح',
        data: rows
      });

    })

    .catch((err) => {

      reject({
        success: false,
        message: 'خطأ أثناء جلب المستخدمين'
      });

    });

  });

};