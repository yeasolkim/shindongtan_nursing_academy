-- 신동탄간호학원 db.json 데이터를 Supabase에 업로드하는 SQL 스크립트
-- Supabase SQL Editor에서 실행하세요

-- 1. 공지사항 데이터 삽입
INSERT INTO notices (id, title, content, author, date, views) VALUES
(1, '[공지] 2025년 하반기 교육과정 모집 안내', '2025년 하반기 교육과정 모집이 시작되었습니다.

■ 모집 과정
- 간호조무사 일반과정 (야간반)
- 간호조무사 국비과정 (주간반)
- 병원동행매니저 과정
- 심리상담사 과정
- EFR 응급처치법 과정

■ 모집 기간: 2025년 6월 20일 ~ 8월 31일
■ 개강일: 2025년 9월 2일

자세한 내용은 학원으로 문의해주시기 바랍니다.
전화: 031-8003-2456', '관리자', '2025-06-20', 156),
(2, '[공지] 2025년 간호조무사 국가고시 합격률 발표', '2025년 상반기 간호조무사 국가고시 결과가 발표되었습니다.

■ 2025년 상반기 합격률: 98.5%
■ 전체 응시자: 67명
■ 합격자: 66명

신동탄간호학원의 체계적인 교육 시스템과 학생들의 노력이 빛난 결과입니다.
합격을 축하드리며, 앞으로도 현장에서 활약하시기를 기대합니다.', '관리자', '2025-06-15', 234),
(3, '2025년 여름방학 안내', '2025년 여름방학 일정을 안내드립니다.

■ 여름방학 기간: 2025년 7월 28일 ~ 8월 16일 (3주간)
■ 방학 중 학원 운영: 평일 09:00 ~ 18:00 (토요일 휴무)
■ 개강일: 2025년 8월 18일 (월요일)

방학 중에도 문의사항이 있으시면 언제든 연락주세요.', '관리자', '2025-06-10', 89),
(4, '2025년 상반기 수료식 안내', '2025년 상반기 수료식을 진행합니다.

■ 일시: 2025년 6월 25일 (수요일) 오후 2시
■ 장소: 신동탄간호학원 강당
■ 참석 대상: 2025년 상반기 수료생 및 보호자

수료생 여러분의 참석을 기다립니다.
수료증은 수료식 당일 배부됩니다.', '관리자', '2025-06-05', 145),
(5, '2025년 국비지원 과정 신청 안내', '2025년 하반기 국비지원 과정 신청이 시작되었습니다.

■ 지원 대상: 만 15세 이상 65세 미만 구직자
■ 지원 과정: 간호조무사, 병원동행매니저
■ 신청 방법: 고용센터 또는 온라인 신청
■ 신청 기간: 2025년 5월 28일 ~ 7월 31일

국민내일배움카드 발급 후 신청 가능합니다.
자세한 내용은 학원으로 문의해주세요.', '관리자', '2025-05-28', 178),
(6, '2025년 상반기 현장실습 안내', '2025년 상반기 현장실습 일정을 안내드립니다.

■ 실습 기간: 2025년 6월 2일 ~ 6월 27일 (4주간)
■ 실습 병원: 동탄성모병원, 평택성모병원
■ 실습 내용: 외래, 병동 실습

실습 전 오리엔테이션은 5월 30일 오후 2시에 진행됩니다.
실습복과 실습도구는 학원에서 제공합니다.', '관리자', '2025-05-20', 112),
(7, '2025년 상반기 중간고사 안내', '2025년 상반기 중간고사 일정을 안내드립니다.

■ 시험 기간: 2025년 5월 26일 ~ 5월 30일
■ 시험 과목: 기본간호학, 성인간호학, 아동간호학, 정신간호학
■ 시험 시간: 각 과목별 60분

시험 일정표는 학원 게시판을 참고해주세요.
시험 불응시는 재시험을 볼 수 없습니다.', '관리자', '2025-05-15', 98),
(8, '2025년 상반기 입학식 안내', '2025년 상반기 입학식을 진행합니다.

■ 일시: 2025년 3월 4일 (화요일) 오전 10시
■ 장소: 신동탄간호학원 강당
■ 참석 대상: 2025년 상반기 신입생 및 보호자

입학식 후 학급별 오리엔테이션이 진행됩니다.
교복과 교재는 입학식 당일 배부됩니다.', '관리자', '2025-03-02', 167),
(9, '2025년 설날 연휴 안내', '2025년 설날 연휴 일정을 안내드립니다.

■ 연휴 기간: 2025년 2월 8일 ~ 2월 11일 (4일간)
■ 개강일: 2025년 2월 12일 (수요일)

연휴 중 학원은 휴무입니다.
긴급한 문의사항은 학원 홈페이지를 이용해주세요.', '관리자', '2025-01-28', 134),
(10, '2024년 하반기 수료식 안내', '2024년 하반기 수료식을 진행합니다.

■ 일시: 2024년 12월 27일 (금요일) 오후 2시
■ 장소: 신동탄간호학원 강당
■ 참석 대상: 2024년 하반기 수료생 및 보호자

수료생 여러분의 참석을 기다립니다.
수료증은 수료식 당일 배부됩니다.', '관리자', '2024-12-20', 189);

-- 2. Q&A 데이터 삽입
INSERT INTO qa (id, question, answer, category) VALUES
(1, '간호조무사 자격증은 어떻게 취득하나요?', '고등학교 졸업 이상의 학력을 소지하고, 보건복지부 지정 교육훈련기관에서 총 1,520시간의 이론 및 실습 교육을 이수한 후 국가시험에 합격하면 자격증이 발급됩니다.', '자격증'),
(2, '국민내일배움카드(국비) 지원이 가능한가요?', '네, 가능합니다. 국민내일배움카드는 고용노동부에서 지원하는 국비지원 제도이며, 조건만 충족하면 대부분의 국민이 신청할 수 있습니다. 지원금액은 5년간 300~500만 원까지 지원 가능하며, 간호조무사 과정은 평균 약 300만 원 지원됩니다.', '국비지원'),
(3, '실습은 어떤 식으로 진행되나요?', '실습은 크게 학원 내 실습과 의료기관 실습으로 나뉘며, 현장 적응력을 높이는 데 중점을 둡니다. 학원 실습에서는 혈압 및 혈당 측정, 심폐소생술(CPR), 근육주사, 혈관주사 등 실무에 직접 필요한 기술을 원장님이 1:1로 개별 지도를 통해 반복 훈련시켜 드립니다.', '실습'),
(4, '신동탄간호학원의 취업률은 어떤가요?', '신동탄간호학원은 체계적인 교육과 밀착형 취업 관리를 통해 높은 취업률을 자랑합니다. 최근 기준 93.3% 이상의 취업률을 보이고 있으며, 우수학생은 학원장이 직접 추천하여 빠른 취업이 가능합니다.', '취업'),
(5, '간호조무사 급여는 어느 정도 되나요?', '간호조무사의 급여는 근무하는 지역, 의료기관의 규모, 경력 등에 따라 차이가 있습니다. 신입 기준 평균 월급 190~220만 원 수준이며, 중견 이상 경력자는 250~300만 원 이상도 가능합니다.', '급여'),
(6, '간호조무사에 어울리는 적성은?', '간호조무사는 사람을 상대하는 직업이기 때문에 배려심과 공감 능력, 책임감과 성실함, 빠른 상황판단, 예의와 협조심이 중요합니다. 환자의 고통과 불안을 이해하고 따뜻하게 응대할 수 있는 태도가 필요합니다.', '적성'),
(7, '원장님이 직접 실습과 취업을 관리하신다던데요?', '맞습니다! 신동탄간호학원은 원장님이 직접 모든 교육 과정을 책임지고 지도하십니다. 이론+실습 직접 지도, 개별 취업 상담, 추천 시스템 운영, 수료 후 관리까지 책임지는 ''진짜 교육''이 이루어집니다.', '교육특징'),
(8, '간호조무사 전망은 어떤가요?', '간호조무사는 고령화 사회로 진입하는 우리나라에서 수요가 점점 높아지는 직업입니다. 의료기관 증가, 고령화, 정부 정책 등으로 인해 2016년 18만 명에서 2026년 22만 명 이상으로 연평균 2.2% 이상 증가 전망입니다.', '전망');

-- 3. 갤러리 데이터 삽입
INSERT INTO gallery (id, title, image, description, views) VALUES
(1, '즐거운 피치파티~~^^', 'shindongtan/resource/f_1.png', '학생들과 함께 즐거운 피자 파티를 열었습니다! 다들 맛있게 먹고 즐거운 시간을 보냈어요. 다음에도 재미있는 이벤트로 만나요!', 1),
(2, '붕대법과 흡인실습 중~~^^', 'shindongtan/resource/f_2.png', '오늘은 붕대법과 흡인 실습을 진행했습니다. 실제 임상 현장에서 꼭 필요한 기술인 만큼 모두들 진지하게 참여하는 모습이 인상적이었습니다.', 9),
(3, '2025년 상반기, 병원동행매니저 수료식', 'shindongtan/resource/f_3.png', '2025년 상반기 병원동행매니저 과정 수료식을 진행했습니다. 모두들 고생 많으셨고, 앞으로 전문 인력으로서의 활약을 기대합니다!', 12),
(4, '한 사람의 생명을 살릴 수 있다는 것', 'shindongtan/resource/f_4.png', '심폐소생술 교육의 중요성은 아무리 강조해도 지나치지 않습니다. 한 사람의 생명을 살릴 수 있는 귀한 기술, 모두들 열심히 배워주셔서 감사합니다.', 25),
(5, '25년 상반기 입학은 *새로운 마음*으로', 'shindongtan/resource/f_5.png', '새로운 꿈을 안고 신동탄간호학원의 문을 두드린 25년 상반기 입학생 여러분, 진심으로 환영합니다! 여러분의 도전을 응원합니다.', 29),
(6, '심폐소생술을 배운다는 것...', 'shindongtan/resource/f_6.png', '모두가 진지한 표정으로 심폐소생술 실습에 임하고 있습니다. 실제 상황처럼 연습하며 생명의 소중함을 다시 한번 되새기는 시간이었습니다.', 22),
(7, '도뇨실습 모습을 a.i.로 수정해봤어요', 'shindongtan/resource/f_7.png', '최신 기술을 접목한 교육! 도뇨 실습 모습을 AI를 활용해 그려보았습니다. 학생들이 흥미로워하며 교육 효과도 더욱 좋았던 것 같습니다.', 21),
(8, '25년 상반기 수료식( 어제 )', 'shindongtan/resource/f_8.png', '눈물과 웃음이 함께했던 25년 상반기 수료식! 정든 동기들과 아쉬운 작별을 고하며, 새로운 출발을 응원합니다. 모두 자랑스럽습니다.', 34),
(9, '2025년 새해복 많이 받으세요', 'shindongtan/resource/f_9.png', '학생들이 직접 만든 연하장으로 새해 인사를 전합니다. 2025년에도 늘 건강하시고, 소망하시는 모든 일이 이루어지기를 바랍니다.', 31),
(10, '선배가 전하는 생생한 현장 이야기', 'shindongtan/resource/f_10.png', '졸업생 선배를 초청하여 현장의 생생한 이야기를 듣는 시간을 가졌습니다. 재학생들에게 많은 동기부여가 되었던 유익한 시간이었습니다.', 33),
(11, '크리스마스와 커피한잔의 여유', 'shindongtan/resource/f_11.png', '연말을 맞아 학원에서 작은 크리스마스 파티를 열었습니다. 따뜻한 커피와 함께 잠시나마 여유를 즐기는 시간이었습니다. 메리 크리스마스!', 34),
(12, '훗~~~ 24년 하반기 국비 과정', 'shindongtan/resource/f_12.png', '24년 하반기 국비 과정 학생들의 열정적인 실습 현장! 모두의 눈이 초롱초롱 빛나네요. 미래의 멋진 간호조무사들을 응원합니다.', 55),
(13, '생명을 살리는 심폐소생술 -1', 'shindongtan/resource/teacher.jpg', '심폐소생술은 선택이 아닌 필수입니다. 정확한 자세와 방법으로 소중한 생명을 구할 수 있도록 반복 또 반복!', 44),
(14, '24년 가을, 국비 입학식^^', 'shindongtan/resource/teacher_info.jpg', '국비지원 과정 24년 가을 학기 입학식을 진행했습니다. 새로운 도전을 시작하는 모든 분들을 환영하고 응원합니다.', 43),
(15, '24년 하반기 수료식~~^^', 'shindongtan/resource/gallery.jpg', '24년 하반기 과정을 무사히 마친 학생들의 수료식 현장입니다. 그동안의 노력이 결실을 맺는 순간, 모두 축하합니다!', 62),
(16, '현장실습 적응을 위한 사전 OT', 'shindongtan/resource/notice.jpg', '병원 현장 실습을 나가기 전, 사전 오리엔테이션을 진행했습니다. 실습 시 주의사항과 마음가짐에 대해 배우는 중요한 시간이었습니다.', 74),
(17, '실무 중심 교육으로 현장 적응력 UP', 'shindongtan/resource/qa.jpg', '신동탄간호학원은 실무 중심의 교육을 통해 학생들이 현장에 빠르게 적응할 수 있도록 돕습니다. 이론과 실습을 겸비한 최고의 교육!', 66),
(18, '24년 상반기 졸업식~^^', 'shindongtan/resource/recruit.jpg', '24년 상반기 졸업생 여러분, 졸업을 진심으로 축하합니다! 여러분의 밝은 미래를 신동탄간호학원이 항상 응원하겠습니다.', 69),
(19, '방문간호 특강~~~^^', 'shindongtan/resource/chuieop.jpg', '방문간호 분야 전문가를 모시고 특강을 진행했습니다. 빠르게 변화하는 의료 환경에 발맞춰 나아가는 신동탄간호학원입니다.', 68),
(20, '선배와의 만남(취업 역량 강화)', 'shindongtan/resource/donghang.jpg', '취업 역량 강화를 위해 졸업생 선배와 만남의 시간을 가졌습니다. 취업 준비 꿀팁과 현장 경험을 들을 수 있었던 소중한 시간이었습니다.', 61);

-- 4. 취업/구인 데이터 삽입
INSERT INTO jobs (id, title, company, location, salary, description, contact, views) VALUES
(1, '동탄성모병원 간호조무사 정규직 채용', '동탄성모병원', '경기도 화성시', '220만원~250만원', '병동 3교대 근무 가능한 간호조무사를 모집합니다. 기숙사 제공 및 복지 혜택이 우수합니다.', '031-8003-1004', 451),
(2, '아름다운피부과에서 함께할 간호조무사/접수/코디네이터 구인', '아름다운피부과', '경기도 화성시', '200만원~230만원', '피부과 업무에 관심있는 분들의 많은 지원 기다립니다. 체계적인 교육을 통해 전문가로 성장할 수 있습니다.', '031-8003-1004', 320),
(3, '연세키즈소아청소년과 간호조무사 모집', '연세키즈소아청소년과', '경기도 화성시', '190만원~220만원', '소아과 경력자 우대합니다. 아이들을 사랑하고 성실한 분들의 많은 지원 바랍니다.', '031-8003-1004', 180),
(4, '삼성드림내과 간호조무사(외래) 채용', '삼성드림내과', '경기도 화성시', '210만원~240만원', '삼성드림내과에서 외래 간호조무사를 채용합니다. 주 5일 근무이며, 경력자를 우대합니다. 많은 지원 바랍니다.', '031-8003-1004', 215);

-- 5. 강사진 데이터 삽입
INSERT INTO instructors (id, name, title, image, details) VALUES
(1, '이용희', '원장', 'shindongtan/resource/이용희.jpeg', ARRAY[
  '아주대학교 간호학 석사 졸업',
  '심리상담사 2급 자격증 보유',
  '한국간호사 및 미국간호사 자격증 보유 (뉴욕)',
  '직업능력개발 훈련교사 자격증 보유',
  '심폐소생술 일반인 과정 강사 자격증 보유',
  '병원서비스코디네이터 강사 자격증 보유',
  '대학병원 수간호사 10년 경력 (前)',
  '전임강사 및 겸임부교수 (前)',
  '간호대학 임상실습 파견 강의 경력 10년 (前)',
  '고등학교 간호과 위탁교육 지도 (2016~2019) (前)',
  '고등학교 간호과 논문 지도 (2019) (前)',
  '직업상담사 자격증 보유'
]),
(2, '정희영', '원장', 'shindongtan/resource/정희영.jpg', ARRAY[
  '춘해보건대학 간호학 학사 수료',
  '간호사 및 보건교사 자격증 보유',
  '심폐소생술 전문가 지도 자격증 보유',
  '직업능력개발 훈련교사 자격증 보유',
  '치과 간호 기술 라이센스 보유',
  '병원서비스 코디네이터 강사 과정 수료',
  '요양보호사 1급 자격증 보유',
  '종합병원 수술실 간호사 10년 경력 (前)',
  '분당간호학원 외래강사 (前)',
  '삼성간호학원 교무과장 (前)',
  '간호조무사 훈련과정 운영 경력 10년 (前)',
  '고등학교 간호과 담임 (2014~2018) (前)'
]),
(3, '김도윤', '의사', 'shindongtan/resource/김도윤.jpg', ARRAY[
  '신동탄간호학원 자문위원',
  '전북대학교 치의과대학',
  '치아교정 전문의',
  '서울 베스트덴 치과원장(現)'
]),
(4, '김혜영', '교수', 'shindongtan/resource/김혜영.jpg', ARRAY[
  '신동탄간호학원 자문위원',
  '이화여대 간호학 박사 과정(中)',
  '노인전문간호사 면허증 보유',
  'NCLEX-RN(미국간호사 자격증) 보유 (뉴욕)',
  '대구 동산의료원 간호사 2년 경력(前)',
  '순천향대학교 응급실 간호사 10년 경력(前)',
  '청운대학교 간호학과 임상간호대 교수 (現)'
]),
(5, '이주미', '강사', 'shindongtan/resource/이주미.jpg', ARRAY[
  '공주대학교 간호학과 졸업',
  '간호사면허증 취득',
  '국립경찰병원 근무',
  '성모병원 근무',
  '병원서비스코디 취득',
  '신동탄간호학원 기초간호, 보건 강사'
]),
(6, '강연심', '강사', 'shindongtan/resource/강연심.jpg', ARRAY[
  '제주한라대학교 간호학 학사 수료',
  '간호사 면허증(1987년) 취득',
  '교원자격증(1987년) 취득',
  '경희요양병원 2년 간호사 경력(前)',
  '효성 프라임 요양병원 3년 수간호사 경력(前)',
  '<현> 신동탄간호학원 성인, 노인, 응급, 모성 강사'
]),
(7, '최**', '강사', 'shindongtan/resource/profile.png', ARRAY[
  '보건, 공중, 기초강의',
  '간호학원 강사 경력 10년',
  '보건교사 자격증 보유',
  '간호학원 전임강사 (前)'
]),
(8, '이선혜', '강사', 'shindongtan/resource/이선혜.jpg', ARRAY[
  '예수대학교 간호학과 수료',
  '간호사면허증 취득',
  '동탄시티병원 근무',
  '광교린병원 근무',
  '노블요양병원 근무',
  '동안산병원 근무',
  '현) 신동탄간호학원 기본간호, 기초 강사'
]),
(9, '장수정', '강사', 'shindongtan/resource/정수정.jpg', ARRAY[
  '대동대학교 간호학과 졸업',
  '간호사 면허 취득',
  '보건교사 자격증 취득',
  '보육교사 1급 자격증 취득',
  '한독병원 중환자실 근무(1989~~1995년)',
  '동탄성모우리이비인후과, 동탄경희선한의원 근무(2019~~2021년)',
  '보건, 기초간호임상실무, 기초강의'
]),
(10, '김은하', '강사', 'shindongtan/resource/profile.png', ARRAY[
  '적십자 간호대학 졸업',
  '간호사 면허증 취득',
  '혈액투석 간호사 경력(前)',
  '<현> 신동탄간호학원 기초간호 강사'
]);

-- 시퀀스 재설정 (다음 INSERT 시 올바른 ID 사용을 위해)
SELECT setval('notices_id_seq', (SELECT MAX(id) FROM notices));
SELECT setval('qa_id_seq', (SELECT MAX(id) FROM qa));
SELECT setval('gallery_id_seq', (SELECT MAX(id) FROM gallery));
SELECT setval('jobs_id_seq', (SELECT MAX(id) FROM jobs));
SELECT setval('instructors_id_seq', (SELECT MAX(id) FROM instructors)); 