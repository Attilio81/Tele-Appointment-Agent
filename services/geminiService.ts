import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { createBlob, base64ToUint8Array, decodeAudioData, downsampleTo16000 } from './audioUtils';
import { Client, Appointment } from '../types';
import { fetchAvailableSlots, bookAppointment, cancelAppointment, AvailableSlot } from './appointmentService';

// Tool: Check Availability
const checkAvailabilityTool: FunctionDeclaration = {
  name: 'checkAvailability',
  description: 'Controlla la disponibilità degli appuntamenti. Restituisce una lista di slot disponibili con ID, data e ora.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: {
        type: Type.STRING,
        description: 'Data specifica per controllare la disponibilità (YYYY-MM-DD). Opzionale.',
      },
    },
  },
};

// Tool: Book Appointment
const bookAppointmentTool: FunctionDeclaration = {
  name: 'prenotaAppuntamento',
  description: 'Prenota un appuntamento. Richiede ID dello slot (preferito) oppure data e ora.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      slotId: {
        type: Type.NUMBER,
        description: 'ID dello slot da prenotare (ottenuto da checkAvailability).',
      },
      data: {
        type: Type.STRING,
        description: 'La data dell\'appuntamento (YYYY-MM-DD). Usato se slotId non è fornito.',
      },
      ora: {
        type: Type.STRING,
        description: 'L\'ora dell\'appuntamento (HH:MM). Usato se slotId non è fornito.',
      },
      note: {
        type: Type.STRING,
        description: 'Eventuali note aggiuntive.',
      },
    },
    required: [],
  },
};

// Tool: Cancel Appointment
const cancelAppointmentTool: FunctionDeclaration = {
  name: 'cancellareAppuntamento',
  description: 'Cancella un appuntamento esistente. Richiede ID dell\'appuntamento.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      appointmentId: {
        type: Type.NUMBER,
        description: 'ID dell\'appuntamento da cancellare.',
      },
      reason: {
        type: Type.STRING,
        description: 'Motivo della cancellazione (opzionale).',
      },
    },
    required: ['appointmentId'],
  },
};

interface GeminiSessionConfig {
  systemInstruction: string;
  voiceName: string;
  onAudioData: (buffer: AudioBuffer) => void;
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'agent' | 'user') => void;
  onBookAppointment: (appt: Appointment) => void;
  onClose: () => void;
  clientName: string; // Add client name for booking
}

