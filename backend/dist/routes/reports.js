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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jwt = __importStar(require("jsonwebtoken"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const db_1 = require("../db");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'visionops-super-secret-key-12345';
// Auth helper
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.body.userContext = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
// Generate CSV Report
router.get('/csv', authenticate, async (req, res) => {
    try {
        const { startDate, endDate, cameraId, severity } = req.query;
        let alerts = await db_1.db.getAlerts();
        // Filter
        if (startDate) {
            alerts = alerts.filter(a => new Date(a.timestamp) >= new Date(startDate));
        }
        if (endDate) {
            alerts = alerts.filter(a => new Date(a.timestamp) <= new Date(endDate));
        }
        if (cameraId && cameraId !== 'all') {
            alerts = alerts.filter(a => a.cameraId === cameraId);
        }
        if (severity && severity !== 'all') {
            alerts = alerts.filter(a => a.severity === severity);
        }
        // Build CSV content
        const headers = ['Alert ID', 'Timestamp', 'Camera Name', 'Alert Type', 'Severity', 'Status', 'Detected Objects', 'Resolution Notes'];
        const rows = alerts.map(a => [
            a.id,
            a.timestamp,
            a.cameraName,
            a.type,
            a.severity.toUpperCase(),
            a.status.toUpperCase(),
            a.objects.join('; '),
            a.notes ? a.notes.replace(/"/g, '""') : ''
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${val}"`).join(','))
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=visionops_report_${Date.now()}.csv`);
        res.send(csvContent);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to generate CSV report' });
    }
});
// Generate PDF Report
router.get('/pdf', authenticate, async (req, res) => {
    try {
        const { startDate, endDate, cameraId, severity } = req.query;
        let alerts = await db_1.db.getAlerts();
        // Filter
        if (startDate) {
            alerts = alerts.filter(a => new Date(a.timestamp) >= new Date(startDate));
        }
        if (endDate) {
            alerts = alerts.filter(a => new Date(a.timestamp) <= new Date(endDate));
        }
        if (cameraId && cameraId !== 'all') {
            alerts = alerts.filter(a => a.cameraId === cameraId);
        }
        if (severity && severity !== 'all') {
            alerts = alerts.filter(a => a.severity === severity);
        }
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=visionops_report_${Date.now()}.pdf`);
        // Create PDF Document
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        doc.pipe(res);
        // Color Palette
        const primaryColor = '#0F172A'; // Slate 900
        const secondaryColor = '#6366F1'; // Indigo 500
        const accentColor = '#3B82F6'; // Blue 500
        const lightBg = '#F8FAFC'; // Slate 50
        const textMuted = '#64748B'; // Slate 500
        // Header Band
        doc.rect(0, 0, 600, 100).fill(primaryColor);
        doc.fillColor('#FFFFFF');
        doc.fontSize(24).font('Helvetica-Bold').text('VisionOps AI', 50, 25);
        doc.fontSize(10).font('Helvetica').text('INTELLIGENT VISUAL OPERATIONS PLATFORM', 50, 55);
        doc.fontSize(9).font('Helvetica-Oblique').text(`Generated: ${new Date().toLocaleString()}`, 420, 45);
        // Summary Section
        doc.fillColor(primaryColor);
        doc.fontSize(16).font('Helvetica-Bold').text('Operations Incident & Alert Report', 50, 130);
        doc.fontSize(10).font('Helvetica').fillColor(textMuted).text(`Date Filter Range: ${startDate ? new Date(startDate).toLocaleDateString() : 'Beginning'} to ${endDate ? new Date(endDate).toLocaleDateString() : 'Current'}`);
        // Horizontal Rule
        doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, 160).lineTo(545, 160).stroke();
        // Summary Statistics Cards
        const criticalCount = alerts.filter(a => a.severity === 'critical').length;
        const highCount = alerts.filter(a => a.severity === 'high').length;
        const mediumCount = alerts.filter(a => a.severity === 'medium').length;
        const resolvedCount = alerts.filter(a => a.status === 'resolved').length;
        doc.rect(50, 180, 110, 60).fill(lightBg);
        doc.rect(170, 180, 110, 60).fill(lightBg);
        doc.rect(290, 180, 110, 60).fill(lightBg);
        doc.rect(410, 180, 115, 60).fill(lightBg);
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold');
        doc.text('TOTAL ALERTS', 60, 190);
        doc.text('CRITICAL / HIGH', 180, 190);
        doc.text('MEDIUM / LOW', 300, 190);
        doc.text('RESOLVED STATE', 420, 190);
        doc.fontSize(18).fillColor(secondaryColor);
        doc.text(alerts.length.toString(), 60, 210);
        doc.fillColor('#EF4444').text((criticalCount + highCount).toString(), 180, 210); // Red
        doc.fillColor('#F59E0B').text(mediumCount.toString(), 300, 210); // Amber
        doc.fillColor('#10B981').text(resolvedCount.toString(), 420, 210); // Green
        // Table Header
        let yPos = 265;
        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('Detailed Incident List', 50, yPos);
        yPos += 20;
        doc.rect(50, yPos, 495, 20).fill(primaryColor);
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
        doc.text('ID', 55, yPos + 6);
        doc.text('TIMESTAMP', 110, yPos + 6);
        doc.text('CAMERA', 200, yPos + 6);
        doc.text('TYPE', 310, yPos + 6);
        doc.text('SEVERITY', 430, yPos + 6);
        doc.text('STATUS', 495, yPos + 6);
        yPos += 20;
        doc.fillColor('#334155').font('Helvetica');
        // List Alerts
        alerts.forEach((alert) => {
            // Check if page overflow
            if (yPos > 720) {
                doc.addPage();
                yPos = 50;
                // Re-draw small headers
                doc.rect(50, yPos, 495, 20).fill(primaryColor);
                doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
                doc.text('ID', 55, yPos + 6);
                doc.text('TIMESTAMP', 110, yPos + 6);
                doc.text('CAMERA', 200, yPos + 6);
                doc.text('TYPE', 310, yPos + 6);
                doc.text('SEVERITY', 430, yPos + 6);
                doc.text('STATUS', 495, yPos + 6);
                yPos += 20;
                doc.fillColor('#334155').font('Helvetica');
            }
            // Draw Row Border
            doc.rect(50, yPos, 495, 24).strokeColor('#F1F5F9').lineWidth(1).stroke();
            // Print fields
            const readableTime = new Date(alert.timestamp).toLocaleString();
            // Determine severity color
            let sevColor = '#64748B';
            if (alert.severity === 'critical')
                sevColor = '#EF4444';
            else if (alert.severity === 'high')
                sevColor = '#F97316';
            else if (alert.severity === 'medium')
                sevColor = '#F59E0B';
            doc.fillColor('#475569').fontSize(7);
            doc.text(alert.id.substring(0, 8), 55, yPos + 8);
            doc.text(readableTime, 110, yPos + 8);
            doc.text(alert.cameraName, 200, yPos + 8, { width: 100, height: 10 });
            doc.font('Helvetica-Bold').text(alert.type, 310, yPos + 8, { width: 110, height: 10 });
            doc.fillColor(sevColor).text(alert.severity.toUpperCase(), 430, yPos + 8);
            // Status formatting
            const statColor = alert.status === 'resolved' ? '#10B981' : (alert.status === 'investigating' ? '#3B82F6' : '#EF4444');
            doc.fillColor(statColor).text(alert.status.toUpperCase(), 495, yPos + 8);
            yPos += 24;
        });
        // Page numbers
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.fillColor(textMuted).fontSize(7);
            doc.text(`Page ${i + 1} of ${range.count}`, 50, 770, { align: 'center', width: 495 });
        }
        doc.end();
    }
    catch (err) {
        console.error('PDF Report generation failed', err);
        res.status(500).json({ error: 'Failed to generate PDF report' });
    }
});
exports.default = router;
