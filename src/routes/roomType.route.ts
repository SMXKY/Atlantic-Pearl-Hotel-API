import express from "express";

import { roomTypeControllers } from "../controllers/roomType.controller";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";
import multer from "multer";
import { handleFilesMiddleware } from "../middlewares/handleFiles.middleware";

export const roomTypeRouter = express.Router();
const upload = multer({ dest: "../upload" });

/**
 * @swagger
 * tags:
 *   - name: RoomTypes
 *     description: API endpoints for managing room types
 *
 * /api/v1/room-types:
 *   get:
 *     summary: Get all room types
 *     description: >
 *       Retrieve a list of all room types. This endpoint returns an array of room types,
 *       each containing details such as name, description, pricing, and guest limits.
 *     tags: [RoomTypes]
 *     responses:
 *       200:
 *         description: A list of room types retrieved successfully
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
 *                     $ref: '#/components/schemas/RoomType'
 *
 *   post:
 *     summary: Create a new room type
 *     description: >
 *       **IMPORTANT:** This endpoint requires the data to be submitted as **multipart/form-data**.
 *       The frontend must send all fields as form-data and include multiple images using the `images` key,
 *       which should be an array of image files.
 *     tags: [RoomTypes]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - minimumPriceInCFA
 *               - maxNumberOfGuest
 *               - maxNumberOfAdultGuests
 *               - images
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Deluxe Suite"
 *               description:
 *                 type: string
 *                 example: "Spacious suite with ocean view and luxury amenities."
 *               minimumPriceInCFA:
 *                 type: number
 *                 example: 50000
 *               maxNumberOfGuest:
 *                 type: number
 *                 example: 4
 *               maxNumberOfAdultGuests:
 *                 type: number
 *                 example: 2
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Array of image files for the room type.
 *     responses:
 *       201:
 *         description: Room type created successfully
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
 *                   $ref: '#/components/schemas/RoomType'
 *
 * /api/v1/room-types/{id}:
 *   get:
 *     summary: Get a single room type by ID
 *     tags: [RoomTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the room type to retrieve.
 *     responses:
 *       200:
 *         description: Room type retrieved successfully
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
 *                   $ref: '#/components/schemas/RoomTypeExtended'
 *       404:
 *         description: Room type not found
 *
 *   patch:
 *     summary: Update a room type by ID
 *     tags: [RoomTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the room type to update.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               minimumPriceInCFA:
 *                 type: number
 *               maxNumberOfGuest:
 *                 type: number
 *               maxNumberOfAdultGuests:
 *                 type: number
 *     responses:
 *       200:
 *         description: Room type updated successfully
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
 *                   $ref: '#/components/schemas/RoomType'
 *       404:
 *         description: Room type not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Room type not found
 *
 *   delete:
 *     summary: Delete a room type by ID
 *     tags: [RoomTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the room type to delete.
 *     responses:
 *       200:
 *         description: Room type deleted successfully
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
 *                   example: Resource successfully deleted
 *       404:
 *         description: Room type not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Room type not found
 *
 * components:
 *   schemas:
 *     Amenity:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         id:
 *           type: string
 *
 *     RoomTypeAmenity:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         roomType:
 *           type: string
 *         amenity:
 *           $ref: '#/components/schemas/Amenity'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         id:
 *           type: string
 *
 *     RoomTypeImage:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         url:
 *           type: string
 *         mediaType:
 *           type: string
 *         roomType:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         id:
 *           type: string
 *
 *     Room:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         number:
 *           type: string
 *         floorNumber:
 *           type: integer
 *         status:
 *           type: string
 *         state:
 *           type: string
 *         viewType:
 *           type: string
 *         isSmokingAllowed:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         description:
 *           type: string
 *         accessType:
 *           type: string
 *         building:
 *           type: string
 *         type:
 *           type: string
 *         imageUrl:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         size:
 *           type: string
 *         id:
 *           type: string
 *         lock:
 *           type: object
 *           properties:
 *             until:
 *               type: string
 *               nullable: true
 *
 *     RoomTypePolicy:
 *       type: object
 *       properties:
 *         policies:
 *           type: object
 *           properties:
 *             smokingAllowed:
 *               type: boolean
 *             petsAllowed:
 *               type: boolean
 *             partyingAllowed:
 *               type: boolean
 *             checkInTime:
 *               type: string
 *             checkOutTime:
 *               type: string
 *             description:
 *               type: string
 *
 *     ReviewFinalRating:
 *       type: object
 *       properties:
 *         rating:
 *           type: number
 *         remark:
 *           type: string
 *
 *     RoomTypeReview:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         roomType:
 *           type: string
 *         cleanliness:
 *           type: number
 *         amenities:
 *           type: number
 *         comfort:
 *           type: number
 *         location:
 *           type: number
 *         wifiConnection:
 *           type: number
 *         review:
 *           type: string
 *         reviewTitle:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         finalRating:
 *           $ref: '#/components/schemas/ReviewFinalRating'
 *         id:
 *           type: string
 *
 *     RoomTypeReviews:
 *       type: object
 *       properties:
 *         allReviews:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RoomTypeReview'
 *         averageRatings:
 *           type: object
 *           properties:
 *             cleanliness:
 *               type: number
 *             amenities:
 *               type: number
 *             location:
 *               type: number
 *             comfort:
 *               type: number
 *             wifiConnection:
 *               type: number
 *
 *     RoomTypeExtended:
 *       allOf:
 *         - $ref: '#/components/schemas/RoomType'
 *         - type: object
 *           properties:
 *             amenities:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RoomTypeAmenity'
 *             images:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RoomTypeImage'
 *             rooms:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 *             policies:
 *               $ref: '#/components/schemas/RoomTypePolicy'
 *             reviews:
 *               $ref: '#/components/schemas/RoomTypeReviews'
 *
 *     RoomType:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "64f4a9b7e6b0f8f9d8a9b7e6"
 *         name:
 *           type: string
 *           example: "Deluxe Suite"
 *         description:
 *           type: string
 *           example: "Spacious suite with ocean view and luxury amenities."
 *         minimumPriceInCFA:
 *           type: number
 *           example: 50000
 *         maxNumberOfGuest:
 *           type: number
 *           example: 4
 *         maxNumberOfAdultGuests:
 *           type: number
 *           example: 2
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-10T09:39:12.732Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-15T13:49:11.400Z"
 *         __v:
 *           type: number
 *           example: 0
 *         id:
 *           type: string
 *           example: "64f4a9b7e6b0f8f9d8a9b7e6"
 */

roomTypeRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypes.create),
    upload.array("images"),
    handleFilesMiddleware,
    roomTypeControllers.createRoomType
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypes.readAll),
    roomTypeControllers.readAllRoomTypes
  );

roomTypeRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypes.readOne),
    roomTypeControllers.readOneRoomType
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypes.update),
    roomTypeControllers.updateRoomType
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.roomTypes.delete),
    roomTypeControllers.deleteRoomType
  );