export class GeminiLiveSession {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sessionPromise: Promise<any> | null = null;
  private stream: MediaStream | null = null;
  private active: boolean = false;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  }

  async start(config: GeminiSessionConfig) {
    console.log("GeminiLiveSession.start called"); // DEBUG
    this.active = true;
    config.onLog("Inizializzazione sessione...", "info");

    // Setup Audio Contexts without forcing sampleRate
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    try {
      config.onLog("Richiesta accesso al microfono...", "info");
      console.log("Requesting microphone access..."); // DEBUG
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Microphone access granted"); // DEBUG
        config.onLog("Microfono acquisito.", "success");
      } else {
        // Fallback for older browsers or specific environments
        const getUserMedia = (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia;

        if (!getUserMedia) {
          throw new Error("API Audio non supportata. Assicurati di usare HTTPS o localhost.");
        }

        this.stream = await new Promise((resolve, reject) => {
          getUserMedia.call(navigator, { audio: true }, resolve, reject);
        });
        console.log("Microphone access granted (fallback)"); // DEBUG
        config.onLog("Microfono acquisito (fallback).", "success");
      }
    } catch (e: any) {
      console.error("Microphone error:", e); // DEBUG
      alert(`Errore Microfono: ${e.message}`); // DEBUG ALERT
      // ... existing error handling ...
      let errorMessage = "Errore accesso microfono. ";
      if (e.name === 'NotAllowedError') {
        errorMessage += "Permesso negato. Controlla le impostazioni del browser.";
      } else if (e.name === 'NotFoundError') {
        errorMessage += "Nessun microfono trovato.";
      } else if (e.name === 'NotReadableError') {
        errorMessage += "Impossibile accedere al microfono (potrebbe essere in uso).";
      } else {
        errorMessage += `Dettagli: ${e.message || e}`;
      }
      config.onLog(errorMessage, "error");
      this.stop();
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    console.log("API Key check:", apiKey ? "Present" : "Missing"); // DEBUG
    if (apiKey && apiKey.length > 0) {
      config.onLog(`API Key rilevata: ${apiKey.substring(0, 4)}...`, "info");
    } else {
      console.error("API KEY MISSING"); // DEBUG
      alert("ATTENZIONE: API Key mancante! Controlla .env.local"); // DEBUG ALERT
      config.onLog("ATTENZIONE: API Key mancante o vuota!", "error");
    }

    config.onLog("Connessione a Gemini Live API in corso...", "info");
    console.log("About to call this.ai.live.connect with model: models/gemini-2.0-flash-exp"); // DEBUG

    try {
      this.sessionPromise = this.ai.live.connect({
        model: 'models/gemini-2.0-flash-exp', // Try with full path
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } },
          },
          systemInstruction: config.systemInstruction,
          tools: [{ functionDeclarations: [checkAvailabilityTool, bookAppointmentTool, cancelAppointmentTool] }],
        },
        callbacks: {
          onopen: () => {
            console.log("GEMINI: onopen callback triggered"); // DEBUG
            config.onLog("Connessione stabilita. In attesa di risposta...", "success");
            this.startAudioStreaming();
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log("GEMINI: onmessage callback triggered", message); // DEBUG
            // Handle Tools
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                config.onLog(`Richiesta Tool: ${fc.name} ${JSON.stringify(fc.args)}`, "info");

                let toolResponse = {};

                try {
                  if (fc.name === 'checkAvailability') {
                    const date = fc.args['date'] as string | undefined;
                    const slots = await fetchAvailableSlots();

                    let filteredSlots = slots;
                    if (date) {
                      filteredSlots = slots.filter(s => s.Date.startsWith(date));
                    }

                    const limitedSlots = filteredSlots.slice(0, 10).map(s => ({
                      id: s.SlotID,
                      date: s.FormattedDate,
                      time: `${s.FormattedStartTime} - ${s.FormattedEndTime}`
                    }));

                    toolResponse = { result: limitedSlots };
                    config.onLog(`Trovati ${limitedSlots.length} slot disponibili`, "success");
                  }
                  else if (fc.name === 'prenotaAppuntamento') {
                    const slotId = fc.args['slotId'] as number | undefined;
                    const date = fc.args['data'] as string | undefined;
                    const time = fc.args['ora'] as string | undefined;
                    const notes = fc.args['note'] as string || '';

                    let targetSlotId = slotId;

                    if (!targetSlotId && date && time) {
                      const slots = await fetchAvailableSlots();
                      const found = slots.find(s =>
                        (s.Date.startsWith(date) || s.FormattedDate === date) &&
                        s.FormattedStartTime.startsWith(time)
                      );
                      if (found) targetSlotId = found.SlotID;
                    }

                    if (targetSlotId) {
                      const result = await bookAppointment({
                        slotId: targetSlotId,
                        customerName: config.clientName,
                        notes: notes,
                        appointmentType: 'Check-up'
                      });

                      const appointment: Appointment = {
                        date: date || result.BookedAt,
                        time: time || "00:00",
                        notes: notes
                      };
                      config.onBookAppointment(appointment);
                      toolResponse = { result: "Successo. Appuntamento confermato nel sistema." };
                      config.onLog(`Appuntamento confermato: ID ${result.AppointmentID}`, "success");
                    } else {
                      toolResponse = { error: "Impossibile trovare uno slot valido con i dati forniti. Chiedi all'utente di selezionare uno slot disponibile." };
                      config.onLog("Fallimento prenotazione: Slot non trovato", "error");
                    }
                  }
                  else if (fc.name === 'cancellareAppuntamento') {
                    const appointmentId = fc.args['appointmentId'] as number;
                    const reason = fc.args['reason'] as string || '';

                    if (appointmentId) {
                      await cancelAppointment(appointmentId);
                      toolResponse = { result: "Successo. Appuntamento cancellato." };
                      config.onLog(`Appuntamento ${appointmentId} cancellato. Motivo: ${reason}`, "success");
                    } else {
                      toolResponse = { error: "ID appuntamento mancante." };
                    }
                  }
                } catch (error: any) {
                  toolResponse = { error: `Errore esecuzione tool: ${error.message}` };
                  config.onLog(`Errore Tool: ${error.message}`, "error");
                }

                if (this.sessionPromise) {
                  this.sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: toolResponse
                      }
                    });
                  });
                }
              }
            }

            // Handle Audio
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && this.outputAudioContext) {
              try {
                const rawBytes = base64ToUint8Array(base64Audio);
                const audioBuffer = await decodeAudioData(rawBytes, this.outputAudioContext);
                config.onAudioData(audioBuffer);
              } catch (err) {
                console.error("Error decoding audio:", err);
              }
            }
          },
          onclose: () => {
            console.log("GEMINI: onclose callback triggered"); // DEBUG
            config.onLog("Sessione chiusa dal server.", "info");
            this.stop();
            config.onClose();
          },
          onerror: (err) => {
            console.error("GEMINI: onerror callback triggered:", err); // DEBUG
            config.onLog(`Errore Gemini: ${err}`, "error");
            this.stop();
            config.onClose();
          }
        }
      });

      this.sessionPromise.catch((err: any) => {
        config.onLog(`Errore connessione WebSocket: ${err.message || err}`, "error");
        this.stop();
        config.onClose();
      });

    } catch (err: any) {
      config.onLog(`Errore sincrono connessione: ${err.message}`, "error");
      this.stop();
      return;
    }
  }

  private startAudioStreaming() {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.active) return;

      const inputData = e.inputBuffer.getChannelData(0);

      // Downsample to 16000Hz as required by Gemini
      // Check if context exists to avoid race conditions
      if (this.inputAudioContext) {
        const downsampledData = downsampleTo16000(inputData, this.inputAudioContext.sampleRate);
        const pcmBlob = createBlob(downsampledData);

        this.sessionPromise?.then(session => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      }
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  stop() {
    this.active = false;
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.inputSource) {
      this.inputSource.disconnect();
    }
    if (this.processor) {
      this.processor.disconnect();
    }
    // Check state before closing
    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
      this.inputAudioContext.close();
    }
    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
      this.outputAudioContext.close();
    }
    this.inputAudioContext = null;
    this.outputAudioContext = null;
  }
}