const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Azure Database Initialization Starting...');
console.log('📍 Working Directory:', process.cwd());
console.log('🌐 Environment:', process.env.NODE_ENV || 'production');

async function initializeAzureDatabase() {
    let prisma;
    
    try {
        // Step 1: Generate Prisma Client
        console.log('🔧 Step 1: Generating Prisma client...');
        execSync('npx prisma generate', { stdio: 'inherit' });
        console.log('✅ Prisma client generated');

        // Step 2: Check database file
        const dbFile = path.join(__dirname, 'prisma', 'quiz_app.db');
        console.log('📂 Database file path:', dbFile);
        console.log('📊 Database exists:', fs.existsSync(dbFile));

        // Step 3: Initialize database schema
        console.log('🔧 Step 2: Setting up database schema...');
        try {
            execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
            console.log('✅ Database schema created');
        } catch (error) {
            console.log('⚠️ Database schema creation warning:', error.message);
        }

        // Step 4: Initialize Prisma client and test connection
        console.log('🔧 Step 3: Testing database connection...');
        prisma = new PrismaClient({
            log: ['error', 'warn'],
        });

        await prisma.$connect();
        console.log('✅ Database connection successful');

        // Step 5: Create applications
        console.log('🔧 Step 4: Creating applications...');
        const defaultApps = [
            { name: 'RoadOps', description: 'RoadOps application quiz covering operational procedures and best practices' },
            { name: 'RoadSales', description: 'RoadSales application quiz covering sales processes and methodologies' },
            { name: 'UES', description: 'UES application quiz covering unified enterprise systems' },
            { name: 'Digital', description: 'Digital application quiz covering digital transformation and technologies' }
        ];

        for (const app of defaultApps) {
            try {
                const existing = await prisma.application.findFirst({
                    where: { name: app.name }
                });

                if (!existing) {
                    await prisma.application.create({ data: app });
                    console.log(`✅ Created application: ${app.name}`);
                } else {
                    console.log(`📋 Application exists: ${app.name}`);
                }
            } catch (error) {
                console.log(`⚠️ Error with application ${app.name}:`, error.message);
            }
        }

        // Step 6: Load questions
        console.log('🔧 Step 5: Loading questions...');
        
        // Check if load-questions.js exists and run it
        const loadQuestionsScript = path.join(__dirname, 'load-questions.js');
        if (fs.existsSync(loadQuestionsScript)) {
            console.log('📚 Found load-questions.js, executing...');
            // Don't use execSync here as it may cause issues, instead require and run
            delete require.cache[loadQuestionsScript]; // Clear cache
            require('./load-questions.js');
        } else {
            console.log('⚠️ load-questions.js not found, loading manually...');
            await loadQuestionsManually(prisma);
        }

        // Step 7: Verify setup
        console.log('🔧 Step 6: Verifying setup...');
        const appCount = await prisma.application.count();
        const questionCount = await prisma.question.count();
        
        console.log(`📊 Applications created: ${appCount}`);
        console.log(`📚 Questions loaded: ${questionCount}`);

        if (questionCount === 0) {
            console.log('⚠️ No questions found, attempting manual load...');
            await loadQuestionsManually(prisma);
        }

        console.log('✅ Azure database initialization completed successfully!');
        return true;

    } catch (error) {
        console.error('❌ Azure database initialization failed:', error);
        return false;
    } finally {
        if (prisma) {
            await prisma.$disconnect();
        }
    }
}

async function loadQuestionsManually(prisma) {
    console.log('🔧 Loading questions manually...');
    
    const questionSets = [
        { appName: 'RoadOps', questions: getJavaQuestions() },
        { appName: 'RoadSales', questions: getCSharpQuestions() },
        { appName: 'UES', questions: getPythonQuestions() },
        { appName: 'Digital', questions: getTypeScriptQuestions() }
    ];

    for (const set of questionSets) {
        try {
            const app = await prisma.application.findFirst({
                where: { name: set.appName }
            });

            if (!app) {
                console.log(`⚠️ Application ${set.appName} not found`);
                continue;
            }

            // Clear existing questions
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

        } catch (error) {
            console.log(`❌ Error loading questions for ${set.appName}:`, error.message);
        }
    }
}

// Hardcoded questions as fallback
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
        // Add more questions as needed...
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
        // Add more questions...
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
        // Add more questions...
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
        // Add more questions...
    ];
}

// Run if called directly
if (require.main === module) {
    initializeAzureDatabase()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('❌ Initialization failed:', error);
            process.exit(1);
        });
}

module.exports = { initializeAzureDatabase };
