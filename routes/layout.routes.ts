import { Router } from 'express';
import { authorizedRoles, isAuthenticated } from '../middleware/auth';
import { createLayout } from '../controllers/layout.controller';

const router = Router();

router.post('/', isAuthenticated, authorizedRoles('admin'), createLayout);

export default router;
