import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import authRoutes from './middleware/auth.js'; 
import userRoutes from './routes/user.js';
import  authenticateToken  from './middleware/auth.js'; 
import dotenv from 'dotenv';

const app = express();
const port = 3001;
dotenv.config();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

const __dirname = path.resolve();
const assetsFilePath = path.join(__dirname, 'assets.json');
const binDirectory = path.join(__dirname, 'bin');
const downloadsDirectory = path.join(__dirname, 'downloads');


if (!fs.existsSync(binDirectory)) {
    fs.mkdirSync(binDirectory);
}

if (!fs.existsSync(downloadsDirectory)) {
    fs.mkdirSync(downloadsDirectory);
}


if (!fs.existsSync(assetsFilePath)) {
    fs.writeFileSync(assetsFilePath, JSON.stringify([], null, 2), 'utf-8');
}


const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.APP_PASS  
    }
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/auth', authRoutes);
app.use('/user', userRoutes);



function generateHash(filePath) {
    const hash = crypto.createHash('sha256');
    const fileBuffer = fs.readFileSync(filePath);
    hash.update(fileBuffer);
    return hash.digest('hex');
}


app.post('/upload', upload.single('file'), authenticateToken, (req, res) => {
    if (!req.file || !req.body.userEmail) {
        return res.status(400).send('No file uploaded or email missing.');
    }

    const filePath = path.join(__dirname, req.file.path);
    const assetData = {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        path: req.file.path,
        hash: generateHash(filePath),
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        downloaded: false,
        userEmail: req.body.userEmail 
    };

    let assets = [];
    try {
        assets = JSON.parse(fs.readFileSync(assetsFilePath, 'utf-8'));
    } catch (error) {
        console.error('Error reading assets file:', error);
    }

    assets.push(assetData);

    try {
        fs.writeFileSync(assetsFilePath, JSON.stringify(assets, null, 2), 'utf-8');
        console.log('Successfully updated assets.json:', assets);
    } catch (error) {
        console.error('Error writing assets file:', error);
        return res.status(500).send('Failed to update assets.');
    }

    res.json({ message: 'File uploaded successfully!', file: req.file });
});


app.get('/assets', authenticateToken, (req, res) => {
    let assets = [];
    try {
        assets = JSON.parse(fs.readFileSync(assetsFilePath, 'utf-8'));
    } catch (error) {
        console.error('Error reading assets file:', error);
        return res.status(500).send('Failed to retrieve assets.');
    }
    res.json(assets);
});

// Endpoint to download a file
app.get('/download', authenticateToken, (req, res) => {
    const { hash } = req.query;

    if (!hash) {
        return res.status(400).send('Hash is required.');
    }

    let assets = [];
    try {
        assets = JSON.parse(fs.readFileSync(assetsFilePath, 'utf-8'));
    } catch (error) {
        console.error('Error reading assets file:', error);
        return res.status(500).send('Failed to retrieve assets.');
    }

    const assetIndex = assets.findIndex(asset => asset.hash === hash);
    if (assetIndex === -1) {
        return res.status(404).send('File not found.');
    }

    const asset = assets[assetIndex];
    const uploadFilePath = path.join(__dirname, asset.path);
    const downloadFilePath = path.join(downloadsDirectory, asset.fileName);

    
    try {
        fs.copyFileSync(uploadFilePath, downloadFilePath);
        console.log('File copied to downloads directory:', downloadFilePath);
    } catch (error) {
        console.error('Error copying file to downloads directory:', error);
        return res.status(500).send('Failed to prepare file for download.');
    }

    
    assets[assetIndex].downloaded = true;

    try {
        fs.writeFileSync(assetsFilePath, JSON.stringify(assets, null, 2), 'utf-8');
        console.log('Successfully updated assets.json after download:', assets);
    } catch (error) {
        console.error('Error updating assets file:', error);
        return res.status(500).send('Failed to update assets after download.');
    }

    res.download(downloadFilePath, err => {
        if (err) {
            console.error('Error occurred during download:', err);
            res.status(500).send('Error occurred during download.');
        }
    });
});


