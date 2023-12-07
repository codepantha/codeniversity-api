import { Response } from 'express';
import { IUser } from '../models/user.model';
import { redis } from './redis';

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none' | undefined;
  secure?: boolean;
}

// parse env variables to integrate with fallback values
const accessTokenExpires = parseInt(
  process.env.ACCESS_TOKEN_EXPIRES || '5',
  10
);
const refreshTokenExpires = parseInt(
  process.env.REFRESH_TOKEN_EXPIRES || '3',
  10
);

// Cookie options
export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpires * 60 * 60 * 1000),
  maxAge: accessTokenExpires * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax'
};

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpires * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpires * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax'
};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.signAccessToken();
  const refreshToken = user.signRefreshToken();

  // Upload session to redis
  redis.set(user._id, JSON.stringify(user) as any);

  // if in production, then { secure: true }
  if (process.env.NODE_ENV === 'production') {
    accessTokenOptions.secure = true;
  }

  // set the cookies
  res.cookie('access_token', accessToken, accessTokenOptions);
  res.cookie('refresh_token', refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken
  });
};
