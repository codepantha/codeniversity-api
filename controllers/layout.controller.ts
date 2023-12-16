import { NextFunction, Request, Response } from 'express';

import catchAsyncErrors from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { cloudinary } from '../server';
import Layout from '../models/layout.model';

export const createLayout = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type }: { type: string } = req.body;

      // Validate request body
      if (!type || !['Banner', 'FAQ', 'Categories'].includes(type))
        return next(new ErrorHandler(`Invalid or missing layout type`, 422));

      // Find layout by type
      const layout: any = await Layout.findOne({ type });

      if (type === 'Banner') {
        const { image, title, subtitle } = req.body;

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

      if (type === 'FAQ' || type === 'Categories') {
        const { data } = req.body;

        if (layout) {
          layout[type.toLowerCase()] = [...layout[type.toLowerCase()], ...data];
        } else await Layout.create({ type, [type.toLowerCase()]: data });
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
