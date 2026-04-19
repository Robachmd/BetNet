@echo off
REM Always uses backend\.venv so INSTALLED_APPS match pip install -r requirements.txt
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Creating .venv and installing dependencies...
  python -m venv .venv
  call .venv\Scripts\pip.exe install -r requirements.txt
)
.venv\Scripts\python.exe manage.py runserver %*
