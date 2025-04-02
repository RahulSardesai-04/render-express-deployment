// const express = require('express');
// const multer = require('multer');
// const csv = require('csv-parser');
// const fs = require('fs');
// const mysql = require('mysql2/promise');
// const nodemailer = require('nodemailer');
// const { v4: uuidv4 } = require('uuid');
// const argon2 = require('argon2');
// const jwt = require('jsonwebtoken');
// const cookieParser = require('cookie-parser');
// const { body, validationResult } = require('express-validator');

// const app = express();

// const upload = multer({ dest: 'uploads/' });

// app.use(express.static('public'));


// app.use(express.json());
// app.use(cookieParser());

// const cors = require('cors');

// const corsOptions = {
//     origin: 'http://localhost:3000/admin/companies', // Replace with your front-end's origin
//     // credentials: true, // Allow cookies to be sent
// };

// app.use(cors(corsOptions));


// // Database Connection
// const dbConfig = {
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database: 'toruk_db',
// };

// const pool = mysql.createPool(dbConfig);

// // Utility Function to Send Email
// const sendMagicLinkEmail = async (email, token) => {
//     const transporter = nodemailer.createTransport({
//         host: 'smtp.zeptomail.in',
//         port: 587,
//         auth: {
//             user: 'emailapikey',
//             pass: 'PHtE6r1bQ7y/ijMtpxAA5/6xRMGmYd8sqO5jfwJEuN0QWaJQHE0Aqd0owzSwox8oBqFER/aYnIhv576a57iNd27kMmhMVWqyqK3sx/VYSPOZsbq6x00et18acUPZUI7pd9Fr0S3Xud6X'
//         }
//     });

//     const mailOptions = {
//         from: 'noreply@orelse.ai',
//         to: email,
//         subject: 'Verify your email',
//         html: `<a href="http://localhost:3000/auth/login/${token}">Click here to log in</a>`,
//     };

//     try {
//         await transporter.sendMail(mailOptions);
//         console.log('Email sent to ' + email);
//     } catch (err) {
//         console.error('Error sending email:', err);
//         throw err;
//     }
// };

// // Middleware to Verify JWT Token for Company
// const verifyCompanyToken = (req, res, next) => {
//     const { company_session_token } = req.cookies;

//     if (!company_session_token) return res.status(401).json({ error: 'Unauthorized' });

//     jwt.verify(company_session_token, 'secret', (err, decoded) => {
//         if (err || decoded.isAdmin) return res.status(401).json({ error: 'Unauthorized' });
//         req.user = decoded;
//         next();
//     });
// };

// // Middleware to Verify JWT Token for Admin
// const verifyAdminToken = (req, res, next) => {
//     const { admin_session_token } = req.cookies;

//     if (!admin_session_token) return res.status(401).json({ error: 'Unauthorized' });

//     jwt.verify(admin_session_token, 'secret', (err, decoded) => {
//         if (err || !decoded.isAdmin) return res.status(401).json({ error: 'Unauthorized' });
//         req.user = decoded;
//         next();
//     });
// };


// // Route to serve visualization page
// app.get('/admin/visualization',(req, res) => {
//     res.sendFile(__dirname + '/public/visualization.html');
// });

// // Company Signup (Email Only)
// app.post('/auth/signup', async (req, res) => {
//     const { email } = req.body;
//     const token = uuidv4();
//     const tokenExpiration = new Date(Date.now() + 10 * 60 * 10000); // 10 minutes expiration

//     try {
//         const connection = await pool.getConnection();

//         // Check if the company already exists
//         const [existingCompany] = await connection.query(
//             'SELECT * FROM companies WHERE email = ?',
//             [email]
//         );

//         if (existingCompany.length > 0) {
//             // Update the existing company with a new token and expiration
//             await connection.query(
//                 'UPDATE companies SET token = ?, token_expiration = ? WHERE email = ?',
//                 [token, tokenExpiration, email]
//             );
//         } else {
//             // Insert a new company
//             await connection.query(
//                 'INSERT INTO companies (email, token, token_expiration) VALUES (?, ?, ?)',
//                 [email, token, tokenExpiration]
//             );
//         }
//         connection.release();

//         await sendMagicLinkEmail(email, token);
//         res.status(200).json({ message: 'Magic link sent to your email' });
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ error: 'Internal server error', details: err.message });
//     }
// });

// // Admin Signup (Email and Password)
// app.post('/auth/admin/signup', async (req, res) => {
//     const { email, password } = req.body;

