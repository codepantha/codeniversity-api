import { NextFunction, Response } from 'express';
import catchAsyncErrors from '../middleware/catchAsyncErrors';
import Order from '../models/order.model';

export const createNewOrder: any = catchAsyncErrors(
  async (data: any, res: Response, next: NextFunction) => {
    const order = await Order.create(data);
    
    res.status(201).json({
      success: true,
      order
    })
  }
);

