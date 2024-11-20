# NehorajLanding

## Descripción
Nehoraj es una plataforma web desarrollada en Angular 17 que ofrece servicios empresariales, incluyendo espacios de coworking, asesoría tecnológica, y soluciones digitales para emprendedores y pequeñas empresas.

## Requisitos Previos
- Node.js (versión 18.x o superior)
- npm (versión 9.x o superior)
- Angular CLI (versión 17.x)

## Instalación

1. Clona el repositorio

git clone https://github.com/mastero101/nehoraj_landing_angular

cd nehoraj

2. Instala las dependencias

npm install


3. Configura las variables de entorno
- Crea un archivo `src/environments/environment.ts` con la siguiente estructura:

typescript
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


## Ejecución del Proyecto

### Desarrollo
Para ejecutar el proyecto en modo desarrollo:

ng serve

Navega a `http://localhost:4200/`. La aplicación se recargará automáticamente si cambias alguno de los archivos fuente.

### Producción
Para construir el proyecto para producción:

ng build

Los archivos de construcción se almacenarán en el directorio `dist/`.

## Estructura del Proyecto


## Características Principales
- Diseño responsive
- Integración con IA para chat
- Sistema de reservas
- Formulario de contacto
- Galería de servicios y soluciones
- Sección de equipo y aliados

## Tecnologías Utilizadas
- Angular 17
- TypeScript
- TailwindCSS
- OpenAI API
- Meta API
- Twilio

## Contribución
Si deseas contribuir al proyecto:
1. Haz un Fork del repositorio
2. Crea una rama para tu característica (`git checkout -b feature/AmazingFeature`)
3. Haz commit de tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia
Este proyecto está bajo la licencia [MIT](https://choosealicense.com/licenses/mit/)

## Contacto
- Email - contacto@nehoraj.com
- Link del Proyecto: [https://github.com/mastero101/nehoraj_landing_angular](https://github.com/mastero101/nehoraj_landing_angular)

## Further help

Para obtener más ayuda sobre Angular CLI, usa `ng help` o consulta la página [Angular CLI Overview and Command Reference](https://angular.io/cli).