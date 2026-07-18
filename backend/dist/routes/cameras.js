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
const express_1 = require("express");
const jwt = __importStar(require("jsonwebtoken"));
const db_1 = require("../db");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'visionops-super-secret-key-12345';
// Helper middleware to authenticate/authorize
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.body.userContext = decoded; // pass decoded info in body
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
const checkRole = (roles) => {
    return (req, res, next) => {
        const user = req.body.userContext;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
        }
        next();
    };
};
// GET all cameras
router.get('/', authenticate, async (req, res) => {
    try {
        const cameras = await db_1.db.getCameras();
        res.json(cameras);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve cameras' });
    }
});
// GET camera by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const camera = await db_1.db.getCameraById(req.params.id);
        if (!camera) {
            return res.status(404).json({ error: 'Camera not found' });
        }
        res.json(camera);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve camera' });
    }
});
// POST create camera
router.post('/', authenticate, checkRole(['admin', 'operator']), async (req, res) => {
    try {
        const { name, url, location, zone, aiModels, sensitivity, status } = req.body;
        if (!name || !url || !location || !zone) {
            return res.status(400).json({ error: 'Name, stream URL, location, and zone are required' });
        }
        const newCamera = await db_1.db.createCamera({
            name,
            url,
            location,
            zone,
            status: status || 'inactive',
            aiModels: aiModels || ['object'],
            sensitivity: sensitivity !== undefined ? parseFloat(sensitivity) : 0.7,
            createdAt: new Date().toISOString()
        });
        res.status(201).json(newCamera);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create camera' });
    }
});
// PUT update camera
router.put('/:id', authenticate, checkRole(['admin', 'operator']), async (req, res) => {
    try {
        const { name, url, location, zone, aiModels, sensitivity, status } = req.body;
        const camera = await db_1.db.getCameraById(req.params.id);
        if (!camera) {
            return res.status(404).json({ error: 'Camera not found' });
        }
        const updates = {};
        if (name)
            updates.name = name;
        if (url)
            updates.url = url;
        if (location)
            updates.location = location;
        if (zone)
            updates.zone = zone;
        if (aiModels)
            updates.aiModels = aiModels;
        if (sensitivity !== undefined)
            updates.sensitivity = parseFloat(sensitivity);
        if (status)
            updates.status = status;
        const updated = await db_1.db.updateCamera(req.params.id, updates);
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update camera' });
    }
});
// DELETE camera
router.delete('/:id', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        const camera = await db_1.db.getCameraById(req.params.id);
        if (!camera) {
            return res.status(404).json({ error: 'Camera not found' });
        }
        await db_1.db.deleteCamera(req.params.id);
        res.json({ message: 'Camera deleted successfully', id: req.params.id });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete camera' });
    }
});
exports.default = router;
