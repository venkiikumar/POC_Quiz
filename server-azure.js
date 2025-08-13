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
        
        // Always try database first
        try {
            await prisma.$connect();
            console.log('✅ Database connection successful for questions');
            
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
            } else {
                console.log(`⚠️ No questions found in database for application ${applicationId}`);
                console.log(`🔄 Database may need initialization - try refreshing after a few minutes`);
            }
            
        } catch (dbError) {
            console.log('⚠️ Database error:', dbError.message);
            console.log('🔄 This might be a temporary issue during deployment');
        }
        
        // Only use fallback as last resort
        console.log(`⚠️ Using fallback questions for application ${applicationId} - database may still be initializing`);
        const fallback = fallbackQuestions[applicationId] || fallbackQuestions[1];
        const requestedCount = count ? parseInt(count) : fallback.length;
        const selectedQuestions = fallback.slice(0, requestedCount);
        
        console.log(`📋 Returning ${selectedQuestions.length} fallback questions for application ${applicationId}`);
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
        
        // Check if questions exist, if not load them
        const questionCount = await prisma.question.count();
        console.log(`📚 Found ${questionCount} questions in database`);
        
        if (questionCount === 0) {
            console.log('📚 No questions found, loading default questions...');
            await loadDefaultQuestions();
        }
        
        databaseInitialized = true;
        console.log('✅ Database initialization complete');
        return true;
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        return false;
    }
}

async function loadDefaultQuestions() {
    try {
        console.log('🔧 Loading default questions...');
        
        const questionSets = [
            { appName: 'RoadOps', questions: getJavaQuestions() },
            { appName: 'RoadSales', questions: getCSharpQuestions() },
            { appName: 'UES', questions: getPythonQuestions() },
            { appName: 'Digital', questions: getTypeScriptQuestions() }
        ];

        for (const set of questionSets) {
            const app = await prisma.application.findFirst({
                where: { name: set.appName }
            });

            if (app) {
                // Delete existing questions
                await prisma.question.deleteMany({
                    where: { applicationId: app.id }
                });

                // Add new questions
                const questionsData = set.questions.map(q => ({
                    ...q,
                    applicationId: app.id
                }));

                await prisma.question.createMany({
                    data: questionsData
                });

                console.log(`✅ Loaded ${questionsData.length} questions for ${set.appName}`);
            }
        }
        
        console.log('✅ Default questions loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading default questions:', error);
    }
}

