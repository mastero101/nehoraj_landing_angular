import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

@Component({
  selector: 'app-social-respons',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './social-respons.component.html',
  styleUrl: './social-respons.component.scss'
})
export class SocialResponsComponent {
  campanias = [
    {
      id: 1,
      titulo: 'Campaña de Siembra de Árboles Carmen, Campeche',
      descripcion: 'Fomentamos la plantación de árboles para mejorar el medio ambiente y la calidad de vida en Carmen, Campeche.',
      imagenes: [
        '../../../assets/social/sembrando_arboles.jpg',
        '../../../assets/social/sembrando_arboles2.jpg',
      ]
    }
  ];

  currentIndex: { [key: number]: number } = {};
  isModalOpen: boolean = false;
  modalImage: string | null = null;

  constructor() {
    this.campanias.forEach(campania => {
      this.currentIndex[campania.id] = 0;
    });
  }

  
  openModal(image: string) {
    this.isModalOpen = true;
    this.modalImage = image;
  }
  
  closeModal() {
    this.isModalOpen = false;
    this.modalImage = null;
  }

  prevSlide(campaniaId: number) {
    const totalImages = this.campanias.find(c => c.id === campaniaId)?.imagenes.length || 0;
    this.currentIndex[campaniaId] = (this.currentIndex[campaniaId] - 1 + totalImages) % totalImages;
  }

  nextSlide(campaniaId: number) {
    const totalImages = this.campanias.find(c => c.id === campaniaId)?.imagenes.length || 0;
    this.currentIndex[campaniaId] = (this.currentIndex[campaniaId] + 1) % totalImages;
  }
}