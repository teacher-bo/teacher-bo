from dotenv import load_dotenv
import requests
import os
from typing import Dict, Any, List
from pathlib import Path

load_dotenv()

class PDFOCRLoader:
    def __init__(self, file_path: str):
        self.file_path = file_path

    def load_document(self):
        # Implement OCR loading logic here
        filename = self.file_path
        api_key = os.getenv("UPSTAGE_API_KEY")
        url = "https://api.upstage.ai/v1/document-digitization"
        headers = {"Authorization": f"Bearer {api_key}"}
        data = {"model": "ocr"}

        # Use context manager to avoid file descriptor leak
        with open(filename, "rb") as f:
            files = {"document": f}
            response = requests.post(url, headers=headers, files=files, data=data, timeout=60)

        # Raise for HTTP errors early
        response.raise_for_status()
        return response.json()

    @staticmethod
    def save_to_txt(document: Dict[str, Any], pdf_path: str, output_filename: str = "Rummikub_rulebook_ocr.txt") -> str:
        """Save OCR result to txt with required format in the same directory as the PDF.

        Format:
        - First line: <PAGE_LEN: N>\n
        - Each page: <PAGE: i>\n{page_text}
        """
        # Determine output path (same directory as the PDF)
        pdf_dir = Path(pdf_path).resolve().parent
        out_path = pdf_dir / output_filename

        # Determine pages and length robustly
        pages: List[Dict[str, Any]] = document.get('pages') or []
        if not isinstance(pages, list):
            pages = []

        page_len = len(pages)
        if page_len == 0:
            # Fallback to metadata when pages array missing
            meta_pages = (document.get('metadata') or {}).get('pages') or []
            if isinstance(meta_pages, list):
                page_len = len(meta_pages)

        # Write file with UTF-8 encoding
        with open(out_path, 'w', encoding='utf-8') as fw:
            fw.write(f"<PAGE_LEN: {page_len}>\n")
            # Page numbering starts from 1
            for page_no in range(1, page_len + 1):
                page_text = ''
                # Access pages safely when list exists
                idx = page_no - 1
                if 0 <= idx < len(pages):
                    page = pages[idx]
                    if isinstance(page, dict):
                        page_text = page.get('text', '') or ''
                fw.write(f"<PAGE: {page_no}>\n")
                fw.write(f"{page_text}\n")

        return str(out_path)

if __name__ == "__main__":
    pdf_path = "../rulebooks/Rummikub_rulebook.pdf"  # Rummikub_rulebook
    loader = PDFOCRLoader(pdf_path)
    document = loader.load_document()

    # Save to txt as specified
    saved_path = PDFOCRLoader.save_to_txt(document, pdf_path, output_filename="Rummikub_rulebook_ocr.txt")
    print(f"Saved OCR text to: {saved_path}")