function getJavaQuestions() {
    return [
        {
            question: "What is the size of int in Java?",
            optionA: "16 bits",
            optionB: "32 bits",
            optionC: "64 bits", 
            optionD: "8 bits",
            correctAnswer: "B"
        },
        {
            question: "Which of the following is not a Java keyword?",
            optionA: "static",
            optionB: "Boolean",
            optionC: "void",
            optionD: "private",
            correctAnswer: "B"
        },
        {
            question: "What is the default value of boolean variable in Java?",
            optionA: "true",
            optionB: "false",
            optionC: "0",
            optionD: "null",
            correctAnswer: "B"
        },
        {
            question: "Which method is used to start a thread in Java?",
            optionA: "init()",
            optionB: "start()",
            optionC: "run()",
            optionD: "resume()",
            correctAnswer: "B"
        },
        {
            question: "What is the parent class of all classes in Java?",
            optionA: "String",
            optionB: "Object",
            optionC: "Class",
            optionD: "Parent",
            correctAnswer: "B"
        },
        {
            question: "Which of the following is used to find and fix bugs in Java programs?",
            optionA: "JVM",
            optionB: "JDB",
            optionC: "JDK",
            optionD: "JRE",
            correctAnswer: "B"
        },
        {
            question: "What is the extension of Java code files?",
            optionA: ".js",
            optionB: ".txt",
            optionC: ".class",
            optionD: ".java",
            correctAnswer: "D"
        },
        {
            question: "Which environment variable is used to set Java path?",
            optionA: "MAVEN_Path",
            optionB: "JavaPATH", 
            optionC: "JAVA_HOME",
            optionD: "JAVA_PATH",
            correctAnswer: "C"
        },
        {
            question: "Which of the following is not an OOPS concept in Java?",
            optionA: "Polymorphism",
            optionB: "Inheritance",
            optionC: "Compilation",
            optionD: "Encapsulation",
            correctAnswer: "C"
        },
        {
            question: "What is not the use of 'this' keyword in Java?",
            optionA: "Referring to the instance variable when a local variable has the same name",
            optionB: "Passing itself to the method of the same class",
            optionC: "Passing itself to another method",
            optionD: "Calling another constructor in constructor chaining",
            correctAnswer: "B"
        },
        {
            question: "Which of the following is a type of polymorphism in Java?",
            optionA: "Multiple polymorphism",
            optionB: "Compile time polymorphism",
            optionC: "Multilevel polymorphism",
            optionD: "Execution time polymorphism",
            correctAnswer: "B"
        },
        {
            question: "What is the size of float and double in Java?",
            optionA: "32 and 64",
            optionB: "32 and 32",
            optionC: "64 and 64",
            optionD: "64 and 32",
            correctAnswer: "A"
        },
        {
            question: "Automatic type conversion is possible in which of the possible cases?",
            optionA: "Byte to int",
            optionB: "Int to long",
            optionC: "Long to int",
            optionD: "Short to int",
            correctAnswer: "B"
        },
        {
            question: "Arrays in Java are-",
            optionA: "Object references",
            optionB: "objects",
            optionC: "Primitive data type",
            optionD: "None of the above",
            correctAnswer: "B"
        },
        {
            question: "When an array is passed to a method what does the method receive?",
            optionA: "The reference of the array",
            optionB: "A copy of the array",
            optionC: "Length of the array",
            optionD: "Copy of first element",
            correctAnswer: "A"
        },
        {
            question: "What is the default value of an object reference defined as an instance variable?",
            optionA: "0",
            optionB: "null",
            optionC: "not defined",
            optionD: "depends on type",
            correctAnswer: "B"
        },
        {
            question: "Which of the following keywords is used to define interfaces in Java?",
            optionA: "intf",
            optionB: "Intf",
            optionC: "interface",
            optionD: "Interface",
            correctAnswer: "C"
        },
        {
            question: "Which of the following is correct about constructor?",
            optionA: "Constructor can have a return type",
            optionB: "Constructor name must be same as class name",
            optionC: "Constructor can be inherited",
            optionD: "Constructor cannot be overloaded",
            correctAnswer: "B"
        },
        {
            question: "What will happen if constructor of a class is declared as private?",
            optionA: "Object of class cannot be created in same package",
            optionB: "Object of class can only be created within the class",
            optionC: "Public methods of the class can be called",
            optionD: "Class can be inherited",
            correctAnswer: "B"
        },
        {
            question: "Which of the following statements is correct about inheritance in Java?",
            optionA: "Private members of superclass are accessible in subclass",
            optionB: "Protected members of superclass are accessible in subclass",
            optionC: "Public members of superclass are not accessible in subclass",
            optionD: "Default members are not accessible in subclass from different package",
            correctAnswer: "D"
        },
        {
            question: "What is method overriding in Java?",
            optionA: "Defining multiple methods with same name but different parameters",
            optionB: "Defining a method in subclass with same signature as in parent class",
            optionC: "Defining multiple constructors in a class",
            optionD: "None of the above",
            correctAnswer: "B"
        },
        {
            question: "Which of the following statements is correct about static methods?",
            optionA: "Static methods can be overridden",
            optionB: "Static methods can access instance variables directly",
            optionC: "Static methods can be called without creating object of class",
            optionD: "Static methods can use 'this' keyword",
            correctAnswer: "C"
        },
        {
            question: "What is the purpose of finalize() method in Java?",
            optionA: "To perform cleanup processing just before object is garbage collected",
            optionB: "To delete an object from memory",
            optionC: "To end the program execution",
            optionD: "None of the above",
            correctAnswer: "A"
        },
        {
            question: "Which of the following exception is thrown when java is out of memory?",
            optionA: "MemoryError",
            optionB: "OutOfMemoryError",
            optionC: "MemoryOutOfBoundsException",
            optionD: "MemoryFullException",
            correctAnswer: "B"
        },
        {
            question: "Which of these keywords is used to define a constant variable in Java?",
            optionA: "const",
            optionB: "constant",
            optionC: "final",
            optionD: "static",
            correctAnswer: "C"
        }
    ];
}

