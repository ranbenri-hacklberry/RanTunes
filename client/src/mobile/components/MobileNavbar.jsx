import React from 'react';
import { Home, Search, Library, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const MobileNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { icon: Home, label: 'בית', path: '/mobile' },
        { icon: Search, label: 'חיפוש', path: '/mobile/search' },
        { icon: Library, label: 'הספרייה', path: '/mobile/library' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#121212]/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-around z-50 safe-area-bottom">
            {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`flex flex-col items-center justify-center w-full h-full transition-colors ${active ? 'text-white' : 'text-white/40'
                            }`}
                    >
                        <item.icon size={24} strokeWidth={active ? 2.5 : 2} />
                        <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default MobileNavbar;
