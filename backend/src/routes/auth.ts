import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { db } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'visionops-super-secret-key-12345';

// Register User
router.post('/register', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, name, phone, company } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Default the first registered user to admin, others to operators/viewers
    const allUsers = await db.getUsers();
    const role = allUsers.length === 0 ? 'admin' : 'operator';

    const newUser = await db.createUser({
      email,
      name,
      password: hashedPassword,
      role,
      status: 'active',
      phone: phone || '',
      company: company || '',
      createdAt: new Date().toISOString(),
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: newUser
    });
  } catch (err: any) {
    console.error('Registration Error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login User
router.post('/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account is suspended. Contact administrator.' });
    }

    // Verify Password (if we are in local mode, password is stored on user object)
    if (user.password) {
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      token,
      user: userWithoutPassword
    });
  } catch (err: any) {
    console.error('Login Error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// Get Current User Profile
router.get('/profile', async (req: Request, res: Response): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);
    
    const user = await db.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account has been suspended' });
    }

    const { password: _, ...userWithoutPassword } = user;
    return res.json(userWithoutPassword);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Update Profile
router.put('/profile', async (req: Request, res: Response): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);

    const { name, phone, company, password, avatarUrl } = req.body;
    const updates: any = {};

    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (company !== undefined) updates.company = company;
    if (avatarUrl) updates.avatarUrl = avatarUrl;
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await db.updateUser(decoded.id, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(updatedUser);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
