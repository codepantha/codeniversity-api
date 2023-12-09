import { Router } from 'express';
import { authorizedRoles, isAuthenticated } from '../middleware/auth';
import {
  update,
  create,
  show,
  index,
  getCourseBoughtByUser,
  addQuestion
} from '../controllers/course.controller';

const router = Router();

router.post('/', isAuthenticated, authorizedRoles('admin'), create);

router.get('/', index);

router.put('/:id', isAuthenticated, authorizedRoles('admin'), update);
router.get('/:id', show);
router.get('/:id/content', isAuthenticated, getCourseBoughtByUser);
router.post('/:id/questions', isAuthenticated, addQuestion);

export default router;
