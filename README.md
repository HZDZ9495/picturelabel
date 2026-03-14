# 图片识别标注 (picturelabel)

本项目是一款基于 **Azure AI Vision** 的图像自动标注工具。它可以自动识别图片中的物体，并在后端使用 `canvas` 绘制红色边界框（Bounding Boxes）和置信度标签，最后返回标注后的图片。

## 🛠️ 环境要求

- Node.js >= 18
- 已开通 **Azure AI Vision** (计算机视觉) 服务的 API Key 和 Endpoint。

## ⚙️ 配置指南

### 1. 后端配置 (backend/.env)
在 `backend` 目录下创建 `.env` 文件（可参考 `.env.example`）：
```env
AZURE_VISION_KEY=你的_Azure_Key
AZURE_VISION_ENDPOINT=你的_Azure_Endpoint
PORT=80
ALLOWED_ORIGINS=https://your-domain.com,http://localhost:5173
NODE_ENV=production
APP_USER=admin
APP_PASS=你的访问密码
```

### 2. 前端配置 (可选)
如果需要手动指定后端地址（如开发环境分机部署），可修改 `frontend/.env`：
```env
VITE_API_URL=http://your-backend-ip:3000
```

## 🚀 运行与部署

### 开发模式 (本地调试)
1. **安装依赖** (根目录执行):
   ```bash
   npm run install:all
   ```
2. **启动后端**:
   ```bash
   npm run start:backend
   ```
3. **启动前端**:
   ```bash
   npm run start:frontend
   ```
   访问 `http://localhost:5173`。

### 生产部署 (Linux/服务器)
1. **构建前端**:
   ```bash
   npm run build:frontend
   ```
2. **启动集成服务**:
   ```bash
   npm run start:prod
   ```
   应用将监听 `0.0.0.0` 及 `.env` 中指定的端口。

## 📝 技术细节

- **前端**: React 19, Vite 6, Axios, TypeScript。
- **后端**: Node.js, Express 5, Multer (文件上传), Node-Canvas (图片绘制)。
- **鉴权**: 采用自定义前端登录页 + 后端 Authorization 拦截。
- **CORS**: 动态解析 `ALLOWED_ORIGINS`，支持多域名跨域。

