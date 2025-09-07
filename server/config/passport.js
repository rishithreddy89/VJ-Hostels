const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Student = require('../models/StudentModel.js');
const Admin = require('../models/AdminModel.js');

// Helper to get base URL based on environment
const getBaseUrl = () => {
    return process.env.NODE_ENV === 'production' 
        ? process.env.PROD_SERVER_URL 
        : process.env.SERVER_URL;
};

// Helper to validate institutional email
const isInstitutionalEmail = (email) => {
    return email.toLowerCase().endsWith('@vnrvjiet.in');
};

// Student Google OAuth
passport.use('google-student', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${getBaseUrl()}${process.env.GOOGLE_STUDENT_CALLBACK_URL}`,
    proxy: true,
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        console.log('Profile:', profile); // Debug log
        const email = profile.emails[0].value;
        
        if (!email.toLowerCase().endsWith('@vnrvjiet.in')) {
            console.log('Invalid email domain:', email);
            return done(null, false, { message: 'Only @vnrvjiet.in email addresses are allowed' });
        }

        // Try to find student by email first
        let student = await Student.findOne({ email: email });
        if (!student) {
            student = await Student.findOne({ googleId: profile.id });
        }

        if (!student) {
            const rollNumber = email.split('@')[0];
            student = await Student.create({
                googleId: profile.id,
                username: profile.displayName,
                name: profile.displayName,
                email: email,
                password: 'N/A',
                rollNumber: rollNumber,
                phoneNumber: 'N/A',
                parentMobileNumber: 'N/A',
                is_active: true
            });
            console.log('Created new student:', student);
        } else {
            // Update googleId if not set
            if (!student.googleId) {
                student.googleId = profile.id;
                await student.save();
            }
            console.log('Found existing student:', student);
        }

        return done(null, student);
    } catch (err) {
        console.error('Google OAuth Error:', err);
        return done(err, null);
    }
}));

// Admin Google OAuth
passport.use('google-admin', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${getBaseUrl()}${process.env.GOOGLE_ADMIN_CALLBACK_URL}`,
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        if (!email.endsWith('@vnrvjiet.in')) {
            return done(null, false, { message: 'Only institutional emails allowed' });
        }

        let admin = await Admin.findOne({ googleId: profile.id });
        if (!admin) {
            admin = await Admin.create({
                googleId: profile.id,
                username: profile.displayName,
                name: profile.displayName,
                email: email,
                role: 'admin',
            });
        }

        return done(null, admin);
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
  done(null, { id: user.id, role: user.role || 'student' }); 
});

passport.deserializeUser(async (data, done) => {
  try {
    let user;
    if (data.role === 'admin') {
      user = await Admin.findById(data.id);
    } else {
      user = await Student.findById(data.id);
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
