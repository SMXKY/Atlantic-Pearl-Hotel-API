import express from "express";
import { authControllers } from "../controllers/auth.controller";
import { allPermissions } from "../types/Permissions.type";

export const authRouter = express.Router();

/**
 * @swagger
 * /api/v1/auth/create-employee:
 *   post:
 *     summary: Create a new employee account
 *     description: Endpoint to create a new employee by submitting both user and employee details.
 *     tags: [Authentication, Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phoneNumber
 *               - dateOfBirth
 *               - gender
 *               - emergencyContact
 *               - role
 *               - nationality
 *               - residentialAddress
 *               - employmentType
 *               - dateHired
 *               - salaryInCFA
 *               - department
 *               - position
 *             properties:
 *               name:
 *                 type: string
 *                 example: Stella
 *                 description: Full name of the employee
 *               email:
 *                 type: string
 *                 example: tallamichael007@gmail.com
 *                 description: Unique email of the employee
 *               phoneNumber:
 *                 type: string
 *                 example: "+237654321987"
 *                 description: Employee's phone number
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: 1990-05-01
 *                 description: Birth date in YYYY-MM-DD format
 *               gender:
 *                 type: string
 *                 enum: [M, F]
 *                 example: F
 *                 description: Gender (M or F)
 *               emergencyContact:
 *                 type: string
 *                 example: "+237698765432"
 *                 description: Emergency contact number
 *               role:
 *                 type: string
 *                 example: 68148b4b83282a32379cc78d
 *                 description: ObjectId reference to role document
 *               nationality:
 *                 type: string
 *                 example: Cameroonian
 *                 description: Nationality of the employee
 *               residentialAddress:
 *                 type: string
 *                 example: 123 Main Street, Yaoundé
 *                 description: Full residential address
 *               employmentType:
 *                 type: string
 *                 enum: [Full time, Part time, Contract]
 *                 example: Full time
 *                 description: Type of employment contract
 *               dateHired:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-15
 *                 description: Employment start date
 *               salaryInCFA:
 *                 type: integer
 *                 example: 250000
 *                 description: Monthly salary in CFA
 *               department:
 *                 type: string
 *                 example: 68148bf883282a32379cc790
 *                 description: ObjectId reference to department
 *               position:
 *                 type: string
 *                 example: 68148c6c83282a32379cc793
 *                 description: ObjectId reference to job position
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
 *                       example: Employee account created successfully. Password provided to employee through their email.
 */

