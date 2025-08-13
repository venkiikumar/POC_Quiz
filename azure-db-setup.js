const { PrismaClient } = require('@prisma/client');

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
            console.log('⚠️ No questions found. You can upload questions via the admin panel.');
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

setupAzureDatabase();
