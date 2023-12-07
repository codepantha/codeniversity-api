import { Router } from 'express';
import { authorizedRoles, isAuthenticated } from '../middleware/auth';
import { editCourse, uploadCourse } from '../controllers/course.controller';

const router = Router();

router.post(
  '/',
  isAuthenticated,
  authorizedRoles('admin'),
  uploadCourse
);

router.put('/:id', isAuthenticated, authorizedRoles('admin'), editCourse);

export default router;
