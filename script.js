// 신동탄간호학원 웹사이트 JavaScript

// =============================================================================
// I. 유틸리티 함수
// =============================================================================

/**
 * 현재 페이지의 파일명을 반환합니다. (예: "index.html")
 * @returns {string} 현재 페이지 파일명
 */
function getCurrentPage() {
  const path = window.location.pathname;
  const filename = path.split('/').pop();
  return filename || 'index.html';
}

/**
 * UTC 날짜를 한국 시간으로 변환하여 YYYY-MM-DD 형식으로 반환합니다.
 * @param {string} utcDateStr - UTC 날짜 문자열
 * @returns {string} 한국 시간 기준 날짜 (YYYY-MM-DD)
 */
function formatKoreaDate(utcDateStr) {
  if (!utcDateStr) return '';
  const utcDate = new Date(utcDateStr);
  // UTC -> KST 변환 (UTC+9)
  const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kstDate.getFullYear();
  const mm = String(kstDate.getMonth() + 1).padStart(2, '0');
  const dd = String(kstDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * HTML 컴포넌트를 비동기적으로 로드하여 페이지에 삽입합니다.
 * @param {string} selector - 콘텐츠를 삽입할 요소의 CSS 셀렉터
 * @param {string} url - 로드할 HTML 파일의 URL
 * @param {function} [callback] - 로드 완료 후 실행할 콜백 함수
 */
async function loadComponent(selector, url, callback) {
  const element = document.querySelector(selector);
  if (!element) return;

  try {
    const response = await fetch(url);
    if (response.ok) {
      element.innerHTML = await response.text();
      if (callback) callback();
    } else {
      console.error(`'${url}' 파일 로드 실패:`, response.statusText);
      // 로딩 실패 시 기본 콘텐츠 표시
      if (selector.includes('header')) {
        element.innerHTML = getDefaultHeader();
      } else if (selector.includes('footer')) {
        element.innerHTML = getDefaultFooter();
      }
    }
  } catch (error) {
    console.error(`'${url}' 파일 로드 중 오류 발생:`, error);
    // 네트워크 오류 시 기본 콘텐츠 표시
    if (selector.includes('header')) {
      element.innerHTML = getDefaultHeader();
    } else if (selector.includes('footer')) {
      element.innerHTML = getDefaultFooter();
    }
  }
}

/**
 * 기본 헤더 HTML을 반환합니다.
 */
function getDefaultHeader() {
  return `
    <div class="header-top">
      <div class="container">
        <div class="header-top-left">
          <span><i class="fas fa-phone"></i> 031-8003-1004</span>
          <span><i class="fas fa-envelope"></i> nurse8003@naver.com</span>
        </div>
        <div class="header-top-right">
          <a href="https://pf.kakao.com/_ExlqgC" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-comment"></i> 카카오톡 상담
          </a>
        </div>
      </div>
    </div>
    <div class="header-main">
      <div class="container">
        <div class="logo">
          <a href="index.html">
            <img src="shindongtan/resource/logo.png" alt="신동탄간호학원">
          </a>
        </div>
        <nav class="main-menu">
          <ul>
            <li class="menu-item">
              <a href="#" class="menu-link">학원소개</a>
              <div class="submenu">
                <a href="academy_introduction.html">인사말</a>
                <a href="academy_history.html">연혁</a>
                <a href="academy_instructors.html">강사진</a>
                <a href="academy_facilities.html">시설안내</a>
                <a href="academy_location.html">오시는 길</a>
              </div>
            </li>
            <li class="menu-item">
              <a href="#" class="menu-link">교육안내</a>
              <div class="submenu">
                <a href="education_course-nursing-assistant.html">간호조무사 교육과정</a>
                <a href="education_course-coordinator.html">병원코디네이터</a>
                <a href="education_course-psychological-counselor.html">심리상담사</a>
                <a href="education_course-hospital-companion.html">병원동행 매니저</a>
                <a href="education_course-insurance-evaluation.html">보험심사평가사 2급</a>
                <a href="education_course-efr.html">EFR</a>
                <a href="education_course-exam-info.html">국가시험 안내</a>
              </div>
            </li>
            <li class="menu-item">
              <a href="#" class="menu-link">모집안내</a>
              <div class="submenu">
                <a href="recruitment_recruit-info.html">모집안내</a>
                <a href="recruitment_funding-info.html">국비지원안내</a>
              </div>
            </li>
            <li class="menu-item">
              <a href="#" class="menu-link">취업/진학</a>
              <div class="submenu">
                <a href="job_info.html">진학</a>
                <a href="job_employment.html">취업(협력기관)</a>
              </div>
            </li>
            <li class="menu-item">
              <a href="#" class="menu-link">커뮤니티</a>
              <div class="submenu">
                <a href="community_notice.html">공지사항</a>
                <a href="community_qa.html">Q&A</a>
                <a href="community_gallery.html">갤러리</a>
                <a href="community_gallery_detail.html">갤러리 상세</a>
                <a href="community_jobs.html">취업/구인</a>
              </div>
            </li>
          </ul>
        </nav>
        <div class="mobile-menu-toggle">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  `;
}

/**
 * 기본 푸터 HTML을 반환합니다.
 */
function getDefaultFooter() {
  return `
    <div class="footer-content">
      <div class="container">
        <div class="footer-section">
          <h4>신동탄간호학원</h4>
          <p>경기도 화성시 메타폴리스로 38 (반송동)<br>천년프라자 401호</p>
          <p>전화: 031-8003-1004<br>이메일: nurse8003@naver.com</p>
        </div>
        <div class="footer-section">
          <h4>교육과정</h4>
          <ul>
            <li><a href="education_course-nursing-assistant.html">간호조무사</a></li>
            <li><a href="education_course-coordinator.html">병원코디네이터</a></li>
            <li><a href="education_course-psychological-counselor.html">심리상담사</a></li>
            <li><a href="education_course-efr.html">EFR</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>바로가기</h4>
          <ul>
            <li><a href="academy_location.html">오시는 길</a></li>
            <li><a href="recruitment_funding-info.html">국비지원</a></li>
            <li><a href="community_notice.html">공지사항</a></li>
            <li><a href="community_qa.html">Q&A</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>소셜미디어</h4>
          <div class="social-links">
            <a href="https://pf.kakao.com/_ExlqgC" target="_blank" rel="noopener noreferrer">
              <i class="fas fa-comment"></i>
            </a>
            <a href="https://www.instagram.com/ok1004.co.kr/profilecard/?igsh=ZG11bW9oZHoyeTl3" target="_blank" rel="noopener noreferrer">
              <i class="fab fa-instagram"></i>
            </a>
            <a href="https://cafe.naver.com/shindongtannrs" target="_blank" rel="noopener noreferrer">
              <i class="fas fa-coffee"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container">
        <p>&copy; 2024 신동탄간호학원. All rights reserved.</p>
      </div>
    </div>
  `;
}

/**
 * Supabase에서 조회수를 증가시키는 함수
 * @param {string} tableName - 테이블 이름 (jobs, notices, gallery)
 * @param {number} postId - 게시물 ID
 */
async function incrementViewCount(tableName, postId) {
  try {
    // Supabase에서 현재 조회수 가져오기
    const { data: currentPost, error: fetchError } = await window.supabaseClient
      .from(tableName)
      .select('views')
      .eq('id', postId)
      .single();
    
    if (fetchError) {
      console.error(`${tableName} 조회수 조회 실패:`, fetchError);
      return;
    }
    
    // 조회수 증가
    const newViews = (currentPost.views || 0) + 1;
    const { error: updateError } = await window.supabaseClient
      .from(tableName)
      .update({ views: newViews })
      .eq('id', postId);
    
    if (updateError) {
      console.error(`${tableName} 조회수 증가 실패:`, updateError);
      return;
    }
    
    console.log(`${tableName} ID ${postId} 조회수 증가: ${newViews}`);
    
  } catch (error) {
    console.error(`${tableName} 조회수 증가 중 오류:`, error);
  }
}

// =============================================================================
// II. 페이지별 콘텐츠 설정
// =============================================================================

const PAGE_HERO_CONFIGS = {
    'academy_introduction.html': { title: '인사말', description: '여러분을 환영합니다.', breadcrumb: '학원소개 > 인사말', badge: '학원소개' },
    'academy_history.html': { title: '기관연혁', description: '신동탄간호학원의 발자취', breadcrumb: '학원소개 > 기관연혁', badge: '학원소개' },
    'academy_instructors.html': { title: '강사진', description: '최고의 강사진을 소개합니다.', breadcrumb: '학원소개 > 강사진', badge: '학원소개' },
    'academy_facilities.html': { title: '시설안내', description: '최신 시설을 갖춘 교육 환경', breadcrumb: '학원소개 > 시설안내', badge: '학원소개' },
    'academy_location.html': { title: '오시는 길', description: '학원 위치를 안내해 드립니다.', breadcrumb: '학원소개 > 오시는 길', badge: '학원소개' },
    
    'education_course-nursing-assistant.html': { title: '간호조무사 교육과정', description: '국가공인 간호조무사 자격 취득 과정입니다.', breadcrumb: '교육안내 > 간호조무사 교육과정', badge: '교육안내' },
    'education_course-coordinator.html': { title: '병원코디네이터', description: '병원의 얼굴, 의료 서비스 전문가를 양성합니다.', breadcrumb: '교육안내 > 병원코디네이터', badge: '교육안내' },
    'education_course-psychological-counselor.html': { title: '심리상담사', description: '마음의 병을 치유하는 따뜻한 전문가 과정입니다.', breadcrumb: '교육안내 > 심리상담사', badge: '교육안내' },
    'education_course-hospital-companion.html': { title: '병원동행 매니저', description: '환자의 병원 동행을 전문적으로 관리하는 매니저 양성 과정입니다.', breadcrumb: '교육안내 > 병원동행 매니저', badge: '교육안내' },
    'education_course-insurance-evaluation.html': { title: '보험심사평가사 2급', description: '보험심사평가사 2급 자격증 취득 과정입니다.', breadcrumb: '교육안내 > 보험심사평가사 2급', badge: '교육안내' },
    'education_course-efr.html': { title: 'EFR', description: '심폐소생술 국제라이센스 과정', breadcrumb: '교육안내 > EFR', badge: '교육안내' },
    'education_course-exam-info.html': { title: '국가시험 안내', description: '간호조무사 국가시험 정보를 안내합니다.', breadcrumb: '교육안내 > 국가시험 안내', badge: '교육안내' },
    
    'recruitment_recruit-info.html': { title: '모집요강', description: '신동탄간호학원의 최신 모집 정보를 확인하세요.', breadcrumb: '입학안내 > 모집요강', badge: '입학안내' },
    'recruitment_funding-info.html': { title: '국비과정모집(국민내일배움카드제)', description: '국민내일배움카드 등 다양한 국비지원 프로그램을 안내합니다.', breadcrumb: '입학안내 > 국비과정모집(국민내일배움카드제)', badge: '입학안내' },
    
    'job_info.html': { title: '진학', description: '진학 정보를 안내합니다.', breadcrumb: '취업/진학 > 진학', badge: '취업/진학' },
    'job_employment.html': { title: '취업(협력기관)', description: '체계적인 취업 지원 프로그램을 통해 성공적인 취업을 돕습니다.', breadcrumb: '취업/진학 > 취업(협력기관)', badge: '취업/진학' },

    'community_notice.html': { title: '공지사항', description: '학원의 주요 소식과 공지사항을 확인하세요.', breadcrumb: '커뮤니티 > 공지사항', badge: '커뮤니티' },
    'community_notice_detail.html': { title: '공지사항 상세', description: '공지사항의 상세 내용을 확인하세요.', breadcrumb: '커뮤니티 > 공지사항 > 상세', badge: '커뮤니티' },
    'community_qa.html': { title: 'Q&A', description: '자주 묻는 질문에 대한 답변입니다.', breadcrumb: '커뮤니티 > Q&A', badge: '커뮤니티' },
    'community_gallery.html': { title: '갤러리', description: '신동탄간호학원의 다채로운 활동 모습을 사진으로 만나보세요.', breadcrumb: '커뮤니티 > 갤러리', badge: '커뮤니티' },
    'community_gallery_detail.html': { title: '갤러리 상세', description: '갤러리 이미지와 상세 내용을 확인하세요.', breadcrumb: '커뮤니티 > 갤러리 > 상세', badge: '커뮤니티' },
    'community_jobs.html': { title: '취업/구인', description: '채용 정보를 확인하고 취업 기회를 잡으세요.', breadcrumb: '커뮤니티 > 취업/구인', badge: '커뮤니티' },
    'community_jobs_detail.html': { title: '취업/구인 상세', description: '채용 정보의 상세 내용을 확인하세요.', breadcrumb: '커뮤니티 > 취업/구인 > 상세', badge: '커뮤니티' },
};

/**
 * 페이지 히어로 컴포넌트를 설정하고 동적으로 내용을 채웁니다.
 */
async function configurePageHero() {
  const pageHeroContainer = document.getElementById('page-hero-container');
  if (!pageHeroContainer) return;

  const currentPage = getCurrentPage();
  const config = PAGE_HERO_CONFIGS[currentPage];
  const isMobile = window.innerWidth <= 768;
  const pagesToHideHeroOnMobile = ['academy_introduction.html', 'academy_history.html', 'academy_instructors.html', 'academy_facilities.html', 'academy_location.html'];

  // 모바일이면서 특정 페이지이면 히어로 섹션을 숨김
  if (isMobile && pagesToHideHeroOnMobile.includes(currentPage)) {
    pageHeroContainer.style.display = 'none';
    return; // 히어로를 숨기고 함수를 종료
  } else {
    // 다른 모든 경우에는 보이게 함 (리사이즈 대응)
    pageHeroContainer.style.display = '';
  }

  if (!config) return;

  await loadComponent('#page-hero-container', 'page-hero.html', () => {
    const titleEl = document.getElementById('page-title');
    const descriptionEl = document.getElementById('page-description');
    const breadcrumbEl = document.getElementById('breadcrumb-path');
    const badgeEl = document.querySelector('.badge-text');

    // 모든 뷰에 대한 기본값 설정
    if (titleEl) titleEl.textContent = config.title;
    if (descriptionEl) descriptionEl.textContent = config.description;
    if (breadcrumbEl) breadcrumbEl.textContent = config.breadcrumb;
    if (badgeEl) badgeEl.textContent = config.badge;
  });
}

// =============================================================================
// III. UI 기능 초기화
// =============================================================================

/**
 * 현재 페이지에 해당하는 메뉴 아이템을 활성화합니다.
 */
function activateCurrentMenu() {
  const currentPage = getCurrentPage();
  if (currentPage === 'index.html') return;

  document.querySelectorAll('.main-menu .menu-item').forEach(item => {
    const submenuLink = item.querySelector(`.submenu a[href="${currentPage}"]`);
    if (submenuLink) {
        item.classList.add('active');
        submenuLink.classList.add('active');
    }
  });
}

/**
 * 모바일 메뉴 토글 기능을 설정합니다.
 */
function setupMobileMenu() {
  const header = document.querySelector('.header');
  const toggleButton = document.querySelector('.mobile-menu-toggle');
  const mainMenu = document.querySelector('.main-menu');

  if (!header || !toggleButton || !mainMenu) {
    console.warn('모바일 메뉴 구성 요소(헤더, 토글 버튼, 메인 메뉴)를 찾을 수 없습니다.');
    return;
  }

  // 메뉴 항목 클릭 시 서브메뉴 토글 (모바일 전용)
  mainMenu.querySelectorAll('ul .menu-item > a').forEach(menuLink => {
    const menuItem = menuLink.parentElement;
    const submenu = menuItem.querySelector('.submenu-container');
    if (submenu) {
      menuLink.addEventListener('click', (event) => {
        if (window.innerWidth <= 768) {
          event.preventDefault();
          menuItem.classList.toggle('submenu-open');
        }
      });
    }
  });

  // 햄버거 메뉴 토글
  toggleButton.addEventListener('click', () => {
    mainMenu.classList.toggle('mobile-open');
    header.classList.toggle('mobile-active');
    
    const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
    toggleButton.setAttribute('aria-expanded', !isExpanded);
    toggleButton.setAttribute('aria-label', isExpanded ? '메뉴 열기' : '메뉴 닫기');
  });

  // 메뉴 외부 클릭 시 닫기
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) {
      mainMenu.classList.remove('mobile-open');
      header.classList.remove('mobile-active');
      toggleButton.setAttribute('aria-expanded', 'false');
      toggleButton.setAttribute('aria-label', '메뉴 열기');
    }
  });
}

