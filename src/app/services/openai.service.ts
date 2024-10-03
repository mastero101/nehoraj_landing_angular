import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OpenaiService {
  private apiUrl = 'https://api.openai.com/v1/chat/completions';
  private apiKey = environment.openaiApiKey;

  constructor() { }

  async getResponse(message: string, maxTokens: number = 500): Promise<string> {
    const response = await axios.post(this.apiUrl, {
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a customer service agent for Grupo Nehoraj. Always start with a greeting. Grupo Nehoraj offers services such as business consulting, technological solutions, IT support, and custom software development. Provide information about these services and include contact details for further assistance.' 
        },
        { 
          role: 'assistant', 
          content: 'Hola, soy su representante de atención al cliente de Grupo Nehoraj. Ofrecemos una variedad de servicios que incluyen consultoría empresarial, soluciones tecnológicas, soporte técnico y desarrollo de software a medida. Para contactar a un especialista, puede llamarnos al 56 3795 5283 o enviar un correo a contacto@nehoraj.com. ¿En qué puedo ayudarle hoy?' 
        },
        { 
          role: 'user', 
          content: message 
        }
      ],
      max_tokens: maxTokens
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.choices[0].message.content;
  }


}

