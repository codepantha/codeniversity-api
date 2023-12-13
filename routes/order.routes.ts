import express from 'express';
import { create, index } from '../controllers/order.controller';
import { authorizedRoles, isAuthenticated } from '../middleware/auth';
const orderRouter = express.Router();

orderRouter.post('/', isAuthenticated, create)
orderRouter.get('/', isAuthenticated, authorizedRoles('admin'), index);

export default orderRouter;
