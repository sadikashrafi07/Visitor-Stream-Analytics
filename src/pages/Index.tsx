import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewKpis } from '@/components/dashboard/OverviewKpis';
import { TrafficAnalytics } from '@/components/dashboard/TrafficAnalytics';
import { EngagementAnalytics } from '@/components/dashboard/EngagementAnalytics';
import { SectionAnalytics } from '@/components/dashboard/SectionAnalytics';
import {
  ProjectAnalytics,
  SocialAnalytics,
  CertificationAnalytics,
} from '@/components/dashboard/InteractionAnalytics';
import { ConversionAnalytics } from '@/components/dashboard/ConversionAnalytics';
import { NavigationAnalytics } from '@/components/dashboard/NavigationAnalytics';
import { ReturningVisitorAnalytics } from '@/components/dashboard/ReturningVisitorAnalytics';
import { EventExplorer } from '@/components/dashboard/EventExplorer';
import { RecruiterInsights } from '@/components/dashboard/RecruiterInsights';
import {
  Activity,
  Sun,
  Moon,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';

const PORTFOLIO_URL = 'https://beyond-code-78c87.web.app/?utm_source=analytics_dashboard&utm_medium=dashboard&utm_campaign=view_portfolio';

const Index = () => {
  const [tab, setTab] = useState('overview');
  const [dark, setDark] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const toggleTheme = () => {
    setDark((d) => !d);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/70">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-[0_0_24px_hsl(var(--primary)/0.25)]">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-sm font-display font-bold tracking-tight sm:text-base">
                  Portfolio Analytics
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Visitor behavior & recruiter insights
                </p>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden items-center gap-3 md:flex">
              <div className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5 shadow-sm">
                <div className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Live</span>
              </div>

              <button
                onClick={toggleTheme}
                aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/70 text-foreground transition-all duration-200 hover:bg-muted hover:shadow-sm"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <a
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all duration-200 hover:border-primary/30 hover:bg-primary/15 hover:shadow-[0_0_24px_hsl(var(--primary)/0.12)]"
              >
                <span>View Portfolio</span>
                <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5 shadow-sm">
                <div className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Live</span>
              </div>

              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/70 text-foreground transition-all duration-200 hover:bg-muted hover:shadow-sm"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Panel */}
          {mobileMenuOpen && (
            <div className="mt-3 md:hidden">
              <div className="overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-xl">
                <div className="p-2">
                  <button
                    onClick={() => {
                      toggleTheme();
                      closeMobileMenu();
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/80">
                        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Toggle Theme</p>
                        <p className="text-xs text-muted-foreground">
                          Switch dashboard appearance
                        </p>
                      </div>
                    </div>
                  </button>

                  <a
                    href={PORTFOLIO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMobileMenu}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                        <ExternalLink className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">View Portfolio</p>
                        <p className="text-xs text-muted-foreground">
                          Open my portfolio website
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          {/* Centered Desktop / Responsive Tabs Rail */}
          <div className="flex justify-center">
            <TabsList className="h-auto w-full max-w-fit flex-wrap justify-center gap-0.5 rounded-2xl border border-border bg-card/80 p-1 shadow-[0_10px_30px_hsl(var(--background)/0.35)] backdrop-blur-sm">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="traffic" className="text-xs sm:text-sm">
                Traffic
              </TabsTrigger>
              <TabsTrigger value="engagement" className="text-xs sm:text-sm">
                Engagement
              </TabsTrigger>
              <TabsTrigger value="sections" className="text-xs sm:text-sm">
                Sections
              </TabsTrigger>
              <TabsTrigger value="projects" className="text-xs sm:text-sm">
                Projects
              </TabsTrigger>
              <TabsTrigger value="social" className="text-xs sm:text-sm">
                Social
              </TabsTrigger>
              <TabsTrigger value="certs" className="text-xs sm:text-sm">
                Certifications
              </TabsTrigger>
              <TabsTrigger value="conversions" className="text-xs sm:text-sm">
                Conversions
              </TabsTrigger>
              <TabsTrigger value="navigation" className="text-xs sm:text-sm">
                Navigation
              </TabsTrigger>
              <TabsTrigger value="returning" className="text-xs sm:text-sm">
                Returning
              </TabsTrigger>
              <TabsTrigger value="events" className="text-xs sm:text-sm">
                Events
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs sm:text-sm">
                Insights
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <RecruiterInsights />
            <OverviewKpis />
          </TabsContent>
          <TabsContent value="traffic">
            <TrafficAnalytics />
          </TabsContent>
          <TabsContent value="engagement">
            <EngagementAnalytics />
          </TabsContent>
          <TabsContent value="sections">
            <SectionAnalytics />
          </TabsContent>
          <TabsContent value="projects">
            <ProjectAnalytics />
          </TabsContent>
          <TabsContent value="social">
            <SocialAnalytics />
          </TabsContent>
          <TabsContent value="certs">
            <CertificationAnalytics />
          </TabsContent>
          <TabsContent value="conversions">
            <ConversionAnalytics />
          </TabsContent>
          <TabsContent value="navigation">
            <NavigationAnalytics />
          </TabsContent>
          <TabsContent value="returning">
            <ReturningVisitorAnalytics />
          </TabsContent>
          <TabsContent value="events">
            <EventExplorer />
          </TabsContent>
          <TabsContent value="insights">
            <RecruiterInsights />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-border py-4">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          Portfolio Analytics Dashboard — Powered by real-time visitor tracking
        </div>
      </footer>
    </div>
  );
};

export default Index;