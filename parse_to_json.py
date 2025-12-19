import sys
import json
from bs4 import BeautifulSoup

def parse_questions_to_js(file_path, output_file='questions.js'):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        return

    soup = BeautifulSoup(content, 'html.parser')
    
    questions = soup.find_all('li', class_='subject')
    
    questions_data = []
    
    for idx, q in enumerate(questions, 1):
        q_data = {
            "id": idx,
            "type": "Unknown",
            "question": "",
            "options": [],
            "answer": ""
        }

        # Extract Question Type
        type_span = q.find('span', class_='subject-point')
        if type_span:
            type_text_span = type_span.find('span', class_='ng-binding')
            q_data["type"] = type_text_span.get_text(strip=True) if type_text_span else "Unknown"

        # Extract Question Text
        desc_span = q.find('span', class_='subject-description')
        if desc_span:
            q_data["question"] = desc_span.get_text(strip=True)
        else:
            q_data["question"] = "[No Question Text Found]"
        
        # Extract Options
        options = q.find_all('li', class_='option')
        if options:
            for opt in options:
                index_span = opt.find('span', class_='option-index')
                opt_index = index_span.get_text(strip=True) if index_span else "?"
                
                content_div = opt.find('div', class_='option-content')
                opt_content = content_div.get_text(strip=True) if content_div else ""
                
                q_data["options"].append({
                    "label": opt_index,
                    "content": opt_content
                })
        
        # Extract Correct Answer
        answer_div = q.find('div', class_='answer-options')
        if answer_div:
            fill_in_answers = answer_div.find_all('div', class_='correct_answer')
            if fill_in_answers:
                answers = []
                for ans_div in fill_in_answers:
                    sort_span = ans_div.find('span', class_='sort')
                    sort_idx = sort_span.get_text(strip=True) if sort_span else "?"
                    
                    ans_ul = ans_div.find('ul')
                    if ans_ul:
                        ans_li = ans_ul.find('li')
                        if ans_li:
                            ans_text = ans_li.get_text(strip=True)
                            answers.append({"index": sort_idx, "text": ans_text})
                q_data["answer"] = answers
            else:
                answer_spans = answer_div.find_all('span')
                correct_answer = ""
                for span in answer_spans:
                    text = span.get_text(strip=True)
                    if text != "正确答案:":
                        correct_answer = text
                        break
                q_data["answer"] = correct_answer
        
        questions_data.append(q_data)

    print(f"Found {len(questions_data)} questions. Writing to {output_file}...")
    
    with open(output_file, 'w', encoding='utf-8') as js_file:
        js_content = json.dumps(questions_data, ensure_ascii=False, indent=2)
        js_file.write(f"const QUESTION_DATA = {js_content};")

    print(f"Successfully wrote JS to {output_file}")

if __name__ == "__main__":
    parse_questions_to_js('page.html')
