---
title: "React Hooks 완벽 가이드"
date: "2025-12-19"
category: "React"
excerpt: "React Hooks를 처음부터 이해하고 실무에서 활용하는 방법을 배워보세요."
---

# React Hooks 완벽 가이드

React Hooks는 함수형 컴포넌트에서 state와 다른 React 기능들을 사용할 수 있게 해주는 기능입니다.

## useState Hook

가장 기본적인 Hook으로, 함수형 컴포넌트에 state를 추가합니다.

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        증가
      </button>
    </div>
  );
}
```

## useEffect Hook

컴포넌트가 렌더링된 후 부수 효과(side effect)를 실행할 때 사용합니다.

```jsx
useEffect(() => {
  // 마운트될 때 실행
  console.log('컴포넌트 마운트됨');

  return () => {
    // 언마운트될 때 실행
    console.log('컴포넌트 언마운트됨');
  };
}, []);
```

## 의존성 배열

- `[]` - 마운트/언마운트 시점에만 실행
- `[dependency]` - dependency 변경될 때마다 실행
- 없음 - 매 렌더링 후 실행

이를 통해 효율적인 성능 최적화를 할 수 있습니다.
