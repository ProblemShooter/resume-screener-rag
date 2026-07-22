FROM python:3.11-slim

WORKDIR /code

# Copy requirements and install them
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the app, resumes, and pre-built database folders
COPY ./app /code/app
COPY ./resumes /code/resumes
COPY ./chroma_db /code/chroma_db

# Expose Hugging Face default port
EXPOSE 7860

# Run the FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
