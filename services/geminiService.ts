import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { createBlob, base64ToUint8Array, decodeAudioData, downsampleTo16000 } from './audioUtils';
import { Client, Appointment } from '../types';

// Function definition for booking
const bookAppointmentTool: FunctionDeclaration = {
  name: 'prenotaAppuntamento',
  description: 'Prenota un appuntamento finale quando il cliente è d\'accordo con una data e un\'ora.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      data: {
        type: Type.STRING,
        description: 'La data dell\'appuntamento (es. "2024-05-20" o "Lunedì prossimo").',
      },
      ora: {
        type: Type.STRING,
        description: 'L\'ora dell\'appuntamento (es. "15:00").',
      },
      note: {
        type: Type.STRING,
        description: 'Eventuali note aggiuntive richieste dal cliente.',
      },
    },
    required: ['data', 'ora'],
  },
};

interface GeminiSessionConfig {
  systemInstruction: string;
  voiceName: string;
  onAudioData: (buffer: AudioBuffer) => void;
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'agent' | 'user') => void;
  onBookAppointment: (appt: Appointment) => void;
  onClose: () => void;
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
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async start(config: GeminiSessionConfig) {
    this.active = true;

    // Setup Audio Contexts without forcing sampleRate
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        // Fallback for older browsers or specific environments
        const getUserMedia = (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia;

        if (!getUserMedia) {
          throw new Error("API Audio non supportata. Assicurati di usare HTTPS o localhost.");
        }

        this.stream = await new Promise((resolve, reject) => {
          getUserMedia.call(navigator, { audio: true }, resolve, reject);
        });
      }
    } catch (e: any) {
      console.error("Microphone access error:", e);
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

    config.onLog("Connessione a Gemini Live API in corso...", "info");

    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } },
        },
        systemInstruction: config.systemInstruction,
        tools: [{ functionDeclarations: [bookAppointmentTool] }],
      },
      callbacks: {
        onopen: () => {
          config.onLog("Connessione stabilita. In attesa di risposta...", "success");
          this.startAudioStreaming();
        },
        onmessage: async (message: LiveServerMessage) => {
          // Handle Tools
          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              config.onLog(`Tentativo di prenotazione: ${JSON.stringify(fc.args)}`, "info");

              if (fc.name === 'prenotaAppuntamento') {
                const appointment: Appointment = {
                  date: fc.args['data'] as string,
                  time: fc.args['ora'] as string,
                  notes: fc.args['note'] as string || ''
                };
                config.onBookAppointment(appointment);

                // Respond to tool
                if (this.sessionPromise) {
                  this.sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "Successo. Appuntamento confermato nel sistema." }
                      }
                    });
                  });
                }
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
          config.onLog("Sessione chiusa dal server.", "info");
          this.stop();
          config.onClose();
        },
        onerror: (err) => {
          config.onLog(`Errore Gemini: ${err}`, "error");
          this.stop();
          config.onClose();
        }
      }
    });
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