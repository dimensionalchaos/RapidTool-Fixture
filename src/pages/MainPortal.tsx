import React from 'react';
import { useAuthStore } from "@/stores/authStore"; 
import { useNavigate } from 'react-router-dom';
import  { useEffect } from 'react'; 
import { 
  Calculator, Database, BarChart3, ExternalLink, ShieldCheck 
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const { user, fetchCurrentUser } = useAuthStore(); // Add fetchCurrentUser here
  const displayName = user?.name ? user.name.split(' ')[0] : "User";
  useEffect(() => {
  // If user is empty (which happens on refresh), go get the data
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
      icon: <Calculator className="h-6 w-6" />,
      path: "/app/fixture"
    },
    {
      id: '2',
      title: "Coming Soon",
      description: "",
      status: "Coming Soon",
      icon: <Database className="h-6 w-6 text-gray-400" />,
    },
    {
        id: '3',
        title: "Coming Soon",
        description: "",
        status: "Coming Soon",
        icon: <BarChart3 className="h-6 w-6 text-gray-400" />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-0.5">Welcome back, {displayName}</h1>
          <p className="text-muted-foreground text-sm font-medium">Pro Plan · Active</p>
        </div>

        {/* License Widget (Remains Right-Aligned) */}
        <div className="flex items-center justify-between border rounded-xl p-4 w-full lg:w-72 bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 p-2 rounded-full">
              <ShieldCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-bold">Current Licenses</p>
              <button className="text-[10px] text-muted-foreground hover:underline block">View details</button>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-slate-900 leading-none">Pro</p>
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="h-1.5 w-1.5 bg-green-500 rounded-full" />
              <p className="text-[9px] text-green-600 font-bold uppercase">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- REPOSITIONED TOOLS HEADER --- */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Available Tools</h2>
        <p className="text-muted-foreground text-sm">Launch and manage your engineering software tools</p>
      </div>

      {/* --- MOVED UPWARDS: Reduced padding and margins --- */}
      <div className="bg-gray-50/80 border border-gray-100 rounded-3xl p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Card key={tool.id} className={`flex flex-col h-full transition-all border-slate-200 ${tool.status === 'Active' ? 'hover:shadow-md' : 'opacity-70 grayscale-[0.5]'}`}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="bg-slate-100 p-2 rounded-lg">{tool.icon}</div>
                <Badge variant={tool.status === 'Active' ? "default" : "secondary"} className={tool.status === 'Active' ? "bg-green-600 text-[10px]" : "text-[10px]"}>
                  {tool.status}
                </Badge>
              </CardHeader>
              <CardContent className="flex-grow pb-4">
                <h3 className="font-bold text-base mb-1">{tool.title}</h3>
                <p className="text-xs text-muted-foreground leading-normal">{tool.description}</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  size="sm"
                  className="w-full font-bold text-xs" 
                  disabled={tool.status !== 'Active'}
                  onClick={() => tool.path && navigate(tool.path)}
                >
                  {tool.status === 'Active' ? (
                    <>Open Tool <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></>
                  ) : 'Coming Soon'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MainPortal;