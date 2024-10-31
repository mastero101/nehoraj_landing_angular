import { Component, OnInit } from '@angular/core';
import { GoogleCalendarService } from '../../services/google-calendar.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent implements OnInit {
  events: any[] = [];
  weekDays: string[] = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  daysInMonth: Date[] = [];
  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();
  currentMonthYear: string = '';
  selectedDay: Date | null = null;
  timeSlots: string[] = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
  ];
  showReservationModal: boolean = false;
  selectedTimeSlot: string = '';
  reservationData = {
    name: '',
    email: '',
    phone: ''
  };
  calendarDays: CalendarDay[] = [];

  constructor(
    private googleCalendarService: GoogleCalendarService,
    private notificationService: NotificationService
  ) {
    this.generateDaysInMonth();
    this.updateCurrentMonthYear();
    this.initializeTimeSlots();
  }

  ngOnInit() {
    this.loadEvents();
    this.loadReservations();
    this.initializeTimeSlots();
  }

  loadEvents() {
    this.googleCalendarService.getEvents().subscribe((events) => {
      this.events = events;
    });
  }

  generateDaysInMonth() {
    this.calendarDays = [];
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

    // Añadir días del mes anterior para completar la primera semana
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek; i > 0; i--) {
      const prevMonthDay = new Date(this.currentYear, this.currentMonth, 1 - i) as CalendarDay;
      this.calendarDays.push(prevMonthDay);
    }

    // Añadir días del mes actual
    for (let d = firstDay; d <= lastDay; d.setDate(d.getDate() + 1)) {
      this.calendarDays.push(new Date(d) as CalendarDay);
    }

    // Añadir días del mes siguiente para completar la última semana
    const lastDayOfWeek = lastDay.getDay();
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
      const nextMonthDay = new Date(this.currentYear, this.currentMonth + 1, i) as CalendarDay;
      this.calendarDays.push(nextMonthDay);
    }
  }

  updateCurrentMonthYear() {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.currentMonthYear = `${monthNames[this.currentMonth]} ${this.currentYear}`;
  }

  previousMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.generateDaysInMonth();
    this.updateCurrentMonthYear();
    this.initializeTimeSlots();
  }

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.generateDaysInMonth();
    this.updateCurrentMonthYear();
    this.initializeTimeSlots();
  }

  getEventsForDay(day: Date) {
    return this.events.filter(event => {
      const eventDate = new Date(event.date); // Asegúrate de que estás usando el campo correcto
      return eventDate.toDateString() === day.toDateString();
    });
  }

  reserveSpace(event: any) {
    this.googleCalendarService.createEvent(event).subscribe(() => {
      this.loadEvents();
    });
  }

  isToday(day: Date): boolean {
    const today = new Date();
    return day.getDate() === today.getDate() &&
           day.getMonth() === today.getMonth() &&
           day.getFullYear() === today.getFullYear();
  }

  isCurrentMonth(day: Date): boolean {
    return day.getMonth() === this.currentMonth;
  }

  hasAvailableSpace(day: Date): boolean {
    // Aquí puedes implementar la lógica para verificar si hay espacio disponible
    // Por ahora, retornamos true para todos los días como ejemplo
    return true;
  }

  openDayModal(day: Date) {
    this.selectedDay = day;
    this.initializeTimeSlots();
  }

  closeDayModal() {
    this.selectedDay = null;
    this.selectedTimeSlot = '';
    this.initializeTimeSlots();
  }

  isTimeSlotAvailable(timeSlot: string): boolean {
    if (!this.selectedDay) return true; // Si no hay un día seleccionado, consideramos que el horario está disponible

    const reservationDate = new Date(this.selectedDay);
    const [hours, minutes] = timeSlot.split(':');
    reservationDate.setHours(parseInt(hours), parseInt(minutes));

    // Verificar si el horario está ocupado
    const isAvailable = !this.events.some(event => {
        const eventStart = new Date(event.date);
        const eventTimeSlot = new Date(eventStart);
        eventTimeSlot.setHours(parseInt(event.timeSlot.split(':')[0]), parseInt(event.timeSlot.split(':')[1]));

        return eventTimeSlot.getTime() === reservationDate.getTime();
    });

    return isAvailable;
  }

  reserveTimeSlot(timeSlot: string) {
    if (this.selectedDay) {
      const reservationDate = new Date(this.selectedDay);
      const [hours, minutes] = timeSlot.split(':');
      reservationDate.setHours(parseInt(hours), parseInt(minutes));

      // Crear la nueva reserva
      const newReservation = {
        date: reservationDate.toISOString(), // Asegúrate de que el formato sea correcto
        timeSlot: timeSlot,
        name: this.reservationData.name,
        email: this.reservationData.email,
        phone: this.reservationData.phone
      };

      // Guardar la nueva reserva en localStorage
      const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
      reservations.push(newReservation);
      localStorage.setItem('reservations', JSON.stringify(reservations));

      // Actualizar el estado de eventos y la vista
      this.events.push(newReservation); // Agregar la nueva reserva a los eventos
      this.updateCalendarDays(); // Actualizar el estado de los días en el calendario
      this.closeDayModal(); // Cierra el modal
    }
  }

  formatDateToSpanish(date: Date): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
  }

  openReservationModal(timeSlot: string) {
    this.selectedTimeSlot = timeSlot;
    this.showReservationModal = true;
  }

  closeReservationModal() {
    this.showReservationModal = false;
    this.resetReservationData();
  }

  async submitReservation() {
    if (!this.selectedDay || !this.reservationData.phone) {
      console.error('Faltan datos necesarios');
      return;
    }

    try {
      // Crear el mensaje de confirmación
      const message = `¡Hola ${this.reservationData.name}! 
        Tu reserva ha sido confirmada:
        📅 Fecha: ${this.formatDateToSpanish(this.selectedDay)}
        ⏰ Hora: ${this.selectedTimeSlot}

        Gracias por tu reserva. Si necesitas hacer cambios, por favor contáctanos.`;

      // Formatear el número de teléfono (asegurarse que incluya código de país)
      const formattedPhone = this.formatPhoneNumber(this.reservationData.phone);

      // Enviar WhatsApp
      await this.notificationService.sendWhatsAppMeta(
        formattedPhone,
        message
      );

      // Enviar SMS
      await this.notificationService.sendWhatsAppTwilio(
        formattedPhone,
        message
      );

      // Guardar la reservación
      const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
      reservations.push({
        date: this.selectedDay,
        timeSlot: this.selectedTimeSlot,
        name: this.reservationData.name,
        email: this.reservationData.email,
        phone: this.reservationData.phone
      });
      localStorage.setItem('reservations', JSON.stringify(reservations));

      // Actualizar la vista
      this.events = reservations;
      this.updateCalendarDays();
      
      // Cerrar el modal y mostrar mensaje de éxito
      this.closeReservationModal();
      alert('¡Reserva confirmada! Se ha enviado un mensaje de confirmación.');
    } catch (error) {
      console.error('Error al procesar la reserva:', error);
      alert('Hubo un error al procesar la reserva. Por favor, intenta nuevamente.');
    }
  }

  // Función auxiliar para formatear números de teléfono
  private formatPhoneNumber(phone: string): string {
    // Eliminar espacios y caracteres especiales
    let cleaned = phone.replace(/\D/g, '');
    
    // Agregar código de país si no lo tiene
    if (!cleaned.startsWith('52')) { // Para México, ajusta según tu país
      cleaned = '52' + cleaned;
    }
    
    // Asegurarse que empiece con +
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  resetReservationData() {
    this.reservationData = {
      name: '',
      email: '',
      phone: ''
    };
  }

  // Método para cargar reservas desde localStorage al iniciar
  loadReservations() {
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    console.log('Reservas cargadas:', reservations); // Verifica que las reservas se carguen correctamente
    this.events = reservations;
    this.updateCalendarDays();
  }

  updateCalendarDays() {
    this.calendarDays.forEach((day: CalendarDay) => {
        const dayReservations = this.getEventsForDay(day);
        day.isOccupied = dayReservations.length > 0; // Marcar el día como ocupado si tiene reservas
    });
  }

  private initializeTimeSlots() {
    this.timeSlots = [
      '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
      '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
    ];
  }
}

// Definir un tipo que extienda Date para incluir isOccupied
interface CalendarDay extends Date {
    isOccupied?: boolean; // Propiedad opcional
}
