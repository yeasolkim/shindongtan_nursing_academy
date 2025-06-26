# Supabase 연동 설정 가이드

## 1. Supabase 프로젝트 생성

### 1.1 계정 생성
1. [supabase.com](https://supabase.com) 접속
2. **Sign Up** 클릭하여 계정 생성
3. GitHub, Google, 또는 이메일로 가입

### 1.2 새 프로젝트 생성
1. **New Project** 클릭
2. 프로젝트 설정:
   - **Name**: `shindongtan-nursing-academy`
   - **Database Password**: 안전한 비밀번호 설정 (기억해두세요)
   - **Region**: `Asia Pacific (Singapore)` 또는 `Asia Pacific (Tokyo)` 선택
3. **Create new project** 클릭

## 2. 데이터베이스 테이블 생성

### 2.1 SQL Editor에서 테이블 생성
Supabase 대시보드 → **SQL Editor** → **New query**에서 다음 SQL 실행:

```sql
-- 공지사항 테이블
CREATE TABLE notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author VARCHAR(100) DEFAULT '관리자',
  date TIMESTAMP DEFAULT NOW(),
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Q&A 테이블
CREATE TABLE qa (
  id SERIAL PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 갤러리 테이블
CREATE TABLE gallery (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  image VARCHAR(500) NOT NULL,
  description TEXT,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 취업/구인 테이블
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  salary VARCHAR(100),
  description TEXT,
  contact VARCHAR(255),
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 강사진 테이블
CREATE TABLE instructors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  image VARCHAR(500) NOT NULL,
  details TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 3. API 키 및 설정 확인

### 3.1 프로젝트 설정에서 API 키 확인
1. **Settings** → **API**
2. 다음 정보 복사:
   - **Project URL** (예: `https://your-project-id.supabase.co`)
   - **anon public** (API Key)

## 4. 설정 파일 업데이트

### 4.1 supabase-config.js 파일 수정
`supabase-config.js` 파일에서 다음 부분을 실제 값으로 교체:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';  // 실제 Project URL로 교체
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';  // 실제 anon public 키로 교체
```

예시:
```javascript
const SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## 5. HTML 파일에 스크립트 추가

### 5.1 index.html 파일 수정
`<head>` 섹션에 다음 스크립트 추가:

```html
<!-- Supabase CDN -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

`</body>` 태그 앞에 다음 스크립트 추가:

```html
<!-- Supabase 설정 파일 -->
<script src="supabase-config.js"></script>
```

## 6. 테스트 데이터 삽입

### 6.1 SQL Editor에서 테스트 데이터 삽입
```sql
-- 공지사항 테스트 데이터
INSERT INTO notices (title, content, author, date) VALUES
('2024년 간호조무사 교육과정 모집 안내', '2024년 간호조무사 교육과정 모집이 시작되었습니다. 국민내일배움카드 지원으로 부담없이 수강하실 수 있습니다.', '관리자', '2024-01-15'),
('2024년 국가시험 일정 안내', '2024년 간호조무사 국가시험 일정이 발표되었습니다. 수험생 여러분의 많은 관심 바랍니다.', '관리자', '2024-01-10'),
('겨울방학 특별 프로그램 안내', '겨울방학을 맞아 특별 프로그램을 운영합니다. 실습 중심의 교육으로 실무 능력을 향상시킬 수 있습니다.', '관리자', '2024-01-05');

-- Q&A 테스트 데이터
INSERT INTO qa (question, answer, category) VALUES
('간호조무사 자격증은 어떻게 취득하나요?', '고등학교 졸업 이상의 학력을 소지하고, 보건복지부 지정 교육훈련기관에서 총 1,520시간의 이론 및 실습 교육을 이수한 후 국가시험에 합격하면 자격증이 발급됩니다.', '자격증'),
('국민내일배움카드(국비) 지원이 가능한가요?', '네, 가능합니다. 국민내일배움카드는 고용노동부에서 지원하는 국비지원 제도이며, 조건만 충족하면 대부분의 국민이 신청할 수 있습니다.', '국비지원'),
('실습은 어떤 식으로 진행되나요?', '실습은 크게 학원 내 실습과 의료기관 실습으로 나뉘며, 현장 적응력을 높이는 데 중점을 둡니다.', '실습');
```

## 7. 테스트 및 확인

### 7.1 브라우저에서 테스트
1. `index.html` 페이지 로드
2. 개발자 도구 콘솔에서 다음 메시지 확인:
   - `Supabase에서 공지사항 로드 완료: X개`
   - `Supabase에서 Q&A 로드 완료: X개`

### 7.2 오류 확인
콘솔에 오류가 나타나면:
1. API 키가 올바른지 확인
2. 테이블이 생성되었는지 확인
3. 네트워크 연결 상태 확인

## 8. 추가 기능

### 8.1 실시간 업데이트
Supabase의 실시간 기능을 활용하려면:

```javascript
// 실시간 구독 예시
const subscription = supabase
  .channel('notices')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, payload => {
    console.log('공지사항 변경:', payload);
    // UI 업데이트 로직
  })
  .subscribe();
```

### 8.2 인증 기능 추가
사용자 인증이 필요한 경우:

```javascript
// 로그인
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// 로그아웃
const { error } = await supabase.auth.signOut();
```

## 9. 보안 설정

### 9.1 Row Level Security (RLS) 설정
데이터 보안을 위해 RLS를 활성화하고 정책을 설정하세요:

```sql
-- RLS 활성화
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- 읽기 정책 (모든 사용자가 읽기 가능)
CREATE POLICY "Allow public read access" ON notices
  FOR SELECT USING (true);
```

## 10. 배포 시 주의사항

### 10.1 환경 변수 설정
프로덕션 환경에서는 환경 변수를 사용하세요:

```javascript
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
```

### 10.2 CORS 설정
Supabase 대시보드에서 도메인을 허용 목록에 추가하세요. 