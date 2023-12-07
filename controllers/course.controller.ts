import { Request, Response, NextFunction } from 'express';

import catchAsyncErrors from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { cloudinary } from '../server';
import { createCourse } from '../services/course.service';
import Course from '../models/course.model';

export const uploadCourse = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const uploaded = await cloudinary.uploader.upload(thumbnail, {
          folder: 'courses'
        });

        data.thumbnail = {
          public_id: uploaded.public_id,
          url: uploaded.secure_url
        };
      }
      createCourse(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const editCourse = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body
      const { id } = req.params;

      const thumbnail = data?.thumbnail || '';

      if (thumbnail) {
        await cloudinary.uploader.destroy(thumbnail.public_id);

        const uploaded = await cloudinary.uploader.upload(thumbnail, {
          folder: 'courses'
        });

        data.thumbnail = {
          public_id: uploaded.public_id,
          url: uploaded.secure_url
        };
      }

      const course = await Course.findByIdAndUpdate(
        id,
        {
          $set: data
        },
        { new: true }
      );

      res.status(200).json({
        success: true,
        course
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