//     try {
//         const hashedPassword = await argon2.hash(password);
//         const connection = await pool.getConnection();
//         await connection.query(
//             'INSERT INTO admins (email, password) VALUES (?, ?)',
//             [email, hashedPassword]
//         );
//         connection.release();

//         res.status(200).json({ message: 'Admin registered successfully' });
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ error: 'Internal server error', details: err.message });
//     }
// });

// // Company Login (Using Magic Link)
// app.get('/auth/login/:token', async (req, res) => {
//     const { token } = req.params;

//     try {
//         const connection = await pool.getConnection();
//         const [results] = await connection.query(
//             'SELECT * FROM companies WHERE token = ? AND token_expiration > NOW()',
//             [token]
//         );

//         if (results.length === 0) {
//             connection.release();
//             return res.status(400).json({ error: 'Invalid or expired token' });
//         }

//         const user = results[0];
//         const sessionToken = jwt.sign({ id: user.id, email: user.email, isAdmin: false }, 'secret', { expiresIn: '1h' });

//         connection.release();

//         res.cookie('company_session_token', sessionToken, { httpOnly: true });
//         res.redirect('/company-dashboard');
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ error: 'Internal server error', details: err.message });
//     }
// });

// // Admin Login (Email and Password)
// app.post('/auth/admin/login', async (req, res) => {
//     const { email, password } = req.body;

//     try {
//         const connection = await pool.getConnection();
//         const [results] = await connection.query('SELECT * FROM admins WHERE email = ?', [email]);

//         if (results.length === 0) {
//             connection.release();
//             return res.status(400).json({ error: 'Invalid email or password' });
//         }

//         const admin = results[0];

//         if (await argon2.verify(admin.password, password)) {
//             const sessionToken = jwt.sign({ id: admin.id, email: admin.email, isAdmin: true }, 'secret', { expiresIn: '1h' });

//             connection.release();

//             res.cookie('admin_session_token', sessionToken, { httpOnly: true });
//             res.redirect('/admin-dashboard');
//         } else {
//             connection.release();
//             res.status(400).json({ error: 'Invalid email or password' });
//         }
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ error: 'Internal server error', details: err.message });
//     }
// });

// // Company Dashboard (Protected)
// app.get('/company-dashboard', verifyCompanyToken, (req, res) => {
//     res.send(`Welcome to the Company Dashboard, ${req.user.email}`);
// });

// // Admin Dashboard (Protected)
// app.get('/admin-dashboard', verifyAdminToken, (req, res) => {
//     res.send(`Welcome to the Admin Dashboard, ${req.user.email}`);
// });

// // CRUD Operations for Employee Data
// // Create Employee
// app.post('/company/employees',
//     verifyCompanyToken,
//     [
//         body('name').isString().notEmpty().withMessage('Name is required and must be a string'),
//         body('position').isString().notEmpty().withMessage('Position is required and must be a string'),
//         body('salary').isDecimal({ decimal_digits: '2' }).withMessage('Salary must be a decimal number with up to two decimal places'),
//         body('mode_of_transport').optional().isString().withMessage('Mode of transport must be a string'),
//         body('distance_traveled').optional().isDecimal({ decimal_digits: '2' }).withMessage('Distance traveled must be a decimal number with up to two decimal places'),
//         body('fuel_type').optional().isString().withMessage('Fuel type must be a string'),
//         body('emission_factor').optional().isDecimal({ decimal_digits: '5' }).withMessage('Emission factor must be a decimal number with up to five decimal places'),
//         body('number_of_trips').optional().isInt().withMessage('Number of trips must be an integer'),
//         body('travel_frequency').optional().isString().withMessage('Travel frequency must be a string'),
//         body('vehicle_efficiency').optional().isDecimal({ decimal_digits: '5' }).withMessage('Vehicle efficiency must be a decimal number with up to five decimal places'),
//     ],
//     async (req, res) => {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({ errors: errors.array() });
//         }

//         const {
//             name,
//             position,
//             salary,
//             mode_of_transport,
//             distance_traveled,
//             fuel_type,
//             emission_factor,
//             number_of_trips,
//             travel_frequency,
//             vehicle_efficiency
//         } = req.body;

//         const company_id = req.user.id;

//         let connection;
//         try {
//             connection = await pool.getConnection();
//             const [result] = await connection.query(
//                 'INSERT INTO employees (name, position, salary, company_id, mode_of_transport, distance_traveled, fuel_type, emission_factor, number_of_trips, travel_frequency, vehicle_efficiency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
//                 [name, position, salary, company_id, mode_of_transport, distance_traveled, fuel_type, emission_factor, number_of_trips, travel_frequency, vehicle_efficiency]
//             );

