import os
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class TextToMarkdownConverter:
    """Convert raw text to markdown format using LLM"""
    
    def __init__(self, model: str = "gpt-4o", api_key: str = None):
        """
        Initialize the converter
        
        Args:
            model: OpenAI model to use (default: gpt-4o)
            api_key: OpenAI API key (default: from env OPENAI_API_KEY)
        """
        self.model = model
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        self.system_prompt = """
당신은 게임 규칙서 편집자입니다. 당신의 임무는 다음과 같습니다:
1. 입력 받은 텍스트에서 게임 규칙과 게임 플레이 관련 콘텐츠는 모두 원문 그대로 유지합니다 (절대로 없애거나, 바꾸지 말 것)
2. (광고, 보드게임 회사 정보)를 삭제합니다
3. reference format과 유사한 markdown 형식으로 콘텐츠를 구성합니다
4. # 기호가 있는 명확한 제목 사용. 각 문단 처음에는 '# <title/subtitle> (n페이지부터)' 형식으로 작성하세요.
5. 모든 출력은 한국어로 작성합니다
"""
    
    def read_file(self, file_path: Path) -> str:
        """Read text file content"""
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def save_file(self, content: str, output_path: Path):
        """Save content to file"""
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def convert(self, text_content: str, reference_format: str = "") -> str:
        """
        Convert text to markdown format using LLM
        
        Args:
            text_content: Raw text content to convert
            reference_format: Reference markdown format for style guidance
            
        Returns:
            Converted markdown text
        """
        user_prompt = f"""Reference format example:
{reference_format}

---

Now, process this text and extract only the game rules in a similar markdown format:

{text_content}

Remember:
- Keep ALL important rules and gameplay content
- Remove non-rule content (ads, publisher details, etc.)
- Use markdown headings (#, ##, ###)
- Maintain clear structure
- Output in Korean"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": user_prompt}
            ],
        )
        
        return response.choices[0].message.content
    
    def convert_file(self, input_path: Path, output_path: Path, reference_path: Path = None) -> Path:
        """
        Convert text file to markdown and save
        
        Args:
            input_path: Input text file path
            output_path: Output markdown file path
            reference_path: Optional reference markdown file path
            
        Returns:
            Path to output file
        """
        # Read input
        text_content = self.read_file(input_path)
        
        # Read reference if provided
        reference_format = ""
        if reference_path and reference_path.exists():
            reference_format = self.read_file(reference_path)
        
        # Convert
        markdown_content = self.convert(text_content, reference_format)
        
        # Save
        self.save_file(markdown_content, output_path)
        
        return output_path

def main():
    """Example usage for testing"""
    base_dir = Path(__file__).parent.parent
    rulebooks_dir = base_dir / "rulebooks"
    
    input_file = rulebooks_dir / "Rummikub_rulebook_ocr.txt"
    reference_file = rulebooks_dir / "sabotage_rulebook.txt"
    output_file = rulebooks_dir / "rummikub_rulebook.txt"
    
    print("🔄 Initializing converter...")
    converter = TextToMarkdownConverter()
    
    print(f"📖 Reading: {input_file.name}")
    print(f"📖 Reference: {reference_file.name}")
    
    print("\n🤖 Converting with LLM...")
    result_path = converter.convert_file(
        input_path=input_file,
        output_path=output_file,
        reference_path=reference_file
    )
    
    print(f"✅ Saved to: {result_path}")
    print("✨ Done!")


if __name__ == "__main__":
    main()
