import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { useTheme } from './contexts/useTheme';
import { SidebarLayout } from './layouts/SidebarLayout';
import { TopNavLayout } from './layouts/TopNavLayout';
import { FloatingLayout } from './layouts/FloatingLayout';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Tasks } from './pages/Tasks';
import { Graphs } from './pages/Graphs';
import { TaskFlows } from './pages/TaskFlows';
import { Merges } from './pages/Merges';
import { Events } from './pages/Events';
import { Settings } from './pages/Settings';
import { Notifications } from './pages/Notifications';
import { ThemeMatrix } from './pages/ThemeMatrix';
import { useHivemindStore } from './stores/hivemindStore';

function LayoutRouter() {
  const { layout } = useTheme();

  const LayoutComponent =
    layout === 'topnav'
      ? TopNavLayout
      : layout === 'floating'
      ? FloatingLayout
      : SidebarLayout;

  return (
    <Routes>
      <Route path="/" element={<LayoutComponent />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="tasks/:id" element={<Tasks />} />
        <Route path="graphs" element={<Graphs />} />
        <Route path="graphs/:id" element={<Graphs />} />
        <Route path="flows" element={<TaskFlows />} />
        <Route path="flows/:id" element={<TaskFlows />} />
        <Route path="merges" element={<Merges />} />
        <Route path="merges/:id" element={<Merges />} />
        <Route path="events" element={<Events />} />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="themes" element={<ThemeMatrix />} />
      </Route>
    </Routes>
  );
}

function App() {
  const refreshFromApi = useHivemindStore((s) => s.refreshFromApi);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await refreshFromApi(200);
    };

    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [refreshFromApi]);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <LayoutRouter />
        <ThemeSwitcher />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
