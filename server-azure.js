const express = require('express');
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { fallbackQuestions } = require('./fallback-data');

console.log('🚀 Starting Quiz Application Server for Azure...');

const app = express();
const PORT = process.env.PORT || 8080; // Azure uses process.env.PORT

// Initialize Prisma with production settings
const prisma = new PrismaClient();

// Middleware
app.use(cors({
    origin: true, // Allow all origins in production
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname), {
    index: 'index.html'
}));

console.log('✅ Middleware configured for Azure');

// Ensure database and uploads directory exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: process.env.NODE_ENV || 'production'
    });
});

// Diagnostic endpoint to check database content
app.get('/api/debug/database', async (req, res) => {
    try {
        console.log('🔍 Running database diagnostics...');
        
        // Ensure database is initialized
        const initialized = await ensureDatabaseInitialized();
        
        if (!initialized) {
            res.json({
                error: 'Database not initialized',
                initialized: false,
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // Check applications
        const applications = await prisma.application.findMany();
        console.log('📋 Applications in database:', applications);
        
        // Check questions for each application
        const questionCounts = {};
        for (const app of applications) {
            const count = await prisma.question.count({ where: { applicationId: app.id } });
            questionCounts[app.name] = count;
        }
        
        // Get sample questions
        const sampleQuestions = await prisma.question.findMany({
            take: 3,
            include: {
                application: {
                    select: { name: true }
                }
            }
        });
        
        res.json({
            initialized: true,
            applications: applications,
            questionCounts: questionCounts,
            sampleQuestions: sampleQuestions.map(q => ({
                id: q.id,
                question: q.question.substring(0, 100) + '...',
                application: q.application?.name,
                hasOptions: !!(q.optionA && q.optionB && q.optionC && q.optionD)
            })),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Database diagnostic error:', error);
        res.status(500).json({ 
            error: 'Database diagnostic failed', 
            details: error.message,
            initialized: false,
            timestamp: new Date().toISOString()
        });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    console.log('📡 Test endpoint accessed');
    res.json({ 
        message: 'Server is working!', 
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: process.env.NODE_ENV || 'production'
    });
});

// Get all applications
app.get('/api/applications', async (req, res) => {
    try {
        console.log('📋 Fetching applications from database...');
        
        // Ensure database is initialized
        const initialized = await ensureDatabaseInitialized();
        if (!initialized) {
            console.log('⚠️ Database not initialized, returning fallback applications');
            const fallbackApps = [
                { id: 1, name: 'RoadOps', description: 'RoadOps application quiz', question_count: 3, max_questions: 25 },
                { id: 2, name: 'RoadSales', description: 'RoadSales application quiz', question_count: 3, max_questions: 25 },
                { id: 3, name: 'UES', description: 'UES application quiz', question_count: 3, max_questions: 25 },
                { id: 4, name: 'Digital', description: 'Digital application quiz', question_count: 3, max_questions: 25 }
            ];
            res.json(fallbackApps);
            return;
        }
        
        const applications = await prisma.application.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                maxQuestions: true,
                _count: {
                    select: { questions: true }
                }
            }
        });
        
        const result = applications.map(app => ({
            id: app.id,
            name: app.name,
            description: app.description,
            question_count: app._count.questions,
            max_questions: app.maxQuestions || 25
        }));
        
        console.log(`✅ Returning ${result.length} applications:`, result);
        res.json(result);
    } catch (error) {
        console.error('❌ Error fetching applications:', error);
        
        // Return a fallback response with default applications
        const fallbackApps = [
            { id: 1, name: 'RoadOps', description: 'RoadOps application quiz', question_count: 3, max_questions: 25 },
            { id: 2, name: 'RoadSales', description: 'RoadSales application quiz', question_count: 3, max_questions: 25 },
            { id: 3, name: 'UES', description: 'UES application quiz', question_count: 3, max_questions: 25 },
            { id: 4, name: 'Digital', description: 'Digital application quiz', question_count: 3, max_questions: 25 }
        ];
        
        console.log('⚠️ Database error, returning fallback applications');
        res.json(fallbackApps);
    }
});

// Get questions for specific application
app.get('/api/questions/:applicationId', async (req, res) => {
    try {
        const applicationId = parseInt(req.params.applicationId);
        const { count } = req.query;
        
        console.log(`📝 Fetching questions for application ${applicationId}, count: ${count || 'all'}`);
        
        // Ensure database is initialized
        const initialized = await ensureDatabaseInitialized();
        
        if (initialized) {
            try {
                let questions = await prisma.question.findMany({
                    where: { applicationId },
                    orderBy: { id: 'asc' }
                });
                
                console.log(`📊 Found ${questions.length} questions in database for application ${applicationId}`);
                
                if (questions.length > 0) {
                    // If count is specified, shuffle and limit questions for quiz
                    if (count) {
                        questions = questions
                            .sort(() => 0.5 - Math.random())
                            .slice(0, parseInt(count));
                    }
                    
                    const formattedQuestions = questions.map((q, index) => ({
                        id: index,
                        question: q.question,
                        options: {
                            A: q.optionA,
                            B: q.optionB,
                            C: q.optionC,
                            D: q.optionD
                        },
                        correct: q.correctAnswer
                    }));
                    
                    console.log(`✅ Returning ${formattedQuestions.length} questions from database`);
                    res.json(formattedQuestions);
                    return;
                }
            } catch (dbError) {
                console.log('⚠️ Database query error:', dbError.message);
            }
        }
        
        // Use fallback questions if database fails or no questions found
        console.log(`⚠️ Using fallback questions for application ${applicationId}`);
        const fallback = fallbackQuestions[applicationId] || fallbackQuestions[1];
        const requestedCount = count ? parseInt(count) : fallback.length;
        const selectedQuestions = fallback.slice(0, requestedCount);
        
        console.log(`✅ Returning ${selectedQuestions.length} fallback questions for application ${applicationId}`);
        res.json(selectedQuestions);
        
    } catch (error) {
        console.error('❌ Error fetching questions:', error);
        
        // Final fallback
        const fallback = fallbackQuestions[1] || [];
        console.log(`⚠️ Using emergency fallback: ${fallback.length} questions`);
        res.json(fallback);
    }
});

// Save quiz results
app.post('/api/quiz-results', async (req, res) => {
    try {
        const { name, email, score, totalQuestions, percentage, timeTaken, applicationId } = req.body;
        
        console.log('💾 Saving quiz result:', { name, email, score, totalQuestions, percentage, timeTaken, applicationId });
        
        const result = await prisma.quizResult.create({
            data: {
                userName: name,
                userEmail: email,
                score: parseInt(score),
                totalQuestions: parseInt(totalQuestions),
                percentage: parseFloat(percentage),
                timeTaken: parseInt(timeTaken),
                applicationId: parseInt(applicationId)
            }
        });
        
        console.log('✅ Quiz result saved with ID:', result.id);
        res.json({ success: true, id: result.id });
    } catch (error) {
        console.error('❌ Error saving quiz result:', error);
        res.status(500).json({ error: 'Failed to save quiz result', details: error.message });
    }
});

// Get all quiz results (admin endpoint)
app.get('/api/quiz-results', async (req, res) => {
    try {
        console.log('📊 Fetching all quiz results...');
        
        const results = await prisma.quizResult.findMany({
            include: {
                application: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        const formattedResults = results.map(result => ({
            id: result.id,
            name: result.userName,
            email: result.userEmail,
            application: result.application?.name || 'Unknown',
            score: result.score,
            total_questions: result.totalQuestions,
            percentage: result.percentage,
            time_taken: result.timeTaken,
            date: result.createdAt
        }));
        
        console.log(`✅ Returning ${formattedResults.length} quiz results`);
        res.json(formattedResults);
    } catch (error) {
        console.error('❌ Error fetching quiz results:', error);
        res.status(500).json({ error: 'Failed to fetch quiz results', details: error.message });
    }
});

// Add new application (admin endpoint)
app.post('/api/applications', async (req, res) => {
    try {
        const { name, description, maxQuestions } = req.body;
        
        console.log('📝 Creating new application:', { name, description, maxQuestions });
        
        const application = await prisma.application.create({
            data: {
                name,
                description: description || '',
                maxQuestions: parseInt(maxQuestions) || 25
            }
        });
        
        console.log('✅ Application created with ID:', application.id);
        res.json({ success: true, id: application.id, application });
    } catch (error) {
        console.error('❌ Error creating application:', error);
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Application name already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create application', details: error.message });
        }
    }
});

// Update application settings (admin endpoint)
app.put('/api/applications/:id', async (req, res) => {
    try {
        const applicationId = parseInt(req.params.id);
        const { name, description, maxQuestions } = req.body;
        
        console.log(`📝 Updating application ${applicationId}:`, { name, description, maxQuestions });
        
        const application = await prisma.application.update({
            where: { id: applicationId },
            data: {
                name,
                description: description || '',
                maxQuestions: parseInt(maxQuestions) || 25
            }
        });
        
        console.log('✅ Application updated:', application);
        res.json({ success: true, application });
    } catch (error) {
        console.error('❌ Error updating application:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Application not found' });
        } else {
            res.status(500).json({ error: 'Failed to update application', details: error.message });
        }
    }
});

// Upload questions (admin endpoint)
app.post('/api/upload-questions/:applicationId', upload.single('csvFile'), async (req, res) => {
    try {
        const applicationId = parseInt(req.params.applicationId);
        const filePath = req.file.path;
        
        console.log(`📤 Processing CSV upload for application ${applicationId}:`, filePath);
        
        const questions = [];
        
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', (data) => {
                    questions.push({
                        question: data.question,
                        optionA: data.optionA,
                        optionB: data.optionB,
                        optionC: data.optionC,
                        optionD: data.optionD,
                        correctAnswer: data.correctAnswer,
                        applicationId: applicationId
                    });
                })
                .on('end', resolve)
                .on('error', reject);
        });
        
        console.log(`📊 Parsed ${questions.length} questions from CSV`);
        
        // Clear existing questions for this application
        await prisma.question.deleteMany({
            where: { applicationId }
        });
        
        // Insert new questions
        await prisma.question.createMany({
            data: questions
        });
        
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        
        console.log(`✅ Successfully uploaded ${questions.length} questions`);
        res.json({ 
            success: true, 
            message: `Successfully uploaded ${questions.length} questions`,
            count: questions.length 
        });
        
    } catch (error) {
        console.error('❌ Error uploading questions:', error);
        res.status(500).json({ error: 'Failed to upload questions', details: error.message });
    }
});

