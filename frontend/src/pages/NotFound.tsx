import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-app-text">404</h1>
        <p className="mb-4 text-xl text-app-text-muted">Página no encontrada</p>
        <a href="/" className="text-app-accent underline hover:text-app-accent/80">
          Volver al inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;
