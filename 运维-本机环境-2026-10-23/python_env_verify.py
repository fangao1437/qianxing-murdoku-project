# -*- coding: utf-8 -*-
"""Python 环境全面验证：导入、版本、关键功能。"""
import importlib, importlib.metadata as md, os, sys, tempfile, traceback

OUT = []
def log(s=""):
    OUT.append(s)
    print(s)

def ver(dist):
    try:
        return md.version(dist)
    except Exception:
        return "?"

log("=" * 62)
log("Python 环境验证")
log("=" * 62)
log(f"sys.executable : {sys.executable}")
log(f"sys.version    : {sys.version.split()[0]}")
log(f"platform       : {sys.platform} / {os.name}")

# ---- 导入检查 ----
mods = [
    # 数据
    "numpy", "pandas", "scipy", "matplotlib", "openpyxl", "xlsxwriter", "xlrd",
    # 办公/PDF
    "docx", "pptx", "pypdf", "reportlab", "pdfplumber", "pdfminer", "PIL", "lxml",
    # 网络/通用
    "requests", "httpx", "bs4", "yaml", "dotenv", "rich", "tqdm", "loguru", "cryptography",
    # 开发/工具
    "pytest", "IPython", "jupyterlab", "jupyter_client", "PyInstaller",
    "virtualenv", "pipx", "setuptools", "wheel", "tkinter", "venv", "ssl", "sqlite3", "zlib",
]
log("\n[1] 模块导入检查")
failed = []
for m in mods:
    try:
        importlib.import_module(m)
        log(f"  OK   {m}")
    except Exception as e:
        failed.append((m, e))
        log(f"  FAIL {m}: {e}")

versions = {
    "Python": sys.version.split()[0],
    "pip": ver("pip"),
    "setuptools": ver("setuptools"),
    "wheel": ver("wheel"),
    "virtualenv": ver("virtualenv"),
    "pipx": ver("pipx"),
    "pytest": ver("pytest"),
    "ruff": ver("ruff"),
    "numpy": ver("numpy"),
    "pandas": ver("pandas"),
    "scipy": ver("scipy"),
    "matplotlib": ver("matplotlib"),
    "openpyxl": ver("openpyxl"),
    "xlsxwriter": ver("XlsxWriter"),
    "xlrd": ver("xlrd"),
    "python-docx": ver("python-docx"),
    "python-pptx": ver("python-pptx"),
    "pypdf": ver("pypdf"),
    "reportlab": ver("reportlab"),
    "pdfplumber": ver("pdfplumber"),
    "pillow": ver("pillow"),
    "lxml": ver("lxml"),
    "requests": ver("requests"),
    "httpx": ver("httpx"),
    "beautifulsoup4": ver("beautifulsoup4"),
    "pyyaml": ver("pyyaml"),
    "python-dotenv": ver("python-dotenv"),
    "rich": ver("rich"),
    "tqdm": ver("tqdm"),
    "loguru": ver("loguru"),
    "cryptography": ver("cryptography"),
    "ipython": ver("ipython"),
    "jupyterlab": ver("jupyterlab"),
    "pyinstaller": ver("pyinstaller"),
    "typing_extensions": ver("typing_extensions"),
}
log("\n[2] 已安装版本")
for k, v in versions.items():
    log(f"  {k:<18} {v}")

# ---- 功能检查 ----
log("\n[3] 功能实测")
tmp = tempfile.mkdtemp(prefix="pyverify_")
func_ok, func_fail = [], []

def check(name, fn):
    try:
        fn()
        func_ok.append(name)
        log(f"  OK   {name}")
    except Exception as e:
        func_fail.append((name, e))
        log(f"  FAIL {name}: {e}")
        traceback.print_exc(limit=2)

def f_docx():
    from docx import Document
    d = Document()
    d.add_heading("验证标题", 0)
    d.add_paragraph("python-docx 功能正常")
    p = os.path.join(tmp, "t.docx"); d.save(p)
    assert os.path.getsize(p) > 0

def f_xlsx():
    from openpyxl import Workbook
    wb = Workbook(); ws = wb.active
    ws["A1"] = "hello"; ws["B1"] = "=1+2"
    p = os.path.join(tmp, "t.xlsx"); wb.save(p)
    assert os.path.getsize(p) > 0

def f_xlsxwriter():
    import xlsxwriter
    p = os.path.join(tmp, "t2.xlsx")
    wb = xlsxwriter.Workbook(p); ws = wb.add_worksheet(); ws.write(0, 0, "x"); wb.close()
    assert os.path.getsize(p) > 0

def f_pptx():
    from pptx import Presentation
    pr = Presentation(); s = pr.slides.add_slide(pr.slide_layouts[1])
    s.shapes.title.text = "验证"
    p = os.path.join(tmp, "t.pptx"); pr.save(p)
    assert os.path.getsize(p) > 0