//             res.status(201).json({ id: result.insertId, message: 'Employee added successfully' });
//         } catch (err) {
//             console.error('Database error:', err);
//             res.status(500).json({ error: 'Internal server error', details: err.message });
//         } finally {
//             if (connection) connection.release();
//         }
//     });


// // Get Employees for a Company
// app.get('/company/employees', verifyCompanyToken, async (req, res) => {
//     const companyId = req.user.id;

//     try {
//         const connection = await pool.getConnection();
//         const [employees] = await connection.query('SELECT * FROM employees WHERE company_id = ?', [companyId]);
//         connection.release();

//         res.json(employees);
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ error: 'Internal server error', details: err.message });
//     }
// });

// // Update Employee
// app.put('/company/employees/:id',
//     verifyCompanyToken,
//     [
//         body('name').optional().isString().notEmpty().withMessage('Name must be a string'),
//         body('position').optional().isString().notEmpty().withMessage('Position must be a string'),
//         body('salary').optional().isDecimal({ decimal_digits: '2' }).withMessage('Salary must be a decimal number with up to two decimal places'),
//         body('mode_of_transport').optional().isString().withMessage('Mode of transport must be a string'),
//         body('distance_traveled').optional().isDecimal({ decimal_digits: '2' }).withMessage('Distance traveled must be a decimal number with up to two decimal places'),
//         body('fuel_type').optional().isString().withMessage('Fuel type must be a string'),
//         body('emission_factor').optional().isDecimal({ decimal_digits: '5' }).withMessage('Emission factor must be a decimal number with up to five decimal places'),
//         body('number_of_trips').optional().isInt().withMessage('Number of trips must be an integer'),
//         body('travel_frequency').optional().isString().withMessage('Travel frequency must be a string'),
//         body('vehicle_efficiency').optional().isDecimal({ decimal_digits: '5' }).withMessage('Vehicle efficiency must be a decimal number with up to five decimal places'),
//     ],
//     async (req, res) => {
//         const { id } = req.params;
//         const companyId = req.user.id;
//         const updates = req.body;

//         // Validate the request body
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({ errors: errors.array() });
//         }

//         try {
//             const connection = await pool.getConnection();
//             const [existingEmployee] = await connection.query('SELECT * FROM employees WHERE id = ? AND company_id = ?', [id, companyId]);

//             if (existingEmployee.length === 0) {
//                 connection.release();
//                 return res.status(404).json({ error: 'Employee not found' });
//             }

//             await connection.query('UPDATE employees SET ? WHERE id = ? AND company_id = ?', [updates, id, companyId]);
//             connection.release();

//             res.json({ message: 'Employee updated successfully' });
//         } catch (err) {
//             console.error('Database error:', err);
//             res.status(500).json({ error: 'Internal server error', details: err.message });
//         }
//     }
// );


// // Delete Employee
// app.delete('/company/employees/:id', verifyCompanyToken, async (req, res) => {
//     const { id } = req.params;
//     const companyId = req.user.id;

//     try {
//         const connection = await pool.getConnection();
//         const [existingEmployee] = await connection.query('SELECT * FROM employees WHERE id = ? AND company_id = ?', [id, companyId]);

//         if (existingEmployee.length === 0) {
//             connection.release();
//             return res.status(404).json({ error: 'Employee not found' });
//         }

//         await connection.query('DELETE FROM employees WHERE id = ? AND company_id = ?', [id, companyId]);
//         connection.release();

//         res.json({ message: 'Employee deleted successfully' });
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ error: 'Internal server error', details: err.message });
//     }
// });

// // Admin Route to Get All Companies with Employee Information
// app.get('/admin/companies', verifyAdminToken, async (req, res) => {
//     try {
//         const connection = await pool.getConnection();
//         const [companies] = await connection.query('SELECT * FROM companies');

//         const companyData = await Promise.all(companies.map(async (company) => {
//             const [employees] = await connection.query('SELECT * FROM employees WHERE company_id = ?', [company.id]);
//             return { ...company, employees };
//         }));

//         connection.release();

//         res.json(companyData);
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ error: 'Internal server error', details: err.message });
//     }
// });


// // Create a new project
// app.post('/company/projects', verifyCompanyToken, async (req, res) => {
//     const { name, description, start_date, end_date } = req.body;
//     const companyId = req.user.id;

