import { Request, Response, NextFunction } from 'express';

import catchAsyncErrors from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { cloudinary } from '../server';
import { createCourse, deleteCourseById, getAllCourses } from '../services/course.service';
import Course from '../models/course.model';
import { redis } from '../utils/redis';
import sendMail from '../utils/sendMail';
import Notification from '../models/notification';

/**
 * @description Create a new course
 * @route POST /courses
 * @access Private (admin)
 *
 * @param {Object} body - The request body containing course details
 *
 * @returns {Object} Response JSON with the created course details
 * @throws {Error} If an error occurs during course creation or thumbnail upload
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
 *
 * @param {Object} data - The request body containing updated course details
 * @param {string} id - The id of the course to be updated
 *
 * @returns {Object} Response JSON with the updated course details
 * @throws {Error} If an error occurs during course update, thumbnail deletion, or thumbnail upload
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
 * @description Get details of a specific course
 * @route GET /courses/:id
 * @access Public
 *
 * @param {string} id - The id of the course to be retrieved
 *
 * @returns {Object} Response JSON with the course details
 * @throws {Error} If an error occurs during course retrieval from cache, MongoDB, or JSON parsing
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
 *
 * @returns {Object} Response JSON with the list of all courses
 * @throws {Error} If an error occurs during course retrieval from cache, MongoDB, or JSON parsing
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
 * @description Get content of a course bought by the authenticated user
 * @route GET /courses/:id/content
 * @access Private
 *
 * @param {string} id - The ID of the course to retrive, provided as a route parameter
 *
 * @returns {Object} Response JSON with the content details of the bought course
 * @throws {Error} If the course is not found, the user hasn't bought the course, or an internal server error occurs
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

      await Notification.create({
        userId: req.user?._id,
        title: 'New Question Received',
        message: `A student just asked a question on "${courseContent.title}" in your "${course?.name}" course.`,
      });

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

interface IAddAnswerData {
  answer: string;
  contentId: string;
}

/**
 * @description Add a new answer to a specific question in a course
 * @route POST /courses/:courseId/questions/:questionId/answers
 * @access Private
 *
 * @param {string} courseId - The ID of the course containing the question
 * @param {string} questionId - The ID of the question to which the answer will be added
 * @param {Object} body - The request body containing answer details
 * @param {string} body.answer - The answer text
 * @param {string} body.contentId - The ID of the course content to which the question belongs
 *
 * @returns {Object} Response JSON with the updated course details
 * @throws {Error} If course, course content, or question is not found, or an internal server error occurs
 */

export const addAnswer = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, questionId } = req.params;
      const { answer, contentId }: IAddAnswerData = req.body;

      const course = await Course.findById(courseId);

      const courseContent = course?.courseData.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!courseContent)
        return next(new ErrorHandler('Course content not found.', 404));

      const question = courseContent.questions.find((question: any) =>
        question._id.equals(questionId)
      );

      if (!question) return next(new ErrorHandler('Question not found', 404));

      // Create a new answer object to save to the questionReplies array
      const newAnswer: any = {
        user: req.user,
        answer
      };

      question.questionReplies.push(newAnswer);

      await course?.save();

      handleNotifications(req, question, courseContent);

      res.status(201).json({
        success: true,
        course
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(
          `Error while processing addAnswer: ${error.message}`,
          500
        )
      );
    }
  }
);

interface IAddReviewData {
  review: string;
  rating: number;
  userId: string;
}

/**
 * @description Add a new review to a specific course
 * @route POST /api/courses/:id/reviews
 * @access Private
 *
 * @param {string} id - The ID of the course to which the review will be added
 * @param {Object} body - The request body containing review details
 * @param {string} body.review - The review comment
 * @param {number} body.rating - The numeric rating given by the user
 *
 * @returns {Object} Response JSON with the updated course details and success status
 * @throws {Error} If user does not have access to the course, or an internal server error occurs
 */
