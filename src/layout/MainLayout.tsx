import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck, Wallet, UserCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import AccountSettings from '@/components/AccountSettings';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet";

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
    const { logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        setIsAccountSettingsOpen(false);
        navigate('/auth/login');
    };

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b bg-white/80 backdrop-blur-md">
                <div className="flex items-center gap-6">
                    {/* STACKED FRACKTAL WORKS BRANDING */}
                    {/* STACKED FRACKTAL WORKS BRANDING REPLACED BY IMAGE LOGO */}
                    <div className="flex items-center pt-2">
                        <span className="text-4xl leading-none" style={{ fontFamily: 'RealityHyper' }}>
                            Applied Additive
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Badge className="bg-green-600 hover:bg-green-600 text-white font-bold px-3 py-1">
                        Free Plan · Active
                    </Badge>

                    <div
                        className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-sm font-bold shadow-sm text-slate-900 cursor-pointer hover:bg-slate-200 transition-colors"
                        onClick={() => setIsAccountSettingsOpen(true)}
                    >
                        <UserCircle className="h-6 w-6 text-slate-600" />
                    </div>
                </div>
            </nav>

            <main className="flex-1 overflow-y-auto">
                {children}
            </main>

            <AccountSettings
                open={isAccountSettingsOpen}
                onOpenChange={setIsAccountSettingsOpen}
                onLogout={handleLogout}
            />
        </div>
    );
};
