import { Request, Response, NextFunction } from "express";
import catchAsyncErrors from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { generateLast12MonthsData } from "../utils/analytics.generator";
import User from "../models/user.model";
import Order from "../models/order.model";
import Course from "../models/course.model";

// get users analytics -- only admin
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