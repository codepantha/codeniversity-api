import express from 'express';

import { activateUser, loginUser, logoutUser, registerUser, updateAccessToken } from '../controllers/user.controller';
import { authorizedRoles, isAuthenticated } from '../middleware/auth';
const router = express.Router();

router.post('/register', registerUser);
router.post('/activate-user', activateUser);
router.post('/login', loginUser);
router.get('/logout', isAuthenticated, logoutUser);
router.get('/refresh-token', updateAccessToken);

export default router;
