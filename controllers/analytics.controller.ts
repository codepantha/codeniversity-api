import { Request, Response, NextFunction } from "express";
import catchAsyncErrors from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { generateLast12MonthsData } from "../utils/analytics.generator";
import User from "../models/user.model";

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