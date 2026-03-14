const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const annotationRoutes = require('./routes/annotation.routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: (origin, callback) => {
    const allowed = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(item => item.trim()) 
      : ['http://localhost:5173'];
    
    // 允许没有 origin 的请求 (比如移动端或 curl)
    if (!origin || allowed.includes(origin) || allowed.includes('*')) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS. Origin:', origin, 'Allowed:', allowed);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple Basic Auth Middleware
const basicAuth = (req, res, next) => {
  // 只有配置了用户名和密码时才启用验证
  const EXPECTED_USER = process.env.APP_USER;
  const EXPECTED_PASS = process.env.APP_PASS;

  if (!EXPECTED_USER || !EXPECTED_PASS) return next();

  // 禁用 CDN 和浏览器缓存，防止越权访问和缓存鉴权失败
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // 只有在访问 API 时才返回 401 错误
    // 访问静态网页文件时，由前端逻辑判断是否显示登录框
    if (req.url.startsWith('/api')) {
      return res.status(401).send('Authentication required');
    }
    return next();
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const user = auth[0];
  const pass = auth[1];

  if (user === EXPECTED_USER && pass === EXPECTED_PASS) {
    next();
  } else {
    // 同样，不发送 WWW-Authenticate 头，避免弹出系统框
    return res.status(401).send('Invalid credentials');
  }
};

// 应用鉴权中间件 (放在静态资源和 API 路由之前)
app.use(basicAuth);

// Auth verification endpoint
app.post('/api/auth/verify', (req, res) => {
  res.json({ message: 'Verified' });
});

// Routes
app.use('/api', annotationRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  
  app.use(express.static(frontendPath));
  
  // 使用中间件作为通配符拦截，避开 path-to-regexp 的解析错误
  app.use((req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('AI Image Auto Annotation Tool Backend is running.');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
