import { Router } from 'express';
import { authorizedRoles, isAuthenticated } from '../middleware/auth';
import { uploadCourse } from '../controllers/course.controller';

const router = Router();

router.post(
  '/',
  isAuthenticated,
  authorizedRoles('admin'),
  uploadCourse
);

export default router;
