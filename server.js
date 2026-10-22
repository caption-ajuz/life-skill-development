import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';
import bcrypt from 'bcryptjs';

import connectDB from './server/config/db.js';
import User from './server/models/User.js';
import CampaignConfig from './server/models/CampaignConfig.js';

// Route imports
import authRouter from './server/routes/auth.js';
import usersRouter from './server/routes/users.js';
import teamsRouter from './server/routes/teams.js';
import stockRouter from './server/routes/stock.js';
import distributionsRouter from './server/routes/distributions.js';
import collectionsRouter from './server/routes/collections.js';
import transfersRouter from './server/routes/transfers.js';
import areasRouter from './server/routes/areas.js';
import dashboardRouter from './server/routes/dashboard.js';
import reportsRouter from './server/routes/reports.js';
import uploadsRouter from './server/routes/uploads.js';
import syncRouter from './server/routes/sync.js';
import expensesRouter from './server/routes/expenses.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    credentials: true
  }
});

app.set('io', io);

// Security & Optimization Middleware
app.use(
  helmet({
    contentSecurityPolicy: false // Allows CDN scripts (Preact, HTM) & SVG data URIs
  })
);
app.use(compression());
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Assets
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/stock', stockRouter);
app.use('/api/distributions', distributionsRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/transfers', transfersRouter);
app.use('/api/areas', areasRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/expenses', expensesRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Life Skill Course API'
  });
});

// SPA Fallback: Serve index.html for all non-API GET requests
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error occurred.'
  });
});

// Socket.io Real-Time connection management
io.on('connection', (socket) => {
  // Client can register their room
  socket.on('join', ({ role, teamId }) => {
    if (role) socket.join(`role:${role}`);
    if (teamId) socket.join(`team:${teamId}`);
  });

  socket.on('disconnect', () => {});
});

// Seed default Admin & Campaign Config on startup
async function seedDefaults() {
  try {
    const adminExists = await User.findOne({ role: 'super_admin' });
    if (!adminExists) {
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      await User.create({
        username: 'admin',
        passwordHash,
        fullName: 'Super Admin',
        phone: '9876543210',
        role: 'super_admin',
        isActive: true
      });
      console.log('✅ Default Super Admin created (username: admin, password: ' + defaultPassword + ')');
    }

    const configExists = await CampaignConfig.findOne();
    if (!configExists) {
      await CampaignConfig.create({
        totalStock: 5000,
        calendarPrice: 100,
        initialInvestment: 20000,
        printingCost: 50000,
        campaignYear: new Date().getFullYear(),
        notes: 'Markazul Hidayathil Islamiyya Calendar Campaign'
      });
      console.log('✅ Default Campaign Configuration initialized');
    }
  } catch (err) {
    console.error('Seeding error:', err.message);
  }
}

// Start Server
const PORT = process.env.PORT || 3000;

connectDB().then(async () => {
  await seedDefaults();
  server.listen(PORT, () => {
    console.log(`🚀 Life Skill Course server listening on port ${PORT}`);
    console.log(`🌐 Application URL: http://localhost:${PORT}`);
  });
});

export { app, server, io };
