import React, { useState } from 'react';
import { ShieldAlert, X, Check, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
    onClose: () => void;
    currentPushes: number;
    onUpdatePushes: (val: number) => void;
    userId: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, currentPushes, onUpdatePushes, userId }) => {
    const [targetId, setTargetId] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);

    const handleGrantVip = async () => {
        const cleanId = targetId.trim();
        if (!cleanId) return;
        
        setLoading(true);
        setStatus(null);
        
        try {
            // Usamos UPSERT em vez de UPDATE. 
            // Se o perfil não existir na tabela public.profiles, ele será criado.
            const { error, data } = await supabase
                .from('profiles')
                .upsert({ 
                    id: cleanId, 
                    is_vip: true 
                })
                .select();

            if (error) throw error;
            
            if (!data || data.length === 0) {
                throw new Error('Não foi possível processar o ID. Verifique o console.');
            }

            setStatus({ type: 'success', msg: 'VIP concedido com sucesso!' });
            setTargetId('');
        } catch (e: any) {
            console.error("Erro detalhado:", e);
            
            let userMsg = e.message;
            if (e.code === '42P10') userMsg = "Coluna 'is_vip' não encontrada. Execute o SQL de alteração da tabela.";
            if (e.message.includes('new row violates row level security')) {
                userMsg = "Erro de Permissão (RLS). Você precisa executar o SQL de POLICY no painel do Supabase.";
            }

            setStatus({ 
                type: 'error', 
                msg: userMsg 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-900 text-white p-6 rounded-3xl w-full max-w-md border border-slate-800 shadow-2xl relative animate-in zoom-in-95">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
                
                <div className="flex items-center gap-2 text-yellow-500 font-bold mb-6 uppercase tracking-widest border-b border-slate-800 pb-4">
                    <ShieldAlert size={20} /> Painel Master
                </div>

                <div className="space-y-6">
                    <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-2xl text-[11px] text-blue-300 leading-relaxed flex gap-3">
                        <Info size={24} className="shrink-0 text-blue-400" />
                        <div>
                            Se der erro de <strong>"Usuário não encontrado"</strong> ou <strong>"Permissão"</strong>, certifique-se de ter rodado as <strong>POLICIES</strong> no SQL Editor do Supabase para o seu e-mail de Admin.
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase block mb-2 tracking-tighter">Conceder VIP (User UUID)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                placeholder="Cole o UUID aqui..."
                                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white font-mono text-xs focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all"
                            />
                            <button 
                                onClick={handleGrantVip} 
                                disabled={loading}
                                className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-700 text-black font-black px-6 rounded-xl transition-all active:scale-95"
                            >
                                {loading ? '...' : 'GO'}
                            </button>
                        </div>
                        
                        {status && (
                            <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-[11px] font-bold animate-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {status.type === 'success' ? <Check size={14}/> : <AlertCircle size={14}/>}
                                {status.msg}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800 text-[10px] text-slate-600 text-center font-bold">
                    GAIMI RUBI ADMIN SYSTEM v1.3
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;