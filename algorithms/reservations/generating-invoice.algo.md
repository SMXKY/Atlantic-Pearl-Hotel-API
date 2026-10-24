# Invoice Generation

## 🧾 Invoice Generation Logic (Step-by-Step)

### 1. **Fetch the Reservation**

- Retrieve the reservation by ID from the database.
- Ensure all `items` are available in the reservation.

### 2. **Populate Related Fields**

- Populate the following related models in each reservation item:

  - `rate` (from `rates` collection)
  - `roomType` (from `roomtypes` collection)

### 3. **Initialize Invoice Line Items**

- Start with an empty array for invoice line items.

### 4. **Loop Through Each Reservation Item**

For each item in the reservation:

#### 4.1. **Validate Required Fields**

- Ensure `checkIn`, `checkOut`, `rate`, and `roomType` are not null.

#### 4.2. **Calculate Number of Nights**

- Compute the number of nights:
  `nights = (checkOut - checkIn) in days`
- Ensure at least `1 night` is counted even if dates are the same.

#### 4.3. **Determine Unit Price**

- Get `unitPrice` from `rate.totalPriceInCFA`.

#### 4.4. **Determine Quantity**

- Use the item's `quantity` (default to 1 if not provided).

#### 4.5. **Calculate Subtotal**

- `subTotal = unitPrice × quantity × nights`

#### 4.6. **Append to Line Items**

- Add an entry to the invoice's `lineItems`:

  - `roomType`
  - `mealPlan`
  - `unitPrice`
  - `quantity`
  - `nights`
  - `subTotal`

---

### 5. **Calculate Totals**

#### 5.1. **Net Amount**

- Sum of all `subTotal` values from line items.

#### 5.2. **Apply Discount (if any)**

- Check if a discount applies (e.g. from a promo or loyalty program).
- `discountAmount = % of netAmount` or flat value.
- `netAfterDiscount = netAmount - discountAmount`

#### 5.3. **Calculate Tax**

- Apply a tax rate (e.g. 19.25% VAT) if required.
- `taxAmount = netAfterDiscount × taxRate`

#### 5.4. **Calculate Grand Total**

- `grandTotal = netAfterDiscount + taxAmount`

#### 5.5. **Calculate Amount Due**

- `amountDue = grandTotal - amountPaid`
  (usually 0 initially if no payment yet)

---

### 6. **Set Payment Status**

- Based on `amountPaid`:

  - `0` → **unpaid**
  - `>0 but < grandTotal` → **partial**
  - `>= grandTotal` → **paid**

---

### 7. **Issue Date**

- Set the `issuedAt` field to the current date/time.

---

### 8. **Save the Invoice**

- Save the final invoice document to the database.
