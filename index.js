import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';

import authRoutes from './routes/authRouter.js';
import employeeRoutes from './routes/employeesRouter.js';
import hrRoutes from './routes/hrRouter.js';
import attendanceRoutes from './routes/attendanceRouter.js';
import suggestionsRoutes from './routes/suggestionsRouter.js';
import adminRoutes from './routes/adminRouter.js';
import storesRoutes from './routes/storesRouter.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  // Après
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
  
  // Après
  cookie: {
    httpOnly: true,
    secure: true,
    maxAge: 3600 * 1000,
    sameSite: 'none',
  },
}));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stores', storesRoutes);

// ── 404 catch-all ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'الطلب غير موجود' });
});

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  res.status(500).json({ success: false, message: 'حدث خطأ في الخادم: ' + err.message });
});

app.listen(PORT, () => {
  console.log(`✅  Server running on http://localhost:${PORT}`);
});