/**
 * 스크롤에 따른 애니메이션 효과를 초기화합니다.
 */
function initScrollEffects() {
  const elements = document.querySelectorAll('.animate-on-scroll');
  
  if (elements.length === 0) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // 약간의 지연을 두어 더 자연스러운 애니메이션 효과 제공
        setTimeout(() => {
          entry.target.classList.add('animated');
        }, 100);
        observer.unobserve(entry.target);
      }
    });
  }, { 
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px' // 요소가 화면 하단에서 50px 전에 애니메이션 시작
  });
  
  elements.forEach(element => observer.observe(element));
  
  // 페이지 로드 시 화면에 보이는 요소들은 즉시 애니메이션 적용
  elements.forEach(element => {
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setTimeout(() => {
        element.classList.add('animated');
      }, 200);
    }
  });
}

/**
 * 탭 UI 기능을 초기화합니다.
 */
function initTabs() {
  document.querySelectorAll('.tabs-container').forEach(container => {
    const buttons = container.querySelectorAll('.tab-button');
    buttons.forEach(button => {
      button.addEventListener('click', function() {
        const targetId = this.dataset.target;
        buttons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        container.querySelectorAll('.tab-content').forEach(content => {
          content.classList.toggle('active', content.dataset.id === targetId);
        });
      });
    });
  });
}

