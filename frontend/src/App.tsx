import { useState, useEffect } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import axios from 'axios';
import './App.css';

// 彻底使用相对路径。浏览器会自动补全为当前域名 + 协议
const API_BASE = '/api';
const ANNOTATE_URL = `${API_BASE}/annotate`;
const VERIFY_URL = `${API_BASE}/auth/verify`;

function App() {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    const savedAuth = localStorage.getItem('app_auth');
    if (savedAuth) {
      axios.defaults.headers.common['Authorization'] = `Basic ${savedAuth}`;
      const verifyAuth = async () => {
        try {
          await axios.post(VERIFY_URL);
          setIsAuthorized(true);
        } catch (err) {
          handleLogout();
        }
      };
      verifyAuth();
    }
  }, []);

  const handleLogin = async () => {
    setLoginError(null);
    if (!username || !password) {
      setLoginError('请输入用户名和密码');
      return;
    }

    const authString = btoa(`${username}:${password}`);
    
    try {
      await axios.post(VERIFY_URL, {}, {
        headers: { 'Authorization': `Basic ${authString}` }
      });
      localStorage.setItem('app_auth', authString);
      axios.defaults.headers.common['Authorization'] = `Basic ${authString}`;
      setIsAuthorized(true);
      setPassword('');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setLoginError('用户名或密码错误');
      } else {
        setLoginError('无法连接到服务器');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('app_auth');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthorized(false);
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setOriginalPreview(URL.createObjectURL(file));
      setAnnotatedImage(null);
      setError(null);
    } else {
      setError('请上传图片文件');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await axios.post(ANNOTATE_URL, formData, {
        responseType: 'blob'
      });
      const imageUrl = URL.createObjectURL(response.data);
      setAnnotatedImage(imageUrl);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('登录已失效，请重新登录');
        handleLogout();
      } else {
        setError('标注失败，请检查配置');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!annotatedImage) return;
    const link = document.createElement('a');
    link.href = annotatedImage;
    link.download = `annotated_${selectedFile?.name || 'image.jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthorized) {
    return (
      <div className="login-screen">
        <div className="login-form">
          <h2>用户登录</h2>
          <p>请输入用户名和密码以访问系统</p>
          <input 
            type="text" 
            placeholder="用户名" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="密码" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button className="primary-btn" style={{ width: '100%' }} onClick={handleLogin}>登录</button>
          {loginError && <p className="error-text">{loginError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>图片识别标注</h1>
        <button className="logout-btn" onClick={handleLogout}>退出登录</button>
      </header>

      <section 
        className={`upload-section ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <h3>{selectedFile ? selectedFile.name : '将图片拖到此处或点击上传'}</h3>
        <div className="file-input-wrapper">
          <input type="file" id="file-input" accept="image/*" onChange={handleFileChange} hidden />
          <label htmlFor="file-input" className="file-label">选择文件</label>
        </div>
        <div className="button-group">
          <button 
            className="primary-btn"
            onClick={handleUpload} 
            disabled={!selectedFile || loading}
          >
            {loading ? '处理中...' : '开始标注'}
          </button>
          {annotatedImage && (
            <button className="secondary-btn" onClick={downloadImage}>
              下载结果
            </button>
          )}
        </div>
        {error && <p className="error-text">{error}</p>}
      </section>

      {loading && <div className="loading-status">正在分析图像，请稍候...</div>}

      <div className="preview-grid">
        {originalPreview && (
          <div className="preview-item">
            <h4>原始图片</h4>
            <div className="image-wrapper">
              <img src={originalPreview} alt="Original" />
            </div>
          </div>
        )}

        {annotatedImage && (
          <div className="preview-item">
            <h4>标注结果</h4>
            <div className="image-wrapper">
              <img src={annotatedImage} alt="Annotated" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
