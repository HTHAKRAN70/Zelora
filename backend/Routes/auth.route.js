import express from 'express';
import { registerUsrer,loginUser } from '../Controllers/auth.controller.js';
const router=express.Router();
router.post('/register',registerUsrer);
router.post('/login',loginUser);
export default router;