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
                <a href="job_employment.html">취업</a>
              </div>
            </li>
            <li class="menu-item">
              <a href="#" class="menu-link">커뮤니티</a>
              <div class="submenu">
                <a href="community_notice.html">공지사항</a>
                <a href="community_qa.html">Q&A</a>
                <a href="community_gallery.html">갤러리</a>
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

// =============================================================================
// II. 페이지별 콘텐츠 설정
// =============================================================================

const PAGE_HERO_CONFIGS = {
    'academy_introduction.html': { title: '인사말', description: '여러분을 환영합니다.', breadcrumb: '학원소개 > 인사말', badge: '학원소개' },
    'academy_history.html': { title: '연혁', description: '신동탄간호학원의 발자취', breadcrumb: '학원소개 > 연혁', badge: '학원소개' },
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
    
    'recruitment_recruit-info.html': { title: '모집안내', description: '신동탄간호학원의 최신 모집 정보를 확인하세요.', breadcrumb: '모집안내 > 모집안내', badge: '모집안내' },
    'recruitment_funding-info.html': { title: '국비지원안내', description: '국민내일배움카드 등 다양한 국비지원 프로그램을 안내합니다.', breadcrumb: '모집안내 > 국비지원안내', badge: '모집안내' },
    
    'job_info.html': { title: '진학', description: '진학 정보를 안내합니다.', breadcrumb: '취업/진학 > 진학', badge: '취업/진학' },
    'job_employment.html': { title: '취업', description: '체계적인 취업 지원 프로그램을 통해 성공적인 취업을 돕습니다.', breadcrumb: '취업/진학 > 취업', badge: '취업/진학' },

    'community_notice.html': { title: '공지사항', description: '학원의 주요 소식과 공지사항을 확인하세요.', breadcrumb: '커뮤니티 > 공지사항', badge: '커뮤니티' },
    'community_qa.html': { title: 'Q&A', description: '자주 묻는 질문에 대한 답변입니다.', breadcrumb: '커뮤니티 > Q&A', badge: '커뮤니티' },
    'community_gallery.html': { title: '갤러리', description: '신동탄간호학원의 다채로운 활동 모습을 사진으로 만나보세요.', breadcrumb: '커뮤니티 > 갤러리', badge: '커뮤니티' },
    'community_jobs.html': { title: '취업/구인', description: '채용 정보를 확인하고 취업 기회를 잡으세요.', breadcrumb: '커뮤니티 > 취업/구인', badge: '커뮤니티' },
};

/**
 * 페이지 히어로 컴포넌트를 설정하고 동적으로 내용을 채웁니다.
 */
