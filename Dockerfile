FROM python:3.11-slim

# Install Manim system dependencies and build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    ffmpeg \
    libcairo2-dev \
    libpango1.0-dev \
    libgl1-mesa-dev \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY backend/ ./backend/
COPY CodeAnimator.py .

# Create required directories
RUN mkdir -p backend/uploads backend/outputs

WORKDIR /app/backend

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
