# 🎨 AI 去除水印工具 (简单版)

这是一个简单易用的去水印工具，基于 **Python (Streamlit)** 和 **OpenCV** 构建。它可以帮助你快速去除图片中的 Logo、日期、文字等简单水印。

该项目包含两个部分：

1. **电脑端 Web 应用**：在电脑上运行，支持局域网内手机访问。
2. **移动端源代码** (`mobile-webapp/`)：用于开发独立移动应用的源代码。

## ✨ 功能特点

- **简单易用**：上传图片 -> 涂抹水印 -> 一键去除。
- **局域网访问**：在电脑运行后，手机连接同一 WiFi 即可直接使用，方便处理手机照片。
- **隐私安全**：所有处理均在本地进行，不上传任何图片到云端服务器。
- **轻量级**：使用 OpenCV 经典的修复算法 (Telea)，速度快，适合小范围修补。

## 🛠️ 安装与运行 (电脑端)

### 1. 环境准备

确保已安装 Python (3.8+)。

建议直接安装核心依赖（比 requirements.txt 更轻量）：

```bash
pip install streamlit opencv-python-headless streamlit-drawable-canvas numpy Pillow
```

*(注：项目根目录的 `requirements.txt` 包含了完整的开发环境依赖，可能比较大，仅运行本项目只需上述核心库)*

### 2. 启动应用

在项目根目录下打开终端 (CMD 或 PowerShell)，运行：

```bash
streamlit run app.py
```

### 3. 如何使用

1. **启动后**，浏览器会自动打开 `http://localhost:8501`。
2. **手机访问**：确保手机和电脑连接**同一个 WiFi**，在手机浏览器输入终端显示的 `Network URL` (例如 `http://192.168.1.x:8501`)。
3. **去水印**：
    - 上传一张带有水印的图片。
    - 使用画笔工具涂抹（覆盖）水印区域。
    - 点击侧边栏或下方的 **"一键去水印"** 按钮。
    - 处理完成后，可以下载修复后的图片。

## 📱 移动端开发 (`mobile-webapp/`)

`mobile-webapp` 文件夹内包含了基于 Web 技术 (HTML/JS/OpenCV.js) 的移动应用源代码。
如果你是开发者，可以利用这些代码构建 Android 或 iOS 应用 (需配合 Capacitor 等工具)。

详细构建指南请查阅：[mobile-webapp/BUILD_GUIDE.md](mobile-webapp/BUILD_GUIDE.md)

## ⚠️ 注意事项
- Releases版本是给Android用的
- 本工具使用传统的图像修复算法 (Inpainting)，适用于**背景简单、水印较小**的情况。
- 对于**大面积遮挡、复杂纹理背景**或**半透明全屏水印**，修复效果可能有限（这类场景通常需要深度学习模型如 LaMa 等，本项目暂未集成以保持轻量）。

## 📄 许可证

MIT License
