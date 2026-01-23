import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Achievement } from '../types';

interface AchievementToastProps {
    achievement: Achievement | null;
    onClose: () => void;
}

const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (achievement) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onClose, 500); // Wait for animation
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [achievement, onClose]);

    if (!achievement) return null;

    return (
        <div className={`fixed bottom-8 right-8 z-[100] transition-all duration-500 transform ${visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-center gap-4 border border-yellow-500/30 max-w-sm">
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-2xl animate-bounce">
                    🏆
                </div>
                <div>
                    <div className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-1">Conquista Desbloqueada!</div>
                    <div className="font-bold text-sm">{achievement.title}</div>
                    <div className="text-xs text-slate-400">{achievement.description}</div>
                </div>
            </div>
        </div>
    );
};

export default AchievementToast;