/**
 * 아코디언 UI 기능을 초기화합니다.
 */
function initAccordion() {
  document.querySelectorAll('.accordion-container').forEach(container => {
    container.querySelectorAll('.accordion-item').forEach(item => {
      const header = item.querySelector('.accordion-header');
      header?.addEventListener('click', function() {
        const isActive = item.classList.contains('active');
        // Close all other items in the same accordion
        container.querySelectorAll('.accordion-item').forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            otherItem.querySelector('.accordion-content').style.maxHeight = null;
          }
        });
        // Toggle current item
        item.classList.toggle('active', !isActive);
        const content = item.querySelector('.accordion-content');
        content.style.maxHeight = !isActive ? content.scrollHeight + 'px' : null;
      });
    });
  });
}

/**
 * 갤러리 필터 기능을 초기화합니다.
 */
function initGalleryFilter() {
    const filterContainer = document.querySelector('.gallery-filter');
    if (!filterContainer) return;

    const filterButtons = filterContainer.querySelectorAll('button');
    const galleryItems = document.querySelectorAll('.gallery-item');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            galleryItems.forEach(item => {
                item.style.display = (filter === 'all' || item.dataset.category === filter) ? 'block' : 'none';
            });
        });
    });
}

/**
 * 페이지 최상단으로 부드럽게 스크롤합니다.
 */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 시설 둘러보기 갤러리 초기화 - 사용되지 않으므로 삭제
 */
/*
async function initFacilitiesGallery() {
  const galleryContainer = document.querySelector('.gallery-container');
  if (!galleryContainer) return;

  try {
    const response = await fetch('db.json');
    if (!response.ok) {
      throw new Error('db.json을 불러오는데 실패했습니다.');
    }
    const db = await response.json();
    const images = db.facilities;

    if (!images || images.length === 0) return;

    // 갤러리 HTML 동적 생성
    const mainImageContainer = document.createElement('div');
    mainImageContainer.className = 'main-image-container';
    const mainImage = document.createElement('img');
    mainImage.id = 'main-gallery-image';
    mainImage.src = images[0].src;
    mainImage.alt = images[0].alt;
    mainImageContainer.appendChild(mainImage);

    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.className = 'thumbnail-container';

    images.forEach((image, index) => {
      const thumbnail = document.createElement('img');
      thumbnail.src = image.src;
      thumbnail.alt = image.alt;
      thumbnail.className = 'thumbnail';
      if (index === 0) {
        thumbnail.classList.add('active');
      }

      thumbnail.addEventListener('click', function() {
        mainImage.src = this.src;
        document.querySelectorAll('.thumbnail-container .thumbnail').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
      });
      thumbnailContainer.appendChild(thumbnail);
    });

    galleryContainer.innerHTML = ''; // 기존 내용 삭제
    galleryContainer.appendChild(mainImageContainer);
    galleryContainer.appendChild(thumbnailContainer);

  } catch (error) {
    console.error('갤러리 초기화 중 오류 발생:', error);
    galleryContainer.innerHTML = '<p>갤러리를 불러오는 데 문제가 발생했습니다.</p>';
  }
}
*/

// =============================================================================
// IV. 폼 및 모달 기능
// =============================================================================

/**
 * 폼 필드의 유효성을 검사합니다.
 * @param {HTMLFormElement} formElement - 검사할 폼 요소
 * @returns {boolean} 유효성 통과 여부
 */
function validateForm(formElement) {
  let isValid = true;
  formElement.querySelectorAll('[required]').forEach(input => {
    if (!input.value.trim()) {
      isValid = false;
      input.classList.add('error');
    } else {
      input.classList.remove('error');
    }
  });
  return isValid;
}

/**
 * 폼을 제출합니다. (유효성 검사 포함)
 * @param {HTMLFormElement} formElement - 제출할 폼 요소
 */
function submitForm(formElement) {
  if (validateForm(formElement)) {
    console.log('Form submitted successfully.');
    formElement.submit();
  } else {
    console.log('Form validation failed.');
  }
}

// =============================================================================
// V. DOM 로드 완료 후 실행
// =============================================================================

document.addEventListener('DOMContentLoaded', async function() {
  
  // 1. 공통 컴포넌트 로드
  await Promise.all([
    loadComponent('header.header', 'header.html', () => {
      activateCurrentMenu();
      setupMobileMenu();
    }),
    loadComponent('footer.footer', 'footer.html')
  ]);
  
  // 2. 페이지 히어로 설정 (필요한 경우)
  if (document.getElementById('page-hero-container')) {
    await configurePageHero();
  }

  // 3. 공통 UI 컴포넌트 초기화
  initScrollEffects();
  initTabs();
  initAccordion();
  initGalleryFilter();
  // initFacilitiesGallery(); // 이 함수는 initFacilitiesPage로 대체되었으므로 삭제합니다.

  // 4. 페이지별 고유 스크립트 실행 (필요한 경우)
  const currentPage = getCurrentPage();
  switch (currentPage) {
    case 'index.html':
    case '':
      initLatestNews();
      break;
    case 'academy_instructors.html':
      initInstructorsPage();
      break;
    case 'academy_location.html':
      initLocationMap();
      break;
    case 'community_gallery.html':
      initGalleryPage();
      break;
    case 'community_gallery_detail.html':
      initGalleryDetailPage();
      break;
    case 'community_jobs.html':
      initJobsPage();
      break;
    case 'community_jobs_detail.html':
      initJobsDetailPage();
      break;
    case 'community_jobs_write.html':
      initJobsWritePage();
      break;
    case 'job_employment.html':
      initEmploymentPage();
      break;
    case 'academy_facilities.html':
      initFacilitiesPage();
      break;
    case 'community_notice.html':
      initNoticePage();
      break;
    case 'community_notice_detail.html':
      initNoticeDetailPage();
      break;
    default:
      // 기본적으로 실행될 스크립트 없음
      break;
  }

  // 5. 화면 크기 변경 시 페이지 히어로 재설정
  window.addEventListener('resize', () => {
    const pagesWithCustomHero = ['academy_introduction.html', 'academy_history.html', 'academy_instructors.html', 'academy_facilities.html', 'academy_location.html'];
    if (pagesWithCustomHero.includes(getCurrentPage()) && document.getElementById('page-hero-container')) {
      configurePageHero();
    }
  });

  console.log("신동탄간호학원 스크립트 초기화 완료.");

  // 팝업 초기화 추가
  //initPopup();
});

/**
 * 강사진 페이지 초기화
 */
