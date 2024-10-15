import { Component, OnInit } from '@angular/core';
import { GoogleCalendarService } from '../../services/google-calendar.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  timeSlots: string[] = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
  showReservationModal: boolean = false;
  selectedTimeSlot: string = '';
  reservationData = {
    name: '',
    email: '',
    phone: ''
  };
  calendarDays: Date[] = [];

  constructor(private googleCalendarService: GoogleCalendarService) {
    this.generateDaysInMonth();
    this.updateCurrentMonthYear();
  }

  ngOnInit() {
    this.loadEvents();
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
      const prevMonthDay = new Date(this.currentYear, this.currentMonth, 1 - i);
      this.calendarDays.push(prevMonthDay);
    }

    // Añadir días del mes actual
    for (let d = firstDay; d <= lastDay; d.setDate(d.getDate() + 1)) {
      this.calendarDays.push(new Date(d));
    }

    // Añadir días del mes siguiente para completar la última semana
    const lastDayOfWeek = lastDay.getDay();
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
      const nextMonthDay = new Date(this.currentYear, this.currentMonth + 1, i);
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
    this.loadEvents();
  }

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.generateDaysInMonth();
    this.updateCurrentMonthYear();
    this.loadEvents();
  }

  getEventsForDay(day: Date) {
    return this.events.filter(event => {
      const eventDate = new Date(event.start);
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
    // Aquí podrías cargar las reservas específicas para este día
  }

  closeDayModal() {
    this.selectedDay = null;
  }

  isTimeSlotAvailable(timeSlot: string): boolean {
    // Implementa la lógica para verificar si el horario está disponible
    // Esto dependerá de cómo estés manejando las reservas en tu aplicación
    return true; // Por ahora, asumimos que todos los horarios están disponibles
  }

  reserveTimeSlot(timeSlot: string) {
    if (this.selectedDay) {
      const reservationDate = new Date(this.selectedDay);
      const [hours, minutes] = timeSlot.split(':');
      reservationDate.setHours(parseInt(hours), parseInt(minutes));

      // Aquí implementarías la lógica para crear la reserva
      this.googleCalendarService.createEvent({
        summary: 'Nueva Reserva',
        start: reservationDate,
        end: new Date(reservationDate.getTime() + 60*60*1000) // Asumimos reservas de 1 hora
      }).subscribe(() => {
        this.loadEvents(); // Recarga los eventos después de crear la reserva
        this.closeDayModal();
      });
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

  submitReservation() {
    // Aquí puedes implementar la lógica para enviar la reservación
    console.log('Reservación enviada:', this.reservationData);
    // Después de enviar la reservación, cierra el modal y reinicia los datos
    this.closeReservationModal();
  }

  resetReservationData() {
    this.reservationData = {
      name: '',
      email: '',
      phone: ''
    };
  }
}
