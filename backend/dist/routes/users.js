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
// Helper middleware to authenticate/authorize admin
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        req.body.userContext = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
// GET all users
router.get('/', authenticateAdmin, async (req, res) => {
    try {
        const users = await db_1.db.getUsers();
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
});
// PUT update user status/role
router.put('/:id', authenticateAdmin, async (req, res) => {
    try {
        const { role, status } = req.body;
        const user = await db_1.db.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Do not allow admin to suspend themselves
        const adminUser = req.body.userContext;
        if (adminUser.id === req.params.id && status === 'suspended') {
            return res.status(400).json({ error: 'Admin cannot suspend their own account' });
        }
        const updates = {};
        if (role)
            updates.role = role;
        if (status)
            updates.status = status;
        const updated = await db_1.db.updateUser(req.params.id, updates);
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update user configuration' });
    }
});
// DELETE user
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const user = await db_1.db.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const adminUser = req.body.userContext;
        if (adminUser.id === req.params.id) {
            return res.status(400).json({ error: 'Admin cannot delete their own account' });
        }
        await db_1.db.deleteUser(req.params.id);
        res.json({ message: 'User deleted successfully', id: req.params.id });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
exports.default = router;
