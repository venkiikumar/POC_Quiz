const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addDigitalApplication() {
    try {
        console.log('🔄 Adding Digital application...');
        
        const digitalApp = await prisma.application.create({
            data: {
                name: 'Digital',
                questionCount: 25,
                maxQuestions: 100
            }
        });
        
        console.log('✅ Digital application added successfully:', digitalApp);
        console.log(`📋 Application ID: ${digitalApp.id}`);
        
    } catch (error) {
        if (error.code === 'P2002') {
            console.log('ℹ️ Digital application already exists');
        } else {
            console.error('❌ Error adding Digital application:', error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

addDigitalApplication();