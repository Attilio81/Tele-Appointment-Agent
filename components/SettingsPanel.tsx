import React from 'react';
import { SystemConfig } from '../types';

interface SettingsPanelProps {
  config: SystemConfig;
  onConfigChange: (newConfig: SystemConfig) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onConfigChange }) => {
  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg h-full overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        Configurazione Agente
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Voce Agente</label>
          <select 
            className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
            value={config.voiceName}
            onChange={(e) => onConfigChange({...config, voiceName: e.target.value})}
          >
            <option value="Kore">Kore (Calma)</option>
            <option value="Puck">Puck (Energica)</option>
            <option value="Fenrir">Fenrir (Profonda)</option>
            <option value="Aoede">Aoede (Professionale)</option>
            <option value="Zephyr">Zephyr (Bilanciata)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Prompt di Sistema (Coscienza)</label>
          <p className="text-xs text-slate-400 mb-2">
            Definisci chi è l'agente, il suo tono, e l'obiettivo della chiamata.
          </p>
          <textarea 
            className="w-full h-96 bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none font-mono leading-relaxed"
            value={config.systemInstruction}
            onChange={(e) => onConfigChange({...config, systemInstruction: e.target.value})}
          />
        </div>

        <div className="p-4 bg-cyan-900/30 rounded border border-cyan-800">
          <h3 className="text-cyan-400 font-bold text-sm mb-1">Nota Funzionale</h3>
          <p className="text-xs text-cyan-200">
            L'agente ha accesso allo strumento <code>prenotaAppuntamento(data, ora, note)</code>. 
            Assicurati di istruirlo nel prompt per raccogliere queste informazioni prima di confermare.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;