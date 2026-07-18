import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { db } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'visionops-super-secret-key-12345';

// Helper middleware to authenticate/authorize admin
const authenticateAdmin = (req: Request, res: Response, next: () => void): any => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    req.body.userContext = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// GET all users
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// PUT update user status/role
router.put('/:id', authenticateAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { role, status } = req.body;
    const user = await db.getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Do not allow admin to suspend themselves
    const adminUser = req.body.userContext;
    if (adminUser.id === req.params.id && status === 'suspended') {
      return res.status(400).json({ error: 'Admin cannot suspend their own account' });
    }

    const updates: any = {};
    if (role) updates.role = role;
    if (status) updates.status = status;

    const updated = await db.updateUser(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user configuration' });
  }
});

// DELETE user
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const adminUser = req.body.userContext;
    if (adminUser.id === req.params.id) {
      return res.status(400).json({ error: 'Admin cannot delete their own account' });
    }

    await db.deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
