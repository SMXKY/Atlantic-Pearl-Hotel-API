import express from "express";

import { departmentControllers } from "../controllers/department.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const departmentRouter = express.Router();

/**
 * @swagger
 * /api/v1/departments:
 *   post:
 *     summary: Create a new department
 *     description: Creates a new department with the provided name, description, manager, and status.
 *     tags:
 *       - Departments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the department (must be unique).
 *                 example: "Human Resources"
 *               description:
 *                 type: string
 *                 description: Brief description of the department's purpose.
 *                 example: "Handles all HR-related tasks and processes."
 *               manager:
 *                 type: string
 *                 description: ID of the employee managing the department.
 *               isActive:
 *                 type: boolean
 *                 description: Whether the department is active or not.
 *                 example: true
 *     responses:
 *       200:
 *         description: Department created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     manager:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     id:
 *                       type: string
 *
 *   get:
 *     summary: Get all departments
 *     description: Retrieves a list of all departments.
 *     tags:
 *       - Departments
 *     responses:
 *       200:
 *         description: A list of departments.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       manager:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       id:
 *                         type: string
 *
 * /api/v1/departments/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: Department ID
 *
 *   get:
 *     summary: Get a department by ID
 *     description: Retrieves a single department record by its ID.
 *     tags:
 *       - Departments
 *     responses:
 *       200:
 *         description: Department found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     manager:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     id:
 *                       type: string
 *
 *   patch:
 *     summary: Update a department
 *     description: Updates one or more fields of an existing department.
 *     tags:
 *       - Departments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               manager:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Department updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Department updated successfully.
 *
 *   delete:
 *     summary: Delete a department
 *     description: Deletes a department by its ID.
 *     tags:
 *       - Departments
 *     responses:
 *       200:
 *         description: Department deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: resource deleted successfully
 */

departmentRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.departments.create),
    departmentControllers.createDepartment
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.departments.readAll),
    departmentControllers.readAllDepartments
  );

departmentRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.departments.readOne),
    departmentControllers.readOneDepartment
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.departments.update),
    departmentControllers.updateDepartment
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.departments.delete),
    departmentControllers.deleteDepartment
  );
