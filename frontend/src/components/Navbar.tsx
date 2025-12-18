import { cn } from "@/lib/utils";

interface NavbarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isAuthenticated: boolean;
}

const Navbar = ({ activeSection, onSectionChange, isAuthenticated }: NavbarProps) => {
  const navItems = [
    { id: "camera", label: "Cámara en tiempo real", requiresAuth: false },
    { id: "login", label: "Login", requiresAuth: false, hideWhenAuth: true },
    { id: "employees", label: "Gestión de empleados", requiresAuth: true },
    { id: "attendance", label: "Asistencia", requiresAuth: true },
  ];

  const filteredItems = navItems.filter(item => {
    if (item.hideWhenAuth && isAuthenticated) return false;
    if (item.requiresAuth && !isAuthenticated) return false;
    return true;
  });

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card mx-4 mt-4">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold text-app-text-primary">
          Sistema de Asistencia
        </h1>
        
        <div className="flex items-center gap-1">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-smooth hover:bg-gradient-glass",
                activeSection === item.id
                  ? "bg-gradient-accent text-app-text-light shadow-soft"
                  : "text-app-text-primary hover:text-app-accent-start"
              )}
            >
              {item.label}
            </button>
          ))}
          
          {isAuthenticated && (
            <button
              onClick={() => onSectionChange("logout")}
              className="ml-4 px-4 py-2 rounded-xl text-sm font-medium text-app-error hover:bg-gradient-glass transition-smooth"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;