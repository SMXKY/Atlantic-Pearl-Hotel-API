# Account creation

There a two ways in which account can be created in the system those are employee accounts and guest accounts.

## Creating Employee Accounts

- extract user model information from the request body
- verify password and confirm
- generate employee password a random 8 characters of numbers
- hash the user's password before saving
- extract employee information from the request body
- get user Id for user document I just created
- use the user Id, to gether with the extracted employee information to create the employee document
- send a success response
- email eimployee the password
