import { Router } from "express";
import { authorizedRoles, isAuthenticated } from "../middleware/auth";
import { getUserAnalytics } from "../controllers/analytics.controller";
const router = Router();

router.get('/users', isAuthenticated, authorizedRoles('admin'), getUserAnalytics);

export default router;