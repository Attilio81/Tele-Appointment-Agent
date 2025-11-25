import React from 'react';
import { Client, CallStatus } from '../types';

interface ClientListProps {
  clients: Client[];
  onCall: (client: Client) => void;
  isCallActive: boolean;
}

const ClientList: React.FC<ClientListProps> = ({ clients, onCall, isCallActive }) => {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-full shadow-lg">
      <div className="p-4 bg-slate-900 border-b border-slate-700">
        <h3 className="font-bold text-lg text-white">Lista Contatti</h3>
        <p className="text-slate-400 text-sm">Campagna: "Promo Estate"</p>
      </div>
      
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800 text-slate-400 text-xs uppercase sticky top-0 z-10">
            <tr>
              <th className="p-4 font-semibold">Nome</th>
              <th className="p-4 font-semibold">Telefono</th>
              <th className="p-4 font-semibold">Stato</th>
              <th className="p-4 font-semibold text-right">Azione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {clients.map(client => (
              <tr key={client.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="p-4 font-medium text-white">{client.name}</td>
                <td className="p-4 text-slate-300 font-mono">{client.phoneNumber}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    client.status === CallStatus.BOOKED ? 'bg-green-900 text-green-400' :
                    client.status === CallStatus.FAILED ? 'bg-red-900 text-red-400' :
                    client.status === CallStatus.COMPLETED ? 'bg-blue-900 text-blue-400' :
                    client.status === CallStatus.CALLING ? 'bg-yellow-900 text-yellow-400 animate-pulse' :
                    'bg-slate-600 text-slate-300'
                  }`}>
                    {client.status}
                  </span>
                  {client.appointment && (
                    <div className="text-xs text-green-300 mt-1">
                      {client.appointment.date} @ {client.appointment.time}
                    </div>
                  )}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => onCall(client)}
                    disabled={isCallActive || client.status === CallStatus.BOOKED}
                    className={`px-4 py-2 rounded text-sm font-bold transition-all ${
                      isCallActive || client.status === CallStatus.BOOKED
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow hover:shadow-cyan-500/20'
                    }`}
                  >
                   {client.status === CallStatus.BOOKED ? 'Fatto' : 'Chiama'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientList;