import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Tasks } from './pages/Tasks';
import { TaskFlows } from './pages/TaskFlows';
import { Events } from './pages/Events';
import { Settings } from './pages/Settings';
import { Notifications } from './pages/Notifications';

// ═══════════════════════════════════════════════════════════════════════════
// HIVEMIND APP
// Main application with routing
// ═══════════════════════════════════════════════════════════════════════════

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<Projects />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="flows" element={<TaskFlows />} />
          <Route path="flows/:id" element={<TaskFlows />} />
          <Route path="events" element={<Events />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
