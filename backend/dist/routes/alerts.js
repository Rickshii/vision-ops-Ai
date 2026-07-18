"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.clients = void 0;
const express_1 = require("express");
const jwt = __importStar(require("jsonwebtoken"));
const db_1 = require("../db");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'visionops-super-secret-key-12345';
// SSE Clients Registry
let clients = [];
exports.clients = clients;
// Helper middleware to authenticate
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader && req.query.token) {
        // allow token in query string for SSE endpoints
        try {
            const decoded = jwt.verify(req.query.token, JWT_SECRET);
            req.body.userContext = decoded;
            return next();
        }
        catch (err) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.body.userContext = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
// SSE Endpoint for Live Alerts
router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    clients.push(res);
    console.log(`[SSE] Client connected. Total clients: ${clients.length}`);
    // Send a heartbeat comment every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 30000);
    req.on('close', () => {
        clearInterval(heartbeat);
        exports.clients = clients = clients.filter(c => c !== res);
        console.log(`[SSE] Client disconnected. Total clients: ${clients.length}`);
    });
});
// GET all alerts
router.get('/', authenticate, async (req, res) => {
    try {
        const alerts = await db_1.db.getAlerts();
        res.json(alerts);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve alerts' });
    }
});
// POST trigger new alert (invoked by AI service or simulation)
router.post('/trigger', async (req, res) => {
    try {
        const { cameraId, type, severity, snapshotUrl, objects } = req.body;
        if (!cameraId || !type || !severity) {
            return res.status(400).json({ error: 'CameraId, type, and severity are required' });
        }
        const camera = await db_1.db.getCameraById(cameraId);
        const cameraName = camera ? camera.name : 'Unknown Camera';
        const newAlert = await db_1.db.createAlert({
            cameraId,
            cameraName,
            type,
            severity,
            status: 'open',
            timestamp: new Date().toISOString(),
            snapshotUrl: snapshotUrl || '',
            objects: objects || [],
        });
        // Broadcast new alert to all active SSE client connections
        const payload = JSON.stringify(newAlert);
        clients.forEach(client => {
            client.write(`data: ${payload}\n\n`);
        });
        console.log(`[Alert] Triggered ${type} on ${cameraName}. Broadcasted to ${clients.length} clients.`);
        res.status(201).json(newAlert);
    }
    catch (err) {
        console.error('Trigger Alert Error:', err);
        res.status(500).json({ error: 'Failed to trigger alert' });
    }
});
// PUT update alert status (open, investigating, resolved)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { status, notes, assignedTo } = req.body;
        const alert = await db_1.db.updateAlert(req.params.id, {
            status,
            notes,
            assignedTo
        });
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        // Broadcast alert updates as well, so frontend logs update dynamically
        const payload = JSON.stringify({ ...alert, updateType: 'STATUS_UPDATE' });
        clients.forEach(client => {
            client.write(`data: ${payload}\n\n`);
        });
        res.json(alert);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update alert' });
    }
});
exports.default = router;