/**
 * @swagger
 * /api/v1/auth/sign-in:
 *   post:
 *     summary: Create a new guest account.
 *     description: Creates a new guest account by combining a user and guest profile. Requires both user and guest information in the request body. Sends a verification email upon successful account creation.
 *     tags:
 *       - Guests
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *                 description: The full name of the guest.
 *               email:
 *                 type: string
 *                 example: johndoe@example.com
 *                 description: A valid, unique email address for the guest.
 *               phoneNumber:
 *                 type: string
 *                 example: 678123456
 *                 description: The guest's phone number (8 to 12 characters).
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: P@ssw0rd123
 *                 description: The password for the guest's account (at least 8 characters).
 *               passwordConfirm:
 *                 type: string
 *                 example: P@ssw0rd123
 *                 description: Must match the password field.
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: 2005-06-15
 *                 description: The guest's date of birth (must be at least 16 years old).
 *               gender:
 *                 type: string
 *                 enum:
 *                   - M
 *                   - F
 *                 example: M
 *                 description: The guest's gender (M or F).
 *               emergencyContact:
 *                 type: string
 *                 example: 699123456
 *                 description: Emergency contact number (8 to 12 characters).
 *               userType:
 *                 type: string
 *                 enum:
 *                   - Guest
 *                 example: Guest
 *                 description: Must be 'Guest' for this endpoint.
 *               role:
 *                 type: string
 *                 example: 64c12345a1b23cde678f90ab
 *                 description: The ObjectId of the guest role.
 *               countryOfResidence:
 *                 type: string
 *                 example: Cameroon
 *                 description: The country where the guest resides.
 *               preferedCurrency:
 *                 type: string
 *                 example: XAF
 *                 description: The guest's preferred currency (must be a valid ISO 4217 code).
 *               preferedLanguage:
 *                 type: string
 *                 enum:
 *                   - English
 *                   - French
 *                 example: English
 *                 description: The guest's preferred language.
 *               isLoyaltyProgramMember:
 *                 type: boolean
 *                 example: false
 *                 description: Whether the guest is part of the loyalty program.
 *               guestTag:
 *                 type: string
 *                 example: VIP
 *                 description: An optional tag for the guest (e.g., VIP, Frequent Visitor).
 *               guestType:
 *                 type: string
 *                 enum:
 *                   - Individual
 *                   - Couple
 *                   - Family
 *                   - Group
 *                   - Corporate
 *                   - Walk-in
 *                   - VIP
 *                   - Loyalty Member
 *                   - Event Attendee
 *                   - Government/Military
 *                   - Long-stay
 *                   - OTA
 *                 example: Individual
 *                 description: The type of guest (e.g., Individual, VIP).
 *     responses:
 *       201:
 *         description: Guest created successfully. Verification email sent.
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
 *                       example: "Your account has been created! We've sent a verification link to your email. Please check your inbox to activate your account."
 *       400:
 *         description: Bad Request. Missing or invalid parameters.
 *       500:
 *         description: Internal Server Error. Database or server issue.
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login.
 *     description: Authenticates a user and returns a JWT token along with user details and permissions.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: johndoe@example.com
 *                 description: The email address of the user.
 *               password:
 *                 type: string
 *                 example: P@ssw0rd123
 *                 description: The user's password.
 *     responses:
 *       200:
 *         description: Successful login. Returns a JWT token and user details.
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
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MjljZjIxZGVjMjhhYTAxMzZmYTMwNCIsImlhdCI6MTc0NzU5Mjc0NCwiZXhwIjoxNzQ3Njc5MTQ0fQ.RFEXZEWy0dEMGa69of93XeesbmJIX9AQiezNovsZqxM
 *                       description: The JWT token for authentication.
 *                     data:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 6829cf22dec28aa0136fa307
 *                         user:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: 6829cf21dec28aa0136fa304
 *                             name:
 *                               type: string
 *                               example: Mike
 *                             email:
 *                               type: string
 *                               example: tallamichael007@gmail.com
 *                             phoneNumber:
 *                               type: string
 *                               example: +237654321987
 *                             dateOfBirth:
 *                               type: string
 *                               format: date
 *                               example: 1990-05-01T00:00:00.000Z
 *                             gender:
 *                               type: string
 *                               enum:
 *                                 - M
 *                                 - F
 *                               example: F
 *                             emergencyContact:
 *                               type: string
 *                               example: +237698765432
 *                             isActive:
 *                               type: boolean
 *                               example: true
 *                             role:
 *                               type: string
 *                               example: 68260bfdc02d3ed3890cd8b5
 *                             userType:
 *                               type: string
 *                               example: Employee
 *                             failedLoginAttempts:
 *                               type: number
 *                               example: 0
 *                             createdAt:
 *                               type: string
 *                               example: 2025-05-18T12:14:26.004Z
 *                             updatedAt:
 *                               type: string
 *                               example: 2025-05-18T18:25:44.774Z
 *                         nationality:
 *                           type: string
 *                           example: Cameroonian
 *                         residentialAddress:
 *                           type: string
 *                           example: 123 Main Street, Yaoundé
 *                         employmentType:
 *                           type: string
 *                           example: Full time
 *                         dateHired:
 *                           type: string
 *                           format: date
 *                           example: 2024-01-15T00:00:00.000Z
 *                         salaryInCFA:
 *                           type: number
 *                           example: 250000
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["can_read_user", "can_read_all_users", "can_delete_user"]
 *       400:
 *         description: Bad Request. Missing or invalid parameters.
 *       401:
 *         description: Unauthorized. Invalid email or password.
 *       500:
 *         description: Internal Server Error. Database or server issue.
 */

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request Password Reset
 *     description: Sends a password reset link to the provided email address.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *                 description: The email address associated with the user's account.
 *     responses:
 *       200:
 *         description: Password reset link successfully sent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset link sent to your email
 *       400:
 *         description: Invalid email address.
 *       404:
 *         description: Email not found.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /api/v1/auth/verify-password-reset-code:
 *   post:
 *     summary: Verify Password Reset Code
 *     description: Verifies the password reset code sent to the user's email.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *                 description: The email address associated with the user's account.
 *               code:
 *                 type: string
 *                 example: 123456
 *                 description: The password reset code sent to the user's email.
 *     responses:
 *       200:
 *         description: Password reset code successfully verified.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MjljZjIxZGVjMjhhYTAxMzZmYTMwNCIsImlhdCI6MTc0NzU5Mjc0NCwiZXhwIjoxNzQ3Njc5MTQ0fQ.RFEXZEWy0dEMGa69of93XeesbmJIX9AQiezNovsZqxM"
 *                   description: JWT token for authenticated user.
 *       400:
 *         description: Invalid or expired reset code.
 *       404:
 *         description: Email not found.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /api/v1/auth/reset-password/{token}:
 *   post:
 *     summary: Reset Password
 *     description: Resets the user's password using a valid reset token.
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token sent to the user's email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 example: NewPassword123!
 *                 description: The new password for the user.
 *               passwordConfirm:
 *                 type: string
 *                 format: password
 *                 example: NewPassword123!
 *                 description: Confirmation of the new password.
 *             required:
 *               - password
 *               - passwordConfirm
 *     responses:
 *       200:
 *         description: Password successfully reset.
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
 *                       example: Password successfully Reseted.
 *       400:
 *         description: Invalid or expired token, or password validation failed.
 *       404:
 *         description: Token not found or user not found.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /api/v1/auth/activation/{id}:
 *   patch:
 *     summary: Activate or deactivate a user account
 *     description: Updates the user's activation status and optional deactivation expiry date.
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deactivatedUntil:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-12-31T23:59:59.000Z
 *                 description: Date until which the user account is deactivated (optional).
 *               isActive:
 *                 type: boolean
 *                 example: true
 *                 description: Whether the user account is active or not.
 *             required:
 *               - isActive
 *     responses:
 *       200:
 *         description: User account updated successfully.
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
 *                       example: User account updated successfully.
 *       400:
 *         description: Invalid input data.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Initiate Google OAuth Login/Signup
 *     description: |
 *       Redirects the user to Google's OAuth 2.0 consent screen.
 *
 *       #### Frontend Instructions:
 *       - Redirect the user using `window.location.href = '/api/v1/auth/google'`
 *       - After authentication, Google redirects back to the frontend with a secure HTTP-only cookie
 *       - Use `/api/v1/auth/google/user` to finalize login and retrieve user info
 *     tags:
 *       - Authentication
 *       - Google OAuth
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent screen
 */

