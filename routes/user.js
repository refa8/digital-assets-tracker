import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import  authenticateToken from '../middleware/auth.js';


dotenv.config(); 
console.log('Loaded JWT_SECRET:', process.env.JWT_SECRET)

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const usersFilePath = path.join(__dirname, 'users.json'); // Path to your user data file
const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Use the environment variable for the secret


function getUsers() {
    try {
        return JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));
    } catch (error) {
        console.error('Error reading users file:', error);
        return [];
    }
}

router.get('/protected', authenticateToken, (req, res) => {
    res.send('This is a protected route.');
});


router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send('Email and password are required.');
    }

    const users = getUsers();
    if (users.find(user => user.email === email)) {
        return res.status(400).send('User already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ email, password: hashedPassword });

    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
        res.status(201).send('User registered successfully.');
    } catch (error) {
        console.error('Error saving user data:', error);
        res.status(500).send('Failed to register user.');
    }
});


router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send('Email and password are required.');
    }

    const users = getUsers();
    const user = users.find(user => user.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send('Invalid credentials.');
    }

    const token = jwt.sign({ email }, jwtSecret, { expiresIn: '1h' });
    res.json({ token });

    console.log('JWT Secret during sign:', process.env.JWT_SECRET);
console.log('Generated Token:', token);
});




export default router;
