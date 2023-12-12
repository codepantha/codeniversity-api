import express from 'express';

import { authorizedRoles, isAuthenticated } from '../middleware/auth';
import { getNotifications, markAsRead } from '../controllers/notification.controller';
const notificationRouter = express.Router();

notificationRouter.get('/', isAuthenticated, authorizedRoles('admin'), getNotifications);
notificationRouter.put('/:id/mark-as-read', isAuthenticated, authorizedRoles('admin'), markAsRead);

export default notificationRouter;
