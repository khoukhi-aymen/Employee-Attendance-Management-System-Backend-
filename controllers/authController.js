import * as authModel from '../models/authModel.js';


// POST /api/auth/login

export const loginController = (req, res) => {

    const { username, password } = req.body;

    authModel.loginModel(username, password, req)

    .then((result) => {

        res.json(result);

    })

    .catch((err) => {

        res.json(err);

    });

};


// POST /api/auth/logout

export const logoutController = (req, res) => {

    authModel.logoutModel(req)

    .then((result) => {

        res.json(result);

    })

    .catch((err) => {

        res.json(err);

    });

};

// GET /api/auth/session (*****)

export const sessionController = (req, res) => {

    authModel.sessionModel(req)

        .then((result) => {
            res.json(result);
        })

        .catch((err) => {
            res.json(err);
        });
};


// POST /api/auth/update-password

export const updatePasswordController = (req, res) => {

    authModel.updatePasswordModel(req)

        .then((result) => {
            res.json(result);
        })

        .catch((err) => {
            res.json(err);
        });
};