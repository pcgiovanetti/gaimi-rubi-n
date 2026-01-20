import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, User, Lock, Loader2, LogIn } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Cria um email "fictício" baseado no nome para satisfazer o Supabase
    // Ex: "Pedro Paulo" vira "pedropaulo@gaimirubi.com"
    const cleanName = username.trim().toLowerCase().replace(/\s+/g, '');
    const syntheticEmail = `${cleanName}@gaimirubi.com`;

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: syntheticEmail,
          password,
        });
        if (error) throw new Error("Usuário ou senha incorretos.");
        onClose();
      } else {
        const { error, data } = await supabase.auth.signUp({
          email: syntheticEmail,
          password,
          options: {
            data: {
              full_name: username, // Salva o nome original
            }
          }
        });
        
        if (error) throw error;

        // Se o cadastro foi sucesso
        if (data.user) {
            alert('Conta criada com sucesso! Você já pode entrar.');
            setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {isLogin ? 'Bem-vindo de volta' : 'Criar Jogador'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleAuth} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Nome de Usuário</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                required
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                placeholder="Seu nome"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                placeholder="******"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <LogIn size={18} />}
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-500 hover:text-red-500 font-medium"
            >
              {isLogin ? 'Não tem usuário? Crie agora' : 'Já tem cadastro? Entre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;