const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function loadAllQuestions() {
    try {
        console.log('🚀 Loading all questions to database...');
        
        await prisma.$connect();
        
        // Map CSV files to applications
        const questionMappings = [
            { csvFile: 'java_questions.csv', appName: 'RoadOps' },
            { csvFile: 'csharp_questions.csv', appName: 'RoadSales' },
            { csvFile: 'python_questions.csv', appName: 'UES' },
            { csvFile: 'typescript_questions.csv', appName: 'Digital' }
        ];
        
        for (const mapping of questionMappings) {
            const filePath = `./${mapping.csvFile}`;
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
