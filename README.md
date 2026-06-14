# Modly 3D Generator Package

## 安装方法

### 方法1：本地安装
1. 把 `modly-3d` 文件夹复制到本地
2. 在 Modly 中选择"本地安装"
3. 选择这个文件夹

### 方法2：推送到 GitHub
1. 在 GitHub 创建新仓库
2. 把 `manifest.json` 和 `generator.py` 推送到仓库根目录
3. 在 Modly 中输入仓库 URL 安装

### 方法3：直接使用
```bash
# 测试运行
python generator.py --image test.png --output model.glb
```

## 配置模型路径

在 Modly 设置中，把 Models 路径设为：
```
C:\Users\myb13\.cache\huggingface\hub
```

这样会自动使用 HuggingFace 缓存的模型权重。

## 依赖安装

```bash
pip install torch torchvision diffusers transformers huggingface-hub pillow numpy trimesh pygltflib
```

## 使用方法

在 Modly 的图生3D功能中：
1. 选择 "TripoSR" 模型
2. 上传图片
3. 点击生成
