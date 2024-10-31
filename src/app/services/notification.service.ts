import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // WhatsApp Cloud API (Meta)
  async sendWhatsAppMeta(phone: string, message: string) {
    try {
      const response = await axios({
        method: 'post',
        url: `https://graph.facebook.com/v17.0/${environment.meta.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${environment.meta.accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: message }
        }
      });
      
      console.log('Mensaje enviado:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      throw error;
    }
  }

  // Twilio WhatsApp
  async sendWhatsAppTwilio(phone: string, message: string) {
    try {
      const response = await axios({
        method: 'post',
        url: `https://api.twilio.com/2010-04-01/Accounts/${environment.twilio.accountSid}/Messages.json`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
          username: environment.twilio.accountSid,
          password: environment.twilio.authToken
        },
        data: new URLSearchParams({
          To: `whatsapp:${phone}`,
          From: `whatsapp:${environment.twilio.whatsappNumber}`,
          Body: message
        })
      });

      console.log('Mensaje enviado:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      throw error;
    }
  }
}
