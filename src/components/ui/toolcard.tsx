import React from 'react';
import { 
  Calculator, 
  Database, 
  BarChart3, 
  ShieldCheck, 
  CreditCard,
  ExternalLink,
  Settings,
  FileText,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// --- 1. Interface Defined Locally ---
// You can export this later if you decide to move it to a types file
export interface Tool {
  id: string;
  title: string;
  description: string;
  status: 'Active' | 'Coming Soon';
  icon: React.ReactNode;
  href?: string;
}

interface ToolCardProps {
  tool: Tool;
}

// --- 2. Sub-component: ToolCard ---
const ToolCard: React.FC<ToolCardProps> = ({ tool }) => {
  const isActive = tool.status === 'Active';

  return (
    <Card className={`flex flex-col h-full transition-all duration-200 ${isActive ? 'hover:shadow-md' : 'opacity-70 bg-gray-50/50'}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className={`p-2.5 rounded-lg ${isActive ? 'bg-secondary' : 'bg-gray-200'}`}>
          {tool.icon}
        </div>
        <Badge 
          variant={isActive ? "default" : "secondary"} 
          className={isActive ? "bg-green-600 hover:bg-green-600" : "text-gray-400 bg-gray-200"}
        >
          {tool.status}
        </Badge>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <h3 className={`font-bold text-lg mb-2 ${!isActive && 'text-gray-400'}`}>
          {tool.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {tool.description}
        </p>
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full font-bold" 
          variant={isActive ? "default" : "secondary"}
          disabled={!isActive}
        >
          {isActive ? (
            <>Open Tool <ExternalLink className="ml-2 h-4 w-4" /></>
          ) : (
            'Coming Soon'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

// --- 3. Main Dashboard Component ---
export default function DashboardPage() {
  // Mock data matching the UI from your image
  const tools: Tool[] = [
    {
      id: '1',
      title: "Advanced Calculator Pro",
      description: "Professional engineering calculator with advanced functions, unit conversions, and custom formulas for complex calculations.",
      status: "Active",
      icon: <Calculator className="h-6 w-6" />,
    },
    {
      id: '2',
      title: "Data Analysis Suite",
      description: "Comprehensive data analysis tool with advanced statistical functions, data visualization, and reporting capabilities.",
      status: "Coming Soon",
      icon: <Database className="h-6 w-6 text-gray-400" />,
    },
    {
      id: '3',
      title: "Project Management Dashboard",
      description: "Efficient project management tool with task tracking, resource allocation, and timeline visualization features.",
      status: "Coming Soon",
      icon: <BarChart3 className="h-6 w-6 text-gray-400" />,
    },
    {
        id: '4',
        title: "Document Generator",
        description: "Automated document generation tool with templates, version control, and export to multiple formats.",
        status: "Coming Soon",
        icon: <FileText className="h-6 w-6 text-gray-400" />,
      },
      {
        id: '5',
        title: "System Configuration Tool",
        description: "Advanced system configuration with customizable settings, performance optimization, and security.",
        status: "Coming Soon",
        icon: <Settings className="h-6 w-6 text-gray-400" />,
      },
      {
        id: '6',
        title: "Performance Analyzer",
        description: "Real-time performance monitoring and analysis tool with detailed metrics, benchmarking, and optimization.",
        status: "Coming Soon",
        icon: <Activity className="h-6 w-6 text-gray-400" />,
      },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <div className="bg-black text-white px-2 py-1 rounded font-bold text-sm">RT</div>
          <span className="font-bold text-xl tracking-tight">RapidTool</span>
        </div>
        <div className="flex items-center gap-4">
          <Badge className="bg-green-600 hover:bg-green-600">Pro · Active</Badge>
          <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 border-gray-300">
            <CreditCard className="h-4 w-4" /> Upgrade / Billing
          </Button>
          <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center text-sm font-medium">R</div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* User Welcome & License Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-16 gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-1">Welcome back, Raja</h1>
            <p className="text-muted-foreground font-medium">Pro Plan · Active</p>
          </div>

          {/* License Widget */}
          <div className="flex items-center justify-between border rounded-2xl p-5 w-full lg:w-80 bg-white shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-green-50 p-2.5 rounded-full">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Current Licenses</p>
                <button className="text-xs text-muted-foreground hover:underline block text-left">View details</button>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-xl">Pro</p>
              <div className="flex items-center justify-end gap-1.5 mt-1">
                <span className="h-2 w-2 bg-green-500 rounded-full" />
                <p className="text-xs text-green-600 font-bold uppercase tracking-wide">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <div className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-bold tracking-tight">Available Tools</h2>
            <p className="text-muted-foreground text-lg">Launch and manage your engineering software tools</p>
          </div>

          {/* The Muted Grid Container */}
          <div className="bg-gray-50/80 border border-gray-100 rounded-[2.5rem] p-8 sm:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}