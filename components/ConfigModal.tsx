import React, { useState } from 'react';
import { Database, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { saveSupabaseConfig, resetSupabaseConfig } from '../lib/supabase';

const ConfigModal: React.FC = () => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(url, key);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Conexão Pendente</h2>
            <p className="text-slate-500 text-sm">O site está tentando conectar...</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-xl border border-blue-100 leading-relaxed">
            Se você já atualizou o código com as chaves, tente apenas recarregar a página.
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Recarregar Site (F5)
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold">Ou configure manualmente</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <Database size={14} /> Project URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://seu-projeto.supabase.co"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <Database size={14} /> Anon Key
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Sua chave..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-mono text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-red-200"
            >
              <Save size={16} />
              Salvar Manualmente
            </button>
          </form>
          
          <div className="text-center">
            <button onClick={resetSupabaseConfig} className="text-xs text-slate-400 hover:text-red-500 underline">
                Limpar configurações salvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;