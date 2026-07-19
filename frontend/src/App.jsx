import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ProtectedRoute from "./routes/ProtectedRoute";

// Placeholder components for future modules
// These will be implemented when the features are added
const ComingSoon = ({ title, description }) => (
  <div className="min-h-screen bg-slate-900 text-white p-8">
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-800 rounded-xl p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">🚧 {title}</h1>
        <p className="text-slate-400">{description}</p>
        <p className="text-slate-500 mt-4 text-sm">
          This feature is coming soon. Stay tuned!
        </p>
      </div>
    </div>
  </div>
);

// Lazy load future pages
const ResearchPage = () => (
  <ComingSoon 
    title="Research" 
    description="Literature review, source synthesis, and academic research tools."
  />
);

const AnalyticsPage = () => (
  <ComingSoon 
    title="Analytics" 
    description="Learning analytics, study insights, and progress tracking."
  />
);

const JobsPage = () => (
  <ComingSoon 
    title="Job Hunting" 
    description="Resume analysis, cover letter generation, and interview prep."
  />
);

const ExamPage = () => (
  <ComingSoon 
    title="Exam Prep" 
    description="Custom exams, practice questions, and spaced repetition."
  />
);

const VideoPage = () => (
  <ComingSoon 
    title="Video Learning" 
    description="Video transcription, summarization, and transcript-based chat."
  />
);

const MathPage = () => (
  <ComingSoon 
    title="Math & Science" 
    description="Step-by-step problem solving, formula explanations, and graphs."
  />
);

const AgentsPage = () => (
  <ComingSoon 
    title="Agent Studio" 
    description="Custom AI workflows and agent orchestration."
  />
);

export default function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Main Application Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* ============================================================================
          Future Module Routes (Scaffolded for easy addition)
          ========================================================================== */}
      
      {/* Research Module */}
      <Route
        path="/research"
        element={
          <ProtectedRoute>
            <ResearchPage />
          </ProtectedRoute>
        }
      />

      {/* Analytics Module */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />

      {/* Job Hunting Module */}
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <JobsPage />
          </ProtectedRoute>
        }
      />

      {/* Exam Preparation Module */}
      <Route
        path="/exam"
        element={
          <ProtectedRoute>
            <ExamPage />
          </ProtectedRoute>
        }
      />

      {/* Video Learning Module */}
      <Route
        path="/video"
        element={
          <ProtectedRoute>
            <VideoPage />
          </ProtectedRoute>
        }
      />

      {/* Math & Science Module */}
      <Route
        path="/math"
        element={
          <ProtectedRoute>
            <MathPage />
          </ProtectedRoute>
        }
      />

      {/* Agent Studio Module */}
      <Route
        path="/agents"
        element={
          <ProtectedRoute>
            <AgentsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
