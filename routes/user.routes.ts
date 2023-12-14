import express from 'express';

import {
  activateUser,
  getUserInfo,
  index,
  loginUser,
  logoutUser,
  registerUser,
  socialAuth,
  updateAccessToken,
  updatePassword,
  updateProfilePicture,
  updateUserInfo,
  updateUserRole
} from '../controllers/user.controller';
import { authorizedRoles, isAuthenticated } from '../middleware/auth';
const router = express.Router();

router.get('/users', isAuthenticated, authorizedRoles('admin'), index);
router.post('/register', registerUser);
router.post('/activate-user', activateUser);
router.post('/login', loginUser);
router.get('/logout', isAuthenticated, logoutUser);
router.get('/refresh-token', updateAccessToken);
router.get('/me', isAuthenticated, getUserInfo);
router.post('/social-auth', socialAuth);
router.put('/update-user-info', isAuthenticated, updateUserInfo);
router.put('/update-password', isAuthenticated, updatePassword);
router.put('/update-user-avatar', isAuthenticated, updateProfilePicture);
router.put(
  '/update-user-role',
  isAuthenticated,
  authorizedRoles('admin'),
  updateUserRole
);

export default router;
