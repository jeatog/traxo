# --- Fase 1: Build ---
# Instala dependencias de Python y pre-descarga modelos EasyOCR
FROM python:3.12-slim AS builder

WORKDIR /build

# Deps de sistema necesarias para instalar easyocr/torch en el builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-descargar modelos EasyOCR (es + en) para evitar descarga en runtime.
# Los modelos se guardan en /root/.EasyOCR/ y se copian a la imagen final.
RUN python -c "import easyocr; easyocr.Reader(['es', 'en'], gpu=False, verbose=False)"


# --- Fase 2: Final ---
# Imagen de producción con dependencias de Chromium y OpenCV en runtime
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libxkbcommon0 libpango-1.0-0 libcairo2 libasound2 \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copiar el entorno virtual desde el builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copiar modelos EasyOCR pre-descargados (evita descarga al arrancar)
COPY --from=builder /root/.EasyOCR /root/.EasyOCR

# Instalar el browser de Playwright en la imagen final (los binarios van a ~/.cache)
RUN playwright install chromium

COPY ./app ./app

EXPOSE 3000
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "3000"]
