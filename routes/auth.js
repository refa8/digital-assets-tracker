

import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import  authenticateToken from '../middleware/auth';

dotenv.config();
console.log('Loaded JWT_SECRET:', process.env.JWT_SECRET)

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET
const usersFilePath = path.join(__dirname, '../../users.json'); 


function readUsers() {
    if (!fs.existsSync(usersFilePath)) {
        fs.writeFileSync(usersFilePath, JSON.stringify([]), 'utf-8');
    }
    const data = fs.readFileSync(usersFilePath, 'utf-8');
    return JSON.parse(data);
}

function writeUsers(users) {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
}


router.post('/register', (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();

    if (users.find(u => u.username === username)) {
        return res.status(400).send('User already exists');
    }

    users.push({ username, password });
    writeUsers(users);

    res.status(201).send('User registered');
});


router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).send('Invalid credentials');

    const accessToken = jwt.sign({ username: user.username }, jwtSecret);
    res.json({ accessToken });
});


router.delete('/delete', authenticateToken, (req, res) => {

    res.send(`File deleted by user ${req.user.username}`);
});

router.get('/download', authenticateToken, (req, res) => {
    
    res.send(`File downloaded by user ${req.user.username}`);
});
console.log('JWT Secret during sign:', process.env.JWT_SECRET);
console.log('Generated Token:', token);


export default router;
