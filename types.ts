export enum CallStatus {
  IDLE = 'In attesa',
  CALLING = 'Chiamata in corso...',
  CONNECTED = 'Connesso',
  COMPLETED = 'Completata',
  BOOKED = 'Appuntamento Preso',
  FAILED = 'Fallita'
}

export interface Appointment {
  date: string;
  time: string;
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  phoneNumber: string;
  status: CallStatus;
  appointment?: Appointment;
  lastInteraction?: string;
}

export interface SystemConfig {
  voiceName: string;
  systemInstruction: string;
}

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'error' | 'success' | 'agent' | 'user';
}