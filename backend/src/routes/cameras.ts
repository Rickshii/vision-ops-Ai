import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { db } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'visionops-super-secret-key-12345';

// Helper middleware to authenticate/authorize
const authenticate = (req: Request, res: Response, next: () => void): any => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.body.userContext = decoded; // pass decoded info in body
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: () => void): any => {
    const user = req.body.userContext;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};

// GET all cameras
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const cameras = await db.getCameras();
    res.json(cameras);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve cameras' });
  }
});

// GET camera by ID
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const camera = await db.getCameraById(req.params.id);
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    res.json(camera);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve camera' });
  }
});

// POST create camera
router.post('/', authenticate, checkRole(['admin', 'operator']), async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, url, location, zone, aiModels, sensitivity, status } = req.body;

    if (!name || !url || !location || !zone) {
      return res.status(400).json({ error: 'Name, stream URL, location, and zone are required' });
    }

    const newCamera = await db.createCamera({
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to create camera' });
  }
});

// PUT update camera
router.put('/:id', authenticate, checkRole(['admin', 'operator']), async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, url, location, zone, aiModels, sensitivity, status } = req.body;
    const camera = await db.getCameraById(req.params.id);
    
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (url) updates.url = url;
    if (location) updates.location = location;
    if (zone) updates.zone = zone;
    if (aiModels) updates.aiModels = aiModels;
    if (sensitivity !== undefined) updates.sensitivity = parseFloat(sensitivity);
    if (status) updates.status = status;

    const updated = await db.updateCamera(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update camera' });
  }
});

// DELETE camera
router.delete('/:id', authenticate, checkRole(['admin']), async (req: Request, res: Response): Promise<any> => {
  try {
    const camera = await db.getCameraById(req.params.id);
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    await db.deleteCamera(req.params.id);
    res.json({ message: 'Camera deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete camera' });
  }
});

export default router;
