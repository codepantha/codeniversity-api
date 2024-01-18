import { Request, Response, NextFunction } from "express";
import catchAsyncErrors from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { generateLast12MonthsData } from "../utils/analytics.generator";
import User from "../models/user.model";
import Order from "../models/order.model";
import Course from "../models/course.model";

/**
 * @description Get user analytics for the last 12 months
 * @route GET /analytics/users
 * @access Private (admin)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * @throws {Error} If an error occurs during user analytics retrieval (HTTP status code 500)
 *
 * @returns {Object} JSON response with user analytics data
 * - success (boolean): Indicates if the operation was successful
 * - users (Array): Array of user analytics data for the last 12 months
 *   - month (string): The month for which the analytics data is provided
 *   - count (number): Number of new users for the specified month
 */
export const getUserAnalytics = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await generateLast12MonthsData(User)

    res.status(200).json({
      success: true,
      users
    })
  } catch (error: any) {
    return next(new ErrorHandler(`Error processing user analytics: ${error.message}`, error.statusCode || 500));
  }
})

/**
 * @description Get order analytics for the last 12 months
 * @route GET /analytics/orders
 * @access Private (admin)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * @throws {Error} If an error occurs during order analytics retrieval (HTTP status code 500)
 *
 * @returns {Object} JSON response with order analytics data
 * - success (boolean): Indicates if the operation was successful
 * - orders (Array): Array of order analytics data for the last 12 months
 *   - month (string): The month for which the analytics data is provided
 *   - count (number): Number of new orders for the specified month
 */
export const getOrderAnalytics = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await generateLast12MonthsData(Order)

    res.status(200).json({
      success: true,
      orders
    })
  } catch (error: any) {
    return next(new ErrorHandler(`Error processing order analytics: ${error.message}`, error.statusCode || 500));
  }
})

/**
 * @description Get course analytics for the last 12 months
 * @route GET /analytics/courses
 * @access Private (admin)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * @throws {Error} If an error occurs during course analytics retrieval (HTTP status code 500)
 *
 * @returns {Object} JSON response with course analytics data
 * - success (boolean): Indicates if the operation was successful
 * - courses (Array): Array of course analytics data for the last 12 months
 *   - month (string): The month for which the analytics data is provided
 *   - count (number): Number of new courses for the specified month
 */
export const getCourseAnalytics = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await generateLast12MonthsData(Course)

    res.status(200).json({
      success: true,
      courses
    })
  } catch (error: any) {
    return next(new ErrorHandler(`Error processing course analytics: ${error.message}`, error.statusCode || 500));
  }
})