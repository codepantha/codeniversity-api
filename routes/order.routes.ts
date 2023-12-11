import express from 'express';
import { create } from '../controllers/order.controller';
import { isAuthenticated } from '../middleware/auth';
const orderRouter = express.Router();

orderRouter.post('/', isAuthenticated, create)

export default orderRouter;
