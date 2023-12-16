import { NextFunction, Request, Response } from 'express';

import catchAsyncErrors from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { cloudinary } from '../server';
import Layout from '../models/layout.model';

/**
 * @description Create a new layout or update an existing one based on the specified type.
 * @route POST /api/v1/layouts
 * @access Private (admin)
 *
 * @param {Object} req - Express Request object containing the HTTP request details.
 * @param {Object} res - Express Response object for sending the HTTP response.
 * @param {Object} next - Express NextFunction for error handling.
 *
 * @returns {Object} Response JSON indicating the success of the operation.
 * @throws {ErrorHandler} If an error occurs during layout creation or update.
 */
export const createLayout = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type }: { type: string } = req.body;

      // Validate request body
      if (!type || !['banner', 'faq', 'categories'].includes(type))
        return next(new ErrorHandler(`Invalid or missing layout type`, 422));

      // Find layout by type
      const layout: any = await Layout.findOne({ type });

      if (type === 'banner') {
        const { image, title, subtitle } = req.body;

        if (layout) {
          await cloudinary.uploader.destroy(layout.banner.image.public_id)
        }

        const uploadedImage = await cloudinary.uploader.upload(image, {
          folder: 'layout'
        });

        const banner = {
          image: {
            public_id: uploadedImage.public_id,
            url: uploadedImage.secure_url
          },
          title,
          subtitle
        };

        if (layout) {
          layout.banner = banner;
        } else await Layout.create({ type: 'Banner', banner });
      }

      if (type === 'faq' || type === 'categories') {
        const { data } = req.body;

        if (layout) {
          // append new data to the existing array for the specified type e.g faq, categories, banner
          layout[type] = [...layout[type], ...data];
        } else await Layout.create({ type, [type]: data });
      }

      await layout.save();

      res.status(201).json({
        success: true,
        message: 'Layout created successfully'
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(
          `Error processing create layout: ${error.message}`,
          error.statusCode || 500
        )
      );
    }
  }
);

/**
 * @description Retrieve a layout based on the specified type from the database.
 * @route GET /api/v1/layouts?type={type}
 * @access Public
 *
 * @param {Object} req - Express Request object.
 * @param {Object} res - Express Response object.
 * @param {Object} next - Express NextFunction for error handling.
 *
 * @returns {Object} Response JSON with the retrieved layout details.
 * @throws {ErrorHandler} If an error occurs during the retrieval process.
 */
interface QueryParams {
  type: string;
}

export const getLayoutByType = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type }: QueryParams = req.query as any;
    const layout = await Layout.findOne({ type: type.toLowerCase() });

    res.status(200).json({
      success: true,
      layout
    });
  } catch (error: any) {
    return next(new ErrorHandler(`Error processing get layout by type: ${error.message}`, error.statusCode || 500));
  }
});
