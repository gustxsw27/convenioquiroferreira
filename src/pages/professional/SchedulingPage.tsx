import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Users, 
  MapPin, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  X,
  Check,
  AlertCircle,
  Repeat,
  Settings
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EditConsultationModal from '../../components/EditConsultationModal';
import RecurringConsultationModal from '../../components/RecurringConsultationModal';
import SlotCustomizationModal from '../../components/SlotCustomizationModal';

type SlotDuration = 15 | 30 | 60;

type Consultation = {
  id: number;
  date: string;
  client_name: string;
  service_name: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  value: number;
  notes?: string;
  is_dependent: boolean;
  patient_type: 'convenio' | 'private';
  location_name?: string;
};

type AttendanceLocation = {
  id: number;
  name: string;
  address: string;
  is_default: boolean;
};

const SchedulingPage: React.FC = () => {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [attendanceLocations, setAttendanceLocations] = useState<AttendanceLocation[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Slot customization state
  const [slotDuration, setSlotDuration] = useState<SlotDuration>(30);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [consultationToDelete, setConsultationToDelete] = useState<Consultation | null>(null);

  // Get API URL
  const getApiUrl = () => {
    if (
      window.location.hostname === "cartaoquiroferreira.com.br" ||
      window.location.hostname === "www.cartaoquiroferreira.com.br"
    ) {
      return "https://www.cartaoquiroferreira.com.br";
    }
    return "http://localhost:3001";
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();

      // Fetch consultations
      const consultationsResponse = await fetch(`${apiUrl}/api/consultations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (consultationsResponse.ok) {
        const consultationsData = await consultationsResponse.json();
        setConsultations(consultationsData);
      }

      // Fetch attendance locations
      const locationsResponse = await fetch(`${apiUrl}/api/attendance-locations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        setAttendanceLocations(locationsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Não foi possível carregar os dados da agenda');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate time slots based on selected duration
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 7; // 7:00 AM
    const endHour = 19; // 7:00 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    
    return slots;
  };

  // Get consultations for a specific date and time slot
  const getConsultationsForSlot = (date: Date, timeSlot: string) => {
    return consultations.filter(consultation => {
      const consultationDate = new Date(consultation.date);
      const consultationTime = format(consultationDate, 'HH:mm');
      
      // Check if consultation falls within this time slot
      const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
      const [consultationHour, consultationMinutes] = consultationTime.split(':').map(Number);
      
      const slotStartMinutes = slotHour * 60 + slotMinute;
      const slotEndMinutes = slotStartMinutes + slotDuration;
      const consultationMinutesTotal = consultationHour * 60 + consultationMinutes;
      
      return isSameDay(consultationDate, date) && 
             consultationMinutesTotal >= slotStartMinutes && 
             consultationMinutesTotal < slotEndMinutes;
    });
  };

  // Filter consultations based on selected filters
  const getFilteredConsultations = () => {
    let filtered = consultations;

    if (selectedLocation) {
      filtered = filtered.filter(c => 
        c.location_name === attendanceLocations.find(l => l.id.toString() === selectedLocation)?.name
      );
    }

    if (selectedStatus) {
      filtered = filtered.filter(c => c.status === selectedStatus);
    }

    return filtered;
  };

  // Navigation functions
  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setSelectedDate(direction === 'prev' ? subDays(selectedDate, 1) : addDays(selectedDate, 1));
    } else {
      setSelectedDate(direction === 'prev' ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1));
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Get week dates for week view
  const getWeekDates = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  // Modal handlers
  const openEditModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setIsEditModalOpen(true);
  };

  const openRecurringModal = () => {
    setIsRecurringModalOpen(true);
  };

  const openSlotModal = () => {
    setIsSlotModalOpen(true);
  };

  const confirmDelete = (consultation: Consultation) => {
    setConsultationToDelete(consultation);
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setConsultationToDelete(null);
    setShowDeleteConfirm(false);
  };

  const deleteConsultation = async () => {
    if (!consultationToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();

      const response = await fetch(`${apiUrl}/api/consultations/${consultationToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir consulta');
      }

      await fetchData();
      setSuccess('Consulta excluída com sucesso!');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao excluir consulta');
    } finally {
      setConsultationToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleSlotDurationChange = (duration: SlotDuration) => {
    setSlotDuration(duration);
    // Save preference to localStorage for persistence
    localStorage.setItem('schedulingSlotDuration', duration.toString());
  };

  // Load saved slot duration preference
  useEffect(() => {
    const savedDuration = localStorage.getItem('schedulingSlotDuration');
    if (savedDuration) {
      const duration = Number(savedDuration) as SlotDuration;
      if ([15, 30, 60].includes(duration)) {
        setSlotDuration(duration);
      }
    }
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { text: 'Agendado', className: 'bg-blue-100 text-blue-800' };
      case 'confirmed':
        return { text: 'Confirmado', className: 'bg-green-100 text-green-800' };
      case 'completed':
        return { text: 'Concluído', className: 'bg-gray-100 text-gray-800' };
      case 'cancelled':
        return { text: 'Cancelado', className: 'bg-red-100 text-red-800' };
      default:
        return { text: 'Desconhecido', className: 'bg-gray-100 text-gray-800' };
    }
  };

  const timeSlots = generateTimeSlots();
  const weekDates = getWeekDates();
  const filteredConsultations = getFilteredConsultations();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-600">Gerencie seus agendamentos e consultas</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Slot customization button */}
          <button
            onClick={openSlotModal}
            className="btn btn-outline flex items-center"
            title="Personalizar slots de tempo"
          >
            <Settings className="h-5 w-5 mr-2" />
            <Clock className="h-4 w-4 mr-1" />
            {slotDuration}min
          </button>

          <button
            onClick={openRecurringModal}
            className="btn btn-outline flex items-center"
          >
            <Repeat className="h-5 w-5 mr-2" />
            Consultas Recorrentes
          </button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Date Navigation */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="text-center min-w-[200px]">
                <h2 className="text-lg font-semibold text-gray-900">
                  {viewMode === 'day' 
                    ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : `${format(weekDates[0], 'dd MMM', { locale: ptBR })} - ${format(weekDates[6], 'dd MMM yyyy', { locale: ptBR })}`
                  }
                </h2>
                <p className="text-sm text-gray-600">
                  Slots de {slotDuration} minutos
                </p>
              </div>
              
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={goToToday}
              className="btn btn-secondary text-sm"
            >
              Hoje
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'day' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'week' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semana
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Local de Atendimento
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="input"
            >
              <option value="">Todos os locais</option>
              {attendanceLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input"
            >
              <option value="">Todos os status</option>
              <option value="scheduled">Agendado</option>
              <option value="confirmed">Confirmado</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedLocation('');
                setSelectedStatus('');
              }}
              className="btn btn-secondary w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6">
          {success}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando agenda...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {viewMode === 'day' ? (
              // Day View
              <div className="min-w-[600px]">
                <div className="grid grid-cols-[100px_1fr] border-b border-gray-200">
                  <div className="p-4 bg-gray-50 font-medium text-gray-700">
                    Horário
                  </div>
                  <div className="p-4 bg-gray-50 font-medium text-gray-700">
                    {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </div>
                </div>

                {timeSlots.map((timeSlot) => {
                  const slotConsultations = getConsultationsForSlot(selectedDate, timeSlot).filter(c => 
                    (!selectedLocation || c.location_name === attendanceLocations.find(l => l.id.toString() === selectedLocation)?.name) &&
                    (!selectedStatus || c.status === selectedStatus)
                  );

                  return (
                    <div key={timeSlot} className="grid grid-cols-[100px_1fr] border-b border-gray-100 min-h-[60px]">
                      <div className="p-3 bg-gray-50 text-sm text-gray-600 flex items-center">
                        {timeSlot}
                      </div>
                      <div className="p-3">
                        {slotConsultations.length > 0 ? (
                          <div className="space-y-2">
                            {slotConsultations.map((consultation) => (
                              <div
                                key={consultation.id}
                                className="bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center mb-1">
                                      {consultation.is_dependent ? (
                                        <Users className="h-4 w-4 text-blue-600 mr-2" />
                                      ) : consultation.patient_type === 'private' ? (
                                        <User className="h-4 w-4 text-purple-600 mr-2" />
                                      ) : (
                                        <User className="h-4 w-4 text-green-600 mr-2" />
                                      )}
                                      <span className="font-medium text-gray-900">
                                        {consultation.client_name}
                                      </span>
                                      {consultation.is_dependent && (
                                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                          Dependente
                                        </span>
                                      )}
                                      {consultation.patient_type === 'private' && (
                                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                                          Particular
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">{consultation.service_name}</p>
                                    <div className="flex items-center mt-1 space-x-3">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusInfo(consultation.status).className}`}>
                                        {getStatusInfo(consultation.status).text}
                                      </span>
                                      <span className="text-sm text-gray-600">
                                        {formatCurrency(consultation.value)}
                                      </span>
                                      {consultation.location_name && (
                                        <span className="text-xs text-gray-500 flex items-center">
                                          <MapPin className="h-3 w-3 mr-1" />
                                          {consultation.location_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-1 ml-3">
                                    <button
                                      onClick={() => openEditModal(consultation)}
                                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                      title="Editar"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => confirmDelete(consultation)}
                                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                                      title="Excluir"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm italic">
                            Horário livre
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Week View
              <div className="min-w-[800px]">
                {/* Week header */}
                <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-gray-200">
                  <div className="p-4 bg-gray-50 font-medium text-gray-700">
                    Horário
                  </div>
                  {weekDates.map((date) => (
                    <div key={date.toISOString()} className="p-4 bg-gray-50 text-center">
                      <div className="font-medium text-gray-700">
                        {format(date, 'EEE', { locale: ptBR })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {format(date, 'dd/MM')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Week grid */}
                {timeSlots.map((timeSlot) => (
                  <div key={timeSlot} className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-gray-100 min-h-[60px]">
                    <div className="p-3 bg-gray-50 text-sm text-gray-600 flex items-center">
                      {timeSlot}
                    </div>
                    {weekDates.map((date) => {
                      const slotConsultations = getConsultationsForSlot(date, timeSlot).filter(c => 
                        (!selectedLocation || c.location_name === attendanceLocations.find(l => l.id.toString() === selectedLocation)?.name) &&
                        (!selectedStatus || c.status === selectedStatus)
                      );

                      return (
                        <div key={`${date.toISOString()}-${timeSlot}`} className="p-2 border-r border-gray-100">
                          {slotConsultations.length > 0 ? (
                            <div className="space-y-1">
                              {slotConsultations.map((consultation) => (
                                <div
                                  key={consultation.id}
                                  className="bg-blue-50 border border-blue-200 rounded p-2 text-xs hover:bg-blue-100 transition-colors cursor-pointer"
                                  onClick={() => openEditModal(consultation)}
                                >
                                  <div className="flex items-center mb-1">
                                    {consultation.is_dependent ? (
                                      <Users className="h-3 w-3 text-blue-600 mr-1" />
                                    ) : consultation.patient_type === 'private' ? (
                                      <User className="h-3 w-3 text-purple-600 mr-1" />
                                    ) : (
                                      <User className="h-3 w-3 text-green-600 mr-1" />
                                    )}
                                    <span className="font-medium text-gray-900 truncate">
                                      {consultation.client_name}
                                    </span>
                                  </div>
                                  <p className="text-gray-600 truncate">{consultation.service_name}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className={`px-1 py-0.5 rounded text-xs font-medium ${getStatusInfo(consultation.status).className}`}>
                                      {getStatusInfo(consultation.status).text}
                                    </span>
                                    <span className="text-gray-600 font-medium">
                                      {formatCurrency(consultation.value)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredConsultations.filter(c => c.status === 'scheduled').length}
            </div>
            <div className="text-sm text-gray-600">Agendadas</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredConsultations.filter(c => c.status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-600">Confirmadas</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {filteredConsultations.filter(c => c.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Concluídas</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(filteredConsultations.reduce((sum, c) => sum + c.value, 0))}
            </div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditConsultationModal
        isOpen={isEditModalOpen}
        consultation={selectedConsultation}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedConsultation(null);
        }}
        onSuccess={() => {
          fetchData();
          setSuccess('Consulta atualizada com sucesso!');
        }}
      />

      <RecurringConsultationModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onSuccess={() => {
          fetchData();
          setSuccess('Consultas recorrentes criadas com sucesso!');
        }}
      />

      <SlotCustomizationModal
        isOpen={isSlotModalOpen}
        currentSlotDuration={slotDuration}
        onClose={() => setIsSlotModalOpen(false)}
        onSlotDurationChange={handleSlotDurationChange}
      />

      {/* Delete confirmation modal */}
      {showDeleteConfirm && consultationToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
              Confirmar Exclusão
            </h2>
            
            <p className="mb-6">
              Tem certeza que deseja excluir a consulta de{' '}
              <strong>{consultationToDelete.client_name}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="btn btn-secondary flex items-center"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </button>
              <button
                onClick={deleteConsultation}
                className="btn bg-red-600 text-white hover:bg-red-700 flex items-center"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulingPage;