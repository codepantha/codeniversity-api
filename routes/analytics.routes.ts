import { Router } from "express";
import { authorizedRoles, isAuthenticated } from "../middleware/auth";
import { getCourseAnalytics, getOrderAnalytics, getUserAnalytics } from "../controllers/analytics.controller";
const router = Router();

router.get('/users', isAuthenticated, authorizedRoles('admin'), getUserAnalytics);
router.get('/orders', isAuthenticated, authorizedRoles('admin'), getOrderAnalytics);
router.get('/courses', isAuthenticated, authorizedRoles('admin'), getCourseAnalytics);

export default router;