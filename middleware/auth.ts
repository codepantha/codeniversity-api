import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import catchAsyncErrors from './catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { redis } from '../utils/redis';

export const isAuthenticated = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const accessToken = req.cookies.access_token as string;

    if (!accessToken)
      return next(
        new ErrorHandler('Please login to access this resource', 401)
      );

    // decode the token if it exists
    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN as string
    ) as JwtPayload;

    if (!decoded) return next(new ErrorHandler('Invalid access token', 401));

    // get the user from redis
    const user = await redis.get(decoded.id);

    if (!user) return next(new ErrorHandler('Please login to access this resource', 401));

    req.user = JSON.parse(user);
    next();
  }
);

export const authorizedRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || ''))
      return next(
        new ErrorHandler(
          `Role '${req.user?.role}' is not allowed to access this resource`,
          403
        )
      );
    next();
  };
};
