import os
import random
import datetime

# 설정
OUTPUT_DIR = 'posts'
NUM_POSTS = 100
CATEGORIES = [
    'Rust', 'Go', 'TypeScript', 'WebRTC', 'Tauri', 
    'Python', 'React', 'Vue', 'Next.js', 'Node.js',
    'System Design', 'Database', 'DevOps', 'Algorithm'
]

# 카테고리별 키워드 및 코드 템플릿 데이터
CATEGORY_DATA = {
    'Rust': {
        'keywords': ['Ownership', 'Borrowing', 'Lifetimes', 'Cargo', 'Tokio', 'Async/Await', 'Pattern Matching', 'Traits'],
        'code': 'fn main() {\n    println!("Hello, Rust!");\n    let x = 5;\n    let y = &x;\n}'
    },
    'Go': {
        'keywords': ['Goroutines', 'Channels', 'Interfaces', 'Defer', 'Pointers', 'Structs', 'Go Modules', 'Concurrency'],
        'code': 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, Go!")\n}'
    },
    'TypeScript': {
        'keywords': ['Interface', 'Generics', 'Utility Types', 'Decorators', 'Enums', 'Type Inference', 'Union Types'],
        'code': 'interface User {\n  id: number;\n  name: string;\n}\n\nconst user: User = { id: 1, name: "Alice" };'
    },
    'WebRTC': {
        'keywords': ['RTCPeerConnection', 'Signaling', 'STUN/TURN', 'ICE Candidates', 'Data Channels', 'MediaStream', 'SDP'],
        'code': 'const peerConnection = new RTCPeerConnection(configuration);\nawait peerConnection.setLocalDescription(offer);'
    },
    'Tauri': {
        'keywords': ['Rust Backend', 'WebView', 'IPC', 'Security', 'Cross-platform', 'Performance', 'Bundle'],
        'code': '#[tauri::command]\nfn greet(name: &str) -> String {\n    format!("Hello, {}!", name)\n}'
    },
    'Python': {
        'keywords': ['Decorators', 'Generators', 'Asyncio', 'Pandas', 'FastAPI', 'Django', 'Type Hinting', 'Virtual Environments'],
        'code': 'def hello_world(name: str) -> str:\n    return f"Hello, {name}"'
    },
    'React': {
        'keywords': ['Hooks', 'useEffect', 'useMemo', 'Context API', 'Server Components', 'Suspense', 'Virtual DOM', 'JSX'],
        'code': 'export default function App() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;\n}'
    },
    'Vue': {
        'keywords': ['Composition API', 'Reactivity', 'Templates', 'Directives', 'Vuex', 'Pinia', 'Lifecycle Hooks', 'SFC'],
        'code': '<script setup>\nimport { ref } from "vue"\nconst count = ref(0)\n</script>\n<template>\n  <button @click="count++">{{ count }}</button>\n</template>'
    },
    'Next.js': {
        'keywords': ['App Router', 'Server Actions', 'SSR', 'ISR', 'Image Optimization', 'Routing', 'Middleware'],
        'code': 'export default async function Page() {\n  const data = await getData();\n  return <main>{data.title}</main>;\n}'
    },
    'Node.js': {
        'keywords': ['Event Loop', 'Streams', 'Buffer', 'Express', 'NestJS', 'FileSystem', 'Modules', 'NPM'],
        'code': 'const http = require("http");\n\nconst server = http.createServer((req, res) => {\n  res.end("Hello Node!");\n});'
    },
    'System Design': {
        'keywords': ['Load Balancing', 'Caching', 'Sharding', 'CAP Theorem', 'Microservices', 'Message Queues', 'CDN'],
        'code': '// Consistent Hashing Concept\nclass ConsistentHashing {\n  addNode(node) { ... }\n  getNode(key) { ... }\n}'
    },
    'Database': {
        'keywords': ['Indexing', 'Normalization', 'ACID', 'NoSQL', 'Replication', 'Sharding', 'Transactions', 'SQL'],
        'code': 'SELECT * FROM users WHERE active = true ORDER BY created_at DESC;'
    },
    'DevOps': {
        'keywords': ['Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'Monitoring', 'Logging', 'AWS', 'GitHub Actions'],
        'code': 'FROM node:18-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD ["npm", "start"]'
    },
    'Algorithm': {
        'keywords': ['Dynamic Programming', 'Graph Theory', 'Sorting', 'Binary Search', 'Recursion', 'Time Complexity', 'Trees'],
        'code': 'def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: left = mid + 1\n        else: right = mid - 1\n    return -1'
    }
}

def generate_random_date():
    start_date = datetime.date(2024, 1, 1)
    end_date = datetime.date(2025, 12, 19)
    time_between_dates = end_date - start_date
    days_between_dates = time_between_dates.days
    random_number_of_days = random.randrange(days_between_dates)
    random_date = start_date + datetime.timedelta(days=random_number_of_days)
    return random_date.strftime("%Y-%m-%d")

def generate_content(category, title):
    data = CATEGORY_DATA.get(category, CATEGORY_DATA['Rust'])
    keywords = data['keywords']
    code_snippet = data['code']
    
    intro_keywords = random.sample(keywords, 2)
    body_keywords = random.sample(keywords, 3)
    
    content = f"""
# {title}

{category} 개발을 하다 보면 마주치게 되는 **{intro_keywords[0]}**와 **{intro_keywords[1]}**에 대해 깊이 있게 탐구해 봅니다. 이 글에서는 실무에서 자주 발생하는 문제 상황과 그 해결책을 중심으로 설명합니다.

## 1. 개요

현대적인 소프트웨어 개발 환경에서 {category}의 중요성은 날로 커지고 있습니다. 특히 성능과 안정성을 모두 잡기 위한 다양한 시도들이 이어지고 있습니다. 우리가 주목해야 할 핵심은 바로 효율적인 리소스 관리와 아키텍처의 유연성입니다.

## 2. 핵심 개념: {body_keywords[0]}

가장 먼저 이해해야 할 개념은 {body_keywords[0]}입니다. 이는 전체 시스템의 구조를 잡는 데 있어 초석이 됩니다.

> {category}의 철학을 이해하면 코드를 작성하는 방식이 완전히 달라집니다.

### 주요 특징

- **{body_keywords[1]}**: 성능 최적화의 핵심입니다.
- **{body_keywords[2]}**: 유지보수성을 높여주는 강력한 도구입니다.
- 확장성: 대규모 시스템에서도 안정적으로 동작합니다.

## 3. 구현 예제

백문이 불여일견입니다. 실제 코드를 통해 살펴보겠습니다. 아래는 {category}에서 자주 사용되는 패턴의 단순화된 예제입니다.

```{'tsx' if category in ['React', 'Next.js', 'TypeScript'] else category.lower().replace('.', '')}
{code_snippet}
```

이 코드는 단순해 보이지만, 내부적으로 많은 처리가 이루어지고 있습니다. 특히 메모리 관리와 에러 처리 측면에서 배울 점이 많습니다.

## 4. 심화 학습: {random.choice(keywords)}

기본기를 다졌다면, 이제 심화 주제로 넘어갈 차례입니다. {category} 생태계는 매우 방대하여 끊임없이 새로운 도구와 라이브러리가 등장합니다.

1. 공식 문서를 꼼꼼히 읽어보세요.
2. 오픈 소스 프로젝트를 분석해보는 것도 좋은 방법입니다.
3. 커뮤니티 활동을 통해 최신 트렌드를 파악하세요.

## 결론

지금까지 {category}의 {title}에 대해 알아보았습니다. **{intro_keywords[0]}** 개념을 확실히 잡고 간다면, 앞으로의 개발 여정이 훨씬 수월해질 것입니다. 꾸준한 학습과 실습만이 실력을 향상시키는 지름길입니다.

더 궁금한 점이 있다면 언제든지 댓글이나 메일로 문의해 주세요. Happy Coding!
"""
    return content

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    for i in range(NUM_POSTS):
        category = random.choice(CATEGORIES)
        data = CATEGORY_DATA.get(category, CATEGORY_DATA['Rust'])
        keyword = random.choice(data['keywords'])
        
        # 제목 생성 (랜덤 조합)
        prefixes = ["완벽 가이드", "실전 예제", "심층 분석", "기초부터 시작하는", "마스터하기", "트러블슈팅", "핵심 정리", "10분 만에 배우는"]
        suffixes = ["활용법", "패턴", "Best Practices", "튜토리얼", "팁과 노하우", "동향", "아키텍처"]
        
        title = f"{category} {keyword} {random.choice(suffixes)}"
        if random.random() > 0.5:
            title = f"{random.choice(prefixes)} {category} {keyword}"
            
        slug = f"{category.lower().replace('.', '')}-{keyword.lower().replace('/', '-')}-{i}".replace(' ', '-')
        date = generate_random_date()
        
        excerpt_pool = [
            f"{category}의 핵심 기능인 {keyword}에 대해 자세히 알아보고 실무 적용 방법을 탐구합니다.",
            f"초보자부터 전문가까지, {category} {keyword}를 마스터하기 위한 필수 가이드입니다.",
            f"최근 프로젝트에서 경험한 {category} {keyword} 관련 이슈와 해결 과정을 공유합니다.",
            f"{category} 개발 효율을 200% 높여주는 {keyword} 활용 팁을 공개합니다."
        ]
        excerpt = random.choice(excerpt_pool)

        content = f"""
---
title: "{title}"
date: "{date}"
category: "{category}"
excerpt: "{excerpt}"
---
{generate_content(category, title)}
"""
        
        file_path = os.path.join(OUTPUT_DIR, f"{slug}.md")
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content.strip())
            
    print(f"Successfully generated {NUM_POSTS} sample posts in '{OUTPUT_DIR}' directory.")

if __name__ == "__main__":
    main()