async function initInstructorsPage() {
  const instructorsSection = document.getElementById('instructors-section');
  if (!instructorsSection) return;

  const listView = document.getElementById('instructor-list-view');
  const detailView = document.getElementById('instructor-detail-view');
  const grid = document.getElementById('instructor-grid');

  try {
    // Supabase에서 강사 정보 가져오기
    if (window.db && window.db.instructors) {
      const instructors = await window.db.instructors.getAll();
      console.log('Supabase에서 강사 정보 로드 완료:', instructors.length, '명');
      
      if (!instructors || instructors.length === 0) {
        grid.innerHTML = '<p>등록된 강사 정보가 없습니다.</p>';
        return;
      }

      // 강사 목록 렌더링
      grid.innerHTML = instructors.map(instructor => `
        <div class="instructor-card">
          <div class="img-container">
            <img src="${instructor.image}" alt="${instructor.name} ${instructor.title}">
          </div>
          <div class="name">${instructor.name}</div>
          <div class="title">${instructor.title}</div>
          <button class="details-btn" data-id="${instructor.id}">자세히 보기</button>
        </div>
      `).join('');

      // '자세히 보기' 버튼 이벤트 리스너
      grid.addEventListener('click', (e) => {
        if (e.target.classList.contains('details-btn')) {
          const instructorId = e.target.dataset.id;
          const instructor = instructors.find(i => String(i.id) === instructorId);
          if (instructor) {
            showDetailView(instructor);
          }
        }
      });

      // 상세 뷰 렌더링 및 표시
      const showDetailView = (instructor) => {
        detailView.innerHTML = `
          <div class="instructor-detail-container">
            <div class="back-to-list">
              <i class="fas fa-arrow-left"></i>
              <span>목록으로 돌아가기</span>
            </div>
            <div class="detail-content">
              <div class="detail-img-container">
                <img src="${instructor.image}" alt="${instructor.name} ${instructor.title}">
              </div>
              <div class="detail-info">
                <div class="name">${instructor.name}</div>
                <div class="title">${instructor.title}</div>
                <ul class="details-list">
                  ${instructor.details.map(detail => `<li>${detail}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        `;
        
        listView.style.display = 'none';
        detailView.style.display = 'block';

        // 스크롤을 최상단으로 이동
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // '목록으로 돌아가기' 버튼 이벤트 리스너
        detailView.querySelector('.back-to-list').addEventListener('click', () => {
          detailView.style.display = 'none';
          listView.style.display = 'block';
          detailView.innerHTML = '';
        });
      };

    } else {
      // Supabase가 없는 경우 에러 메시지 표시
      console.error('Supabase 데이터베이스에 연결할 수 없습니다.');
      grid.innerHTML = '<p>강사 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</p>';
    }

  } catch (error) {
    console.error('강사 정보 페이지 초기화 오류:', error);
    grid.innerHTML = '<p>강사 정보를 불러오는 데 실패했습니다.</p>';
  }
}

/**
 * 오시는 길 페이지 지도 초기화
 */
function initLocationMap() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;

  // 학원 위치 좌표 (경기도 화성시 메타폴리스로 38, 반송동 103-2)
  const academyLatLng = [37.2019, 127.0705];

  // 지도 생성
  const map = L.map('map').setView(academyLatLng, 16);

  // 지도 타일 레이어 추가 (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // 마커 추가
  const marker = L.marker(academyLatLng).addTo(map);

  // 마커에 팝업 추가
  marker.bindPopup(
    `<b>신동탄간호학원</b><br>경기도 화성시 메타폴리스로 38 (반송동)<br>천년프라자 401호`
  ).openPopup();
}

/**
 * 갤러리 페이지 초기화 (Supabase 연동)
 */
async function initGalleryPage() {
  console.log('initGalleryPage 함수 시작');
  const listContainer = document.getElementById('gallery-list');
  if (!listContainer) {
    console.error('gallery-list 요소를 찾을 수 없습니다.');
    return;
  }
  try {
    // Supabase에서 갤러리 데이터 불러오기
    const allItems = await db.gallery.getAll();
    let currentPage = 1;
    let itemsPerPage = 12; // 고정값으로 변경
    let sortOrder = 'created_at_desc';
    let filteredItems = [...allItems];
    const searchInput = document.getElementById('gallery-search-input');
    const searchBtn = document.getElementById('gallery-search-btn');
    const paginationContainer = document.getElementById('pagination');
    const totalPostsCounter = document.getElementById('total-posts-counter');
    const searchTypeSelect = document.getElementById('gallery-search-type');
    const sortOrderSelect = document.getElementById('sort-order');

    function sortItems(items, order) {
      let sorted = [...items];
      switch (order) {
        case 'created_at_desc':
          sorted.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
          break;
        case 'created_at_asc':
          sorted.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
          break;
        case 'views_desc':
          sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
          break;
        case 'title_asc':
          sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
          break;
        default:
          break;
      }
      return sorted;
    }

    function performSearchAndRender() {
      const searchTerm = searchInput.value.toLowerCase().trim();
      const searchType = searchTypeSelect.value;
      filteredItems = allItems.filter(item => {
        if (!searchTerm) return true;
        const title = (item.title || '').toLowerCase();
        const content = (item.description || '').toLowerCase();
        switch (searchType) {
          case 'title':
            return title.includes(searchTerm);
          case 'content':
            return content.includes(searchTerm);
          case 'title_content':
            return title.includes(searchTerm) || content.includes(searchTerm);
          default:
            return true;
        }
      });
      filteredItems = sortItems(filteredItems, sortOrder);
      currentPage = 1;
      renderList(filteredItems, currentPage);
      setupPagination(filteredItems, currentPage);
    }

    searchBtn.addEventListener('click', performSearchAndRender);
    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearchAndRender(); });
    sortOrderSelect.addEventListener('change', function() {
      sortOrder = this.value;
      filteredItems = sortItems(filteredItems, sortOrder);
      renderList(filteredItems, 1);
      setupPagination(filteredItems, 1);
    });

    // 렌더링 함수
    function renderList(items, page) {
      const startIdx = (page - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      const pageItems = items.slice(startIdx, endIdx);
      listContainer.innerHTML = pageItems.map(item => {
        // parseGalleryImages 함수를 사용하여 안전하게 첫 번째 이미지만 가져오기
        const images = parseGalleryImages(item.image);
        const thumbnail = images[0] || '';
        
        // description에서 HTML 태그 제거하여 텍스트만 추출
        const descriptionText = (item.description || '').replace(/<[^>]*>/g, '');
        
        return `
          <div class="board-row">
            <img class="thumbnail" src="${thumbnail}" alt="썸네일">
            <div class="title-section">
              <a href="community_gallery_detail.html?id=${item.id}" class="title" onclick="incrementViewCount('gallery', ${item.id})">${item.title || ''}</a>
              <div class="description">${descriptionText}</div>
              <div class="meta-info">
                <span class="date">${formatKoreaDate(item.created_at)}</span>
                <span class="views" style="margin-left:8px;"><i class="fas fa-eye"></i> ${item.views || 0}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
      totalPostsCounter.textContent = `총 ${items.length}건`;
    }
    function setupPagination(items, page) {
      const totalPages = Math.ceil(items.length / itemsPerPage);
      const pagination = [];
      for (let i = 1; i <= totalPages; i++) {
        pagination.push(`<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`);
      }
      paginationContainer.innerHTML = pagination.join('');
      paginationContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function() {
          const p = parseInt(this.dataset.page);
          renderList(items, p);
          setupPagination(items, p);
        });
      });
    }
    // 초기 렌더링
    filteredItems = sortItems(filteredItems, sortOrder);
    renderList(filteredItems, currentPage);
    setupPagination(filteredItems, currentPage);
    console.log('initGalleryPage 함수 완료');
  } catch (error) {
    console.error('갤러리 페이지 초기화 오류:', error);
    listContainer.innerHTML += '<p style="text-align: center; padding: 2rem;">게시물을 불러오는 데 실패했습니다.</p>';
  }
}

/**
 * 갤러리 상세 페이지 초기화 (Supabase 연동)
 */
async function initGalleryDetailPage() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = parseInt(urlParams.get('id'));
    if (!postId) throw new Error('잘못된 접근입니다.');

    // Supabase에서 전체 gallery 데이터 가져오기
    const allItems = await db.gallery.getAll();
    // 현재 게시물 찾기
    const currentItem = allItems.find(item => item.id === postId);
    if (!currentItem) throw new Error('게시글을 찾을 수 없습니다.');

    // 조회수 증가
    await incrementViewCount('gallery', postId);

    // 최신순 정렬로 이전/다음글 계산
    const sortedItems = allItems.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const currentIndex = sortedItems.findIndex(item => item.id === postId);
    const prevPost = currentIndex > 0 ? sortedItems[currentIndex - 1] : null;
    const nextPost = currentIndex < sortedItems.length - 1 ? sortedItems[currentIndex + 1] : null;

    // 여러 이미지 모두 렌더링
    const images = parseGalleryImages(currentItem.image);
    const imagesHtml = images.map(img => `<img src="${img}" alt="${currentItem.title}" style="max-width:100%;margin-bottom:1rem;">`).join('');
    const imageGroupEl = document.getElementById('gallery-detail-image-group');
    if (imageGroupEl) {
      imageGroupEl.innerHTML = imagesHtml;
    } else {
      // fallback: 기존 단일 이미지 영역이 있다면 대체
      const imageEl = document.getElementById('gallery-detail-image');
      if (imageEl) {
        imageEl.outerHTML = `<div id="gallery-detail-image-group">${imagesHtml}</div>`;
      }
    }

    // 페이지 내용 업데이트
    document.getElementById('gallery-detail-title').textContent = currentItem.title;
    document.getElementById('gallery-detail-author').textContent = currentItem.author || '';
    document.getElementById('gallery-detail-date').textContent = formatKoreaDate(currentItem.created_at);
    document.getElementById('gallery-detail-views').textContent = currentItem.views || 0;
    // Quill 에디터 내용을 ql-editor 클래스로 감싸서 표시
    document.getElementById('gallery-detail-text').innerHTML = `<div class="ql-editor">${currentItem.description || ''}</div>`;

    // 이전/다음글 네비게이션 업데이트
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    
    if (prevButton) {
      if (nextPost) {
        prevButton.href = `community_gallery_detail.html?id=${nextPost.id}`;
        prevButton.onclick = () => incrementViewCount('gallery', nextPost.id);
      } else {
        prevButton.classList.add('disabled');
        prevButton.href = '#';
        prevButton.onclick = (e) => e.preventDefault();
      }
    }
    
    if (nextButton) {
      if (prevPost) {
        nextButton.href = `community_gallery_detail.html?id=${prevPost.id}`;
        nextButton.onclick = () => incrementViewCount('gallery', prevPost.id);
      } else {
        nextButton.classList.add('disabled');
        nextButton.href = '#';
        nextButton.onclick = (e) => e.preventDefault();
      }
    }
    
  } catch (error) {
    console.error('갤러리 상세 페이지 초기화 오류:', error);
    // 에러 메시지를 갤러리 내용 영역에 표시
    const textElement = document.getElementById('gallery-detail-text');
    if (textElement) {
      textElement.innerHTML = '<p style="text-align: center; padding: 4rem; color: #666;">게시물을 불러오는 데 실패했습니다.</p>';
    }
  }
}

