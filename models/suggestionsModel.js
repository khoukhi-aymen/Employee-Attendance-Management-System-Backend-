import pool from '../db.js';
import bcrypt from 'bcryptjs';
import { fullArabicDate,convertTo24Hour,parseDate } from '../helpers/dateHelpers.js';
import { logAction ,isLoggedIn } from '../middleware/auth.js';

function addMidnight(time) {
  if (!time) return time;
  const parts = time.split(':');
  let h = parseInt(parts[0]);
  if (h < 24) h += 24;
  return `${String(h).padStart(2,'0')}:${parts[1] ?? '00'}:${parts[2] ?? '00'}`;
}


const calculatePunchCount = (record) => {

  let count = 0;

  if (record.entree_time) count++;
  if (record.start_break) count++;
  if (record.finish_break) count++;
  if (record.exit_time) count++;

  return count;

};


// ── GET /api/suggestions التعديلات /mine  (logged in employee) ──────────────────────────


export const getMySuggestionsModel = (employeeId) => {

  return new Promise((resolve, reject) => {

    pool.execute(
      `SELECT *
       FROM time_edit_suggestions
       WHERE employee_id = ?
       ORDER BY created_at DESC`,
      [employeeId]
    )

    .then(([rows]) => {

      resolve({
        success: true,
        message: 'تم جلب الاقتراحات بنجاح',
        data: rows.map(r => ({
          ...r,
          dayName: fullArabicDate(new Date(r.date))
        }))
      });

    })

    .catch(() => {

      reject({
        success: false,
        message: 'فشل جلب الاقتراحات'
      });

    });

  });

};


// ── GET /api/suggestions  التعديلات (HR) ───────────────────────────────────────────────

