const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Request Headers:', req.headers);
    console.log('Request Body:', req.body);
    next();
});

app.get('/', (req,res)=>{
    res.send('This is Toruk Server , working fine')
})

// Define Mongoose models
const Admin = mongoose.model('Admin', new mongoose.Schema({
    email: String,
    password: String,
    resetToken: String,
    resetTokenExpiration: Date
}));

const Company = mongoose.model('Company', new mongoose.Schema({
    email: String,
    password: String,
    resetToken: String,
    resetTokenExpiration: Date
}));

const EmployeeInfo = mongoose.model('EmployeeInfo', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    employmentType: { type: String, required: true, enum: ["Full-Time", "Part-Time", "Contract"] },
    workMode: { type: String, required: true, enum: ["On-Site", "Hybrid", "Remote"] },
    residentialAddress: { type: String, required: true },
    residenceLatitude: { type: Number, required: true },
    residenceLongitude: { type: Number, required: true },
    primaryOfficeAddress: { type: String, required: true },
    primaryOfficeLatitude: { type: Number, required: true },
    primaryOfficeLongitude: { type: Number, required: true },
    secondaryOfficeAddress: { type: String },
    secondaryOfficeLatitude: { type: Number },
    secondaryOfficeLongitude: { type: Number },
    distanceToPrimary: { type: Number, required: true, min: 0 },
    distanceToSecondary: { type: Number, min: 0 },
    preferredOfficeLocation: { type: String, enum: ["Primary", "Secondary", "Hybrid"] }
}, { timestamps: true }));

const Category6TravelData = mongoose.model('Category6TravelData', new mongoose.Schema({ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    employmentType: { type: String, required: true, enum: ["Full-Time", "Part-Time", "Contract"] },
    purposeOfTravel: { type: String, required: true },
    tripsPerYear: { type: Number, required: true, min: 0 },
    distancePerTrip: { type: Number, required: true, min: 0 },
    travelDuration: { type: Number, required: true, min: 0 },
    modeOfTransport: { type: String, required: true },
    travelClass: { type: String, required: true },
    vehicleType: { type: String },
    vehicleMakeModel: { type: String },
    fuelType: { type: String, required: true, enum: ["Petrol", "Diesel", "Electric", "Hybrid", "Biofuel"] },
    fuelBlendComposition: { type: Number, min: 0 },
    departureLocation: { type: String, required: true },
    departureLatitude: { type: Number, required: true },
    departureLongitude: { type: Number, required: true },
    arrivalLocation: { type: String, required: true },
    arrivalLatitude: { type: Number, required: true },
    arrivalLongitude: { type: Number, required: true },
    urbanRuralPercentage: { type: Number, required: true, min: 0, max: 100 },
    congestionLevel: { type: String, enum: ["High", "Medium", "Low"] },
    layovers: { type: String },
    fuelConsumptionPerKm: { type: Number, required: true, min: 0 },
    carbonEmissionFactor: { type: Number, required: true, min: 0 },
    energySource: { type: String, enum: ["Coal", "Renewable", "Grid Mix"] },
    carbonOffsetMeasures: { type: String },
    totalTravelCost: { type: Number, required: true, min: 0 },
    approvedBy: { type: String, required: true },
    approvalDate: { type: Date, required: true },
    reimbursementMethod: { type: String, enum: ["Direct Payment", "Employee Reimbursement"] }
}, { timestamps: true }));

