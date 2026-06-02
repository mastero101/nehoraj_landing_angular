import { Router, Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { put } from '@vercel/blob';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import ws from 'ws';

const router = Router();

const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseKey = process.env['SUPABASE_KEY'] || '';
const jwtSecret = process.env['JWT_SECRET'] || 'nehoraj-super-secret-key-2026';

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

router.post('/auth/register', async (req: Request, res: Response): Promise<any> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
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
      .insert([{ username, password_hash: passwordHash, role: 'author' }])
      .select('id, username, role')
      .single();

    if (insertError) {
      throw insertError;
    }

    return res.status(201).json({ message: 'Usuario registrado exitosamente.', user: newUser });
  } catch (error: any) {
    console.error('Error al registrar usuario:', error);
    return res.status(500).json({ error: 'Error del servidor al registrar el usuario.', details: error.message });
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
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Error en el login:', error);
    return res.status(500).json({ error: 'Error del servidor en el login.', details: error.message });
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
// Alias para runtimes serverless donde el prefijo puede llegar recortado.
router.get('/:id', getPostByIdHandler);

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

export default router;
