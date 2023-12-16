import { Response } from 'express';
import { redis } from '../utils/redis';
import User from '../models/user.model';
import ErrorHandler from '../utils/ErrorHandler';

class UserService {
  getUserById = async (id: string, res: Response) => {
    const userJson = await redis.get(id);

    if (userJson) {
      const user = JSON.parse(userJson);
      res.status(200).json({
        success: true,
        user
      });
    }
  };

  /**
   * @description Get a list of users sorted by createdAt
   *
   * @param {Object} res - Express Response object for sending the HTTP response
   */
  getAllUsers = async (res: Response) => {
    try {
      const users = await User.find().sort({ createdAt: -1 });

      res.json({
        success: true,
        nbHits: users.length,
        users
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Error processing getAllUsers: ${error.message}`
      });
    }
  };

  updateUserRole = async (res: Response, id: string, role: string) => {
    {
      const user = await User.findByIdAndUpdate(id, { role }, { new: true });

      res.status(201).json({
        success: true,
        user
      });
    }
  };

  deleteUserById = async (id: string) => {
    const user = await User.findById(id);

    if (!user) throw new ErrorHandler('User not found', 404);

    await user.deleteOne();
    await redis.del(id);
  };
}

export default new UserService();
