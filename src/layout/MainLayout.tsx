import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Wallet } from 'lucide-react';
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
import RapidToolLogo from "@/components/RapidToolLogo";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          {/*<span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'RealityHyper, sans-serif' }}><span className="text-foreground">Rapid</span><span className="text-muted-foreground">Tool</span></span>*/}
          <RapidToolLogo size="sm" subscript="" showSubscript={false} />
        </div>
        
        <div className="flex items-center gap-4">
          <Badge className="bg-green-600 hover:bg-green-600 text-white font-bold px-3 py-1">
            Pro · Active
          </Badge>

          {/* --- BILLING SIDEBAR --- */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 border-slate-300">
                <CreditCard className="h-4 w-4 text-slate-600" /> Upgrade / Billing
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
              <SheetHeader className="text-left">
                <SheetTitle className="text-2xl font-bold">Billing & Subscription</SheetTitle>
                <SheetDescription>
                  Manage your payment methods and plan preferences.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 py-6 space-y-6">
                {/* Razorpay Option */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Fast Checkout</h4>
                  <Button 
                    variant="outline" 
                    className="w-full h-16 border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 flex items-center justify-between px-4 group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-600 p-2 rounded-lg">
                        <Wallet className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900">Razorpay</p>
                        <p className="text-xs text-slate-500">UPI, Netbanking, Wallets</p>
                      </div>
                    </div>
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 group-hover:border-blue-600" />
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">Or pay with card</span></div>
                </div>

                {/* Credit Card Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input id="card-number" placeholder="0000 0000 0000 0000" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input id="expiry" placeholder="MM/YY" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input id="cvv" placeholder="123" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <div className="flex items-center gap-2 text-green-700 mb-1">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase">Secure Transaction</span>
                   </div>
                   <p className="text-[11px] text-slate-500">Your payment data is encrypted. By continuing, you agree to our Terms of Service.</p>
                </div>
              </div>

              <SheetFooter className="mt-auto pt-6 border-t">
                <Button className="w-full bg-black hover:bg-slate-800 text-white py-6 text-lg font-bold">
                  Confirm Payment
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

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