//     try {
//         const connection = await pool.getConnection();
//         const [result] = await connection.query(
//             'INSERT INTO projects (company_id, name, description, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
//             [companyId, name, description, start_date, end_date]
//         );
//         connection.release();

//         res.status(201).json({ id: result.insertId, message: 'Project created successfully' });
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ error: 'Internal server error', details: err.message });
//     }
// });



// // Upload material data
// app.post('/company/projects/:projectId/materials', verifyCompanyToken, async (req, res) => {
//     const { projectId } = req.params;
//     const { material_name, quantity } = req.body;

//     // Predefined emission factors based on material names
//     const emissionFactors = {
//         steel: 2.5,   // Example emission factor for steel
//         cement: 0.9,  // Example emission factor for cement
//         wood: 0.4     // Example emission factor for wood
//     };

//     const emission_factor = emissionFactors[material_name.toLowerCase()] || 0; // Default to 0 if material not found

//     try {
//         const total_emissions = quantity * emission_factor;

//         const connection = await pool.getConnection();
//         await connection.query(
//             'INSERT INTO project_materials (project_id, material_name, quantity, emission_factor, total_emissions) VALUES (?, ?, ?, ?, ?)',
//             [projectId, material_name, quantity, emission_factor, total_emissions]
//         );
//         connection.release();

//         res.status(201).json({ message: 'Material data uploaded successfully' });
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ error: 'Internal server error', details: err.message });
//     }
// });

// // Upload energy data
// app.post('/company/projects/:projectId/energy', verifyCompanyToken, async (req, res) => {
//     const { projectId } = req.params;
//     const { energy_type, amount_used } = req.body;

//     // Predefined emission factors based on energy types
//     const emissionFactors = {
//         electricity: 0.5,  // Example emission factor for electricity
//         diesel: 2.7,       // Example emission factor for diesel
//         natural_gas: 1.9   // Example emission factor for natural gas
//     };

//     const emission_factor = emissionFactors[energy_type.toLowerCase()] || 0; // Default to 0 if energy type not found

//     try {
//         const total_emissions = amount_used * emission_factor;

//         const connection = await pool.getConnection();
//         await connection.query(
//             'INSERT INTO project_energy (project_id, energy_type, amount_used, emission_factor, total_emissions) VALUES (?, ?, ?, ?, ?)',
//             [projectId, energy_type, amount_used, emission_factor, total_emissions]
//         );
//         connection.release();

//         res.status(201).json({ message: 'Energy data uploaded successfully' });
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ error: 'Internal server error', details: err.message });
//     }
// });


// // Upload travel data
// app.post('/company/projects/:projectId/travel', verifyCompanyToken, async (req, res) => {
//     const { projectId } = req.params;
//     const { travel_mode, distance, emission_factor } = req.body;

//     try {
//         const total_emissions = distance * emission_factor;

//         const connection = await pool.getConnection();
//         await connection.query(
//             'INSERT INTO project_travel (project_id, travel_mode, distance, emission_factor, total_emissions) VALUES (?, ?, ?, ?, ?)',
//             [projectId, travel_mode, distance, emission_factor, total_emissions]
//         );
//         connection.release();

//         res.status(201).json({ message: 'Travel data uploaded successfully' });
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ error: 'Internal server error', details: err.message });
//     }
// });


// // Get project details with emissions
// app.get('/company/projects/:projectId', verifyCompanyToken, async (req, res) => {
//     const { projectId } = req.params;

//     try {
//         const connection = await pool.getConnection();

//         const [project] = await connection.query('SELECT * FROM projects WHERE id = ?', [projectId]);

//         if (project.length === 0) {
//             connection.release();
//             return res.status(404).json({ error: 'Project not found' });
//         }

//         const [materials] = await connection.query('SELECT * FROM project_materials WHERE project_id = ?', [projectId]);
//         const [energy] = await connection.query('SELECT * FROM project_energy WHERE project_id = ?', [projectId]);
//         const [travel] = await connection.query('SELECT * FROM project_travel WHERE project_id = ?', [projectId]);

//         connection.release();

//         const total_emissions = materials.reduce((sum, m) => sum + m.total_emissions, 0) +
//             energy.reduce((sum, e) => sum + e.total_emissions, 0) +
//             travel.reduce((sum, t) => sum + t.total_emissions, 0);

//         res.json({
//             project: project[0],
//             materials,
//             energy,
//             travel,
//             total_emissions,
//         });
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ error: 'Internal server error', details: err.message });
//     }
// });


// // Get Emission Report for a Project
// app.get('/company/projects/:projectId/report', verifyCompanyToken, async (req, res) => {
//     const { projectId } = req.params;

