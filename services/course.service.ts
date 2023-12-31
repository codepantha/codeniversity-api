import { Response } from 'express';

import catchAsyncErrors from '../middleware/catchAsyncErrors';
import Course from '../models/course.model';
import ErrorHandler from '../utils/ErrorHandler';
import { redis } from '../utils/redis';

class CourseService {
  /**
   * @description Create a new course
   * @param {Object} data - The course details
   * @param {Response} res - Express response object
   *
   * @returns {Object} Response JSON with the created course details
   * @throws {Error} If an error occurs during course creation
   */
  createCourse = catchAsyncErrors(async (data: any, res: Response) => {
    const course = await Course.create(data);

    res.status(201).json({
      success: true,
      course
    });
  });

  /**
   * @description Get a list of courses sorted by createdAt
   *
   * @param {Object} res - Express Response object for sending the HTTP response
   */
  getAllCourses = async (res: Response) => {
    try {
      const courses = await Course.find().sort({ createdAt: -1 });

      res.json({
        success: true,
        nbHits: courses.length,
        courses
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Error processing getAllCourses: ${error.message}`
      });
    }
  };

  deleteCourseById = async (id: string) => {
    const course = await Course.findById(id);

    if (!course) throw new ErrorHandler('Course not found', 404);

    await course.deleteOne();
    redis.del(id);
  };
}

export default new CourseService();
