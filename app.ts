require('dotenv').config();
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import ErrorMiddleware from './middleware/error';
import userRouter from './routes/user.routes';
import courseRouter from './routes/course.routes';
import orderRouter from './routes/order.routes';
import notificationRouter from './routes/notification.routes';
import analyticsRouter from './routes/analytics.routes';

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
app.use('/api/v1/orders/', orderRouter)
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/analytics', analyticsRouter);

// unknown route middleware
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route ${req.originalUrl} does not exist.`) as any;
  err.statusCode = 404;
  next(err);
});

app.use(ErrorMiddleware);
