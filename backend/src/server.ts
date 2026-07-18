import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { db } from './db';
import authRoutes from './routes/auth';
import cameraRoutes from './routes/cameras';
import alertRoutes from './routes/alerts';
import reportRoutes from './routes/reports';
import userRoutes from './routes/users';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Config CORS
app.use(cors({
  origin: '*', // in production configure properly
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Multer in-memory storage for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

// System Settings Endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve system settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const updated = await db.updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

// Image Upload AI Proxy Endpoint
app.post('/api/upload', upload.single('file'), async (req, res): Promise<any> => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    console.log(`[AI Proxy] Upload received: ${req.file.originalname} (${req.file.size} bytes). Forwarding to ${AI_SERVICE_URL}/detect`);

    // Prepare multipart form data using native Node 24 Blob/FormData
    const formData = new FormData();
    const blob = new Blob([req.file.buffer as any], { type: req.file.mimetype });
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
  } catch (err: any) {
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
      detections.push(
        { box: [120, 200, 380, 420], confidence: 0.92, className: 'car' },
        { box: [400, 250, 520, 390], confidence: 0.81, className: 'car' }
      );
    } else if (filenameLower.includes('crowd') || filenameLower.includes('people') || filenameLower.includes('person') || filenameLower.includes('user')) {
      detections.push(
        { box: [80, 100, 210, 400], confidence: 0.88, className: 'person' },
        { box: [220, 120, 350, 420], confidence: 0.94, className: 'person' },
        { box: [380, 90, 490, 390], confidence: 0.76, className: 'person' }
      );
    } else {
      // Default standard mock detections
      detections.push(
        { box: [150, 100, 450, 500], confidence: 0.89, className: 'person' },
        { box: [320, 350, 450, 480], confidence: 0.74, className: 'laptop' }
      );
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

// MJPEG Stream Proxy — pipes AI service stream through backend to avoid browser CORS issues
app.get('/api/stream/:cameraId', async (req, res): Promise<any> => {
  const { cameraId } = req.params;
  const validIds = ['cam-01', 'cam-02', 'cam-03', 'cam-04'];
  if (!validIds.includes(cameraId)) {
    return res.status(404).json({ error: 'Camera not found' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const upstream = await fetch(`${AI_SERVICE_URL}/stream/${cameraId}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ error: 'AI service unavailable' });
    }

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'multipart/x-mixed-replace; boundary=frame');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstream.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done || res.destroyed) break;
          res.write(value);
        }
      } catch {
        // client disconnected — normal
      } finally {
        reader.cancel().catch(() => {});
        if (!res.destroyed) res.end();
      }
    };
    pump();

    req.on('close', () => { reader.cancel().catch(() => {}); });
  } catch {
    clearTimeout(timeout);
    if (!res.headersSent) {
      res.status(502).json({ error: 'AI service not reachable' });
    }
  }
});

// AI Service health check endpoint
app.get('/api/ai-status', async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const r = await fetch(`${AI_SERVICE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    res.json({ online: r.ok });
  } catch {
    clearTimeout(timeout);
    res.json({ online: false });
  }
});


// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dbMode: db.isFirebaseMode() ? 'Firebase Firestore' : 'Local JSON File'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`VisionOps Backend Server is running!`);
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database Mode: ${db.isFirebaseMode() ? 'Firebase Firestore' : 'Local File JSON'}`);
  console.log(`========================================`);
});
