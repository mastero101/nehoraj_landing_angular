import express from 'express';

let cachedApp: express.Express | null = null;

async function getApp(): Promise<express.Express> {
  if (cachedApp) {
    return cachedApp;
  }

  const { default: blogRouter } = await import('./server-api.js');
  const app = express();

  // Dejamos el body parser nativo de Vercel desactivado para que Express
  // pueda manejar JSON y binario (upload) con la misma configuración local.
  app.use('/upload', express.raw({ type: '*/*', limit: '500mb' }));
  app.use('/api/upload', express.raw({ type: '*/*', limit: '500mb' }));
  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ extended: true, limit: '500mb' }));

  // En Vercel el path puede llegar con o sin prefijo /api según el runtime.
  app.use('/', blogRouter);
  app.use('/api', blogRouter);

  cachedApp = app;
  return app;
}

export default async function handler(req: express.Request, res: express.Response): Promise<void> {
  try {
    const app = await getApp();
    app(req, res);
  } catch (error: any) {
    console.error('API bootstrap error:', error);
    res.status(500).json({
      error: 'API bootstrap error',
      details: error?.message || 'Unknown server error',
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