// =============================================================================
// Helper functions for localStorage
// =============================================================================
function getLocalJobs() {
    return JSON.parse(localStorage.getItem('shindongtan_jobs')) || [];
}

function saveLocalJobs(jobs) {
    localStorage.setItem('shindongtan_jobs', JSON.stringify(jobs));
}

function getJobViews() {
    return JSON.parse(localStorage.getItem('shindongtan_job_views')) || {};
}

function saveJobViews(views) {
    localStorage.setItem('shindongtan_job_views', JSON.stringify(views));
}

function incrementJobView(postId) {
    const viewedInSession = sessionStorage.getItem(`job_viewed_${postId}`);
    if (viewedInSession) return;

    const views = getJobViews();
    views[postId] = (views[postId] || 0) + 1;
    saveJobViews(views);

    sessionStorage.setItem(`job_viewed_${postId}`, 'true');
}

/**
 * 취업/구인정보 페이지 초기화 (Supabase 연동)
 */
async function initJobsPage() {
  const listContainer = document.getElementById('jobs-list');
  if (!listContainer) return;

  try {
    // Supabase에서 jobs 데이터 불러오기
    const allItems = await db.jobs.getAll();
    let currentPage = 1;
    let itemsPerPage = 10;
    let sortOrder = 'created_at_desc';
    let filteredItems = [...allItems];
    const searchInput = document.getElementById('jobs-search-input');
    const searchBtn = document.getElementById('jobs-search-btn');
    const paginationContainer = document.getElementById('pagination');
    const totalPostsCounter = document.getElementById('total-posts-counter');
    const searchTypeSelect = document.getElementById('jobs-search-type');
    const itemsPerPageSelect = document.getElementById('items-per-page-select');

    function sortItems(items, order) {
      let sorted = [...items];
      switch (order) {
        case 'created_at_desc':
          sorted.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
          break;
        case 'created_at_asc':
          sorted.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
          break;
        case 'views_desc':
          sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
          break;
        case 'title_asc':
          sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
          break;
        default:
          break;
      }
      return sorted;
    }

    function performSearchAndRender() {
      const searchTerm = searchInput.value.toLowerCase().trim();
      const searchType = searchTypeSelect.value;
      filteredItems = allItems.filter(item => {
        if (!searchTerm) return true;
        const title = (item.title || '').toLowerCase();
        const content = (item.description || item.content || '').toLowerCase();
        switch (searchType) {
          case 'title':
            return title.includes(searchTerm);
          case 'content':
            return content.includes(searchTerm);
          case 'title_content':
            return title.includes(searchTerm) || content.includes(searchTerm);
          default:
            return true;
        }
      });
      filteredItems = sortItems(filteredItems, sortOrder);
      currentPage = 1;
      renderList(filteredItems, currentPage);
      setupPagination(filteredItems, currentPage);
    }

    // 렌더링 함수
    function renderList(items, page) {
      // 중요공지 먼저, 그 안에서 최신순, 일반공지도 최신순
      items = [...items].sort((a, b) => {
        if ((b.isnotice || b.isNotice ? 1 : 0) !== (a.isnotice || a.isNotice ? 1 : 0)) {
          return (b.isnotice || b.isNotice ? 1 : 0) - (a.isnotice || a.isNotice ? 1 : 0);
        }
        return (b.date || b.created_at || '').localeCompare(a.date || a.created_at || '');
      });
      const header = listContainer.querySelector('.board-header');
      listContainer.innerHTML = '';
      listContainer.appendChild(header);
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const paginatedItems = items.slice(start, end);
      paginatedItems.forEach((item, index) => {
        const itemNumber = items.length - start - index;
        const row = createRow(item, itemNumber);
        listContainer.appendChild(row);
      });
      totalPostsCounter.textContent = `전체 ${items.length}개`;
    }
    
    function createRow(item, itemNumber) {
      const isNotice = item.isnotice || item.isNotice;
      const row = document.createElement('div');
      row.className = `board-row${isNotice ? ' notice' : ''}`;
      row.innerHTML = `
        <div class="number">${isNotice ? '공지' : itemNumber}</div>
        <div class="title"><a href="community_jobs_detail.html?id=${item.id}" onclick="incrementViewCount('jobs', ${item.id})">${isNotice ? '📢 <span style=\"color:#d92121;font-weight:600;\">중요</span> ' : ''}${item.title}</a></div>
        <div class="author">${item.author || '관리자'}</div>
        <div class="date">${formatKoreaDate(item.date || item.created_at)}</div>
        <div class="views">${item.views || 0}</div>
      `;
      return row;
    }
    
    function setupPagination(items, page) {
      paginationContainer.innerHTML = '';
      const pageCount = Math.ceil(items.length / itemsPerPage);
      if (pageCount <= 1) return;
      
      // 이전 페이지 버튼
      if (page > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.addEventListener('click', () => {
          currentPage = page - 1;
          renderList(items, currentPage);
          setupPagination(items, currentPage);
        });
        paginationContainer.appendChild(prevBtn);
      }
      
      // 페이지 번호 버튼들
      const startPage = Math.max(1, page - 2);
      const endPage = Math.min(pageCount, page + 2);
      
      for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.innerText = i;
        if (i === page) pageBtn.classList.add('active');
        pageBtn.addEventListener('click', () => {
          currentPage = i;
          renderList(items, currentPage);
          setupPagination(items, currentPage);
        });
        paginationContainer.appendChild(pageBtn);
      }
      
      // 다음 페이지 버튼
      if (page < pageCount) {
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.addEventListener('click', () => {
          currentPage = page + 1;
          renderList(items, currentPage);
          setupPagination(items, currentPage);
        });
        paginationContainer.appendChild(nextBtn);
      }
    }

    // 게시글 개수 변경 이벤트
    itemsPerPageSelect.addEventListener('change', function() {
      itemsPerPage = parseInt(this.value);
      currentPage = 1;
      renderList(filteredItems, currentPage);
      setupPagination(filteredItems, currentPage);
    });

    searchBtn.addEventListener('click', performSearchAndRender);
    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearchAndRender(); });

    // 초기 렌더링
    filteredItems = sortItems(filteredItems, sortOrder);
    renderList(filteredItems, currentPage);
    setupPagination(filteredItems, currentPage);
  } catch (error) {
    console.error('취업/구인정보 페이지 초기화 오류:', error);
    listContainer.innerHTML += '<p style="text-align: center; padding: 2rem;">게시물을 불러오는 데 실패했습니다.</p>';
  }
}

/**
 * 취업/구인정보 상세 페이지 초기화 (Supabase 연동)
 */
