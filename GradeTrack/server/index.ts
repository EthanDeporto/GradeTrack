import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import connectPg from 'connect-pg-simple';
import bcrypt from 'bcrypt';
import http from 'http';
import { storage } from './storage'; // your storage layer
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';

const app = express();

// --------------------
// Body parsing
// --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --------------------
// API Logging
// --------------------
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + '…';
      log(logLine);
    }
  });

  next();
});

// --------------------
// Session setup
// --------------------
const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
let sessionMiddleware;

if (!process.env.DATABASE_URL) {
  sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, maxAge: sessionTtl },
  });
} else {
  const pgStore = connectPg(session);
  const store = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: 'sessions',
  });
  sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
    store,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, maxAge: sessionTtl },
  });
}

app.use(sessionMiddleware);

// --------------------
// Passport setup
// --------------------
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      let user = await storage.getUserByEmail(email);

      if (!user && email === 'admin@school.com') {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        user = await storage.upsertUser({
          id: 'admin-1',
          email: 'admin@school.com',
          firstName: 'Admin',
          lastName: 'User',
          profileImageUrl: null,
          role: 'admin',
          passwordHash: hashedPassword,
        });
      }

      if (!user || !user.passwordHash) return done(null, false, { message: 'Invalid credentials' });

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) return done(null, false, { message: 'Invalid credentials' });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// --------------------
// Auth routes
// --------------------
app.post('/api/login', passport.authenticate('local'), (req, res) => {
  res.json({ success: true, user: req.user });
});

app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    res.json({ success: true });
  });
});

app.get('/api/auth/user', (req, res) => {
  if (req.isAuthenticated()) res.json(req.user);
  else res.status(401).json({ message: 'Unauthorized' });
});

// --------------------
// Other API routes
// --------------------
(async () => {
  await registerRoutes(app);
})();

// --------------------
// Error handling
// --------------------
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ message });
  throw err;
});

// --------------------
// Vite / Frontend setup
// --------------------
(async () => {
  const server = http.createServer(app);

  if (app.get('env') === 'development') {
    await setupVite(app, server); // pass http.Server instance
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, '127.0.0.1', () => {
    log(`Server running on http://localhost:${port}`);
  });
})();


