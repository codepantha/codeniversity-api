import { NextFunction, Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import ejs from 'ejs';

import catchAsyncErrors from '../middleware/catchAsyncErrors';
import User, { IUser } from '../models/user.model';
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
          message: `Please check your email: ${user.email} to activate your account`,
          activationToken: token
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
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
      expiresIn: '10m'
    }
  );

  return { token, activationCode };
};

interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;

      const decoded: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser; activationCode: string };

      // check if the activation code matches
      if (decoded.activationCode !== activation_code)
        return next(new ErrorHandler('Invalid activation code', 401));

      const { name, email, password } = decoded.user;

      const userExists = await User.findOne({ email });

      if (userExists) return next(new ErrorHandler('Email aready exists', 409));

      const user = await User.create({ name, email, password });

      res.status(201).json({
        success: true,
        user
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
