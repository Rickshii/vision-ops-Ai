import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { db } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'visionops-super-secret-key-12345';

// SSE Clients Registry
let clients: Response[] = [];

// Helper middleware to authenticate
const authenticate = (req: Request, res: Response, next: () => void): any => {
  const authHeader = req.headers.authorization;
  if (!authHeader && req.query.token) {
    // allow token in query string for SSE endpoints
    try {
      const decoded: any = jwt.verify(req.query.token as string, JWT_SECRET);
      req.body.userContext = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.body.userContext = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// SSE Endpoint for Live Alerts
router.get('/events', (req: Request, res: Response) => {
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
    clients = clients.filter(c => c !== res);
    console.log(`[SSE] Client disconnected. Total clients: ${clients.length}`);
  });
});

// GET all alerts
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const alerts = await db.getAlerts();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

// POST trigger new alert (invoked by AI service or simulation)
router.post('/trigger', async (req: Request, res: Response): Promise<any> => {
  try {
    const { cameraId, type, severity, snapshotUrl, objects } = req.body;

    if (!cameraId || !type || !severity) {
      return res.status(400).json({ error: 'CameraId, type, and severity are required' });
    }

    const camera = await db.getCameraById(cameraId);
    const cameraName = camera ? camera.name : 'Unknown Camera';

    const newAlert = await db.createAlert({
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
  } catch (err) {
    console.error('Trigger Alert Error:', err);
    res.status(500).json({ error: 'Failed to trigger alert' });
  }
});

// PUT update alert status (open, investigating, resolved)
router.put('/:id', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, notes, assignedTo } = req.body;
    const alert = await db.updateAlert(req.params.id, {
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

export default router;
export { clients };
