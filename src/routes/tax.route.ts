import express from "express";

import { taxControllers } from "../controllers/tax.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const taxRouter = express.Router();

/**
 * @swagger
 * /api/v1/taxes:
 *   get:
 *     summary: Get all taxes
 *     tags: [Taxes]
 *     description: >
 *       **IMPORTANT:** The VAT and Tourist taxes are pre-created in the system.
 *       These taxes **cannot be deleted**, only updated. They **must** be read and used by the frontend
 *       for calculating reservation totals to ensure correct billing.
 *     responses:
 *       200:
 *         description: List of taxes retrieved successfully
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
 *                     $ref: '#/components/schemas/Tax'
 *
 *   post:
 *     summary: Create a new tax
 *     tags: [Taxes]
 *     description: >
 *       **IMPORTANT:** VAT and Tourist taxes are predefined and cannot be created or deleted.
 *       You can create other tax entries here.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - taxType
 *             properties:
 *               name:
 *                 type: string
 *               percentage:
 *                 type: number
 *               amount:
 *                 type: number
 *               taxType:
 *                 type: string
 *                 enum: [percentage, amount]
 *               protected:
 *                 type: boolean
 *               code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tax created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tax'
 *
 * /api/v1/taxes/{id}:
 *   get:
 *     summary: Get a tax by ID
 *     tags: [Taxes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tax ID to retrieve
 *     responses:
 *       200:
 *         description: Tax retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tax'
 *       404:
 *         description: Tax not found
 *
 *   patch:
 *     summary: Update a tax by ID
 *     tags: [Taxes]
 *     description: >
 *       **IMPORTANT:** VAT and Tourist taxes are protected and cannot be deleted,
 *       but they can be updated as needed. Other taxes can be fully managed.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tax ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               percentage:
 *                 type: number
 *               amount:
 *                 type: number
 *               taxType:
 *                 type: string
 *                 enum: [percentage, amount]
 *               protected:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Tax updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tax'
 *       404:
 *         description: Tax not found
 *
 *   delete:
 *     summary: Delete a tax by ID
 *     tags: [Taxes]
 *     description: >
 *       **IMPORTANT:** VAT and Tourist taxes **cannot** be deleted.
 *       Other taxes may be deleted.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tax ID to delete
 *     responses:
 *       200:
 *         description: Tax deleted successfully
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
 *                   example: resource deleted successfully
 *       403:
 *         description: Forbidden. VAT and Tourist taxes cannot be deleted.
 *       404:
 *         description: Tax not found
 */

taxRouter
  .route("/")
  .post(
    // authControllers.protect,
    // authControllers.restrictTo(allPermissions.taxes.create),
    taxControllers.createTax
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.taxes.readAll),
    taxControllers.readAllTaxes
  );

taxRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.taxes.readOne),
    taxControllers.readOneTax
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.taxes.update),
    taxControllers.updateTax
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.taxes.delete),
    taxControllers.deleteTax
  );
