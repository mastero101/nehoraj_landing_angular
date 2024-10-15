import { Component, OnInit } from '@angular/core';
import { GoogleCalendarService } from '../../services/google-calendar.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
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
    this.daysInMonth = [];
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

    for (let d = firstDay; d <= lastDay; d.setDate(d.getDate() + 1)) {
      this.daysInMonth.push(new Date(d));
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
}
