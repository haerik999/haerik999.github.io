# GitHub Pages 배포 가이드

이 블로그는 GitHub Pages + 커스텀 도메인으로 배포하도록 설정되었습니다.

## 1단계: GitHub 리포지토리 생성

1. GitHub에서 **새로운 리포지토리** 생성
   - 리포지토리 이름: `learning-blog` (또는 원하는 이름)
   - Public으로 설정 (GitHub Pages는 public 리포지토리 필요)

2. 로컬에서 리모트 추가:
```bash
git remote add origin https://github.com/YOUR_USERNAME/learning-blog.git
git branch -M main
git push -u origin main
```

## 2단계: GitHub Pages 설정

1. **리포지토리 설정** → **Settings** → **Pages** 이동
2. **Build and deployment**:
   - Source: `GitHub Actions` 선택
   - (자동으로 `.github/workflows/deploy.yml`을 감지합니다)

## 3단계: 배포 확인

1. **Actions** 탭에서 배포 상태 확인
2. 모든 작업이 완료되면 GitHub Pages URL에서 블로그 확인:
   - `https://YOUR_USERNAME.github.io/learning-blog/`

## 커스텀 도메인 연결 (선택사항)

### 도메인 구매 후:

1. **DNS 설정** (도메인 제공자 사이트에서)
   - GitHub Pages IP 주소를 A 레코드로 추가:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```
   - 또는 CNAME 레코드:
     ```
     your-domain.com CNAME YOUR_USERNAME.github.io
     ```

2. **GitHub 리포지토리 설정**:
   - Settings → Pages → **Custom domain**
   - 도메인 입력 (예: `blog.example.com`)
   - "Enforce HTTPS" 체크 (자동으로 SSL 인증서 적용)

3. DNS가 적용될 때까지 기다림 (보통 5-48시간)

## 블로그 업데이트

새로운 포스트를 작성하면 자동으로 배포됩니다:

1. `posts/` 폴더에 새로운 `.md` 파일 생성
2. 커밋 및 푸시:
```bash
git add posts/new-post.md
git commit -m "Add new post: topic name"
git push
```

3. GitHub Actions가 자동으로 빌드 및 배포

## 빌드 및 테스트 (로컬)

```bash
# 빌드
npm run build

# 빌드 결과 확인
npm run start

# 또는 out 폴더에서 정적 파일 직접 확인
cd out
python -m http.server 3000
```

## 문제 해결

- **배포 실패**: GitHub Actions 탭에서 에러 메시지 확인
- **스타일이 안 보임**: 브라우저 캐시 삭제 후 재방문
- **포스트가 안 보임**: 파일명이 `.md`로 끝나는지 확인, 날짜 형식이 `YYYY-MM-DD`인지 확인
