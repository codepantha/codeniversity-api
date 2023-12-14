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

/**
 * @description Get a list of Orders sorted by createdAt
 * 
 * @param {Object} res - Express Response object for sending the HTTP response
 * 
 * @returns {Object} Response JSON with the orders details and success status
 * @throws {Error} If an internal server error occurs
 */
export const getAllOrders = async (res: Response) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      nbHits: orders.length,
      orders,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: `Error processing getAllOrders: ${error.message}`,
    });
  }
}
