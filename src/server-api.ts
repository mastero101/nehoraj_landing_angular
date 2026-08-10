import { Router, Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { put, del } from '@vercel/blob';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const router = Router();

function loadEnvFromFile(): void {
  if (process.env['SUPABASE_URL'] && process.env['SUPABASE_KEY']) {
    return;
  }

  const candidatePaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../.env'),
    resolve(process.cwd(), '../../.env'),
  ];

  for (const envPath of candidatePaths) {
    if (!existsSync(envPath)) {
      continue;
    }

    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex <= 0) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }

    // Si ya cargamos lo esencial, no seguimos buscando.
    if (process.env['SUPABASE_URL'] && process.env['SUPABASE_KEY']) {
      return;
    }
  }
}

loadEnvFromFile();

// 1. Inicialización de Supabase
const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseKey = process.env['SUPABASE_KEY'] || '';
const jwtSecret = process.env['JWT_SECRET'] || 'nehoraj-super-secret-key-2026';
const openaiApiKey = process.env['openaiApiKey'] || process.env['OPENAI_API_KEY'] || '';

const supabase: SupabaseClient | null = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
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

router.get('/health', (req: Request, res: Response) => {
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

// Interfaces de Tipo para Express con Usuario Autenticado
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

// 2. Middleware de Autenticación JWT
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    return;
  }

  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: 'Token inválido o expirado.' });
      return;
    }
    req.user = user as AuthenticatedRequest['user'];
    next();
  });
}

// ==========================================
// ENDPOINTS DE AUTENTICACIÓN (LOGIN & REGISTRO)
// ==========================================

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

    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabase!
      .from('blog_users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'El nombre de usuario ya está registrado.' });
    }

    // Encriptar la contraseña con bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertar en la tabla blog_users
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

// Login de Usuario
router.post('/auth/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    // Buscar el usuario
    const { data: user, error: selectError } = await supabase!
      .from('blog_users')
      .select('*')
      .eq('username', username)
      .single();

    if (selectError || !user) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    // Validar contraseña
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    // Generar JWT
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
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Error en el login:', error);
    return res.status(500).json({ error: 'Error del servidor en el login.', details: error.message });
  }
});

// Cambio de contraseña por el propio usuario autenticado
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
      .select('id, username, role, created_at')
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

// ==========================================
// ENDPOINTS DEL BLOG (CRUD)
// ==========================================

// Obtener todos los artículos (público)
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

// Obtener detalle de un artículo (público)
router.get('/blog/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { data: post, error } = await supabase!
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !post) {
      return res.status(404).json({ error: 'Artículo no encontrado.' });
    }

    return res.status(200).json(post);
  } catch (error: any) {
    console.error('Error al obtener artículo:', error);
    return res.status(500).json({ error: 'Error al obtener el artículo.', details: error.message });
  }
});

// Crear nuevo artículo (protegido)
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

// Actualizar artículo existente (protegido)
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

// Eliminar artículo (protegido)
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

// ==========================================
// ENDPOINT DE CARGA MULTIMEDIA A VERCEL BLOB
// ==========================================

// Subir archivos a Vercel Blob (protegido)
router.post('/upload', authenticateToken as any, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const filename = req.headers['x-filename'] as string || `file-${Date.now()}`;
    const contentType = req.headers['content-type'] || 'application/octet-stream';

    // Obtener los datos binarios directamente del cuerpo de la petición Express (usando express.raw)
    const fileBuffer = req.body;

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'El archivo está vacío o no se ha adjuntado correctamente.' });
    }

    // Subir a Vercel Blob utilizando la variable de entorno nativa BLOB_READ_WRITE_TOKEN
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

export default router;
