import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { ChatComponent } from '../chat/chat.component';
import { MisionVisionComponent } from '../mision-vision/mision-vision.component';
import { SocialResponsComponent } from '../social-respons/social-respons.component';
import { CalendarComponent } from '../calendar/calendar.component';

@Component({
  selector: 'app-nehoraj',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChatComponent,
    MisionVisionComponent,
    SocialResponsComponent,
    CalendarComponent
  ],
  templateUrl: './nehoraj.component.html',
  styleUrl: './nehoraj.component.scss'
})

export class NehorajComponent implements OnInit {

  testimonials = [
    {
      quote: "Nehoras ha sido un socio invaluable en el crecimiento de mi negocio. Su guía y apoyo han sido fundamentales para mi éxito.",
      name: "Juan Velazquez",
      position: "Fundador",
      company: "Carnes & Cortes Co",
      avatar: "/assets/images/juan-velazquez.jpg"
    },
    {
      quote: "Gracias a Nehoras, pude asegurar la financiación que necesitaba para llevar mi negocio al siguiente nivel.",
      name: "Carlos Martinez",
      position: "Fundador",
      company: "Multiservicios Martinez",
      avatar: "/assets/images/carlos-martinez.jpg"
    },
    {
      quote: "El mentoría y coaching que he recibido de Nehoras ha sido transformador para mi negocio.",
      name: "Sarah Perez",
      position: "Propietaria",
      company: "Accesorios Sar",
      avatar: "/assets/images/sarah-perez.jpg"
    },
    {
      quote: "No podría haber pedido un mejor socio que Nehoras. Su experiencia y apoyo han sido invaluables.",
      name: "Marcos Gomez",
      position: "Propietario",
      company: "IT Soluciones Peninsula",
      avatar: "/assets/images/marcos-gomez.jpg"
    }
  ];

  plans = [
    {
      title: 'Basica',
      description: 'Ideal para freelancers y equipos pequeños',
      price: '$1500',
      priceInterval: 'por mes',
      features: [
        { text: 'Sala de juntas', icon: 'fas fa-users' },
        { text: 'Oficina compartida', icon: null },
        { text: 'Domicilio fiscal', icon: null },
        { text: 'Luz, agua, internet alta velocidad', icon: null },
        { text: 'Café', icon: null },
        { text: 'Networking', icon: null },
        { text: 'Zona de meditación/descanso', icon: null }
      ]
    },
    {
      title: 'Plata',
      description: 'Perfecto para equipos en crecimiento',
      price: '$2000',
      priceInterval: 'por mes',
      features: [
        { text: 'Sala de juntas', icon: null },
        { text: 'Oficina compartida', icon: null },
        { text: 'Domicilio fiscal', icon: null },
        { text: 'Luz, agua, internet alta velocidad', icon: null },
        { text: 'Café', icon: null },
        { text: 'Secretaria', icon: null },
        { text: '20 hrs al mes de oficina privada', icon: null },
        { text: 'Zona de meditación/descanso', icon: null },
        { text: 'Networking', icon: null }
      ]
    },
    {
      title: 'Oro',
      description: 'Para negocios establecidos',
      price: '$2500',
      priceInterval: 'por mes',
      features: [
        { text: 'Sala de juntas', icon: null },
        { text: 'Oficina compartida', icon: null },
        { text: 'Domicilio fiscal', icon: null },
        { text: 'Luz, agua, internet alta velocidad', icon: null },
        { text: 'Café', icon: null },
        { text: 'Secretaria', icon: null },
        { text: '40 hrs al mes de oficina privada', icon: null },
        { text: 'Cursos, asesorías, invitación a eventos y reuniones con empresarios', icon: null },
        { text: 'Networking', icon: null },
        { text: 'Vinculación a créditos y fondos de inversión (privado y público)', icon: null }
      ]
    },
    {
      title: 'Visita',
      description: 'Para quien desea probar nuestros servicios',
      price: '$100',
      priceInterval: 'por día',
      features: [
        { text: '2 hrs de oficina privada', icon: null },
        { text: 'Zona de meditación/descanso', icon: null },
        { text: 'Luz, agua, internet alta velocidad', icon: null },
        { text: 'Café', icon: null },
        { text: 'Networking', icon: null }
      ]
    }
  ];

  menuOpen = false;
  currentIndex = 0;
  isChatVisible: boolean = false;
  isModalOpen = false;
  isModalOpen2 = false;
  isModalOpen3 = false;

  showNewLocation = false;

  constructor() {}

  ngOnInit() {
    
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleChat() {
    this.isChatVisible = !this.isChatVisible;
  }

  toggleModal() {
    this.isModalOpen = !this.isModalOpen;
  }

  toggleModal2() {
    this.isModalOpen2 = !this.isModalOpen2;
    this.isModalOpen = false;
  }

  toggleModal3() {
    this.isModalOpen3 = !this.isModalOpen3;
  }

  toggleNewLocation() {
    this.showNewLocation = !this.showNewLocation;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (this.isModalOpen === false) {
      this.isModalOpen = true;
    }
  }

  scrollToTop2(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (this.isModalOpen2 === false) {
      this.isModalOpen2 = true;
    }
  }

  moveCarousel(direction: number) {
    const items = document.querySelectorAll('.carousel-item');
    items[this.currentIndex].classList.remove('active');
    
    this.currentIndex = (this.currentIndex + direction + items.length) % items.length;
    
    items[this.currentIndex].classList.add('active');
  
    const carouselInner = document.querySelector('.carousel-inner') as HTMLElement;
    carouselInner.style.transform = `translateX(-${this.currentIndex * 100}%)`;
  }  

  nombre: string = '';
  email: string = '';
  mensaje: string = '';

  sendWhatsAppMessage() {
    const phoneNumber = '525637955283'; // Reemplaza con tu número de WhatsApp
    const whatsappMessage = `Hola, mi nombre es ${this.nombre}. Mi correo electrónico es ${this.email}. ${this.mensaje}`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;

    window.open(whatsappUrl, '_blank');
  }
}