def f_pdf():
    from reportlab.pdfgen import canvas
    from pypdf import PdfReader
    p = os.path.join(tmp, "t.pdf")
    c = canvas.Canvas(p); c.drawString(100, 750, "reportlab OK"); c.save()
    r = PdfReader(p); assert len(r.pages) == 1
    txt = r.pages[0].extract_text() or ""
    assert "reportlab" in txt

def f_pdfplumber():
    import pdfplumber
    p = os.path.join(tmp, "t.pdf")
    with pdfplumber.open(p) as pdf:
        assert len(pdf.pages) == 1

def f_pillow():
    from PIL import Image, ImageDraw
    im = Image.new("RGB", (120, 60), "white")
    ImageDraw.Draw(im).text((5, 20), "PIL OK", fill="black")
    p = os.path.join(tmp, "t.png"); im.save(p)
    assert os.path.getsize(p) > 0

def f_matplotlib():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np
    fig, ax = plt.subplots()
    ax.plot(np.linspace(0, 1, 10), np.sin(np.linspace(0, 3, 10)))
    p = os.path.join(tmp, "t.png"); fig.savefig(p); plt.close(fig)
    assert os.path.getsize(p) > 0

def f_numpy_pandas():
    import numpy as np, pandas as pd
    a = np.arange(10); assert int(a.sum()) == 45
    df = pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6]})
    df["c"] = df["a"] + df["b"]
    assert int(df["c"].sum()) == 21
    assert pd.__version__

def f_scipy():
    from scipy import integrate
    v, _ = integrate.quad(lambda x: x * x, 0, 1); assert abs(v - 1/3) < 1e-9

def f_requests():
    import requests
    r = requests.get("https://mirrors.huaweicloud.com/python/", timeout=20)
    assert r.status_code == 200

def f_httpx():
    import httpx
    with httpx.Client(timeout=20) as c:
        r = c.get("https://pypi.tuna.tsinghua.edu.cn/simple/")
        assert r.status_code == 200

def f_bs4():
    from bs4 import BeautifulSoup
    s = BeautifulSoup("<p>hello <b>world</b></p>", "html.parser")
    assert s.b.text == "world"

def f_yaml():
    import yaml
    assert yaml.safe_load(yaml.safe_dump({"a": 1}))["a"] == 1

def f_lxml():
    from lxml import etree
    root = etree.fromstring("<a><b>1</b></a>")
    assert root.find("b").text == "1"

def f_crypto():
    from cryptography.fernet import Fernet
    k = Fernet.generate_key(); f = Fernet(k)
    assert f.decrypt(f.encrypt(b"secret")) == b"secret"

def f_tkinter():
    import tkinter
    assert tkinter.TkVersion > 0

def f_sqlite():
    import sqlite3
    con = sqlite3.connect(":memory:")
    con.execute("create table t(a int)"); con.execute("insert into t values (1)")
    assert con.execute("select sum(a) from t").fetchone()[0] == 1
    con.close()

def f_venv_module():
    import venv, ensurepip
    assert venv and ensurepip

def f_pytest_runner():
    import subprocess
    r = subprocess.run([sys.executable, "-m", "pytest", "--version"],
                       capture_output=True, text=True)
    assert r.returncode == 0 and "pytest" in r.stdout

def f_ruff_runner():
    import subprocess
    r = subprocess.run([sys.executable, "-m", "ruff", "--version"],
                       capture_output=True, text=True)
    assert r.returncode == 0 and "ruff" in r.stdout

check("python-docx 生成 Word", f_docx)
check("openpyxl 生成 Excel", f_xlsx)
check("XlsxWriter 生成 Excel", f_xlsxwriter)
check("python-pptx 生成 PPT", f_pptx)
check("reportlab+pypdf 生成/读取 PDF", f_pdf)
check("pdfplumber 读取 PDF", f_pdfplumber)
check("Pillow 图片处理", f_pillow)
check("matplotlib 绘图", f_matplotlib)
check("numpy+pandas 计算", f_numpy_pandas)
check("scipy 数值积分", f_scipy)
check("requests 联网", f_requests)
check("httpx 联网", f_httpx)
check("beautifulsoup4 解析", f_bs4)
check("pyyaml 读写", f_yaml)
check("lxml 解析", f_lxml)
check("cryptography 加解密", f_crypto)
check("tkinter GUI", f_tkinter)
check("sqlite3 数据库", f_sqlite)
check("venv 标准库", f_venv_module)
check("pytest 运行", f_pytest_runner)
check("ruff 运行", f_ruff_runner)

log("\n" + "=" * 62)
log(f"模块导入: {len(mods) - len(failed)}/{len(mods)} 通过")
log(f"功能实测: {len(func_ok)}/{len(func_ok) + len(func_fail)} 通过")
if failed:
    log("导入失败: " + ", ".join(m for m, _ in failed))
if func_fail:
    log("功能失败: " + ", ".join(n for n, _ in func_fail))
log("RESULT: " + ("ALL PASS" if not failed and not func_fail else "HAS FAILURES"))
with open(os.path.join(tmp, "verify.log"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(OUT))
print("LOG:", os.path.join(tmp, "verify.log"))
sys.exit(0 if not failed and not func_fail else 1)
