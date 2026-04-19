import express from "express";

import { userControllers } from "../../controllers/HR/user.controller";
import { authControllers } from "../../controllers/Auth/auth.controller";
import { allPermissions } from "../../types/Permissions.type";
import multer from "multer";
import { handleFilesMiddleware } from "../../middlewares/handleFiles.middleware";

export const userRouter = express.Router();
const upload = multer({ dest: "../upload" });

userRouter
  .route("/")
  .post(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.create),
    userControllers.createUser
  )
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.readAll),
    userControllers.readAllUsers
  );

userRouter
  .route("/search")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.readAll),
    userControllers.searchUsers
  );

userRouter
  .route("/update-password")
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.updatePassword),
    userControllers.updatePassword
  );

userRouter
  .route("/update-role/:id")
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.updatePassword),
    userControllers.updateUserRole
  );

userRouter
  .route("/profile-picture/:id")
  .patch(
    authControllers.protect,
    upload.array("img", 1),
    handleFilesMiddleware,
    userControllers.modifyProfilePicture
  );

userRouter
  .route("/me")
  .get(authControllers.protect, userControllers.readMe)
  .patch(authControllers.protect, userControllers.updateMe);

userRouter
  .route("/:id")
  .get(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.readOne),
    userControllers.readOneUser
  )
  .patch(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.update),
    userControllers.updateUser
  )
  .delete(
    authControllers.protect,
    authControllers.restrictTo(allPermissions.users.delete),
    userControllers.deleteUser
  );

/**
 * @swagger
 * /api/users/update-password:
 *   post:
 *     summary: Update a user's password
 *     description: Allows a user to update their password by providing the current password, new password, and password confirmation.
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: The current password of the user.
 *                 example: "oldpassword123"
 *               newPassword:
 *                 type: string
 *                 description: The new password to be set.
 *                 example: "newpassword456"
 *               passwordConfirm:
 *                 type: string
 *                 description: Confirmation of the new password.
 *                 example: "newpassword456"
 *     responses:
 *       200:
 *         description: Password successfully updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Password successfully updated."
 *       400:
 *         description: Invalid input or passwords do not match.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "fail"
 *                 error:
 *                   type: string
 *                   example: "Passwords do not match."
 *       401:
 *         description: Unauthorized, invalid current password.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "fail"
 *                 error:
 *                   type: string
 *                   example: "Invalid current password."
 */
