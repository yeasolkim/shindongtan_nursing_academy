# 신동탄간호학원 웹사이트 코드 최적화 가이드

## 개요
헤더, 푸터, page-hero가 모든 페이지에서 동일하므로, 코드 중복을 제거하고 유지보수성을 향상시켰습니다.

## 최적화 방법

### 1. 동적 로드 방식 (권장)
- **장점**: 헤더/푸터/page-hero 수정 시 한 곳만 수정하면 모든 페이지에 반영
- **단점**: 서버 환경에 따라 fetch API 지원 여부 확인 필요

#### 사용법:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>페이지 제목 - 신동탄간호학원</title>
  <link rel="stylesheet" href="style.css">
  <!-- 기타 CSS 파일들 -->
</head>
<body>
  <!-- 헤더는 자동으로 로드됩니다 -->
  
  <!-- page-hero는 자동으로 로드되고 설정됩니다 -->
  
  <!-- 페이지 콘텐츠 -->
  <main>
    <section class="content-section">
      <div class="container">
        <h1>페이지 제목</h1>
        <p>페이지 콘텐츠</p>
      </div>
    </section>
  </main>

  <!-- 푸터는 자동으로 로드됩니다 -->
  
  <script src="script.js"></script>
</body>
</html>
```

### 2. 별도 파일 방식
- **header.html**: 헤더 컴포넌트
- **footer.html**: 푸터 컴포넌트
- **page-hero.html**: 페이지 히어로 컴포넌트
- **template.html**: 기본 템플릿

### 3. 폴백 시스템
- fetch API가 실패하면 기존 인라인 방식으로 자동 전환
- 모든 환경에서 안정적으로 작동

## 파일 구조

```
shindongtan/
├── header.html          # 헤더 컴포넌트
├── footer.html          # 푸터 컴포넌트
├── page-hero.html       # 페이지 히어로 컴포넌트
├── template.html        # 기본 템플릿
├── script.js           # 최적화된 스크립트
├── style.css           # 스타일시트
└── README_OPTIMIZATION.md  # 이 파일
```

## Page-Hero 자동 설정

### 페이지별 자동 설정
script.js에서 각 페이지별로 page-hero가 자동으로 설정됩니다:

```javascript
const PAGE_HERO_CONFIGS = {
  'academy_introduction.html': {
    title: '인사말',
    description: '신동탄간호학원의 비전과 미션을 소개합니다',
    breadcrumb: '학원소개 > 인사말',
    background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)'
  },
  // ... 다른 페이지들
};
```

### 페이지별 배경 색상
- **학원소개**: 파란색 계열 (#1a237e → #3949ab)
- **교육과정**: 진한 파란색 계열 (#0052cc → #0747a6)
- **모집안내**: 초록색 계열 (#2e7d32 → #388e3c)
- **커뮤니티**: 주황색 계열 (#f57c00 → #ff9800)

### 커스텀 설정 (선택사항)
페이지에서 개별적으로 page-hero를 재설정할 수 있습니다:

```html
<script>
document.addEventListener('DOMContentLoaded', function() {
  configurePageHero({
    title: '커스텀 제목',
    description: '커스텀 설명',
    breadcrumb: '커스텀 경로',
    background: 'linear-gradient(135deg, #custom-color 0%, #custom-color2 100%)'
  });
});
</script>
```

## 새로운 페이지 생성 방법

### 1. 템플릿 사용 (권장)
```bash
# template.html을 복사하여 새 페이지 생성
cp template.html new-page.html
```

### 2. 수동 생성
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>새 페이지 - 신동탄간호학원</title>
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="h3-fix.css">
  <link rel="stylesheet" href="history.css">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&family=Pretendard:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
  <!-- 헤더는 자동으로 로드됩니다 -->
  
  <!-- page-hero는 자동으로 로드되고 설정됩니다 -->
  
  <!-- 페이지 콘텐츠 -->
  <main>
    <!-- 여기에 페이지별 콘텐츠 작성 -->
  </main>

  <!-- 푸터는 자동으로 로드됩니다 -->
  
  <script src="script.js"></script>
</body>
</html>
```

## 장점

### 1. 유지보수성 향상
- 헤더/푸터/page-hero 수정 시 한 곳만 수정
- 메뉴 구조 변경 시 모든 페이지에 자동 반영
- 페이지별 배경 색상과 내용 자동 설정

### 2. 코드 중복 제거
- 각 페이지에서 헤더/푸터/page-hero 코드 제거
- 파일 크기 감소

### 3. 일관성 보장
- 모든 페이지에서 동일한 헤더/푸터 사용
- 디자인 통일성 유지
- 페이지별 적절한 배경 색상 자동 적용

### 4. 개발 효율성
- 새 페이지 생성 시 템플릿 사용
- 빠른 페이지 개발 가능
- page-hero 자동 설정으로 시간 절약

### 5. 사용자 경험 향상
- 일관된 네비게이션 경험
- 페이지별 적절한 시각적 구분
- 부드러운 애니메이션 효과

## 주의사항

### 1. 서버 환경
- 로컬 파일 시스템에서는 fetch API 제한 가능
- 웹 서버에서 실행 권장

### 2. SEO 고려사항
- 검색엔진이 동적으로 로드된 콘텐츠를 인식할 수 있음
- 필요시 서버사이드 렌더링 고려

### 3. 성능
- 초기 로드 시 추가 HTTP 요청 발생
- 캐싱을 통한 성능 최적화 가능

## 기존 페이지 마이그레이션

기존 페이지들을 최적화된 방식으로 변경하려면:

1. 헤더, 푸터, page-hero HTML 코드 제거
2. script.js 포함 확인
3. 페이지별 고유 콘텐츠만 유지

### 예시 (기존 → 최적화)
```html
<!-- 기존 방식 -->
<header class="header">
  <!-- 긴 헤더 코드 -->
</header>

<section class="page-hero">
  <!-- 긴 page-hero 코드 -->
</section>

<!-- 최적화된 방식 -->
<!-- 헤더는 자동으로 로드됩니다 -->
<!-- page-hero는 자동으로 로드되고 설정됩니다 -->
```

## 문제 해결

### 1. 헤더/푸터/page-hero가 로드되지 않는 경우
- 브라우저 개발자 도구에서 네트워크 탭 확인
- 파일 경로 확인
- 서버 환경 확인

### 2. page-hero 설정이 적용되지 않는 경우
- 페이지 파일명이 PAGE_HERO_CONFIGS에 있는지 확인
- 브라우저 콘솔에서 오류 메시지 확인

### 3. 스타일이 적용되지 않는 경우
- CSS 파일 경로 확인
- 캐시 삭제 후 새로고침

### 4. 메뉴가 작동하지 않는 경우
- script.js 파일 로드 확인
- JavaScript 오류 확인

## 추가 최적화 방안

### 1. CSS 최적화
- 공통 스타일 분리
- 미디어 쿼리 최적화

### 2. 이미지 최적화
- WebP 포맷 사용
- 이미지 압축

### 3. 캐싱 전략
- 브라우저 캐싱 설정
- CDN 사용 고려

### 4. 성능 모니터링
- 페이지 로드 시간 측정
- 사용자 경험 개선

---

이 최적화를 통해 코드의 유지보수성과 개발 효율성을 크게 향상시킬 수 있습니다. 