async function initJobsDetailPage() {
  const viewContainer = document.getElementById('post-detail-view');
  if (!viewContainer) return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = parseInt(urlParams.get('id'));
    if (!postId) throw new Error('잘못된 접근입니다.');

    // Supabase에서 전체 jobs 데이터 가져오기
    const allItems = await db.jobs.getAll();
    // 현재 게시물 찾기
    const post = allItems.find(item => item.id === postId);
    if (!post) throw new Error('게시글을 찾을 수 없습니다.');

    // 조회수 증가
    await incrementViewCount('jobs', postId);

    // 최신순 정렬로 이전/다음글 계산
    const sortedItems = allItems.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const currentIndex = sortedItems.findIndex(item => item.id === postId);
    const prevPost = currentIndex > 0 ? sortedItems[currentIndex - 1] : null;
    const nextPost = currentIndex < sortedItems.length - 1 ? sortedItems[currentIndex + 1] : null;

    const isNotice = post.isnotice || post.isNotice;
    viewContainer.innerHTML = `
      <div class="post-view">
        <div class="post-header">
          <h2>${isNotice ? '<span style="color:#d92121;font-weight:600;">📢 중요</span> ' : ''}${post.title}</h2>
          <div class="post-meta">
            <span><i class="fas fa-user"></i> ${post.author || ''}</span>
            <span><i class="fas fa-calendar-alt"></i> ${formatKoreaDate(post.date || post.created_at)}</span>
            <span><i class="fas fa-eye"></i> ${post.views || 0}</span>
          </div>
        </div>
        <div class="post-body">
          <div class="ql-editor">
            ${(post.content || post.description || '').replace(/\n/g, '<br>')}
          </div>
        </div>
        <ul class="post-nav">
          <li>
              <div class="nav-label">이전글</div>
              ${nextPost ? `<a href="community_jobs_detail.html?id=${nextPost.id}" class="nav-title" onclick="incrementViewCount('jobs', ${nextPost.id})">${nextPost.title}</a>` : '<span>이전글이 없습니다.</span>'}
          </li>
          <li>
              <div class="nav-label">다음글</div>
              ${prevPost ? `<a href="community_jobs_detail.html?id=${prevPost.id}" class="nav-title" onclick="incrementViewCount('jobs', ${prevPost.id})">${prevPost.title}</a>` : '<span>다음글이 없습니다.</span>'}
          </li>
        </ul>
        <div class="post-footer">
          <a href="community_jobs.html" class="list-button">목록</a>
        </div>
      </div>
    `;

    // 첨부파일 링크에 클릭 이벤트 추가 (원본 파일명으로 다운로드)
    const attachmentLinks = viewContainer.querySelectorAll('a[download]');
    attachmentLinks.forEach(link => {
      link.addEventListener('click', async function(e) {
        e.preventDefault();
        // data-original-filename 속성에서 원본 파일명 가져오기
        const originalFileName = this.getAttribute('data-original-filename') || this.getAttribute('download');
        const fileUrl = this.href;
        
        try {
          // 파일 다운로드
          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error('파일을 다운로드할 수 없습니다.');
          
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          
          // 원본 파일명으로 다운로드
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = originalFileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // 메모리 정리
          window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
          console.error('파일 다운로드 오류:', error);
          alert('파일 다운로드 중 오류가 발생했습니다.');
        }
      });
    });
  } catch (error) {
    console.error('취업/구인정보 상세 페이지 초기화 오류:', error);
    viewContainer.innerHTML = '<p style="text-align: center; padding: 4rem;">게시물을 불러오는 데 실패했습니다.</p>';
  }
}

/**
 * 취업/구인정보 글쓰기 페이지 초기화
 */
function initJobsWritePage() {
  const form = document.querySelector('.write-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault(); // 기본 폼 제출 동작을 막음

    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    const localJobs = getLocalJobs();
    // 새 게시물 ID는 1000부터 시작하여 기존 데이터와 충돌 방지
    const maxId = localJobs.reduce((max, job) => Math.max(max, job.id), 999);

    const newPost = {
      id: maxId + 1,
      isNotice: false,
      title: title.trim(),
      author: '방문자',
      date: new Date().toISOString().split('T')[0],
      views: 0,
      content: content.trim()
    };

    const updatedJobs = [...localJobs, newPost];
    saveLocalJobs(updatedJobs);
    
    alert('게시글이 성공적으로 등록되었습니다.');
    
    // 목록 페이지로 리디렉션
    window.location.href = 'community_jobs.html';
  });
}

/**
 * 취업(협력기관) 페이지 초기화
 */
async function initEmploymentPage() {
  const partnersListContainer = document.getElementById('partners-list');
  if (!partnersListContainer) return;

  try {
    const response = await fetch('db.json');
    if (!response.ok) throw new Error('데이터를 불러오지 못했습니다.');
    const db = await response.json();
    const partners = db.partner_hospitals || [];

    if (partners.length === 0) {
      partnersListContainer.innerHTML = '<div class="error-message">등록된 협력기관 정보가 없습니다.</div>';
      return;
    }

    partnersListContainer.innerHTML = partners.map(partner => `
      <div class="partner-card">
        <div class="partner-icon"><i class="${partner.icon}"></i></div>
        <h3>${partner.name}</h3>
        <p>${partner.description}</p>
      </div>
    `).join('');

  } catch (error) {
    console.error('협력기관 페이지 초기화 오류:', error);
    partnersListContainer.innerHTML = '<div class="error-message">정보를 불러오는 중 오류가 발생했습니다.</div>';
  }
}

/**
 * 시설 둘러보기 페이지 초기화 (Supabase 연동)
 */
async function initFacilitiesPage() {
    const sliderWrapper = document.getElementById('facilities-slider');
    if (!sliderWrapper) return;

    const mainImage = document.getElementById('slider-main-image');
    const thumbnailsContainer = document.getElementById('slider-thumbnails');
    const prevBtn = document.getElementById('slider-prev-btn');
    const nextBtn = document.getElementById('slider-next-btn');

    try {
        // Supabase에서 시설 이미지 불러오기
        const facilities = await db.facilities.getAll();
        if (!facilities || facilities.length === 0) {
            sliderWrapper.innerHTML = '<p>현재 등록된 시설 이미지가 없습니다. 관리자 페이지에서 추가해주세요.</p>';
            sliderWrapper.classList.add('loaded');
            return;
        }

        let currentIndex = 0;

        function showImage(index) {
            if (index < 0) {
                index = facilities.length - 1;
            } else if (index >= facilities.length) {
                index = 0;
            }
            currentIndex = index;

            const facility = facilities[currentIndex];
            mainImage.src = facility.src || facility.image_url;
            mainImage.alt = facility.alt || '';

            // Update active thumbnail
            document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
                thumb.classList.toggle('active', i === currentIndex);
            });
        }

        // Populate thumbnails
        thumbnailsContainer.innerHTML = '';
        facilities.forEach((facility, index) => {
            const thumb = document.createElement('img');
            thumb.src = facility.src || facility.image_url;
            thumb.alt = facility.alt || '';
            thumb.className = 'thumbnail';
            thumb.addEventListener('click', () => showImage(index));
            thumbnailsContainer.appendChild(thumb);
        });
        
        // Add event listeners for prev/next buttons
        prevBtn.addEventListener('click', () => showImage(currentIndex - 1));
        nextBtn.addEventListener('click', () => showImage(currentIndex + 1));
        
        // Show the first image
        showImage(0);

        // Make slider visible after loading
        sliderWrapper.classList.add('loaded');

    } catch (error) {
        console.error('시설 안내 페이지 초기화 오류:', error);
        sliderWrapper.innerHTML = '<p>시설 이미지를 불러오는 중 오류가 발생했습니다.</p>';
        sliderWrapper.classList.add('loaded');
    }
}

/**
 * 공지사항 페이지 초기화 (Supabase 연동)
 */
