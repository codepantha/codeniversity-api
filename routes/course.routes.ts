import { Router } from 'express';
import { authorizedRoles, isAuthenticated } from '../middleware/auth';
import {
  update,
  create,
  show,
  index,
  getCourseBoughtByUser,
  addQuestion,
  addAnswer,
  addReview,
  addRepliesToReview,
  fetchAllCourses,
  destroy
} from '../controllers/course.controller';

const router = Router();

router.post('/', isAuthenticated, authorizedRoles('admin'), create);

router.get('/', index);
router.get('/all', isAuthenticated, authorizedRoles('admin'), fetchAllCourses);

router.put('/:id', isAuthenticated, authorizedRoles('admin'), update);
router.delete('/:id', isAuthenticated, authorizedRoles('admin'), destroy);
router.get('/:id', show);
router.get('/:id/content', isAuthenticated, getCourseBoughtByUser);
router.post('/:id/questions', isAuthenticated, addQuestion);
router.post(
  '/:courseId/questions/:questionId/answers',
  isAuthenticated,
  addAnswer
);
router.post('/:id/reviews', isAuthenticated, addReview);
router.post(
  '/:courseId/reviews/:reviewId/replies',
  isAuthenticated,
  authorizedRoles('admin'),
  addRepliesToReview
);

export default router;
