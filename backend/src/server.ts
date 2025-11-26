import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import appointmentRoutes from './routes/appointmentRoutes';
import prisma from './config/database';

// Carica variabili d'ambiente
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:5174',
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Permetti richieste senza origin (es. Postman, curl)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Non autorizzato da CORS'));
            }
        },
        credentials: true,
    })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// API Routes
app.use('/api', appointmentRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint non trovato',
        path: req.path,
    });
});

// Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('❌ Errore:', err);

    res.status(500).json({
        success: false,
        error: 'Errore interno del server',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// Avvia il server
async function startServer() {
    try {
        // Test connessione database
        await prisma.$connect();
        console.log('✅ Database connesso');

        // Avvia server
        app.listen(PORT, () => {
            console.log(`🚀 Server in ascolto su http://localhost:${PORT}`);
            console.log(`📋 API disponibili su http://localhost:${PORT}/api`);
            console.log(`❤️  Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('❌ Errore avvio server:', error);
        process.exit(1);
    }
}

// Gestione chiusura graceful
process.on('SIGINT', async () => {
    console.log('\n🛑 Chiusura server...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Chiusura server...');
    await prisma.$disconnect();
    process.exit(0);
});

startServer();

export default app;
