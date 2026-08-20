import { Router, Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { put, del } from '@vercel/blob';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import ws from 'ws';

const router = Router();

const supabaseUrl = process.env['SUPABASE_URL'] || '';
// La autorización real la hace authenticateToken con nuestro propio JWT, así que
// el backend debe hablar con Supabase usando una clave secreta (service_role /
// sb_secret_...) que ignora RLS. Con la clave pública (anon / sb_publishable_...)
// las políticas de RLS son las que mandan, y para que el backend pudiera borrar
// había que abrir el borrado a todo el mundo — que es justo lo que se estaba
// llevando por delante los comentarios. Se mantiene SUPABASE_KEY como respaldo
// para no romper despliegues que aún no tengan la variable nueva.
const supabaseKey = process.env['SUPABASE_SECRET_KEY']
  || process.env['SUPABASE_SERVICE_ROLE_KEY']
  || process.env['SUPABASE_KEY']
  || '';
const jwtSecret = process.env['JWT_SECRET'] || 'nehoraj-super-secret-key-2026';
const openaiApiKey = process.env['openaiApiKey'] || process.env['OPENAI_API_KEY'] || '';

const supabase: SupabaseClient | null = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      realtime: {
        transport: ws as any,
      },
    })
  : null;

router.use((req: Request, res: Response, next: NextFunction): void => {
  if (!supabase) {
    res.status(500).json({
      error: 'Configuración incompleta del backend.',
      details: 'Faltan SUPABASE_URL o SUPABASE_KEY en las variables de entorno.'
    });
    return;
  }
  next();
});

router.get('/health', (req: Request, res: Response): Response => {
  return res.status(200).json({
    ok: true,
    runtime: 'serverless',
    hasSupabaseUrl: Boolean(process.env['SUPABASE_URL']),
    hasSupabaseKey: Boolean(process.env['SUPABASE_KEY']),
    hasJwtSecret: Boolean(process.env['JWT_SECRET'])
  });
});

// ==========================================
// ENDPOINT DEL CHAT CON OPENAI
// ==========================================

const OPENAI_SYSTEM_PROMPT = `
Eres el asistente virtual de Nehoraj, una empresa que transforma negocios con soluciones tecnológicas personalizadas.
Tu misión es ayudar a emprendedores y empresas a descubrir cómo la inteligencia artificial, el desarrollo de software a medida y las aplicaciones innovadoras pueden maximizar su eficiencia, reducir costos y mejorar la experiencia de sus clientes.

Instrucciones:
- Responde siempre de manera cordial, profesional y clara.
- Si te preguntan por servicios, explica que Nehoraj ofrece: integración de ERP, desarrollo de aplicaciones web y móviles, asistentes virtuales con IA, sistemas de control de inventarios, soluciones de seguridad con drones, análisis de datos, CRM inmobiliario, menús digitales, y más.
- Si te preguntan por la propuesta de valor, responde:
  "Transformamos tu negocio con soluciones tecnológicas personalizadas, combinando inteligencia artificial, desarrollo de software a medida y aplicaciones innovadoras para maximizar la eficiencia, reducir costos y mejorar la experiencia del cliente."
- Si te preguntan por la promesa de venta, responde:
  "Desarrollamos soluciones tecnológicas únicas que impulsan tu negocio hacia el futuro digital con aplicaciones móviles, plataformas web y sistemas inteligentes, garantizando un retorno de inversión rápido y medible."
- Si te preguntan por tecnologías, menciona que trabajan con Angular, Node.js, MySQL, PostgreSQL, MongoDB, Next.js, Vercel, Cloudflare, Azure, Oracle OCI, OpenAI, Anthropic, y más.
- Si te preguntan por el equipo, menciona que Nehoraj está formado por expertos en tecnología, negocios y responsabilidad social.
- Si te preguntan por contacto, proporciona SIEMPRE estos datos:
  - Teléfono: (+52) 563 795 5283
  - Correo: contacto@nehoraj.com
  - Dirección: Calle Doctor Luis Miguel Álvarez Duela 35, 24040 Campeche, México.
- Si te preguntan por aliados, menciona empresas como Tech&IA Energía, DSAIX, Aerial y Meteor.
- Si no sabes la respuesta, invita cordialmente a dejar sus datos para que un asesor humano los contacte.

Siempre inicia con un saludo amable y pregunta cómo puedes ayudar.
`;

