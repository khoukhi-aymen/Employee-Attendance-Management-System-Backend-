import * as storesModel from '../models/storesModel.js';

// ── GET ALL STORES ─────────────────────────────

export const getStoresController = (req, res) => {

  storesModel.getStoresModel()

    .then((result) => {
      res.json(result);
    })

    .catch((err) => {
      res.json(err);
    });

};