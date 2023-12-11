import { Response } from 'express';
import catchAsyncErrors from '../middleware/catchAsyncErrors';
import Course from '../models/course.model';

/**
 * @description Create a new course
 * @param {Object} data - The course details
 * @param {Response} res - Express response object
 * 
 * @returns {Object} Response JSON with the created course details
 * @throws {Error} If an error occurs during course creation
 */
export const createCourse = catchAsyncErrors(
  async (data: any, res: Response) => {
    const course = await Course.create(data);

    res.status(201).json({
      success: true,
      course
    });
  }
);
