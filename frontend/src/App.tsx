import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar from "./components/Navbar";
import Camera from "./pages/Camera";
import Login from "./pages/Login";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";

const queryClient = new QueryClient();

const App = () => {
  const [activeSection, setActiveSection] = useState("camera");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleSectionChange = (section: string) => {
    if (section === "logout") {
      setIsAuthenticated(false);
      setActiveSection("camera");
      return;
    }
    
    // Si intenta acceder a secciones protegidas sin autenticación
    if ((section === "employees" || section === "attendance") && !isAuthenticated) {
      setActiveSection("login");
      return;
    }

    setActiveSection(section);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setActiveSection("employees");
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "camera":
        return <Camera />;
      case "login":
        return <Login onLoginSuccess={handleLoginSuccess} />;
      case "employees":
        return isAuthenticated ? <Employees /> : <Login onLoginSuccess={handleLoginSuccess} />;
      case "attendance":
        return isAuthenticated ? <Attendance /> : <Login onLoginSuccess={handleLoginSuccess} />;
      default:
        return <Camera />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen">
          <Navbar 
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            isAuthenticated={isAuthenticated}
          />
          
          <main>
            {renderActiveSection()}
          </main>
        </div>
        
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