function getCSharpQuestions() {
    return [
        {
            question: "What is the file extension for C# source files?",
            optionA: ".cs",
            optionB: ".c#",
            optionC: ".csharp",
            optionD: ".net",
            correctAnswer: "A"
        },
        {
            question: "Which keyword is used to define a class in C#?",
            optionA: "class",
            optionB: "Class",
            optionC: "struct",
            optionD: "interface",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to declare a variable in C#?",
            optionA: "var name = value",
            optionB: "variable name = value",
            optionC: "dim name = value",
            optionD: "let name = value",
            correctAnswer: "A"
        },
        {
            question: "Which access modifier makes a member accessible only within the same class?",
            optionA: "public",
            optionB: "private",
            optionC: "protected",
            optionD: "internal",
            correctAnswer: "B"
        },
        {
            question: "What is the base class for all classes in C#?",
            optionA: "Object",
            optionB: "Base",
            optionC: "System",
            optionD: "Class",
            correctAnswer: "A"
        },
        {
            question: "Which operator is used for string concatenation in C#?",
            optionA: "&",
            optionB: "+",
            optionC: ".",
            optionD: "||",
            correctAnswer: "B"
        },
        {
            question: "What is the correct syntax for a for loop in C#?",
            optionA: "for(int i=0; i<10; i++)",
            optionB: "for i=0 to 10",
            optionC: "for(i in range(10))",
            optionD: "foreach(i in 10)",
            correctAnswer: "A"
        },
        {
            question: "Which keyword is used to handle exceptions in C#?",
            optionA: "catch",
            optionB: "except",
            optionC: "handle",
            optionD: "trap",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to define a method in C#?",
            optionA: "public void MethodName() {}",
            optionB: "function MethodName() {}",
            optionC: "def MethodName():",
            optionD: "method MethodName() {}",
            correctAnswer: "A"
        },
        {
            question: "Which collection type is similar to arrays but can resize dynamically?",
            optionA: "List",
            optionB: "Array",
            optionC: "Collection",
            optionD: "Set",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to inherit from a class in C#?",
            optionA: "class Child : Parent",
            optionB: "class Child extends Parent",
            optionC: "class Child inherits Parent",
            optionD: "class Child from Parent",
            correctAnswer: "A"
        },
        {
            question: "Which keyword is used to prevent a class from being inherited?",
            optionA: "sealed",
            optionB: "final",
            optionC: "abstract",
            optionD: "static",
            correctAnswer: "A"
        },
        {
            question: "What is the purpose of the using statement in C#?",
            optionA: "Import namespaces",
            optionB: "Include files",
            optionC: "Define variables",
            optionD: "Create objects",
            correctAnswer: "A"
        },
        {
            question: "Which data type is used to store true/false values in C#?",
            optionA: "bool",
            optionB: "boolean",
            optionC: "bit",
            optionD: "flag",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to create an array in C#?",
            optionA: "int[] arr = new int[10]",
            optionB: "int arr[10]",
            optionC: "array<int> arr(10)",
            optionD: "int arr = new array(10)",
            correctAnswer: "A"
        },
        {
            question: "Which keyword is used to define a constant in C#?",
            optionA: "const",
            optionB: "final",
            optionC: "readonly",
            optionD: "static",
            correctAnswer: "A"
        },
        {
            question: "What is the difference between struct and class in C#?",
            optionA: "struct is value type class is reference type",
            optionB: "struct is reference type class is value type",
            optionC: "No difference",
            optionD: "struct cannot have methods",
            correctAnswer: "A"
        },
        {
            question: "Which loop is guaranteed to execute at least once in C#?",
            optionA: "do-while",
            optionB: "while",
            optionC: "for",
            optionD: "foreach",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to check if a string is null or empty?",
            optionA: "string.IsNullOrEmpty()",
            optionB: "string.isEmpty()",
            optionC: "string == null || string == \"\"",
            optionD: "string.isNull()",
            correctAnswer: "A"
        },
        {
            question: "Which keyword is used to define an interface in C#?",
            optionA: "interface",
            optionB: "Interface",
            optionC: "abstract",
            optionD: "contract",
            correctAnswer: "A"
        },
        {
            question: "What is the purpose of the virtual keyword in C#?",
            optionA: "Allow method overriding",
            optionB: "Make method static",
            optionC: "Make method private",
            optionD: "Make method final",
            correctAnswer: "A"
        },
        {
            question: "Which operator is used for type casting in C#?",
            optionA: "()",
            optionB: "as",
            optionC: "cast",
            optionD: "convert",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to define a property in C#?",
            optionA: "public int Property { get; set; }",
            optionB: "property int Property",
            optionC: "int Property() {}",
            optionD: "public Property: int",
            correctAnswer: "A"
        },
        {
            question: "Which keyword is used to call the base class constructor?",
            optionA: "base",
            optionB: "super",
            optionC: "parent",
            optionD: "this",
            correctAnswer: "A"
        },
        {
            question: "What is the purpose of the static keyword in C#?",
            optionA: "Belongs to class not instance",
            optionB: "Make variable constant",
            optionC: "Make method private",
            optionD: "Allow inheritance",
            correctAnswer: "A"
        }
    ];
}

