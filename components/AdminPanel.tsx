import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
    onClose: () => void;
    currentPushes: number;
    onUpdatePushes: (val: number) => void;
    userId: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, currentPushes, onUpdatePushes, userId }) => {
    const [targetId, setTargetId] = useState('');
    const [msg, setMsg] = useState('');

    const handleGrantVip = async () => {
        if (!targetId) return;
        try {
            const { error } = await supabase.from('profiles').update({ is_vip: true }).eq('id', targetId);
            if (error) throw error;
            setMsg('VIP concedido!');
        } catch (e: any) {
            setMsg('Erro: ' + e.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 text-white p-6 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
                <div className="flex items-center gap-2 text-yellow-500 font-bold mb-6 uppercase tracking-widest border-b border-slate-800 pb-4">
                    <ShieldAlert size={20} /> Painel Administrativo
                </div>

                <div className="space-y-6">
                    <div className="p-4 bg-slate-800 rounded-lg text-sm text-slate-400">
                        A edição de pontos (Pushes) foi movida para dentro do menu de configurações do jogo <strong>Push Battles</strong>.
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 font-bold uppercase block mb-2">Conceder VIP (User ID)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                placeholder="UUID do usuário"
                                className="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg text-white font-mono text-sm"
                            />
                            <button onClick={handleGrantVip} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 rounded-lg">GO</button>
                        </div>
                        {msg && <p className="text-xs text-green-400 mt-2">{msg}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;