router.post('/chat', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'La API key de OpenAI no está configurada en el servidor.' });
    }

    const { messages, maxTokens } = req.body;
    const fullMessages = [{ role: 'system', content: OPENAI_SYSTEM_PROMPT }, ...(messages || [])];

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: fullMessages,
      max_tokens: maxTokens || 500
    }, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return res.status(200).json({ content: response.data.choices[0].message.content });
  } catch (error: any) {
    console.error('Error al consultar OpenAI:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Error al consultar el asistente de IA.', details: error.message });
  }
});

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.', code: 'TOKEN_MISSING' });
    return;
  }

  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (err) {
      // Se distingue el token caducado del inválido y ambos van con 401 (no 403):
      // el cliente los trata como "sesión terminada, vuelve a iniciar sesión",
      // mientras que 403 queda reservado para "estás autenticado pero tu rol no
      // alcanza", que no se arregla volviendo a iniciar sesión.
      const expired = err.name === 'TokenExpiredError';
      res.status(401).json({
        error: expired
          ? 'Tu sesión expiró. Inicia sesión de nuevo.'
          : 'Token inválido. Inicia sesión de nuevo.',
        code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
      });
      return;
    }
    req.user = user as AuthenticatedRequest['user'];
    next();
  });
}

// Alta de redactores (solo admin) - antes era un registro público,
// se cierra por seguridad: cualquiera podía crearse una cuenta y publicar.
router.post('/auth/register', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo un administrador puede crear nuevos redactores.' });
    }

    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const { data: existingUser } = await supabase!
      .from('blog_users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'El nombre de usuario ya está registrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const { data: newUser, error: insertError } = await supabase!
      .from('blog_users')
      .insert([{ username, password_hash: passwordHash, role: role === 'admin' ? 'admin' : 'author' }])
      .select('id, username, role')
      .single();

    if (insertError) {
      throw insertError;
    }

    return res.status(201).json({ message: 'Redactor creado exitosamente.', user: newUser });
  } catch (error: any) {
    console.error('Error al crear redactor:', error);
    return res.status(500).json({ error: 'Error del servidor al crear el redactor.', details: error.message });
  }
});

router.post('/auth/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    const { data: user, error: selectError } = await supabase!
      .from('blog_users')
      .select('*')
      .eq('username', username)
      .single();

    if (selectError || !user) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login exitoso.',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        avatar_url: user.avatar_url || ''
      }
    });
  } catch (error: any) {
    console.error('Error en el login:', error);
    return res.status(500).json({ error: 'Error del servidor en el login.', details: error.message });
  }
});

// Cambio de contraseña por el propio usuario autenticado
// Validación de la sesión actual.
// Que el JWT tenga firma válida y no haya expirado no basta: el redactor pudo
// haber sido eliminado o haber cambiado de rol después de emitirse el token.
// Confirmamos contra la base de datos y devolvemos los datos frescos para que
// el cliente refresque su estado (o cierre la sesión si la cuenta ya no existe).
router.get('/auth/me', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { data: user, error } = await supabase!
      .from('blog_users')
      .select('id, username, role, avatar_url')
      .eq('id', req.user!.userId)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return res.status(401).json({ error: 'La cuenta ya no existe. Inicia sesión de nuevo.' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        avatar_url: user.avatar_url || ''
      }
    });
  } catch (error: any) {
    console.error('Error al validar la sesión:', error);
    return res.status(500).json({ error: 'Error al validar la sesión.', details: error.message });
  }
});

