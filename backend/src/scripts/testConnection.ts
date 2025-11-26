import prisma from '../config/database';

async function testConnection() {
    try {
        console.log('🔄 Test connessione SQLite + Prisma...\n');

        await prisma.$connect();
        console.log('✅ Connessione stabilita!\n');

        // Test query - count slots
        const slotCount = await prisma.slot.count();
        console.log('📊 Numero di slot nel database:', slotCount);
        console.log('\n');

        // Test query - count appointments
        const appointmentCount = await prisma.appointment.count();
        console.log('📋 Numero di appuntamenti:', appointmentCount);
        console.log('\n');

        console.log('✅ Test completato con successo!');

        await prisma.$disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Errore durante il test:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

testConnection();
