import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

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
    <div class="chat-header bg-blue-500 text-white p-3 flex justify-between items-center">
      <span>Chat</span>
      <button (click)="close()" class="focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <div class="chat-body p-4 h-96 overflow-y-auto bg-gray-100">
      <div *ngFor="let message of messages" class="mb-4">
        <div [ngClass]="{'flex justify-end': message.isUser, 'flex justify-start': !message.isUser}">
          <div [ngClass]="{
            'bg-blue-500 text-white rounded-lg py-2 px-4 max-w-[70%] shadow-md': message.isUser,
            'bg-white text-gray-800 rounded-lg py-2 px-4 max-w-[70%] shadow-md': !message.isUser
          }">
            {{ message.text }}
          </div>
        </div>
        <div [ngClass]="{'text-right': message.isUser, 'text-left': !message.isUser}" class="text-xs text-gray-500 mt-1">
          {{ message.timestamp | date:'short' }}
        </div>
      </div>
    </div>
    <div class="chat-footer p-3 border-t bg-white">
      <form (ngSubmit)="sendMessage()" class="flex">
        <input [(ngModel)]="newMessage" name="newMessage" type="text" placeholder="Escribe un mensaje..." 
                class="flex-grow p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-300">
        <button type="submit" class="bg-blue-500 text-white p-2 rounded-r hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300">
          Enviar
        </button>
      </form>
    </div>
  </div>
`,
styles: [`
  .chat-body {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  }
  .chat-body::-webkit-scrollbar {
    width: 6px;
  }
  .chat-body::-webkit-scrollbar-track {
    background: transparent;
  }
  .chat-body::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 20px;
    border: transparent;
  }
`]
})
export class ChatComponent {
  @Input() isVisible: boolean = false;
  @Output() closeChat = new EventEmitter<void>();

  messages: ChatMessage[] = [];
  newMessage: string = '';

  close() {
    this.closeChat.emit();
  }

  sendMessage() {
    if (this.newMessage.trim()) {
      this.addMessage(this.newMessage, true);
      this.simulateResponse();
      this.newMessage = '';
    }
  }

  private addMessage(text: string, isUser: boolean) {
    this.messages.push({
      text,
      isUser,
      timestamp: new Date()
    });
  }

  private simulateResponse() {
    setTimeout(() => {
      this.addMessage('Hola, Bienvenido a Grupo Nehoraj. ¿En qué puedo ayudarte?', false);
    }, 1000);
  }
}