import express, { Request, Response, NextFunction } from 'express';
import { DbService, CreateAppointmentInput } from '../services/dbService';

const router = express.Router();

/**
 * GET /api/slots/available
 * Ottieni tutti gli slot disponibili
 */
router.get('/slots/available', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const slots = await DbService.getAvailableSlots();
        res.json({
            success: true,
            count: slots.length,
            data: slots,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/slots/:date
 * Ottieni slot per una data specifica (formato: YYYY-MM-DD)
 */
router.get('/slots/:date', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { date } = req.params;

        // Validazione formato data
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Formato data non valido. Usa YYYY-MM-DD',
            });
        }

        const slots = await DbService.getSlotsByDate(date);
        res.json({
            success: true,
            date,
            count: slots.length,
            data: slots,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/slots/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Ottieni slot per un range di date
 */
router.get('/slots/range', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { start, end } = req.query;

        if (!start || !end) {
            return res.status(400).json({
                success: false,
                error: 'Parametri "start" e "end" richiesti',
            });
        }

        const slots = await DbService.getSlotsByDateRange(
            start as string,
            end as string
        );

        res.json({
            success: true,
            startDate: start,
            endDate: end,
            count: slots.length,
            data: slots,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/appointments
 * Crea un nuovo appuntamento
 * Body: { slotId, customerName, customerPhone?, customerEmail?, appointmentType?, notes? }
 */
router.post('/appointments', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appointmentData: CreateAppointmentInput = req.body;

        // Validazione
        if (!appointmentData.slotId || !appointmentData.customerName) {
            return res.status(400).json({
                success: false,
                error: 'slotId e customerName sono obbligatori',
            });
        }

        const appointment = await DbService.createAppointment(appointmentData);

        res.status(201).json({
            success: true,
            message: 'Appuntamento creato con successo',
            data: appointment,
        });
    } catch (error: any) {
        if (error.message?.includes('Slot non disponibile')) {
            return res.status(409).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
});

/**
 * GET /api/appointments/:id
 * Ottieni dettagli di un appuntamento
 */
router.get('/appointments/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'ID non valido',
            });
        }

        const appointment = await DbService.getAppointmentById(id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato',
            });
        }

        res.json({
            success: true,
            data: appointment,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/appointments/:id/cancel
 * Cancella un appuntamento
 */
router.put('/appointments/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'ID non valido',
            });
        }

        const appointment = await DbService.cancelAppointment(id);

        res.json({
            success: true,
            message: 'Appuntamento cancellato con successo',
            data: appointment,
        });
    } catch (error: any) {
        if (error.message?.includes('non trovato')) {
            return res.status(404).json({
                success: false,
                error: error.message,
            });
        }
        if (error.message?.includes('già cancellato')) {
            return res.status(400).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
});

/**
 * POST /api/slots/generate
 * Genera slot per un range di date
 * Body: { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
 */
router.post('/slots/generate', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate e endDate sono obbligatori',
            });
        }

        const result = await DbService.generateSlots(startDate, endDate);

        res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
