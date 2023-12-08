import { Request, Response, NextFunction } from 'express';

import catchAsyncErrors from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { cloudinary } from '../server';
import { createCourse } from '../services/course.service';
import Course from '../models/course.model';

export const create = catchAsyncErrors(
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

export const update = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
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

// get single course
export const show = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const course = await Course.findById(req.params.id).select(
        '-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links'
      );

      if (!course) {
        return next(new ErrorHandler('Course not found', 404));
      }

      res.status(200).json({
        success: true,
        course
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get all courses
export const index = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await Course.find().select(
        '-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links'
      );
      res.status(200).json({
        success: true,
        courses
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
