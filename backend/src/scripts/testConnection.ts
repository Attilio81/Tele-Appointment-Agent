import { getConnectionPool, closeConnection } from '../config/database';

async function testConnection() {
    try {
        console.log('🔄 Test connessione SQL Server...\n');

        const pool = await getConnectionPool();
        console.log('✅ Connessione stabilita!\n');

        // Test query
        const result = await pool.request().query('SELECT @@VERSION AS Version');
        console.log('📊 Versione SQL Server:');
        console.log(result.recordset[0].Version);
        console.log('\n');

        // Test database
        const dbResult = await pool.request().query('SELECT DB_NAME() AS CurrentDB');
        console.log('💾 Database corrente:', dbResult.recordset[0].CurrentDB);
        console.log('\n');

        // Test tabelle
        const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

        console.log('📋 Tabelle disponibili:');
        tablesResult.recordset.forEach((table: any) => {
            console.log(`  - ${table.TABLE_NAME}`);
        });

        console.log('\n✅ Test completato con successo!');

        await closeConnection();
        process.exit(0);
    } catch (error) {
        console.error('❌ Errore durante il test:', error);
        await closeConnection();
        process.exit(1);
    }
}

testConnection();
