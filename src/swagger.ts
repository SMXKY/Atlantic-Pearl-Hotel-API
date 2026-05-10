/**
 * @swagger
 * /api/v1/reservations:
 *   post:
 *     summary: Create a reservation and generate an invoice
 *     tags:
 *       - Reservations
 *     description: >
 *       Creates a new reservation for a guest and generates a corresponding invoice.
 *       Sends the invoice to the guest's email. This operation supports specifying rooms,
 *       rates, check-in/out dates, and special requests. All data is validated and processed within a transaction.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - checkInDate
 *               - checkOutDate
 *               - items
 *               - numberOfGuest
 *             properties:
 *               guestName:
 *                 type: string
 *                 example: John Doe
 *               guestEmail:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               guestPhoneNumber:
 *                 type: string
 *                 example: "+237650000000"
 *               countryOfResidence:
 *                 type: string
 *                 example: Cameroon
 *               specialRequest:
 *                 type: string
 *                 example: Need early check-in if possible.
 *               checkInDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-06-15T14:00:00Z
 *               checkOutDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-06-20T11:00:00Z
 *               numberOfGuest:
 *                 type: integer
 *                 example: 4
 *               bookingSource:
 *                 type: string
 *                 example: online
 *               paymentMethod:
 *                 type: string
 *                 example: Mobile Money
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - roomType
 *                     - rate
 *                     - rooms
 *                   properties:
 *                     roomType:
 *                       type: string
 *                       example: 6847fb6971971ba932d254c3
 *                     rate:
 *                       type: string
 *                       example: 6848036a194173b47027815c
 *                     rooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required:
 *                           - room
 *                           - checkIn
 *                           - checkOut
 *                         properties:
 *                           room:
 *                             type: string
 *                             example: 6847fd406656e912d7a76b91
 *                           checkIn:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-06-15T14:00:00Z
 *                           checkOut:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-06-20T11:00:00Z
 *     responses:
 *       200:
 *         description: Reservation and invoice created successfully. Email sent to guest.
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
 *                     message:
 *                       type: string
 *                       example: Reservation and Invoice created. Email sent.
 *                     reservation:
 *                       $ref: '#/components/schemas/Reservation'
 *                     invoice:
 *                       $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: Bad Request – Validation error or invalid input
 *       500:
 *         description: Internal Server Error – Unable to create reservation or send invoice
 */

/**
 * @swagger
 * /api/v1/reservations:
 *   get:
 *     summary: Get list of all reservations
 *     description: |
 *       Retrieve an array of reservation objects including guest details, booking info, rooms, rates, and dates.
 *     tags: [Reservations]
 *     responses:
 *       200:
 *         description: List of reservations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   guestName:
 *                     type: string
 *                     example: John Doe
 *                   guestEmail:
 *                     type: string
 *                     example: john.doe@example.com
 *                   guestPhoneNumber:
 *                     type: string
 *                     example: "+237650000000"
 *                   countryOfResidence:
 *                     type: string
 *                     example: Cameroon
 *                   specialRequest:
 *                     type: string
 *                     example: Need early check-in if possible.
 *                   checkInDate:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-06-15T14:00:00Z
 *                   checkOutDate:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-06-20T11:00:00Z
 *                   numberOfGuest:
 *                     type: integer
 *                     example: 4
 *                   bookingSource:
 *                     type: string
 *                     example: online
 *                   paymentMethod:
 *                     type: string
 *                     example: Mobile Money
 *                   items:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         roomType:
 *                           type: string
 *                           example: 6847fb6971971ba932d254c3
 *                         rate:
 *                           type: string
 *                           example: 6848036a194173b47027815c
 *                         rooms:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               room:
 *                                 type: string
 *                                 example: 6847fd406656e912d7a76b91
 *                               checkIn:
 *                                 type: string
 *                                 format: date-time
 *                                 example: 2025-06-15T14:00:00Z
 *                               checkOut:
 *                                 type: string
 *                                 format: date-time
 *                                 example: 2025-06-20T11:00:00Z
 *
 * /api/v1/reservations/{id}:
 *   get:
 *     summary: Get a single reservation by ID
 *     description: Retrieve details of a specific reservation including guest info and booked rooms.
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Reservation ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation found and returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 guestName:
 *                   type: string
 *                   example: John Doe
 *                 guestEmail:
 *                   type: string
 *                   example: john.doe@example.com
 *                 guestPhoneNumber:
 *                   type: string
 *                   example: "+237650000000"
 *                 countryOfResidence:
 *                   type: string
 *                   example: Cameroon
 *                 specialRequest:
 *                   type: string
 *                   example: Need early check-in if possible.
 *                 checkInDate:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-06-15T14:00:00Z
 *                 checkOutDate:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-06-20T11:00:00Z
 *                 numberOfGuest:
 *                   type: integer
 *                   example: 4
 *                 bookingSource:
 *                   type: string
 *                   example: online
 *                 paymentMethod:
 *                   type: string
 *                   example: Mobile Money
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       roomType:
 *                         type: string
 *                         example: 6847fb6971971ba932d254c3
 *                       rate:
 *                         type: string
 *                         example: 6848036a194173b47027815c
 *                       rooms:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             room:
 *                               type: string
 *                               example: 6847fd406656e912d7a76b91
 *                             checkIn:
 *                               type: string
 *                               format: date-time
 *                               example: 2025-06-15T14:00:00Z
 *                             checkOut:
 *                               type: string
 *                               format: date-time
 *                               example: 2025-06-20T11:00:00Z
 *       404:
 *         description: Reservation not found
 *
 *   patch:
 *     summary: Update a reservation by ID
 *     description: Update one or more fields of a reservation. Provide only the fields to update in the request body.
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Reservation ID to update
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Fields to update for the reservation
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guestName:
 *                 type: string
 *                 example: John Doe Updated
 *               specialRequest:
 *                 type: string
 *                 example: Need late checkout
 *               numberOfGuest:
 *                 type: integer
 *                 example: 3
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     roomType:
 *                       type: string
 *                       example: 6847fb6971971ba932d254c3
 *                     rate:
 *                       type: string
 *                       example: 6848036a194173b47027815c
 *                     rooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           room:
 *                             type: string
 *                             example: 6847fd406656e912d7a76b91
 *                           checkIn:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-06-15T14:00:00Z
 *                           checkOut:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-06-20T11:00:00Z
 *     responses:
 *       200:
 *         description: Reservation updated successfully
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
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Invalid update data
 *       404:
 *         description: Reservation not found
 *
 *   delete:
 *     summary: Delete a reservation by ID
 *     description: Deletes the specified reservation.
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Reservation ID to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation successfully deleted
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
 *       404:
 *         description: Reservation not found
 */

