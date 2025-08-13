const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const prisma = new PrismaClient();

async function setupAzureDatabase() {
    try {
        console.log('🔧 Setting up Azure database...');
        
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
                    const created = await prisma.application.create({ data: app });
                    console.log(`✅ Created application: ${app.name} (ID: ${created.id})`);
                } catch (error) {
                    console.log(`⚠️ Application ${app.name} might already exist`);
                }
            }
        } else {
            console.log('✅ Applications already exist, skipping creation');
        }
        
        // Check for questions
        const questionCount = await prisma.question.count();
        console.log(`📚 Found ${questionCount} questions in database`);
        
        if (questionCount === 0) {
            console.log('📝 Loading questions from CSV files...');
            
            // Load questions from CSV files
            const csvFiles = [
                { file: 'java_questions.csv', appName: 'RoadOps' },
                { file: 'csharp_questions.csv', appName: 'RoadSales' },
                { file: 'python_questions.csv', appName: 'UES' },
                { file: 'typescript_questions.csv', appName: 'Digital' }
            ];
            
            for (const { file, appName } of csvFiles) {
                const filePath = path.join(__dirname, file);
                if (fs.existsSync(filePath)) {
                    await loadQuestionsFromCSV(filePath, appName);
                } else {
                    console.log(`⚠️ CSV file not found: ${file}`);
                }
            }
        }
        
        console.log('✅ Azure database setup complete');
        
    } catch (error) {
        console.error('❌ Azure database setup failed:', error);
        console.log('⚠️ Application will continue without database initialization');
    } finally {
        await prisma.$disconnect();
        process.exit(0);
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
                            await prisma.question.createMany({
                                data: questions
                            });
                            console.log(`✅ Loaded ${questions.length} questions for ${applicationName}`);
                            resolve();
                        } catch (error) {
                            console.error(`❌ Error loading questions for ${applicationName}:`, error);
                            resolve(); // Continue even if this fails
                        }
                    })
                    .on('error', (error) => {
                        console.error(`❌ Error reading CSV ${csvFile}:`, error);
                        resolve(); // Continue even if this fails
                    });
            })
            .catch(error => {
                console.error(`❌ Error finding application ${applicationName}:`, error);
                resolve(); // Continue even if this fails
            });
    });
}

setupAzureDatabase();
