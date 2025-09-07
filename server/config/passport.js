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

// Student Google OAuth
passport.use('google-student', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${getBaseUrl()}${process.env.GOOGLE_STUDENT_CALLBACK_URL}`,
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        if (!email.endsWith('@vnrvjiet.in')) {
            return done(null, false, { message: 'Only institutional emails allowed' });
        }

        let student = await Student.findOne({ googleId: profile.id });
        if (!student) {
            student = await Student.create({
                googleId: profile.id,
                username: profile.displayName,
                name: profile.displayName,
                email: email,
                password: 'N/A',
                rollNumber: 'N/A',
                phoneNumber: 'N/A',
                parentMobileNumber: 'N/A',
            });
        }

        return done(null, student);
    } catch (err) {
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
