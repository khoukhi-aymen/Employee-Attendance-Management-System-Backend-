import * as adminModel from '../models/adminModel.js';


// ── GET /api/admin/logs ─────────────────────────────────────

export const getLogsController = (req, res) => {

  adminModel.getLogsModel(req.query)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};


// ── DELETE /api/admin/logs ─────────────────────────────────────

export const clearLogsController = (req, res) => {

  adminModel.clearLogsModel(req)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};


// ── GET /api/admin/users ─────────────────────────────────────

export const getUsersController = (req, res) => {

  adminModel.getUsersModel()

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};