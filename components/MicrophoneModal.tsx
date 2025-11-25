import React from 'react';

interface MicrophoneModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const MicrophoneModal: React.FC<MicrophoneModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-cyan-900/30 rounded-full flex items-center justify-center text-cyan-400 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </div>
          <h3 className="text-xl font-bold text-white">Richiesta Accesso Microfono</h3>
          <p className="text-slate-300">
            Per effettuare la chiamata, l'agente ha bisogno di ascoltare la tua voce. 
            Clicca su "Attiva Microfono" e consenti l'accesso quando richiesto dal browser.
          </p>
          <div className="flex gap-3 w-full mt-4">
            <button 
              onClick={onCancel}
              className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition-colors"
            >
              Annulla
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 font-bold shadow-lg shadow-cyan-500/20 transition-all"
            >
              Attiva Microfono
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MicrophoneModal;