async function configurePageHero() {
  const pageHeroContainer = document.getElementById('page-hero-container');
  if (!pageHeroContainer) return;

  const currentPage = getCurrentPage();
  const config = PAGE_HERO_CONFIGS[currentPage];
  if (!config) return;

  await loadComponent('#page-hero-container', 'page-hero.html', () => {
    const titleEl = document.getElementById('page-title');
    const descriptionEl = document.getElementById('page-description');
    const breadcrumbEl = document.getElementById('breadcrumb-path');
    const badgeEl = document.querySelector('.badge-text');

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
  if (!header) return;

  // 모바일 메뉴 토글 버튼 생성
  const mobileMenuToggle = document.createElement('div');
  mobileMenuToggle.className = 'mobile-menu-toggle';
  mobileMenuToggle.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;
  
  // 헤더에 토글 버튼 추가
  const headerContent = header.querySelector('.header-content');
  if (headerContent) {
    headerContent.appendChild(mobileMenuToggle);
  }

  const mainMenu = header.querySelector('.main-menu');
  
  if (mobileMenuToggle && mainMenu) {
    // 전체 메뉴 토글
    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      header.classList.toggle('mobile-active');
      mainMenu.classList.toggle('mobile-open');
    });

    // 메인 메뉴 아이템 클릭 시 서브메뉴 토글
    const menuItems = mainMenu.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      const menuLink = item.querySelector('.menu-link');
      const submenuContainer = item.querySelector('.submenu-container');
      
      if (menuLink && submenuContainer) {
        menuLink.addEventListener('click', (e) => {
          e.preventDefault();
          
          // 다른 메뉴 아이템들의 서브메뉴 닫기
          menuItems.forEach(otherItem => {
            if (otherItem !== item) {
              otherItem.classList.remove('submenu-open');
            }
          });
          
          // 현재 메뉴 아이템의 서브메뉴 토글
          item.classList.toggle('submenu-open');
        });
      }
    });

    // 메뉴 외부 클릭 시 메뉴 닫기
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target)) {
        header.classList.remove('mobile-active');
        mainMenu.classList.remove('mobile-open');
        menuItems.forEach(item => {
          item.classList.remove('submenu-open');
        });
      }
    });
  }
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
    default:
      // 기본적으로 실행될 스크립트 없음
      break;
  }

  console.log("신동탄간호학원 스크립트 초기화 완료.");
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
    const localInstructors = JSON.parse(localStorage.getItem('shindongtan_instructors')) || [];
    const response = await fetch('db.json');
    const db = await response.json();
    const dbInstructors = db.instructors || [];

    const deletedIds = JSON.parse(localStorage.getItem('shindongtan_deleted_items')) || {};
    const deletedInstructorIds = new Set(deletedIds.instructors || []);

    const filteredDbInstructors = dbInstructors.filter(i => !deletedInstructorIds.has(i.id));

    const localIds = new Set(localInstructors.map(i => String(i.id)));
    const uniqueDbInstructors = filteredDbInstructors.filter(i => !localIds.has(String(i.id)));

    const instructors = [...localInstructors, ...uniqueDbInstructors].sort((a, b) => a.id - b.id);

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

      // '목록으로 돌아가기' 버튼 이벤트 리스너
      detailView.querySelector('.back-to-list').addEventListener('click', () => {
        detailView.style.display = 'none';
        listView.style.display = 'block';
        detailView.innerHTML = '';
      });
    };

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
 * 갤러리 페이지 초기화
 */
