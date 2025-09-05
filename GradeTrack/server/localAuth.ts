import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import bcrypt from "bcrypt";

// Simple local authentication for development
export function getSession() {
  const sessionTtl = 5 * 60 * 1000; // 1 week
  
  // Use memory store if no DATABASE_URL for simplicity
  if (!process.env.DATABASE_URL) {
    return session({
      secret: process.env.SESSION_SECRET || "dev-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // Allow non-HTTPS for local development
        maxAge: sessionTtl,
      },
    });
  }

  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Allow non-HTTPS for local development
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for username/password authentication
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email: string, password: string, done) => {
      try {
        // For local development, create a default admin user if none exists
        let user = await storage.getUserByEmail(email);
        
        if (!user && email === 'admin@school.com') {
          // Create default admin user
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

         if (!user && email === 'student@school.com') {
        const hashedPassword = await bcrypt.hash('student123', 10);
        user = await storage.upsertUser({
          id: 'student-1',
          email: 'student@school.com',
          firstName: 'Student',
          lastName: 'Default',
          profileImageUrl: null,
          role: 'student',
          passwordHash: hashedPassword,
        });
      }

      if (!user && email === 'teacher@school.com') {
        const hashedPassword = await bcrypt.hash('teacher123', 10);
        user = await storage.upsertUser({
          id: 'teacher-1',
          email: 'teacher@school.com',
          firstName: 'Teacher',
          lastName: 'Default',
          profileImageUrl: null,
          role: 'teacher',
          passwordHash: hashedPassword,
        });
      }
        
        if (!user || !user.passwordHash) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Login route
  app.post('/api/login', passport.authenticate('local'), (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Determine redirect based on role
  let redirectTo = '/';
if (req.user.role === 'admin') {
  redirectTo = '/admin/dashboard';
} else if (req.user.role === 'student') {
  redirectTo = '/student/dashboard';
} else if (req.user.role === 'teacher') {
  redirectTo = '/teacher/dashboard';
}

  res.json({ success: true, user: req.user, redirectTo });
});

  // Logout route
  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  // Get current user route
  app.get('/api/auth/user', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};