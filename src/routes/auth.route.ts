import express from "express";
import { authControllers } from "../controllers/auth.controller";

export const authRouter = express.Router();

/**
 * @swagger
 * /Create Employee account:
 *   post:
 *     summary: Create a new employee account
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Stella
 *               lastName:
 *                 type: string
 *                 example: Jum
 *               email:
 *                 type: string
 *                 example: tallamichael007@gmail.com
 *               phoneNumber:
 *                 type: string
 *                 example: "+237654321987"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: 1990-05-01
 *               gender:
 *                 type: string
 *                 enum: [M, F]
 *                 example: F
 *               emergencyContact:
 *                 type: string
 *                 example: "+237698765432"
 *               role:
 *                 type: string
 *                 example: 68148b4b83282a32379cc78d
 *               nationality:
 *                 type: string
 *                 example: Cameroonian
 *               residentialAddress:
 *                 type: string
 *                 example: 123 Main Street, Yaoundé
 *               employmentType:
 *                 type: string
 *                 enum: [Full time, Part time, Contract]
 *                 example: Full time
 *               dateHired:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-15
 *               salaryInCFA:
 *                 type: integer
 *                 example: 250000
 *               department:
 *                 type: string
 *                 example: 68148bf883282a32379cc790
 *               position:
 *                 type: string
 *                 example: 68148c6c83282a32379cc793
 *     responses:
 *       200:
 *         description: Employee account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     ok:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Employee account created successfully
 */

authRouter
  .route("/create-employee")
  .post(authControllers.createEmployeeAccount);

authRouter.route("/sign-in").post(authControllers.signIn);
authRouter.route("/login").post(authControllers.login);
authRouter.route("/google-redirect").get(authControllers.googleRedirect);
