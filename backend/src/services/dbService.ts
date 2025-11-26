import prisma from '../config/database';
import { Appointment as PrismaAppointment, Slot as PrismaSlot } from '@prisma/client';

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
    CancelledAt?: Date;
}

export interface CreateAppointmentInput {
    slotId: number;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    appointmentType?: string;
    notes?: string;
}

// Helper per formattare date
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function mapSlot(slot: PrismaSlot): AvailableSlot {
    return {
        SlotID: slot.id,
        Date: slot.date,
        StartTime: slot.startTime,
        EndTime: slot.endTime,
        IsBooked: slot.isBooked,
        MaxCapacity: slot.maxCapacity,
        CurrentBookings: slot.currentBookings,
        SlotsRemaining: slot.maxCapacity - slot.currentBookings,
        FormattedDate: formatDate(slot.date),
        FormattedStartTime: slot.startTime.substring(0, 5),
        FormattedEndTime: slot.endTime.substring(0, 5),
    };
}

function mapAppointment(app: PrismaAppointment): Appointment {
    return {
        AppointmentID: app.id,
        SlotID: app.slotId,
        CustomerName: app.customerName,
        CustomerPhone: app.customerPhone || undefined,
        CustomerEmail: app.customerEmail || undefined,
        AppointmentType: app.appointmentType || undefined,
        Notes: app.notes || undefined,
        Status: app.status,
        BookedAt: app.bookedAt,
        CancelledAt: app.cancelledAt || undefined,
    };
}

export class DbService {
    /**
     * Ottieni tutti gli slot disponibili (da oggi in poi)
     */
    static async getAvailableSlots(): Promise<AvailableSlot[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const slots = await prisma.slot.findMany({
            where: {
                date: {
                    gte: today,
                },
                isBooked: false,
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' },
            ],
        });

        return slots.map(mapSlot);
    }

    /**
     * Ottieni gli slot per una data specifica
     */
    static async getSlotsByDate(date: string): Promise<AvailableSlot[]> {
        const searchDate = new Date(date);

        const slots = await prisma.slot.findMany({
            where: {
                date: searchDate,
            },
            orderBy: {
                startTime: 'asc',
            },
        });

        return slots.map(mapSlot);
    }

    /**
     * Ottieni gli slot in un range di date
     */
    static async getSlotsByDateRange(
        startDate: string,
        endDate: string
    ): Promise<AvailableSlot[]> {
        const slots = await prisma.slot.findMany({
            where: {
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' },
            ],
        });

        return slots.map(mapSlot);
    }

    /**
     * Crea un nuovo appuntamento
     */
    static async createAppointment(
        data: CreateAppointmentInput
    ): Promise<Appointment> {
        return prisma.$transaction(async (tx) => {
            // 1. Verifica slot
            const slot = await tx.slot.findUnique({
                where: { id: data.slotId },
            });

            if (!slot) {
                throw new Error('Slot non trovato');
            }

            if (slot.currentBookings >= slot.maxCapacity) {
                throw new Error('Slot non disponibile - capacità massima raggiunta');
            }

            // 2. Crea appuntamento
            const appointment = await tx.appointment.create({
                data: {
                    slotId: data.slotId,
                    customerName: data.customerName,
                    customerPhone: data.customerPhone,
                    customerEmail: data.customerEmail,
                    appointmentType: data.appointmentType,
                    notes: data.notes,
                    status: 'Confermato',
                },
            });

            // 3. Aggiorna slot
            const newBookings = slot.currentBookings + 1;
            await tx.slot.update({
                where: { id: slot.id },
                data: {
                    currentBookings: newBookings,
                    isBooked: newBookings >= slot.maxCapacity,
                },
            });

            return mapAppointment(appointment);
        });
    }

    /**
     * Ottieni un appuntamento specifico per ID
     */
    static async getAppointmentById(id: number): Promise<Appointment | null> {
        const appointment = await prisma.appointment.findUnique({
            where: { id },
        });

        return appointment ? mapAppointment(appointment) : null;
    }

    /**
     * Cancella un appuntamento
     */
    static async cancelAppointment(id: number): Promise<Appointment> {
        return prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.findUnique({
                where: { id },
            });

            if (!appointment) {
                throw new Error('Appuntamento non trovato');
            }

            if (appointment.status === 'Cancellato') {
                throw new Error('Appuntamento già cancellato');
            }

            // Aggiorna appuntamento
            const updatedAppointment = await tx.appointment.update({
                where: { id },
                data: {
                    status: 'Cancellato',
                    cancelledAt: new Date(),
                },
            });

            // Libera lo slot
            await tx.slot.update({
                where: { id: appointment.slotId },
                data: {
                    currentBookings: { decrement: 1 },
                    isBooked: false,
                },
            });

            return mapAppointment(updatedAppointment);
        });
    }

    /**
     * Genera slot per un range di date
     */
    static async generateSlots(
        startDateStr: string,
        endDateStr: string
    ): Promise<{ message: string }> {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const timeSlots = [
                "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
                "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
                "16:00", "16:30", "17:00", "17:30"
            ];

            for (const time of timeSlots) {
                const [hours, minutes] = time.split(':').map(Number);
                const endDate = new Date(d);
                endDate.setHours(hours, minutes + 30);
                const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

                const existing = await prisma.slot.findFirst({
                    where: {
                        date: d,
                        startTime: time
                    }
                });

                if (!existing) {
                    await prisma.slot.create({
                        data: {
                            date: d,
                            startTime: time,
                            endTime: endTime,
                            maxCapacity: 1,
                        }
                    });
                }
            }
        }

        return { message: `Slot generati dal ${startDateStr} al ${endDateStr}` };
    }
}
