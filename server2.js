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
const { body, validationResult } = require('express-validator');

// Define Mongoose models
const Company = mongoose.model('Company', new mongoose.Schema({
    email: String,
    token: String,
    token_expiration: Date
}));

const Admin = mongoose.model('Admin', new mongoose.Schema({
    email: String,
    password: String
}));

const Employee = mongoose.model('Employee', new mongoose.Schema({
    employee_id: String,
    name: String,
    department: String,
    designation: String,
    employment_type: String,
    work_mode: String,
    residential_address: String,
    latitude: Number,
    longitude: Number,
    primary_office_address: String,
    primary_office_latitude: Number,
    primary_office_longitude: Number,
    secondary_office_address: String,
    secondary_office_latitude: Number,
    secondary_office_longitude: Number,
    distance_to_primary_office: Number,
    distance_to_secondary_office: Number,
    preferred_office_location: String,
    company_id: mongoose.Schema.Types.ObjectId,
    mode_of_transport: String,
    distance_traveled: Number,
    fuel_type: String,
    emission_factor: Number,
    number_of_trips: Number,
    travel_frequency: String,
    vehicle_efficiency: Number
}));

const Project = mongoose.model('Project', new mongoose.Schema({
    company_id: mongoose.Schema.Types.ObjectId,
    name: String,
    description: String,
    start_date: Date,
    end_date: Date
}));

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());
const cors = require('cors');
app.use(cors({ origin: ['*' ,'http://localhost:5173'] }));

