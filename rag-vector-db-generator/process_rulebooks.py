import os
import shutil
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

def clean_directories():
    """Clean target-text and final-rulebook directories before processing"""
    base_dir = Path(__file__).parent
    
    dirs_to_clean = [
        base_dir / "rulebooks" / "target-text",
        base_dir / "rulebooks" / "final-rulebook"
    ]
    
    print("🧹 Cleaning directories...")
    for dir_path in dirs_to_clean:
        if dir_path.exists():
            shutil.rmtree(dir_path)
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f"  ✅ Cleaned: {dir_path}")
    print()

def get_game_names_from_pdfs():
    """Extract game names from PDF files in target-pdf folders"""
    base_dir = Path(__file__).parent
    pdf_dirs = [
        base_dir / "rulebooks" / "target-pdf" / "by-ocr",
        base_dir / "rulebooks" / "target-pdf" / "by-text"
    ]
    
    game_names = {}
    
    for pdf_dir in pdf_dirs:
        if not pdf_dir.exists():
            continue
            
        for pdf_file in pdf_dir.glob("*.rulebook.pdf"):
            game_name = pdf_file.stem.replace(".rulebook", "")
            source_type = pdf_dir.name.replace("by-", "")
            game_names[game_name] = {
                "pdf_path": pdf_file,
                "source_type": source_type
            }
    
    return game_names

def process_pdf_to_text(game_name: str, pdf_path: Path, source_type: str):
    """Process PDF to text using appropriate loader"""
    from loaders.pdf_loader import PDFLoader
    from loaders.pdf_ocr_loader import PDFOCRLoader
    
    base_dir = Path(__file__).parent
    output_path = base_dir / "rulebooks" / "target-text" / f"{game_name}.rulebook_text.txt"
    
    print(f"📄 Processing {game_name} ({source_type})...")
    
    if source_type == "ocr":
        loader = PDFOCRLoader(str(pdf_path))
        document = loader.load_document()
        saved_path = PDFOCRLoader.save_to_txt(
            document, 
            str(pdf_path), 
            output_filename=output_path.name
        )
        # Move to correct location if needed
        if Path(saved_path) != output_path:
            shutil.move(saved_path, output_path)
    else:  # by-text
        loader = PDFLoader(str(pdf_path))
        documents = loader.load_documents()
        
        # Combine all pages into single text file
        with open(output_path, 'w', encoding='utf-8') as f:
            for i, doc in enumerate(documents, 1):
                f.write(f"<PAGE: {i}>\n")
                f.write(doc.page_content)
                f.write("\n\n")
    
    print(f"  ✅ Saved to: {output_path}")
    return output_path

def process_text_to_final(game_name: str, text_path: Path):
    """Process text to final markdown using LLM"""
    from tools.text_to_markdown_by_llm import TextToMarkdownConverter
    
    base_dir = Path(__file__).parent
    output_path = base_dir / "rulebooks" / "final-rulebook" / f"{game_name}.rulebook.txt"
    reference_path = base_dir / "rulebooks" / "sabotage_rulebook.txt"
    
    print(f"🤖 Converting {game_name} to markdown with LLM...")
    
    converter = TextToMarkdownConverter()
    converter.convert_file(
        input_path=text_path,
        output_path=output_path,
        reference_path=reference_path if reference_path.exists() else None
    )
    
    print(f"  ✅ Saved to: {output_path}")
    return output_path

def main():
    """Main processing pipeline"""
    print("=" * 80)
    print("🎮 Rulebook Processing Pipeline")
    print("=" * 80)
    print()
    
    # Step 1: Clean directories
    clean_directories()
    
    # Step 2: Get game names from PDFs
    print("🔍 Scanning for rulebook PDFs...")
    game_names = get_game_names_from_pdfs()
    
    if not game_names:
        print("❌ No rulebook PDFs found in target-pdf folders!")
        print("   Please add PDFs in format: {game_name}.rulebook.pdf")
        print("   to rulebooks/target-pdf/by-ocr/ or rulebooks/target-pdf/by-text/")
        return
    
    print(f"  ✅ Found {len(game_names)} game(s): {', '.join(game_names.keys())}")
    print()
    
    # Step 3-4: Process each game
    for game_name, info in game_names.items():
        print(f"📚 Processing: {game_name}")
        print("-" * 80)
        
        # PDF to text
        text_path = process_pdf_to_text(
            game_name, 
            info["pdf_path"], 
            info["source_type"]
        )
        
        # Text to final markdown
        final_path = process_text_to_final(game_name, text_path)
        
        print()
    
    print("=" * 80)
    print("✨ All rulebooks processed successfully!")
    print("=" * 80)

if __name__ == "__main__":
    main()