/**
 * @swagger
 * /reservations/api/v1/reservations/calendar:
 *   get:
 *     tags:
 *       - Reservations
 *     summary: Get calendar reservations
 *     description: Retrieve all reservations formatted for calendar display.
 *     operationId: getCalendarReservations
 *     responses:
 *       200:
 *         description: Successfully fetched calendar reservations
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
 *                       _id:
 *                         type: string
 *                         example: 686247e2007187ee441b4064
 *                       status:
 *                         type: string
 *                         example: confirmed
 *                       guestName:
 *                         type: string
 *                         example: John Doe
 *                       guestEmail:
 *                         type: string
 *                         format: email
 *                         example: johafdadfn.doe@example.com
 *                       guestPhoneNumber:
 *                         type: string
 *                         example: "+237670000000"
 *                       countryOfResidence:
 *                         type: string
 *                         example: Cameroon
 *                       specialRequest:
 *                         type: string
 *                         example: Need early check-in if possible.
 *                       checkInDate:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-07-15T14:00:00.000Z
 *                       checkOutDate:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-07-20T11:00:00.000Z
 *                       numberOfGuest:
 *                         type: integer
 *                         example: 4
 *                       bookingSource:
 *                         type: string
 *                         example: online
 *                       paymentMethod:
 *                         type: string
 *                         example: Mobile Money
 *                       depositInCFA:
 *                         type: integer
 *                         example: 370000
 *                       bookingReference:
 *                         type: string
 *                         example: RES-07B266FA
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-06-30T08:16:34.609Z
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-06-30T10:54:54.972Z
 *                       numberOfNights:
 *                         type: integer
 *                         example: 5
 *                       totalNightsFromItems:
 *                         type: integer
 *                         example: 5
 *                       id:
 *                         type: string
 *                         example: 686247e2007187ee441b4064
 *                       roomName:
 *                         type: string
 *                         example: A101
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-06-15T14:00:00.000Z
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-06-20T11:00:00.000Z
 *                       meal:
 *                         type: string
 *                         example: None
 *                       rate:
 *                         type: number
 *                         example: 200000
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/reservations/search:
 *   get:
 *     summary: Search reservations
 *     description: Search for reservations by booking reference, guest name, or email. Optimized for typeahead/autocomplete.
 *     tags:
 *       - Reservations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           minimum: 2
 *           maximum: 100
 *         required: true
 *         description: Search query string (booking reference, guest name, or email)
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [active, all]
 *         default: all
 *         description: Filter results by reservation status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         default: 10
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: Successful search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "507f1f77bcf86cd799439011"
 *                       bookingReference:
 *                         type: string
 *                         example: "RES-2024-0001"
 *                       status:
 *                         type: string
 *                         enum: [checked in, checked out, confirmed, cancelled]
 *                         example: "checked in"
 *                       checkInDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-04-15T14:00:00Z"
 *                       checkOutDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-04-18T12:00:00Z"
 *                       guest:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439012"
 *                           user:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: "507f1f77bcf86cd799439013"
 *                               name:
 *                                 type: string
 *                                 example: "John Doe"
 *                               email:
 *                                 type: string
 *                                 format: email
 *                                 example: "john.doe@example.com"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "ValidationError"
 *                 message:
 *                   type: string
 *                   example: "Search query must be at least 2 characters"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "UnauthorizedError"
 *                 message:
 *                   type: string
 *                   example: "Authentication required"
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "RateLimitError"
 *                 message:
 *                   type: string
 *                   example: "Too many requests. Please try again later."
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Reservation management endpoints
 */