export const getSuggestionsModel = (query) => {

  return new Promise((resolve, reject) => {

    const { status = 'all', employee_id, month } = query;

    let sql = 'SELECT * FROM time_edit_suggestions WHERE 1=1';
    const params = [];

    // filtre status
    if (status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    // filtre employee
    if (employee_id) {
      sql += ' AND employee_id = ?';
      params.push(employee_id);
    }

    // filtre month
    if (month) {
      sql += " AND DATE_FORMAT(date,'%Y-%m') = ?";
      params.push(month);
    }

    sql += ' ORDER BY status ASC, created_at DESC';

    pool.execute(sql, params)

      .then(([rows]) => {

        resolve({
          success: true,
          message: 'تم جلب الاقتراحات بنجاح',
          data: rows.map(r => ({
            ...r,
            dayName: fullArabicDate(new Date(r.date))
          }))
        });

      })

      .catch(() => {

        reject({
          success: false,
          message: 'فشل جلب الاقتراحات'
        });

      });

  });

};


// ── POST /api/suggestions  (employee submits) ────────────────────────────────


export const createSuggestionModel = (req) => {

  return new Promise((resolve, reject) => {

    let {
      recordId,
      entreeTime,
      startBreak,
      finishBreak,
      exitTime,
      exitAfterMidnight,
      reason,
      magasin,
      date
    } = req.body;

    const employeeId = req.session.employeeId;
    const fullName = req.session.fullName;

    // ── midnight fix ─────────────────────
    if (exitAfterMidnight && exitTime) {
      exitTime = addMidnight(exitTime);
    }

    // ── validation ───────────────────────
    if (recordId === 0) {

      pool.execute(
        'SELECT COUNT(*) as c FROM attendance_records WHERE magasin = ?',
        [magasin]
      )

      .then(([mg]) => {

        if (
          !mg[0].c ||
          !magasin ||
          !date ||
          !entreeTime ||
          !exitTime ||
          !reason
        ) {
          return resolve({
            success: false,
            message: 'بيانات غير مكتملة'
          });
        }

        // duplicate check
        return pool.execute(
          `SELECT id
           FROM time_edit_suggestions
           WHERE
             (attendance_record_id = ? AND employee_id = ?)
             OR
             (attendance_record_id IS NULL AND employee_id = ? AND date = ?)`,
          [
            recordId,
            employeeId,
            employeeId,
            date
          ]
        );
      })

      .then((dupResult) => {

        if (!dupResult) return;

        const [dup] = dupResult;

        if (dup.length) {
          return resolve({
            success: false,
            message: 'لقد قمت بإرسال اقتراح لهذا السجل مسبقاً'
          });
        }

        // insert new record suggestion
        return pool.execute(
          `INSERT INTO time_edit_suggestions
          (
            employee_id,
            employee_name,
            date,
            suggested_entree_time,
            suggested_start_break,
            suggested_finish_break,
            suggested_exit_time,
            reason,
            status,
            suggested_magasin
          )
          VALUES (?,?,?,?,?,?,?,?, 'pending', ?)`,
          [
            employeeId,
            fullName,
            date,
            entreeTime,
            startBreak,
            finishBreak,
            exitTime,
            reason,
            magasin
          ]
        );
      })

      .then((insertResult) => {

        if (!insertResult) return;

        return logAction(
          req,
          'suggest_time_edit',
          `اقتراح تعديل للتاريخ: ${date}`
        );
      })

      .then(() => {

        resolve({
          success: true,
          message: 'تم إرسال الاقتراح بنجاح'
        });

      })

      .catch((err) => {

        reject({
          success: false,
          message: 'خطأ في السيرفر',
          error: err.message
        });

      });

      return;
    }

    // ── CASE recordId != 0 ─────────────────────────────

    if (!reason || !recordId) {
      return resolve({
        success: false,
        message: 'بيانات غير مكتملة'
      });
    }

    // duplicate check
    pool.execute(
      `SELECT id
       FROM time_edit_suggestions
       WHERE
         (attendance_record_id = ? AND employee_id = ?)
         OR
         (attendance_record_id IS NULL AND employee_id = ? AND date = ?)`,
      [
        recordId,
        employeeId,
        employeeId,
        date
      ]
    )

    .then(([dup]) => {

      if (dup.length) {
        return resolve({
          success: false,
          message: 'لقد قمت بإرسال اقتراح لهذا السجل مسبقاً'
        });
      }

      // get attendance record
      return pool.execute(
        'SELECT * FROM attendance_records WHERE id = ?',
        [recordId]
      );
    })

    .then((recordResult) => {

      if (!recordResult) return;

      const [record] = recordResult;

      if (!record.length) {
        return resolve({
          success: false,
          message: 'السجل غير موجود'
        });
      }

      if (record[0].employee_id != employeeId) {
        return resolve({
          success: false,
          message: 'غير مصرح لك بتعديل هذا السجل'
        });
      }

      // check frozen
      const month = record[0].date.toISOString().slice(0, 7);

      return pool.execute(
        `SELECT is_frozen
         FROM frozen_months
         WHERE employee_id = ? AND month = ?`,
        [employeeId, month]
      )

      .then(([frozen]) => {

        if (frozen.length) {
          return resolve({
            success: false,
            message: 'هذا الشهر مجمد. لا يمكن إجراء تعديلات'
          });
        }

        // insert suggestion
        return pool.execute(
          `INSERT INTO time_edit_suggestions
          (
            attendance_record_id,
            employee_id,
            employee_name,
            date,
            suggested_entree_time,
            suggested_start_break,
            suggested_finish_break,
            suggested_exit_time,
            reason,
            status
          )
          VALUES (?,?,?,?,?,?,?,?,?,'pending')`,
          [
            recordId,
            employeeId,
            fullName,
            record[0].date,
            entreeTime,
            startBreak,
            finishBreak,
            exitTime,
            reason
          ]
        );
      });

    })

    .then((insertResult) => {

      if (!insertResult) return;

      return logAction(
        req,
        'suggest_time_edit',
        `اقتراح تعديل للتاريخ: ${date}`
      );
    })

    .then(() => {

      resolve({
        success: true,
        message: 'تم إرسال الاقتراح بنجاح'
      });

    })

    .catch((err) => {

      reject({
        success: false,
        message: 'خطأ في السيرفر',
        error: err.message
      });

    });

  });

};



// ── POST /api/suggestions/:id/approve  (HR) ──────────────────────────────────


export const approveSuggestionModel = (req) => {

    return new Promise((resolve, reject) => {

        const { id } = req.params;
        const { adminNotes = '' } = req.body;

        // ── GET SUGGESTION ─────────────────────────────
        pool.execute(
            `SELECT tes.*, ar.*, tes.status as suggested_status,
        tes.employee_id as suggested_employee_id,
        tes.employee_name as suggested_employee_name,
        tes.date as suggested_date
      FROM time_edit_suggestions tes
      LEFT JOIN attendance_records ar
        ON tes.attendance_record_id = ar.id
      WHERE tes.id = ?`,
            [id]
        )

            .then(([rows]) => {

                const suggestion = rows[0];

                if (!suggestion) {
                    return resolve({
                        success: false,
                        message: 'الاقتراح غير موجود'
                    });
                }

                if (suggestion.suggested_status !== 'pending') {
                    return resolve({
                        success: false,
                        message: 'هذا الاقتراح تمت معالجته مسبقاً'
                    });
                }

                // ── BUILD TIMES ─────────────────────────────
                const rawTimes = [
                    suggestion.suggested_entree_time || suggestion.entree_time,
                    suggestion.suggested_start_break || suggestion.start_break,
                    suggestion.suggested_finish_break || suggestion.finish_break,
                    suggestion.suggested_exit_time || suggestion.exit_time,
                ]

                    .filter(
                        t =>
                            t &&
                            t.toLowerCase() !== 'null' &&
                            t !== '00:00:00'
                    );

                const times = [...new Set(rawTimes)].sort();

                const punch_count = times.length;

                let entree_time = null;
                let start_break = null;
                let finish_break = null;
                let exit_time = null;

                if (punch_count >= 1) {
                    entree_time = times[0];
                }

                if (punch_count === 2) {
                    exit_time = times[1];
                }

                else if (punch_count === 3) {
                    start_break = times[1];
                    exit_time = times[2];
                }

                else if (punch_count >= 4) {
                    start_break = times[1];
                    finish_break = times[2];
                    exit_time = times[3];
                }

                let recordId = suggestion.attendance_record_id;

                // ── INSERT NEW RECORD ───────────────────────
                if (!recordId) {

                    const arabicDate = suggestion.suggested_date;

                    return pool.execute(
                        `INSERT INTO attendance_records
          (
            entree_time,
            start_break,
            finish_break,
            exit_time,
            last_edited_by,
            employee_id,
            employee_name,
            magasin,
            date,
            day_name,
            status,
            punch_count
          )
          VALUES (?,?,?,?,?,?,?,?,?,?,'Présence',?)`,
                        [
                            entree_time,
                            start_break,
                            finish_break,
                            exit_time,
                            req.session.username,
                            suggestion.suggested_employee_id,
                            suggestion.suggested_employee_name,
                            suggestion.suggested_magasin,
                            arabicDate,
                            arabicDate,
                            punch_count
                        ]
                    )

                        .then(([ins]) => {

                            recordId = ins.insertId;

                            return {
                                suggestion,
                                recordId
                            };
                        });
                }

                // ── UPDATE EXISTING RECORD ──────────────────
                const updates = [];
                const params = [];

                if (entree_time) {
                    updates.push('entree_time = ?');
                    params.push(entree_time);
                }

                if (start_break) {
                    updates.push('start_break = ?');
                    params.push(start_break);
                }

                if (finish_break) {
                    updates.push('finish_break = ?');
                    params.push(finish_break);
                }

                if (exit_time) {
                    updates.push('exit_time = ?');
                    params.push(exit_time);
                }

                updates.push('punch_count = ?');
                params.push(punch_count);

                updates.push('edit_count = edit_count + 1');

                updates.push('last_edited_by = ?');
                params.push(req.session.username);

                updates.push('last_edited_at = NOW()');

                params.push(recordId);

                return pool.execute(
                    `UPDATE attendance_records
         SET ${updates.join(', ')}
         WHERE id = ?`,
                    params
                )

                    .then(() => {

                        return {
                            suggestion,
                            recordId
                        };
                    });

            })

            // ── UPDATE SUGGESTION STATUS ──────────────────
            .then((data) => {

                if (!data) return;

                return pool.execute(
                    `UPDATE time_edit_suggestions
         SET
           attendance_record_id = ?,
           status = 'approved',
           admin_notes = ?,
           reviewed_at = NOW(),
           reviewed_by = ?
         WHERE id = ?`,
                    [
                        data.recordId,
                        adminNotes,
                        req.session.userId,
                        id
                    ]
                )

                    .then(() => data);

            })

            // ── LOG ACTION ────────────────────────────────
            .then((data) => {

                if (!data) return;

                return logAction(req, 'approve_suggestion', `قبول اقتراح تعديل - موظف: ${data.suggestion.suggested_employee_name}`);

            })

            // ── SUCCESS ───────────────────────────────────
            .then(() => {

                resolve({
                    success: true,
                    message: 'تم قبول الاقتراح وتحديث البيانات بنجاح'
                });

            })

            // ── ERROR ─────────────────────────────────────
            .catch((err) => {

                console.error(err);

                reject({
                    success: false,
                    message: 'حدث خطأ أثناء معالجة الاقتراح'
                });

            });

    });

};


// ── POST /api/suggestions/:id/reject  (HR) ───────────────────────────────────

export const rejectSuggestionModel = (req) => {

  return new Promise((resolve, reject) => {

    const { id } = req.params;
    const { adminNotes = '' } = req.body;

    // ── CHECK SUGGESTION ─────────────────────────
    pool.execute(
      'SELECT * FROM time_edit_suggestions WHERE id = ?',
      [id]
    )

    .then(([rows]) => {

      const suggestion = rows[0];

      // not found
      if (!suggestion) {

        return resolve({
          success: false,
          message: 'الاقتراح غير موجود'
        });

      }

      // already processed
      if (suggestion.status !== 'pending') {

        return resolve({
          success: false,
          message: 'هذا الاقتراح تمت معالجته مسبقاً'
        });

      }

      // ── UPDATE STATUS ─────────────────────────
      return pool.execute(
        `UPDATE time_edit_suggestions
         SET
           status = 'rejected',
           admin_notes = ?,
           reviewed_at = NOW(),
           reviewed_by = ?
         WHERE id = ?`,
        [
          adminNotes,
          req.session.userId,
          id
        ]
      )

      .then(() => suggestion);

    })

    // ── LOG ACTION ─────────────────────────────
    .then((suggestion) => {

      if (!suggestion) return;

      return logAction(req,'reject_suggestion',`رفض اقتراح تعديل - موظف: ${suggestion.employee_name}`);
    })

    // ── SUCCESS ────────────────────────────────
    .then(() => {

      resolve({
        success: true,
        message: 'تم رفض الاقتراح'
      });

    })

    // ── ERROR ──────────────────────────────────
    .catch((err) => {

      console.error(err);

      reject({
        success: false,
        message: 'حدث خطأ أثناء رفض الاقتراح'
      });

    });

  });

};



// ── POST /api/suggestions/hr-edit  (HR direct time edit) ─────────────────────

export const hrEditTimeModel = (req) => {

  return new Promise((resolve, reject) => {

    const {
      recordId,
      missingFields = {},
      exit_after_midnight
    } = req.body;

    if (
      !recordId ||
      !Object.keys(missingFields).length
    ) {

      return resolve({
        success: false,
        message: 'البيانات غير كاملة'
      });

    }

    pool.execute(
      'SELECT * FROM attendance_records WHERE id = ?',
      [recordId]
    )

    .then(([rows]) => {

      if (!rows.length) {

        return resolve({
          success: false,
          message: 'السجل غير موجود'
        });

      }

      const record = rows[0];

      const updates = [];
      const params = [];

      const updatedRecord = {
        ...record
      };

      for (const [field, value] of Object.entries(missingFields)) {

        if (value === null) continue;

        let finalValue = value;

        if (
          field === 'exit_time' &&
          exit_after_midnight
        ) {

          finalValue = addMidnight(value);

        }

        updatedRecord[field] = finalValue;

        updates.push(`${field} = ?`);
        params.push(finalValue);

      }

      const punchCount = calculatePunchCount(updatedRecord);

      updates.push('punch_count = ?');
      params.push(punchCount);

      // IMPORTANT : une seule incrémentation
      updates.push('edit_count = edit_count + 1');

      updates.push('last_edited_by = ?');
      params.push(req.session.username);

      updates.push('last_edited_at = NOW()');

      params.push(recordId);

      return pool.execute(
        `
        UPDATE attendance_records
        SET ${updates.join(', ')}
        WHERE id = ?
        `,
        params
      )

      .then(() => updatedRecord);

    })

    .then((record) => {

      if (!record) return;

      return logAction(
        req,
        'hr_edit_time',
        `تعديل HR - ${record.employee_name}`
      );

    })

    .then(() => {

      resolve({
        success: true,
        message: 'تم التعديل بنجاح'
      });

    })

    .catch((err) => {

      reject({
        success: false,
        message: 'حدث خطأ أثناء تعديل الوقت',
        error: err.message
      });

    });

  });

};


// ── POST /api/suggestions/manual-entry  (HR manual entry) ────────────────────


export const manualEntryModel = (req) => {

  return new Promise((resolve, reject) => {

    const {
      recordId,
      employee_id,
      employee_name,
      date,
      day_name,
      missingFields = {},
      exit_after_midnight,
      notes = ""
    } = req.body;

    // ── validation ─────────────────────────────
    if (
      !employee_id ||
      !employee_name ||
      !date ||
      !Object.keys(missingFields).length
    ) {
      return resolve({
        success: false,
        message: "البيانات غير كاملة"
      });
    }

    let attendanceRecord = null;

    // ───────────────────────────────────────────
    // STEP 1 : existing record OR manual create
    // ───────────────────────────────────────────

    let firstPromise;

    // mode édition normale
    if (recordId && recordId !== 0) {

      firstPromise = pool.execute(
        "SELECT * FROM attendance_records WHERE id = ?",
        [recordId]
      );

    }

    // mode création manuelle
    else {

      attendanceRecord = {
        id: 0,
        employee_id,
        employee_name,
        date,
        day_name
      };

      firstPromise = Promise.resolve([[]]);
    }

    firstPromise

      .then(([rows]) => {

        // ── existing record mode ─────────────────
        if (recordId && recordId !== 0) {

          attendanceRecord = rows[0];

          if (!attendanceRecord) {
            return resolve({
              success: false,
              message: "السجل غير موجود"
            });
          }

        }

        // ─────────────────────────────────────────
        // MODE CREATE NEW RECORD
        // ─────────────────────────────────────────

        if (!recordId || recordId === 0) {

          let exitTime = missingFields.exit_time || null;

          if (exitTime && exit_after_midnight) {
            exitTime = addMidnight(exitTime);
          }

          return pool.execute(
            `
            INSERT INTO attendance_records
            (
              employee_id,
              employee_name,
              date,
              day_name,
              magasin,
              entree_time,
              start_break,
              finish_break,
              exit_time,
              status,
              edit_count,
              punch_count,
              last_edited_by,
              last_edited_at
            )
            VALUES
            (
              ?,?,?,?,?,?,?,?,?,?,?,?,?,NOW()
            )
          `,
            [
              employee_id,
              employee_name,
              date,

              day_name || null,

              missingFields.magasin || null,
              missingFields.entree_time || null,
              missingFields.start_break || null,
              missingFields.finish_break || null,
              exitTime,

              "Présence",

              1,
              4,

              req.session.username
            ]
          )

            .then(([insertResult]) => {

              attendanceRecord.id = insertResult.insertId;

              return null;
            });

        }

        // ─────────────────────────────────────────
        // MODE UPDATE EXISTING RECORD
        // ─────────────────────────────────────────

        const updates = [];
        const params = [];

        for (const [field, value] of Object.entries(missingFields)) {

          if (!value) continue;

          let finalValue = value;

          if (field === "exit_time" && exit_after_midnight) {
            finalValue = addMidnight(value);
          }

          updates.push(`${field} = ?`);
          params.push(finalValue);
        }

        if (updates.length) {

          updates.push("edit_count = edit_count + 1");
          updates.push("punch_count = 4");

          updates.push("last_edited_by = ?");
          params.push(req.session.username);

          updates.push("last_edited_at = NOW()");

          params.push(recordId);

          return pool.execute(
            `
            UPDATE attendance_records
            SET ${updates.join(", ")}
            WHERE id = ?
            `,
            params
          );
        }

        return null;

      })

      // ─────────────────────────────────────────
      // INSERT AUDIT LOG
      // ─────────────────────────────────────────

      .then(() => {

        if (!attendanceRecord) return;

        return pool.execute(
          `
          INSERT INTO time_edit_suggestions
          (
            attendance_record_id,
            employee_id,
            employee_name,
            date,

            suggested_entree_time,
            suggested_start_break,
            suggested_finish_break,
            suggested_exit_time,
            suggested_magasin,

            reason,
            status,
            admin_notes,
            manual_entry,
            reviewed_by,
            reviewed_at
          )
          VALUES
          (
            ?,?,?,?,
            ?,?,?,?,?,
            ?,
            'approved',
            ?,
            1,
            ?,
            NOW()
          )
          `,
          [
            attendanceRecord.id,

            attendanceRecord.employee_id,
            attendanceRecord.employee_name,
            attendanceRecord.date,

            missingFields.entree_time || null,
            missingFields.start_break || null,
            missingFields.finish_break || null,
            missingFields.exit_time || null,
            missingFields.magasin || null,

            "إدخال يدوي من الموارد البشرية",

            notes || null,

            req.session.userId
          ]
        );

      })

      // ─────────────────────────────────────────
      // LOG ACTION
      // ─────────────────────────────────────────

      .then(() => {

        if (!attendanceRecord) return;

        return logAction(req, "manual_time_entry", `إدخال يدوي - موظف: ${attendanceRecord.employee_name}`);

      })

      // ─────────────────────────────────────────
      // SUCCESS
      // ─────────────────────────────────────────

      .then(() => {

        resolve({
          success: true,
          message: "تم الإدخال اليدوي بنجاح"
        });

      })

      // ─────────────────────────────────────────
      // ERROR
      // ─────────────────────────────────────────

      .catch((err) => {

        reject({
          success: false,
          message: "خطأ في السيرفر",
          error: err.message
        });

      });

  });

};



// ── GET /api/suggestions/export  (HR) (*****) ────────────────────────────────────────


export const exportSuggestionsModel = () => {

  return new Promise((resolve, reject) => {

    pool.execute(
      `
      SELECT *
      FROM time_edit_suggestions
      ORDER BY created_at DESC
      `
    )

    .then(([rows]) => {

      resolve({
        success: true,
        data: rows
      });

    })

    .catch((err) => {

      reject({
        success: false,
        message: 'حدث خطأ أثناء تحميل سجل التعديلات',
        error: err.message
      });

    });

  });

};