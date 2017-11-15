const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const { catchErrors } = require('../handlers/errorHandlers');


router.get('/', catchErrors(storeController.getStores));
router.get('/stores', catchErrors(storeController.getStores));

//Serve form to add a store
router.get('/add', storeController.addStore);

//Handle POST where user creates a new store.
router.post('/add', 
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.createStore)
);

//Handle POST where user updates a store.
router.post('/add/:id',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.updateStore)
);
router.get('/stores/:id/edit', catchErrors(storeController.editStore));

router.get('/stores/:slug', catchErrors(storeController.getStoreBySlug));

router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));

router.get('/login', userController.loginForm);
router.get('/register', userController.registerForm);

//1. Validate the user
//2. Register the user (create account)
//3. Log them in.
router.post('/register', userController.validateRegister, userController.registerForm);

module.exports = router;