// Catch-all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Database initialization
let databaseInitialized = false;

async function ensureDatabaseInitialized() {
    if (databaseInitialized) return true;
    
    try {
        console.log('🔧 Ensuring database is initialized...');
        
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        
        // Check if applications exist
        const appCount = await prisma.application.count();
        console.log(`📊 Found ${appCount} applications in database`);
        
        if (appCount === 0) {
            console.log('📝 Creating default applications...');
            
            const defaultApps = [
                { name: 'RoadOps', description: 'RoadOps application quiz covering operational procedures and best practices' },
                { name: 'RoadSales', description: 'RoadSales application quiz covering sales processes and methodologies' },
                { name: 'UES', description: 'UES application quiz covering unified enterprise systems' },
                { name: 'Digital', description: 'Digital application quiz covering digital transformation and technologies' }
            ];
            
            for (const app of defaultApps) {
                try {
                    await prisma.application.create({ data: app });
                    console.log(`✅ Created application: ${app.name}`);
                } catch (error) {
                    console.log(`⚠️ Application ${app.name} might already exist:`, error.message);
                }
            }
        }
        
        databaseInitialized = true;
        console.log('✅ Database initialization complete');
        return true;
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        return false;
    }
}

// Start server
const server = app.listen(PORT, async () => {
    console.log('==========================================');
    console.log('🎉 QUIZ APPLICATION SERVER STARTED!');
    console.log('==========================================');
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`🚀 Port: ${PORT}`);
    console.log(`📋 Applications API: /api/applications`);
    console.log(`❓ Questions API: /api/questions/:id`);
    console.log(`📊 Results API: /api/quiz-results`);
    console.log(`🧪 Test API: /api/test`);
    console.log(`💚 Health Check: /health`);
    console.log('==========================================');
    console.log('✅ Server is ready! Initializing database...');
    console.log('==========================================');
    
    // Initialize database after server starts (non-blocking)
    ensureDatabaseInitialized().then(() => {
        console.log('🎉 Database initialization completed in background');
    }).catch(error => {
        console.log('⚠️ Database initialization failed, will retry on first request');
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed');
        prisma.$disconnect().then(() => {
            console.log('✅ Database disconnected');
            process.exit(0);
        });
    });
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        prisma.$disconnect().then(() => {
            console.log('✅ Database disconnected');
            process.exit(0);
        });
    });
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection:', reason);
});
