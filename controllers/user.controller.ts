import { NextFunction, Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import ejs from 'ejs';

import catchAsyncErrors from '../middleware/catchAsyncErrors';
import User from '../models/user.model';
import ErrorHandler from '../utils/ErrorHandler';
import path from 'path';
import sendMail from '../utils/sendMail';

interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registerUser = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;
      const emailExists = await User.findOne({ email });

      if (emailExists) {
        return next(new ErrorHandler('Email already exists', 409));
      }

      const user: IRegistrationBody = {
        name,
        email,
        password
      };

      const { activationCode, token } = createActivationToken(user);
      const data = { user: { name: user.name }, activationCode };
      const html = await ejs.renderFile(
        path.join(__dirname, '../mails/activation-mail.ejs'),
        data
      );

      try {
        await sendMail({
          email: user.email,
          subject: 'Activate your account',
          template: 'activation-mail.ejs',
          data
        });

        res.status(201).json({
          success: true,
          message: `Please check our email: ${user.email} to activate your account`,
          activationToken: token
        })
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}
export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    {
      user,
      activationCode
    },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: '5m'
    }
  );

  return { token, activationCode };
};
