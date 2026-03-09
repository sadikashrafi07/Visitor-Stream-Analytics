import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewKpis } from '@/components/dashboard/OverviewKpis';
import { TrafficAnalytics } from '@/components/dashboard/TrafficAnalytics';
import { EngagementAnalytics } from '@/components/dashboard/EngagementAnalytics';
import { SectionAnalytics } from '@/components/dashboard/SectionAnalytics';
import { ProjectAnalytics, SocialAnalytics, CertificationAnalytics } from '@/components/dashboard/InteractionAnalytics';
import { ConversionAnalytics } from '@/components/dashboard/ConversionAnalytics';
import { NavigationAnalytics } from '@/components/dashboard/NavigationAnalytics';
import { ReturningVisitorAnalytics } from '@/components/dashboard/ReturningVisitorAnalytics';
import { EventExplorer } from '@/components/dashboard/EventExplorer';
import { RecruiterInsights } from '@/components/dashboard/RecruiterInsights';
import { Activity, Sun, Moon } from 'lucide-react';

const Index = () => {
  const [tab, setTab] = useState('overview');
  const [dark, setDark] = useState(true);

  const toggleTheme = () => {
    setDark(d => !d);
    document.documentElement.classList.toggle('dark');
  };

  // Set dark on mount
  if (dark && !document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.add('dark');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-display font-bold tracking-tight">Portfolio Analytics</h1>
              <p className="text-xs text-muted-foreground">Visitor behavior & recruiter insights</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
            <button onClick={toggleTheme} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="bg-card border border-border h-auto p-1 flex flex-wrap gap-0.5">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="traffic" className="text-xs">Traffic</TabsTrigger>
            <TabsTrigger value="engagement" className="text-xs">Engagement</TabsTrigger>
            <TabsTrigger value="sections" className="text-xs">Sections</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs">Projects</TabsTrigger>
            <TabsTrigger value="social" className="text-xs">Social</TabsTrigger>
            <TabsTrigger value="certs" className="text-xs">Certifications</TabsTrigger>
            <TabsTrigger value="conversions" className="text-xs">Conversions</TabsTrigger>
            <TabsTrigger value="navigation" className="text-xs">Navigation</TabsTrigger>
            <TabsTrigger value="returning" className="text-xs">Returning</TabsTrigger>
            <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <RecruiterInsights />
            <OverviewKpis />
          </TabsContent>
          <TabsContent value="traffic"><TrafficAnalytics /></TabsContent>
          <TabsContent value="engagement"><EngagementAnalytics /></TabsContent>
          <TabsContent value="sections"><SectionAnalytics /></TabsContent>
          <TabsContent value="projects"><ProjectAnalytics /></TabsContent>
          <TabsContent value="social"><SocialAnalytics /></TabsContent>
          <TabsContent value="certs"><CertificationAnalytics /></TabsContent>
          <TabsContent value="conversions"><ConversionAnalytics /></TabsContent>
          <TabsContent value="navigation"><NavigationAnalytics /></TabsContent>
          <TabsContent value="returning"><ReturningVisitorAnalytics /></TabsContent>
          <TabsContent value="events"><EventExplorer /></TabsContent>
          <TabsContent value="insights"><RecruiterInsights /></TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          Portfolio Analytics Dashboard — Powered by real-time visitor tracking
        </div>
      </footer>
    </div>
  );
};

export default Index;
