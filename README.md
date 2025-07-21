# Nehoraj Landing

![Angular](https://img.shields.io/badge/Angular-17-red?logo=angular)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-blue?logo=tailwindcss)
![OpenAI](https://img.shields.io/badge/OpenAI-API-green?logo=openai)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## 🚀 Nehoraj Landing

**Nehoraj** es una plataforma web desarrollada en Angular 17 que ofrece servicios empresariales, soluciones tecnológicas y herramientas digitales para emprendedores y pequeñas empresas.

---

## Tabla de Contenido
- [Características](#características)
- [Demo](#demo)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Contribuir](#contribuir)
- [Contacto](#contacto)
- [Licencia](#licencia)

---

## Características
- 🎨 **Diseño responsive y moderno**
- 🤖 **Chat con IA (OpenAI)**
- 📅 **Sistema de reservas**
- 📬 **Formulario de contacto**
- 🛠️ **Galería de servicios y soluciones**
- 👥 **Sección de equipo y aliados**
- 🔒 **Integración con APIs externas (Meta, Twilio, OpenAI)**

---

## Demo

> [🔗 Ver Demo en Producción](https://nehoraj.com)

---

## Requisitos Previos
- [Node.js](https://nodejs.org/) (v18.x o superior)
- [npm](https://www.npmjs.com/) (v9.x o superior)
- [Angular CLI](https://angular.io/cli) (v17.x)

---

## Instalación

```bash
git clone https://github.com/mastero101/nehoraj_landing_angular.git
cd nehoraj_landing_angular
npm install
```

---

## Configuración

Crea el archivo `src/environments/environment.ts` con el siguiente contenido:

```typescript
export const environment = {
  production: false,
  openaiApiKey: 'tu_api_key',
  meta: {
    phoneNumberId: 'tu_phone_number_id',
    accessToken: 'tu_access_token'
  },
  twilio: {
    accountSid: 'tu_account_sid',
    authToken: 'tu_auth_token',
    whatsappNumber: 'tu_whatsapp_number'
  }
};
```

---

## Ejecución

### Desarrollo
```bash
ng serve
```
Visita [http://localhost:4200/](http://localhost:4200/) en tu navegador.

### Producción
```bash
ng build
```
Los archivos de construcción estarán en el directorio `dist/`.

---

## Estructura del Proyecto

```
├── src/
│   ├── app/
│   │   ├── components/
│   │   ├── services/
│   │   └── ...
│   ├── assets/
│   ├── environments/
│   └── ...
├── angular.json
├── package.json
└── ...
```

---

## Tecnologías Utilizadas
- **Angular 17**
- **TypeScript**
- **TailwindCSS**
- **OpenAI API**
- **Meta API**
- **Twilio**


## Contacto
- 📧 Email: contacto@nehoraj.com
- 🌐 [Repositorio en GitHub](https://github.com/mastero101/nehoraj_landing_angular)

---

## Licencia

