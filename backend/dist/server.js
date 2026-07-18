"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
const db_1 = require("./db");
const auth_1 = __importDefault(require("./routes/auth"));
const cameras_1 = __importDefault(require("./routes/cameras"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const reports_1 = __importDefault(require("./routes/reports"));
const users_1 = __importDefault(require("./routes/users"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
// Config CORS
app.use((0, cors_1.default)({
    origin: '*', // in production configure properly
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
// Multer in-memory storage for handling file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});
// Register routes
app.use('/api/auth', auth_1.default);
app.use('/api/cameras', cameras_1.default);
app.use('/api/alerts', alerts_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/users', users_1.default);
// System Settings Endpoints
app.get('/api/settings', async (req, res) => {
    try {
        const settings = await db_1.db.getSettings();
        res.json(settings);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve system settings' });
    }
});
app.put('/api/settings', async (req, res) => {
    try {
        const updated = await db_1.db.updateSettings(req.body);
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update system settings' });
    }
});
// Image Upload AI Proxy Endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
        console.log(`[AI Proxy] Upload received: ${req.file.originalname} (${req.file.size} bytes). Forwarding to ${AI_SERVICE_URL}/detect`);
        // Prepare multipart form data using native Node 24 Blob/FormData
        const formData = new FormData();
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
        formData.append('file', blob, req.file.originalname);
        // Call Python FastAPI service
        const response = await fetch(`${AI_SERVICE_URL}/detect`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            throw new Error(`AI service responded with status ${response.status}`);
        }
        const result = await response.json();
        console.log(`[AI Proxy] Detections complete: found ${result.detections?.length || 0} objects.`);
        return res.json(result);
    }
    catch (err) {
        console.error('[AI Proxy] Error contacting AI Service:', err.message);
        // Graceful fallback: Simulate detections if AI microservice is not running
        console.log('[AI Proxy] Falling back to simulated object detection...');
        // Simulate short processing delay
        await new Promise(resolve => setTimeout(resolve, 800));
        // Convert file buffer to base64
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        const base64DataUri = `data:${mimeType};base64,${base64Image}`;
        // Return custom mock detections based on common objects in the name
        const filenameLower = req.file.originalname.toLowerCase();
        const detections = [];
        if (filenameLower.includes('car') || filenameLower.includes('vehicle') || filenameLower.includes('traffic')) {
            detections.push({ box: [120, 200, 380, 420], confidence: 0.92, className: 'car' }, { box: [400, 250, 520, 390], confidence: 0.81, className: 'car' });
        }
        else if (filenameLower.includes('crowd') || filenameLower.includes('people') || filenameLower.includes('person') || filenameLower.includes('user')) {
            detections.push({ box: [80, 100, 210, 400], confidence: 0.88, className: 'person' }, { box: [220, 120, 350, 420], confidence: 0.94, className: 'person' }, { box: [380, 90, 490, 390], confidence: 0.76, className: 'person' });
        }
        else {
            // Default standard mock detections
            detections.push({ box: [150, 100, 450, 500], confidence: 0.89, className: 'person' }, { box: [320, 350, 450, 480], confidence: 0.74, className: 'laptop' });
        }
        return res.json({
            success: true,
            detections,
            // In fallback, just return the uploaded image as the base64 URI
            image: base64DataUri,
            fallbackMode: true,
            message: 'Processed using local fallback detector (AI Service Offline)'
        });
    }
});
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        dbMode: db_1.db.isFirebaseMode() ? 'Firebase Firestore' : 'Local JSON File'
    });
});
// Start Server
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`VisionOps Backend Server is running!`);
    console.log(`Port: ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database Mode: ${db_1.db.isFirebaseMode() ? 'Firebase Firestore' : 'Local File JSON'}`);
    console.log(`========================================`);
});
