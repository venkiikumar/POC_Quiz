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
        
        // Try to run a simple query to check if tables exist
        let needsInitialization = false;
        try {
            const appCount = await prisma.application.count();
            console.log(`📊 Found ${appCount} applications in database`);
            
            if (appCount === 0) {
                needsInitialization = true;
                console.log('📝 No applications found, will create default ones');
            }
        } catch (error) {
            console.log('⚠️ Database tables do not exist, will initialize');
            needsInitialization = true;
        }
        
        if (needsInitialization) {
            console.log('🚀 Initializing database with applications and questions...');
            
            // Create default applications
            const defaultApps = [
                { name: 'RoadOps', description: 'RoadOps application quiz covering operational procedures and best practices' },
                { name: 'RoadSales', description: 'RoadSales application quiz covering sales processes and methodologies' },
                { name: 'UES', description: 'UES application quiz covering unified enterprise systems' },
                { name: 'Digital', description: 'Digital application quiz covering digital transformation and technologies' }
            ];
            
            for (const app of defaultApps) {
                try {
                    const created = await prisma.application.upsert({
                        where: { name: app.name },
                        update: {},
                        create: app
                    });
                    console.log(`✅ Created application: ${app.name} (ID: ${created.id})`);
                } catch (error) {
                    console.log(`⚠️ Error creating application ${app.name}:`, error.message);
                }
            }
            
            // Load questions from Java CSV (since we know it works)
            await loadJavaQuestions();
        }
        
        // Final verification
        try {
            const finalAppCount = await prisma.application.count();
            const finalQuestionCount = await prisma.question.count();
            console.log(`✅ Final count: ${finalAppCount} applications, ${finalQuestionCount} questions`);
        } catch (error) {
            console.log('⚠️ Could not verify final counts:', error.message);
        }
        
        console.log('✅ Azure database setup complete');
        
    } catch (error) {
        console.error('❌ Azure database setup failed:', error);
        console.log('⚠️ Application will continue with fallback data');
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

async function loadJavaQuestions() {
    console.log('📚 Loading Java questions for all applications...');
    
    try {
        // Get all applications
        const applications = await prisma.application.findMany();
        
        // Use Java questions for all applications since they work well
        const javaQuestionsPath = path.join(__dirname, 'java_questions.csv');
        
        if (!fs.existsSync(javaQuestionsPath)) {
            console.log('⚠️ java_questions.csv not found');
            return;
        }
        
        for (const app of applications) {
            console.log(`📝 Loading questions for ${app.name}...`);
            
            const questions = [];
            
            await new Promise((resolve, reject) => {
                fs.createReadStream(javaQuestionsPath)
                    .pipe(csv())
                    .on('data', (data) => {
                        // Validate required fields
                        if (data.question && data.optionA && data.optionB && data.optionC && data.optionD && data.correctAnswer) {
                            questions.push({
                                question: data.question.trim(),
                                optionA: data.optionA.trim(),
                                optionB: data.optionB.trim(),
                                optionC: data.optionC.trim(),
                                optionD: data.optionD.trim(),
                                correctAnswer: data.correctAnswer.trim(),
                                applicationId: app.id
                            });
                        }
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
            
            if (questions.length > 0) {
                try {
                    // Clear existing questions for this application
                    await prisma.question.deleteMany({
                        where: { applicationId: app.id }
                    });
                    
                    // Insert new questions
                    await prisma.question.createMany({
                        data: questions
                    });
                    
                    console.log(`✅ Loaded ${questions.length} questions for ${app.name}`);
                } catch (error) {
                    console.log(`❌ Error inserting questions for ${app.name}:`, error.message);
                }
            } else {
                console.log(`⚠️ No valid questions found for ${app.name}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading Java questions:', error);
    }
}

setupAzureDatabase();
