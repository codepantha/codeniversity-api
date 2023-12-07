import { Response } from 'express';
import catchAsyncErrors from '../middleware/catchAsyncErrors';
import Course from '../models/course.model';

export const createCourse = catchAsyncErrors(
  async (data: any, res: Response) => {
    const course = await Course.create(data);

    res.status(201).json({
      success: true,
      course
    });
  }
);
