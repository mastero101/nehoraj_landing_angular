import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-nehoraj',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule 
  ],
  templateUrl: './nehoraj.component.html',
  styleUrl: './nehoraj.component.scss'
})

export class NehorajComponent implements OnInit {
  plans = [
    {
      title: 'Basica',
      description: 'Ideal para freelancers y equipos pequeños',
      price: '$1500',
      features: [
        { text: 'Sala de juntas', icon: null },
        { text: 'Oficina compartida', icon: null },
        { text: 'Domicilio fiscal', icon: null },
        { text: 'Luz, agua, internet', icon: null },
        { text: 'Café', icon: null },
        { text: 'Networking', icon: null },
        { text: 'Zona de meditación/descanso', icon: null }
      ]
    },
    {
      title: 'Plata',
      description: 'Perfecto para equipos en crecimiento',
      price: '$2000',
      features: [
        { text: 'Sala de juntas', icon: null },
        { text: 'Oficina compartida', icon: null },
        { text: 'Domicilio fiscal', icon: null },
        { text: 'Luz, agua, internet', icon: null },
        { text: 'Café', icon: null },
        { text: 'Secretaria', icon: null },
        { text: '10 hrs al mes de oficina privada', icon: null },
        { text: 'Zona de meditación/descanso', icon: null },
        { text: 'Networking', icon: null }
      ]
    },
    {
      title: 'Oro',
      description: 'Para negocios establecidos',
      price: '$2500',
      features: [
        { text: 'Sala de juntas', icon: null },
        { text: 'Oficina compartida', icon: null },
        { text: 'Domicilio fiscal', icon: null },
        { text: 'Luz, agua, internet', icon: null },
        { text: 'Café', icon: null },
        { text: 'Secretaria', icon: null },
        { text: '20 hrs al mes de oficina privada', icon: null },
        { text: 'Cursos, asesorías, invitación a eventos y reuniones con empresarios', icon: null },
        { text: 'Networking', icon: null },
        { text: 'Vinculación a créditos y fondos de inversión (privado y público)', icon: null }
      ]
    }
  ];

  menuOpen = false;

  constructor() {}

  ngOnInit() {
    
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  nombre: string = '';
  email: string = '';
  mensaje: string = '';

  sendWhatsAppMessage() {
    const phoneNumber = '529811402316'; // Reemplaza con tu número de WhatsApp
    const whatsappMessage = `Hola, mi nombre es ${this.nombre}. Mi correo electrónico es ${this.email}. ${this.mensaje}`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;

    window.open(whatsappUrl, '_blank');
  }
}