router.post('/auth/change-password', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'La contraseña actual y la nueva son requeridas.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const { data: user, error: selectError } = await supabase!
      .from('blog_users')
      .select('id, password_hash')
      .eq('id', req.user!.userId)
      .single();

    if (selectError || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const { error: updateError } = await supabase!
      .from('blog_users')
      .update({ password_hash: passwordHash })
      .eq('id', req.user!.userId);

    if (updateError) throw updateError;

    return res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
  } catch (error: any) {
    console.error('Error al cambiar la contraseña:', error);
    return res.status(500).json({ error: 'Error del servidor al cambiar la contraseña.', details: error.message });
  }
});

// Lista de redactores (solo admin), para el flujo de reseteo de contraseña
router.get('/auth/users', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo un administrador puede ver la lista de usuarios.' });
    }

    const { data: users, error } = await supabase!
      .from('blog_users')
      .select('id, username, role, avatar_url, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return res.status(200).json(users || []);
  } catch (error: any) {
    console.error('Error al listar usuarios:', error);
    return res.status(500).json({ error: 'Error al listar los usuarios.', details: error.message });
  }
});

// Reseteo de contraseña de otro redactor (solo admin, sin necesidad de correo)
router.post('/auth/admin-reset-password', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo un administrador puede resetear contraseñas.' });
    }

    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'El usuario y la nueva contraseña son requeridos.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const { data: updatedUser, error: updateError } = await supabase!
      .from('blog_users')
      .update({ password_hash: passwordHash })
      .eq('id', userId)
      .select('id, username, role')
      .single();

    if (updateError) throw updateError;
    if (!updatedUser) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    return res.status(200).json({ message: 'Contraseña reseteada exitosamente.', user: updatedUser });
  } catch (error: any) {
    console.error('Error al resetear la contraseña:', error);
    return res.status(500).json({ error: 'Error del servidor al resetear la contraseña.', details: error.message });
  }
});

// Actualizar la foto de perfil propia (cualquier redactor autenticado)
router.put('/auth/me/avatar', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { avatar_url } = req.body;

    if (!avatar_url) {
      return res.status(400).json({ error: 'La URL de la imagen es obligatoria.' });
    }

    const { data: updatedUser, error } = await supabase!
      .from('blog_users')
      .update({ avatar_url })
      .eq('id', req.user!.userId)
      .select('id, username, role, avatar_url')
      .single();

    if (error) throw error;

    return res.status(200).json({ message: 'Foto de perfil actualizada exitosamente.', user: updatedUser });
  } catch (error: any) {
    console.error('Error al actualizar la foto de perfil:', error);
    return res.status(500).json({ error: 'Error al actualizar la foto de perfil.', details: error.message });
  }
});

// Cambiar el rol de un redactor (solo admin, no puede cambiarse su propio rol)
router.put('/auth/users/:id/role', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo un administrador puede cambiar roles.' });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (id === req.user.userId) {
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol. Pide a otro administrador que lo haga.' });
    }
    if (role !== 'author' && role !== 'admin') {
      return res.status(400).json({ error: 'Rol inválido.' });
    }

    const { data: updatedUser, error } = await supabase!
      .from('blog_users')
      .update({ role })
      .eq('id', id)
      .select('id, username, role')
      .single();

    if (error) throw error;
    if (!updatedUser) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    return res.status(200).json({ message: 'Rol actualizado exitosamente.', user: updatedUser });
  } catch (error: any) {
    console.error('Error al cambiar el rol:', error);
    return res.status(500).json({ error: 'Error al cambiar el rol.', details: error.message });
  }
});

// Eliminar un redactor (solo admin, no puede eliminarse a sí mismo)
router.delete('/auth/users/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo un administrador puede eliminar redactores.' });
    }

    const { id } = req.params;

    if (id === req.user.userId) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta desde aquí.' });
    }

    const { error } = await supabase!
      .from('blog_users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Redactor eliminado exitosamente.' });
  } catch (error: any) {
    console.error('Error al eliminar redactor:', error);
    return res.status(500).json({ error: 'Error al eliminar el redactor.', details: error.message });
  }
});

function escapeOgHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateOgHtmlResponse(post: any): string {
  const title = post?.title ? `${post.title} | Grupo Nehoraj` : 'Grupo Nehoraj - Transformación Digital & Innovación Tecnológica';
  const rawExcerpt = post?.excerpt || (post?.content ? post.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '');
  const description = rawExcerpt ? (rawExcerpt.length > 160 ? `${rawExcerpt.substring(0, 157)}...` : rawExcerpt) : 'Transformamos tu negocio con soluciones tecnológicas personalizadas, combinando inteligencia artificial, desarrollo de software a medida y aplicaciones innovadoras.';
  const image = post?.cover_image || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=1200&q=80';
  const url = post?.id ? `https://nehoraj.com/?post=${post.id}` : 'https://nehoraj.com/';
  const siteName = 'Grupo Nehoraj';

  const safeTitle = escapeOgHtml(title);
  const safeDescription = escapeOgHtml(description);
  const safeImage = escapeOgHtml(image);
  const safeUrl = escapeOgHtml(url);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${safeDescription}">

  <!-- Schema.org markup for Google / LinkedIn -->
  <meta itemprop="name" content="${safeTitle}">
  <meta itemprop="description" content="${safeDescription}">
  <meta itemprop="image" content="${safeImage}">

  <!-- Open Graph / Facebook / LinkedIn -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${safeUrl}">

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">

  <!-- Canonical link -->
  <link rel="canonical" href="${safeUrl}">

  <script>
    // Redirección para navegadores web estándar
    if (!/LinkedInBot|facebookexternalhit|Twitterbot|WhatsApp|Slackbot|TelegramBot|Discordbot|Googlebot/i.test(navigator.userAgent)) {
      window.location.href = "${safeUrl}";
    }
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; color: #0f172a; padding: 40px 20px;">
  <div style="max-width: 650px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
    ${post?.cover_image ? `<img src="${safeImage}" alt="${safeTitle}" style="width: 100%; height: 260px; object-fit: cover; border-radius: 12px; margin-bottom: 24px;" />` : ''}
    <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 12px; line-height: 1.3;">${safeTitle}</h1>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px;">${safeDescription}</p>
    <a href="${safeUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Leer artículo completo en Nehoraj &rarr;</a>
  </div>
</body>
</html>`;
}

router.get('/og-preview', async (req: Request, res: Response): Promise<any> => {
  try {
    const postId = ((req.query['post'] || req.query['id']) as string || '').trim();

    if (!postId) {
      const html = generateOgHtmlResponse(null);
      return res.status(200).send(html);
    }

    const { data: post } = await supabase!
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    const html = generateOgHtmlResponse(post);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error: any) {
    console.error('Error en /og-preview:', error);
    const html = generateOgHtmlResponse(null);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }
});
router.get('/api/og-preview', async (req: Request, res: Response): Promise<any> => {
  try {
    const postId = ((req.query['post'] || req.query['id']) as string || '').trim();

    if (!postId) {
      const html = generateOgHtmlResponse(null);
      return res.status(200).send(html);
    }

    const { data: post } = await supabase!
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    const html = generateOgHtmlResponse(post);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error: any) {
    console.error('Error en /api/og-preview:', error);
    const html = generateOgHtmlResponse(null);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }
});

router.get('/blog', async (req: Request, res: Response): Promise<any> => {
  try {
    const { category } = req.query;
    let query = supabase!.from('blog_posts').select('*').order('created_at', { ascending: false });

    if (category && category !== 'Todos') {
      query = query.eq('category', category);
    }

    const { data: posts, error } = await query;

    if (error) throw error;

    return res.status(200).json(posts || []);
  } catch (error: any) {
    console.error('Error al listar artículos:', error);
    return res.status(500).json({ error: 'Error al listar los artículos.', details: error.message });
  }
});

const getPostByIdHandler = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = (req.params['id'] || '').trim();

    if (!id) {
      return res.status(400).json({ error: 'ID de artículo inválido.' });
    }

    const { data: post, error } = await supabase!
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error al buscar artículo por id:', { id, error });
      return res.status(500).json({ error: 'Error al consultar el artículo.', details: error.message });
    }

    if (!post) {
      return res.status(404).json({ error: 'Artículo no encontrado.' });
    }

    return res.status(200).json(post);
  } catch (error: any) {
    console.error('Error al obtener artículo:', error);
    return res.status(500).json({ error: 'Error al obtener el artículo.', details: error.message });
  }
};

router.get('/blog/:id', getPostByIdHandler);

router.post('/blog', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { title, excerpt, content, category, author_name, author_role, author_avatar, cover_image, tags, reading_time } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'El título y el contenido son obligatorios.' });
    }

    const { data: newPost, error } = await supabase!
      .from('blog_posts')
      .insert([{
        title,
        excerpt,
        content,
        category: category || 'General',
        author_name: author_name || req.user?.username || 'Nehoraj Team',
        author_role: author_role || 'Redactor',
        author_avatar: author_avatar || 'assets/img/cofounder-1.png',
        cover_image,
        tags: tags || [],
        reading_time: reading_time || '3 min'
      }])
      .select('*')
      .single();

    if (error) throw error;

    return res.status(201).json(newPost);
  } catch (error: any) {
    console.error('Error al crear artículo:', error);
    return res.status(500).json({ error: 'Error al crear el artículo.', details: error.message });
  }
});

router.put('/blog/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { title, excerpt, content, category, author_name, author_role, author_avatar, cover_image, tags, reading_time } = req.body;

    const { data: updatedPost, error } = await supabase!
      .from('blog_posts')
      .update({
        title,
        excerpt,
        content,
        category,
        author_name,
        author_role,
        author_avatar,
        cover_image,
        tags,
        reading_time,
        updated_at: new Date()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return res.status(200).json(updatedPost);
  } catch (error: any) {
    console.error('Error al actualizar artículo:', error);
    return res.status(500).json({ error: 'Error al actualizar el artículo.', details: error.message });
  }
});

router.delete('/blog/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { error } = await supabase!
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Artículo eliminado exitosamente.' });
  } catch (error: any) {
    console.error('Error al eliminar artículo:', error);
    return res.status(500).json({ error: 'Error al eliminar el artículo.', details: error.message });
  }
});

// ==========================================
// COMENTARIOS DE ARTÍCULOS DEL BLOG
// ==========================================

// Listar comentarios de un artículo (público)
router.get('/blog/:id/comments', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { data: comments, error } = await supabase!
      .from('blog_comments')
      .select('*')
      .eq('post_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json(comments || []);
  } catch (error: any) {
    console.error('Error al listar comentarios:', error);
    return res.status(500).json({ error: 'Error al listar los comentarios.', details: error.message });
  }
});

// Publicar un comentario (público, cualquier visitante puede comentar)
router.post('/blog/:id/comments', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const author = (req.body.author || '').trim();
    const message = (req.body.message || '').trim();

    if (!author || !message) {
      return res.status(400).json({ error: 'Escribe tu nombre y comentario para publicar.' });
    }
    if (author.length > 100) {
      return res.status(400).json({ error: 'El nombre es demasiado largo.' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'El comentario es demasiado largo (máx. 2000 caracteres).' });
    }

    const { data: newComment, error } = await supabase!
      .from('blog_comments')
      .insert([{ post_id: id, author, message }])
      .select('*')
      .single();

    if (error) throw error;

    return res.status(201).json(newComment);
  } catch (error: any) {
    console.error('Error al publicar comentario:', error);
    return res.status(500).json({ error: 'Error al publicar el comentario.', details: error.message });
  }
});

// Eliminar un comentario (protegido, solo admin - moderación)
router.delete('/blog/comments/:commentId', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo un administrador puede eliminar comentarios.' });
    }

    const { commentId } = req.params;
    const { error } = await supabase!
      .from('blog_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;

    return res.status(200).json({ message: 'Comentario eliminado exitosamente.' });
  } catch (error: any) {
    console.error('Error al eliminar comentario:', error);
    return res.status(500).json({ error: 'Error al eliminar el comentario.', details: error.message });
  }
});

router.post('/upload', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const filename = req.headers['x-filename'] as string || `file-${Date.now()}`;
    const contentType = req.headers['content-type'] || 'application/octet-stream';
    const fileBuffer = req.body;

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'El archivo está vacío o no se ha adjuntado correctamente.' });
    }

    const blob = await put(filename, fileBuffer, {
      contentType,
      access: 'public',
    });

    return res.status(200).json({ url: blob.url });
  } catch (error: any) {
    console.error('Error al subir archivo a Vercel Blob:', error);
    return res.status(500).json({ error: 'Error al subir el archivo multimedia.', details: error.message });
  }
});

// ==========================================
// ENDPOINTS DE IMÁGENES DE RESPONSABILIDAD SOCIAL
// ==========================================

// Obtener todas las imágenes, agrupadas por campaña en el cliente (público)
router.get('/social-images', async (req: Request, res: Response): Promise<any> => {
  try {
    const { data: images, error } = await supabase!
      .from('social_images')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return res.status(200).json(images || []);
  } catch (error: any) {
    console.error('Error al listar imágenes de responsabilidad social:', error);
    return res.status(500).json({ error: 'Error al listar las imágenes.', details: error.message });
  }
});

// Registrar una imagen ya subida a Vercel Blob (protegido)
router.post('/social-images', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { campaign_title, campaign_description, image_url, sort_order } = req.body;

    if (!campaign_title || !image_url) {
      return res.status(400).json({ error: 'El título de la campaña y la URL de la imagen son obligatorios.' });
    }

    const { data: newImage, error } = await supabase!
      .from('social_images')
      .insert([{
        campaign_title,
        campaign_description: campaign_description || '',
        image_url,
        sort_order: typeof sort_order === 'number' ? sort_order : 0
      }])
      .select('*')
      .single();

    if (error) throw error;

    return res.status(201).json(newImage);
  } catch (error: any) {
    console.error('Error al registrar imagen de responsabilidad social:', error);
    return res.status(500).json({ error: 'Error al registrar la imagen.', details: error.message });
  }
});

// Renombrar/editar una campaña completa (protegido) - actualiza todas las filas que compartan el título actual
router.put('/social-images/campaign', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { old_title, new_title, new_description } = req.body;

    if (!old_title || !new_title) {
      return res.status(400).json({ error: 'El título actual y el nuevo título son obligatorios.' });
    }

    const { data: updated, error } = await supabase!
      .from('social_images')
      .update({ campaign_title: new_title, campaign_description: new_description || '' })
      .eq('campaign_title', old_title)
      .select('id');

    if (error) throw error;

    return res.status(200).json({ message: 'Campaña actualizada exitosamente.', updated: updated?.length || 0 });
  } catch (error: any) {
    console.error('Error al actualizar campaña de responsabilidad social:', error);
    return res.status(500).json({ error: 'Error al actualizar la campaña.', details: error.message });
  }
});

// Eliminar una imagen (protegido) - borra la fila y el archivo en Vercel Blob
router.delete('/social-images/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const { data: image } = await supabase!
      .from('social_images')
      .select('image_url')
      .eq('id', id)
      .single();

    const { error } = await supabase!
      .from('social_images')
      .delete()
      .eq('id', id);

    if (error) throw error;

    if (image?.image_url) {
      try {
        await del(image.image_url);
      } catch (blobError) {
        console.error('No se pudo eliminar el archivo en Vercel Blob:', blobError);
      }
    }

    return res.status(200).json({ message: 'Imagen eliminada exitosamente.' });
  } catch (error: any) {
    console.error('Error al eliminar imagen de responsabilidad social:', error);
    return res.status(500).json({ error: 'Error al eliminar la imagen.', details: error.message });
  }
});

// Alias para runtimes serverless donde el prefijo /blog puede llegar recortado.
// Debe ir al final: es un comodín y no puede interceptar rutas más específicas.
router.get('/:id', getPostByIdHandler);

export default router;