async function initNoticePage() {
  const listContainer = document.getElementById('notice-list');
  if (!listContainer) return;

  try {
    // Supabase에서 공지사항 데이터 가져오기
    const { data: allItems, error } = await window.supabaseClient
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    let currentPage = 1;
    let itemsPerPage = 10;

    const searchInput = document.getElementById('notice-search-input');
    const searchBtn = document.getElementById('notice-search-btn');
    const paginationContainer = document.getElementById('pagination');
    const totalPostsCounter = document.getElementById('total-posts-counter');
    const searchTypeSelect = document.getElementById('notice-search-type');
    const itemsPerPageSelect = document.getElementById('items-per-page-select');

    function renderList(items, page) {
      // 중요공지 먼저, 그 안에서 최신순, 일반공지도 최신순
      items = [...items].sort((a, b) => {
        if ((b.isnotice || b.isNotice ? 1 : 0) !== (a.isnotice || a.isNotice ? 1 : 0)) {
          return (b.isnotice || b.isNotice ? 1 : 0) - (a.isnotice || a.isNotice ? 1 : 0);
        }
        return (b.date || b.created_at || '').localeCompare(a.date || a.created_at || '');
      });
      const header = listContainer.querySelector('.board-header');
      listContainer.innerHTML = '';
      listContainer.appendChild(header);

      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const paginatedItems = items.slice(start, end);

      paginatedItems.forEach((item, index) => {
        const itemNumber = items.length - start - index;
        const row = createRow(item, itemNumber);
        listContainer.appendChild(row);
      });
      totalPostsCounter.textContent = `전체 ${items.length}개`;
    }

    function createRow(item, itemNumber) {
      const row = document.createElement('div');
      row.className = 'board-row';
      if (item.isnotice || item.isNotice) row.classList.add('notice');
      row.innerHTML = `
        <div class="number">${item.isnotice || item.isNotice ? '공지' : itemNumber}</div>
        <div class="title"><a href="community_notice_detail.html?id=${item.id}" onclick="incrementViewCount('notices', ${item.id})">${(item.isnotice || item.isNotice) ? '📢 <span style=\"color:#d92121;font-weight:600;\">중요</span> ' : ''}${item.title}</a></div>
        <div class="author">${item.author || '관리자'}</div>
        <div class="date">${formatKoreaDate(item.date || item.created_at)}</div>
        <div class="views">${item.views || 0}</div>
      `;
      return row;
    }

    function setupPagination(items, page) {
      paginationContainer.innerHTML = '';
      const pageCount = Math.ceil(items.length / itemsPerPage);
      if (pageCount <= 1) return;
      
      // 이전 페이지 버튼
      if (page > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.addEventListener('click', () => {
          currentPage = page - 1;
          renderList(items, currentPage);
          setupPagination(items, currentPage);
        });
        paginationContainer.appendChild(prevBtn);
      }
      
      // 페이지 번호 버튼들
      const startPage = Math.max(1, page - 2);
      const endPage = Math.min(pageCount, page + 2);
      
      for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.innerText = i;
        if (i === page) pageBtn.classList.add('active');
        pageBtn.addEventListener('click', () => {
          currentPage = i;
          renderList(items, currentPage);
          setupPagination(items, currentPage);
        });
        paginationContainer.appendChild(pageBtn);
      }
      
      // 다음 페이지 버튼
      if (page < pageCount) {
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.addEventListener('click', () => {
          currentPage = page + 1;
          renderList(items, currentPage);
          setupPagination(items, currentPage);
        });
        paginationContainer.appendChild(nextBtn);
      }
    }

    function performSearch() {
      const searchTerm = searchInput.value.toLowerCase().trim();
      const searchType = searchTypeSelect.value;
      const filteredItems = allItems.filter(item => {
        if (!searchTerm) return true;
        const title = (item.title || '').toLowerCase();
        const content = (item.content || '').toLowerCase();
        switch (searchType) {
          case 'title':
            return title.includes(searchTerm);
          case 'content':
            return content.includes(searchTerm);
          case 'title_content':
            return title.includes(searchTerm) || content.includes(searchTerm);
          default:
            return true;
        }
      });
      currentPage = 1;
      renderList(filteredItems, currentPage);
      setupPagination(filteredItems, currentPage);
    }

    // 게시글 개수 변경 이벤트
    itemsPerPageSelect.addEventListener('change', function() {
      itemsPerPage = parseInt(this.value);
      currentPage = 1;
      renderList(allItems, currentPage);
      setupPagination(allItems, currentPage);
    });

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearch(); });

    // Initial Render
    renderList(allItems, currentPage);
    setupPagination(allItems, currentPage);
  } catch (error) {
    console.error('공지사항 페이지 초기화 오류:', error);
    listContainer.innerHTML += '<p style="text-align: center; padding: 2rem;">게시물을 불러오는 데 실패했습니다.</p>';
  }
}

/**
 * 공지사항 상세 페이지 초기화 (Supabase 연동)
 */
async function initNoticeDetailPage() {
  const detailContainer = document.getElementById('notice-detail-view');
  if (!detailContainer) return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = parseInt(urlParams.get('id'));
    if (!postId) throw new Error('잘못된 접근입니다.');

    // Supabase에서 전체 notices 데이터 가져오기
    const allItems = await db.notices.getAll();
    // 현재 게시물 찾기
    const post = allItems.find(item => item.id === postId);
    if (!post) throw new Error('게시글을 찾을 수 없습니다.');

    // 조회수 증가
    await incrementViewCount('notices', postId);

    // 최신순 정렬로 이전/다음글 계산
    const sortedItems = allItems.sort((a, b) => (b.created_at || '').localeCompare(a.date || a.created_at || ''));
    const currentIndex = sortedItems.findIndex(item => item.id === postId);
    const prevPost = currentIndex > 0 ? sortedItems[currentIndex - 1] : null;
    const nextPost = currentIndex < sortedItems.length - 1 ? sortedItems[currentIndex + 1] : null;

    // 첨부파일 링크에 download 속성 추가
    let processedContent = post.content;
    if (processedContent) {
      // 첨부파일 링크 찾기 및 download 속성 추가
      processedContent = processedContent.replace(
        /<a href="([^"]*notice-attachments[^"]*)"([^>]*)>\[첨부파일: ([^\]]+)\]<\/a>/g,
        '<a href="$1" download="$3"$2>[첨부파일: $3]</a>'
      );
    }

    // 상세 페이지 HTML 생성
    detailContainer.innerHTML = `
      <div class="post-view">
        <div class="post-header">
          <h2>${post.title}</h2>
          <div class="post-meta">
            <span><i class="fas fa-user"></i> ${post.author || '관리자'}</span>
            <span><i class="fas fa-calendar"></i> ${formatKoreaDate(post.date || post.created_at)}</span>
            <span><i class="fas fa-eye"></i> ${post.views || 0}회</span>
          </div>
        </div>
        <div class="post-body">
          <div class="ql-editor">${processedContent}</div>
        </div>
        <div class="post-footer">
          <a href="community_notice.html" class="list-button">목록으로</a>
        </div>
      </div>
    `;

    // 첨부파일 링크에 클릭 이벤트 추가 (원본 파일명으로 다운로드)
    const attachmentLinks = detailContainer.querySelectorAll('a[download]');
    attachmentLinks.forEach(link => {
      link.addEventListener('click', async function(e) {
        e.preventDefault();
        // data-original-filename 속성에서 원본 파일명 가져오기
        const originalFileName = this.getAttribute('data-original-filename') || this.getAttribute('download');
        const fileUrl = this.href;
        
        try {
          // 파일 다운로드
          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error('파일을 다운로드할 수 없습니다.');
          
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          
          // 원본 파일명으로 다운로드
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = originalFileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // 메모리 정리
          window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
          console.error('파일 다운로드 오류:', error);
          alert('파일 다운로드 중 오류가 발생했습니다.');
        }
      });
    });
  } catch (error) {
    console.error('공지사항 상세 페이지 초기화 오류:', error);
    detailContainer.innerHTML = '<p style="text-align: center; padding: 4rem;">게시물을 불러오는 데 실패했습니다.</p>';
  }
}

/**
 * 홈페이지 최신 소식 섹션을 초기화합니다.
 */
async function initLatestNews() {
  try {
    console.log('최신 소식 섹션 초기화 시작...');
    // Supabase에서 공지사항과 Q&A 데이터를 병렬로 로드
    const [notices, qaData] = await Promise.all([
      window.db.notices.getLatest(5),
      window.db.qa.getLatest(7)
    ]);
    // 공지사항 렌더링
    renderLatestNotices(notices);
    // Q&A 렌더링
    renderLatestQA(qaData);
    console.log('최신 소식 섹션 초기화 완료');
  } catch (error) {
    console.error('최신 소식 로드 중 오류 발생:', error);
    // 에러 상태 표시
    const noticesContainer = document.getElementById('latest-notices');
    const qaContainer = document.getElementById('latest-qa');
    if (noticesContainer) {
      noticesContainer.innerHTML = `
        <div class="news-error">
          <i class="fas fa-exclamation-triangle"></i>
          <span>공지사항을 불러오는 중 문제가 발생했습니다.</span>
        </div>
      `;
    }
    if (qaContainer) {
      qaContainer.innerHTML = `
        <div class="news-error">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Q&A를 불러오는 중 문제가 발생했습니다.</span>
        </div>
      `;
    }
  }
}

/**
 * 공지사항 관련 유틸리티 함수들
 */
function getLocalNotices() {
  const stored = localStorage.getItem('shindongtan_notices');
  return stored ? JSON.parse(stored) : [];
}

function saveLocalNotices(notices) {
  localStorage.setItem('shindongtan_notices', JSON.stringify(notices));
}

function getNoticeViews() {
  const stored = localStorage.getItem('noticeViews');
  return stored ? JSON.parse(stored) : {};
}

function saveNoticeViews(views) {
  localStorage.setItem('noticeViews', JSON.stringify(views));
}

function incrementNoticeView(postId) {
  const views = getNoticeViews();
  views[postId] = (views[postId] || 0) + 1;
  saveNoticeViews(views);
}

// 갤러리 관련 유틸리티 함수들
function getLocalGallery() {
  const stored = localStorage.getItem('shindongtan_gallery');
  return stored ? JSON.parse(stored) : [];
}

function saveLocalGallery(gallery) {
  localStorage.setItem('shindongtan_gallery', JSON.stringify(gallery));
}

function getGalleryViews() {
  const stored = localStorage.getItem('shindongtan_gallery_views');
  return stored ? JSON.parse(stored) : {};
}

