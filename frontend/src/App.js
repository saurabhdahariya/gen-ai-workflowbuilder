import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import StackBuilder from './pages/StackBuilder';
import WorkflowBuilder from './pages/WorkflowBuilder';
import Navigation from './components/layout/Navigation';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-background text-foreground">
          <Navigation />
          <main className="min-h-screen pt-16">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/stack/:id" element={<StackBuilder />} />
              {/* Legacy route for backward compatibility */}
              <Route path="/workflow" element={<WorkflowBuilder />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
