const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Azure post-install setup...');

async function azurePostInstall() {
    try {
        console.log('📦 Generating Prisma client...');
        const { execSync } = require('child_process');
        
        // Generate Prisma client
        execSync('npx prisma generate', { stdio: 'inherit' });
        
        console.log('🔧 Setting up database...');
        
        // Check if database file exists
        const dbPath = path.join(__dirname, 'quiz_app.db');
        const dbExists = fs.existsSync(dbPath);
        
        console.log(`📊 Database file exists: ${dbExists}`);
        console.log(`📍 Database path: ${dbPath}`);
        
        if (!dbExists) {
            console.log('📝 Creating new database...');
            // Push schema to create tables
            execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
            
            // Initialize with data
            await initializeDatabase();
        } else {
            console.log('✅ Database file exists, verifying structure...');
            try {
                await verifyDatabase();
            } catch (error) {
                console.log('⚠️ Database verification failed, reinitializing...');
                execSync('npx prisma db push --accept-data-loss --force-reset', { stdio: 'inherit' });
                await initializeDatabase();
            }
        }
        
        console.log('✅ Azure post-install completed successfully');
        
    } catch (error) {
        console.error('❌ Azure post-install failed:', error);
        process.exit(1);
    }
}

async function verifyDatabase() {
    const prisma = new PrismaClient();
    try {
        await prisma.$connect();
        
        // Check if tables exist by trying to count applications
        const appCount = await prisma.application.count();
        console.log(`📋 Found ${appCount} applications`);
        
        const questionCount = await prisma.question.count();
        console.log(`📚 Found ${questionCount} questions`);
        
        if (appCount === 0) {
            throw new Error('No applications found - need to initialize');
        }
        
        console.log('✅ Database verification passed');
    } finally {
        await prisma.$disconnect();
    }
}

async function initializeDatabase() {
    console.log('🌱 Initializing database with sample data...');
    
    const prisma = new PrismaClient();
    try {
        await prisma.$connect();
        
        // Create applications
        const applications = [
            { name: 'RoadOps', description: 'RoadOps application quiz covering operational procedures and best practices' },
            { name: 'RoadSales', description: 'RoadSales application quiz covering sales processes and methodologies' },
            { name: 'UES', description: 'UES application quiz covering unified enterprise systems' },
            { name: 'Digital', description: 'Digital application quiz covering digital transformation and technologies' }
        ];
        
        for (const app of applications) {
            const created = await prisma.application.upsert({
                where: { name: app.name },
                update: {},
                create: app
            });
            console.log(`✅ Created/Updated application: ${app.name} (ID: ${created.id})`);
        }
        
        // Load questions from CSV files
        await loadQuestionsFromCSV();
        
        console.log('✅ Database initialization completed');
        
    } finally {
        await prisma.$disconnect();
    }
}

async function loadQuestionsFromCSV() {
    const prisma = new PrismaClient();
    const csv = require('csv-parser');
    
    try {
        // Get all applications
        const applications = await prisma.application.findMany();
        
        // Map CSV files to applications - use Java questions for all since they work
        const questionMappings = [
            { csvFile: 'java_questions.csv', appName: 'RoadOps' },
            { csvFile: 'java_questions.csv', appName: 'RoadSales' }, // Use Java questions for all
            { csvFile: 'java_questions.csv', appName: 'UES' },
            { csvFile: 'java_questions.csv', appName: 'Digital' }
        ];
        
        for (const mapping of questionMappings) {
            const app = applications.find(a => a.name === mapping.appName);
            if (!app) {
                console.log(`⚠️ Application ${mapping.appName} not found`);
                continue;
            }
            
            const filePath = path.join(__dirname, mapping.csvFile);
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️ CSV file not found: ${mapping.csvFile}`);
                continue;
            }
            
            console.log(`📚 Loading questions from ${mapping.csvFile} for ${mapping.appName}...`);
            
            const questions = [];
            
            await new Promise((resolve, reject) => {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (data) => {
                        // Only add if all required fields are present
                        if (data.question && data.optionA && data.optionB && data.optionC && data.optionD && data.correctAnswer) {
                            questions.push({
                                question: data.question,
                                optionA: data.optionA,
                                optionB: data.optionB,
                                optionC: data.optionC,
                                optionD: data.optionD,
                                correctAnswer: data.correctAnswer,
                                applicationId: app.id
                            });
                        }
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
            
            if (questions.length > 0) {
                // Clear existing questions for this application
                await prisma.question.deleteMany({
                    where: { applicationId: app.id }
                });
                
                // Insert new questions
                await prisma.question.createMany({
                    data: questions
                });
                
                console.log(`✅ Loaded ${questions.length} questions for ${mapping.appName}`);
            } else {
                console.log(`⚠️ No valid questions found in ${mapping.csvFile}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading questions from CSV:', error);
    }
}

azurePostInstall();
