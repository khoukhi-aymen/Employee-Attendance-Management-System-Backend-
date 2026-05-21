import * as hsuggestionsModel from '../models/suggestionsModel.js';



// ── GET /api/suggestions التعديلات /mine  (logged in employee) ──────────────────────────

export const getMySuggestionsController = (req, res) => {

  hsuggestionsModel.getMySuggestionsModel(req.session.employeeId)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};


// ── GET /api/suggestions  التعديلات (HR) ───────────────────────────────────────────────


export const getSuggestionsController = (req, res) => {

  hsuggestionsModel.getSuggestionsModel(req.query)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};



// ── POST /api/suggestions  (employee submits) ────────────────────────────────

export const createSuggestionController = (req, res) => {

  hsuggestionsModel.createSuggestionModel(req)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};


// ── POST /api/suggestions/:id/approve  (HR) ──────────────────────────────────


export const approveSuggestionController = (req, res) => {

  hsuggestionsModel.approveSuggestionModel(req)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};


// ── POST /api/suggestions/:id/reject  (HR) ───────────────────────────────────


export const rejectSuggestionController = (req, res) => {

  hsuggestionsModel.rejectSuggestionModel(req)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};


// ── POST /api/suggestions/hr-edit  (HR direct time edit) ─────────────────────

export const hrEditTimeController = (req, res) => {

  hsuggestionsModel.hrEditTimeModel(req)

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};



// ── POST /api/suggestions/manual-entry  (HR manual entry) ────────────────────

export const manualEntryController = (req, res) => {
  hsuggestionsModel.manualEntryModel(req)
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      res.json(err);
    });
};


// ── GET /api/suggestions/export  (HR) (*****) ────────────────────────────────────────


export const exportSuggestionsController = (req, res) => {

  suggestionsModel.exportSuggestionsModel()

    .then((result) => {

      res.json(result);

    })

    .catch((err) => {

      res.json(err);

    });

};