function saveGalleryViews(views) {
  localStorage.setItem('shindongtan_gallery_views', JSON.stringify(views));
}

function incrementGalleryView(postId) {
  const views = getGalleryViews();
  views[postId] = (views[postId] || 0) + 1;
  saveGalleryViews(views);
}

/**
 * 최신 공지사항을 렌더링합니다.
 */
function renderLatestNotices(notices) {
  const container = document.getElementById('latest-notices');
  if (!container) return;
  
  if (!notices || notices.length === 0) {
    container.innerHTML = `<div class="loading-message" style="text-align: center; padding: 2rem; color: #777;">등록된 공지사항이 없습니다.</div>`;
    return;
  }
  
  const noticesHTML = notices.map(notice => {
    const title = notice.title || '제목 없음';
    const date = notice.date ? formatKoreaDate(notice.date) : '날짜 없음';
    const isNotice = notice.isNotice || false;
    
    return `
      <a href="community_notice_detail.html?id=${notice.id || ''}" class="preview-item">
        <div class="preview-item-icon">
          <i class="fas fa-bell"></i>
        </div>
        <div class="preview-item-text">
          <span class="title">${isNotice ? '[공지] ' : ''}${title}</span>
          <div class="meta">
            <i class="fas fa-calendar-alt"></i>
            <span>${date}</span>
          </div>
        </div>
      </a>
    `;
  }).join('');
  
  container.innerHTML = noticesHTML;
}

/**
 * 최신 Q&A를 렌더링합니다.
 */
function renderLatestQA(qaData) {
  const container = document.getElementById('latest-qa');
  if (!container) return;
  
  if (!qaData || qaData.length === 0) {
    container.innerHTML = `<div class="loading-message" style="text-align: center; padding: 2rem; color: #777;">등록된 Q&A가 없습니다.</div>`;
    return;
  }
  
  const qaHTML = qaData.map(qa => {
    const question = qa.question || '질문 없음';
    
    return `
      <a href="community_qa.html" class="preview-item">
        <div class="preview-item-icon">
          <b>Q</b>
        </div>
        <div class="preview-item-text">
          <span class="title">${question}</span>
        </div>
      </a>
    `;
  }).join('');
  
  container.innerHTML = qaHTML;
}

/**
 * 날짜를 포맷팅합니다.
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return '오늘';
  } else if (diffDays === 2) {
    return '어제';
  } else if (diffDays <= 7) {
    return `${diffDays - 1}일 전`;
  } else {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

/**
 * 최신 공지사항 5개를 로드합니다.
 */
async function loadLatestNotices() {
  try {
    console.log('공지사항 데이터 로드 시작...');
    
    // Supabase에서 공지사항 데이터 가져오기
    if (window.db && window.db.notices) {
      const notices = await window.db.notices.getLatest(5);
      console.log('Supabase에서 공지사항 로드 완료:', notices.length, '개');
      return notices;
    } else {
      // Supabase가 없는 경우 기존 db.json 사용
      const response = await fetch('db.json');
      if (!response.ok) {
        throw new Error(`db.json 로드 실패: ${response.status} ${response.statusText}`);
      }
      const db = await response.json();
      
      // 공지사항 데이터가 있으면 반환, 없으면 기본 데이터 생성
      if (db.notices && db.notices.length > 0) {
        const latestNotices = db.notices.slice(0, 5); // 최신 5개만
        console.log('db.json에서 공지사항 로드 완료:', latestNotices.length, '개');
        return latestNotices;
      } else {
        // 기본 공지사항 데이터 생성 (fallback)
        const defaultNotices = [
          {
            id: 1,
            title: "2024년 간호조무사 교육과정 모집 안내",
            content: "2024년 간호조무사 교육과정 모집이 시작되었습니다. 국민내일배움카드 지원으로 부담없이 수강하실 수 있습니다.",
            author: "관리자",
            date: "2024-01-15",
            views: 156
          },
          {
            id: 2,
            title: "2024년 국가시험 일정 안내",
            content: "2024년 간호조무사 국가시험 일정이 발표되었습니다. 수험생 여러분의 많은 관심 바랍니다.",
            author: "관리자",
            date: "2024-01-10",
            views: 203
          },
          {
            id: 3,
            title: "겨울방학 특별 프로그램 안내",
            content: "겨울방학을 맞아 특별 프로그램을 운영합니다. 실습 중심의 교육으로 실무 능력을 향상시킬 수 있습니다.",
            author: "관리자",
            date: "2024-01-05",
            views: 89
          }
        ];
        console.log('기본 공지사항 데이터 생성 완료:', defaultNotices.length, '개');
        return defaultNotices;
      }
    }
    
  } catch (error) {
    console.error('공지사항 로드 중 오류:', error);
    return [];
  }
}

/**
 * 최신 Q&A 데이터를 로드합니다.
 */
async function loadLatestQA() {
  try {
    console.log('Q&A 데이터 로드 시작...');
    
    // db.json에서 Q&A 데이터 가져오기
    const response = await fetch('db.json');
    if (!response.ok) {
      throw new Error(`db.json 로드 실패: ${response.status} ${response.statusText}`);
    }
    const db = await response.json();
    
    // Q&A 데이터가 있으면 반환, 없으면 기본 데이터 생성
    if (db.qa && db.qa.length > 0) {
      const latestQA = db.qa.slice(0, 7); // 최신 7개만
      console.log('Q&A 데이터 로드 완료:', latestQA.length, '개');
      return latestQA;
    } else {
      // 기본 Q&A 데이터 생성 (fallback)
      const defaultQA = [
        {
          id: 1,
          question: "간호조무사 자격증은 어떻게 취득하나요?",
          answer: "고등학교 졸업 이상의 학력을 소지하고, 보건복지부 지정 교육훈련기관에서 총 1,520시간의 이론 및 실습 교육을 이수한 후 국가시험에 합격하면 자격증이 발급됩니다.",
          category: "자격증"
        },
        {
          id: 2,
          question: "국민내일배움카드(국비) 지원이 가능한가요?",
          answer: "네, 가능합니다. 국민내일배움카드는 고용노동부에서 지원하는 국비지원 제도이며, 조건만 충족하면 대부분의 국민이 신청할 수 있습니다.",
          category: "국비지원"
        },
        {
          id: 3,
          question: "실습은 어떤 식으로 진행되나요?",
          answer: "실습은 크게 학원 내 실습과 의료기관 실습으로 나뉘며, 현장 적응력을 높이는 데 중점을 둡니다.",
          category: "실습"
        },
        {
          id: 4,
          question: "신동탄간호학원의 취업률은 어떤가요?",
          answer: "신동탄간호학원은 체계적인 교육과 밀착형 취업 관리를 통해 높은 취업률을 자랑합니다. 최근 기준 93.3% 이상의 취업률을 보이고 있습니다.",
          category: "취업"
        },
        {
          id: 5,
          question: "간호조무사 급여는 어느 정도 되나요?",
          answer: "간호조무사의 급여는 근무하는 지역, 의료기관의 규모, 경력 등에 따라 차이가 있습니다. 신입 기준 평균 월급 190~220만 원 수준입니다.",
          category: "급여"
        }
      ];
      console.log('기본 Q&A 데이터 생성 완료:', defaultQA.length, '개');
      return defaultQA;
    }
    
  } catch (error) {
    console.error('Q&A 로드 중 오류:', error);
    return [];
  }
}

// education_, job_, recruitment_, community_ 페이지에서 모바일 환경에서 data-page 속성 자동 추가
(function() {
  var isMobile = window.matchMedia('(max-width: 768px)').matches;
  var page = location.pathname.split('/').pop();
  if (isMobile && (
    page.startsWith('education_') ||
    page.startsWith('job_') ||
    page.startsWith('recruitment_') ||
    page.startsWith('community_')
  )) {
    document.body.setAttribute('data-page', page);
  }
})();

// 갤러리 썸네일/상세 이미지 렌더링 시 기존 미리보기 모두 삭제
function removeAllGalleryImagePreviews() {
    document.querySelectorAll('.current-image-preview').forEach(el => el.remove());
}

// 기존 renderGalleryImagePreviews 함수(또는 갤러리 이미지 미리보기 렌더링 직전)에 아래 코드 추가 예시:
// removeAllGalleryImagePreviews();
// ...이후 새로 미리보기 렌더링...

// parseGalleryImages 함수는 그대로 유지
function parseGalleryImages(imageField) {
    let images = [];
    if (Array.isArray(imageField)) {
        images = imageField;
    } else if (typeof imageField === 'string') {
        try {
            images = JSON.parse(imageField);
            if (!Array.isArray(images)) images = [images];
        } catch {
            images = [imageField];
        }
    } else {
        images = [];
    }
    return images;
}
