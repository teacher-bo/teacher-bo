import os
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def read_file(file_path):
    """Read text file content"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

def process_rulebook_with_llm(ocr_text, reference_format):
    """Process OCR text using ChatGPT to extract and format rules"""
    
    system_prompt = """
당신은 게임 규칙서 편집자입니다. 당신의 임무는 다음과 같습니다:
1. OCR 텍스트에서 게임 규칙과 게임 플레이 관련 콘텐츠만 추출합니다
2. 비규칙 콘텐츠(광고, 게시자 정보, 관련 없는 텍스트)를 삭제합니다
3. reference format과 유사한 markdown 형식으로 콘텐츠를 구성합니다
4. 대부분의 규칙 내용을 유지하세요 - 포괄적이어야 합니다
5. # 기호가 있는 명확한 제목 사용. 각 문단 처음에는 '# <title/subtitle> (n페이지부터)' 형식으로 작성하세요.
6. 논리적 구조와 흐름 유지
7. 모든 중요한 게임 플레이 메커니즘과 세부 사항을 보존합니다
8. 모든 출력은 한국어로 작성합니다
"""

    user_prompt = f"""Reference format example:
{reference_format}

---

Now, process this OCR text and extract only the game rules in a similar markdown format:

{ocr_text}

Remember:
- Keep ALL important rules and gameplay content
- Remove non-rule content (ads, publisher details, etc.)
- Use markdown headings (#, ##, ###)
- Maintain clear structure
- Output in Korean"""

    # Call ChatGPT API
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        # temperature=0.3,
        # max_tokens=4000
    )
    
    return response.choices[0].message.content

def save_to_file(content, output_path):
    """Save processed content to txt file"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    # Set up paths
    base_dir = Path(__file__).parent.parent
    rulebooks_dir = base_dir / "rulebooks"
    
    # Input and output files
    input_file = rulebooks_dir / "Rummikub_rulebook_ocr.txt"
    reference_file = rulebooks_dir / "sabotage_rulebook.txt"
    output_file = rulebooks_dir / "rummikub_rulebook.txt"
    
    print("🔄 Reading files...")
    
    # Read input files
    ocr_text = read_file(input_file)
    reference_format = read_file(reference_file)
    
    print(f"📖 OCR text length: {len(ocr_text)} characters")
    print(f"📖 Reference format length: {len(reference_format)} characters")
    
    print("\n🤖 Processing with ChatGPT...")
    
    # Process with LLM
    processed_content = process_rulebook_with_llm(ocr_text, reference_format)
    
    print(f"✅ Processed content length: {len(processed_content)} characters")
    
    # Save result
    print(f"\n💾 Saving to {output_file}...")
    save_to_file(processed_content, output_file)
    
    print("✨ Done! Rummikub rulebook has been processed and saved.")

if __name__ == "__main__":
    main()
