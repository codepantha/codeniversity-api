import { Router } from 'express';
import { authorizedRoles, isAuthenticated } from '../middleware/auth';
import { createLayout, getLayoutByType } from '../controllers/layout.controller';

const router = Router();

router.post('/', isAuthenticated, authorizedRoles('admin'), createLayout);
router.get('/', getLayoutByType);

export default router;