/**
 * @swagger
 * /api/v1/auth/google/user:
 *   get:
 *     summary: Retrieve User Info after Google OAuth
 *     description: |
 *       Use this endpoint after redirection from Google to fetch the authenticated user's data and token.
 *
 *       #### Backend Behavior:
 *       - Checks the `session_token` HTTP-only cookie
 *       - Responds with user details and API token if valid
 *     tags:
 *       - Authentication
 *       - Google OAuth
 *     responses:
 *       200:
 *         description: Successfully retrieved user info
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
 *                     token:
 *                       type: string
 *                       description: JWT for subsequent API access
 *                       example: eyJhbGciOi...
 *                     _id:
 *                       type: string
 *                       example: 6829cf22dec28aa0136fa307
 *                     name:
 *                       type: string
 *                       example: Barney Stinson
 *                     email:
 *                       type: string
 *                       example: barney@gmail.com
 *                     phoneNumber:
 *                       type: string
 *                       example: +237677744567
 *                     gender:
 *                       type: string
 *                       example: M
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     role:
 *                       type: string
 *                       example: guest
 *                     userType:
 *                       type: string
 *                       example: Guest
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *       401:
 *         description: Session cookie missing or invalid
 */

/**
 * @swagger
 * /api/v1/auth/logout:
 *   get:
 *     summary: Logout the User
 *     description: |
 *       Clears the session cookie and logs out the authenticated user.
 *
 *       #### Frontend Instructions:
 *       - Send a GET request to this endpoint when user clicks "Logout"
 *       - Clear local/session storage on frontend
 *       - Redirect to login page
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: User logged out successfully
 */
//TODO: In production ensure create employee is protected, and restricted
authRouter
  .route("/create-employee")
  .post(authControllers.createEmployeeAccount);

authRouter.route("/sign-in").post(authControllers.signIn);
authRouter.route("/login").post(authControllers.login);
authRouter.route("/google-redirect").get(authControllers.googleRedirect);
authRouter.route("/google").get(authControllers.authWithGoogle);
authRouter.route("/google/user").get(authControllers.verifyGoogleAuthCookie);
authRouter.route("/forgot-password").post(authControllers.forgotPassword);
authRouter.route("/logout").get(authControllers.logOut);
authRouter
  .route("/verify-password-reset-code")
  .post(authControllers.verifyPasswordResetCode);
authRouter.route("/reset-password/:token").post(authControllers.resetPassword);
authRouter
  .route("/activation/:id")
  .patch(
    authControllers.protect,
    authControllers.restrictTo(
      allPermissions.auth.activateAccount,
      allPermissions.auth.deActivateAccount
    ),
    authControllers.activateAndDeactivateUserAccounts
  );
