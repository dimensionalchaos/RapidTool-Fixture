import React, { useEffect } from 'react';
import { useAuthStore } from "@/stores/authStore";
import { useNavigate } from 'react-router-dom';
import {
  Calculator, Database, BarChart3, ExternalLink, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RapidToolLogo from "@/components/RapidToolLogo";

export interface Tool {
  id: string;
  title: string;
  description: string;
  status: 'Active' | 'Coming Soon';
  icon: React.ReactNode;
  path?: string;
}

const MainPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    if (!user) {
      fetchCurrentUser();
    }
  }, [user, fetchCurrentUser]);

  const tools: Tool[] = [
    {
      id: '1',
      title: "Rapid Fixture",
      description: "Professional tool for creating custom fixtures for 3d printing.",
      status: "Active",
      icon: <Calculator className="h-5 w-5" />,
      path: "/app/fixture"
    },
    {
      id: '2',
      title: "Coming Soon",
      description: "Cloud-based engineering database.",
      status: "Coming Soon",
      icon: <Database className="h-5 w-5 text-gray-400" />,
    },
    {
      id: '3',
      title: "Coming Soon",
      description: "Advanced analytics and reporting.",
      status: "Coming Soon",
      icon: <BarChart3 className="h-5 w-5 text-gray-400" />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Left Column: Branding & Messaging */}
        <div className="text-left space-y-6">
          <div className="flex justify-start">
            <RapidToolLogo size="lg" showSubscript={false} />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            Create your own designs, no vendor delays, no service charges.
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Stop Waiting for Vendors. Start Building with RapidTool. "RapidTool is more than a CAD tool; it’s an automated design partner. Take control of your production timeline and eliminate service charges today. Fracktal Works, where the Fracktal does work."
          </p>

          <div className="flex flex-wrap justify-start gap-4 pt-4">
            <button
              className="rounded-full px-8 h-12 text-sm font-bold bg-[#2596be] text-white hover:opacity-90 shadow-md shadow-blue-100 transition-all"
              onClick={() => navigate('/app/fixture')}
            >
              Try RapidTool Fixtures
            </button>

            <Button
              size="default"
              className="rounded-full px-8 h-12 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-100 transition-all border-none"
              onClick={() => {/* Billing logic */ }}
            >
              Purchase Premium License
            </Button>
          </div>
        </div>

        {/* Right Column: Toolbox Section */}
        <div className="w-full">
          <div className="bg-slate-50 border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm transform scale-95 origin-right">

            <div className="bg-[#2596be] p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-0.5 text-left text-white">
                  <h2 className="text-xl font-bold tracking-tight">Available Toolbox</h2>
                  <p className="opacity-80 text-[10px] font-bold uppercase tracking-widest">Engineering Suite</p>
                </div>

                <div className="flex items-center gap-2 bg-green-500/20 border border-green-400/30 rounded-xl p-2 px-4 backdrop-blur-sm text-white">
                  <ShieldCheck className="h-4 w-4 text-green-400 fill-green-400/20" />
                  <p className="text-xs font-black uppercase tracking-tight text-white">Pro Plan Active</p>
                </div>
              </div>
            </div>

            {/* Tools Grid Area */}
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tools.map((tool) => (
                  <Card key={tool.id} className={`group flex flex-col h-full transition-all border-slate-100 shadow-sm bg-white rounded-xl ${tool.status === 'Active' ? 'hover:shadow-xl hover:border-[#2596be]/30' : 'opacity-70 grayscale-[0.5]'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-4">
                      <div className={`p-2 rounded-lg transition-colors ${tool.status === 'Active' ? 'bg-[#2596be]/10 text-[#2596be]' : 'bg-slate-100'}`}>
                        {tool.icon}
                      </div>
                      <Badge variant={tool.status === 'Active' ? "default" : "secondary"} className={tool.status === 'Active' ? "bg-green-600 px-2 py-0 text-[9px] uppercase font-bold border-none" : "text-[9px] uppercase font-bold"}>
                        {tool.status}
                      </Badge>
                    </CardHeader>
                    <CardContent className="flex-grow pb-4 px-4">
                      <h3 className="font-bold text-base mb-1 text-slate-900">{tool.title}</h3>
                      <p className="text-xs text-slate-500 leading-snug line-clamp-2">{tool.description}</p>
                    </CardContent>
                    <CardFooter className="pt-0 pb-4 px-4">
                      <Button
                        size="sm"
                        className="w-full font-bold text-[11px] h-9 rounded-lg bg-slate-900 hover:bg-[#2596be]"
                        disabled={tool.status !== 'Active'}
                        onClick={() => tool.path && navigate(tool.path)}
                      >
                        {tool.status === 'Active' ? (
                          <>Open Tool <ExternalLink className="ml-1.5 h-3 w-3" /></>
                        ) : 'Coming Soon'}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MainPortal;