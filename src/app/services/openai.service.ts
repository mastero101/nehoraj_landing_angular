import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class OpenaiService {
  private apiUrl = '/api/chat';

  constructor() { }

  async getResponse(messages: {role: string, content: string}[], maxTokens: number = 500): Promise<string> {
    const response = await axios.post(this.apiUrl, { messages, maxTokens });
    return response.data.content;
  }

}
