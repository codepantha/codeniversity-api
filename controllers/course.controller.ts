import { Request, Response, NextFunction } from 'express';

import catchAsyncErrors from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { cloudinary } from '../server';
import { createCourse } from '../services/course.service';
import Course from '../models/course.model';
import { redis } from '../utils/redis';

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
      const { id } = req.params;

      const cachedData = await redis.get(id);

      // if course isn't cached, fetch from mongodb and cache it
      if (!cachedData) {
        const course = await fetchAndCacheCourse(id);

        return res.status(200).json({
          success: true,
          course
        });
      }

      // return the cached course from redis
      const course = JSON.parse(cachedData);

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
      const cachedData = await redis.get('allCourses');

      if (!cachedData) {
        const courses = await fetchAndCacheCourse();

        return res.status(200).json({
          success: true,
          courses
        });
      }

      const courses = JSON.parse(cachedData);

      res.status(200).json({
        success: true,
        courses
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

async function fetchAndCacheCourse(id: string = '') {
  if (id) {
    const course = await Course.findById(id).select(
      '-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links'
    );

    await redis.set(id, JSON.stringify(course));

    return course;
  }

  const courses = await Course.find().select(
    '-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links'
  );

  await redis.set('allCourses', JSON.stringify(courses));

  return courses;
}