app.get('/search', authenticateToken, (req, res) => {
    const { filename, hash, uploadedAt } = req.query;

    let assets = [];
    try {
        assets = JSON.parse(fs.readFileSync(assetsFilePath, 'utf-8'));
    } catch (error) {
        console.error('Error reading assets file:', error);
        return res.status(500).send('Failed to search assets.');
    }

    const filteredAssets = assets.filter(asset => {
        return (!filename || asset.originalName.includes(filename)) &&
               (!hash || asset.hash.includes(hash)) &&
               (!uploadedAt || asset.uploadedAt.includes(uploadedAt));
    });

    res.json(filteredAssets);
});

const auditLogFilePath = path.join(__dirname, 'audit.log');


app.delete('/delete', authenticateToken, (req, res) => {
    const { hash } = req.query;

    if (!hash) {
        return res.status(400).send('Hash is required.');
    }

    let assets = [];
    try {
        assets = JSON.parse(fs.readFileSync(assetsFilePath, 'utf-8'));
    } catch (error) {
        console.error('Error reading assets file:', error);
        return res.status(500).send('Failed to delete asset.');
    }

    const assetIndex = assets.findIndex(asset => asset.hash === hash);
    if (assetIndex === -1) {
        return res.status(404).send('Asset not found.');
    }

    const asset = assets[assetIndex];

    
    if (!asset.downloaded) {
        return res.status(400).send('File cannot be deleted because it has not been downloaded.');
    }

    const uploadFilePath = path.join(__dirname, asset.path);
    const binPath = path.join(binDirectory, asset.fileName);
    const downloadFilePath = path.join(downloadsDirectory, asset.fileName);

    
    try {
        fs.renameSync(uploadFilePath, binPath);
        console.log(`Moved file to bin: ${binPath}`);
    } catch (error) {
        console.error('Error moving file to bin:', error);
        return res.status(500).send('Failed to delete asset.');
    }

    
    if (fs.existsSync(downloadFilePath)) {
        try {
            fs.unlinkSync(downloadFilePath);
            console.log(`Deleted file from downloads directory: ${downloadFilePath}`);
        } catch (error) {
            console.error('Error deleting file from downloads directory:', error);
        }
    }

    
    const logEntry = {
        timestamp: new Date().toISOString(),
        action: 'DELETE',
        fileName: asset.fileName,
        hash: asset.hash,
        status: 'Moved to bin',
        userEmail: asset.userEmail
    };

    fs.appendFile(auditLogFilePath, JSON.stringify(logEntry) + '\n', err => {
        if (err) {
            console.error('Error writing to audit log:', err);
        } else {
            console.log('Logged deletion to audit log:', logEntry);
        }
    });

    
    const deletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    sendDeletionNotification(asset.userEmail, asset.fileName, deletionDate)
        .then(() => {
            console.log('Sent notification about scheduled deletion.');
        })
        .catch(err => {
            console.error('Error sending deletion notification:', err);
        });

    
    assets.splice(assetIndex, 1);

    try {
        fs.writeFileSync(assetsFilePath, JSON.stringify(assets, null, 2), 'utf-8');
        console.log('Successfully updated assets.json after deletion:', assets);
    } catch (error) {
        console.error('Error updating assets file after deletion:', error);
        return res.status(500).send('Failed to update assets after deletion.');
    }

    res.send('Asset marked for deletion.');
});


function sendDeletionNotification(userEmail, fileName, deletionDate) {
    const mailOptions = {
        from: 'rejafathima8@gmail.com',
        to: userEmail,
        subject: 'File Deletion Notification',
        text: `Dear User,

The file "${fileName}" has been marked for deletion. It will be permanently deleted on ${deletionDate}. Please take necessary actions if you wish to keep this file.

Best Regards,
Your File Management System`
    };

    return transporter.sendMail(mailOptions);
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
