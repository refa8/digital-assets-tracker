import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer token" format

    if (token == null) return res.sendStatus(401); // No token provided

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Token invalid or expired

        req.user = user; // Attach user info to request object
        next(); // Proceed to the next middleware or route handler
    });
};

export default authenticateToken;