async function initGalleryPage() {
  console.log('initGalleryPage 함수 시작');
  const listContainer = document.getElementById('gallery-list');
  if (!listContainer) {
    console.error('gallery-list 요소를 찾을 수 없습니다.');
    return;
  }
  console.log('gallery-list 요소 찾음:', listContainer);

  try {
    const dbItems = (await (await fetch('db.json')).json()).gallery || [];
    const localItems = getLocalGallery();

    const deletedIds = JSON.parse(localStorage.getItem('shindongtan_deleted_items')) || {};
    const deletedGalleryIds = new Set(deletedIds.gallery || []);
    
    const filteredDbItems = dbItems.filter(item => !deletedGalleryIds.has(item.id));

    const localItemsIds = new Set(localItems.map(item => item.id));
    const uniqueDbItems = filteredDbItems.filter(item => !localItemsIds.has(item.id));
    
    const allItems = [...localItems, ...uniqueDbItems].sort((a, b) => b.id - a.id);
    const galleryViews = getGalleryViews();

    console.log('갤러리 아이템 수:', allItems.length);

    // Add view counts from localStorage
    allItems.forEach(item => {
        const storedViews = galleryViews[item.id];
        if (storedViews) {
            item.views = storedViews;
        }
    });

    let currentPage = 1;
    const itemsPerPage = 10;

    const searchInput = document.getElementById('gallery-search-input');
    const searchBtn = document.getElementById('gallery-search-btn');
    const paginationContainer = document.getElementById('pagination');
    const totalPostsCounter = document.getElementById('total-posts-counter');
    const searchTypeSelect = document.getElementById('gallery-search-type');

    function renderList(items, page) {
      console.log('renderList 호출됨, 아이템 수:', items.length, '페이지:', page);
      const header = listContainer.querySelector('.board-header');
      listContainer.innerHTML = '';
      listContainer.appendChild(header);

      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const paginatedItems = items.slice(start, end);

      console.log('페이지네이션된 아이템:', paginatedItems);

      paginatedItems.forEach((item, index) => {
        const itemNumber = items.length - start - index;
        const row = createRow(item, itemNumber);
        listContainer.appendChild(row);
      });
      
      totalPostsCounter.textContent = `총 ${items.length}개`;
    }

    function createRow(item, itemNumber) {
      const row = document.createElement('div');
      row.className = 'board-row';
      row.innerHTML = `
        <div class="number">${itemNumber}</div>
        <div class="thumbnail">
          <img src="${item.image}" alt="${item.title}" class="thumbnail">
        </div>
        <div class="title-section">
          <a href="community_gallery_detail.html?id=${item.id}" class="title">${item.title}</a>
          <div class="description">${item.content || ''}</div>
        </div>
        <div class="author">${item.author}</div>
        <div class="date">${item.date}</div>
        <div class="views">${item.views || 0}</div>
      `;
      return row;
    }

    function setupPagination(items, page) {
      paginationContainer.innerHTML = '';
      const pageCount = Math.ceil(items.length / itemsPerPage);
      if (pageCount <= 1) return;

      for (let i = 1; i <= pageCount; i++) {
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
    }
    
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const searchType = searchTypeSelect.value;
        
        const filteredItems = allItems.filter(item => {
            if (!searchTerm) return true;
            const title = item.title.toLowerCase();
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
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearch(); });

    // Initial Render
    console.log('초기 렌더링 시작');
    renderList(allItems, currentPage);
    setupPagination(allItems, currentPage);
    console.log('initGalleryPage 함수 완료');

  } catch (error) {
    console.error('갤러리 페이지 초기화 오류:', error);
    listContainer.innerHTML += '<p style="text-align: center; padding: 2rem;">게시물을 불러오는 데 실패했습니다.</p>';
  }
}

/**
 * 갤러리 상세 페이지 초기화
 */
async function initGalleryDetailPage() {
  console.log('initGalleryDetailPage 함수 시작');
  
  const urlParams = new URLSearchParams(window.location.search);
  const postId = parseInt(urlParams.get('id'));
  
  if (!postId) {
    console.error('게시물 ID가 없습니다.');
    return;
  }

  try {
    const dbItems = (await (await fetch('db.json')).json()).gallery || [];
    const localItems = getLocalGallery();

    const deletedIds = JSON.parse(localStorage.getItem('shindongtan_deleted_items')) || {};
    const deletedGalleryIds = new Set(deletedIds.gallery || []);

    const filteredDbItems = dbItems.filter(item => !deletedGalleryIds.has(item.id));

    const localItemsIds = new Set(localItems.map(item => item.id));
    const uniqueDbItems = filteredDbItems.filter(item => !localItemsIds.has(item.id));
    
    const allItems = [...localItems, ...uniqueDbItems].sort((a, b) => b.id - a.id);
    
    const currentItem = allItems.find(item => item.id === postId);
    if (!currentItem) {
      console.error('게시물을 찾을 수 없습니다:', postId);
      document.getElementById('gallery-detail-container').innerHTML = '<p>게시물을 찾을 수 없습니다.</p>';
      return;
    }

    // 조회수 증가
    incrementGalleryView(postId);

    // 페이지 내용 업데이트
    document.getElementById('gallery-detail-title').textContent = currentItem.title;
    document.getElementById('gallery-detail-author').textContent = currentItem.author;
    document.getElementById('gallery-detail-date').textContent = currentItem.date;
    document.getElementById('gallery-detail-views').textContent = currentItem.views || 0;
    document.getElementById('gallery-detail-image').src = currentItem.image;
    document.getElementById('gallery-detail-image').alt = currentItem.title;
    document.getElementById('gallery-detail-text').textContent = currentItem.content || '';

    // 이전/다음 글 설정
    const currentIndex = allItems.findIndex(item => item.id === postId);
    const prevItem = allItems[currentIndex + 1];
    const nextItem = allItems[currentIndex - 1];

    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');

    if (prevItem) {
      prevButton.href = `community_gallery_detail.html?id=${prevItem.id}`;
      prevButton.classList.remove('disabled');
    } else {
      prevButton.href = '#';
      prevButton.classList.add('disabled');
    }

    if (nextItem) {
      nextButton.href = `community_gallery_detail.html?id=${nextItem.id}`;
      nextButton.classList.remove('disabled');
    } else {
      nextButton.href = '#';
      nextButton.classList.add('disabled');
    }

    console.log('initGalleryDetailPage 함수 완료');

  } catch (error) {
    console.error('갤러리 상세 페이지 초기화 오류:', error);
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
 * 취업/구인정보 페이지 초기화
 */
async function initJobsPage() {
  const listContainer = document.getElementById('jobs-list');
  if (!listContainer) return;

  try {
    const dbItems = (await (await fetch('db.json')).json()).jobs || [];
    const localItems = getLocalJobs();
    
    const deletedIds = JSON.parse(localStorage.getItem('shindongtan_deleted_items')) || {};
    const deletedJobIds = new Set(deletedIds.jobs || []);

    const filteredDbItems = dbItems.filter(item => !deletedJobIds.has(item.id));

    const localItemsIds = new Set(localItems.map(item => item.id));
    const uniqueDbItems = filteredDbItems.filter(item => !localItemsIds.has(item.id));

    const allItems = [...localItems, ...uniqueDbItems].sort((a, b) => b.id - a.id);
    const jobViews = getJobViews();

    // Add view counts from localStorage
    allItems.forEach(item => {
        const storedViews = jobViews[item.id];
        if (storedViews) {
            item.views = storedViews;
        }
    });

    const totalItemCount = allItems.length;
    
    let currentPage = 1;
    const itemsPerPage = 10;

    const searchInput = document.getElementById('jobs-search-input');
    const searchBtn = document.getElementById('jobs-search-btn');
    const paginationContainer = document.getElementById('pagination');
    const totalPostsCounter = document.getElementById('total-posts-counter');
    const searchTypeSelect = document.getElementById('jobs-search-type');

    function renderList(items, page) {
      const header = listContainer.querySelector('.board-header');
      listContainer.innerHTML = '';
      listContainer.appendChild(header);

      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const paginatedItems = items.slice(start, end);

      paginatedItems.forEach((item, index) => {
        const itemNumber = items.length - start - index; // Recalculate based on filtered items
        const row = createRow(item, itemNumber);
        listContainer.appendChild(row);
      });
      
      totalPostsCounter.textContent = `총 ${items.length}개`;
    }

    function createRow(item, itemNumber) {
      const row = document.createElement('div');
      row.className = 'board-row';
      row.innerHTML = `
        <div class="number">${itemNumber}</div>
        <div class="title"><a href="community_jobs_detail.html?id=${item.id}">${item.title}</a></div>
        <div class="author">${item.author}</div>
        <div class="date">${item.date}</div>
        <div class="views">${item.views || 0}</div>
      `;
      return row;
    }

    function setupPagination(items, page) {
      paginationContainer.innerHTML = '';
      const pageCount = Math.ceil(items.length / itemsPerPage);
      if (pageCount <= 1) return;

      for (let i = 1; i <= pageCount; i++) {
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
    }
    
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const searchType = searchTypeSelect.value;
        
        const filteredItems = allItems.filter(item => {
            if (!searchTerm) return true; // Show all if search term is empty
            const title = item.title.toLowerCase();
            const content = item.content.toLowerCase();
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
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearch(); });

    // Initial Render
    renderList(allItems, currentPage);
    setupPagination(allItems, currentPage);

  } catch (error) {
    console.error('취업/구인정보 페이지 초기화 오류:', error);
    listContainer.innerHTML += '<p style="text-align: center; padding: 2rem;">게시물을 불러오는 데 실패했습니다.</p>';
  }
}

/**
 * 취업/구인정보 상세 페이지 초기화
 */
async function initJobsDetailPage() {
  const viewContainer = document.getElementById('post-detail-view');
  if (!viewContainer) return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = parseInt(urlParams.get('id'));

    if (isNaN(postId)) throw new Error('Invalid post ID.');

    // Increment view count before fetching data to ensure it's up-to-date
    incrementJobView(postId);
    
    const dbPosts = (await (await fetch('db.json')).json()).jobs || [];
    const localPosts = getLocalJobs();

    const deletedIds = JSON.parse(localStorage.getItem('shindongtan_deleted_items')) || {};
    const deletedJobIds = new Set(deletedIds.jobs || []);

    const filteredDbPosts = dbPosts.filter(item => !deletedJobIds.has(item.id));

    const localItemsIds = new Set(localPosts.map(item => item.id));
    const uniqueDbItems = filteredDbPosts.filter(item => !localItemsIds.has(item.id));
    
    const allPosts = [...localPosts, ...uniqueDbItems];
    const jobViews = getJobViews();

    const post = allPosts.find(item => item.id === postId);

    if (!post) throw new Error('Post not found.');
    
    // Apply the latest view count
    post.views = jobViews[postId] || post.views || 0;

    // Sort all non-notice posts for correct next/prev navigation
    const sortedAllPosts = allPosts.sort((a, b) => b.id - a.id);
    const currentIndex = sortedAllPosts.findIndex(item => item.id === postId);

    const prevPost = currentIndex > 0 ? sortedAllPosts[currentIndex - 1] : null;
    const nextPost = currentIndex < sortedAllPosts.length - 1 ? sortedAllPosts[currentIndex + 1] : null;

    viewContainer.innerHTML = `
      <div class="post-view">
        <div class="post-header">
          <h2>${post.title}</h2>
          <div class="post-meta">
            <span><i class="fas fa-user"></i> ${post.author}</span>
            <span><i class="fas fa-calendar-alt"></i> ${post.date}</span>
            <span><i class="fas fa-eye"></i> ${post.views}</span>
          </div>
        </div>
        <div class="post-body">
          ${post.content.replace(/\n/g, '<br>')}
        </div>
      </div>
      <ul class="post-nav">
        <li>
            <div class="nav-label">이전글</div>
            ${nextPost ? `<a href="community_jobs_detail.html?id=${nextPost.id}" class="nav-title">${nextPost.title}</a>` : '<span>이전글이 없습니다.</span>'}
        </li>
        <li>
            <div class="nav-label">다음글</div>
            ${prevPost ? `<a href="community_jobs_detail.html?id=${prevPost.id}" class="nav-title">${prevPost.title}</a>` : '<span>다음글이 없습니다.</span>'}
        </li>
      </ul>
      <div class="post-footer">
        <a href="community_jobs.html" class="list-button">목록</a>
      </div>
    `;

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
 * 시설 둘러보기 페이지 초기화 (이미지 슬라이더)
 */
async function initFacilitiesPage() {
    const sliderWrapper = document.getElementById('facilities-slider');
    if (!sliderWrapper) return;

    const mainImage = document.getElementById('slider-main-image');
    const thumbnailsContainer = document.getElementById('slider-thumbnails');
    const prevBtn = document.getElementById('slider-prev-btn');
    const nextBtn = document.getElementById('slider-next-btn');

    try {
        const localFacilities = JSON.parse(localStorage.getItem('shindongtan_facilities')) || [];
        const response = await fetch('db.json');
        const db = await response.json();
        const dbFacilities = db.facilities || [];

        const deletedIds = JSON.parse(localStorage.getItem('shindongtan_deleted_items')) || {};
        const deletedFacilityIds = new Set(deletedIds.facilities || []);

        const filteredDbFacilities = dbFacilities.filter(f => !deletedFacilityIds.has(f.id));

        const localIds = new Set(localFacilities.map(f => String(f.id)));
        const uniqueDbFacilities = filteredDbFacilities.filter(f => !localIds.has(String(f.id)));

        const facilities = [...localFacilities, ...uniqueDbFacilities].sort((a, b) => a.id - b.id);

        if (facilities.length === 0) {
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
            mainImage.src = facility.src;
            mainImage.alt = facility.alt;

            // Update active thumbnail
            document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
                thumb.classList.toggle('active', i === currentIndex);
            });
        }

        // Populate thumbnails
        thumbnailsContainer.innerHTML = '';
        facilities.forEach((facility, index) => {
            const thumb = document.createElement('img');
            thumb.src = facility.src;
            thumb.alt = facility.alt;
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
 * 공지사항 페이지 초기화
 */
async function initNoticePage() {
  const listContainer = document.getElementById('notice-list');
  if (!listContainer) return;

  try {
    const dbItems = (await (await fetch('db.json')).json()).notices || [];
    const localItems = getLocalNotices();

    const deletedIds = JSON.parse(localStorage.getItem('shindongtan_deleted_items')) || {};
    const deletedNoticeIds = new Set(deletedIds.notices || []);

    const filteredDbItems = dbItems.filter(item => !deletedNoticeIds.has(item.id));

    const localItemsIds = new Set(localItems.map(item => item.id));
    const uniqueDbItems = filteredDbItems.filter(item => !localItemsIds.has(item.id));

    const allItems = [...localItems, ...uniqueDbItems].sort((a, b) => {
        if (a.isNotice !== b.isNotice) return a.isNotice ? -1 : 1;
        return b.id - a.id;
    });
    const noticeViews = getNoticeViews();

    // Add view counts from localStorage
    allItems.forEach(item => {
        const storedViews = noticeViews[item.id];
        if (storedViews) {
            item.views = storedViews;
        }
    });

    const totalItemCount = allItems.length;
    
    let currentPage = 1;
    const itemsPerPage = 10;

    const searchInput = document.getElementById('notice-search-input');
    const searchBtn = document.getElementById('notice-search-btn');
    const paginationContainer = document.getElementById('pagination');
    const totalPostsCounter = document.getElementById('total-posts-counter');
    const searchTypeSelect = document.getElementById('notice-search-type');

    function renderList(items, page) {
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
      
      totalPostsCounter.textContent = `총 ${items.length}개`;
    }

    function createRow(item, itemNumber) {
      const row = document.createElement('div');
      row.className = 'board-row';
      if (item.isNotice) {
        row.classList.add('notice');
      }
      row.innerHTML = `
        <div class="number">${item.isNotice ? '공지' : itemNumber}</div>
        <div class="title"><a href="community_notice_detail.html?id=${item.id}">${item.title}</a></div>
        <div class="author">${item.author}</div>
        <div class="date">${item.date}</div>
        <div class="views">${item.views || 0}</div>
      `;
      return row;
    }

    function setupPagination(items, page) {
      paginationContainer.innerHTML = '';
      const pageCount = Math.ceil(items.length / itemsPerPage);
      if (pageCount <= 1) return;

      for (let i = 1; i <= pageCount; i++) {
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
    }
    
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const searchType = searchTypeSelect.value;
        
        const filteredItems = allItems.filter(item => {
            if (!searchTerm) return true;
            const title = item.title.toLowerCase();
            const content = item.content.toLowerCase();
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

// 공지사항 관련 유틸리티 함수들
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
 * 홈페이지 최신 소식 섹션을 초기화합니다.
 */
async function initLatestNews() {
  try {
    console.log('최신 소식 섹션 초기화 시작...');
    
    // 공지사항과 Q&A 데이터를 병렬로 로드
    const [notices, qaData] = await Promise.all([
      loadLatestNotices(),
      loadLatestQA()
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
 * 최신 소식 섹션의 이벤트를 설정합니다. (이제 사용되지 않음)
 */
// function setupLatestNewsEvents() { ... }

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
    const date = notice.date ? formatDate(notice.date) : '날짜 없음';
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
    const category = qa.category || '기타';
    
    return `
      <a href="community_qa.html" class="preview-item">
        <div class="preview-item-icon">
          <b>Q</b>
        </div>
        <div class="preview-item-text">
          <span class="title">${question}</span>
          <div class="meta">
            <i class="fas fa-tag"></i>
            <span>${category}</span>
          </div>
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
    
    // localStorage에서 공지사항 데이터 가져오기
    const localNotices = getLocalNotices();
    console.log('로컬 공지사항:', localNotices.length, '개');
    
    // 삭제된 ID 목록 가져오기
    const deletedIds = JSON.parse(localStorage.getItem('shindongtan_deleted_items')) || {};
    const deletedNoticeIds = new Set(deletedIds.notices || []);
    console.log('삭제된 공지사항 ID:', Array.from(deletedNoticeIds));
    
    // db.json에서 기본 데이터 가져오기
    const response = await fetch('db.json');
    if (!response.ok) {
      throw new Error(`db.json 로드 실패: ${response.status} ${response.statusText}`);
    }
    const db = await response.json();
    const defaultNotices = db.notices || [];
    console.log('기본 공지사항:', defaultNotices.length, '개');
    
    // 삭제된 항목 필터링
    const activeLocalNotices = localNotices.filter(notice => {
      // isDeleted 필드가 true인 경우 제외
      if (notice.isDeleted === true) {
        return false;
      }
      // 삭제된 ID 목록에 있는 경우 제외
      if (deletedNoticeIds.has(notice.id)) {
        return false;
      }
      return true;
    });
    
    const activeDefaultNotices = defaultNotices.filter(notice => {
      // isDeleted 필드가 true인 경우 제외
      if (notice.isDeleted === true) {
        return false;
      }
      // 삭제된 ID 목록에 있는 경우 제외
      if (deletedNoticeIds.has(notice.id)) {
        return false;
      }
      return true;
    });
    
    console.log('활성 로컬 공지사항:', activeLocalNotices.length, '개');
    console.log('활성 기본 공지사항:', activeDefaultNotices.length, '개');
    
    // 두 데이터 소스 병합 (로컬 데이터가 우선)
    const localIds = new Set(activeLocalNotices.map(n => n.id));
    const uniqueDefaultNotices = activeDefaultNotices.filter(n => !localIds.has(n.id));
    const allActiveNotices = [...activeLocalNotices, ...uniqueDefaultNotices];
    
    // 날짜순으로 정렬 (최신순)
    allActiveNotices.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA;
    });
    
    // 최신 5개만 반환
    const latestNotices = allActiveNotices.slice(0, 5);
    console.log('최신 공지사항 5개 로드 완료');
    
    return latestNotices;
    
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
      const latestQA = db.qa.slice(0, 5); // 최신 5개만
      console.log('기본 Q&A 데이터 로드 완료:', latestQA.length, '개');
      return latestQA;
    } else {
      // 기본 Q&A 데이터
      const defaultQA = [
        {
          question: "간호조무사 자격증, 누구나 취득할 수 있나요?",
          answer: "네, 고등학교 졸업 이상의 학력을 가진 분이라면 성별이나 나이에 관계없이 누구나 도전할 수 있습니다.",
          category: "자격증"
        },
        {
          question: "교육 과정은 어떻게 구성되어 있나요?",
          answer: "간호조무사 국가고시 응시자격을 위한 표준 교육과정은 총 1,520시간으로 구성됩니다.",
          category: "교육과정"
        },
        {
          question: "국비지원(국민내일배움카드) 혜택을 받을 수 있나요?",
          answer: "네, 저희 신동탄간호학원은 고용노동부 인증 우수훈련기관으로, 국민내일배움카드를 통해 수강료 지원을 받으실 수 있습니다.",
          category: "국비지원"
        },
        {
          question: "병원 실습은 어떻게 진행되나요?",
          answer: "본원은 동탄, 수원, 용인 지역의 우수한 병원들과 산학협력을 맺고 있어, 학생들이 쾌적하고 체계적인 환경에서 실습에만 집중할 수 있도록 지원합니다.",
          category: "실습"
        },
        {
          question: "수료 후 취업 지원도 해주시나요?",
          answer: "물론입니다. 신동탄간호학원은 수료생들의 성공적인 취업을 위해 1:1 맞춤형 취업 지원 시스템을 운영하고 있습니다.",
          category: "취업"
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
