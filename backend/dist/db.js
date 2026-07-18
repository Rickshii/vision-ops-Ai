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
exports.db = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const admin = __importStar(require("firebase-admin"));
class Database {
    localDbPath;
    isFirebase = false;
    firestoreDb;
    constructor() {
        this.localDbPath = path.join(__dirname, '..', 'database.json');
        this.initialize();
    }
    initialize() {
        // Check for Firebase environment credentials
        const firebaseConfigPath = process.env.FIREBASE_CONFIG_PATH || '';
        const projectId = process.env.FIREBASE_PROJECT_ID;
        if (projectId && (firebaseConfigPath || process.env.FIREBASE_CLIENT_EMAIL)) {
            try {
                let credential;
                if (firebaseConfigPath && fs.existsSync(firebaseConfigPath)) {
                    credential = admin.credential.cert(require(firebaseConfigPath));
                }
                else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
                    credential = admin.credential.cert({
                        projectId: projectId,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    });
                }
                if (credential) {
                    admin.initializeApp({
                        credential,
                        storageBucket: `${projectId}.appspot.com`,
                    });
                    this.firestoreDb = admin.firestore();
                    this.isFirebase = true;
                    console.log('[Database] Connected to Firebase Firestore.');
                    return;
                }
            }
            catch (err) {
                console.error('[Database] Failed to initialize Firebase admin SDK. Falling back to local mode.', err);
            }
        }
        console.log('[Database] Using local JSON database mode.');
        this.ensureLocalDbExists();
    }
    ensureLocalDbExists() {
        if (!fs.existsSync(this.localDbPath)) {
            const defaultData = {
                users: [
                    {
                        id: 'admin-uuid',
                        email: 'admin@visionops.ai',
                        password: '$2a$10$i75/vLNz2gBnDZDcWZeuw.xfMDHLedVQLZCSlmoiAPFc6x0vm6c5C', //bcrypt for 'admin123'
                        name: 'Administrator',
                        role: 'admin',
                        status: 'active',
                        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                        phone: '+1 (555) 019-2834',
                        company: 'VisionOps Operations',
                        apiKey: 'vo_live_key_a8d7c2b4e5f6',
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'operator-uuid',
                        email: 'operator@visionops.ai',
                        password: '$2a$10$i75/vLNz2gBnDZDcWZeuw.xfMDHLedVQLZCSlmoiAPFc6x0vm6c5C', //bcrypt for 'admin123'
                        name: 'John Operator',
                        role: 'operator',
                        status: 'active',
                        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                        phone: '+1 (555) 014-9988',
                        company: 'VisionOps Operations',
                        apiKey: 'vo_live_key_o3d7a8b4c5e2',
                        createdAt: new Date().toISOString(),
                    }
                ],
                cameras: [
                    {
                        id: 'cam-01',
                        name: 'Main Entrance Lobby',
                        url: 'http://localhost:8000/stream/cam-01',
                        location: 'Building A, Ground Floor',
                        zone: 'Lobby',
                        status: 'active',
                        aiModels: ['object', 'face'],
                        sensitivity: 0.75,
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'cam-02',
                        name: 'South Loading Dock',
                        url: 'http://localhost:8000/stream/cam-02',
                        location: 'Building B, Exterior',
                        zone: 'Loading Dock',
                        status: 'active',
                        aiModels: ['object'],
                        sensitivity: 0.8,
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'cam-03',
                        name: 'Secure Server Room',
                        url: 'http://localhost:8000/stream/cam-03',
                        location: 'Building C, Floor 3',
                        zone: 'Server Room',
                        status: 'active',
                        aiModels: ['face', 'object'],
                        sensitivity: 0.9,
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'cam-04',
                        name: 'Perimeter Fence East',
                        url: 'http://localhost:8000/stream/cam-04',
                        location: 'Fence East Area',
                        zone: 'Perimeter',
                        status: 'active',
                        aiModels: ['object'],
                        sensitivity: 0.65,
                        createdAt: new Date().toISOString(),
                    }
                ],
                alerts: [
                    {
                        id: 'alert-01',
                        cameraId: 'cam-03',
                        cameraName: 'Secure Server Room',
                        type: 'Unidentified Person',
                        severity: 'critical',
                        status: 'open',
                        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
                        snapshotUrl: '',
                        objects: ['person'],
                        notes: 'Unidentified individual detected in restricted server room after hours. Dispatched security.',
                        assignedTo: 'operator-uuid',
                    },
                    {
                        id: 'alert-02',
                        cameraId: 'cam-02',
                        cameraName: 'South Loading Dock',
                        type: 'Crowd Gathering',
                        severity: 'medium',
                        status: 'investigating',
                        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
                        snapshotUrl: '',
                        objects: ['person', 'person', 'person', 'person', 'person'],
                        notes: 'Group of 5+ people gathered near dock doors. Operator review in progress.',
                        assignedTo: 'operator-uuid',
                    },
                    {
                        id: 'alert-03',
                        cameraId: 'cam-04',
                        cameraName: 'Perimeter Fence East',
                        type: 'Intrusion Event',
                        severity: 'high',
                        status: 'resolved',
                        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
                        snapshotUrl: '',
                        objects: ['car', 'person'],
                        notes: 'Suspicious vehicle parked close to the perimeter. Security swept the area; vehicle departed.',
                        assignedTo: 'admin-uuid',
                    }
                ],
                settings: {
                    retentionDays: 30,
                    alertEmailEnabled: true,
                    alertWebhookUrl: 'https://webhook.site/mock-endpoint',
                    aiConfThreshold: 0.5,
                    aiIouThreshold: 0.45,
                    firebaseActive: false
                }
            };
            fs.writeFileSync(this.localDbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
        }
    }
    readLocalDb() {
        this.ensureLocalDbExists();
        const raw = fs.readFileSync(this.localDbPath, 'utf-8');
        return JSON.parse(raw);
    }
    writeLocalDb(data) {
        fs.writeFileSync(this.localDbPath, JSON.stringify(data, null, 2), 'utf-8');
    }
    // Database Accessors
    isFirebaseMode() {
        return this.isFirebase;
    }
    // USERS
    async getUsers() {
        if (this.isFirebase && this.firestoreDb) {
            const snap = await this.firestoreDb.collection('users').get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        else {
            const db = this.readLocalDb();
            return db.users.map(({ password, ...u }) => u);
        }
    }
    async getUserById(id) {
        if (this.isFirebase && this.firestoreDb) {
            const doc = await this.firestoreDb.collection('users').doc(id).get();
            if (!doc.exists)
                return null;
            return { id: doc.id, ...doc.data() };
        }
        else {
            const db = this.readLocalDb();
            const user = db.users.find((u) => u.id === id);
            if (!user)
                return null;
            return user;
        }
    }
    async getUserByEmail(email) {
        if (this.isFirebase && this.firestoreDb) {
            const snap = await this.firestoreDb.collection('users').where('email', '==', email.toLowerCase().trim()).get();
            if (snap.empty)
                return null;
            const doc = snap.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        else {
            const db = this.readLocalDb();
            const user = db.users.find((u) => u.email.toLowerCase().trim() === email.toLowerCase().trim());
            return user || null;
        }
    }
    async createUser(user) {
        const newId = user.id || `user_${Math.random().toString(36).substr(2, 9)}`;
        const fullUser = {
            id: newId,
            email: user.email.toLowerCase().trim(),
            name: user.name,
            role: user.role || 'viewer',
            status: user.status || 'active',
            avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`,
            phone: user.phone || '',
            company: user.company || '',
            apiKey: user.apiKey || `vo_live_key_${Math.random().toString(36).substr(2, 12)}`,
            createdAt: user.createdAt || new Date().toISOString(),
        };
        if (this.isFirebase && this.firestoreDb) {
            // Firebase auth handles passwords independently. Save profile to Firestore.
            await this.firestoreDb.collection('users').doc(newId).set(fullUser);
            return fullUser;
        }
        else {
            const db = this.readLocalDb();
            const localRecord = { ...fullUser, password: user.password || '' };
            db.users.push(localRecord);
            this.writeLocalDb(db);
            return fullUser;
        }
    }
    async updateUser(id, updates) {
        if (this.isFirebase && this.firestoreDb) {
            const docRef = this.firestoreDb.collection('users').doc(id);
            const doc = await docRef.get();
            if (!doc.exists)
                return null;
            const cleanUpdates = { ...updates };
            delete cleanUpdates.password; // Firestore profile shouldn't contain password
            delete cleanUpdates.id;
            await docRef.update(cleanUpdates);
            const updatedDoc = await docRef.get();
            return { id: updatedDoc.id, ...updatedDoc.data() };
        }
        else {
            const db = this.readLocalDb();
            const idx = db.users.findIndex((u) => u.id === id);
            if (idx === -1)
                return null;
            const existing = db.users[idx];
            const updatedRecord = {
                ...existing,
                ...updates,
            };
            db.users[idx] = updatedRecord;
            this.writeLocalDb(db);
            const { password, ...cleanUser } = updatedRecord;
            return cleanUser;
        }
    }
    async deleteUser(id) {
        if (this.isFirebase && this.firestoreDb) {
            await this.firestoreDb.collection('users').doc(id).delete();
            return true;
        }
        else {
            const db = this.readLocalDb();
            const initialLength = db.users.length;
            db.users = db.users.filter((u) => u.id !== id);
            if (db.users.length === initialLength)
                return false;
            this.writeLocalDb(db);
            return true;
        }
    }
    // CAMERAS
    async getCameras() {
        if (this.isFirebase && this.firestoreDb) {
            const snap = await this.firestoreDb.collection('cameras').get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        else {
            const db = this.readLocalDb();
            return db.cameras;
        }
    }
    async getCameraById(id) {
        if (this.isFirebase && this.firestoreDb) {
            const doc = await this.firestoreDb.collection('cameras').doc(id).get();
            if (!doc.exists)
                return null;
            return { id: doc.id, ...doc.data() };
        }
        else {
            const db = this.readLocalDb();
            return db.cameras.find((c) => c.id === id) || null;
        }
    }
    async createCamera(camera) {
        const newId = `cam_${Math.random().toString(36).substr(2, 9)}`;
        const fullCamera = {
            id: newId,
            ...camera,
            createdAt: new Date().toISOString()
        };
        if (this.isFirebase && this.firestoreDb) {
            await this.firestoreDb.collection('cameras').doc(newId).set(fullCamera);
            return fullCamera;
        }
        else {
            const db = this.readLocalDb();
            db.cameras.push(fullCamera);
            this.writeLocalDb(db);
            return fullCamera;
        }
    }
    async updateCamera(id, updates) {
        if (this.isFirebase && this.firestoreDb) {
            const docRef = this.firestoreDb.collection('cameras').doc(id);
            const doc = await docRef.get();
            if (!doc.exists)
                return null;
            const cleanUpdates = { ...updates };
            delete cleanUpdates.id;
            await docRef.update(cleanUpdates);
            const updatedDoc = await docRef.get();
            return { id: updatedDoc.id, ...updatedDoc.data() };
        }
        else {
            const db = this.readLocalDb();
            const idx = db.cameras.findIndex((c) => c.id === id);
            if (idx === -1)
                return null;
            db.cameras[idx] = { ...db.cameras[idx], ...updates };
            this.writeLocalDb(db);
            return db.cameras[idx];
        }
    }
    async deleteCamera(id) {
        if (this.isFirebase && this.firestoreDb) {
            await this.firestoreDb.collection('cameras').doc(id).delete();
            return true;
        }
        else {
            const db = this.readLocalDb();
            const initialLength = db.cameras.length;
            db.cameras = db.cameras.filter((c) => c.id !== id);
            if (db.cameras.length === initialLength)
                return false;
            this.writeLocalDb(db);
            return true;
        }
    }
    // ALERTS
    async getAlerts() {
        if (this.isFirebase && this.firestoreDb) {
            const snap = await this.firestoreDb.collection('alerts').orderBy('timestamp', 'desc').get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        else {
            const db = this.readLocalDb();
            // sort by timestamp descending
            return [...db.alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
    }
    async createAlert(alert) {
        const newId = `alert_${Math.random().toString(36).substr(2, 9)}`;
        const fullAlert = {
            id: newId,
            ...alert,
            timestamp: alert.timestamp || new Date().toISOString()
        };
        if (this.isFirebase && this.firestoreDb) {
            await this.firestoreDb.collection('alerts').doc(newId).set(fullAlert);
            return fullAlert;
        }
        else {
            const db = this.readLocalDb();
            db.alerts.push(fullAlert);
            this.writeLocalDb(db);
            return fullAlert;
        }
    }
    async updateAlert(id, updates) {
        if (this.isFirebase && this.firestoreDb) {
            const docRef = this.firestoreDb.collection('alerts').doc(id);
            const doc = await docRef.get();
            if (!doc.exists)
                return null;
            const cleanUpdates = { ...updates };
            delete cleanUpdates.id;
            await docRef.update(cleanUpdates);
            const updatedDoc = await docRef.get();
            return { id: updatedDoc.id, ...updatedDoc.data() };
        }
        else {
            const db = this.readLocalDb();
            const idx = db.alerts.findIndex((a) => a.id === id);
            if (idx === -1)
                return null;
            db.alerts[idx] = { ...db.alerts[idx], ...updates };
            this.writeLocalDb(db);
            return db.alerts[idx];
        }
    }
    // SETTINGS
    async getSettings() {
        if (this.isFirebase && this.firestoreDb) {
            const doc = await this.firestoreDb.collection('settings').doc('system').get();
            if (doc.exists) {
                return { ...doc.data(), firebaseActive: true };
            }
        }
        // local fallback
        const db = this.readLocalDb();
        return { ...db.settings, firebaseActive: this.isFirebase };
    }
    async updateSettings(updates) {
        if (this.isFirebase && this.firestoreDb) {
            const docRef = this.firestoreDb.collection('settings').doc('system');
            const cleanUpdates = { ...updates };
            delete cleanUpdates.firebaseActive;
            await docRef.set(cleanUpdates, { merge: true });
            const doc = await docRef.get();
            return { ...doc.data(), firebaseActive: true };
        }
        else {
            const db = this.readLocalDb();
            db.settings = { ...db.settings, ...updates };
            this.writeLocalDb(db);
            return { ...db.settings, firebaseActive: false };
        }
    }
}
exports.db = new Database();
exports.default = exports.db;