//     try {
//         const connection = await pool.getConnection();

//         // Fetch emissions data
//         const [materials] = await connection.query('SELECT material_name, SUM(total_emissions) as total_emissions FROM project_materials WHERE project_id = ? GROUP BY material_name', [projectId]);
//         const [energy] = await connection.query('SELECT energy_type, SUM(total_emissions) as total_emissions FROM project_energy WHERE project_id = ? GROUP BY energy_type', [projectId]);
//         const [travel] = await connection.query('SELECT travel_mode, SUM(total_emissions) as total_emissions FROM project_travel WHERE project_id = ? GROUP BY travel_mode', [projectId]);

//         connection.release();

//         // Aggregate data for reporting
//         const report = {
//             materials: materials.map(m => ({ category: m.material_name, emissions: m.total_emissions })),
//             energy: energy.map(e => ({ category: e.energy_type, emissions: e.total_emissions })),
//             travel: travel.map(t => ({ category: t.travel_mode, emissions: t.total_emissions })),
//         };

//         res.json(report);
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ error: 'Internal server error', details: err.message });
//     }
// });



// // CSV Upload Route
// app.post('/company/employees/upload', verifyCompanyToken, upload.single('file'), async (req, res) => {
//     const filePath = req.file.path;
//     const companyId = req.user.id;

//     const employees = [];

//     fs.createReadStream(filePath)
//         .pipe(csv())
//         .on('data', (row) => {
//             employees.push({
//                 name: row.name,
//                 position: row.position,
//                 salary: parseFloat(row.salary),
//                 company_id: companyId,
//                 mode_of_transport: row.mode_of_transport || null,
//                 distance_traveled: parseFloat(row.distance_traveled) || null,
//                 fuel_type: row.fuel_type || null,
//                 emission_factor: parseFloat(row.emission_factor) || null,
//                 number_of_trips: parseInt(row.number_of_trips, 10) || null,
//                 travel_frequency: row.travel_frequency || null,
//                 vehicle_efficiency: parseFloat(row.vehicle_efficiency) || null,
//             });
//         })
//         .on('end', async () => {
//             try {
//                 const connection = await pool.getConnection();
//                 await connection.query('INSERT INTO employees (name, position, salary, company_id, mode_of_transport, distance_traveled, fuel_type, emission_factor, number_of_trips, travel_frequency, vehicle_efficiency) VALUES ?', [employees.map(employee => Object.values(employee))]);
//                 connection.release();

//                 // Remove the file after processing
//                 fs.unlinkSync(filePath);

//                 res.status(201).json({ message: 'Employees added successfully' });
//             } catch (err) {
//                 console.error('Database error:', err);
//                 res.status(500).json({ error: 'Internal server error', details: err.message });
//             }
//         })
//         .on('error', (error) => {
//             console.error('Error reading CSV file:', error);
//             res.status(500).json({ error: 'Internal server error', details: error.message });
//         });
// });

// // Logout for Company
// app.post('/company/logout', (req, res) => {
//     res.clearCookie('company_session_token');
//     res.status(200).json({ message: 'Logged out successfully' });
// });

// // Logout for Admin
// app.post('/admin/logout', (req, res) => {
//     res.clearCookie('admin_session_token');
//     res.status(200).json({ message: 'Logged out successfully' });
// });

// app.listen(3000, () => {
//     console.log('Server running on http://localhost:3000');
    
// });



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
    name: String,
    position: String,
    salary: Number,
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
app.use(cors({ origin: 'http://localhost:3000/admin/companies' }));

// MongoDB Connection
mongoose.connect('mongodb://admin:adminpass@localhost:27017/toruk_db')
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


app.get('/', (req,res)=>{
    
    res.send('Hello World!')
    
})
// Route to serve visualization page
app.get('/admin/visualization',(req, res) => {
    res.sendFile(__dirname + '/public/visualization.html');
});

// Company Signup (Email Only)
app.post('/auth/signup', async (req, res) => {
    const { email } = req.body;
    const token = uuidv4();
    const tokenExpiration = new Date(Date.now() + 10 * 60 * 10000); // 10 minutes expiration

    try {
        // Check if the company already exists
        console.log(Company)
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
        res.redirect('/company-dashboard');
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
    const { name, position, salary } = req.body;
    const company_id = req.user.id;

    const newEmployee = new Employee({ name, position, salary, company_id });
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
    const updates = req.body;

    try {
        const employee = await Employee.findOneAndUpdate({ _id: id, company_id: req.user.id }, updates, { new: true });

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
