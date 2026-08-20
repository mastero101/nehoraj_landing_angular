import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { BlogService } from '../services/blog.service';

// Red de seguridad para el token: la comprobación al abrir el panel evita el
// caso habitual, pero una sesión puede morir mientras el redactor escribe (el
// token caduca, un admin elimina la cuenta). Sin esto el fallo aparecía como un
// error suelto en una llamada y el panel seguía aparentando estar autenticado.
//
// Solo actuamos ante 401 (credencial no válida). Un 403 significa "tu rol no
// alcanza para esto", que no se arregla volviendo a iniciar sesión, así que ese
// caso se deja pasar tal cual para que lo muestre la pantalla correspondiente.
export const authExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const blogService = inject(BlogService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isApiCall = req.url.startsWith('/api');
      // El propio login devuelve 400/401 con credenciales incorrectas; ahí no
      // hay sesión que cerrar y el formulario ya muestra su mensaje.
      const isLoginAttempt = req.url.includes('/auth/login');

      if (error.status === 401 && isApiCall && !isLoginAttempt) {
        blogService.forceLogout(
          error.error?.error || 'Tu sesión expiró. Inicia sesión de nuevo para continuar.'
        );
      }

      return throwError(() => error);
    })
  );
};
