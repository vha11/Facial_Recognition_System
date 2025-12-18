import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { attendanceService, AttendanceRecord } from "@/services/attendance";
import { Calendar, CalendarDays, Download, Search, TrendingUp, TrendingDown, Clock, Users } from "lucide-react";

const Attendance = () => {
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const employees = [
    { id: "ana-garcia", name: "Ana García López" },
    { id: "carlos-rodriguez", name: "Carlos Rodríguez" },
    { id: "maria-fernandez", name: "María Fernández" },
  ];

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    setIsLoading(true);
    try {
      const records = await attendanceService.getAttendance();
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = attendanceRecords.filter(record => {
    const employeeMatch = selectedEmployee === "all" || 
                         record.employeeName.toLowerCase().includes(selectedEmployee.toLowerCase());
    
    let dateMatch = true;
    if (startDate || endDate) {
      const recordDate = record.timestamp.toISOString().split('T')[0];
      if (startDate && recordDate < startDate) dateMatch = false;
      if (endDate && recordDate > endDate) dateMatch = false;
    }

    return employeeMatch && dateMatch;
  });

  const totalEntradas = filteredRecords.filter(r => r.type === "ENTRADA").length;
  const totalSalidas = filteredRecords.filter(r => r.type === "SALIDA").length;
  const empleadosUnicos = new Set(filteredRecords.map(r => r.employeeName)).size;

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const exportData = async () => {
    try {
      const blob = await attendanceService.exportAttendance({
        employeeName: selectedEmployee !== "all" ? selectedEmployee : undefined,
        startDate,
        endDate,
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asistencia-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const clearFilters = () => {
    setSelectedEmployee("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="min-h-screen pt-24 pb-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-app-text-primary">Control de Asistencia</h1>
            <p className="text-app-text-secondary">Consulta y analiza los registros de entrada y salida</p>
          </div>

          <Button
            onClick={exportData}
            className="bg-gradient-accent text-app-text-light hover:scale-[1.02] transition-bounce shadow-soft"
            disabled={filteredRecords.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar datos
          </Button>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card border-0 shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-app-success/20 rounded-2xl">
                  <TrendingUp className="h-6 w-6 text-app-success" />
                </div>
                <div className="ml-4">
                  <p className="text-3xl font-bold text-app-text-primary">{totalEntradas}</p>
                  <p className="text-sm text-app-text-secondary">Entradas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-app-warning/20 rounded-2xl">
                  <TrendingDown className="h-6 w-6 text-app-warning" />
                </div>
                <div className="ml-4">
                  <p className="text-3xl font-bold text-app-text-primary">{totalSalidas}</p>
                  <p className="text-sm text-app-text-secondary">Salidas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-accent rounded-2xl">
                  <Users className="h-6 w-6 text-app-text-light" />
                </div>
                <div className="ml-4">
                  <p className="text-3xl font-bold text-app-text-primary">{empleadosUnicos}</p>
                  <p className="text-sm text-app-text-secondary">Empleados activos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-app-text-secondary/20 rounded-2xl">
                  <Clock className="h-6 w-6 text-app-text-secondary" />
                </div>
                <div className="ml-4">
                  <p className="text-3xl font-bold text-app-text-primary">{filteredRecords.length}</p>
                  <p className="text-sm text-app-text-secondary">Total registros</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-app-text-primary">
              <Search className="h-5 w-5" />
              Filtros de búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee" className="text-app-text-primary">Empleado</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="glass border-app-text-secondary/20 text-app-text-primary">
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-0">
                    <SelectItem value="all" className="text-app-text-primary">Todos los empleados</SelectItem>
                    {employees.map(employee => (
                      <SelectItem key={employee.id} value={employee.name} className="text-app-text-primary">
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-app-text-primary">Fecha inicio</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="glass border-app-text-secondary/20 focus:border-app-accent-start"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-app-text-primary">Fecha fin</Label>
                <Input
                  id="end-date" 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="glass border-app-text-secondary/20 focus:border-app-accent-start"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="w-full glass border-app-text-secondary/20 text-app-text-primary hover:bg-gradient-glass"
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de registros */}
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-app-text-primary">
              <CalendarDays className="h-5 w-5" />
              Registros de asistencia ({filteredRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-app-text-secondary mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-app-text-primary mb-2">No hay registros</h3>
                <p className="text-app-text-secondary">
                  No se encontraron registros de asistencia con los filtros aplicados
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 glass rounded-2xl border border-app-text-secondary/10 hover:bg-gradient-glass transition-smooth"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className={`p-3 rounded-2xl ${
                          record.type === "ENTRADA" 
                            ? "bg-app-success/20" 
                            : "bg-app-warning/20"
                        }`}>
                          {record.type === "ENTRADA" ? (
                            <TrendingUp className="h-5 w-5 text-app-success" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-app-warning" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-app-text-primary">{record.employeeName}</h3>
                          <Badge
                            className={`glass ${
                              record.type === "ENTRADA"
                                ? "border-app-success/30 text-app-success"
                                : "border-app-warning/30 text-app-warning"
                            }`}
                          >
                            {record.type}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-1 text-sm text-app-text-secondary">
                          <span>{record.employeeArea}</span>
                          <span>•</span>
                          <span>{formatDateTime(record.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`glass ${
                            record.confidence >= 0.9 
                              ? "border-app-success/30 text-app-success" 
                              : record.confidence >= 0.8
                              ? "border-app-warning/30 text-app-warning"
                              : "border-app-error/30 text-app-error"
                          }`}
                        >
                          {Math.round(record.confidence * 100)}% confianza
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Attendance;