import pool from '../db.js';

// ── GET ALL STORES ─────────────────────────────

export const getStoresModel = () => {

  return new Promise((resolve, reject) => {

    pool.execute(
      `
      SELECT *
      FROM stores
      ORDER BY att
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
        message: 'حدث خطأ أثناء تحميل المتاجر',
        error: err.message
      });

    });

  });

};