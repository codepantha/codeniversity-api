import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import ejs from 'ejs';
// import cloudinary from 'cloudinary';

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
import {
  deleteUserById,
  getAllUsers,
  getUserById,
  updateUserRoleService
} from '../services/user.service';
import { cloudinary } from '../server';

/**
 * @description Get all users sorted by createdAt
 * @route GET /users
 * @access Private (admin)
 *
 * @returns {Object} JSON response with the list of users
 * @throws {Error} If an internal server error occurs during processing
 */
export const index = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getAllUsers(res);
    } catch (error: any) {
      return next(
        new ErrorHandler(
          `Error processing index function ${error.message}`,
          500
        )
      );
    }
  }
);

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

      req.user = user;

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
        const newUser = await User.create({ name, email, avatar });
        return sendToken(newUser, 201, res);
      } else {
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update user info
interface IUpdateUserInfo {
  name?: string;
  email?: string;
}

export const updateUserInfo = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body as IUpdateUserInfo;

      // destructure _id as userId from req.user?._id
      const { _id: userId } = req.user || {};

      const user = await User.findById(userId);

      // update the email
      if (email && user) {
        const emailInUse = await User.findOne({ email });

        if (emailInUse) {
          return next(new ErrorHandler('Email already in use', 409));
        }

        user.email = email;
      }

      // update the name
      if (name && user) {
        user.name = name;
      }

      await user?.save();

      // update user on redis
      await redis.set(userId, JSON.stringify(user));

      res.status(200).json({
        success: true,
        user
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;

      if (!oldPassword || !newPassword) {
        return next(
          new ErrorHandler('Please enter old and new passwords', 422)
        );
      }

      const user = await User.findById(req.user?._id).select('+password');

      // if the user's account doesn't have a password,
      // then it was created using social login
      if (!user?.password) {
        return next(
          new ErrorHandler(
            'You do not have a password to update. Sign in with social login',
            409
          )
        );
      }

      // compare the old passwords
      const passwordCorrect = await user.comparePassword(oldPassword);

      if (!passwordCorrect) {
        return next(new ErrorHandler('Incorrect old password', 409));
      }

      // update the new password on mongodb and redis
      user.password = newPassword;
      await user.save();
      await redis.set(req.user?._id, JSON.stringify(user));

      res.status(200).json({
        success: true,
        user
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Update profile pic
interface IUpdateProfilePicture {
  avatar: string;
}

export const updateProfilePicture = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body as IUpdateProfilePicture;

      const userId = req.user?._id;

      const user = await User.findById(userId);

      if (avatar && user) {
        const avatarPublicId = user.avatar.public_id;
        // do this if the user has an avatar
        if (avatarPublicId) {
          // delete the old avatar image
          cloudinary.uploader.destroy(avatarPublicId);

          const uploadedAvatar = await cloudinary.uploader.upload(avatar, {
            folder: 'avatars',
            width: 150
          });
          user.avatar = {
            public_id: uploadedAvatar.public_id,
            url: uploadedAvatar.secure_url
          };
        } else {
          const uploadedAvatar = await cloudinary.uploader.upload(avatar, {
            folder: 'avatars',
            width: 150
          });
          user.avatar = {
            public_id: uploadedAvatar.public_id,
            url: uploadedAvatar.secure_url
          };
        }
      }

      // update the user on mongodb and redis
      await user?.save();
      await redis.set(userId, JSON.stringify(user));

      res.status(200).json({
        success: true,
        user
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const updateUserRole = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.body;

      await updateUserRoleService(res, id, role);
    } catch (error: any) {
      return next(
        new ErrorHandler(
          `Error processing update user role: ${error.message}`,
          500
        )
      );
    }
  }
);

export const deleteUser = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await deleteUserById(id);

    res.status(204).json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error: any) {
    return next(new ErrorHandler(`Error processing delete user: ${error.message}`, error.statusCode || 500));
  }
})
