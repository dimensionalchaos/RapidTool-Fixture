import React from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// 1. Define the interface for props
interface MainLayoutProps {
  children: React.ReactNode;
}

// 2. Apply the interface to the component
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <div className="bg-black text-white px-2 py-1 rounded font-bold text-sm uppercase">RT</div>
          <span className="font-bold text-xl tracking-tight">RapidTool</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge className="bg-green-600 hover:bg-green-600 text-white font-bold px-3 py-1">
            Pro · Active
          </Badge>
          <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 border-slate-300">
            <CreditCard className="h-4 w-4 text-slate-600" /> Upgrade / Billing
          </Button>
          <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-sm font-bold shadow-sm text-slate-900">
            R
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};