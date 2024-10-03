import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div *ngIf="isVisible" class="fixed z-50 bg-white shadow-lg rounded-lg overflow-hidden
            bottom-24 right-4 w-11/12 max-w-sm
            sm:bottom-28 sm:right-6
            md:bottom-20 md:right-8
            lg:bottom-24 lg:right-10 lg:max-w-md">
  <!-- Contenido del chat -->
  <div class="chat-header bg-blue-500 text-white p-3 flex justify-between items-center">
    <span>Chat</span>
    <button (click)="close()" class="focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
  <div class="chat-body p-4 h-64 overflow-y-auto">
    <!-- Mensajes del chat -->
  </div>
    <div class="chat-footer p-3 border-t">
      <input type="text" placeholder="Escribe un mensaje..." class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300">
    </div>
  </div>
  `,
  styles: [`
    .chat-container {
      z-index: 1000;
    }
  `]
})
export class ChatComponent {
  @Input() isVisible: boolean = false;
  @Output() closeChat = new EventEmitter<void>();

  messages: string[] = [];
  newMessage: string = '';

  close() {
    this.closeChat.emit();
  }

  sendMessage() {
    if (this.newMessage.trim()) {
      this.messages.push(this.newMessage);
      this.newMessage = '';
    }
  }
}