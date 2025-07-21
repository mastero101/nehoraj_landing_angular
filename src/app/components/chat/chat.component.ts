import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OpenaiService } from '../../services/openai.service';

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Historial para OpenAI
type OpenAIMessage = { role: 'user' | 'assistant', content: string };

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent {
  @Input() isVisible: boolean = false;
  @Output() closeChat = new EventEmitter<void>();
  
  messages: ChatMessage[] = [];
  newMessage: string = '';
  isLoading: boolean = false;
  openaiHistory: OpenAIMessage[] = [];
  
  constructor(private openaiService: OpenaiService) {
    this.addWelcomeMessage();
  }

  close() {
    this.closeChat.emit();
  }

  async sendMessage() {
    if (this.newMessage.trim()) {
      this.addMessage(this.newMessage, true);
      this.openaiHistory.push({ role: 'user', content: this.newMessage });
      this.isLoading = true;
      const aiResponse = await this.getAIResponse();
      this.isLoading = false;
      this.addMessage(aiResponse, false);
      this.openaiHistory.push({ role: 'assistant', content: aiResponse });
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

  private async getAIResponse(): Promise<string> {
    return await this.openaiService.getResponse(this.openaiHistory);
  }

  private addWelcomeMessage() {
    const welcomeMessage = 'Bienvenido al servicio de atención al cliente de Grupo Nehoraj. ¿En qué puedo ayudarle hoy?';
    this.addMessage(welcomeMessage, false);
    this.openaiHistory.push({ role: 'assistant', content: welcomeMessage });
  }
}