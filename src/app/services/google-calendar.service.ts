import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GoogleCalendarService {
  private mockEvents = [
    { title: 'Reunión de equipo', start: new Date('2023-10-01T10:00:00') },
    { title: 'Cita con cliente', start: new Date('2023-10-02T14:00:00') },
    { title: 'Taller de desarrollo', start: new Date('2023-10-03T09:00:00') },
  ];

  getEvents(): Observable<any[]> {
    return of(this.mockEvents); // Simular la respuesta de la API
  }

  createEvent(event: any): Observable<any> {
    this.mockEvents.push(event); // Agregar el evento simulado
    return of(null); // Simular una respuesta exitosa
  }
}

