import { NextFunction, Request, Response } from 'express';
import ErrorHandler from '../utils/ErrorHandler';

const ErrorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal server error';

  // mongodb id error
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid ID: ${err.value}`;
    err = new ErrorHandler(message, 404);
  }

  // Duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    err = new ErrorHandler(message, 409);
  }

  // Invalid token error
  if (err.name === 'JsonWebTokenError') {
    const message = `Invalid token. Please provide a valid token`;
    console.log('INVALID TOKEN')
    err = new ErrorHandler(message, 401);
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    const message = `Expired token. Please log in again`;
    err = new ErrorHandler(message, 401);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message
  });
};

export default ErrorMiddleware;
