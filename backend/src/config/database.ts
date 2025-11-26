import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Parse connection string URI format:
 * mssql+pyodbc://user:password@server:port/database?driver=...&options=...
 * or mssql://user:password@server\\instance/database?options=...
 */
function parseConnectionString(connectionString: string): sql.config {
    try {
        // Gestione speciale per istanze nominate SQL Server (contengono \\)
        const hasNamedInstance = connectionString.includes('\\\\');

        let server: string;
        let port: number | undefined;
        let username: string;
        let password: string;
        let database: string;
        let params: URLSearchParams;

        if (hasNamedInstance) {
            // Per istanze nominate, non usare URL parser
            // Formato: mssql://user:pass@server\\instance/database?params
            const match = connectionString.match(/^mssql(?:\+pyodbc)?:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)(?:\?(.+))?$/);

            if (!match) {
                throw new Error('Formato connection string non valido per istanza nominata');
            }

            username = decodeURIComponent(match[1]);
            password = decodeURIComponent(match[2]);
            server = match[3].replace(/\\\\/g, '\\'); // Converti \\ in \
            database = match[4];
            params = new URLSearchParams(match[5] || '');
        } else {
            // Usa URL parser per connessioni standard
            const urlStr = connectionString.replace(/^mssql\+pyodbc:\/\/|^mssql:\/\//, 'https://');
            const url = new URL(urlStr);

            server = url.hostname;
            port = url.port ? parseInt(url.port) : undefined;
            username = decodeURIComponent(url.username);
            password = decodeURIComponent(url.password);
            database = url.pathname.slice(1).split('?')[0];
            params = new URLSearchParams(url.search);
        }

        // Estrai parametri dalla query string
        const trustCert = params.get('TrustServerCertificate')?.toLowerCase() === 'yes' ||
            params.get('trustServerCertificate')?.toLowerCase() === 'true';
        const encrypt = params.get('Encrypt')?.toLowerCase() === 'yes' ||
            params.get('encrypt')?.toLowerCase() === 'true';

        const config: sql.config = {
            server: server,
            database: database,
            user: username,
            password: password,
            options: {
                encrypt: encrypt,
                trustServerCertificate: trustCert,
                enableArithAbort: true,
            },
        };

        // Aggiungi porta solo se specificata (non per istanze nominate)
        if (port) {
            config.port = port;
        }

        console.log(`🔗 Connessione a: ${server}${port ? ':' + port : ''} - Database: ${database}`);

        return config;
    } catch (error) {
        console.error('❌ Errore parsing connection string:', error);
        throw new Error('Connection string non valida');
    }
}

/**
 * Crea configurazione da variabili d'ambiente
 */
function createConfigFromEnv(): sql.config {
    const config: sql.config = {
        server: process.env.DB_SERVER || 'localhost',
        database: process.env.DB_DATABASE || 'TeleAppointmentDB',
        port: parseInt(process.env.DB_PORT || '1433'),
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' || false,
            enableArithAbort: true,
        },
    };

    // Aggiungi autenticazione
    if (process.env.DB_TRUSTED_CONNECTION === 'true') {
        // Windows Authentication
        config.options = {
            ...config.options,
            trustedConnection: true,
        };
    } else {
        // SQL Server Authentication
        config.user = process.env.DB_USER;
        config.password = process.env.DB_PASSWORD;
    }

    return config;
}

// Determina quale configurazione usare
let config: sql.config;

if (process.env.DATABASE_URL) {
    console.log('📋 Usando DATABASE_URL per la connessione');
    config = parseConnectionString(process.env.DATABASE_URL);
} else {
    console.log('📋 Usando variabili d\'ambiente separate per la connessione');
    config = createConfigFromEnv();
}

let pool: sql.ConnectionPool | null = null;

export async function getConnectionPool(): Promise<sql.ConnectionPool> {
    if (!pool) {
        pool = new sql.ConnectionPool(config);
        await pool.connect();
        console.log('✅ Connesso a SQL Server:', config.database);
    }
    return pool;
}

export async function closeConnection(): Promise<void> {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('🔌 Connessione SQL Server chiusa');
    }
}

export { sql };
