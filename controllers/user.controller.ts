import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import ejs from 'ejs';

import catchAsyncErrors from '../middleware/catchAsyncErrors';
import User, { IUser } from '../models/user.model';
import ErrorHandler from '../utils/ErrorHandler';
import path from 'path';
import sendMail from '../utils/sendMail';
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken
} from '../utils/jwt';
import { redis } from '../utils/redis';
import { getUserById } from '../services/user.services';

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
      expiresIn: '5m'
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

interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      if (!email || !password)
        return next(new ErrorHandler('Email and password required', 400));

      const user = await User.findOne({ email }).select('+password');

      if (!user)
        return next(new ErrorHandler('Invalid email or password', 401));

      const passwordIsCorrect = await user.comparePassword(password);

      if (!passwordIsCorrect)
        return next(new ErrorHandler('Invalid email or password', 401));

      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const logoutUser = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie('access_token', '', { maxAge: 1 });
      res.cookie('refresh_token', '', { maxAge: 1 });

      // delete from redis
      const userId = req.user?._id;
      redis.del(userId);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully!'
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update access token
export const updateAccessToken = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token as string;
      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;

      const message = 'Could not refresh token';

      if (!decoded) return next(new ErrorHandler(message, 400));

      // get user from redis
      const session = await redis.get(decoded.id as string);

      if (!session) return next(new ErrorHandler(message, 400));

      const user = JSON.parse(session);

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        {
          expiresIn: '5m'
        }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        {
          expiresIn: '3d'
        }
      );

      res.cookie('access_token', accessToken, accessTokenOptions);
      res.cookie('refresh_token', refreshToken, refreshTokenOptions);

      res.status(200).json({
        status: 'success',
        refreshToken
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get logged in user info
export const getUserInfo = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getUserById(req.user?._id, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// social authentication
interface ISocialAuthBody {
  name: string;
  email: string;
  avatar: string;
}

export const socialAuth = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, avatar } = req.body as ISocialAuthBody;

      // if the does not exist, create a new user, else signin
      const user = await User.findOne({ email });

      if (!user) {
        const newUser = await User.create({ name, email, avatar })
        return sendToken(newUser, 201, res);
      } else {
        sendToken(user, 200, res)
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
