const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const prisma = new PrismaClient();

async function seedApplications() {
    console.log('🌱 Seeding applications...');
    
    const applications = [
        { 
            name: 'RoadOps', 
            description: 'RoadOps application quiz covering operational procedures and best practices',
            questionCount: 25, 
            maxQuestions: 100 
        },
        { 
            name: 'RoadSales', 
            description: 'RoadSales application quiz covering sales processes and methodologies',
            questionCount: 25, 
            maxQuestions: 100 
        },
        { 
            name: 'UES', 
            description: 'UES application quiz covering unified enterprise systems',
            questionCount: 25, 
            maxQuestions: 100 
        },
        {
            name: 'Digital',
            description: 'Digital application quiz covering digital transformation and technologies',
            questionCount: 25,
            maxQuestions: 100
        }
    ];

    for (const app of applications) {
        await prisma.application.upsert({
            where: { name: app.name },
            update: {},
            create: app
        });
    }
    
    console.log('✅ Applications seeded successfully');
}

async function seedQuestionsFromCSV(csvFile, applicationName) {
    console.log(`📚 Seeding questions from ${csvFile} for ${applicationName}...`);
    
    const application = await prisma.application.findUnique({
        where: { name: applicationName }
    });
    
    if (!application) {
        console.error(`❌ Application ${applicationName} not found`);
        return;
    }

    // Clear existing questions for this application
    await prisma.question.deleteMany({
        where: { applicationId: application.id }
    });

    const questions = [];
    const filePath = path.join(__dirname, '..', csvFile);
    
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️  File ${filePath} not found, skipping...`);
            resolve();
            return;
        }

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                if (row.question && row.optionA && row.optionB && row.optionC && row.optionD && row.correctAnswer) {
                    questions.push({
                        applicationId: application.id,
                        question: row.question.trim(),
                        optionA: row.optionA.trim(),
                        optionB: row.optionB.trim(),
                        optionC: row.optionC.trim(),
                        optionD: row.optionD.trim(),
                        correctAnswer: row.correctAnswer.trim().toUpperCase()
                    });
                }
            })
            .on('end', async () => {
                try {
                    if (questions.length > 0) {
                        await prisma.question.createMany({
                            data: questions
                        });
                        console.log(`✅ Seeded ${questions.length} questions for ${applicationName}`);
                    } else {
                        console.log(`⚠️  No valid questions found in ${csvFile}`);
                    }
                    resolve();
                } catch (error) {
                    console.error(`❌ Error seeding questions for ${applicationName}:`, error);
                    reject(error);
                }
            })
            .on('error', (error) => {
                console.error(`❌ Error reading ${csvFile}:`, error);
                reject(error);
            });
    });
}

async function main() {
    try {
        console.log('🚀 Starting database seed...');
        
        await seedApplications();
        
        // Seed questions from CSV files
        await seedQuestionsFromCSV('java_questions.csv', 'Java Programming Quiz');
        await seedQuestionsFromCSV('csharp_questions.csv', 'C# Programming Quiz');
        await seedQuestionsFromCSV('typescript_questions.csv', 'TypeScript Quiz');
        
        // Display final stats
        console.log('\n📊 Database seeded successfully!');
        console.log('Current applications and question counts:');
        
        const apps = await prisma.application.findMany({
            include: {
                _count: {
                    select: { questions: true }
                }
            }
        });
        
        apps.forEach(app => {
            console.log(`- ${app.name}: ${app._count.questions} questions`);
        });
        
        console.log('\n🎉 Seed completed!');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
