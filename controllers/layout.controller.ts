import { NextFunction, Request, Response } from 'express';

import catchAsyncErrors from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { cloudinary } from '../server';
import Layout from '../models/layout.model';

export const createLayout = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;

      const typeExists = await Layout.find({ type });
      let layout: any;
      if (typeExists) {
        layout = await Layout.findOne({ type });
      }

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

        if (typeExists) {
          layout.banner = banner;
          await layout.save();
        } else await Layout.create({ type: 'Banner', banner });
      }

      if (type === 'FAQ') {
        const { faq } = req.body;

        if (typeExists) {
          layout.faq = [...layout.faq, ...faq];
          await layout.save();
        } else await Layout.create({ type: 'FAQ', faq });
      }

      if (type === 'Categories') {
        const { categories } = req.body;
        if (typeExists) {
          layout.categories = [...layout.categories, ...categories];
          await layout.save();
        } else await Layout.create({ type: 'Categories', categories });
      }

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