function getPythonQuestions() {
    return [
        {
            question: "What is the file extension for Python files?",
            optionA: ".py",
            optionB: ".python",
            optionC: ".pt",
            optionD: ".pyt",
            correctAnswer: "A"
        },
        {
            question: "Which keyword is used to define a function in Python?",
            optionA: "function",
            optionB: "def",
            optionC: "func",
            optionD: "define",
            correctAnswer: "B"
        },
        {
            question: "What is the correct way to create a comment in Python?",
            optionA: "// comment",
            optionB: "/* comment */",
            optionC: "# comment",
            optionD: "-- comment",
            correctAnswer: "C"
        },
        {
            question: "Which data type is mutable in Python?",
            optionA: "tuple",
            optionB: "string",
            optionC: "list",
            optionD: "int",
            correctAnswer: "C"
        },
        {
            question: "What is the output of print(2 ** 3)?",
            optionA: "6",
            optionB: "8",
            optionC: "9",
            optionD: "12",
            correctAnswer: "B"
        },
        {
            question: "Which operator is used for floor division in Python?",
            optionA: "/",
            optionB: "//",
            optionC: "%",
            optionD: "**",
            correctAnswer: "B"
        },
        {
            question: "What is the correct way to create a list in Python?",
            optionA: "list = []",
            optionB: "list = {}",
            optionC: "list = ()",
            optionD: "list = <>",
            correctAnswer: "A"
        },
        {
            question: "Which keyword is used to check if a value is in a list?",
            optionA: "in",
            optionB: "is",
            optionC: "has",
            optionD: "contains",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to define a class in Python?",
            optionA: "class MyClass:",
            optionB: "class MyClass()",
            optionC: "def MyClass:",
            optionD: "Class MyClass:",
            correctAnswer: "A"
        },
        {
            question: "Which method is used to add an element to a list?",
            optionA: "append()",
            optionB: "add()",
            optionC: "insert()",
            optionD: "push()",
            correctAnswer: "A"
        },
        {
            question: "What is the purpose of the __init__ method?",
            optionA: "Constructor",
            optionB: "Destructor",
            optionC: "Static method",
            optionD: "Class method",
            correctAnswer: "A"
        },
        {
            question: "Which keyword is used to handle exceptions in Python?",
            optionA: "try",
            optionB: "catch",
            optionC: "except",
            optionD: "handle",
            correctAnswer: "C"
        },
        {
            question: "What is the correct way to create a dictionary in Python?",
            optionA: "dict = []",
            optionB: "dict = {}",
            optionC: "dict = ()",
            optionD: "dict = <>",
            correctAnswer: "B"
        },
        {
            question: "Which function is used to get the length of a list?",
            optionA: "length()",
            optionB: "size()",
            optionC: "count()",
            optionD: "len()",
            correctAnswer: "D"
        },
        {
            question: "What is the output of print(type([]))?",
            optionA: "<class 'array'>",
            optionB: "<class 'list'>",
            optionC: "<class 'tuple'>",
            optionD: "<class 'dict'>",
            correctAnswer: "B"
        },
        {
            question: "Which keyword is used to define a lambda function?",
            optionA: "lambda",
            optionB: "function",
            optionC: "def",
            optionD: "func",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to open a file in Python?",
            optionA: "open('file.txt')",
            optionB: "file('file.txt')",
            optionC: "File('file.txt')",
            optionD: "fopen('file.txt')",
            correctAnswer: "A"
        },
        {
            question: "Which method is used to remove an element from a list?",
            optionA: "delete()",
            optionB: "remove()",
            optionC: "pop()",
            optionD: "erase()",
            correctAnswer: "B"
        },
        {
            question: "What is the purpose of the self parameter?",
            optionA: "Reference to current instance",
            optionB: "Reference to class",
            optionC: "Reference to parent",
            optionD: "Reference to module",
            correctAnswer: "A"
        },
        {
            question: "Which operator is used for string formatting?",
            optionA: "+",
            optionB: "%",
            optionC: ".",
            optionD: "&",
            correctAnswer: "B"
        },
        {
            question: "What is the output of print('Hello' + 'World')?",
            optionA: "Hello World",
            optionB: "HelloWorld",
            optionC: "Hello+World",
            optionD: "Error",
            correctAnswer: "B"
        },
        {
            question: "Which keyword is used to import modules?",
            optionA: "import",
            optionB: "include",
            optionC: "require",
            optionD: "use",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to create a tuple?",
            optionA: "tuple = []",
            optionB: "tuple = {}",
            optionC: "tuple = ()",
            optionD: "tuple = <>",
            correctAnswer: "C"
        },
        {
            question: "Which function is used to convert string to integer?",
            optionA: "int()",
            optionB: "str()",
            optionC: "float()",
            optionD: "bool()",
            correctAnswer: "A"
        },
        {
            question: "What is the purpose of the pass keyword?",
            optionA: "Skip current iteration",
            optionB: "Exit from loop",
            optionC: "Do nothing",
            optionD: "Return value",
            correctAnswer: "C"
        }
    ];
}

