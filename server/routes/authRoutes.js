const express = require('express');
const passport = require('passport');
const router = express.Router();
const jwt = require("jsonwebtoken");
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

function generateJwt(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role || "student"
    },
    process.env.JWT_SECRET, 
    { expiresIn: "1h" }
  );
}

// Helper to get client URL based on environment
const getClientUrl = () => {
    return process.env.NODE_ENV === 'production' 
        ? process.env.PROD_CLIENT_URL 
        : process.env.CLIENT_URL;
};

const getAdminClientUrl = () => {
    return process.env.NODE_ENV === 'production' 
        ? process.env.PROD_ADMIN_CLIENT_URL 
        : process.env.ADMIN_CLIENT_URL;
};

// Student Google OAuth with improved error handling
router.get('/google', (req, res, next) => {
  const returnTo = req.query.returnTo || '/';
  req.session.returnTo = returnTo;
  
  passport.authenticate('google-student', {
    scope: ['profile', 'email'],
    hostedDomain: 'vnrvjiet.in', // Restrict to institutional domain
    prompt: 'select_account' // Always show account selector
  })(req, res, next);
});

router.get('/student/callback', (req, res, next) => {
  passport.authenticate('google-student', (err, user, info) => {
    const clientUrl = getClientUrl();
    
    if (err) {
      console.error("Authentication error:", err);
      return res.redirect(`${clientUrl}/login?error=auth_failed&message=${encodeURIComponent(err.message)}`);
    }

    if (!user) {
      console.log("Auth failed:", info?.message || 'Unknown reason');
      return res.redirect(`${clientUrl}/login?error=unauthorized&message=${encodeURIComponent(info?.message || 'Only @vnrvjiet.in emails are allowed')}`);
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return res.redirect(`${clientUrl}/login?error=login_failed`);
      }

      const token = generateJwt(user);
      const returnTo = req.session.returnTo || '/';
      delete req.session.returnTo;

      return res.redirect(`${clientUrl}/auth/callback?token=${token}&returnTo=${encodeURIComponent(returnTo)}`);
    });
  })(req, res, next);
});

// Admin Google OAuth
router.get('/google/admin', 
    passport.authenticate('google-admin', { scope: ['profile', 'email'] })
);

router.get(
  '/admin/callback',
  (req, res, next) => {
    passport.authenticate('google-admin', (err, user, info) => {
      if (err) {
        console.error("Admin authentication error:", err);
        return res.redirect(`${getAdminClientUrl()}/login?error=auth_failed`);
      }

      if (!user) {
        console.log("No admin user found or unauthorized email");
        return res.redirect(`${getAdminClientUrl()}/login?error=unauthorized`);
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error("Admin login error:", err);
          return res.redirect(`${getAdminClientUrl()}/login?error=login_failed`);
        }

        console.log("Successful admin login for user:", user);
        const token = generateJwt(user);

        // Redirect with token and admin email as URL parameters for frontend to handle
        return res.redirect(`${getAdminClientUrl()}/auth/callback?token=${token}&admin=${encodeURIComponent(user.email)}`);
      });
    })(req, res, next);
  }
);

// OTP System Authentication Routes
router.post('/guard/login', AuthController.guardLogin);
router.post('/student/login', AuthController.studentLogin);
router.post('/warden/login', AuthController.wardenLogin);
router.get('/verify', authenticateToken, AuthController.verifyToken);

// Logout route
router.get('/logout', (req, res) => {
    req.logout(err => {
        if(err) return next(err);
        res.redirect('/');
    })
})

module.exports = router;
