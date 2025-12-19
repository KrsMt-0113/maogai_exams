import sys
from bs4 import BeautifulSoup

def parse_questions(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        return

    soup = BeautifulSoup(content, 'html.parser')
    
    # Find all question blocks
    # Based on analysis: <li class="subject ...">
    questions = soup.find_all('li', class_='subject')
    
    print(f"Found {len(questions)} questions.\n")
    
    for idx, q in enumerate(questions, 1):
        # Extract Question Type
        type_span = q.find('span', class_='subject-point')
        if type_span:
            # The type is usually in the first span with class ng-binding inside subject-point
            # But subject-point contains multiple spans.
            # <span ng-bind="subjectTypeMap[subject.type]" class="ng-binding">单选题</span>
            type_text_span = type_span.find('span', class_='ng-binding')
            q_type = type_text_span.get_text(strip=True) if type_text_span else "Unknown"
        else:
            q_type = "Unknown"

        # Extract Question Text
        desc_span = q.find('span', class_='subject-description')
        if desc_span:
            question_text = desc_span.get_text(strip=True)
        else:
            question_text = "[No Question Text Found]"
            
        print(f"Question {idx} [{q_type}]: {question_text}")
        
        # Extract Options
        options = q.find_all('li', class_='option')
        if options:
            print("Options:")
            for opt in options:
                # Option Index (A, B, C...)
                index_span = opt.find('span', class_='option-index')
                opt_index = index_span.get_text(strip=True) if index_span else "?"
                
                # Option Content
                content_div = opt.find('div', class_='option-content')
                opt_content = content_div.get_text(strip=True) if content_div else ""
                
                print(f"  {opt_index}. {opt_content}")
        
        # Extract Correct Answer
        answer_div = q.find('div', class_='answer-options')
        if answer_div:
            # Check for fill-in-the-blank answers first (div.correct_answer)
            fill_in_answers = answer_div.find_all('div', class_='correct_answer')
            if fill_in_answers:
                print("Correct Answer(s):")
                for ans_div in fill_in_answers:
                    # Get the index (1, 2, etc.)
                    sort_span = ans_div.find('span', class_='sort')
                    sort_idx = sort_span.get_text(strip=True) if sort_span else "?"
                    
                    # Get the answer text
                    ans_ul = ans_div.find('ul')
                    if ans_ul:
                        ans_li = ans_ul.find('li')
                        if ans_li:
                            ans_text = ans_li.get_text(strip=True)
                            print(f"  Blank {sort_idx}: {ans_text}")
            else:
                # Standard multiple choice answer
                # The structure is <span>正确答案:</span> <span ...>B</span>
                answer_spans = answer_div.find_all('span')
                correct_answer = ""
                for span in answer_spans:
                    text = span.get_text(strip=True)
                    if text != "正确答案:":
                        correct_answer = text
                        break
                
                if correct_answer:
                    print(f"Correct Answer: {correct_answer}")
                else:
                    print("Correct Answer: [Not Found]")
        else:
            # Try to find answer in other formats if necessary
            print("Correct Answer: [Not Found]")
            
        print("-" * 40)

if __name__ == "__main__":
    parse_questions('page.html')