const Category7TravelData = mongoose.model('Category7TravelData', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    employmentType: { type: String, required: true, enum: ["Full-Time", "Part-Time", "Contract"] },
    workLocation: { type: String, required: true },
    workArrangement: { type: String, required: true, enum: ["Onsite", "Hybrid", "Remote"] },
    averageWorkdaysPerWeek: { type: Number, required: true },
    totalDistancePerTrip: { type: Number, required: true },
    totalDistancePerWeek: { type: Number, required: true },
    residentialAddress: { type: String, required: true },
    homeLatitude: { type: Number, required: true },
    homeLongitude: { type: Number, required: true },
    primaryOfficeAddress: { type: String, required: true },
    officeLatitude: { type: Number, required: true },
    officeLongitude: { type: Number, required: true },
    additionalOfficeLocations: { type: String },
    primaryModeOfTransport: { type: String, required: true },
    alternativeModeOfTransport: { type: String },
    vehicleType: { type: String },
    vehicleMakeModel: { type: String },
    fuelType: { type: String, required: true, enum: ["Petrol", "Diesel", "Electric", "Hybrid", "Biofuel"] },
    fuelBlendComposition: { type: Number },
    carpoolingDetails: { type: Number },
    publicTransportUsage: { type: Boolean, required: true },
    urbanRuralPercentage: { type: Number, required: true },
    congestionLevel: { type: String, enum: ["High", "Medium", "Low"] },
    travelTime: { type: Number, required: true },
    trafficConditions: { type: String, enum: ["Heavy", "Moderate", "Light"] },
    fuelConsumptionPerKm: { type: Number, required: true },
    carbonEmissionFactor: { type: Number, required: true },
    energySource: { type: String, enum: ["Coal", "Renewable", "Grid Mix"] },
    companyInitiatives: { type: String },
    totalMonthlyTravelCost: { type: Number, required: true },
    reimbursementEligibility: { type: Boolean, required: true },
    reimbursementAmount: { type: Number }
}, { timestamps: true }));

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB connected successfully');
    return mongoose.connection.db.admin().ping();
})
.then(() => {
    console.log('MongoDB ping successful');
})
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Authentication middleware
const authenticateUser = (req, res, next) => {
    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else {
        // Fallback to cookie
        token = req.cookies.session_token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    jwt.verify(token, 'secret', (err, decoded) => {
        if (err) {
            console.error('Token verification error:', err);
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = decoded;
        next();
    });
};

// Middleware to check admin role
const isAdmin = (req, res, next) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    next();
};

// Middleware to check company role
const isCompany = (req, res, next) => {
    if (req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    next();
};

// Middleware to check if user is either admin or company
const isAdminOrCompany = (req, res, next) => {
    if (!req.user.isAdmin && !req.user.isCompany) {
        return res.status(403).json({ error: 'Forbidden - Only admin and company users can access this resource' });
    }
    next();
};

// Auth routes
app.post('/auth/signup', async (req, res) => {
    const { email, password, role } = req.body;
    console.log('Signup request received:', { email, role });

    try {
        const existingAdmin = await Admin.findOne({ email });
        const existingCompany = await Company.findOne({ email });
        
        if (existingAdmin || existingCompany) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await argon2.hash(password);
        let user;

        if (role === 'admin') {
            user = new Admin({ email, password: hashedPassword });
        } else {
            user = new Company({ email, password: hashedPassword });
        }

        await user.save();
        console.log('User registered successfully:', email);
        res.status(201).json({ message: `${role} registered successfully` });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

app.post('/auth/login', async (req, res) => {
    console.log('Login request received:', req.body);
    const { email, password } = req.body;

    try {
        const adminUser = await Admin.findOne({ 
            email: { $regex: new RegExp('^' + email + '$', 'i') } 
        });
        
        let user = adminUser;
        if (!user) {
            user = await Company.findOne({ 
                email: { $regex: new RegExp('^' + email + '$', 'i') } 
            });
        }

        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await argon2.verify(user.password, password);
        if (!validPassword) {
            console.log('Invalid password for:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isAdmin = user instanceof Admin;
        const token = jwt.sign({ id: user._id, email, isAdmin }, 'secret', { expiresIn: '1h' });

        res.cookie('session_token', token, { 
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 3600000
        });
        
        console.log('Login successful for:', email);
        res.json({ 
            token,
            user: {
                id: user._id,
                email: user.email,
                isAdmin
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

app.post('/auth/logout', (req, res) => {
    res.clearCookie('session_token');
    res.json({ message: 'Logged out successfully' });
});

// Employee Info Routes
app.post('/employee-info', [authenticateUser, isAdminOrCompany], async (req, res) => {
    console.log('Employee info submission from:', req.user.email);
    try {
        const employeeInfo = new EmployeeInfo({
            ...req.body,
            userId: req.body.userId || req.user.id
        });
        await employeeInfo.save();
        console.log('Employee info saved successfully');
        res.status(201).json(employeeInfo);
    } catch (error) {
        console.error('Employee info save error:', error);
        res.status(500).json({ error: 'Failed to save employee info', details: error.message });
    }
});

app.get('/employee-info', [authenticateUser, isAdminOrCompany], async (req, res) => {
    try {
        const data = await EmployeeInfo.find({ 
            userId: { $in: [req.user.id, req.body.userId] }
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch employee info', details: error.message });
    }
});

// Category 6 Travel Data Routes
app.post('/category6/travel-data', [authenticateUser, isAdminOrCompany], async (req, res) => {
    console.log('Category 6 data submission from:', req.user.email);
    try {
        const category6Data = new Category6TravelData({
            ...req.body,
            userId: req.body.userId || req.user.id
        });
        await category6Data.save();
        console.log('Category 6 data saved successfully');
        res.status(201).json(category6Data);
    } catch (error) {
        console.error('Category 6 save error:', error);
        res.status(500).json({ error: 'Failed to save Category 6 data', details: error.message });
    }
});

app.get('/category6/travel-data', [authenticateUser, isAdminOrCompany], async (req, res) => {
    try {
        const data = await Category6TravelData.find({ 
            userId: { $in: [req.user.id, req.body.userId] }
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Category 6 data', details: error.message });
    }
});

// Category 7 Travel Data Routes
app.post('/category7/travel-data', [authenticateUser, isAdminOrCompany], async (req, res) => {
    console.log('Category 7 data submission from:', req.user.email);
    try {
        const category7Data = new Category7TravelData({
            ...req.body,
            userId: req.body.userId || req.user.id
        });
        await category7Data.save();
        console.log('Category 7 data saved successfully');
        res.status(201).json(category7Data);
    } catch (error) {
        console.error('Category 7 save error:', error);
        res.status(500).json({ error: 'Failed to save Category 7 data', details: error.message });
    }
});

app.get('/category7/travel-data', [authenticateUser, isAdminOrCompany], async (req, res) => {
    try {
        const data = await Category7TravelData.find({ 
            userId: { $in: [req.user.id, req.body.userId] }
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Category 7 data', details: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// MongoDB connection event listeners
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// Start server
const PORT = process.env.PORT || 6006;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});