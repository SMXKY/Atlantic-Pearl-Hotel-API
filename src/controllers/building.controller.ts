import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../util/catchAsync";
import { CRUD } from "../util/Crud.util";
import { BuildingModel } from "../models/Building.model";

const CRUDBuilding: CRUD = new CRUD(BuildingModel);

/**
 * @swagger
 * tags:
 *   name: Buildings
 *   description: API endpoints for managing buildings.
 */

/**
 * @swagger
 * /api/v1/buildings:
 *   post:
 *     summary: Create a new building
 *     description: |
 *       Creates a new building resource with a name, number of floors, unique code, and an optional description.
 *       The request body must contain building details.
 *     tags: [Buildings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - numberOfFloors
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *                 example: Building A
 *                 description: Name of the building.
 *               numberOfFloors:
 *                 type: integer
 *                 example: 10
 *                 description: Total number of floors in the building.
 *               code:
 *                 type: string
 *                 example: A101
 *                 description: Unique code identifier for the building.
 *               description:
 *                 type: string
 *                 example: This is a 10-floor building located in the city center.
 *                 description: Optional description of the building.
 *     responses:
 *       200:
 *         description: Building created successfully
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
 *                     name:
 *                       type: string
 *                       example: Building A
 *                     numberOfFloors:
 *                       type: integer
 *                       example: 10
 *                     code:
 *                       type: string
 *                       example: A101
 *                     description:
 *                       type: string
 *                       example: This is a 10-floor building located in the city center.
 *                     _id:
 *                       type: string
 *                       example: 68583d1aaea0291799ea15bc
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-22T17:27:54.148Z
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-22T17:27:54.148Z
 *                     __v:
 *                       type: integer
 *                       example: 0
 *                     id:
 *                       type: string
 *                       example: 68583d1aaea0291799ea15bc
 */

/**
 * @swagger
 * /api/v1/buildings:
 *   get:
 *     summary: Retrieve a list of all buildings
 *     description: |
 *       Returns an array of all building resources with full details.
 *     tags: [Buildings]
 *     responses:
 *       200:
 *         description: List of buildings retrieved successfully
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: Building A
 *                       numberOfFloors:
 *                         type: integer
 *                         example: 10
 *                       code:
 *                         type: string
 *                         example: A101
 *                       description:
 *                         type: string
 *                         example: This is a 10-floor building located in the city center.
 *                       _id:
 *                         type: string
 *                         example: 68583d1aaea0291799ea15bc
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-06-22T17:27:54.148Z
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-06-22T17:27:54.148Z
 *                       __v:
 *                         type: integer
 *                         example: 0
 *                       id:
 *                         type: string
 *                         example: 68583d1aaea0291799ea15bc
 */

/**
 * @swagger
 * /api/v1/buildings/{id}:
 *   get:
 *     summary: Retrieve a single building by ID
 *     description: |
 *       Returns the details of a specific building identified by its ID.
 *     tags: [Buildings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the building to retrieve
 *         schema:
 *           type: string
 *           example: 68583d1aaea0291799ea15bc
 *     responses:
 *       200:
 *         description: Building retrieved successfully
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
 *                     name:
 *                       type: string
 *                       example: Building A
 *                     numberOfFloors:
 *                       type: integer
 *                       example: 10
 *                     code:
 *                       type: string
 *                       example: A101
 *                     description:
 *                       type: string
 *                       example: This is a 10-floor building located in the city center.
 *                     _id:
 *                       type: string
 *                       example: 68583d1aaea0291799ea15bc
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-22T17:27:54.148Z
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-22T17:27:54.148Z
 *                     __v:
 *                       type: integer
 *                       example: 0
 *                     id:
 *                       type: string
 *                       example: 68583d1aaea0291799ea15bc
 */

/**
 * @swagger
 * /api/v1/buildings/{id}:
 *   patch:
 *     summary: Update a building by ID
 *     description: |
 *       Updates one or more properties of a building resource by its ID.
 *       Pass only the fields you want to update in the request body.
 *     tags: [Buildings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the building to update
 *         schema:
 *           type: string
 *           example: 68583d1aaea0291799ea15bc
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Building B
 *                 description: Updated name of the building
 *               numberOfFloors:
 *                 type: integer
 *                 example: 12
 *                 description: Updated number of floors
 *               code:
 *                 type: string
 *                 example: B102
 *                 description: Updated building code
 *               description:
 *                 type: string
 *                 example: Updated description for the building
 *                 description: Updated description
 *     responses:
 *       200:
 *         description: Building updated successfully
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
 *                     name:
 *                       type: string
 *                       example: Building B
 *                     numberOfFloors:
 *                       type: integer
 *                       example: 12
 *                     code:
 *                       type: string
 *                       example: B102
 *                     description:
 *                       type: string
 *                       example: Updated description for the building
 *                     _id:
 *                       type: string
 *                       example: 68583d1aaea0291799ea15bc
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-22T17:27:54.148Z
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-23T10:15:12.000Z
 *                     __v:
 *                       type: integer
 *                       example: 0
 *                     id:
 *                       type: string
 *                       example: 68583d1aaea0291799ea15bc
 */

/**
 * @swagger
 * /api/v1/buildings/{id}:
 *   delete:
 *     summary: Delete a building by ID
 *     description: Deletes the building resource identified by the given ID.
 *     tags: [Buildings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the building to delete
 *         schema:
 *           type: string
 *           example: 68583d1aaea0291799ea15bc
 *     responses:
 *       200:
 *         description: Building deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: resource successfully deleted
 */

const createBuilding = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBuilding.create(req.body, res, req);
  }
);

const readOneBuilding = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBuilding.readOne(req.params.id, res, [], req);
  }
);

const readAllBuildings = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBuilding.readAll(res, req, 1, 100, []);
  }
);

const updateBuilding = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBuilding.update(req.params.id, res, req);
  }
);

const deleteBuilding = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await CRUDBuilding.delete(req.params.id, res, req);
  }
);

export const buildingControllers = {
  createBuilding,
  readOneBuilding,
  readAllBuildings,
  updateBuilding,
  deleteBuilding,
};
