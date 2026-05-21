import * as employeesModel from '../models/employeesModel.js';


// ── GET /api/employees (admin or HR)─────────────────────────────────────

export const getEmployeesController = (req, res) => {

  const activeOnly = req.query.activeOnly === 'true';

  employeesModel.getEmployeesModel(activeOnly)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};


// POST /api/employees (admin) ─────────────────────────────────────


export const createEmployeeController = (req, res) => {

  employeesModel.createEmployeeModel(req.body, req)

    .then((result) => {
      res.json(result);
    })

    .catch((err) => {
      res.json(err);
    });

};




// ── PUT /api/employees/:username ─────────────────────────────────────

export const updateEmployeeController = (req, res) => {

  employeesModel.updateEmployeeModel(
    req.params.username,
    req.body,
    req
  )

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};


// ── DELETE /api/employees/:username ─────────────────────────────────────

export const deleteEmployeeController = (req, res) => {

  employeesModel.deleteEmployeeModel(
    req.params.username,
    req
  )

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};



// ── POST /api/employees/bulk (via excel  admin seulement) ─────────────────────────────────────

export const bulkCreateEmployeesController = (req, res) => {

  employeesModel.bulkCreateEmployeesModel(req.body,req)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};