import { Request, Response, NextFunction } from 'express';

import catchAsyncErrors from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { cloudinary } from '../server';
import { createCourse } from '../services/course.service';
import Course from '../models/course.model';
import { redis } from '../utils/redis';

/**
 * @description Create a new course
 * @route POST /courses
 * @access Private (admin)
 */
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

/**
 * @description Update an existing course
 * @route PUT /courses/:id
 * @access Private (admin)
 */
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

/**
 * @description Get details of a single course
 * @route GET /courses/:id
 * @access Public
 */
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

/**
 * @description Get details of all courses
 * @route GET /courses
 * @access Public
 */
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

/**
 * @description Fetches course data from MongoDB and caches it in Redis based on the provided ID or caches all courses if no ID is provided.
 * @param {string} id - The ID of the specific course to fetch. If not provided, fetches all courses.
 * @returns {Promise<Course | Course[]>} - Fetched course or courses
 */
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

/**
 * @description Get content of a course bought by the authenticated user.
 * @route GET /courses/:id/content
 * @access Private
 */
export const getCourseBoughtByUser = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = req.user?.courses;
      const courseId = req.params.id;

      // check if the courseId is in the user's bought courses
      const userHasBoughtCourse = courses?.find(
        (course) => course.courseId === courseId
      );

      if (!userHasBoughtCourse) {
        return next(
          new ErrorHandler('You do not have access to this course', 403)
        );
      }

      const course = await Course.findById(courseId);
      const content = course?.courseData;

      res.status(200).json({
        success: true,
        content
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(
          `Error while processing getCourseBoughtByUser: ${error.message}`,
          500
        )
      );
    }
  }
);

interface IAddQuestionData {
  question: string;
  contentId: string;
}

/**
 * @description Add a new question to a specific course content
 * @route POST /courses/:id/questions
 * @access Private (user)
 *
 * @param {string} id - The ID of the course to which the question will be added
 * @param {Object} body - The request body containing question details
 * @param {string} body.question - The question text
 * @param {string} body.contentId - The ID of the course content to which the question will be added
 *
 * @returns {Object} Response JSON with the updated course details
 * @throws {Error} If course or course content is not found, or an internal server error occurs
 */
export const addQuestion = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: courseId } = req.params;
      const { question, contentId }: IAddQuestionData = req.body;

      const course = await Course.findById(courseId);

      const courseContent = course?.courseData.find((item: any) => {
        return item._id.equals(contentId);
      });

      if (!courseContent)
        return next(new ErrorHandler('Course content not found.', 404));

      // create a new question object and add to our course content
      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: []
      };

      courseContent.questions.push(newQuestion);

      await course?.save();

      res.status(201).json({
        success: true,
        course
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(
          `Error while processing addQuestion: ${error.message}`,
          500
        )
      );
    }
  }
);
