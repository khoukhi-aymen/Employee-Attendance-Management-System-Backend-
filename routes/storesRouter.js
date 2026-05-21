import { Router } from 'express';
import pool from '../db.js';
import { requireLogin } from '../middleware/auth.js';
import * as storesController from '../controllers/storesController.js';


const router = Router();
// ── GET ALL STORES ─────────────────────────────

/*router.get('/', requireLogin, async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM stores ORDER BY att');
  res.json({ success: true, data: rows });
});

*/


// ── GET ALL STORES ─────────────────────────────

router.get('/',requireLogin,storesController.getStoresController);

export default router;