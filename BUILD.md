# 云课 APK 打包教程

本文档介绍如何将「云课」项目从源码打包为 Android APK 文件。

---

## 环境准备

### 1. 安装 Node.js

下载并安装 Node.js 18+：[https://nodejs.org](https://nodejs.org)

验证安装：

```bash
node -v
npm -v
```

### 2. 安装 JDK 17

> **重要**：本项目需要 JDK 17，JDK 21 会导致 Gradle 报错（`Unsupported class file major version 65`）。

下载地址：[https://adoptium.net/temurin/releases/?version=17](https://adoptium.net/temurin/releases/?version=17)

安装后配置环境变量：

- `JAVA_HOME` 指向 JDK 17 安装目录（如 `C:\Program Files\Eclipse Adoptium\jdk-17.x.x`）
- `PATH` 中添加 `%JAVA_HOME%\bin`

验证：

```bash
java -version
# 应输出 openjdk version "17.x.x"
```

### 3. 安装 Android Studio

下载地址：[https://developer.android.com/studio](https://developer.android.com/studio)

安装后，通过 Android Studio SDK Manager 安装以下组件：

- Android SDK Platform 33
- Android SDK Build-Tools 33.x.x
- Android SDK Command-line Tools

### 4. 配置 Gradle JDK

打开 Android Studio → File → Settings → Build, Execution, Deployment → Build Tools → Gradle → **Gradle JDK** → 选择 JDK 17。

---

## 快速打包（命令行）

### 第一步：安装依赖

```bash
npm install
```

### 第二步：构建 Web 资源

```bash
npm run build
```

此命令会将 Vue.js 项目编译到 `dist/` 目录。

### 第三步：同步到 Android 项目

```bash
npx cap sync
```

此命令会将 `dist/` 中的 Web 资源复制到 Android 项目的 `assets/public` 目录，并同步 Capacitor 插件。

### 第四步：打包 APK

**方式一：命令行打包（推荐）**

```bash
cd android
gradlew assembleDebug
```

打包成功后，APK 文件位于：

```
android/app/build/outputs/apk/debug/app-debug.apk
```

**方式二：Android Studio 打包**

```bash
npx cap open android
```

在 Android Studio 中打开后：

- **Debug APK**：点击顶部菜单 Build → Build Bundle(s) / APK(s) → Build APK(s)
- **Release APK**：点击 Build → Generate Signed Bundle / APK，按向导创建签名并打包

---

## 非ASCII路径问题

如果项目路径包含中文（如 `个人创意`、`手机课表app`），Gradle 可能报错：

```
Your project path contains non-ASCII characters
```

**解决方案**：在 `android/gradle.properties` 中添加：

```properties
android.overridePathCheck=true
```

> 此选项为实验性功能，添加后会有 WARNING 提示，但不影响打包。

如果添加后仍报错，需要重启 Gradle Daemon：

```bash
cd android
gradlew --stop
```

然后重新执行打包命令。

---

## 打包 Release APK

Debug APK 仅用于开发测试。正式发布需要打包签名的 Release APK。

### 1. 生成签名密钥

```bash
keytool -genkey -v -keystore yunke-release.keystore -alias yunke -keyalg RSA -keysize 2048 -validity 10000
```

按提示输入密码和相关信息，将生成的 `yunke-release.keystore` 文件放在项目根目录。

### 2. 配置签名信息

编辑 `android/app/build.gradle`，在 `android {}` 块内添加：

```gradle
signingConfigs {
    release {
        storeFile file('../../yunke-release.keystore')
        storePassword '你的密钥库密码'
        keyAlias 'yunke'
        keyPassword '你的密钥密码'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### 3. 打包 Release APK

```bash
cd android
gradlew assembleRelease
```

输出路径：

```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 常见问题

### Q: `Unsupported class file major version 65`

**原因**：JDK 版本过高（JDK 21），Gradle 不兼容。

**解决**：切换到 JDK 17，并在 Android Studio 的 Gradle JDK 设置中也改为 JDK 17。

### Q: `android platform has not been added yet`

**解决**：

```bash
npx cap add android
```

### Q: `Missing appId`

**解决**：

```bash
npx cap init "云课" "com.yunke.app" --webDir dist
```

### Q: Gradle 下载依赖缓慢

**解决**：配置国内镜像。编辑 `android/build.gradle`，将 `google()` 和 `mavenCentral()` 替换为：

```gradle
repositories {
    maven { url 'https://maven.aliyun.com/repository/google' }
    maven { url 'https://maven.aliyun.com/repository/central' }
}
```

### Q: `npm install` 失败

**解决**：切换 npm 镜像：

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

---

## 项目结构

```
yunke-app/
├── src/                    # Vue.js 源码
│   ├── views/              # 页面组件
│   ├── components/         # 公共组件
│   ├── utils/              # 工具函数
│   ├── router/             # 路由配置
│   ├── App.vue             # 根组件
│   └── main.js             # 入口文件
├── dist/                   # Web 构建输出（npm run build 生成）
├── android/                # Android 原生项目（Capacitor 生成）
│   ├── app/
│   │   └── build/outputs/  # APK 输出目录
│   ├── gradle.properties   # Gradle 配置（含路径检查覆盖）
│   └── variables.gradle    # SDK 版本配置
├── capacitor.config.ts     # Capacitor 配置
├── package.json            # 项目依赖
└── vite.config.js          # Vite 构建配置
```
