import React, { useState, useCallback, useRef } from 'react';
import ClientList from './components/ClientList';
import ActiveCall from './components/ActiveCall';
import SettingsPanel from './components/SettingsPanel';
import MicrophoneModal from './components/MicrophoneModal';
import { Client, CallStatus, SystemConfig, LogEntry, Appointment } from './types';
import { GeminiLiveSession } from './services/geminiService';

const INITIAL_CLIENTS: Client[] = [
  { id: '1', name: 'Mario Rossi', phoneNumber: '+39 333 1234567', status: CallStatus.IDLE },
  { id: '2', name: 'Giulia Bianchi', phoneNumber: '+39 345 9876543', status: CallStatus.IDLE },
  { id: '3', name: 'Luigi Verdi', phoneNumber: '+39 320 5551234', status: CallStatus.IDLE },
  { id: '4', name: 'Anna Neri', phoneNumber: '+39 347 1112223', status: CallStatus.IDLE },
];

const DEFAULT_PROMPT = `Sei l'assistente virtuale di "Studio Dentistico Sorriso". 
Il tuo obiettivo è chiamare i clienti della lista per un check-up annuale gratuito.
IMPORTANTE: Appena la connessione è stabilita, inizia TU a parlare. Presentati al cliente immediatamente dicendo "Buongiorno" e il tuo nome. Non attendere che l'utente parli per primo.
Sii gentile, professionale e concisa. 
Cerca di convincere il cliente a prenotare un appuntamento.
Se il cliente accetta, chiedi quale data e ora preferiscono.
Una volta ottenuta data e ora, usa lo strumento 'prenotaAppuntamento' per confermare.
Parla in italiano in modo naturale.`;

const App: React.FC = () => {
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [config, setConfig] = useState<SystemConfig>({
    voiceName: 'Kore',
    systemInstruction: DEFAULT_PROMPT
  });

  // Modal state
  const [showMicModal, setShowMicModal] = useState(false);
  const [pendingClient, setPendingClient] = useState<Client | null>(null);

  // Audio playback state
  const [audioSourceNode, setAudioSourceNode] = useState<AudioBufferSourceNode | null>(null);

  // Internal refs
  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    setLogs(prev => [...prev, { timestamp: new Date(), message, type }]);
  }, []);

  const handleStartCall = (client: Client) => {
    if (activeClientId) return;
    setPendingClient(client);
    setShowMicModal(true);
  };

  const proceedWithCall = async () => {
    if (!pendingClient) return;
    const client = pendingClient;
    setShowMicModal(false);
    setPendingClient(null);

    // UI Update
    setActiveClientId(client.id);
    setLogs([]);
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: CallStatus.CALLING } : c));
    addLog(`Avvio simulazione chiamata verso ${client.phoneNumber}...`, 'info');

    try {
      // Create a new AudioContext for playback (needs user interaction which click provides)
      // Don't force sampleRate, let browser handle it.
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      // CRITICAL: Ensure context is running. Browsers often suspend it.
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      audioContextRef.current = audioCtx;
      nextStartTimeRef.current = audioCtx.currentTime;

      // Initialize Session
      const session = new GeminiLiveSession();
      sessionRef.current = session;

      await session.start({
        voiceName: config.voiceName,
        systemInstruction: `Stai parlando con ${client.name}. ${config.systemInstruction}`,
        onLog: addLog,
        onBookAppointment: (appt: Appointment) => {
          addLog(`Prenotazione ricevuta per ${appt.date} alle ${appt.time}`, 'success');
          setClients(prev => prev.map(c => c.id === client.id ? {
            ...c,
            status: CallStatus.BOOKED,
            appointment: appt
          } : c));
        },
        onAudioData: (buffer: AudioBuffer) => {
          if (!audioContextRef.current) return;

          // Schedule playback
          const src = audioContextRef.current.createBufferSource();
          src.buffer = buffer;
          src.connect(audioContextRef.current.destination);

          const currentTime = audioContextRef.current.currentTime;
          // Ensure we don't schedule in the past, but keep the flow
          const startTime = Math.max(nextStartTimeRef.current, currentTime);

          src.start(startTime);
          nextStartTimeRef.current = startTime + buffer.duration;

          // Update state for visualizer
          setAudioSourceNode(src);
          src.onended = () => {
            // We don't nullify immediately to avoid flickering, but could if needed
          };
        },
        onClose: () => {
          handleHangup();
        }
      });

      setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: CallStatus.CONNECTED } : c));
    } catch (err) {
      addLog(`Errore inizializzazione audio: ${err}`, 'error');
      handleHangup();
    }
  };

  const cancelCall = () => {
    setShowMicModal(false);
    setPendingClient(null);
  };

  const handleHangup = () => {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }

    // Safe close for playback context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;

    setAudioSourceNode(null);

    setClients(prev => {
      const client = prev.find(c => c.id === activeClientId);
      if (client && client.status !== CallStatus.BOOKED) {
        return prev.map(c => c.id === activeClientId ? { ...c, status: CallStatus.COMPLETED } : c);
      }
      return prev;
    });

    setActiveClientId(null);
    addLog("Chiamata terminata.", 'info');
  };

  const activeClient = clients.find(c => c.id === activeClientId);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* Navbar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/30">AI</div>
          <h1 className="text-xl font-bold tracking-tight text-white">Tele-Appointment Agent</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            Server Status: Online
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-hidden">
        <div className="grid grid-cols-12 gap-6 h-full">

          {/* Left Column: Call Interface (Active or Idle) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full overflow-hidden">
            {activeClientId && activeClient ? (
              <div className="flex-1 h-full">
                <ActiveCall
                  client={activeClient}
                  logs={logs}
                  onHangup={handleHangup}
                  audioSourceNode={audioSourceNode}
                />
              </div>
            ) : (
              <div className="flex-1 bg-slate-900/50 rounded-xl border border-dashed border-slate-700 flex items-center justify-center flex-col text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path></svg>
                <p className="text-lg">Nessuna chiamata attiva.</p>
                <p className="text-sm">Seleziona un contatto dalla lista o configura l'agente.</p>
              </div>
            )}

            {/* Client List */}
            <div className={`flex-1 ${activeClientId ? 'hidden lg:block lg:flex-none lg:h-1/3' : 'h-full'}`}>
              <ClientList
                clients={clients}
                onCall={handleStartCall}
                isCallActive={!!activeClientId}
              />
            </div>
          </div>

          {/* Right Column: Settings */}
          <div className="col-span-12 lg:col-span-4 h-full overflow-hidden">
            <SettingsPanel config={config} onConfigChange={setConfig} />
          </div>

        </div>
      </main>

      {/* Warning/Disclaimer for User */}
      <div className="fixed bottom-4 right-4 max-w-sm bg-yellow-900/90 text-yellow-100 p-4 rounded-lg shadow-xl border border-yellow-700 text-xs backdrop-blur-sm">
        <strong>Nota Tecnica:</strong> Se non senti nulla, controlla che il volume sia alto e che il browser non stia bloccando l'audio automatico.
      </div>

      <MicrophoneModal
        isOpen={showMicModal}
        onConfirm={proceedWithCall}
        onCancel={cancelCall}
      />
    </div>
  );
};

export default App;