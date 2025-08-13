const express = require('express');
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

console.log('🚀 Starting Quiz Application Server...');

const app = express();
const PORT = process.env.PORT || 3000; // Use port 3000 as default
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

console.log('✅ Middleware configured');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    console.log('📡 Test endpoint accessed');
    res.json({ 
        message: 'Server is working!', 
        timestamp: new Date().toISOString(),
        port: PORT 
    });
});

// Get all applications
app.get('/api/applications', async (req, res) => {
    try {
        console.log('📋 Fetching applications from database...');
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
        res.status(500).json({ error: 'Failed to fetch applications', details: error.message });
    }
});

// Get questions for specific application
app.get('/api/questions/:applicationId', async (req, res) => {
    try {
        const applicationId = parseInt(req.params.applicationId);
        const { count } = req.query;
        
        console.log(`📝 Fetching questions for application ${applicationId}, count: ${count || 'all'}`);
        
        let questions = await prisma.question.findMany({
            where: { applicationId },
            orderBy: { id: 'asc' }
        });
        
        console.log(`📊 Found ${questions.length} questions in database`);
        
        // If count is specified, shuffle and limit questions for quiz
        if (count) {
            questions = questions
                .sort(() => 0.5 - Math.random())
                .slice(0, parseInt(count));
            console.log(`🎲 Shuffled and limited to ${questions.length} questions`);
        }
        
        // Transform to match frontend expectations
        const transformedQuestions = questions.map(q => ({
            id: q.id,
            question: q.question,
            question_text: q.question, // For compatibility
            option_a: q.optionA,
            option_b: q.optionB,
            option_c: q.optionC,
            option_d: q.optionD,
            correct_answer: q.correctAnswer
        }));
        
        console.log(`✅ Returning ${transformedQuestions.length} transformed questions`);
        res.json(transformedQuestions);
    } catch (error) {
        console.error('❌ Error fetching questions:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

// Upload questions from CSV file
app.post('/api/upload-questions', upload.single('csvFile'), async (req, res) => {
    try {
        console.log('📤 === UPLOADING QUESTIONS ===');
        console.log('📁 File:', req.file);
        console.log('📋 Application ID:', req.body.applicationId);

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!req.body.applicationId) {
            return res.status(400).json({ error: 'Application ID is required' });
        }

        const applicationId = parseInt(req.body.applicationId);
        
        // Verify application exists
        const application = await prisma.application.findUnique({
            where: { id: applicationId }
        });

        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Parse CSV file
        const questions = [];
        const filePath = req.file.path;
        
        return new Promise((resolve, reject) => {
            const stream = fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', (row) => {
                    // Validate required CSV columns
                    if (row.question && row.optionA && row.optionB && row.optionC && row.optionD && row.correctAnswer) {
                        questions.push({
                            applicationId: applicationId,
                            question: row.question.trim(),
                            optionA: row.optionA.trim(),
                            optionB: row.optionB.trim(),
                            optionC: row.optionC.trim(),
                            optionD: row.optionD.trim(),
                            correctAnswer: row.correctAnswer.trim()
                        });
                    }
                })
                .on('end', async () => {
                    try {
                        if (questions.length === 0) {
                            fs.unlinkSync(filePath); // Clean up uploaded file
                            return res.status(400).json({ error: 'No valid questions found in CSV file' });
                        }

                        // Delete existing questions for this application
                        await prisma.question.deleteMany({
                            where: { applicationId: applicationId }
                        });

                        // Insert new questions
                        const result = await prisma.question.createMany({
                            data: questions
                        });

                        // Update application's question count
                        await prisma.application.update({
                            where: { id: applicationId },
                            data: { 
                                totalQuestions: questions.length,
                                maxQuestions: Math.min(questions.length, application.maxQuestions || 25)
                            }
                        });

                        // Clean up uploaded file
                        fs.unlinkSync(filePath);

                        console.log(`✅ Uploaded ${questions.length} questions for application: ${application.name}`);
                        res.json({ 
                            message: `Successfully uploaded ${questions.length} questions for ${application.name}`,
                            count: questions.length 
                        });
                        
                    } catch (error) {
                        console.error('❌ Error saving questions:', error);
                        fs.unlinkSync(filePath); // Clean up uploaded file
                        res.status(500).json({ error: 'Database error while saving questions', details: error.message });
                    }
                })
                .on('error', (error) => {
                    console.error('❌ Error parsing CSV:', error);
                    fs.unlinkSync(filePath); // Clean up uploaded file
                    res.status(500).json({ error: 'Error parsing CSV file', details: error.message });
                });
        });

    } catch (error) {
        console.error('❌ Error uploading questions:', error);
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path); // Clean up uploaded file
        }
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Save quiz results
app.post('/api/quiz-results', async (req, res) => {
    try {
        console.log('💾 === SAVING QUIZ RESULTS ===');
        console.log('📥 Received data:', JSON.stringify(req.body, null, 2));
        
        // Create only the fields that the database expects
        const result = await prisma.quizResult.create({
            data: {
                userName: req.body.name,
                userEmail: req.body.email,
                applicationId: parseInt(req.body.applicationId),
                score: parseInt(req.body.score),
                totalQuestions: parseInt(req.body.totalQuestions),
                percentage: parseFloat(req.body.percentage),
                timeTaken: parseInt(req.body.timeTaken || 0)
            }
        });
        
        console.log('✅ Quiz result saved successfully with ID:', result.id);
        res.json({ message: 'Results saved successfully', id: result.id });
    } catch (error) {
        console.error('❌ Error saving quiz results:', error);
        console.error('💥 Prisma error details:', error.message);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

// Get all quiz results
app.get('/api/quiz-results', async (req, res) => {
    try {
        console.log('📊 === FETCHING ALL QUIZ RESULTS ===');
        
        const results = await prisma.quizResult.findMany({
            include: {
                application: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        console.log(`📋 Raw results from database (${results.length} found):`);
        results.forEach((result, index) => {
            console.log(`${index + 1}. ID: ${result.id}, User: ${result.userName}, Email: ${result.userEmail}, App: ${result.application?.name}, Score: ${result.score}/${result.totalQuestions}`);
        });
        
        const transformedResults = results.map(result => ({
            id: result.id,
            name: result.userName,          // Map userName -> name
            email: result.userEmail,        // Map userEmail -> email
            application: result.application?.name || 'Unknown',  // Ensure application name is included
            score: result.score,
            totalQuestions: result.totalQuestions,
            percentage: result.percentage,
            timeTaken: result.timeTaken || 0,     // Ensure timeTaken has a default value
            createdAt: result.createdAt
        }));
        
        console.log(`✅ Transformed results (${transformedResults.length}):`);
        if (transformedResults.length > 0) {
            console.log('Sample transformed result:', JSON.stringify(transformedResults[0], null, 2));
        }
        
        res.json(transformedResults);
    } catch (error) {
        console.error('❌ Error fetching quiz results:', error);
        console.error('💥 Error details:', error.message);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

// Delete all quiz results
app.delete('/api/quiz-results', async (req, res) => {
    try {
        console.log('🗑️ Deleting all quiz results...');
        const result = await prisma.quizResult.deleteMany({});
        console.log(`✅ Deleted ${result.count} quiz results`);
        res.json({ message: `Deleted ${result.count} results` });
    } catch (error) {
        console.error('❌ Error deleting quiz results:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

// Update application settings (max questions)
app.put('/api/applications/:id', async (req, res) => {
    try {
        const applicationId = parseInt(req.params.id);
        const { max_questions } = req.body;
        
        console.log(`🔧 Updating application ${applicationId} max questions to: ${max_questions}`);
        
        const updatedApp = await prisma.application.update({
            where: { id: applicationId },
            data: { maxQuestions: parseInt(max_questions) }
        });
        
        console.log('✅ Application updated successfully');
        res.json({ message: 'Application updated successfully', maxQuestions: updatedApp.maxQuestions });
    } catch (error) {
        console.error('❌ Error updating application:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

// Test database connectivity
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('🔍 Testing database connectivity...');
        
        // Test applications table
        const apps = await prisma.application.findMany();
        console.log(`✅ Applications table: ${apps.length} records`);
        
        // Test quiz results table
        const results = await prisma.quizResult.findMany();
        console.log(`✅ QuizResult table: ${results.length} records`);
        
        // Test creating a sample result (but don't save)
        const sampleData = {
            userName: 'Test User',
            userEmail: 'test@example.com',
            applicationId: 1,
            score: 5,
            totalQuestions: 10,
            percentage: 50.0,
            timeTaken: 300
        };
        
        // Validate data structure (dry run)
        console.log('🧪 Sample data structure:', sampleData);
        
        res.json({
            message: 'Database connectivity test successful',
            applications: apps.length,
            quizResults: results.length,
            sampleData: sampleData
        });
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
        res.status(500).json({ error: 'Database test failed', details: error.message });
    }
});

// Error handling
app.use((error, req, res, next) => {
    console.error('🚨 Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
    console.log('==========================================');
    console.log('🎉 QUIZ APPLICATION SERVER STARTED!');
    console.log('==========================================');
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📋 Applications API: http://localhost:${PORT}/api/applications`);
    console.log(`❓ Questions API: http://localhost:${PORT}/api/questions/:id`);
    console.log(`📊 Results API: http://localhost:${PORT}/api/quiz-results`);
    console.log(`🧪 Test API: http://localhost:${PORT}/api/test`);
    console.log('==========================================');
    console.log('✅ Server is ready! You can now use the application.');
    console.log('⚠️  Keep this window open while using the app.');
    console.log('==========================================');
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

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection:', reason);
});
