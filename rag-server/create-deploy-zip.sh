zip -r ../deploy.zip \
        application.py \
        requirements.txt \
        Procfile \
        app/ \
        chroma_db/ \
        .ebextensions/ \
        .ebignore \
        .env \
        -x "*.pyc" \
        -x "__pycache__/*" \
        -x "app/__pycache__/*" \
        -x "*.DS_Store" \
        -x "venv/*"