export const addReview = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const coursesBoughtByUser = req.user?.courses;

      const courseId = req.params.id;

      // check if the user has bought the course
      const userHasBoughtCourse = coursesBoughtByUser?.find(
        (course: any) => course.courseId === courseId
      );

      if (!userHasBoughtCourse) {
        return next(
          new ErrorHandler('You do not have access to this course', 403)
        );
      }

      const course = await Course.findById(courseId);

      const { review, rating } = req.body as IAddReviewData;

      // create a new review and push into the reviews array
      const newReview: any = {
        user: req.user,
        rating,
        comment: review
      };

      course?.reviews.push(newReview);

      // calculate course ratings: totalRatings/num of ratings
      const totalRatings: number =
        course?.reviews.reduce((acc, review: any) => acc + review.rating, 0) ||
        0;

      if (course) {
        course.ratings = totalRatings / course.reviews.length;
      }

      course?.save();

      const notification = {
        title: 'New Review Received',
        message: `${req.user?.name} has given a review in ${course?.name}`
      };

      // TODO: Create notification

      res.status(201).json({
        success: true,
        course
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(
          `Error while processing addReview: ${error.message}`,
          500
        )
      );
    }
  }
);

interface IReviewReplyBody {
  comment: string;
}
/**
 * @description Add a reply to a specific review in a course
 * @route POST /api/courses/:courseId/reviews/:reviewId/replies
 * @access Private('admin')
 *
 * @param {string} courseId - The ID of the course containing the review
 * @param {string} reviewId - The ID of the review to which the reply will be added
 * @param {Object} body - The request body containing the reply details
 * @param {string} body.comment - The reply comment
 *
 * @returns {Object} Response JSON with the updated course details and success status
 * @throws {Error} If course, review, or user is not found, or an internal server error occurs
 */
export const addRepliesToReview = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, reviewId } = req.params;
      const { comment }: IReviewReplyBody = req.body;

      const course = await Course.findById(courseId);

      if (!course) return next(new ErrorHandler('Course not found', 404));

      // find the review
      const review = course.reviews.find((review) =>
        review._id.equals(reviewId)
      );

      if (!review) return next(new ErrorHandler('Review not found', 404));

      const reviewReply = {
        user: req.user,
        comment
      };

      // add the reply to the review
      review.commentReplies?.push(reviewReply);

      await course.save();

      res.status(201).json({
        success: true,
        course
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(
          `Error while processing addRepliesToReview: ${error.message}`,
          500
        )
      );
    }
  }
);

const handleNotifications = async (
  req: Request,
  question: any,
  courseContent: any
) => {
  // if the logged-in-user is the question's author
  if (req.user?._id === question.user._id) {
    // notify the admin of a new question
    await Notification.create({
      title: 'New Question Reply Recieved',
      message: `You have a new reply in ${courseContent.title}`
    })
  } else {
    // send a notification of a new reply
    const data = {
      name: question.user.name,
      title: courseContent.title
    };

    try {
      sendMail({
        email: question.user.email,
        subject: 'New Reply to Your Question',
        template: 'question-reply.ejs',
        data
      });
    } catch (error: any) {
      throw new ErrorHandler(`Error sending email ${error.message}`, 500);
    }
  }
};

/**
 * @description Get all courses
 * @route GET /all
 * @access Private (admin)
 * 
 * @returns {Object} Response JSON with the courses details and success status
 * @throws {Error} If an internal server error occurs
 */
export const fetchAllCourses = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  try {
    getAllCourses(res);
  } catch (error: any) {
    return next(new ErrorHandler(`Error processing index function ${error.message}`, 500))
  }
})

export const destroy = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;

    await deleteCourseById(id);

    res.status(204).json({
      success: true,
      message: 'Course deleted successfully'
    })
  } catch (error: any) {
    return next(new ErrorHandler(`Error processing destroy action: ${error.message}`, error.statusCode || 500))
  }
})
