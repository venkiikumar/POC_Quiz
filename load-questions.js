const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Create Prisma client with better error handling
const prisma = new PrismaClient({
    log: ['error', 'warn'],
});

async function loadAllQuestions() {
    try {
        console.log('🚀 Loading all questions to database...');
        console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
        
        // Test database connection with retry logic
        let connected = false;
        for (let i = 0; i < 3; i++) {
            try {
                await prisma.$connect();
                connected = true;
                console.log('✅ Database connected successfully');
                break;
            } catch (error) {
                console.log(`⚠️ Database connection attempt ${i + 1} failed:`, error.message);
                if (i < 2) {
                    console.log('🔄 Retrying in 2 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        if (!connected) {
            throw new Error('Could not connect to database after 3 attempts');
        }
        
        // Ensure applications exist
        await ensureApplicationsExist();
        
        // Map CSV files to applications
        const questionMappings = [
            { csvFile: './java_questions.csv', appName: 'RoadOps' },
            { csvFile: './csharp_questions.csv', appName: 'RoadSales' },
            { csvFile: './python_questions.csv', appName: 'UES' },
            { csvFile: './typescript_questions.csv', appName: 'Digital' }
        ];
        
        for (const mapping of questionMappings) {
            const filePath = path.resolve(__dirname, mapping.csvFile);
            if (fs.existsSync(filePath)) {
                await loadQuestionsFromCSV(filePath, mapping.appName);
            } else {
                console.log(`⚠️ File not found: ${mapping.csvFile}`);
            }
        }
        
        console.log('✅ All questions loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading questions:', error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

async function ensureApplicationsExist() {
    console.log('🔧 Ensuring applications exist...');
    
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
}

async function loadQuestionsFromCSV(csvFile, applicationName) {
    return new Promise((resolve, reject) => {
        console.log(`📚 Loading questions from ${csvFile} for ${applicationName}...`);
        
        prisma.application.findFirst({ where: { name: applicationName } })
            .then(application => {
                if (!application) {
                    console.log(`❌ Application ${applicationName} not found`);
                    resolve();
                    return;
                }
                
                const questions = [];
                
                fs.createReadStream(csvFile)
                    .pipe(csv())
                    .on('data', (data) => {
                        questions.push({
                            question: data.question,
                            optionA: data.optionA,
                            optionB: data.optionB,
                            optionC: data.optionC,
                            optionD: data.optionD,
                            correctAnswer: data.correctAnswer,
                            applicationId: application.id
                        });
                    })
                    .on('end', async () => {
                        try {
                            // Clear existing questions for this application
                            await prisma.question.deleteMany({
                                where: { applicationId: application.id }
                            });
                            
                            // Insert new questions
                            await prisma.question.createMany({
                                data: questions
                            });
                            
                            console.log(`✅ Loaded ${questions.length} questions for ${applicationName}`);
                            resolve();
                        } catch (error) {
                            console.error(`❌ Error loading questions for ${applicationName}:`, error);
                            resolve();
                        }
                    })
                    .on('error', (error) => {
                        console.error(`❌ Error reading CSV ${csvFile}:`, error);
                        resolve();
                    });
            })
            .catch(error => {
                console.error(`❌ Error finding application ${applicationName}:`, error);
                resolve();
            });
    });
}

loadAllQuestions();
