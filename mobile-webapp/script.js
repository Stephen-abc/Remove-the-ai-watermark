// 初始化 OpenCV
function onOpenCvReady() {
    console.log("OpenCV ready");
    document.getElementById("loading-overlay").classList.add("hidden");
    setTimeout(() => {
        document.getElementById("loading-overlay").style.display = 'none';
        
        // 自动弹出“最新照片”提示
        // 在网页端，由于无法直接访问相册，我们用UI提示用户手动选择
        const hasUsedBefore = false; // 可以从localStorage判断，但为了演示，总是显示
        showLatestPhotoModal();
        
        document.getElementById("home-screen").style.display = 'flex';
    }, 500);
}

// 模拟“最新照片”提示逻辑
function showLatestPhotoModal() {
    document.getElementById("latest-photo-modal").style.display = 'flex';
}

function closeLatestModal() {
    document.getElementById("latest-photo-modal").style.display = 'none';
    // 点击“选多张”或“关闭”，进入首页相册选择流
    triggerUpload(false);
}

function confirmProcessLatest() {
    // 实际App中这里会调用 Native API 获取最新照片
    // Web端模拟：打开相册让用户选最新的
    triggerUpload(true);
    document.getElementById("latest-photo-modal").style.display = 'none';
}

// 全局变量
let currentScreen = "home-screen";
let sourceImage = null;

let maskCanvas = null;
let resultCanvas = null;
let ctx = null;
let isDrawing = false;
let brushSize = 20;
let lastX = 0;
let lastY = 0;
let scale = 1;

document.addEventListener('DOMContentLoaded', () => {
    // 强制先隐藏其他界面，只显示加载页
    document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
    document.getElementById("loading-overlay").classList.remove("hidden");
    
    // 笔刷滑块监听
    const slider = document.getElementById("brush-size");
    slider.addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
    });

    // 绑定File Input
    document.getElementById("file-input").addEventListener("change", handleFileSelect);

    // 绑定触摸事件到 Mask Canvas (确保在图片加载后调整大小)
    maskCanvas = document.getElementById("mask-canvas");
    ctx = maskCanvas.getContext('2d');
    
    // 鼠标/触摸事件统一处理
    maskCanvas.addEventListener('mousedown', startDraw);
    maskCanvas.addEventListener('mousemove', draw);
    maskCanvas.addEventListener('mouseup', stopDraw);
    maskCanvas.addEventListener('mouseout', stopDraw);
    
    maskCanvas.addEventListener('touchstart', startDraw, {passive: false});
    maskCanvas.addEventListener('touchmove', draw, {passive: false});
    maskCanvas.addEventListener('touchend', stopDraw, {passive: false});
});

