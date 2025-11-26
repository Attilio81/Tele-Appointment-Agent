// Service per comunicare con il backend API degli appuntamenti

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface AvailableSlot {
    SlotID: number;
    Date: string;
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
    BookedAt: string;
}

export interface CreateAppointmentData {
    slotId: number;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    appointmentType?: string;
    notes?: string;
}

/**
 * Ottieni tutti gli slot disponibili
 */
export async function fetchAvailableSlots(): Promise<AvailableSlot[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/slots/available`);

        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }

        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error('Errore recupero slot disponibili:', error);
        throw error;
    }
}

/**
 * Ottieni slot per una data specifica
 */
export async function fetchSlotsByDate(date: string): Promise<AvailableSlot[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/slots/${date}`);

        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }

        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error('Errore recupero slot per data:', error);
        throw error;
    }
}

/**
 * Ottieni slot per un range di date
 */
export async function fetchSlotsByDateRange(
    startDate: string,
    endDate: string
): Promise<AvailableSlot[]> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/slots/range?start=${startDate}&end=${endDate}`
        );

        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }

        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error('Errore recupero slot per range:', error);
        throw error;
    }
}

/**
 * Prenota un nuovo appuntamento
 */
export async function bookAppointment(
    data: CreateAppointmentData
): Promise<Appointment> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Errore HTTP: ${response.status}`);
        }

        return result.data;
    } catch (error) {
        console.error('Errore prenotazione appuntamento:', error);
        throw error;
    }
}

/**
 * Ottieni dettagli di un appuntamento
 */
export async function fetchAppointmentById(id: number): Promise<Appointment> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/appointments/${id}`);

        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }

        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('Errore recupero appuntamento:', error);
        throw error;
    }
}

/**
 * Cancella un appuntamento
 */
export async function cancelAppointment(id: number): Promise<Appointment> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/appointments/${id}/cancel`, {
            method: 'PUT',
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Errore HTTP: ${response.status}`);
        }

        return result.data;
    } catch (error) {
        console.error('Errore cancellazione appuntamento:', error);
        throw error;
    }
}

/**
 * Genera slot per un range di date
 */
export async function generateSlots(
    startDate: string,
    endDate: string
): Promise<{ message: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/slots/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ startDate, endDate }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Errore HTTP: ${response.status}`);
        }

        return result;
    } catch (error) {
        console.error('Errore generazione slot:', error);
        throw error;
    }
}
