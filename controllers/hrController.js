import * as hrModel from '../models/hrModel.js';




//************** */ HR accounts (managed by admin) **************************/

// ── GET /api/hr/accounts (admin) ─────────────────────────────────────

export const getHRAccountsController = (req, res) => {

  hrModel.getHRAccountsModel(req)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};


// ── POST /api/hr/accounts (admin) ─────────────────────────────────────

export const createHRAccountController = (req, res) => {

  hrModel.createHRAccountModel(req.body, req)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};


// ── PUT /api/hr/accounts/:username (admin) ─────────────────────────────────────

export const updateHRAccountController = (req, res) => {

  const { username } = req.params;

  hrModel.updateHRAccountModel(req.body, username, req)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};


// ── DELETE /api/hr/accounts/:username (admin) ─────────────────────────────────────

export const deleteHRAccountController = (req, res) => {

  const { username } = req.params;

  hrModel.deleteHRAccountModel(username, req)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};



//************ Admin accounts (managed by superadmin only)  **************************/


// ── GET /api/hr/admin-accounts (superadmin) ─────────────────────────────────────

export const getAdminAccountsController = (req, res) => {

  hrModel.getAdminAccountsModel()

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};



// ── POST /api/hr/admin-accounts (superadmin) ─────────────────────────────────────

export const createAdminAccountController = (req, res) => {

  hrModel.createAdminAccountModel(req.body, req)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};



// ── PUT /api/hr/admin-accounts/:username (superadmin) ─────────────────────────────────────

export const updateAdminAccountController = (req, res) => {

  const { username } = req.params;

  hrModel.updateAdminAccountModel(req.body, username, req)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};


// ── DELETE /api/hr/admin-accounts/:username (superadmin) ─────────────────────

export const deleteAdminAccountController = (req, res) => {

  const { username } = req.params;

  hrModel.deleteAdminAccountModel(username, req)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};