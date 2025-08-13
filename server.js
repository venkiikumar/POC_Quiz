const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = 3001;
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

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
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
});

// API Routes

// Get all applications with question counts
app.get('/api/applications', async (req, res) => {
    try {
        const applications = await prisma.application.findMany({
            include: {
                _count: {
                    select: { questions: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        
        // Transform to match frontend expectations
        const transformedApps = applications.map(app => ({
            id: app.id,
            name: app.name,
            description: app.description,
            question_count: app._count.questions,
            max_questions: app.maxQuestions,
            created_at: app.createdAt,
            updated_at: app.updatedAt
        }));
        
        res.json(transformedApps);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get questions for specific application
app.get('/api/questions/:applicationId', async (req, res) => {
    try {
        const applicationId = parseInt(req.params.applicationId);
        const { count } = req.query;
        
        let questions = await prisma.question.findMany({
            where: { applicationId },
            orderBy: { id: 'asc' }
        });
        
        // If count is specified, shuffle and limit questions for quiz
        if (count) {
            questions = questions
                .sort(() => 0.5 - Math.random())
                .slice(0, parseInt(count));
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
        
        res.json(transformedQuestions);
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get question count for application
app.get('/api/question-count/:applicationId', async (req, res) => {
    try {
        const applicationId = parseInt(req.params.applicationId);
        const count = await prisma.question.count({
            where: { applicationId }
        });
        res.json({ count });
    } catch (error) {
        console.error('Error counting questions:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update application settings
app.put('/api/applications/:id', async (req, res) => {
    try {
        const applicationId = parseInt(req.params.id);
        const { question_count } = req.body;
        
        const updatedApp = await prisma.application.update({
            where: { id: applicationId },
            data: { questionCount: parseInt(question_count) }
        });
        
        res.json({ message: 'Application updated successfully' });
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Upload questions CSV for an application
app.post('/api/upload-questions', upload.single('csvFile'), async (req, res) => {
    const { applicationId } = req.body;
    const csvFile = req.file;

    if (!csvFile || !applicationId) {
        return res.status(400).json({ error: 'CSV file and application ID are required' });
    }

    try {
        const questions = [];
        const filePath = csvFile.path;

        // Parse CSV file
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    if (row.question && row.optionA && row.optionB && row.optionC && row.optionD && row.correctAnswer) {
                        questions.push({
                            applicationId: parseInt(applicationId),
                            question: row.question.trim(),
                            optionA: row.optionA.trim(),
                            optionB: row.optionB.trim(),
                            optionC: row.optionC.trim(),
                            optionD: row.optionD.trim(),
                            correctAnswer: row.correctAnswer.trim().toUpperCase()
                        });
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (questions.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'No valid questions found in CSV' });
        }

        // Delete existing questions and insert new ones in a transaction
        await prisma.$transaction([
            prisma.question.deleteMany({
                where: { applicationId: parseInt(applicationId) }
            }),
            prisma.question.createMany({
                data: questions
            })
        ]);

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        res.json({ 
            message: `Successfully uploaded ${questions.length} questions`,
            count: questions.length
        });

    } catch (error) {
        console.error('Error processing CSV:', error);
        if (csvFile && fs.existsSync(csvFile.path)) {
            fs.unlinkSync(csvFile.path);
        }
        res.status(500).json({ error: 'Error processing CSV file' });
    }
});

// Save quiz result
app.post('/api/quiz-results', async (req, res) => {
    try {
        const { name, email, applicationId, score, totalQuestions, percentage, timeTaken } = req.body;
        
        if (!name || !email || !applicationId || score === undefined || !totalQuestions || !timeTaken) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const result = await prisma.quizResult.create({
            data: {
                applicationId: parseInt(applicationId),
                userName: name,
                userEmail: email,
                score: parseInt(score),
                totalQuestions: parseInt(totalQuestions),
                percentage: parseFloat(percentage),
                timeTaken: parseInt(timeTaken)
            }
        });
        
        res.json({ 
            message: 'Quiz result saved successfully', 
            id: result.id 
        });
    } catch (error) {
        console.error('Error saving quiz result:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get all quiz results (admin only)
app.get('/api/quiz-results', async (req, res) => {
    try {
        const results = await prisma.quizResult.findMany({
            include: {
                application: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        // Transform to match frontend expectations
        const transformedResults = results.map(r => ({
            id: r.id,
            name: r.userName,
            email: r.userEmail,
            application_id: r.applicationId,
            score: r.score,
            total_questions: r.totalQuestions,
            percentage: r.percentage,
            time_taken: r.timeTaken,
            timestamp: r.createdAt,
            completed_at: r.createdAt,
            application_name: r.application.name
        }));
        
        res.json(transformedResults);
    } catch (error) {
        console.error('Error fetching quiz results:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Clear all quiz results (admin only)
app.delete('/api/quiz-results', async (req, res) => {
    try {
        const result = await prisma.quizResult.deleteMany({});
        res.json({ message: 'All quiz results cleared successfully' });
    } catch (error) {
        console.error('Error clearing quiz results:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get quiz results for a specific application (admin only)
app.get('/api/quiz-results/:applicationId', async (req, res) => {
    try {
        const applicationId = parseInt(req.params.applicationId);
        
        const results = await prisma.quizResult.findMany({
            where: { applicationId },
            include: {
                application: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        // Transform to match frontend expectations
        const transformedResults = results.map(r => ({
            id: r.id,
            name: r.userName,
            email: r.userEmail,
            application_id: r.applicationId,
            score: r.score,
            total_questions: r.totalQuestions,
            percentage: r.percentage,
            time_taken: r.timeTaken,
            timestamp: r.createdAt,
            completed_at: r.createdAt,
            application_name: r.application.name
        }));
        
        res.json(transformedResults);
    } catch (error) {
        console.error('Error fetching application quiz results:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin dashboard endpoint
app.get('/api/admin/dashboard', async (req, res) => {
    try {
        const applications = await prisma.application.findMany({
            include: {
                _count: {
                    select: { 
                        questions: true,
                        quizResults: true
                    }
                }
            }
        });
        
        const totalQuizzes = await prisma.quizResult.count();
        const totalQuestions = await prisma.question.count();
        
        // Calculate stats for each application
        const dashboardData = [];
        
        for (const app of applications) {
            const results = await prisma.quizResult.findMany({
                where: { applicationId: app.id }
            });
            
            const avgScore = results.length > 0 
                ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length 
                : 0;
            
            dashboardData.push({
                id: app.id,
                name: app.name,
                description: app.description,
                question_count: app._count.questions,
                quiz_count: app._count.quizResults,
                maximum_questions: app.maxQuestions,
                average_score: Math.round(avgScore * 100) / 100,
                created_at: app.createdAt,
                updated_at: app.updatedAt
            });
        }
        
        res.json({
            applications: dashboardData,
            summary: {
                total_applications: applications.length,
                total_questions: totalQuestions,
                total_quizzes: totalQuizzes
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Server shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Server shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Quiz server running on http://localhost:${PORT}`);
    console.log(`📊 Database: SQLite with Prisma ORM`);
    console.log(`🔧 Run "npx prisma studio" to open database browser`);
    console.log(`📁 Database file: ${path.resolve('prisma/quiz_app.db')}`);
});

module.exports = app;
