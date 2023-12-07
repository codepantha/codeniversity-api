require('dotenv').config();
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import ErrorMiddleware from './middleware/error';
import userRouter from './routes/user.routes';
import courseRouter from './routes/course.routes';

export const app = express();

// body parser
app.use(express.json({ limit: '50mb' }));
// cookie parser
app.use(cookieParser());
// cors
app.use(
  cors({
    origin: process.env.ORIGIN
  })
);

app.use('/api/v1', userRouter)
app.use('/api/v1/courses', courseRouter)

app.get('/test', (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: 'API is working'
  });
});

// unknown route middleware
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route ${req.originalUrl} does not exist.`) as any;
  err.statusCode = 404;
  next(err);
});

app.use(ErrorMiddleware);
