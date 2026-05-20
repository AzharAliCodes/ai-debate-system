import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";

// Pages
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import Dashboard from "@/pages/Dashboard";
import CreateRoom from "@/pages/CreateInterview";
import JoinRoom from "@/pages/JoinRoom";
import DebateRoom from "@/pages/InterviewPage";
import Results from "@/pages/FeedbackPage";

// Components
import ProtectedRoute from "@/components/ProtectedRoute";
import { isAuthenticated } from "@/utils/auth";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/signin"
            element={isAuthenticated() ? <Navigate to="/" replace /> : <SignIn />}
          />
          <Route
            path="/signup"
            element={isAuthenticated() ? <Navigate to="/" replace /> : <SignUp />}
          />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/debate/create" element={<ProtectedRoute><CreateRoom /></ProtectedRoute>} />
          <Route path="/debate/join" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
          <Route path="/debate/:id" element={<ProtectedRoute><DebateRoom /></ProtectedRoute>} />
          <Route path="/debate/:id/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
