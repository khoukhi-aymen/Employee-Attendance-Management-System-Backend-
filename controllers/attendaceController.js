import * as attendanceModel from '../models/attendanceModel.js';


// ── GET /api/attendance/months  (own employee) ───────────────────────────────

export const getMonthsController = (req, res) => {

  const empId = req.session.employeeId;
  const fullName = req.session.fullName;

  // ✅ Ajoute ce log temporaire
  console.log('Session:', req.session);
  console.log('empId:', empId);
  console.log('fullName:', fullName);

  attendanceModel.getMonthsModel(empId, fullName)
    .then(result => {
      res.json(result);
    })
    .catch(err => {
      res.json(err);
    });

};


// ── GET /api/attendance/all-months  (HR / admin) ─────────────────────────────

export const getAllMonthsController = (req, res) => {

  attendanceModel.getAllMonthsModel()
    .then(result => {
      res.json(result);
    })
    .catch(err => {
      res.json(err);
    });

};



// ── GET /api/attendance  (one employee, one month) ───────────────────────────

export const getAttendanceController = (req, res) => {

  const { month, employee_id } = req.query;

  const sessionData = {
    employeeId: req.session.employeeId,
    fullName: req.session.fullName,
    role: req.session.role
  };

  attendanceModel.getAttendanceModel(month,employee_id,sessionData)
  .then(result => {
    res.json(result);
  })

  .catch(err => {
    res.json(err);
  });

};


// ── GET /api/attendance/all  (all employees, one month via Excel) RH seulement ─────────────────────

export const getAllAttendanceController = (req, res) => {

  const { month } = req.query;

  attendanceModel.getAllAttendanceModel(month)

    .then((result) => {
      res.json(result);
    })

    .catch((err) => {
      res.json(err);
    });

};






// ── POST /api/attendance/create (*****) ─────────────────────

export const createAttendanceController = (req, res) => {

  const { data } = req.body;

  console.log(data);

  attendanceModel.createAttendanceModel(data, req)
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      res.json(err);
    });
};



// ── POST /api/attendance/freeze (RH + employee)  ───────────────────────────

export const freezeMonthController = (req, res) => {
  const { month, employee_id } = req.body;

  attendanceModel.freezeMonthModel({ month, employee_id }, req)
    .then(result => res.json(result))
    .catch(err => res.json(err));
};




// ── GET /api/attendance/report(*****) ─────────────────────

export const getAttendanceReportController = (req, res) => {

  attendanceModel.getAttendanceReportModel(req.query, req)

    .then((result) => {
      res.json(result);
    })

    .catch((err) => {
      res.json(err);
    });

};