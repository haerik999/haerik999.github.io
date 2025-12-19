---
title: "Next.js 기초 개념"
date: "2025-12-18"
category: "Next.js"
excerpt: "Next.js의 기본 개념과 App Router에 대해 알아봅니다."
---

# Next.js 기초 개념

Next.js는 React 위에 구축된 풀스택 프레임워크입니다. 개발 환경 설정부터 프로덕션 최적화까지 모두 지원합니다.

## App Router (Next.js 13+)

Next.js 13부터 도입된 새로운 라우팅 시스템입니다.

### 파일 구조

```
app/
├── page.tsx           # 루트 경로 (/)
├── layout.tsx         # 레이아웃
├── posts/
│   ├── page.tsx       # /posts
│   └── [id]/
│       └── page.tsx   # /posts/[id]
```

### 동적 라우트

`[id]` 같은 대괄호로 감싼 폴더명이 동적 라우트입니다.

```typescript
export function generateStaticParams() {
  return [{ id: '1' }, { id: '2' }];
}

export default function Page({ params }: { params: { id: string } }) {
  return <div>Post {params.id}</div>;
}
```

## 서버 컴포넌트

Next.js의 컴포넌트는 기본적으로 **서버 컴포넌트**입니다.

### 서버 컴포넌트의 장점

- 데이터베이스에 직접 접근 가능
- 민감한 정보를 클라이언트에 노출하지 않음
- 큰 의존성을 클라이언트에 보내지 않음

### 클라이언트 컴포넌트

`'use client'` 지시문을 사용해 클라이언트 컴포넌트를 명시합니다.

```typescript
'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

이러한 기능들이 Next.js를 강력하게 만듭니다.
