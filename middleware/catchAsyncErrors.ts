import { Request, Response, NextFunction, RequestHandler } from 'express';

const catchAsyncErrors =
  (handler: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export default catchAsyncErrors;
