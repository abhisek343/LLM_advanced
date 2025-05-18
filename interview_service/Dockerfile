# Use an official Python runtime as a parent image
FROM python:3.9-slim-buster

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies (if any are needed, e.g., for Pillow or other C-extensions)
RUN apt-get update && apt-get install -y --no-install-recommends gcc build-essential && rm -rf /var/lib/apt/lists/*

# Set BLIS_ARCH to 'generic' to avoid issues with specific sub-architecture detection
ENV BLIS_ARCH=generic

# Copy the requirements file into the container
# This will expect a requirements.txt in the interview_service directory
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code into the container
# This will expect an 'app' directory inside interview_service (e.g., interview_service/app/main.py)
COPY ./app /app/app/

# Copy test files
COPY ./tests /app/tests/
COPY ./pytest.ini /app/pytest.ini

# Expose the port the app runs on (internally in the container)
EXPOSE 8000

# Define the command to run the application
# Assumes the FastAPI app instance is in app/main.py (i.e., interview_service/app/main.py)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
