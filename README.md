Digital Asset Tracking System

This project is a digital asset tracking system built using Node.js and Express,
featuring secure user authentication using JWT, file upload and download,
asset management, and protected API routes.

=> Features
1 User registration and login with password hashing and JWT authentication.
2 File upload and download tracking.
3 Protected routes accessible only with valid tokens.
4 Secure file deletion with audit logging.
5 Email notifications for file deletion.
6 Grace period for file deletion, with the ability to recover files before permanent deletion.

=> Technologies Used
1 Node.js
2 Express
3 JWT (JSON Web Tokens) for authentication.
4 Multer for file uploads.
5 bcrypt for password hashing.
6 dotenv for environment variables.
7 Nodemailer for email notifications.

=>Prerequisites
Ensure you have Node.js and npm installed on your machine.

=>Getting Started
1.Clone the repository:
bash:
git clone https://github.com/refa8/digital-assets-tracker.git
cd digital-assets-tracker


2.Install the required dependencies:
bash:
npm install

3.Set up environment variables:
Create a .env file in the root of your project and add the following variables:
bash:
JWT_SECRET=your_jwt_secret_key
EMAIL_SERVICE=your_email_service
EMAIL_USER=your_email_address
EMAIL_PASS=your_email_password

4.Run the application:
bash:
npm start
The app will be running at http://localhost:3001.


=>Usage
1.Register a new user:
Send a POST request to /register with a username and password.
Example:
bash:
POST /register
Body: {
  "username": "exampleUser",
  "password": "yourPassword"
}


2.Login:
Send a POST request to /login with your credentials to receive a JWT token.
Example:
bash:
POST /login
Body: {
  "username": "exampleUser",
  "password": "yourPassword"
}


3.Access Protected Routes:
Include the JWT token in the Authorization header as Bearer <token> to access protected routes, such as uploading and managing files.
File Upload:

Send a POST request to /upload (authenticated route) with the file you want to upload.

4.File Download:

Send a GET request to /download/:fileHash (authenticated route) to download a file based on its hash.
File Deletion:

Send a DELETE request to /delete/:fileHash (authenticated route) to delete a file.


=>Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