function getTypeScriptQuestions() {
    return [
        {
            question: "What is the file extension for TypeScript files?",
            optionA: ".ts",
            optionB: ".js",
            optionC: ".tsx",
            optionD: ".typescript",
            correctAnswer: "A"
        },
        {
            question: "Which command is used to compile TypeScript files?",
            optionA: "tsc",
            optionB: "typescript",
            optionC: "ts-compile",
            optionD: "tscompile",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to declare a variable with type in TypeScript?",
            optionA: "let name: string",
            optionB: "var name as string",
            optionC: "string name",
            optionD: "name: string",
            correctAnswer: "A"
        },
        {
            question: "Which keyword is used to define an interface in TypeScript?",
            optionA: "interface",
            optionB: "type",
            optionC: "class",
            optionD: "struct",
            correctAnswer: "A"
        },
        {
            question: "What is the purpose of the 'any' type in TypeScript?",
            optionA: "Represents any value",
            optionB: "Represents undefined",
            optionC: "Represents null",
            optionD: "Represents string",
            correctAnswer: "A"
        },
        {
            question: "Which operator is used for optional properties in TypeScript?",
            optionA: "?",
            optionB: "!",
            optionC: "&",
            optionD: "|",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to define a function type in TypeScript?",
            optionA: "(x: number) => number",
            optionB: "function(x: number): number",
            optionC: "number function(number x)",
            optionD: "func(x: number): number",
            correctAnswer: "A"
        },
        {
            question: "Which keyword is used to define a class in TypeScript?",
            optionA: "class",
            optionB: "Class",
            optionC: "interface",
            optionD: "type",
            correctAnswer: "A"
        },
        {
            question: "What is the purpose of generics in TypeScript?",
            optionA: "Create reusable components",
            optionB: "Define constants",
            optionC: "Handle errors",
            optionD: "Import modules",
            correctAnswer: "A"
        },
        {
            question: "Which access modifier makes a property accessible only within the class?",
            optionA: "private",
            optionB: "public",
            optionC: "protected",
            optionD: "readonly",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to extend an interface?",
            optionA: "interface Child extends Parent",
            optionB: "interface Child inherits Parent",
            optionC: "interface Child from Parent",
            optionD: "interface Child: Parent",
            correctAnswer: "A"
        },
        {
            question: "Which type represents a value that can be null or undefined?",
            optionA: "null | undefined",
            optionB: "nullable",
            optionC: "optional",
            optionD: "maybe",
            correctAnswer: "A"
        },
        {
            question: "What is the purpose of the 'readonly' modifier?",
            optionA: "Make property immutable",
            optionB: "Make property private",
            optionC: "Make property optional",
            optionD: "Make property public",
            correctAnswer: "A"
        },
        {
            question: "Which operator is used for type assertion in TypeScript?",
            optionA: "as",
            optionB: "is",
            optionC: "typeof",
            optionD: "instanceof",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to define an enum in TypeScript?",
            optionA: "enum Color { Red Green Blue }",
            optionB: "enum Color = { Red Green Blue }",
            optionC: "Color enum { Red Green Blue }",
            optionD: "enum { Color Red Green Blue }",
            correctAnswer: "A"
        },
        {
            question: "Which keyword is used to import modules in TypeScript?",
            optionA: "import",
            optionB: "include",
            optionC: "require",
            optionD: "use",
            correctAnswer: "A"
        },
        {
            question: "What is the purpose of the 'export' keyword?",
            optionA: "Make module members available to other modules",
            optionB: "Exit from function",
            optionC: "Export data to file",
            optionD: "Create public method",
            correctAnswer: "A"
        },
        {
            question: "Which type is used for arrays in TypeScript?",
            optionA: "Array<T> or T[]",
            optionB: "List<T>",
            optionC: "Collection<T>",
            optionD: "Set<T>",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to define a tuple in TypeScript?",
            optionA: "[string number]",
            optionB: "(string number)",
            optionC: "{string number}",
            optionD: "<string number>",
            correctAnswer: "A"
        },
        {
            question: "Which operator is used for union types in TypeScript?",
            optionA: "|",
            optionB: "&",
            optionC: "+",
            optionD: "||",
            correctAnswer: "A"
        },
        {
            question: "What is the purpose of the 'namespace' keyword?",
            optionA: "Organize code into logical groups",
            optionB: "Define variables",
            optionC: "Create classes",
            optionD: "Import modules",
            correctAnswer: "A"
        },
        {
            question: "Which keyword is used for type guards in TypeScript?",
            optionA: "is",
            optionB: "as",
            optionC: "typeof",
            optionD: "instanceof",
            correctAnswer: "A"
        },
        {
            question: "What is the correct way to define a decorator in TypeScript?",
            optionA: "@decorator",
            optionB: "#decorator",
            optionC: "decorator:",
            optionD: "[decorator]",
            correctAnswer: "A"
        },
        {
            question: "Which configuration file is used for TypeScript projects?",
            optionA: "tsconfig.json",
            optionB: "typescript.json",
            optionC: "config.ts",
            optionD: "ts.config",
            correctAnswer: "A"
        },
        {
            question: "What is the purpose of the 'declare' keyword?",
            optionA: "Declare ambient types",
            optionB: "Declare variables",
            optionC: "Declare functions",
            optionD: "Declare classes",
            correctAnswer: "A"
        }
    ];
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
    
    // Initialize database after server starts (more aggressive for Azure)
    console.log('🔧 Running Azure database initialization...');
    try {
        const { initializeAzureDatabase } = require('./azure-db-init');
        initializeAzureDatabase().then((success) => {
            if (success) {
                console.log('🎉 Azure database initialization completed successfully');
            } else {
                console.log('⚠️ Azure database initialization failed, using fallback');
            }
        }).catch(error => {
            console.log('⚠️ Azure database initialization error:', error.message);
        });
    } catch (error) {
        console.log('⚠️ Could not load azure-db-init, using standard initialization');
        ensureDatabaseInitialized().then(() => {
            console.log('🎉 Standard database initialization completed');
        }).catch(error => {
            console.log('⚠️ Database initialization failed, will retry on first request');
        });
    }
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
