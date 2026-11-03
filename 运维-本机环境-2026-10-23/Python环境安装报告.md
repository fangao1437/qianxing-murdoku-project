# Python 环境安装报告

- **安装时间**：2026-10-23 01:02 – 01:12（Asia/Shanghai）
- **机器信息**：Windows 11 家庭版 中文版（10.0.26200，x64 / AMD64），用户 `laptop-4lq57bdm\18182`
- **安装结果**：✅ 成功 —— 38/38 模块导入、21/21 功能实测全部通过
- **安装前状态**：本机无任何真实 Python，仅有 Microsoft Store 的 `python.exe` 占位别名（`...\WindowsApps\python.exe`），无 `py` 启动器、无 `pip`

## 一、安装摘要

| 项目 | 内容 |
|---|---|
| Python 版本 | **3.13.15**（64-bit，含 pip / venv / tkinter / IDLE） |
| 安装位置 | `C:\Users\18182\AppData\Local\Programs\Python\Python313` |
| py 启动器 | `C:\Users\18182\AppData\Local\Programs\Python\Launcher\py.exe` |
| 安装方式 | 官方安装包静默安装，**当前用户级**（无需管理员权限） |
| 已安装包 | **146 个**（含依赖） |
| 磁盘占用 | Python 目录 712.5 MB（另有 pip 缓存 260.2 MB，可随时清理） |
| pip | 26.2.2 + setuptools 84.2.1 + wheel 0.48.0 |

## 二、安装与校验过程

1. **网络侦察**：本机直连 `pypi.org` / `python.org` 均超时（国内网络环境），但华为云、npmmirror、清华 PyPI 镜像可用。
2. **获取安装包**：从华为云镜像（与 python.org 同源）下载 `python-3.13.15-amd64.exe`，大小 29,452,944 字节。
3. **完整性校验**：SHA256 `edec09c4853aeae9ac36efb8c9f95b6b8e2fee65eee56d9767a8b7c69c574403`，与官方 SPDX 元数据 `.exe.spdx.json` 中的校验值**完全一致**。
4. **静默安装**：`/quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_launcher=1 Include_tcltk=1 Include_test=0 Include_doc=0`，退出码 0。
5. **PATH 配置**：用户级 PATH 已自动前置：
   ```
   ...\Programs\Python\Python313\Scripts\;...\Programs\Python\Python313\;...\Programs\Python\Launcher\;...\WindowsApps\...;...;c:\users\18182\.local\bin
   ```
   真实 Python 已排在 WindowsApps 占位符**之前**，`where python` 指向真实解释器。

## 三、环境配置

| 配置项 | 值 | 说明 |
|---|---|---|
| pip 镜像 | `https://pypi.tuna.tsinghua.edu.cn/simple`（超时 120s） | 写入 `%APPDATA%\pip\pip.ini`，因直连 PyPI 超时 |
| uv 镜像 | 清华 PyPI | 写入 `%APPDATA%\uv\uv.toml` |
| pipx 程序目录 | `%USERPROFILE%\.local\bin` | 已执行 `pipx ensurepath` 并加入 PATH |
| 开始菜单 | `Python 3.13` 文件夹：IDLE、Python 3.13、Module Docs | 安装器自动创建 |

## 四、已安装组件清单

| 类别 | 组件（版本） |
|---|---|
| 核心工具链 | pip 26.2.2、setuptools 84.2.1、wheel 0.48.0 |
| 包管理 / 虚拟环境 | virtualenv 21.14.12、pipx 1.18.4、**uv 0.13.5** |
| 科学计算 / 数据 | numpy 2.5.4、pandas 3.1.0、scipy 1.18.1、matplotlib 3.11.2 |
| Excel | openpyxl 3.1.5、XlsxWriter 3.3.0、xlrd 2.0.2 |
| Word / PPT | python-docx 1.2.0、python-pptx 1.0.2 |
| PDF | pypdf 6.21.2、reportlab 5.1.0、pdfplumber 0.11.10、pdfminer.six 20260107 |
| 图像 / XML | Pillow 13.0.0、lxml 6.1.3 |
| 网络 / 通用 | requests 2.34.2、httpx 0.28.1、beautifulsoup4 4.15.0、PyYAML 6.0.3、python-dotenv 1.2.4、rich 15.0.0、tqdm 4.70.1、loguru 0.7.3、cryptography 50.0.2 |
| 开发 / 测试 | pytest 9.1.1、pytest-cov 7.1.0、ruff 0.17.1、IPython 9.17.1、JupyterLab 4.6.4、ipywidgets 8.1.9、PyInstaller 6.22.3 |
| 标准库能力 | tkinter（Tk 8.6）、venv、sqlite3、ssl（OpenSSL 3.0.21）、zlib 均正常 |

