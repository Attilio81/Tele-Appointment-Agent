import { getConnectionPool, sql } from '../config/database';

export interface AvailableSlot {
    SlotID: number;
    Date: Date;
    StartTime: string;
    EndTime: string;
    IsBooked: boolean;
    MaxCapacity: number;
    CurrentBookings: number;
    SlotsRemaining: number;
    FormattedDate: string;
    FormattedStartTime: string;
    FormattedEndTime: string;
}

export interface Appointment {
    AppointmentID: number;
    SlotID: number;
    CustomerName: string;
    CustomerPhone?: string;
    CustomerEmail?: string;
    AppointmentType?: string;
    Notes?: string;
    Status: string;
    BookedAt: Date;
}

export interface CreateAppointmentInput {
    slotId: number;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    appointmentType?: string;
    notes?: string;
}

export class DbService {
    /**
     * Ottieni tutti gli slot disponibili (da oggi in poi)
     */
    static async getAvailableSlots(): Promise<AvailableSlot[]> {
        const pool = await getConnectionPool();
        const result = await pool.request().query<AvailableSlot>(`
      SELECT * FROM vw_AvailableSlots
      ORDER BY Date, StartTime
    `);
        return result.recordset;
    }

    /**
     * Ottieni gli slot per una data specifica
     */
    static async getSlotsByDate(date: string): Promise<AvailableSlot[]> {
        const pool = await getConnectionPool();
        const result = await pool
            .request()
            .input('date', sql.Date, date)
            .query<AvailableSlot>(`
        SELECT * FROM vw_AvailableSlots
        WHERE Date = @date
        ORDER BY StartTime
      `);
        return result.recordset;
    }

    /**
     * Ottieni gli slot in un range di date
     */
    static async getSlotsByDateRange(
        startDate: string,
        endDate: string
    ): Promise<AvailableSlot[]> {
        const pool = await getConnectionPool();
        const result = await pool
            .request()
            .input('startDate', sql.Date, startDate)
            .input('endDate', sql.Date, endDate)
            .query<AvailableSlot>(`
        SELECT * FROM vw_AvailableSlots
        WHERE Date BETWEEN @startDate AND @endDate
        ORDER BY Date, StartTime
      `);
        return result.recordset;
    }

    /**
     * Crea un nuovo appuntamento
     */
    static async createAppointment(
        data: CreateAppointmentInput
    ): Promise<Appointment> {
        const pool = await getConnectionPool();

        // Verifica che lo slot sia disponibile
        const slotCheck = await pool
            .request()
            .input('slotId', sql.Int, data.slotId)
            .query(`
        SELECT CurrentBookings, MaxCapacity 
        FROM AvailableSlots 
        WHERE SlotID = @slotId
      `);

        if (slotCheck.recordset.length === 0) {
            throw new Error('Slot non trovato');
        }

        const slot = slotCheck.recordset[0];
        if (slot.CurrentBookings >= slot.MaxCapacity) {
            throw new Error('Slot non disponibile - capacità massima raggiunta');
        }

        // Inserisci l'appuntamento
        const result = await pool
            .request()
            .input('slotId', sql.Int, data.slotId)
            .input('customerName', sql.NVarChar, data.customerName)
            .input('customerPhone', sql.NVarChar, data.customerPhone || null)
            .input('customerEmail', sql.NVarChar, data.customerEmail || null)
            .input('appointmentType', sql.NVarChar, data.appointmentType || null)
            .input('notes', sql.NVarChar, data.notes || null)
            .query<Appointment>(`
        INSERT INTO Appointments 
        (SlotID, CustomerName, CustomerPhone, CustomerEmail, AppointmentType, Notes, Status)
        OUTPUT INSERTED.*
        VALUES (@slotId, @customerName, @customerPhone, @customerEmail, @appointmentType, @notes, 'Confermato')
      `);

        return result.recordset[0];
    }

    /**
     * Ottieni un appuntamento specifico per ID
     */
    static async getAppointmentById(id: number): Promise<Appointment | null> {
        const pool = await getConnectionPool();
        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query<Appointment>(`
        SELECT * FROM Appointments
        WHERE AppointmentID = @id
      `);

        return result.recordset[0] || null;
    }

    /**
     * Cancella un appuntamento
     */
    static async cancelAppointment(id: number): Promise<Appointment> {
        const pool = await getConnectionPool();

        // Verifica che l'appuntamento esista
        const existing = await this.getAppointmentById(id);
        if (!existing) {
            throw new Error('Appuntamento non trovato');
        }

        if (existing.Status === 'Cancellato') {
            throw new Error('Appuntamento già cancellato');
        }

        // Aggiorna lo stato
        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query<Appointment>(`
        UPDATE Appointments
        SET Status = 'Cancellato', CancelledAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE AppointmentID = @id
      `);

        return result.recordset[0];
    }

    /**
     * Genera slot per un range di date (chiama la stored procedure)
     */
    static async generateSlots(
        startDate: string,
        endDate: string
    ): Promise<{ message: string }> {
        const pool = await getConnectionPool();

        await pool
            .request()
            .input('StartDate', sql.Date, startDate)
            .input('EndDate', sql.Date, endDate)
            .execute('sp_GenerateSlots');

        return { message: `Slot generati dal ${startDate} al ${endDate}` };
    }
}
