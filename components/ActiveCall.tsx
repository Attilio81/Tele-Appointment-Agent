import React, { useEffect, useRef, useState } from 'react';
import { Client, LogEntry } from '../types';

interface ActiveCallProps {
  client: Client;
  logs: LogEntry[];
  onHangup: () => void;
  audioSourceNode: AudioBufferSourceNode | null; // Trigger visualizer
}

const ActiveCall: React.FC<ActiveCallProps> = ({ client, logs, onHangup, audioSourceNode }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Fake visualizer state
  const [visualizerBars, setVisualizerBars] = useState<number[]>(new Array(20).fill(10));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Simple random visualizer effect when "audioSourceNode" changes (implies speaking)
  useEffect(() => {
    let interval: number;
    if (audioSourceNode) {
       interval = window.setInterval(() => {
        setVisualizerBars(prev => prev.map(() => Math.random() * 40 + 10));
      }, 50);
    } else {
      setVisualizerBars(new Array(20).fill(5));
    }
    return () => clearInterval(interval);
  }, [audioSourceNode]);

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-xl border border-slate-700 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 p-6 flex justify-between items-center border-b border-slate-700">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{client.name}</h2>
          <p className="text-slate-400 font-mono text-lg">{client.phoneNumber}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="animate-pulse h-3 w-3 bg-red-500 rounded-full"></span>
          <span className="text-red-400 font-bold uppercase tracking-wider text-sm">On Air</span>
        </div>
      </div>

      {/* Visualizer Area */}
      <div className="h-48 bg-slate-900/50 flex items-center justify-center gap-1 border-b border-slate-700">
         {visualizerBars.map((height, i) => (
           <div 
            key={i} 
            className="w-2 bg-cyan-500 rounded-full transition-all duration-75"
            style={{ height: `${height}px`, opacity: height > 10 ? 1 : 0.3 }}
           ></div>
         ))}
      </div>

      {/* Log Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-800" ref={scrollRef}>
        {logs.length === 0 && (
          <div className="text-center text-slate-500 mt-10 italic">In attesa di connessione...</div>
        )}
        {logs.map((log, i) => (
          <div key={i} className={`flex ${log.type === 'error' ? 'justify-center' : 'justify-start'}`}>
             <span className={`text-xs px-2 py-1 rounded font-mono border ${
               log.type === 'info' ? 'bg-blue-900/30 border-blue-800 text-blue-300' :
               log.type === 'success' ? 'bg-green-900/30 border-green-800 text-green-300' :
               log.type === 'error' ? 'bg-red-900/30 border-red-800 text-red-300' :
               'bg-slate-700 border-slate-600 text-slate-300'
             }`}>
               [{log.timestamp.toLocaleTimeString()}] {log.message}
             </span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="p-6 bg-slate-900 border-t border-slate-700 flex justify-center">
        <button 
          onClick={onHangup}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-12 rounded-full shadow-lg transition-transform transform active:scale-95 flex items-center gap-2 text-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
          Termina Chiamata
        </button>
      </div>
    </div>
  );
};

export default ActiveCall;