完整依赖清单见 `requirements-installed.txt`（146 项，`pip freeze` 导出）。

## 五、验证结果

详细日志见 `python-env-verify.log`，验证脚本见 `python_env_verify.py`。

- **模块导入：38/38 通过**
- **功能实测：21/21 通过**
  - 生成 Word / Excel（openpyxl + XlsxWriter）/ PPT / PDF，并可被 pypdf、pdfplumber 反读
  - Pillow 图片、matplotlib 绘图（Agg 后端）正常
  - numpy/pandas/scipy 数值计算、requests/httpx 联网、bs4 解析、PyYAML、lxml、cryptography 加解密
  - tkinter GUI、sqlite3、pytest、ruff 正常运行
- **虚拟环境端到端**：
  - `python -m venv` → 创建成功，venv 内 `pip install requests` 成功
  - `virtualenv` → 创建成功，venv 内安装 httpx 成功
  - `uv venv` + `uv pip install pyyaml` → 成功（走已配置的镜像）
- **py 启动器**：`py -3.13` 正常解析到唯一版本 3.13.15

## 六、日常使用示例

```powershell
# 版本 / 交互式
python --version
py -3.13
python

# 安装包（自动走清华镜像）
pip install 包名
uv pip install 包名        # 更快，推荐
py -m pip install 包名

# 新建项目虚拟环境（推荐）
cd 你的项目
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 或使用 uv（更快）
uv venv .venv
uv pip install 包名 --python .venv\Scripts\python.exe

# 全局安装命令行工具（隔离环境）
pipx install 工具名

# 运行 JupyterLab / IDLE
jupyter lab
idle
```

## 七、注意事项

1. **PATH 生效范围**：新开终端即生效；**已经打开**的终端、资源管理器、以及正在运行的 DSH 会话（其进程环境是启动时快照）需重开/重启后才能直接用 `python` 命令。本报告中的验证均按注册表最新 PATH 执行。
2. **镜像**：本机直连 PyPI 会超时，已配置清华镜像；如未来需要官方源，删除 `%APPDATA%\pip\pip.ini` 即可，或在单个命令加 `-i https://pypi.org/simple`。
3. **用户级安装**：安装在当前 Windows 用户下，无需管理员，也不影响其他用户；若要让所有用户可用，需以管理员运行安装包并勾选 “Install for all users”。
4. **编译 C 扩展**：如某个包没有现成 wheel 需要本地编译，需另装 Visual Studio Build Tools（本次未安装，按需再加）。
5. **matplotlib 中文**：默认字体不含中文，图表中文会显示方框；需要时在 Python 里设置：
   ```python
   import matplotlib
   matplotlib.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "DejaVu Sans"]
   matplotlib.rcParams["axes.unicode_minus"] = False
   ```
6. **安装包**：保留在 `C:\Users\18182\Downloads\python-3.13.15-amd64.exe`，确认无误后可删除（29.5 MB）。
7. **清理空间**：`python -m pip cache purge` 可释放 260 MB pip 缓存。
8. **与 DSH 自带 Python 的关系**：DSH 自身运行时会使用 `C:\Users\18182\.dsh\dsh-runtimes\...\python.exe`（内置 numpy/pandas/python-docx 等），本次安装的是系统级独立 Python，两者互不干扰。

## 八、相关文件

| 文件 | 说明 |
|---|---|
| `requirements-installed.txt` | 当前环境全部 146 个包及版本（`pip freeze` 格式） |
| `python_env_verify.py` | 环境验证脚本，可随时重跑（`python python_env_verify.py`） |
| `python-env-verify.log` | 最近一次完整验证日志 |
