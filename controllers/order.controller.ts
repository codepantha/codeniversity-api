import { Request, Response, NextFunction } from 'express';
import catchAsyncErrors from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { IOrder } from '../models/order.model';
import User from '../models/user.model';
import Course from '../models/course.model';
import { createNewOrder } from '../services/order.service';
import sendMail from '../utils/sendMail';
import Notification from '../models/notification';

export const create = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, payment_info } = req.body as IOrder;

      const user = await User.findById(req.user?._id);

      const userHasBoughtCourse = user?.courses.find(
        (course: any) => course._id.equals(courseId)
      );

      if (userHasBoughtCourse)
        return next(
          new ErrorHandler('You have already purchased this course', 409)
        );

      const course = await Course.findById(courseId);

      if (!course) return next(new ErrorHandler('Course does not exist', 404));

      const data: any = {
        courseId: course._id,
        userId: user?._id,
        payment_info
      };

      const mailData = {
        order: {
          _id: course._id.toString().slice(0, 6),
          name: course.name,
          price: course.price,
          userName: user?.name,
          date: new Date().toLocaleDateString()
        }
      }

      try {
        if (user) {
          await sendMail({
            email: user.email,
            subject: 'Order Confirmation',
            template: 'order-confirmation.ejs',
            data: mailData
          })
        }
      } catch (error: any) {
        return next(new ErrorHandler(`Error sending order confirmation email ${error.message}`, 500))
      }

      // add course id to list of courses bought by user
      user?.courses.push(course?._id);

      await user?.save();

      await Notification.create({
        userId: user?._id,
        title: 'New Order',
        message: `You have a new order from ${course?.name}`
      })

      // if course.purchased is null or undefined, we initialize it to 1 else we increment
      course.purchased = (course.purchased ?? 0) + 1

      await course.save();

      createNewOrder(data, res, next);
    } catch (error: any) {
      return next(
        new ErrorHandler(`Error processing create order :${error.message}`, 500)
      );
    }
  }
);
