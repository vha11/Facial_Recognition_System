import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEmployees } from "@/hooks/useEmployees";
import { CreateEmployeeData, UpdateEmployeeData } from "@/services/employees";
import { Plus, Edit2, Search, Upload, X, User } from "lucide-react";

interface EmployeeForm {
  nombre: string;
  telefono: string;
  puesto: string;
  area: string;
  activo: boolean;
  images: File[];
}

const Employees = () => {
  const { employees, isLoading, createEmployee, updateEmployee, toggleEmployeeStatus } = useEmployees();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmployeeForm>({
    nombre: "",
    telefono: "",
    puesto: "",
    area: "",
    activo: true,
    images: [],
  });

  const areas = ["Tecnología", "Recursos Humanos", "Ventas", "Marketing", "Finanzas"];

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.puesto?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesArea = filterArea === "all" || employee.area === filterArea;
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "active" && employee.activo) ||
                         (filterStatus === "inactive" && !employee.activo);

    return matchesSearch && matchesArea && matchesStatus;
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files].slice(0, 10)
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const openDialog = (employeeId?: string) => {
    if (employeeId) {
      const employee = employees.find(emp => emp.id === employeeId);
      if (employee) {
        setEditingEmployeeId(employeeId);
        setFormData({
          nombre: employee.nombre,
          telefono: employee.telefono || "",
          puesto: employee.puesto || "",
          area: employee.area || "",
          activo: employee.activo,
          images: [],
        });
      }
    } else {
      setEditingEmployeeId(null);
      setFormData({
        nombre: "",
        telefono: "",
        puesto: "",
        area: "",
        activo: true,
        images: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingEmployeeId) {
        const updateData: UpdateEmployeeData = {
          nombre: formData.nombre,
          telefono: formData.telefono,
          puesto: formData.puesto,
          area: formData.area,
          activo: formData.activo,
          images: formData.images.length > 0 ? formData.images : undefined,
        };
        await updateEmployee(editingEmployeeId, updateData);
      } else {
        const createData: CreateEmployeeData = {
          nombre: formData.nombre,
          telefono: formData.telefono,
          puesto: formData.puesto,
          area: formData.area,
          activo: formData.activo,
          images: formData.images,
        };
        await createEmployee(createData);
      }

      setIsDialogOpen(false);
    } catch (error) {
      // El error ya se maneja en el hook
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-app-text-primary">Gestión de Empleados</h1>
            <p className="text-app-text-secondary">Administra el registro de empleados y sus datos biométricos</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => openDialog()}
                className="bg-gradient-accent text-app-text-light hover:scale-[1.02] transition-bounce shadow-soft"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Empleado
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card border-0">
              <DialogHeader>
                <DialogTitle className="text-app-text-primary">
                  {editingEmployeeId ? "Editar Empleado" : "Nuevo Empleado"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="text-app-text-primary">Nombre completo *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      className="glass border-app-text-secondary/20 focus:border-app-accent-start"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono" className="text-app-text-primary">Teléfono</Label>
                    <Input
                      id="telefono"
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                      className="glass border-app-text-secondary/20 focus:border-app-accent-start"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="puesto" className="text-app-text-primary">Puesto</Label>
                    <Input
                      id="puesto"
                      value={formData.puesto}
                      onChange={(e) => setFormData(prev => ({ ...prev, puesto: e.target.value }))}
                      className="glass border-app-text-secondary/20 focus:border-app-accent-start"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area" className="text-app-text-primary">Área</Label>
                    <Select value={formData.area} onValueChange={(value) => setFormData(prev => ({ ...prev, area: value }))}>
                      <SelectTrigger className="glass border-app-text-secondary/20 text-app-text-primary">
                        <SelectValue placeholder="Seleccionar área" />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-0">
                        {areas.map(area => (
                          <SelectItem key={area} value={area} className="text-app-text-primary">{area}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, activo: checked }))}
                  />
                  <Label htmlFor="activo" className="text-app-text-primary">Empleado activo</Label>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-app-text-primary">
                      Imágenes {!editingEmployeeId && "*"} 
                      {!editingEmployeeId && (
                        <span className="text-sm text-app-text-secondary ml-1">(mínimo 3)</span>
                      )}
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="glass border-app-accent-start text-app-accent-start hover:bg-gradient-glass"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir imágenes
                    </Button>
                    <input
                      id="image-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square glass rounded-xl overflow-hidden border border-app-text-secondary/10">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-app-error text-app-text-light rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!editingEmployeeId && formData.images.length < 3 && (
                    <div className="text-sm text-app-warning glass p-3 rounded-xl border-l-4 border-l-app-warning">
                      Se requieren al menos 3 imágenes para entrenar el modelo de reconocimiento facial
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="glass border-app-text-secondary/20 text-app-text-primary hover:bg-gradient-glass"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-accent text-app-text-light hover:scale-[1.02] transition-bounce"
                    disabled={!editingEmployeeId && formData.images.length < 3}
                  >
                    {editingEmployeeId ? "Actualizar" : "Registrar"} Empleado
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <Card className="glass-card border-0 shadow-soft">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-app-text-secondary" />
                  <Input
                    placeholder="Buscar por nombre, área o puesto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 glass border-app-text-secondary/20 focus:border-app-accent-start"
                  />
                </div>
              </div>

              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-full sm:w-48 glass border-app-text-secondary/20 text-app-text-primary">
                  <SelectValue placeholder="Filtrar por área" />
                </SelectTrigger>
                <SelectContent className="glass-card border-0">
                  <SelectItem value="all" className="text-app-text-primary">Todas las áreas</SelectItem>
                  {areas.map(area => (
                    <SelectItem key={area} value={area} className="text-app-text-primary">{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40 glass border-app-text-secondary/20 text-app-text-primary">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="glass-card border-0">
                  <SelectItem value="all" className="text-app-text-primary">Todos</SelectItem>
                  <SelectItem value="active" className="text-app-text-primary">Activos</SelectItem>
                  <SelectItem value="inactive" className="text-app-text-primary">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de empleados */}
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="text-app-text-primary">
              Empleados registrados ({filteredEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredEmployees.map((employee) => (
                <div 
                  key={employee.id}
                  className="flex items-center justify-between p-4 glass rounded-2xl border border-app-text-secondary/10 hover:bg-gradient-glass transition-smooth"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-accent rounded-full flex items-center justify-center shadow-soft">
                        <User className="h-6 w-6 text-app-text-light" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-app-text-primary truncate">{employee.nombre}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-app-text-secondary">
                        {employee.puesto && <span>{employee.puesto}</span>}
                        {employee.area && <span>• {employee.area}</span>}
                        {employee.telefono && <span>• {employee.telefono}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge 
                      className={`glass ${
                        employee.activo 
                          ? 'border-app-success/30 text-app-success' 
                          : 'border-app-text-secondary/30 text-app-text-secondary'
                      }`}
                    >
                      {employee.activo ? 'Activo' : 'Inactivo'}
                    </Badge>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(employee.id)}
                      className="glass border-app-accent-start text-app-accent-start hover:bg-gradient-glass"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Editar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleEmployeeStatus(employee.id)}
                      className="glass border-app-text-secondary/20 text-app-text-primary hover:bg-gradient-glass"
                      disabled={isLoading}
                    >
                      {employee.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Employees;