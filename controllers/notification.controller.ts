import { Request, Response, NextFunction} from 'express'

import catchAsyncErrors from '../middleware/catchAsyncErrors'
import Notification from '../models/notification'
import ErrorHandler from '../utils/ErrorHandler'

/**
 * @description Get a list of notifications sorted by creation date
 * @route GET /api/notifications
 * @access Private (admin)
 * 
 * @returns {Object} Response JSON with the list of notifications
 * @throws {Error} If an internal server error occurs during processing
 */
export const getNotifications = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await Notification.find().sort({createdAt: -1})

    res.status(200).json({ success: true, notifications })
  } catch (error: any) {
    return next(new ErrorHandler(`Error processing get notifcations ${error.message}`, 500))
  }
})

/**
 * @description Mark a specific notification as read
 * @route PUT /api/notifications/:id/mark-as-read
 * @access Private (admin)
 * 
 * @param {string} id - The ID of the notification to mark as read
 * 
 * @returns {Object} Response JSON with the list of notifications after marking as read
 * @throws {Error} If notification is not found, or an internal server error occurs
 */
export const markAsRead = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) return next(new ErrorHandler('notification not found', 404))

    notification.status = 'read';

    await notification.save();

    const notifications = await Notification.find().sort({ createdAt: -1 })

    res.status(201).json({
      success: true,
      notifications
    })
  } catch (error: any) {
    return next(new ErrorHandler(`Error processing markAsRead ${error.message}`, 500))
  }
})