// MongoDB Connection
mongoose.connect('mongodb+srv://deepp:SIfNjOlvqAVZ85uj@cluster0.i66rp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Utility Function to Send Email
const sendMagicLinkEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.zeptomail.in',
        port: 587,
        auth: {
            user: 'emailapikey',
            pass: 'PHtE6r1bQ7y/ijMtpxAA5/6xRMGmYd8sqO5jfwJEuN0QWaJQHE0Aqd0owzSwox8oBqFER/aYnIhv576a57iNd27kMmhMVWqyqK3sx/VYSPOZsbq6x00et18acUPZUI7pd9Fr0S3Xud6X'
        }
    });

    const mailOptions = {
        from: 'noreply@orelse.ai',
        to: email,
        subject: 'Verify your email',
        html: `<a href="http://localhost:3000/auth/login/${token}">Click here to log in</a>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent to ' + email);
    } catch (err) {
        console.error('Error sending email:', err);
        throw err;
    }
};

// Middleware to Verify JWT Token for Company
const verifyCompanyToken = (req, res, next) => {
    const { company_session_token } = req.cookies;

    if (!company_session_token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(company_session_token, 'secret', (err, decoded) => {
        if (err || decoded.isAdmin) return res.status(401).json({ error: 'Unauthorized' });
        req.user = decoded;
        next();
    });
};

// Middleware to Verify JWT Token for Admin
const verifyAdminToken = (req, res, next) => {
    const { admin_session_token } = req.cookies;

    if (!admin_session_token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(admin_session_token, 'secret', (err, decoded) => {
        if (err || !decoded.isAdmin) return res.status(401).json({ error: 'Unauthorized' });
        req.user = decoded;
        next();
    });
};

// Route to serve visualization page
app.get('/admin/visualization',(req, res) => {
    res.sendFile(__dirname + '/public/visualization.html');
});

// Company Signup (Email Only)
app.post('/auth/signup', async (req, res) => {
    console.log(req)
    const { email } = req.body;
    console.log('asIHSAIFAHSIAHIOSDHI',email)
    const token = uuidv4();
    const tokenExpiration = new Date(Date.now() + 10 * 60 * 10000); // 10 minutes expiration

    try {
        // Check if the company already exists
        console.log("MONGO DB CHECK");
        const existingCompany = await Company.findOne({ email });

        if (existingCompany) {
            // Update the existing company with a new token and expiration
            existingCompany.token = token;
            existingCompany.token_expiration = tokenExpiration;
            await existingCompany.save();
        } else {
            // Insert a new company
            const newCompany = new Company({ email, token, token_expiration: tokenExpiration });
            await newCompany.save();
        }

        await sendMagicLinkEmail(email, token);
        res.status(200).json({ message: 'Magic link sent to your email' });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Admin Signup (Email and Password)
app.post('/auth/admin/signup', async (req, res) => {
    const { email, password } = req.body;

    try {
        const hashedPassword = await argon2.hash(password);
        const newAdmin = new Admin({ email, password: hashedPassword });
        await newAdmin.save();

        res.status(200).json({ message: 'Admin registered successfully' });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Company Login (Using Magic Link)
app.get('/auth/login/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const company = await Company.findOne({ token, token_expiration: { $gt: new Date() } });

        if (!company) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const sessionToken = jwt.sign({ id: company._id, email: company.email, isAdmin: false }, 'secret', { expiresIn: '1h' });

        res.cookie('company_session_token', sessionToken, { httpOnly: true });
        res.redirect('http://localhost:5173/onboarding');
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Admin Login (Email and Password)
app.post('/auth/admin/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email });

        if (!admin || !(await argon2.verify(admin.password, password))) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const sessionToken = jwt.sign({ id: admin._id, email: admin.email, isAdmin: true }, 'secret', { expiresIn: '1h' });

        res.cookie('admin_session_token', sessionToken, { httpOnly: true });
        res.redirect('/admin-dashboard');
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Company Dashboard (Protected)
app.get('/company-dashboard', verifyCompanyToken, (req, res) => {
    res.send(`Welcome to the Company Dashboard, ${req.user.email}`);
});

// Admin Dashboard (Protected)
app.get('/admin-dashboard', verifyAdminToken, (req, res) => {
    res.send(`Welcome to the Admin Dashboard, ${req.user.email}`);
});

// CRUD Operations for Employee Data
// Create Employee
app.post('/company/employees', verifyCompanyToken, async (req, res) => {
    const { employee_id, name, department, designation, employment_type, work_mode, residential_address, latitude, longitude, primary_office_address, primary_office_latitude, primary_office_longitude, secondary_office_address, secondary_office_latitude, secondary_office_longitude, distance_to_primary_office, distance_to_secondary_office, preferred_office_location } = req.body;
    const company_id = req.user.id;

    const newEmployee = new Employee({ employee_id, name, department, designation, employment_type, work_mode, residential_address, latitude, longitude, primary_office_address, primary_office_latitude, primary_office_longitude, secondary_office_address, secondary_office_latitude, secondary_office_longitude, distance_to_primary_office, distance_to_secondary_office, preferred_office_location, company_id });
    await newEmployee.save();

    res.status(201).json({ message: 'Employee added successfully' });
});

// Get Employees for a Company
app.get('/company/employees', verifyCompanyToken, async (req, res) => {
    const companyId = req.user.id;

    try {
        const employees = await Employee.find({ company_id: companyId });
        res.json(employees);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Update Employee
app.put('/company/employees/:id', verifyCompanyToken, async (req, res) => {
    const { id } = req.params;
    const { employee_id, name, department, designation, employment_type, work_mode, residential_address, latitude, longitude, primary_office_address, primary_office_latitude, primary_office_longitude, secondary_office_address, secondary_office_latitude, secondary_office_longitude, distance_to_primary_office, distance_to_secondary_office, preferred_office_location, ...updates } = req.body;

    try {
        const employee = await Employee.findOneAndUpdate({ _id: id, company_id: req.user.id }, { employee_id, name, department, designation, employment_type, work_mode, residential_address, latitude, longitude, primary_office_address, primary_office_latitude, primary_office_longitude, secondary_office_address, secondary_office_latitude, secondary_office_longitude, distance_to_primary_office, distance_to_secondary_office, preferred_office_location, ...updates }, { new: true });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({ message: 'Employee updated successfully' });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Delete Employee
app.delete('/company/employees/:id', verifyCompanyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const employee = await Employee.findOneAndDelete({ _id: id, company_id: req.user.id });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Other routes and functionalities...

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
//Changes