// 重写的绘图逻辑
function getPos(e) {
    const rect = maskCanvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDraw(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
    
    // 画一个点
    ctx.beginPath();
    ctx.arc(lastX, lastY, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fill();
}

function draw(e) {
    if (!isDrawing) return;
    e.preventDefault(); 
    const pos = getPos(e);
    
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    lastX = pos.x;
    lastY = pos.y;
}

function stopDraw() {
    isDrawing = false;
}

function clearMask() {
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
}

// 核心逻辑：调用 OpenCV.js 去水印
function processImage() {
    if (typeof cv === 'undefined') {
        alert("OpenCV 尚未加载完成，请稍候");
        return;
    }
    
    try {
        // 显示加载
        document.getElementById("loading-overlay").style.display = 'flex';
        document.getElementById("loading-overlay").querySelector('p').innerText = "正在魔法消除...";
        
        setTimeout(() => {
            // 1. 读取原图
            let src = cv.imread(sourceImage);
            
            // 2. 读取掩膜 (需要从 canvas 读取并缩放到原图尺寸)
            // 先创建一个临时的 full-size canvas 来绘制 mask
            let tempCanvas = document.createElement('canvas');
            tempCanvas.width = sourceImage.width;
            tempCanvas.height = sourceImage.height;
            let tempCtx = tempCanvas.getContext('2d');
            
            // 将显示用的 mask 绘制到全尺寸 mask
            // 注意：直接 drawImage 会自动缩放
            tempCtx.drawImage(maskCanvas, 0, 0, sourceImage.width, sourceImage.height);
            
            // 读取 mask 数据
            let maskData = tempCtx.getImageData(0, 0, sourceImage.width, sourceImage.height);
            
            // 创建 OpenCV Mat
            let mask = cv.matFromImageData(maskData);
            
            // 提取 Alpha 通道作为掩膜 (因为我们画的是半透明红，需要二值化)
            // cv.cvtColor(mask, mask, cv.COLOR_RGBA2GRAY); 这步可能需要，取决于 matFromImageData
            
            let maskGray = new cv.Mat();
            cv.cvtColor(mask, maskGray, cv.COLOR_RGBA2GRAY, 0);
            
            // 阈值处理，确保掩膜是黑白的
            cv.threshold(maskGray, maskGray, 10, 255, cv.THRESH_BINARY);
            
            // 3. 执行 Inpaint
            let dst = new cv.Mat();
            // INPAINT_TELEA = 1, INPAINT_NS = 0
            cv.inpaint(src, maskGray, dst, 3, cv.INPAINT_TELEA);
            
            // 4. 显示结果
            // 创建一个新的结果 Canvas
            let outputCanvas = document.createElement('canvas'); // 不挂载 DOM
            cv.imshow(outputCanvas, dst); // imshow 会调整 canvas 大小
            
            // 将结果绘制到 UI 的结果区域
            const resultContainer = document.querySelector('.result-container');
            resultContainer.innerHTML = ''; // 清空
            outputCanvas.style.maxWidth = "100%";
            outputCanvas.style.maxHeight = "100%";
            resultContainer.appendChild(outputCanvas);
            
            // 切换界面
            switchScreen("result-screen");
            
            // 清理内存
            src.delete();
            mask.delete();
            maskGray.delete();
            dst.delete();
            
            // 隐藏 Loading
            document.getElementById("loading-overlay").style.display = 'none';
        }, 100); // 延时让 UI 渲染 Loading
        
    } catch (err) {
        console.error(err);
        alert("处理失败: " + err);
        document.getElementById("loading-overlay").style.display = 'none';
    }
}

function showHomeScreen() {
    document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
    document.getElementById("home-screen").style.display = 'flex';
}

function showEditorScreen() {
    document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
    document.getElementById("editor-screen").style.display = 'flex';
    // 重新调整 Canvas 尺寸
    setTimeout(() => {
        const container = document.getElementById("canvas-container");
        const editorImg = document.getElementById("source-image");
        const maskCanvas = document.getElementById("mask-canvas");
        
        if (editorImg && container) {
             const rect = editorImg.getBoundingClientRect();
             maskCanvas.width = rect.width;
             maskCanvas.height = rect.height;
             maskCanvas.style.top = (rect.top - container.getBoundingClientRect().top) + "px";
             maskCanvas.style.left = (rect.left - container.getBoundingClientRect().left) + "px";
        }
    }, 100);
}

// 切换界面
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
    document.getElementById(screenId).style.display = 'flex';
    currentScreen = screenId;
}

// 触发上传
function triggerUpload(latest) {
    if (latest) {
        // App 逻辑：尝试加载最新照片
        // Web 逻辑：触发 input，但提示选最新的
    } else {
        // 正常选择
    }
    document.getElementById("latest-photo-modal").style.display = 'none';
    document.getElementById("file-input").click();
}

// 处理文件选择
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            setupEditor(img);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// 设置编辑器
function setupEditor(img) {
    sourceImage = img;
    const editorImg = document.getElementById("source-image");
    editorImg.src = img.src;
    
    // 显示编辑器界面
    document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
    document.getElementById("editor-screen").style.display = 'flex';
    currentScreen = "editor-screen";
    
    // 延迟一点以确保 layout 完成
    setTimeout(() => {
        const container = document.getElementById("canvas-container");
        const rect = editorImg.getBoundingClientRect();
        
        maskCanvas.width = rect.width;
        maskCanvas.height = rect.height;
        maskCanvas.style.top = rect.top - container.getBoundingClientRect().top + "px";
        maskCanvas.style.left = rect.left - container.getBoundingClientRect().left + "px";
        
        // 计算缩放比例 (真实图片尺寸 / 显示尺寸)
        scale = img.width / rect.width;
        
        // 重置画布
        ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // 半透明红色笔刷
    }, 200);   
}

function saveImage() {
    const canvas = document.querySelector('.result-container canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = 'removed_watermark.png';
        link.href = canvas.toDataURL();
        link.click();
    }
}