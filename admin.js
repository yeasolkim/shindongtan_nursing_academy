const ADMIN_CREDENTIALS = { username: "admin", password: "1234" };

// ===================== 공통 유틸리티 =====================
// 일반 텍스트를 HTML에 넣을 때 사용 (본문 리치텍스트에는 사용하지 않음)
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, function(c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

const SAVE_FAIL_MSG = '저장에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';
const MAX_EDITOR_IMAGE_BYTES = 10 * 1024 * 1024;   // 본문 이미지 10MB
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;     // 첨부파일 20MB
const MAX_POPUP_IMAGE_BYTES = 5 * 1024 * 1024;     // 팝업 이미지 5MB (자동 압축 후 기준)
const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;   // 선택할 수 있는 원본 사진 크기 (압축 전, 화면 안내 문구와 동일)
const MAX_GALLERY_IMAGE_BYTES = 10 * 1024 * 1024;  // 갤러리 사진 (자동 압축 후 기준)
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;   // 강사/시설 사진 (자동 압축 후 기준)
const IMAGE_MAX_SIDE = 1920;                        // 긴 변 최대 픽셀
const IMAGE_COMPRESS_MIN_BYTES = 1024 * 1024;       // 이보다 크면 압축
const IMAGE_JPEG_QUALITY = 0.85;
const GALLERY_THUMB_SIDE = 600;                     // 갤러리 썸네일 긴 변
const GALLERY_THUMB_QUALITY = 0.78;
const STORAGE_CACHE_CONTROL = '31536000';           // 1년 (파일명이 매번 새로 만들어지므로 안전)

// 오류 객체에서 짧은 사유 문자열 생성
function errorReason(err) {
    if (!err) return '';
    var msg = (typeof err === 'string') ? err : (err.message || err.error_description || err.error || '');
    msg = String(msg || '').trim();
    if (!msg) return '';
    if (msg.length > 120) msg = msg.slice(0, 120) + '…';
    return ' (사유: ' + msg + ')';
}
function failMsg(base, err) {
    return (base || SAVE_FAIL_MSG) + errorReason(err);
}
function notifyError(msg) {
    if (typeof window.showToast === 'function') window.showToast(msg, 'error');
    else alert(msg);
}

// 파일 검증 (통과하면 true)
function validateImageFile(file, maxBytes) {
    maxBytes = maxBytes || MAX_EDITOR_IMAGE_BYTES;
    if (!file) return false;
    if (!file.type || !file.type.startsWith('image/')) {
        notifyError('"' + file.name + '"은(는) 이미지 파일이 아닙니다. JPG, PNG, GIF, WebP 등 이미지 파일만 올릴 수 있습니다.');
        return false;
    }
    if (file.size > maxBytes) {
        notifyError('이미지 파일이 너무 큽니다. ' + Math.round(maxBytes / 1024 / 1024) + 'MB 이하로 선택해 주세요.');
        return false;
    }
    return true;
}
function validateAttachmentFile(file) {
    if (!file) return false;
    if (file.size > MAX_ATTACHMENT_BYTES) {
        notifyError('첨부파일이 너무 큽니다. ' + Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024) + 'MB 이하로 선택해 주세요.');
        return false;
    }
    return true;
}

// Supabase Storage 공개 URL → { bucket, path } (우리 프로젝트 URL이 아니면 null)
function parseStorageUrl(url) {
    if (!url || typeof url !== 'string') return null;
    try {
        var u = new URL(url, window.location.href);
        if (typeof SUPABASE_URL !== 'undefined') {
            var projectOrigin = new URL(SUPABASE_URL).origin;
            if (u.origin !== projectOrigin) return null;
        }
        var m = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
        if (!m) return null;
        return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
    } catch (e) {
        return null;
    }
}

// 게시물 본문에 들어가는 파일이 저장되는 버킷들 (이 버킷의 파일만 본문 기준으로 정리)
const POST_CONTENT_BUCKETS = ['notice-images', 'notice-attachments', 'job-images', 'job-attachments', 'gallery-images'];

// 본문 HTML에서 Storage 파일 URL(이미지/첨부파일) 추출
function extractStorageUrlsFromHtml(html) {
    if (!html) return [];
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var urls = [];
    doc.querySelectorAll('img[src]').forEach(function(img) { urls.push(img.getAttribute('src')); });
    doc.querySelectorAll('a[href]').forEach(function(a) { urls.push(a.getAttribute('href')); });
    return urls.filter(function(u) {
        var p = parseStorageUrl(u);
        return p && POST_CONTENT_BUCKETS.indexOf(p.bucket) !== -1;
    });
}

// URL 목록이 가리키는 Storage 파일 삭제 (URL에서 버킷/경로를 직접 파싱, 실패해도 예외를 던지지 않음)
async function removeStorageUrls(urls) {
    var groups = {};
    (urls || []).forEach(function(url) {
        var p = parseStorageUrl(url);
        if (!p) return;
        if (!groups[p.bucket]) groups[p.bucket] = [];
        if (groups[p.bucket].indexOf(p.path) === -1) groups[p.bucket].push(p.path);
        // 갤러리 사진은 썸네일(thumbs/<이름>.jpg)도 함께 삭제
        if (p.bucket === 'gallery-images') {
            var thumb = galleryThumbPath(p.path);
            if (thumb && groups[p.bucket].indexOf(thumb) === -1) groups[p.bucket].push(thumb);
        }
    });
    for (var bucket of Object.keys(groups)) {
        try {
            var res = await window.supabaseClient.storage.from(bucket).remove(groups[bucket]);
            if (res && res.error) console.warn('Storage 파일 삭제 실패:', bucket, res.error);
        } catch (e) {
            console.warn('Storage 파일 삭제 중 오류:', bucket, e);
        }
    }
}

// 기존 URL 목록 중 새 목록에 없는 것만 반환
function diffRemovedUrls(oldUrls, newUrls) {
    var keep = new Set(newUrls || []);
    return (oldUrls || []).filter(function(u) { return u && !keep.has(u); });
}

// ===================== 이미지 자동 압축 / 갤러리 썸네일 =====================
// 사진을 캔버스에 그릴 수 있는 형태로 읽기 (휴대폰 사진의 회전 정보(EXIF) 반영)
async function decodeImageForCanvas(file) {
    if (typeof createImageBitmap === 'function') {
        try {
            const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
            return { source: bmp, width: bmp.width, height: bmp.height, close: function() { try { bmp.close(); } catch (e) {} } };
        } catch (e) { /* 아래 <img> 방식으로 재시도 */ }
    }
    return new Promise(function(resolve, reject) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.style.imageOrientation = 'from-image';
        img.onload = function() {
            resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight, close: function() { URL.revokeObjectURL(url); } });
        };
        img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('이미지를 읽을 수 없습니다.')); };
        img.src = url;
    });
}
// 긴 변이 maxSide 이하가 되도록 캔버스에 그림 (background 지정 시 투명 영역을 그 색으로 채움)
function drawImageScaled(decoded, maxSide, background) {
    const scale = Math.min(1, maxSide / Math.max(decoded.width, decoded.height));
    const w = Math.max(1, Math.round(decoded.width * scale));
    const h = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, w, h); }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(decoded.source, 0, 0, w, h);
    return canvas;
}
function canvasToBlobAsync(canvas, type, quality) {
    return new Promise(function(resolve) {
        try { canvas.toBlob(function(b) { resolve(b); }, type, quality); } catch (e) { resolve(null); }
    });
}
// 캔버스에 투명한 픽셀이 있는지 (축소본으로 빠르게 검사)
function canvasHasTransparency(canvas) {
    try {
        const side = 256;
        const scale = Math.min(1, side / Math.max(canvas.width, canvas.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(canvas.width * scale));
        c.height = Math.max(1, Math.round(canvas.height * scale));
        const ctx = c.getContext('2d');
        ctx.drawImage(canvas, 0, 0, c.width, c.height);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        for (let i = 3; i < data.length; i += 4) { if (data[i] < 255) return true; }
        return false;
    } catch (e) {
        return true; // 검사 실패 시 안전하게 투명으로 간주
    }
}
function replaceFileExtension(name, ext) {
    const base = String(name || 'image').replace(/\.[^./\\]*$/, '') || 'image';
    return base + '.' + ext;
}
// 큰 사진을 자동으로 줄임: JPEG/PNG/WebP 이고 1MB 초과 또는 긴 변 1920px 초과일 때
// 긴 변 1920px, JPEG 품질 0.85로 변환 (투명 PNG는 크기 제한 이하이면 PNG 유지, GIF 등은 그대로)
async function compressImageFile(file, options) {
    options = options || {};
    const maxSide = options.maxSide || IMAGE_MAX_SIDE;
    const maxBytes = options.maxBytes || MAX_EDITOR_IMAGE_BYTES;
    if (!file || !/^image\/(jpeg|jpg|png|webp)$/i.test(file.type || '')) return file;
    let decoded;
    try {
        decoded = await decodeImageForCanvas(file);
    } catch (e) {
        console.warn('이미지 압축 건너뜀 (읽기 실패):', file.name, e);
        return file;
    }
    try {
        const needResize = Math.max(decoded.width, decoded.height) > maxSide;
        if (!needResize && file.size <= IMAGE_COMPRESS_MIN_BYTES) return file;
        const isPng = /png$/i.test(file.type);
        if (isPng) {
            const plain = drawImageScaled(decoded, maxSide, null);
            if (canvasHasTransparency(plain)) {
                if (!needResize && file.size <= maxBytes) return file;
                const pngBlob = await canvasToBlobAsync(plain, 'image/png');
                if (pngBlob && pngBlob.size <= maxBytes) {
                    return new File([pngBlob], replaceFileExtension(file.name, 'png'), { type: 'image/png', lastModified: Date.now() });
                }
                // 투명 PNG지만 너무 크면 흰 배경 JPEG로 변환
            }
        }
        const canvas = drawImageScaled(decoded, maxSide, '#ffffff');
        const blob = await canvasToBlobAsync(canvas, 'image/jpeg', IMAGE_JPEG_QUALITY);
        if (!blob) return file;
        // 크기를 줄일 필요가 없었는데 오히려 커졌다면 원본 사용
        if (!needResize && blob.size >= file.size) return file;
        return new File([blob], replaceFileExtension(file.name, 'jpg'), { type: 'image/jpeg', lastModified: Date.now() });
    } finally {
        if (decoded && decoded.close) decoded.close();
    }
}
// 업로드 직전 공통 처리: 이미지 여부/원본 크기 확인 → 자동 압축 → 압축 후 크기 확인 (실패 시 null)
async function prepareImageForUpload(file, maxBytes) {
    if (!file) return null;
    if (!file.type || !file.type.startsWith('image/')) { validateImageFile(file, maxBytes); return null; }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
        notifyError('"' + file.name + '" 사진이 너무 큽니다. ' + Math.round(MAX_SOURCE_IMAGE_BYTES / 1024 / 1024) + 'MB 이하로 선택해 주세요.');
        return null;
    }
    let out = file;
    try {
        out = await compressImageFile(file, { maxBytes: maxBytes });
    } catch (e) {
        console.warn('이미지 압축 실패, 원본 사용:', e);
        out = file;
    }
    if (!validateImageFile(out, maxBytes)) return null;
    return out;
}
// 갤러리 썸네일 (긴 변 600px, JPEG 0.78)
async function makeGalleryThumbnail(file) {
    if (!file || !/^image\//.test(file.type || '') || /svg/i.test(file.type)) return null;
    const decoded = await decodeImageForCanvas(file);
    try {
        const canvas = drawImageScaled(decoded, GALLERY_THUMB_SIDE, '#ffffff');
        return await canvasToBlobAsync(canvas, 'image/jpeg', GALLERY_THUMB_QUALITY);
    } finally {
        if (decoded.close) decoded.close();
    }
}
// gallery-images 버킷 최상위 파일 경로 → 썸네일 경로 (thumbs/<이름>.jpg), 해당 없으면 null
function galleryThumbPath(path) {
    if (!path || typeof path !== 'string' || path.indexOf('/') !== -1) return null;
    const m = path.match(/^(.+)\.[^.]+$/);
    return m ? 'thumbs/' + m[1] + '.jpg' : null;
}
// 갤러리 목록용 썸네일 URL (홈페이지 script.js의 galleryThumbUrl과 동일한 규칙)
// - 저장소에 미리 만들어 둔 썸네일(window.GALLERY_STATIC_THUMBS)이 있으면 shindongtan/resource/gallery-thumbs/<이름>.jpg
// - 아니면 .../object/public/gallery-images/thumbs/<이름>.jpg
// - 패턴이 다르면(하위 폴더 등) 원래 URL 그대로
function galleryThumbUrl(url) {
    if (!url || typeof url !== 'string') return url;
    const trimmed = url.trim();
    const m = trimmed.match(/^(.*\/object\/public\/gallery-images)\/([^/?#]+)\.[A-Za-z0-9]+$/);
    if (!m) return trimmed;
    let name = m[2];
    try { name = decodeURIComponent(name); } catch (e) { /* 그대로 사용 */ }
    const staticThumbs = window.GALLERY_STATIC_THUMBS;
    if (staticThumbs && typeof staticThumbs.has === 'function' && staticThumbs.has(name)) {
        return 'shindongtan/resource/gallery-thumbs/' + encodeURIComponent(name) + '.jpg';
    }
    return m[1] + '/thumbs/' + encodeURIComponent(name) + '.jpg';
}
// gallery-images 버킷에 사진 업로드 + 썸네일(thumbs/<이름>.jpg) 업로드. 썸네일 실패는 저장을 막지 않음.
async function uploadGalleryImageWithThumb(fileName, file) {
    const storage = window.supabaseClient.storage.from('gallery-images');
    const { error } = await storage.upload(fileName, file, { upsert: true, cacheControl: STORAGE_CACHE_CONTROL });
    if (error) {
        const err = new Error(error.message || 'upload failed');
        err.isUpload = true;
        throw err;
    }
    const thumbPath = galleryThumbPath(fileName);
    if (thumbPath) {
        try {
            const thumbBlob = await makeGalleryThumbnail(file);
            if (thumbBlob) {
                const res = await storage.upload(thumbPath, thumbBlob, { upsert: true, cacheControl: STORAGE_CACHE_CONTROL, contentType: 'image/jpeg' });
                if (res && res.error) console.warn('갤러리 썸네일 업로드 실패 (원본은 저장됨):', thumbPath, res.error);
            }
        } catch (e) {
            console.warn('갤러리 썸네일 생성/업로드 실패 (원본은 저장됨):', thumbPath, e);
        }
    }
    const { data } = storage.getPublicUrl(fileName);
    return data && data.publicUrl ? data.publicUrl : null;
}

// ===================== 에디터 툴바 한글 안내 =====================
const QUILL_TOOLBAR_TITLES = [
    ['.ql-header .ql-picker-label', '글자 크기 (본문 / 제목)'],
    ['button.ql-bold', '굵게'],
    ['button.ql-italic', '기울임'],
    ['button.ql-underline', '밑줄'],
    ['button.ql-strike', '취소선'],
    ['.ql-color .ql-picker-label', '글자색'],
    ['.ql-background .ql-picker-label', '배경색 (형광펜)'],
    ['.ql-align .ql-picker-label', '정렬'],
    ['.ql-align .ql-picker-item:not([data-value])', '왼쪽 정렬'],
    ['.ql-align .ql-picker-item[data-value="center"]', '가운데 정렬'],
    ['.ql-align .ql-picker-item[data-value="right"]', '오른쪽 정렬'],
    ['.ql-align .ql-picker-item[data-value="justify"]', '양쪽 정렬'],
    ['.ql-header .ql-picker-item:not([data-value])', '본문'],
    ['.ql-header .ql-picker-item[data-value="1"]', '제목 1'],
    ['.ql-header .ql-picker-item[data-value="2"]', '제목 2'],
    ['.ql-header .ql-picker-item[data-value="3"]', '제목 3'],
    ['button.ql-blockquote', '인용'],
    ['button.ql-code-block', '코드'],
    ['button.ql-list[value="ordered"]', '번호 목록'],
    ['button.ql-list[value="bullet"]', '글머리 목록'],
    ['button.ql-link', '링크'],
    ['button.ql-image', '사진 넣기'],
    ['button.ql-attach', '파일 첨부'],
    ['button.ql-clean', '서식 지우기']
];
function applyQuillToolbarKorean(quillInstance) {
    try {
        const tb = quillInstance && quillInstance.getModule ? quillInstance.getModule('toolbar') : null;
        const container = tb && tb.container;
        if (!container) return;
        QUILL_TOOLBAR_TITLES.forEach(function(pair) {
            container.querySelectorAll(pair[0]).forEach(function(el) {
                el.setAttribute('title', pair[1]);
                if (el.tagName === 'BUTTON' || el.classList.contains('ql-picker-label')) el.setAttribute('aria-label', pair[1]);
            });
        });
        const editorRoot = quillInstance.root;
        if (editorRoot && !editorRoot.getAttribute('data-placeholder')) editorRoot.setAttribute('data-placeholder', '내용을 입력하세요');
    } catch (e) {
        console.warn('에디터 툴바 안내 적용 실패:', e);
    }
}
// =========================================================

// 저장된 본문 HTML을 Quill에 넣기 전 정리
// - Quill 형식(<p> 등 블록 태그)은 그대로 사용 (<br>을 \n으로 바꾸면 줄바꿈이 사라짐)
// - 블록 태그가 없는 예전 형식(텍스트 + <br>/줄바꿈)은 줄마다 <p>로 감싸 줄바꿈 보존
function prepareHtmlForEditor(html) {
    if (!html) return '';
    if (/<(p|h[1-6]|li|ol|ul|blockquote|pre|div)[\s>]/i.test(html)) return html;
    return html.split(/<br\s*\/?>|\r?\n/i).map(function(line) {
        return line.trim() ? '<p>' + line + '</p>' : '<p><br></p>';
    }).join('');
}
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // 전역 객체로만 사용
    window.boardConfig = window.boardConfig || {};
    window.boardConfig.jobs = window.boardConfig.jobs || {};
    window.boardConfig.jobs.addBtn = document.getElementById('add-job-btn');
    window.boardConfig.jobs.listEl = document.getElementById('job-list');
    const modal = document.getElementById('post-modal');
    const modalForm = document.getElementById('modal-form');
    const modalTitle = document.getElementById('modal-title');
    const modalImageGroup = document.getElementById('modal-image-group');
    const modalNoticeGroup = document.getElementById('modal-notice-group');
    
    // 닫기 버튼을 전역으로 선언
    const closeModalBtn = modal.querySelector('.close-button');

    // 로딩 오버레이들을 body 바로 아래로 옮겨, 어떤 탭/모달이 열려 있어도 항상 맨 위에 보이도록 함
    ['instructor-loading-overlay', 'facility-loading-overlay', 'jobs-loading-overlay', 'notice-loading-overlay',
     'faq-loading-overlay', 'popup-loading-overlay', 'gallery-loading-overlay'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el && el.parentNode !== document.body) {
            document.body.appendChild(el);
            el.style.zIndex = '20000';
        }
    });

    // 두 행의 order 값을 교환 (실패 시 오류를 던짐, 두 번째 실패 시 첫 번째 변경을 되돌림)
    async function swapOrder(table, curr, target) {
        const first = await window.supabaseClient.from(table).update({ order: target.order }).eq('id', curr.id);
        if (first.error) throw first.error;
        const second = await window.supabaseClient.from(table).update({ order: curr.order }).eq('id', target.id);
        if (second.error) {
            await window.supabaseClient.from(table).update({ order: curr.order }).eq('id', curr.id);
            throw second.error;
        }
    }

    // 목록 항목의 "홈페이지에서 보기" 링크 (새 탭, 상세 페이지를 열면 조회수가 1 올라감)
    function postViewLinkHtml(page, id) {
        if (id === null || id === undefined || id === '') return '';
        return '<a class="post-view-link" href="' + page + '?id=' + encodeURIComponent(String(id)) +
            '" target="_blank" rel="noopener" title="새 탭에서 홈페이지 화면을 엽니다 (조회수가 1 올라갑니다)">' +
            '홈페이지에서 보기 <i class="fas fa-external-link-alt" aria-hidden="true"></i></a>';
    }

    // ── 게시물 작성/미리보기 탭 (갤러리·공지사항) ──
    const postEditFields = document.getElementById('post-edit-fields');
    const postPreviewPane = document.getElementById('post-preview-pane');
    const postPreviewTabs = document.getElementById('post-preview-tabs');
    const postTabWrite = document.getElementById('post-tab-write');
    const postTabPreview = document.getElementById('post-tab-preview');

    function showPostWriteTab() {
        if (postEditFields) postEditFields.style.display = 'block';
        if (postPreviewPane) postPreviewPane.style.display = 'none';
        if (postTabWrite) postTabWrite.classList.add('active');
        if (postTabPreview) postTabPreview.classList.remove('active');
    }
    function showPostPreviewTab() {
        if (postEditFields) postEditFields.style.display = 'none';
        if (postPreviewPane) postPreviewPane.style.display = 'block';
        if (postTabWrite) postTabWrite.classList.remove('active');
        if (postTabPreview) postTabPreview.classList.add('active');
        updatePostPreview();
    }
    function initPostPreviewTabs(enabled) {
        if (postPreviewTabs) postPreviewTabs.style.display = enabled ? 'flex' : 'none';
        showPostWriteTab();
    }
    if (postTabWrite) postTabWrite.addEventListener('click', showPostWriteTab);
    if (postTabPreview) postTabPreview.addEventListener('click', showPostPreviewTab);

    // 갤러리 이미지 배열(File 또는 {url})을 미리보기용 src 목록으로 변환
    function resolveGalleryPreviewSrcs() {
        const files = (typeof galleryImageFiles !== 'undefined') ? galleryImageFiles : [];
        return Promise.all(files.map(function(f) {
            if (f instanceof File) {
                return new Promise(function(resolve) {
                    const reader = new FileReader();
                    reader.onload = function(ev) { resolve(ev.target.result); };
                    reader.readAsDataURL(f);
                });
            }
            return Promise.resolve(f.url);
        }));
    }

    async function updatePostPreview() {
        const type = document.getElementById('modal-post-type').value;
        const titleEl = document.getElementById('post-preview-title');
        const badgeEl = document.getElementById('post-preview-badge');
        const imagesEl = document.getElementById('post-preview-images');
        const contentEl = document.getElementById('post-preview-content');
        if (!titleEl || !imagesEl || !contentEl) return;

        const titleVal = document.getElementById('modal-title-input').value.trim();
        titleEl.textContent = titleVal || '제목을 입력하면 여기에 표시됩니다';

        if (badgeEl) {
            const noticeCheckbox = document.getElementById('modal-is-notice-checkbox');
            const isNotice = type === 'notices' && noticeCheckbox && noticeCheckbox.checked;
            badgeEl.style.display = isNotice ? 'inline-block' : 'none';
        }

        if (type === 'gallery') {
            imagesEl.style.display = 'block';
            const srcs = await resolveGalleryPreviewSrcs();
            imagesEl.innerHTML = srcs.length
                ? srcs.map(function(src) { return '<img src="' + src + '" alt="">'; }).join('')
                : '<p class="post-preview-empty-hint">이미지를 추가하면 여기에 표시됩니다</p>';
        } else {
            imagesEl.style.display = 'none';
            imagesEl.innerHTML = '';
        }

        const contentHtml = (typeof quill !== 'undefined' && quill) ? quill.root.innerHTML : '';
        const isEmptyContent = !contentHtml || contentHtml === '<p><br></p>';
        contentEl.innerHTML = isEmptyContent
            ? '<p class="post-preview-empty-hint">내용을 입력하면 여기에 표시됩니다</p>'
            : contentHtml;
    }

    const loginScreen = document.getElementById('login-screen');
    const adminMainContent = document.getElementById('admin-main-content');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    // --- Core Admin Logic ---
    
    // Check login status
    function checkLogin() {
        if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
            loginScreen.style.display = 'none';
            adminMainContent.style.display = 'block';
            document.body.classList.remove('login-active');
            scrollTabIntoView(document.querySelector('.tab-link.active'));
            initializeAdminPanel();
        } else {
            loginScreen.style.display = 'block';
            adminMainContent.style.display = 'none';
            document.body.classList.add('login-active');
        }
    }

    // Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
        // Simple check, replace with a real auth method if needed
        if (username === 'admin' && password === 'admin') {
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            checkLogin();
        } else {
            alert('아이디 또는 비밀번호가 일치하지 않습니다.');
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('isAdminLoggedIn');
        checkLogin();
    });

    // 탭 바가 가로로 스크롤되는 화면에서 선택된 탭이 보이도록 이동
    function scrollTabIntoView(tab) {
        const bar = tab && tab.parentElement;
        if (!bar || bar.scrollWidth <= bar.clientWidth + 1) return;
        const barRect = bar.getBoundingClientRect();
        const tabRect = tab.getBoundingClientRect();
        bar.scrollLeft += (tabRect.left - barRect.left) - (barRect.width - tabRect.width) / 2;
    }

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            scrollTabIntoView(tab);

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === target);
            });
        });
    });

    function initializeAdminPanel() {
        console.log("Initializing admin panel...");
        
        // Supabase 연결 상태 확인
        if (!window.supabaseClient) {
            console.error('Supabase 클라이언트가 초기화되지 않았습니다.');
            alert('Supabase 연결에 실패했습니다. 페이지를 새로고침해주세요.');
            return;
        }
        
        console.log('Supabase 클라이언트 상태:', window.supabaseClient);
        
        loadInstructors();
        loadFacilities();
        renderGalleryList();
        renderJobList();
        renderNoticeList();
        loadFAQList();
    }

    // --- Utility Functions ---
    const getFromStorage = (key) => JSON.parse(localStorage.getItem(key)) || [];
    const saveToStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));
    const getDeletedIds = () => JSON.parse(localStorage.getItem('shindongtan_deleted_items')) || {};
    const saveDeletedIds = (deletedIds) => localStorage.setItem('shindongtan_deleted_items', JSON.stringify(deletedIds));
    
    // Function to get next ID considering both local and db items
    const getNextId = (localItems, dbItems = []) => {
        const allIds = [...localItems.map(i => i.id), ...dbItems.map(i => i.id)];
        return allIds.length > 0 ? Math.max(...allIds) + 1 : 1;
    };
    
    // Function to merge DB and LocalStorage data
    async function getMergedData(storageKey, dbKey) {
        const localData = getFromStorage(storageKey);
        const deletedIds = getDeletedIds();
        const deletedIdsForType = new Set(deletedIds[dbKey] || []);

        try {
            // Supabase에서 데이터 가져오기
            if (window.db && window.db[dbKey]) {
                const dbData = await window.db[dbKey].getAll();
                
                // Filter out deleted items from db data
                const filteredDbData = dbData.filter(d => !deletedIdsForType.has(d.id));
                
                // Return a merged and sorted list, ensuring local changes override db data
                const localDataIds = new Set(localData.map(d => d.id));
                const uniqueDbData = filteredDbData.filter(d => !localDataIds.has(d.id));
                
                return [...localData, ...uniqueDbData].sort((a, b) => b.id - a.id);
            }
        } catch (error) {
            console.error(`Failed to load ${dbKey} from Supabase`, error);
        }
        return localData.sort((a, b) => b.id - a.id); // Fallback to local only
    }

    // Image to Base64 converter
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Supabase Storage에 이미지를 업로드하고 public URL을 반환하는 함수
    async function uploadInstructorImage(file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        let { error } = await window.supabaseClient.storage
            .from('instructor-images')
            .upload(filePath, file, { upsert: true });
        if (error) throw error;
        return window.supabaseClient.storage.from('instructor-images').getPublicUrl(filePath).data.publicUrl;
    }

    // Supabase Storage에서 강사 이미지 삭제 함수 추가
    async function deleteInstructorImage(imageUrl) {
        if (!imageUrl || imageUrl.includes('profile.png')) return;
        await removeStorageUrls([imageUrl]);
    }

    // --- Instructor Management ---
    const instructorForm = document.getElementById('instructor-form');
    const instructorList = document.getElementById('instructor-list');
    const cancelInstructorEditBtn = document.getElementById('cancel-instructor-edit');

    // 강사 작성/수정 모달
    const instructorModal = document.getElementById('instructor-modal');
    const addInstructorBtn = document.getElementById('add-instructor-btn');
    const instructorModalCloseBtn = document.getElementById('instructor-modal-close');
    let instructorModalDirty = false;

    function openInstructorModal() {
        if (instructorModal) instructorModal.style.display = 'flex';
    }
    function closeInstructorModal(force) {
        if (!force && instructorModalDirty && !confirm('작성 중인 내용이 있습니다. 닫으시겠습니까?')) return;
        if (instructorModal) instructorModal.style.display = 'none';
        instructorModalDirty = false;
    }
    if (addInstructorBtn) {
        addInstructorBtn.addEventListener('click', () => {
            cancelInstructorEditBtn.click();
            openInstructorModal();
        });
    }
    if (instructorModalCloseBtn) {
        instructorModalCloseBtn.addEventListener('click', () => closeInstructorModal(false));
    }
    const instructorModalCancelBtn = document.getElementById('instructor-modal-cancel');
    if (instructorModalCancelBtn) {
        instructorModalCancelBtn.addEventListener('click', () => closeInstructorModal(false));
    }
    if (instructorModal) {
        instructorModal.addEventListener('click', (e) => {
            if (e.target === instructorModal) closeInstructorModal(false);
        });
    }
    if (instructorForm) {
        instructorForm.addEventListener('input', () => { instructorModalDirty = true; });
        instructorForm.addEventListener('change', () => { instructorModalDirty = true; });
    }

    // 상세 정보 모달 관련 변수 및 함수 추가
    const instructorDetailModal = document.getElementById('instructor-detail-modal');
    const instructorDetailBody = document.getElementById('instructor-detail-body');
    const closeInstructorDetailBtn = document.getElementById('close-instructor-detail');

    // 사진 파일 선택(드래그앤드롭 포함) 시 미리보기
    (function() {
        var imgInput = document.getElementById('instructor-image');
        var imgPreview = document.getElementById('instructor-img-preview');
        var dropZone = document.getElementById('instructor-drop-zone');
        var addImageBtn = document.getElementById('instructor-add-image-btn');
        if (!imgInput || !imgPreview) return;

        function setPreview(file) {
            if (!file) { imgPreview.src = ''; imgPreview.classList.remove('visible'); return; }
            var reader = new FileReader();
            reader.onload = function(e) {
                imgPreview.src = e.target.result;
                imgPreview.classList.add('visible');
            };
            reader.readAsDataURL(file);
        }

        imgInput.addEventListener('change', function() { setPreview(this.files[0]); });

        if (addImageBtn) {
            addImageBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                imgInput.click();
            });
        }
        if (dropZone) {
            dropZone.addEventListener('click', function(e) {
                if (e.target.id !== 'instructor-add-image-btn') imgInput.click();
            });
            dropZone.addEventListener('dragover', function(e) {
                e.preventDefault(); dropZone.classList.add('drag-over');
            });
            dropZone.addEventListener('dragleave', function() {
                dropZone.classList.remove('drag-over');
            });
            dropZone.addEventListener('drop', function(e) {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                var file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    var dt = new DataTransfer();
                    dt.items.add(file);
                    imgInput.files = dt.files;
                    setPreview(file);
                    instructorModalDirty = true;
                }
            });
        }
    })();

    // 경력 항목 수 카운터 + 실시간 미리보기
    function updateDetailsCount() {
        var ta = document.getElementById('instructor-details');
        var counter = document.getElementById('instructor-details-count');
        var previewBox = document.getElementById('instructor-details-preview-box');
        var previewList = document.getElementById('instructor-details-preview');
        if (!ta) return;
        var lines = ta.value.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
        if (counter) counter.textContent = lines.length ? lines.length + '개 항목 입력됨' : '';
        if (previewBox && previewList) {
            if (lines.length) {
                previewList.innerHTML = lines.map(function(l) { return '<li>' + escapeHtml(l) + '</li>'; }).join('');
                previewBox.style.display = 'block';
            } else {
                previewList.innerHTML = '';
                previewBox.style.display = 'none';
            }
        }
    }
    (function() {
        var ta = document.getElementById('instructor-details');
        if (ta) ta.addEventListener('input', updateDetailsCount);
    })();

    // 강사 상세 정보 모달 열기
    async function showInstructorDetail(id) {
        try {
            const { data: instructor, error } = await window.supabaseClient
                .from('instructors')
                .select('*')
                .eq('id', id)
                .single();
            if (error || !instructor) {
                showToast('강사 정보를 찾을 수 없습니다.', 'error');
                return;
            }
            instructorDetailBody.innerHTML = `
                <div class="instructor-detail-center">
                    <img src="${escapeHtml(instructor.image || 'shindongtan/resource/profile.png')}" alt="${escapeHtml(instructor.name)}" class="instructor-detail-img">
                    <h4 class="instructor-detail-name">${escapeHtml(instructor.name)}</h4>
                    <p class="instructor-detail-role">${escapeHtml(instructor.title)}</p>
                    ${(instructor.details && instructor.details.length) ? `
                    <div class="instructor-detail-career">
                        <p class="instructor-detail-career-label">상세 경력</p>
                        <ul>${instructor.details.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
                    </div>` : ''}
                </div>
            `;
            instructorDetailModal.style.display = 'block';
        } catch (e) {
            showToast('강사 상세 정보 로드 중 오류가 발생했습니다.', 'error');
            console.error(e);
        }
    }

    // 모달 닫기 이벤트
    if (closeInstructorDetailBtn) {
        closeInstructorDetailBtn.addEventListener('click', () => {
            instructorDetailModal.style.display = 'none';
        });
    }
    window.addEventListener('click', (e) => {
        if (e.target === instructorDetailModal) {
            instructorDetailModal.style.display = 'none';
        }
    });

    // Supabase에서 강사 목록 불러오기 (order 기준 정렬, ▲▼ 버튼 추가)
    async function loadInstructors() {
        try {
            // order 기준 오름차순 정렬
            const { data: instructors, error } = await window.supabaseClient
                .from('instructors')
                .select('*')
                .order('order', { ascending: true });
            if (error) throw error;
            instructorList.innerHTML = '';
            if (instructors.length === 0) {
                instructorList.innerHTML = '<div class="empty-state"><i class="fas fa-user-tie"></i><p>등록된 강사가 없습니다.</p></div>';
                return;
            }
            instructors.forEach((inst, idx) => {
                const item = document.createElement('div');
                item.className = 'instructor-admin-item';
                item.innerHTML = `
                    <span class="instructor-order-badge">#${idx + 1}</span>
                    <div class="instructor-preview">
                        <img src="${escapeHtml(inst.image || 'shindongtan/resource/logo.png')}" alt="${escapeHtml(inst.name)}">
                        <div class="instructor-info">
                            <h4>${escapeHtml(inst.name)}</h4>
                            <p>${escapeHtml(inst.title)}</p>
                        </div>
                    </div>
                    <div class="instructor-actions">
                        <button class="button-secondary" data-id="${inst.id}">수정</button>
                        <button class="button-primary" data-id="${inst.id}">상세보기</button>
                        <button class="move-up button-secondary" data-id="${inst.id}" title="앞으로" ${idx === 0 ? 'disabled' : ''}>▲</button>
                        <button class="move-down button-secondary" data-id="${inst.id}" title="뒤로" ${idx === instructors.length - 1 ? 'disabled' : ''}>▼</button>
                        <button class="button-danger btn-delete" data-id="${inst.id}">삭제</button>
                    </div>`;
                item.querySelector('.button-secondary').addEventListener('click', () => editInstructor(inst.id));
                item.querySelector('.button-danger').addEventListener('click', () => deleteInstructor(inst.id));
                item.querySelector('.button-primary').addEventListener('click', () => showInstructorDetail(inst.id));
                item.querySelector('.move-up').addEventListener('click', () => moveInstructor(inst.id, -1, instructors));
                item.querySelector('.move-down').addEventListener('click', () => moveInstructor(inst.id, 1, instructors));
                instructorList.appendChild(item);
            });
        } catch (error) {
            instructorList.innerHTML = '<div class="error-message">강사 정보를 불러오는 데 실패했습니다.</div>';
            console.error('강사 목록 로드 오류:', error);
        }
    }

    // 순서 변경 함수 (▲▼)
    async function moveInstructor(id, direction, instructors) {
        // direction: -1(위로), 1(아래로)
        const idx = instructors.findIndex(i => i.id === id);
        if (idx === -1) return;
        const swapIdx = idx + direction;
        if (swapIdx < 0 || swapIdx >= instructors.length) return;
        const curr = instructors[idx];
        const target = instructors[swapIdx];
        try {
            // order 값 교환
            await swapOrder('instructors', curr, target);
            await loadInstructors();
        } catch (error) {
            showToast(failMsg('순서 변경에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', error), 'error');
            loadInstructors();
            console.error('순서 변경 오류:', error);
        }
    }

    // 강사 추가/수정
    instructorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loadingOverlay = document.getElementById('instructor-loading-overlay');
        const loadingText = document.getElementById('instructor-loading-text');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        try {
        const id = document.getElementById('instructor-id').value;
            const name = document.getElementById('instructor-name').value;
            const title = document.getElementById('instructor-title').value;
            const details = document.getElementById('instructor-details').value.split('\n').filter(line => line.trim());
        let imageFile = document.getElementById('instructor-image').files[0];

        // 큰 사진은 자동으로 줄이고, 줄인 뒤 크기를 확인
        if (imageFile) {
            if (loadingText) loadingText.textContent = '사진을 준비하는 중...';
            imageFile = await prepareImageForUpload(imageFile, MAX_PROFILE_IMAGE_BYTES);
            if (!imageFile) {
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                return;
            }
        }

        let imageUrl = null;
        let oldImageUrl = null;
        try {
            if (id && imageFile) {
                // 사진 교체 시 기존 사진 URL 기억 (저장 성공 후 삭제)
                const { data: oldRow } = await window.supabaseClient
                    .from('instructors').select('image').eq('id', id).single();
                oldImageUrl = oldRow ? oldRow.image : null;
            }
        } catch (e) { /* 기존 사진 조회 실패는 무시 */ }
        if (imageFile) {
            if (loadingText) loadingText.textContent = '이미지 업로드 중...';
            try {
                imageUrl = await uploadInstructorImage(imageFile);
            } catch (uploadErr) {
                showToast(failMsg('사진 업로드에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', uploadErr), 'error');
                console.error('강사 사진 업로드 오류:', uploadErr);
                return;
            }
            if (loadingText) loadingText.textContent = '강사 정보 저장 중...';
        }

        const instructorData = {
                name,
                title,
                details,
                ...(imageUrl && { image: imageUrl })
            };
            
        try {
            if (id) {
                const { error: updateError } = await window.supabaseClient
                    .from('instructors')
                    .update(instructorData)
                    .eq('id', id);
                if (updateError) throw updateError;
            } else {
                // 새 강사 추가 시 order를 가장 큰 값 + 1로 지정
                const { data: maxOrderData } = await window.supabaseClient
                    .from('instructors')
                    .select('order')
                    .order('order', { ascending: false })
                    .limit(1)
                    .single();
                const nextOrder = maxOrderData ? (maxOrderData.order + 1) : 1;
                instructorData.order = nextOrder;
                const { error: insertError } = await window.supabaseClient
                    .from('instructors')
                    .insert([instructorData]);
                if (insertError) throw insertError;
            }
            // 사진을 교체했다면 기존 사진 파일 정리 (실패해도 저장에는 영향 없음)
            if (imageUrl && oldImageUrl && oldImageUrl !== imageUrl) {
                deleteInstructorImage(oldImageUrl);
            }
            await loadInstructors();
            instructorForm.reset();
            cancelInstructorEditBtn.click();
            showToast(id ? '강사 정보가 수정되었습니다.' : '강사가 등록되었습니다.', 'success');
        } catch (error) {
            // 저장 실패: 방금 올린 사진은 정리하고, 모달과 입력 내용은 그대로 유지
            if (imageUrl) deleteInstructorImage(imageUrl);
            showToast(failMsg(SAVE_FAIL_MSG, error), 'error');
            console.error('강사 저장 오류:', error);
            }
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    });

    // 강사 정보 수정 폼에 채우기
    async function editInstructor(id) {
        try {
            const { data: instructor, error } = await window.supabaseClient
                .from('instructors')
                .select('*')
                .eq('id', id)
                .single();
            if (error || !instructor) {
                showToast('강사 정보를 찾을 수 없습니다.', 'error');
                return;
            }
            document.getElementById('instructor-id').value = instructor.id;
            document.getElementById('instructor-name').value = instructor.name;
            document.getElementById('instructor-title').value = instructor.title;
            document.getElementById('instructor-details').value = (instructor.details || []).join('\n');
            updateDetailsCount();
            // 현재 이미지 미리보기 표시
            var preview = document.getElementById('instructor-img-preview');
            if (preview) {
                if (instructor.image) {
                    preview.src = instructor.image;
                    preview.classList.add('visible');
                } else {
                    preview.src = '';
                    preview.classList.remove('visible');
                }
            }
            // 수정 모드 UI 표시
            var formTitle = document.getElementById('instructor-form-title');
            var formCard = document.getElementById('instructor-form-card');
            if (formTitle) formTitle.textContent = '"' + instructor.name + '" 수정 중';
            if (formCard) formCard.classList.add('editing-mode');
            cancelInstructorEditBtn.style.display = 'inline-block';
            instructorForm.querySelector('button[type="submit"]').textContent = '수정하기';
            instructorModalDirty = false;
            openInstructorModal();
        } catch (error) {
            showToast('강사 정보 로드 중 오류가 발생했습니다.', 'error');
            console.error('강사 정보 로드 오류:', error);
        }
    }

    cancelInstructorEditBtn.addEventListener('click', () => {
        instructorForm.reset();
        document.getElementById('instructor-id').value = '';
        cancelInstructorEditBtn.style.display = 'none';
        instructorForm.querySelector('button[type="submit"]').textContent = '저장하기';
        var formTitle = document.getElementById('instructor-form-title');
        var formCard = document.getElementById('instructor-form-card');
        if (formTitle) formTitle.textContent = '신규 강사 추가';
        if (formCard) formCard.classList.remove('editing-mode');
        var preview = document.getElementById('instructor-img-preview');
        if (preview) { preview.src = ''; preview.classList.remove('visible'); }
        updateDetailsCount();
        closeInstructorModal(true);
    });

    // 강사 삭제
    async function deleteInstructor(id) {
        showConfirm('이 강사를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.', async function() {
            try {
                const { data: instructor, error: fetchError } = await window.supabaseClient
                    .from('instructors').select('image').eq('id', id).single();
                if (fetchError) { showToast(failMsg('강사 정보를 불러오지 못했습니다.', fetchError), 'error'); return; }
                const { error: deleteError } = await window.supabaseClient.from('instructors').delete().eq('id', id);
                if (deleteError) throw deleteError;
                // DB 삭제 성공 후 사진 파일 정리
                await deleteInstructorImage(instructor.image);
                await loadInstructors();
                showToast('강사 정보가 삭제되었습니다.', 'success');
            } catch (error) {
                showToast(failMsg('삭제에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', error), 'error');
                console.error('강사 삭제 오류:', error);
            }
        });
    }


    // --- Facility Management (Supabase 연동) ---
    const facilityForm = document.getElementById('facility-form');
    const facilityList = document.getElementById('facility-list');

    // 시설 사진 작성 모달
    const facilityModal = document.getElementById('facility-modal');
    const addFacilityBtn = document.getElementById('add-facility-btn');
    const facilityModalCloseBtn = document.getElementById('facility-modal-close');
    let facilityModalDirty = false;

    function openFacilityModal() {
        if (facilityModal) facilityModal.style.display = 'flex';
    }
    function closeFacilityModal(force) {
        if (!force && facilityModalDirty && !confirm('작성 중인 내용이 있습니다. 닫으시겠습니까?')) return;
        if (facilityModal) facilityModal.style.display = 'none';
        if (facilityForm) facilityForm.reset();
        const facilityImgPreview = document.getElementById('facility-img-preview');
        if (facilityImgPreview) { facilityImgPreview.src = ''; facilityImgPreview.classList.remove('visible'); }
        facilityModalDirty = false;
    }
    if (addFacilityBtn) {
        addFacilityBtn.addEventListener('click', () => {
            openFacilityModal();
        });
    }
    if (facilityModalCloseBtn) {
        facilityModalCloseBtn.addEventListener('click', () => closeFacilityModal(false));
    }
    const facilityModalCancelBtn = document.getElementById('facility-modal-cancel');
    if (facilityModalCancelBtn) {
        facilityModalCancelBtn.addEventListener('click', () => closeFacilityModal(false));
    }
    if (facilityModal) {
        facilityModal.addEventListener('click', (e) => {
            if (e.target === facilityModal) closeFacilityModal(false);
        });
    }
    if (facilityForm) {
        facilityForm.addEventListener('input', () => { facilityModalDirty = true; });
        facilityForm.addEventListener('change', () => { facilityModalDirty = true; });
    }

    // 시설 이미지 목록 불러오기
    async function loadFacilities() {
        try {
            // Supabase 연결 상태 확인
            if (!window.supabaseClient) {
                console.error('Supabase 클라이언트가 초기화되지 않았습니다.');
                facilityList.innerHTML = '<div class="error-message">Supabase 연결에 실패했습니다.</div>';
                return;
            }
            
            console.log('시설 목록 로딩 시작...');
            
        const { data: facilities, error } = await window.supabaseClient
            .from('facilities')
            .select('*')
            .order('order', { ascending: true });
            
            console.log('시설 목록 로딩 결과:', { facilities, error });
            
        if (error) {
                console.error('시설 목록 로드 실패:', error);
                facilityList.innerHTML = '<div class="error-message">시설 이미지를 불러오는 데 실패했습니다: ' + escapeHtml(error.message) + '</div>';
            return;
        }
            
        facilityList.innerHTML = '';
            
            if (facilities.length === 0) {
                facilityList.innerHTML = '<div class="facility-empty-state"><i class="fas fa-images"></i><p>등록된 시설 사진이 없습니다.</p></div>';
                return;
            }

        facilities.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            const altDisplay = item.alt ? escapeHtml(item.alt) : '<span style="color:var(--t3)">설명 없음</span>';
            div.innerHTML = `
                <span class="facility-order-badge">#${idx + 1}</span>
                <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.alt || '')}">
                <div class="facility-alt-area">
                    <p class="facility-alt-text">${altDisplay}</p>
                    <button class="facility-edit-btn"><i class="fas fa-pen"></i> 설명 수정</button>
                    <button class="facility-replace-btn"><i class="fas fa-camera"></i> 사진 교체</button>
                </div>
                <button class="move-up" ${idx === 0 ? 'disabled' : ''}>▲</button>
                <button class="move-down" ${idx === facilities.length - 1 ? 'disabled' : ''}>▼</button>
                <button class="delete-btn">&times;</button>
            `;
            div.querySelector('.move-up').onclick = () => moveFacility(item.id, -1, facilities);
            div.querySelector('.move-down').onclick = () => moveFacility(item.id, 1, facilities);
            div.querySelector('.delete-btn').onclick = () => deleteFacility(item);

            // 설명 인라인 수정
            div.querySelector('.facility-edit-btn').onclick = function() {
                const altArea = div.querySelector('.facility-alt-area');
                const altText = div.querySelector('.facility-alt-text');
                const editBtn = div.querySelector('.facility-edit-btn');
                const replaceBtn = div.querySelector('.facility-replace-btn');
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'facility-alt-input';
                input.value = item.alt || '';
                input.maxLength = 100;
                const actions = document.createElement('div');
                actions.className = 'facility-alt-actions';
                const saveBtn = document.createElement('button');
                saveBtn.className = 'button-primary';
                saveBtn.textContent = '저장';
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'button-secondary';
                cancelBtn.textContent = '취소';
                actions.appendChild(saveBtn);
                actions.appendChild(cancelBtn);
                altText.style.display = 'none';
                editBtn.style.display = 'none';
                replaceBtn.style.display = 'none';
                altArea.insertBefore(input, replaceBtn.nextSibling);
                altArea.insertBefore(actions, input.nextSibling);
                input.focus();
                cancelBtn.onclick = function() {
                    altText.style.display = '';
                    editBtn.style.display = '';
                    replaceBtn.style.display = '';
                    input.remove();
                    actions.remove();
                };
                saveBtn.onclick = async function() {
                    const newAlt = input.value.trim();
                    try {
                        const { error } = await window.supabaseClient.from('facilities').update({ alt: newAlt }).eq('id', item.id);
                        if (error) throw error;
                        item.alt = newAlt;
                        altText.innerHTML = newAlt ? escapeHtml(newAlt) : '<span style="color:var(--t3)">설명 없음</span>';
                        altText.style.display = '';
                        editBtn.style.display = '';
                        replaceBtn.style.display = '';
                        input.remove();
                        actions.remove();
                        showToast('사진 설명이 수정되었습니다.', 'success');
                    } catch (err) {
                        showToast(failMsg(SAVE_FAIL_MSG, err), 'error');
                    }
                };
            };

            // 사진 교체
            div.querySelector('.facility-replace-btn').onclick = function() {
                const replaceInput = document.getElementById('facility-replace-input');
                replaceInput._targetItem = item;
                replaceInput.value = '';
                replaceInput.click();
            };

            facilityList.appendChild(div);
        });
            
            console.log('시설 목록 렌더링 완료');
            
        } catch (error) {
            console.error('시설 목록 로드 중 오류:', error);
            facilityList.innerHTML = '<div class="error-message">시설 이미지를 불러오는 데 실패했습니다: ' + escapeHtml(error.message) + '</div>';
        }
    }

    // 이미지 업로드 및 row 추가
    async function addFacilityImage(file, alt) {
        let uploadedUrl = null;
        try {
            console.log('시설 이미지 업로드 시작:', { fileName: file.name, fileSize: file.size });
            
            if (!window.supabaseClient) {
                throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
            }
            
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
            
            console.log('Storage 업로드 시작:', fileName);
            
            // Storage에 이미지 업로드
        const { error: uploadError } = await window.supabaseClient
            .storage.from('facility-images')
            .upload(fileName, file, { upsert: true });
            
            if (uploadError) {
                console.error('Storage 업로드 실패:', uploadError);
                throw uploadError;
            }
            
            console.log('Storage 업로드 성공');
            
            // 공개 URL 가져오기
        const publicUrl = window.supabaseClient.storage.from('facility-images').getPublicUrl(fileName).data.publicUrl;
            uploadedUrl = publicUrl;
            console.log('공개 URL 생성:', publicUrl);
            
        // order 값: 가장 큰 값 + 1
        const { data: maxOrderData } = await window.supabaseClient
            .from('facilities')
            .select('order')
            .order('order', { ascending: false })
                .limit(1);
            
            const newOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order + 1 : 1;
            console.log('새로운 order 값:', newOrder);
            
            // DB에 row 추가
            const { data: newFacility, error: insertError } = await window.supabaseClient
            .from('facilities')
                .insert([{
                    image_url: publicUrl,
                    alt: alt,
                    order: newOrder
                }])
                .select()
                .single();
            
            if (insertError) {
                console.error('DB 삽입 실패:', insertError);
                throw insertError;
            }
            
            console.log('DB 삽입 성공:', newFacility);
            
            // 목록 새로고침
        await loadFacilities();
        showToast('시설 사진이 업로드되었습니다.', 'success');
        return true;
        } catch (error) {
            console.error('시설 이미지 업로드 실패:', error);
            // DB 저장에 실패했다면 방금 올린 파일 정리
            if (uploadedUrl) removeStorageUrls([uploadedUrl]);
            showToast(failMsg(SAVE_FAIL_MSG, error), 'error');
            return false;
        }
    }

    // 삭제
    async function deleteFacility(item) {
        showConfirm('이 시설 사진을 삭제하시겠습니까?', async function() { return _deleteFacilityImpl(item); });
    }
    async function _deleteFacilityImpl(item) {
        
        try {
        // 1. DB row 삭제
            const { error } = await window.supabaseClient.from('facilities').delete().eq('id', item.id);
            if (error) throw error;

        // 2. DB 삭제 성공 후 Storage에서 이미지 삭제
            if (item.image_url) await removeStorageUrls([item.image_url]);
            
            // 3. 목록 새로고침
        await loadFacilities();
        showToast('시설 사진이 삭제되었습니다.', 'success');
        } catch (error) {
            console.error('시설 삭제 실패:', error);
            showToast(failMsg('삭제에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', error), 'error');
        }
    }

    // 순서 변경
    async function moveFacility(id, direction, facilities) {
        try {
        const idx = facilities.findIndex(f => f.id === id);
        if (idx === -1) return;
        const swapIdx = idx + direction;
        if (swapIdx < 0 || swapIdx >= facilities.length) return;
            
        const curr = facilities[idx];
        const target = facilities[swapIdx];
            
            // 순서 변경
        await swapOrder('facilities', curr, target);
            
            // 목록 새로고침
        await loadFacilities();
        } catch (error) {
            console.error('시설 순서 변경 실패:', error);
            showToast(failMsg('순서 변경에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', error), 'error');
            loadFacilities();
        }
    }

    // 폼 이벤트 연결
    if (facilityForm) {
        facilityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let file = document.getElementById('facility-image').files[0];
            const alt = document.getElementById('facility-alt').value;

            if (!file) {
                showToast('사진을 선택해주세요.', 'warning');
                return;
            }

            const loadingOverlay = document.getElementById('facility-loading-overlay');
            const loadingText = document.getElementById('facility-loading-text');
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = '사진을 준비하는 중...';

            try {
                // 큰 사진은 자동으로 줄이고, 줄인 뒤 크기를 확인
                file = await prepareImageForUpload(file, MAX_PROFILE_IMAGE_BYTES);
                if (!file) return;
                if (loadingText) loadingText.textContent = '시설 사진 저장 중...';
                console.log('시설 폼 제출:', { fileName: file.name, alt: alt });
                const uploaded = await addFacilityImage(file, alt);
                if (uploaded) closeFacilityModal(true);
            } catch (error) {
                console.error('시설 폼 제출 오류:', error);
                showToast('시설 사진 업로드 중 오류가 발생했습니다.', 'error');
            } finally {
                if (loadingOverlay) loadingOverlay.style.display = 'none';
            }
        });
    }

    // 파일 선택(드래그앤드롭 포함) 미리보기
    (function() {
        var facilityImgInput = document.getElementById('facility-image');
        var facilityImgPreview = document.getElementById('facility-img-preview');
        var dropZone = document.getElementById('facility-drop-zone');
        var addImageBtn = document.getElementById('facility-add-image-btn');
        if (!facilityImgInput || !facilityImgPreview) return;

        function setPreview(file) {
            if (!file) { facilityImgPreview.src = ''; facilityImgPreview.classList.remove('visible'); return; }
            var reader = new FileReader();
            reader.onload = function(e) {
                facilityImgPreview.src = e.target.result;
                facilityImgPreview.classList.add('visible');
            };
            reader.readAsDataURL(file);
        }

        facilityImgInput.addEventListener('change', function() { setPreview(this.files[0]); });

        if (addImageBtn) {
            addImageBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                facilityImgInput.click();
            });
        }
        if (dropZone) {
            dropZone.addEventListener('click', function(e) {
                if (e.target.id !== 'facility-add-image-btn') facilityImgInput.click();
            });
            dropZone.addEventListener('dragover', function(e) {
                e.preventDefault(); dropZone.classList.add('drag-over');
            });
            dropZone.addEventListener('dragleave', function() {
                dropZone.classList.remove('drag-over');
            });
            dropZone.addEventListener('drop', function(e) {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                var file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    var dt = new DataTransfer();
                    dt.items.add(file);
                    facilityImgInput.files = dt.files;
                    setPreview(file);
                    facilityModalDirty = true;
                }
            });
        }
    })();

    // 사진 교체 핸들러
    (function() {
        var replaceInput = document.getElementById('facility-replace-input');
        if (!replaceInput) return;
        replaceInput.addEventListener('change', async function() {
            var file = this.files[0];
            var item = this._targetItem;
            if (!file || !item) return;
            if (!file.type.startsWith('image/')) {
                showToast('이미지 파일만 올릴 수 있습니다. (JPG, PNG, WebP 등)', 'error');
                return;
            }
            const loadingOverlay = document.getElementById('facility-loading-overlay');
            const loadingText = document.getElementById('facility-loading-text');
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = '새 사진 업로드 중...';
            let newUrl = null;
            try {
                // 큰 사진은 자동으로 줄이고, 줄인 뒤 크기를 확인
                file = await prepareImageForUpload(file, MAX_PROFILE_IMAGE_BYTES);
                if (!file) return;
                const fileExt = file.name.split('.').pop();
                const fileName = Date.now() + '.' + fileExt;
                const { error: uploadError } = await window.supabaseClient.storage.from('facility-images').upload(fileName, file, { upsert: true });
                if (uploadError) throw uploadError;
                if (loadingText) loadingText.textContent = '정보 업데이트 중...';
                const publicUrl = window.supabaseClient.storage.from('facility-images').getPublicUrl(fileName).data.publicUrl;
                newUrl = publicUrl;
                const { error: updateError } = await window.supabaseClient.from('facilities').update({ image_url: publicUrl }).eq('id', item.id);
                if (updateError) throw updateError;
                // DB 업데이트 성공 후 기존 파일 삭제
                if (item.image_url && item.image_url !== publicUrl) await removeStorageUrls([item.image_url]);
                await loadFacilities();
                showToast('사진이 교체되었습니다.', 'success');
            } catch (err) {
                console.error('사진 교체 오류:', err);
                if (newUrl) removeStorageUrls([newUrl]);
                showToast(failMsg('사진 교체에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', err), 'error');
            } finally {
                if (loadingOverlay) loadingOverlay.style.display = 'none';
            }
        });
    })();

    // 시설 이미지 목록은 로그인 후 initializeAdminPanel()에서 한 번만 불러옴

    // --- Jobs Management (Supabase 연동) ---
    window.boardConfig.gallery = window.boardConfig.gallery || {};
    window.boardConfig.gallery.storageKey = 'shindongtan_gallery';
    window.boardConfig.gallery.listEl = document.getElementById('gallery-list');
    window.boardConfig.gallery.addBtn = document.getElementById('add-gallery-btn');
    window.boardConfig.gallery.title = '갤러리';
    window.boardConfig.gallery.fields = ['title', 'image', 'content'];
    
    window.boardConfig.notices = window.boardConfig.notices || {};
    window.boardConfig.notices.storageKey = 'shindongtan_notices';
    window.boardConfig.notices.listEl = document.getElementById('notice-list');
    window.boardConfig.notices.addBtn = document.getElementById('add-notice-btn');
    window.boardConfig.notices.title = '공지사항';
    window.boardConfig.notices.fields = ['title', 'content', 'isNotice'];
    
    window.boardConfig.jobs.storageKey = 'shindongtan_jobs';
    window.boardConfig.jobs.title = '구인';
    window.boardConfig.jobs.fields = ['title', 'description'];

    console.log('Modal elements found:', {
        modal: !!modal,
        modalForm: !!modalForm,
        modalTitle: !!modalTitle,
        modalImageGroup: !!modalImageGroup,
        modalNoticeGroup: !!modalNoticeGroup,
        closeModalBtn: !!closeModalBtn
    });

    console.log('Board config elements found:', {
        jobs: {
            listEl: !!window.boardConfig.jobs.listEl,
            addBtn: !!window.boardConfig.jobs.addBtn
        },
        gallery: {
            listEl: !!window.boardConfig.gallery.listEl,
            addBtn: !!window.boardConfig.gallery.addBtn
        },
        notices: {
            listEl: !!window.boardConfig.notices.listEl,
            addBtn: !!window.boardConfig.notices.addBtn
        }
    });

    // --- Gallery Management (Supabase 연동) ---
    let _allGalleryItems = [];
    async function loadGalleryList() {
        const { data, error } = await window.supabaseClient
            .from('gallery')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            window.boardConfig.gallery.listEl.innerHTML = '<tr><td colspan="6">갤러리 목록을 불러오지 못했습니다.</td></tr>';
            return [];
        }
        return data;
    }
    async function renderGalleryList() {
        _allGalleryItems = await loadGalleryList();
        const searchInput = document.getElementById('gallery-search-input');
        if (searchInput) searchInput.value = '';
        displayGalleryList(_allGalleryItems);
    }
    function displayGalleryList(items) {
        const listEl = window.boardConfig.gallery.listEl;
        listEl.innerHTML = '';
        if (!items.length) {
            listEl.innerHTML = '<div class="empty-state"><i class="fas fa-images"></i>게시물이 없습니다.</div>';
            return;
        }
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'post-card-item';
            const thumbSrc = getGalleryImageUrl(item.image);
            div.innerHTML = `
                <div class="post-card-main">
                    <div class="post-card-title">${escapeHtml(item.title)}</div>
                    <div class="post-card-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${formatKoreaDate(item.created_at)}</span>
                        <span><i class="fas fa-eye"></i> ${item.views || 0}</span>
                    </div>
                </div>
                <div class="post-card-actions">
                    ${postViewLinkHtml('community_gallery_detail.html', item.id)}
                    <button class="button-secondary">수정</button>
                    <span class="action-sep" aria-hidden="true"></span>
                    <button class="button-danger btn-delete">삭제</button>
                </div>`;
            if (thumbSrc) {
                // 목록에는 가벼운 썸네일(thumbs/<이름>.jpg)을 쓰고, 없으면 원본으로 대체 (한 번만)
                const img = document.createElement('img');
                img.className = 'post-card-thumb';
                img.alt = '썸네일';
                img.loading = 'lazy';
                const fallbackSrc = thumbSrc;
                img.onerror = function() {
                    this.onerror = null;
                    if (this.src !== fallbackSrc) this.src = fallbackSrc;
                };
                img.src = galleryThumbUrl(thumbSrc);
                div.insertBefore(img, div.firstChild);
            }
            div.querySelector('.button-secondary').addEventListener('click', () => showEditGalleryModal(item));
            div.querySelector('.button-danger').addEventListener('click', () => deleteGalleryItem(item));
            listEl.appendChild(div);
        });
    }
    function getGalleryImageUrl(imageField) {
        let fileName = '';
        if (Array.isArray(imageField)) {
            fileName = imageField[0];
        } else if (typeof imageField === 'string') {
            try {
                const arr = JSON.parse(imageField);
                fileName = Array.isArray(arr) ? arr[0] : imageField;
            } catch {
                fileName = imageField;
            }
        }
        if (!fileName) return '';
        if (fileName.startsWith('http')) return fileName;
        return `${window.supabaseClient.storageUrl}/object/public/gallery-images/${fileName}`;
    }
    async function showAddGalleryModal() {
        // 모달 초기화
        modalForm.reset();
        document.getElementById('modal-post-id').value = '';
        document.getElementById('modal-post-type').value = 'gallery';
        modalTitle.textContent = '새 갤러리 작성';
        modal.querySelector('.modal-content').classList.remove('editing-mode');
        modalImageGroup.style.display = 'block';
        modalNoticeGroup.style.display = 'none';

        // Quill 에디터 초기화
        initializeQuillEditor();

        // 갤러리 이미지 초기화
        resetGalleryImageFiles();

        // 모달 표시
        initPostPreviewTabs(true);
        modal.style.display = 'flex';
        capturePostModalSnapshot();
        maybeRestoreDraft();
    }
    async function showEditGalleryModal(item) {
        // 모달 초기화
        modalForm.reset();
        document.getElementById('modal-post-id').value = String(item.id);
        document.getElementById('modal-post-type').value = 'gallery';
        modalTitle.textContent = '"' + item.title + '" 수정 중';
        modal.querySelector('.modal-content').classList.add('editing-mode');
        modalImageGroup.style.display = 'block';
        modalNoticeGroup.style.display = 'none';
        document.getElementById('modal-title-input').value = item.title;
        const galleryContent = prepareHtmlForEditor(item.description || '');
        document.getElementById('modal-content-input').value = galleryContent;
        
        // Quill 에디터 초기화 및 내용 설정 (<br>을 그대로 유지해야 줄바꿈이 보존됨)
        initializeQuillEditor();
        if (quill) {
            quill.root.innerHTML = galleryContent;
        }
        
        // 기존 이미지들 미리보기로 보여주기
        const images = normalizeGalleryImages(item.image);
        galleryImageFiles = images.map(url => ({ url }));
        renderGalleryImagePreviews();

        // 모달 표시
        initPostPreviewTabs(true);
        modal.style.display = 'flex';
        capturePostModalSnapshot();
        maybeRestoreDraft();
    }
    // 갤러리 이미지 파일 관리
    let galleryImageFiles = [];
    // 게시물(공지/구인/갤러리) 모달 변경 여부 (이름은 기존 코드 호환을 위해 유지)
    let galleryModalDirty = false;
    let postModalSnapshot = null;
    let galleryPreviewObjectUrls = [];

    // 모달을 연 직후 상태 저장 (닫을 때 변경 여부 비교용)
    function capturePostModalSnapshot() {
        if (typeof quill !== 'undefined' && quill) {
            // innerHTML로 넣은 내용을 Quill에 즉시 반영 (변경 이벤트 없이)
            try { quill.update('silent'); } catch (e) {}
        }
        const noticeCheckbox = document.getElementById('modal-is-notice-checkbox');
        postModalSnapshot = {
            title: document.getElementById('modal-title-input').value,
            html: (typeof quill !== 'undefined' && quill) ? quill.root.innerHTML : '',
            isNotice: noticeCheckbox ? noticeCheckbox.checked : false
        };
        galleryModalDirty = false;
    }
    function isPostModalDirty() {
        if (!modal || modal.style.display === 'none' || modal.style.display === '') return false;
        if (galleryModalDirty) return true;
        if (!postModalSnapshot) return false;
        const noticeCheckbox = document.getElementById('modal-is-notice-checkbox');
        const html = (typeof quill !== 'undefined' && quill) ? quill.root.innerHTML : '';
        return document.getElementById('modal-title-input').value !== postModalSnapshot.title ||
            html !== postModalSnapshot.html ||
            (noticeCheckbox ? noticeCheckbox.checked : false) !== postModalSnapshot.isNotice;
    }

    // ── 작성 중인 글 자동 임시저장 (공지/구인/갤러리, 이 브라우저에만 저장) ──
    const DRAFT_PREFIX = 'shindongtan_admin_draft_';
    let draftSaveTimer = null;
    let draftInterval = null;
    let draftSuspended = false;
    function currentDraftKey() {
        const typeEl = document.getElementById('modal-post-type');
        const idEl = document.getElementById('modal-post-id');
        const type = typeEl ? typeEl.value : '';
        if (['notices', 'jobs', 'gallery'].indexOf(type) === -1) return null;
        return DRAFT_PREFIX + type + '_' + ((idEl && idEl.value) || 'new');
    }
    function readDraft(key) {
        if (!key) return null;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const d = JSON.parse(raw);
            return (d && typeof d === 'object') ? d : null;
        } catch (e) { return null; }
    }
    function clearDraft(key) {
        if (!key) return;
        try { localStorage.removeItem(key); } catch (e) { /* 무시 */ }
    }
    function setDraftStatus(text) {
        const el = document.getElementById('draft-status');
        if (el) el.textContent = text || '';
    }
    function draftTimeText(ts) {
        const d = new Date(ts || Date.now());
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    function saveDraftNow() {
        if (draftSuspended || !modal || modal.style.display !== 'flex') return;
        if (!isPostModalDirty()) return;
        const key = currentDraftKey();
        if (!key) return;
        const cb = document.getElementById('modal-is-notice-checkbox');
        const title = document.getElementById('modal-title-input').value;
        const html = (typeof quill !== 'undefined' && quill) ? quill.root.innerHTML : '';
        const text = (typeof quill !== 'undefined' && quill) ? quill.getText().trim() : '';
        if (!title.trim() && !text && !/<img/i.test(html)) { clearDraft(key); setDraftStatus(''); return; }
        const data = { title: title, html: html, isNotice: cb ? cb.checked : false, savedAt: Date.now() };
        try {
            localStorage.setItem(key, JSON.stringify(data));
            setDraftStatus('임시저장됨 ' + draftTimeText(data.savedAt));
        } catch (e) { /* 저장 공간 부족 등은 무시 */ }
    }
    function scheduleDraftSave() {
        if (draftSuspended) return;
        clearTimeout(draftSaveTimer);
        draftSaveTimer = setTimeout(saveDraftNow, 1200);
    }
    function startDraftAutosave() {
        stopDraftAutosave();
        draftInterval = setInterval(saveDraftNow, 5000);
    }
    function stopDraftAutosave() {
        clearTimeout(draftSaveTimer);
        clearInterval(draftInterval);
        draftSaveTimer = null;
        draftInterval = null;
    }
    // "작성 중이던 글이 있습니다" 확인창 (onChoice(true)=불러오기, false=새로 쓰기)
    function showDraftPrompt(isEdit, savedAt, onChoice) {
        const box = document.getElementById('draft-modal');
        const msg = document.getElementById('draft-modal-msg');
        const sub = document.getElementById('draft-modal-sub');
        const okBtn = document.getElementById('draft-restore-btn');
        const noBtn = document.getElementById('draft-discard-btn');
        if (!box || !okBtn || !noBtn) {
            onChoice(confirm('작성 중이던 글이 있습니다. 불러올까요?'));
            return;
        }
        if (msg) msg.textContent = isEdit ? '이 글을 수정하던 내용이 있습니다. 불러올까요?' : '작성 중이던 글이 있습니다. 불러올까요?';
        if (sub) sub.textContent = savedAt ? '마지막 임시저장: ' + formatKoreaDate(new Date(savedAt).toISOString()) : '';
        noBtn.textContent = isEdit ? '원래 글로 시작' : '새로 쓰기';
        box.style.display = 'flex';
        function done(choice) {
            box.style.display = 'none';
            okBtn.removeEventListener('click', onOk);
            noBtn.removeEventListener('click', onNo);
            onChoice(choice);
        }
        function onOk() { done(true); }
        function onNo() { done(false); }
        okBtn.addEventListener('click', onOk);
        noBtn.addEventListener('click', onNo);
        setTimeout(function() { try { okBtn.focus(); } catch (e) {} }, 0);
    }
    function applyDraft(draft) {
        document.getElementById('modal-title-input').value = draft.title || '';
        const cb = document.getElementById('modal-is-notice-checkbox');
        if (cb) cb.checked = !!draft.isNotice;
        if (typeof quill !== 'undefined' && quill) {
            quill.root.innerHTML = draft.html || '';
            try { quill.update('silent'); } catch (e) {}
        }
        // 불러온 내용은 아직 저장되지 않은 변경으로 취급 (닫을 때 확인)
        galleryModalDirty = true;
        setDraftStatus('임시저장됨 ' + draftTimeText(draft.savedAt));
        const isGalleryNew = document.getElementById('modal-post-type').value === 'gallery' && !document.getElementById('modal-post-id').value;
        showToast(isGalleryNew ? '작성 중이던 글을 불러왔습니다. 사진은 다시 추가해 주세요.' : '작성 중이던 글을 불러왔습니다.', 'success');
    }
    // 모달을 연 직후 호출: 임시저장 시작 + 남아 있는 임시저장 글이 있으면 불러올지 묻기
    function maybeRestoreDraft() {
        setDraftStatus('');
        startDraftAutosave();
        const key = currentDraftKey();
        const draft = readDraft(key);
        if (!draft || (!draft.title && !draft.html)) return;
        const snap = postModalSnapshot;
        if (snap && draft.title === snap.title && draft.html === snap.html && !!draft.isNotice === snap.isNotice) {
            clearDraft(key);
            return;
        }
        const isEdit = !!document.getElementById('modal-post-id').value;
        draftSuspended = true;
        showDraftPrompt(isEdit, draft.savedAt, function(restore) {
            draftSuspended = false;
            if (!modal || modal.style.display !== 'flex' || currentDraftKey() !== key) return;
            if (restore) applyDraft(draft);
            else clearDraft(key);
        });
    }
    window.addEventListener('beforeunload', function() { saveDraftNow(); });
    document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'hidden') saveDraftNow(); });

    function isGalleryModal() {
        const pt = document.getElementById('modal-post-type');
        return pt && pt.value === 'gallery';
    }

    // 공통 파일 처리 함수 (파일 선택 + 드래그앤드롭 공용)
    // 선택한 사진은 바로 자동 압축(긴 변 1920px)한 뒤 목록에 추가 (압축 후 크기로 검사)
    let galleryPreparing = 0;
    async function processImageFiles(files) {
        const list = Array.from(files || []);
        if (!list.length) return;
        const loadingOverlay = document.getElementById('gallery-loading-overlay');
        const loadingText = document.getElementById('gallery-loading-text');
        galleryPreparing++;
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        let added = 0;
        try {
            for (let i = 0; i < list.length; i++) {
                const file = list[i];
                if (loadingText) loadingText.textContent = '사진을 준비하는 중... (' + (i + 1) + '/' + list.length + ')';
                const prepared = await prepareImageForUpload(file, MAX_GALLERY_IMAGE_BYTES);
                if (!prepared) continue;
                const sourceKey = file.name + '|' + file.size;
                prepared._sourceKey = sourceKey;
                if (!galleryImageFiles.some(f => f._sourceKey === sourceKey || (f.name === prepared.name && f.size === prepared.size))) {
                    galleryImageFiles.push(prepared);
                    added++;
                }
            }
        } finally {
            galleryPreparing--;
            if (loadingOverlay && galleryPreparing <= 0) {
                loadingOverlay.style.display = 'none';
                if (loadingText) loadingText.textContent = '이미지 업로드 중...';
            }
        }
        if (added) galleryModalDirty = true;
        renderGalleryImagePreviews();
    }

    // 이미지 추가 버튼 + 드래그앤드롭
    const addImageBtn = document.getElementById('add-image-btn');
    const modalImageInput = document.getElementById('modal-image-input');
    const imagePreviewList = document.getElementById('image-preview-list');
    if (addImageBtn && modalImageInput) {
        addImageBtn.onclick = function(e) { e.stopPropagation(); modalImageInput.click(); };
        modalImageInput.addEventListener('change', function(e) {
            processImageFiles(e.target.files);
            e.target.value = '';
        });
    }
    const dropZone = document.getElementById('gallery-drop-zone');
    if (dropZone && modalImageInput) {
        dropZone.addEventListener('click', function(e) {
            if (e.target.id !== 'add-image-btn') modalImageInput.click();
        });
        dropZone.addEventListener('dragover', function(e) {
            e.preventDefault(); dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', function() {
            dropZone.classList.remove('drag-over');
        });
        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            processImageFiles(e.dataTransfer.files);
        });
    }
    // 모달 폼 입력 변경 시 dirty 표시 (공지/구인/갤러리 모두)
    if (modalForm) {
        modalForm.addEventListener('input', function() {
            galleryModalDirty = true;
            scheduleDraftSave();
        });
        modalForm.addEventListener('change', function(e) {
            if (e.target && e.target.id === 'modal-is-notice-checkbox') {
                galleryModalDirty = true;
                scheduleDraftSave();
            }
        });
    }

    function renderGalleryImagePreviews() {
        if (!imagePreviewList) return;
        imagePreviewList.innerHTML = '';
        // 이전 렌더링에서 만든 임시 URL 해제
        galleryPreviewObjectUrls.forEach(u => URL.revokeObjectURL(u));
        galleryPreviewObjectUrls = [];

        const counter = document.getElementById('gallery-img-counter');
        const countText = document.getElementById('gallery-img-count-text');
        if (counter) counter.style.display = galleryImageFiles.length > 0 ? 'flex' : 'none';
        if (countText) countText.textContent = galleryImageFiles.length + '장 추가됨';

        galleryImageFiles.forEach((file, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === galleryImageFiles.length - 1;
            if (file instanceof File) {
                // 동기적으로 미리보기 URL을 만들어 저장 순서와 화면 순서를 항상 일치시킴
                const objectUrl = URL.createObjectURL(file);
                galleryPreviewObjectUrls.push(objectUrl);
                addPreview(objectUrl, file, idx, isFirst, isLast);
            } else if (file.url) {
                addPreview(file.url, file, idx, isFirst, isLast);
            }
        });

        function addPreview(src, fileObj, idx, isFirst, isLast) {
            const div = document.createElement('div');
            div.className = 'gallery-preview-wrap';
            div.innerHTML = `
                <img src="${escapeHtml(src)}" class="gallery-preview-thumb" alt="미리보기">
                ${isFirst ? '<span class="gallery-preview-badge">대표</span>' : ''}
                <button type="button" class="gallery-preview-delete">&times;</button>
                <div class="gallery-preview-order">
                    <button type="button" class="gallery-order-btn gallery-order-up" ${isFirst ? 'disabled' : ''} title="앞으로">▲</button>
                    <button type="button" class="gallery-order-btn gallery-order-down" ${isLast ? 'disabled' : ''} title="뒤로">▼</button>
                </div>
            `;
            imagePreviewList.appendChild(div);

            div.querySelector('.gallery-preview-delete').onclick = function() {
                if (fileObj.url) galleryImageFiles = galleryImageFiles.filter(f => f.url !== fileObj.url);
                else if (fileObj.name && fileObj.size) galleryImageFiles = galleryImageFiles.filter(f => !(f.name === fileObj.name && f.size === fileObj.size));
                galleryModalDirty = true;
                renderGalleryImagePreviews();
            };
            if (!isFirst) {
                div.querySelector('.gallery-order-up').onclick = function() {
                    [galleryImageFiles[idx - 1], galleryImageFiles[idx]] = [galleryImageFiles[idx], galleryImageFiles[idx - 1]];
                    galleryModalDirty = true;
                    renderGalleryImagePreviews();
                };
            }
            if (!isLast) {
                div.querySelector('.gallery-order-down').onclick = function() {
                    [galleryImageFiles[idx], galleryImageFiles[idx + 1]] = [galleryImageFiles[idx + 1], galleryImageFiles[idx]];
                    galleryModalDirty = true;
                    renderGalleryImagePreviews();
                };
            }
        }
    }
    // 갤러리 글쓰기/수정 진입 시 기존 파일 초기화
    function resetGalleryImageFiles() {
        galleryImageFiles = [];
        renderGalleryImagePreviews();
    }
    // handleGalleryFormSubmit에서 galleryImageFiles만 업로드
    async function handleGalleryFormSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('modal-post-id').value;
        if (galleryPreparing > 0) {
            showToast('사진을 준비하는 중입니다. 잠시 후 다시 저장해 주세요.', 'warning');
            return;
        }
        // 신규 작성 시 이미지 필수 검증 (로딩 오버레이 전)
        if (galleryImageFiles.length === 0) {
            showToast('최소 1개의 이미지를 첨부해야 합니다.', 'warning');
            return;
        }
        const submitBtn = modalForm ? modalForm.querySelector('[type="submit"]') : null;
        const loadingOverlay = document.getElementById('gallery-loading-overlay');
        const loadingText = document.getElementById('gallery-loading-text');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '저장 중...'; }
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = '이미지 업로드 중...';
        }
        const newlyUploaded = []; // 이번 저장에서 새로 올린 파일 (저장 실패 시 정리)
        try {
            const title = document.getElementById('modal-title-input').value;
            const description = (typeof quill !== 'undefined' && quill) ? quill.root.innerHTML : document.getElementById('modal-content-input').value.replace(/\n/g, '<br>');
            let imageUrls = [];

            // 수정 시: 기존 파일 목록을 기억해두고, 저장 성공 후 빠진 파일만 삭제
            let oldFileUrls = [];
            if (id) {
                const { data: existingGallery, error: fetchError } = await window.supabaseClient
                    .from('gallery')
                    .select('description, image')
                    .eq('id', id)
                    .single();
                if (fetchError) {
                    console.error('기존 갤러리 조회 실패:', fetchError);
                } else if (existingGallery) {
                    oldFileUrls = extractStorageUrlsFromHtml(existingGallery.description)
                        .concat(normalizeGalleryImages(existingGallery.image));
                }
            }

            // 여러 파일 업로드 (화면에 보이는 순서 그대로)
            for (let file of galleryImageFiles) {
                if (file.url) {
                    // 이미 업로드된 public URL
                    if (!imageUrls.includes(file.url)) imageUrls.push(file.url);
                } else if (file instanceof File) {
                    // 원본(압축본) + 썸네일(thumbs/<이름>.jpg) 업로드
                    const fileName = sanitizeFileName(file.name);
                    const publicUrl = await uploadGalleryImageWithThumb(fileName, file);
                    if (publicUrl) {
                        newlyUploaded.push(publicUrl);
                        if (!imageUrls.includes(publicUrl)) imageUrls.push(publicUrl);
                    }
                }
            }
            // 이미지 첨부 예외 처리
            if (!imageUrls.length || !imageUrls[0]) {
                showToast('최소 1개의 이미지를 첨부해야 합니다.', 'warning');
                return;
            }
            if (loadingText) loadingText.textContent = '게시물 저장 중...';
            if (id) {
                const { error: updateError } = await window.supabaseClient
                    .from('gallery')
                    .update({ title, description, image: imageUrls })
                    .eq('id', id);
                if (updateError) throw updateError;
            } else {
                // id 필드를 절대 포함하지 않음
                const { error: insertError } = await window.supabaseClient
                    .from('gallery')
                    .insert([{ title, description, image: imageUrls }]);
                if (insertError) throw insertError;
            }

            // 저장 성공 후: 본문/첨부에서 빠진 기존 파일 정리 (실패해도 무시)
            if (oldFileUrls.length) {
                const newFileUrls = extractStorageUrlsFromHtml(description).concat(imageUrls);
                removeStorageUrls(diffRemovedUrls(oldFileUrls, newFileUrls));
            }

            showToast(id ? '갤러리가 수정되었습니다.' : '갤러리가 등록되었습니다.', 'success');
            closeModal(true);
            renderGalleryList();
            // 갤러리 탭 활성화 유지
            const tabs = document.querySelectorAll('.tab-link');
            const tabContents = document.querySelectorAll('.tab-content');
            tabs.forEach(t => t.classList.remove('active'));
            const galleryTab = document.querySelector('[data-tab="tab-gallery"]');
            if (galleryTab) galleryTab.classList.add('active');
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === 'tab-gallery');
            });
        } catch (error) {
            console.error('갤러리 저장 실패:', error);
            // 저장 실패: 이번에 올린 파일 정리, 모달과 작성 내용은 그대로 유지
            if (newlyUploaded.length) removeStorageUrls(newlyUploaded);
            const base = error && error.isUpload
                ? '이미지 업로드에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.'
                : SAVE_FAIL_MSG;
            showToast(failMsg(base, error), 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '저장하기'; }
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }
    // 갤러리 image 필드(배열/JSON 문자열/문자열)를 URL 배열로 정규화
    function normalizeGalleryImages(imageField) {
        let images = [];
        if (Array.isArray(imageField)) {
            images = imageField;
        } else if (typeof imageField === 'string') {
            try {
                const parsed = JSON.parse(imageField);
                images = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
                images = [imageField];
            }
        } else if (imageField) {
            images = [imageField];
        }
        return images.filter(img => typeof img === 'string' && img);
    }
    async function deleteGalleryItem(item) {
        showConfirm('"' + (item.title || '') + '" 갤러리 게시물을 삭제하시겠습니까?', async function() { return _deleteGalleryItemImpl(item); });
    }
    async function _deleteGalleryItemImpl(item) {
        try {
            // 1. 게시글 row 삭제 (성공해야 파일 정리)
            const { error } = await window.supabaseClient.from('gallery').delete().eq('id', item.id);
            if (error) throw error;

            // 2. 첨부 이미지(image 필드) + 본문 이미지/첨부파일 정리 (URL에서 버킷/경로 파싱)
            const fileUrls = normalizeGalleryImages(item.image).concat(extractStorageUrlsFromHtml(item.description));
            await removeStorageUrls(fileUrls);

            await renderGalleryList();
            showToast('갤러리 게시물이 삭제되었습니다.', 'success');
        } catch (error) {
            console.error('갤러리 삭제 실패:', error);
            showToast(failMsg('삭제에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', error), 'error');
        }
    }
    // 갤러리 검색
    (function() {
        var searchBtn = document.getElementById('gallery-search-btn');
        var searchInput = document.getElementById('gallery-search-input');
        var clearBtn = document.getElementById('gallery-search-clear-btn');
        function doFilter() {
            var q = searchInput ? searchInput.value.toLowerCase().trim() : '';
            displayGalleryList(q ? _allGalleryItems.filter(function(i) { return i.title && i.title.toLowerCase().includes(q); }) : _allGalleryItems);
        }
        if (searchBtn) searchBtn.addEventListener('click', doFilter);
        if (searchInput) searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doFilter(); });
        if (clearBtn) clearBtn.addEventListener('click', function() { if (searchInput) searchInput.value = ''; displayGalleryList(_allGalleryItems); });
    })();

    // 글쓰기 버튼 연결
    window.boardConfig.gallery.addBtn.addEventListener('click', showAddGalleryModal);
    
    // 구인 게시판 글쓰기 버튼 연결
    window.boardConfig.jobs.addBtn.addEventListener('click', showAddJobModal);
    
    // 모달 닫기(x) 버튼 이벤트 연결 - 전역 함수로 정의
    function closeModal(force) {
        const draftKey = currentDraftKey();
        // 공지/구인/갤러리 모달에 변경사항이 있으면 확인 요청 (저장 성공 시에는 force=true)
        if (force !== true && isPostModalDirty()) {
            if (!confirm('작성 중인 내용이 있습니다. 닫으시겠습니까?\n(닫으면 임시저장된 내용도 삭제됩니다)')) return;
            clearDraft(draftKey); // 사용자가 버리기로 확인함
        } else if (force === true) {
            clearDraft(draftKey); // 저장 성공
        }
        stopDraftAutosave();
        setDraftStatus('');
        if (modal) {
            const mc = modal.querySelector('.modal-content');
            if (mc) mc.classList.remove('editing-mode');
        }
        if (modalForm) {
            modalForm.reset();
        }
        // 갤러리 작성/수정 모달 닫을 때 이미지 미리보기도 초기화
        if (typeof resetGalleryImageFiles === 'function') {
            resetGalleryImageFiles();
        }
        galleryModalDirty = false;
        postModalSnapshot = null;
        if (typeof quill !== 'undefined' && quill) {
            quill.setContents([]);
            quill.root.innerHTML = '';
        }
        const noticeCheckbox = document.getElementById('modal-is-notice-checkbox');
        if (noticeCheckbox) noticeCheckbox.checked = false;
        modal.style.display = 'none';
    }
    
    // 닫기 버튼 이벤트 리스너 등록
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() { closeModal(false); });
    }
    const postModalCancelBtn = document.getElementById('post-modal-cancel');
    if (postModalCancelBtn) {
        postModalCancelBtn.addEventListener('click', function() { closeModal(false); });
    }
    
    // 전역 함수로 노출 (모달이 다시 열릴 때마다 재등록 가능하도록)
    window.closeModal = closeModal;
    // 모달 바깥 클릭 시 닫기
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal(false);
        }
    });
    // 모달 폼 제출 이벤트 연결 (깔끔하게 정리)
    if (modalForm) {
    modalForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const postType = document.getElementById('modal-post-type').value;
            console.log('모달 폼 제출:', postType);
            if (window._editorUploading) {
                showToast('파일 업로드가 끝난 뒤 저장해 주세요.', 'warning');
                return;
            }
            
            try {
                if (postType === 'jobs') {
            await handleJobFormSubmit(e);
                } else if (postType === 'notices') {
                    await handleNoticeFormSubmit(e);
                } else if (postType === 'gallery') {
            await handleGalleryFormSubmit(e);
                }
            } catch (error) {
                console.error('모달 폼 제출 오류:', error);
                showToast(failMsg(SAVE_FAIL_MSG, error), 'error');
        }
    });
    }

    // --- Data Management ---
    const clearDataBtn = document.getElementById('clear-local-storage-btn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => {
            if (confirm('정말로 모든 로컬 데이터를 삭제하고 초기화하시겠습니까?\n저장된 모든 변경사항이 사라집니다.')) {
                console.log('Clearing all local storage data...');
                
                const keysToRemove = [
                    'shindongtan_instructors',
                    'shindongtan_facilities',
                    'shindongtan_jobs',
                    'shindongtan_job_views',
                    'shindongtan_gallery',
                    'shindongtan_gallery_views',
                    'shindongtan_notices',
                    'shindongtan_notice_views',
                    'shindongtan_deleted_items' // 삭제된 ID 목록도 초기화
                ];
                
                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                    console.log(`Removed ${key}`);
                });
                
                alert('모든 로컬 데이터가 초기화되었습니다. 페이지를 새로고침합니다.');
                window.location.reload();
            }
        });
    }

    // ================= 팝업 관리 탭 =================

    const popupBucket = 'popup-images';
    const popupTable = 'popups';

    // 팝업 폼 완전 초기화 함수
    function resetPopupForm() {
        const popupForm = document.getElementById('popup-form');
        if (!popupForm) return;
        popupForm.reset();
        document.getElementById('popup-id').value = '';

        // 이미지 초기화
        const popupCurrentImageWrap = document.getElementById('popup-current-image-wrap');
        if (popupCurrentImageWrap) popupCurrentImageWrap.style.display = 'none';
        if (window.setPopupPreviewFromForm) window.setPopupPreviewFromForm('');

        // 크기/위치 초기화
        const posXEl = document.getElementById('popup-pos-x');
        const posYEl = document.getElementById('popup-pos-y');
        const widthEl = document.getElementById('popup-width');
        if (posXEl) { posXEl.value = '50'; document.getElementById('popup-pos-x-slider').value = '50'; document.getElementById('popup-pos-x-value').textContent = '50'; }
        if (posYEl) { posYEl.value = '50'; document.getElementById('popup-pos-y-slider').value = '50'; document.getElementById('popup-pos-y-value').textContent = '50'; }
        if (widthEl) { widthEl.value = '420'; document.getElementById('popup-width-slider').value = '420'; document.getElementById('popup-width-value').textContent = '420'; }
        if (window.updatePopupCardInPreview) window.updatePopupCardInPreview();

        // 빠른 날짜 설정 버튼들 초기화
        const quickDateBtns = document.querySelectorAll('.quick-date-btn');
        quickDateBtns.forEach(btn => btn.classList.remove('active'));
    }
    window.resetPopupFormForModal = resetPopupForm;

    // 탭 활성화 시 팝업 목록 불러오기
    function initPopupTab() {
        loadPopupList();
        resetPopupForm();
    }

    // 팝업 목록 불러오기
    async function loadPopupList() {
        const { data, error } = await window.supabaseClient
            .from(popupTable)
            .select('*')
            .order('id', { ascending: false });
        if (error) {
            document.getElementById('popup-list').innerHTML = '<div style="color:red">팝업 목록 불러오기 실패</div>';
            return;
        }
        renderPopupList(data);
    }

    // 팝업 목록 렌더링 (이벤트는 addEventListener로 연결, 텍스트/URL은 이스케이프)
    function renderPopupList(list) {
        const el = document.getElementById('popup-list');
        if (!list.length) {
            el.innerHTML = '<div class="empty-state"><i class="fas fa-window-restore"></i><p>등록된 팝업이 없습니다.</p></div>';
            return;
        }
        el.innerHTML = '';
        list.forEach(item => {
            const row = document.createElement('div');
            row.className = 'popup-list-item';
            row.innerHTML = `
                <img src="${escapeHtml(item.image_url || '')}" alt="팝업 이미지">
                <div class="popup-list-info">
                    <div class="popup-list-title">${item.title ? escapeHtml(item.title) : '(제목 없음)'}</div>
                    <div class="popup-list-date">📅 ${escapeHtml(item.start_date || '-')} ~ ${escapeHtml(item.end_date || '-')}</div>
                    <label class="popup-active-toggle" title="클릭하여 활성/비활성 전환">
                        <input type="checkbox" ${item.is_active ? 'checked' : ''}>
                        <span class="${item.is_active ? 'popup-list-status-on' : 'popup-list-status-off'}">${item.is_active ? '● 활성화' : '○ 비활성화'}</span>
                    </label>
                </div>
                <div class="popup-list-actions">
                    <button class="button-secondary">수정</button>
                    <span class="action-sep" aria-hidden="true"></span>
                    <button class="button-danger btn-delete">삭제</button>
                </div>`;
            const checkbox = row.querySelector('.popup-active-toggle input');
            checkbox.addEventListener('change', () => togglePopupActive(item.id, checkbox.checked, checkbox));
            row.querySelector('.button-secondary').addEventListener('click', () => window.editPopup(item.id));
            row.querySelector('.button-danger').addEventListener('click', () => window.deletePopup(item.id, item.image_url, item.title));
            el.appendChild(row);
        });
    }

    // 팝업 활성/비활성 토글
    async function togglePopupActive(id, isActive, checkbox) {
        const label = checkbox ? checkbox.closest('label') : null;
        const span = label ? label.querySelector('span') : null;
        function setLabel(active) {
            if (span) {
                span.className = active ? 'popup-list-status-on' : 'popup-list-status-off';
                span.textContent = active ? '● 활성화' : '○ 비활성화';
            }
        }
        try {
            const { error } = await window.supabaseClient.from(popupTable).update({ is_active: isActive }).eq('id', id);
            if (error) throw error;
            setLabel(isActive);
            showToast(isActive ? '팝업이 활성화되었습니다.' : '팝업이 비활성화되었습니다.', 'success');
        } catch(e) {
            // 실패 시 원래 상태로 되돌림
            if (checkbox) checkbox.checked = !isActive;
            setLabel(!isActive);
            showToast(failMsg('상태 변경에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', e), 'error');
        }
    }
    window.togglePopupActive = togglePopupActive;

    // 팝업 추가/수정 폼 제출
    const popupForm = document.getElementById('popup-form');
    popupForm && popupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('popup-id').value;
        const fileInput = document.getElementById('popup-image');
        let newFile = (fileInput && fileInput.files && fileInput.files[0]) ? fileInput.files[0] : null;
        // 이미지 필수 검증 (로딩 오버레이 전)
        // 미리보기 영역이 보이면 이미지(기존 또는 새 파일)가 있는 것, 제거 버튼을 누르면 숨겨짐
        const currentWrap = document.getElementById('popup-current-image-wrap');
        const hasCurrentImage = !!(currentWrap && currentWrap.style.display !== 'none');
        if (!newFile && !hasCurrentImage) {
            showToast(id ? '팝업 이미지를 제거했습니다. 새 이미지를 추가해야 저장할 수 있습니다.' : '팝업 이미지를 추가해주세요.', 'warning');
            return;
        }
        const loadingOverlay = document.getElementById('popup-loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        // 큰 사진은 자동으로 줄이고, 줄인 뒤 크기를 확인
        if (newFile) {
            newFile = await prepareImageForUpload(newFile, MAX_POPUP_IMAGE_BYTES);
            if (!newFile) {
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                return;
            }
        }
        let image_url = null;
        try {
        const title = document.getElementById('popup-title').value;
        const link = document.getElementById('popup-link').value;
        const start_date = document.getElementById('popup-start-date').value || null;
        const end_date = document.getElementById('popup-end-date').value || null;
        const is_active = document.getElementById('popup-active').checked;
        const position_x = parseInt(document.getElementById('popup-pos-x').value) || 50;
        const position_y = parseInt(document.getElementById('popup-pos-y').value) || 50;
        const width = parseInt(document.getElementById('popup-width').value) || null;

        // 이미지 교체 시 기존 이미지 URL 기억 (저장 성공 후 삭제)
        let oldImageUrl = null;
        if (id && newFile) {
            try {
                const { data: oldRow } = await window.supabaseClient.from(popupTable).select('image_url').eq('id', id).single();
                oldImageUrl = oldRow ? oldRow.image_url : null;
            } catch (e) { /* 조회 실패는 무시 */ }
        }

        // 이미지 업로드
        if (newFile) {
            const fileName = sanitizeFileName(newFile.name);
            const { error } = await window.supabaseClient.storage.from(popupBucket).upload(fileName, newFile, { upsert: true });
            if (error) {
                showToast(failMsg('이미지 업로드에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', error), 'error');
                return;
            }
            image_url = `${window.supabaseClient.storage.from(popupBucket).getPublicUrl(fileName).data.publicUrl}`;
            }

            const popupData = {
                title,
                link,
                start_date,
                end_date,
                is_active,
                position_x,
                position_y,
                ...(width && { width }),
                ...(image_url && { image_url })
            };

        if (id) {
                const { error: updateError } = await window.supabaseClient
                    .from('popups')
                    .update(popupData)
                    .eq('id', id);
                if (updateError) throw updateError;
        } else {
                const { error: insertError } = await window.supabaseClient
                    .from('popups')
                    .insert([popupData]);
                if (insertError) throw insertError;
            }

            // 저장 성공 후 교체된 기존 이미지 정리 (실패해도 무시)
            if (image_url && oldImageUrl && oldImageUrl !== image_url) removeStorageUrls([oldImageUrl]);

            await loadPopupList();
            if (window.closePopupModalFn) window.closePopupModalFn(true);
            showToast('팝업이 저장되었습니다.', 'success');
        } catch (error) {
            // 저장 실패: 방금 올린 이미지 정리, 모달과 입력 내용은 유지
            if (image_url) removeStorageUrls([image_url]);
            showToast(failMsg(SAVE_FAIL_MSG, error), 'error');
            console.error('팝업 저장 오류:', error);
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    });

    // 팝업 수정 버튼
    window.editPopup = async function(id) {
        const { data, error } = await window.supabaseClient.from(popupTable).select('*').eq('id', id).single();
        if (error || !data) return showToast('팝업 정보를 불러올 수 없습니다.', 'error');
        document.getElementById('popup-id').value = data.id;
        document.getElementById('popup-title').value = data.title || '';
        document.getElementById('popup-link').value = data.link || '';
        document.getElementById('popup-start-date').value = data.start_date || '';
        document.getElementById('popup-end-date').value = data.end_date || '';
        const isActive = (data.is_active === true || data.is_active === 1 || data.is_active === 'true' || data.is_active === 'Y');
        document.getElementById('popup-active').checked = isActive;

        // 위치/크기 복원
        const px = data.position_x != null ? data.position_x : 50;
        const py = data.position_y != null ? data.position_y : 50;
        const pw = data.width || 420;
        document.getElementById('popup-pos-x').value = px;
        document.getElementById('popup-pos-x-slider').value = px;
        document.getElementById('popup-pos-x-value').textContent = px;
        document.getElementById('popup-pos-y').value = py;
        document.getElementById('popup-pos-y-slider').value = py;
        document.getElementById('popup-pos-y-value').textContent = py;
        document.getElementById('popup-width').value = pw;
        document.getElementById('popup-width-slider').value = pw;
        document.getElementById('popup-width-value').textContent = pw;
        if (window.updatePopupCardInPreview) window.updatePopupCardInPreview();

        if (window.setPopupPreviewFromForm) window.setPopupPreviewFromForm(data.image_url);
        // 날짜 버튼 초기화
        document.querySelectorAll('.quick-date-btn').forEach(btn => btn.classList.remove('active'));
        // 모달 열기
        if (window.showPopupModalFn) window.showPopupModalFn(false);
    };

    // 팝업 삭제 버튼
    window.deletePopup = function(id, imageUrl, title) {
        const name = title ? '"' + title + '" 팝업을' : '제목 없는 팝업을';
        showConfirm(name + ' 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.', async function() {
            try {
                const { error } = await window.supabaseClient.from(popupTable).delete().eq('id', id);
                if (error) throw error;
                // DB 삭제 성공 후 이미지 파일 정리
                if (imageUrl) await removeStorageUrls([imageUrl]);
                showToast('팝업이 삭제되었습니다.', 'success');
                loadPopupList();
            } catch (error) {
                showToast(failMsg('삭제에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', error), 'error');
            }
        });
    };

    // 팝업 취소 버튼 (모달 방식으로 변경됨 - 레거시 코드 유지)
    const popupCancelBtn = document.getElementById('popup-cancel');
    if (popupCancelBtn) popupCancelBtn.addEventListener('click', function() {
        if (window.closePopupModalFn) window.closePopupModalFn(false);
    });

    // 탭 전환 시 팝업 관리 탭이면 목록 로드
    const tabLinks = document.querySelectorAll('.tab-link');
    tabLinks.forEach(btn => {
        btn.addEventListener('click', function() {
            if (btn.dataset.tab === 'tab-popups') {
                initPopupTab();
            }
        });
    });

    // 이미지 미리보기는 admin.html 인라인 스크립트에서 처리

    // --- Jobs Management (Supabase 연동) ---
    let _allJobItems = [];
    async function loadJobList() {
        const { data, error } = await window.supabaseClient
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            window.boardConfig.jobs.listEl.innerHTML = '<tr><td colspan="8">구인 목록을 불러오지 못했습니다.</td></tr>';
            return [];
        }
        return data;
    }
    async function renderJobList() {
        _allJobItems = await loadJobList();
        _allJobItems.sort((a, b) => {
            if ((b.isnotice ? 1 : 0) !== (a.isnotice ? 1 : 0)) return (b.isnotice ? 1 : 0) - (a.isnotice ? 1 : 0);
            return (b.created_at || '').localeCompare(a.created_at || '');
        });
        const searchInput = document.getElementById('job-search-input');
        if (searchInput) searchInput.value = '';
        displayJobList(_allJobItems);
    }
    function displayJobList(items) {
        const listEl = window.boardConfig.jobs.listEl;
        listEl.innerHTML = '';
        if (!items.length) {
            listEl.innerHTML = '<div class="empty-state"><i class="fas fa-briefcase"></i>게시물이 없습니다.</div>';
            return;
        }
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'post-card-item';
            div.innerHTML = `
                <div class="post-card-main">
                    ${item.isnotice ? '<span class="post-notice-badge">📢 중요</span>' : ''}
                    <div class="post-card-title">${escapeHtml(item.title)}</div>
                    <div class="post-card-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${formatKoreaDate(item.created_at)}</span>
                        <span><i class="fas fa-eye"></i> ${item.views || 0}</span>
                    </div>
                </div>
                <div class="post-card-actions">
                    ${postViewLinkHtml('community_jobs_detail.html', item.id)}
                    <button class="button-secondary">수정</button>
                    <span class="action-sep" aria-hidden="true"></span>
                    <button class="button-danger btn-delete">삭제</button>
                </div>`;
            div.querySelector('.button-secondary').addEventListener('click', () => showEditJobModal(item));
            div.querySelector('.button-danger').addEventListener('click', () => deleteJobItem(item));
            listEl.appendChild(div);
        });
    }
    // 구인 검색 + 정렬
    (function() {
        var searchBtn = document.getElementById('job-search-btn');
        var searchInput = document.getElementById('job-search-input');
        var sortSelect = document.getElementById('job-sort-order');
        var clearBtn = document.getElementById('job-search-clear-btn');
        function getSorted(items) {
            var order = sortSelect ? sortSelect.value : 'created_at_desc';
            var sorted = items.slice();
            if (order === 'created_at_asc') {
                sorted.sort(function(a, b) { return (a.created_at || '').localeCompare(b.created_at || ''); });
            } else if (order === 'title_asc') {
                sorted.sort(function(a, b) { return (a.title || '').localeCompare(b.title || '', 'ko'); });
            } else {
                sorted.sort(function(a, b) {
                    if ((b.isnotice ? 1 : 0) !== (a.isnotice ? 1 : 0)) return (b.isnotice ? 1 : 0) - (a.isnotice ? 1 : 0);
                    return (b.created_at || '').localeCompare(a.created_at || '');
                });
            }
            return sorted;
        }
        function doFilter() {
            var q = searchInput ? searchInput.value.toLowerCase().trim() : '';
            var filtered = q ? _allJobItems.filter(function(i) { return i.title && i.title.toLowerCase().includes(q); }) : _allJobItems;
            displayJobList(getSorted(filtered));
        }
        if (searchBtn) searchBtn.addEventListener('click', doFilter);
        if (searchInput) searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doFilter(); });
        if (sortSelect) sortSelect.addEventListener('change', doFilter);
        if (clearBtn) clearBtn.addEventListener('click', function() {
            if (searchInput) searchInput.value = '';
            if (sortSelect) sortSelect.value = 'created_at_desc';
            displayJobList(getSorted(_allJobItems));
        });
    })();
    async function handleJobFormSubmit(e) {
        console.log('handleJobFormSubmit 함수 호출됨');
        e.preventDefault();
        const id = document.getElementById('modal-post-id').value;
        const title = document.getElementById('modal-title-input').value.trim();
        const description = typeof quill !== 'undefined' && quill ? quill.root.innerHTML : document.getElementById('modal-content-input').value;
        const isnotice = document.getElementById('modal-is-notice-checkbox')?.checked || false;

        // 본문 빈 값 검사
        const descText = typeof quill !== 'undefined' && quill ? quill.getText().trim() : description.replace(/<[^>]*>/g, '').trim();
        if (!descText) {
            showToast('본문 내용을 입력해주세요.', 'warning');
            return;
        }

        const submitBtn = modalForm ? modalForm.querySelector('[type="submit"]') : null;
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '저장 중...'; }

        // 로딩 오버레이 표시
        const loadingOverlay = document.getElementById('jobs-loading-overlay');
        const loadingText = document.getElementById('jobs-loading-text');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = '구인 게시물을 저장하는 중입니다...';
        }
        
        try {
            console.log('구인 게시글 저장 시작');
            let oldFileUrls = [];
            if (id) {
                // 수정 시: 기존 본문 파일 목록 기억 (저장 성공 후 빠진 파일만 삭제)
                const { data: existingJob, error: fetchError } = await window.supabaseClient
                    .from('jobs').select('description').eq('id', id).single();
                if (fetchError) console.error('기존 구인 게시물 조회 실패:', fetchError);
                else if (existingJob) oldFileUrls = extractStorageUrlsFromHtml(existingJob.description);

                const { error: updateError } = await window.supabaseClient
                    .from('jobs')
                    .update({ title, description, isnotice })
                    .eq('id', id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await window.supabaseClient
                    .from('jobs')
                    .insert([{ title, description, isnotice }]);
                if (insertError) throw insertError;
            }
            if (oldFileUrls.length) removeStorageUrls(diffRemovedUrls(oldFileUrls, extractStorageUrlsFromHtml(description)));
            showToast(id ? '구인 게시물이 수정되었습니다.' : '구인 게시물이 등록되었습니다.', 'success');
            closeModal(true);
            renderJobList();
            // 구인 게시판 탭 활성화 유지
            const tabs = document.querySelectorAll('.tab-link');
            const tabContents = document.querySelectorAll('.tab-content');
            tabs.forEach(t => t.classList.remove('active'));
            const jobTab = document.querySelector('[data-tab="tab-jobs"]');
            if (jobTab) {
                jobTab.classList.add('active');
            }
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === 'tab-jobs');
            });
        } catch (error) {
            console.error('구인 게시물 저장 실패:', error);
            // 저장 실패: 모달과 작성 내용은 그대로 유지
            showToast(failMsg(SAVE_FAIL_MSG, error), 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '저장하기'; }
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }
    async function deleteJobItem(item) {
        showConfirm('"' + (item.title || '') + '" 구인 게시물을 삭제하시겠습니까?', async function() { return _deleteJobItemImpl(item); });
    }
    async function _deleteJobItemImpl(item) {
        try {
            // 1. 게시글 row 삭제 (성공해야 파일 정리)
            const { error } = await window.supabaseClient.from('jobs').delete().eq('id', item.id);
            if (error) throw error;
            // 2. 본문 이미지/첨부파일 정리 (URL에서 버킷/경로 파싱 → notice-*, job-* 어느 버킷이든 처리)
            await removeStorageUrls(extractStorageUrlsFromHtml(item.description));
            await renderJobList();
            showToast('구인 게시물이 삭제되었습니다.', 'success');
        } catch (error) {
            console.error('구인 게시물 삭제 실패:', error);
            showToast(failMsg('삭제에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', error), 'error');
        }
    }
    
    // showAddJobModal: 구인 게시판 추가 모달 표시 (공지사항과 동일한 구조로 단순화)
    function showAddJobModal() {
        // 모달 초기화
        modalForm.reset();
        document.getElementById('modal-post-id').value = '';
        document.getElementById('modal-post-type').value = 'jobs';
        modalTitle.textContent = '새 구인 게시물 작성';
        modal.querySelector('.modal-content').classList.remove('editing-mode');
        modalImageGroup.style.display = 'none';
        modalNoticeGroup.style.display = 'block';
        document.getElementById('modal-title-input').value = '';
        document.getElementById('modal-content-input').value = '';
        document.getElementById('modal-is-notice-checkbox').checked = false;
        
        // Quill 에디터 초기화
        initializeQuillEditor();

        // 모달 표시
        initPostPreviewTabs(false);
        modal.style.display = 'flex';
        capturePostModalSnapshot();
        maybeRestoreDraft();
    }

    // showEditJobModal: 구인 게시판 수정 모달 표시
    async function showEditJobModal(item) {
        // 모달 초기화
        modalForm.reset();
        document.getElementById('modal-post-id').value = String(item.id);
        document.getElementById('modal-post-type').value = 'jobs';
        modalTitle.textContent = '"' + item.title + '" 수정 중';
        modal.querySelector('.modal-content').classList.add('editing-mode');
        modalImageGroup.style.display = 'none';
        modalNoticeGroup.style.display = 'block';
        document.getElementById('modal-title-input').value = item.title || '';
        document.getElementById('modal-is-notice-checkbox').checked = !!item.isnotice;
        
        // Quill 에디터 초기화 및 내용 설정
        initializeQuillEditor();
        // <br>을 \n으로 바꾸면 HTML에서 줄바꿈이 사라지므로 그대로 사용 (예전 형식만 <p>로 변환)
        const content = prepareHtmlForEditor(item.description || item.content || '');
        document.getElementById('modal-content-input').value = content;
        if (quill) {
            quill.root.innerHTML = content;
        }

        // 모달 표시
        initPostPreviewTabs(false);
        modal.style.display = 'flex';
        capturePostModalSnapshot();
        maybeRestoreDraft();
    }
    // --- Notices Management (Supabase 연동) ---
    async function loadNoticeList() {
        const { data, error } = await window.supabaseClient
            .from('notices')
            .select('*') // content 필드 포함
            .order('created_at', { ascending: false });
        if (error) {
            window.boardConfig.notices.listEl.innerHTML = '<tr><td colspan="7">공지사항 목록을 불러오지 못했습니다.</td></tr>';
            return [];
        }
        return data;
    }
    async function renderNoticeList(searchTerm = '', searchType = 'title', sortOrder = 'created_at_desc') {
        let items = await loadNoticeList();
        // 검색 필터
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            items = items.filter(item => {
                const title = (item.title || '').toLowerCase();
                const content = (item.content || '').toLowerCase();
                if (searchType === 'title') return title.includes(term);
                if (searchType === 'content') return content.includes(term);
                if (searchType === 'title_content') return title.includes(term) || content.includes(term);
                return true;
            });
        }
        // 정렬
        items.sort((a, b) => {
            if ((b.isnotice ? 1 : 0) !== (a.isnotice ? 1 : 0)) {
                return (b.isnotice ? 1 : 0) - (a.isnotice ? 1 : 0);
            }
            return (b.date || b.created_at || '').localeCompare(a.date || a.created_at || '');
        });
        const listEl = window.boardConfig.notices.listEl;
        listEl.innerHTML = '';
        if (!items.length) {
            listEl.innerHTML = '<div class="empty-state"><i class="fas fa-bullhorn"></i>공지사항이 없습니다.</div>';
            return;
        }
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'post-card-item';
            div.innerHTML = `
                <div class="post-card-main">
                    ${item.isnotice ? '<span class="post-notice-badge">📢 중요</span>' : ''}
                    <div class="post-card-title">${escapeHtml(item.title)}</div>
                    <div class="post-card-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${formatKoreaDate(item.date || item.created_at)}</span>
                        <span><i class="fas fa-eye"></i> ${item.views || 0}</span>
                    </div>
                </div>
                <div class="post-card-actions">
                    ${postViewLinkHtml('community_notice_detail.html', item.id)}
                    <button class="button-secondary">수정</button>
                    <span class="action-sep" aria-hidden="true"></span>
                    <button class="button-danger btn-delete">삭제</button>
                </div>`;
            div.querySelector('.button-secondary').addEventListener('click', () => showEditNoticeModal(item));
            div.querySelector('.button-danger').addEventListener('click', () => deleteNoticeItem(item));
            listEl.appendChild(div);
        });
    }
    function setupNoticeSearchSortUI() {
        // 테이블 thead에 필터 행 추가 코드 제거
        // 대신 notice-filter-bar의 각 요소에 이벤트 연결
        const searchBtn = document.getElementById('notice-search-btn');
        const searchInput = document.getElementById('notice-search-input');
        const searchTypeSelect = document.getElementById('notice-search-type');
        const sortOrderSelect = document.getElementById('notice-sort-order');
        const clearBtn = document.getElementById('notice-search-clear-btn');
        if (!searchBtn || !searchInput || !searchTypeSelect || !sortOrderSelect) return;
        function doSearch() {
            const type = searchTypeSelect.value;
            const term = searchInput.value;
            const order = sortOrderSelect.value;
            renderNoticeList(term, type, order);
        }
        searchBtn.onclick = doSearch;
        searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') doSearch(); });
        sortOrderSelect.onchange = doSearch;
        if (clearBtn) {
            clearBtn.onclick = () => {
                searchInput.value = '';
                searchTypeSelect.value = 'title';
                sortOrderSelect.value = 'created_at_desc';
                renderNoticeList();
            };
        }
    }
    // 페이지 로드시 UI 세팅 (목록은 로그인 후 initializeAdminPanel()에서 한 번만 불러옴)
    setupNoticeSearchSortUI();
    // Quill 에디터 인스턴스 전역 선언
    let quill = null;
    
    // 공통 Quill 에디터 초기화 함수
    function initializeQuillEditor() {
        // 기존 Quill 에디터 정리
        const oldEditor = document.getElementById('quill-editor');
        if (oldEditor) {
            // 기존 툴바 제거
            let prev = oldEditor.previousSibling;
            while (prev) {
                if (prev.classList && prev.classList.contains('ql-toolbar')) {
                    prev.parentNode.removeChild(prev);
                    break;
                }
                prev = prev.previousSibling;
            }
            // 기존 에디터 제거
            const parent = oldEditor.parentNode;
            parent.removeChild(oldEditor);
            
            // 새 에디터 생성
            const newEditor = document.createElement('div');
            newEditor.id = 'quill-editor';
            newEditor.style.height = '400px';
            parent.appendChild(newEditor);
        }
        
        // 첨부파일 기능 포함 에디터 초기화
        if (window.initializeQuillEditorWithNoticeAttachment) {
            quill = window.initializeQuillEditorWithNoticeAttachment();
        }
        
        if (quill) {
            quill.root.innerHTML = '';
            // 사용자가 직접 편집한 경우 모든 게시물 유형(공지/구인/갤러리)에서 변경 표시
            quill.on('text-change', function(delta, oldDelta, source) {
                if (source === 'user') {
                    galleryModalDirty = true;
                    scheduleDraftSave();
                }
            });
        }

        return quill;
    }
    function showAddNoticeModal() {
        // 모달 초기화
        modalForm.reset();
        document.getElementById('modal-post-id').value = '';
        document.getElementById('modal-post-type').value = 'notices';
        modalTitle.textContent = '새 공지사항 작성';
        modal.querySelector('.modal-content').classList.remove('editing-mode');
        modalImageGroup.style.display = 'none';
        modalNoticeGroup.style.display = 'block';
        document.getElementById('modal-title-input').value = '';
        document.getElementById('modal-content-input').value = '';
        document.getElementById('modal-is-notice-checkbox').checked = false;
        
        // Quill 에디터 초기화
        initializeQuillEditor();

        // 모달 표시
        initPostPreviewTabs(true);
        modal.style.display = 'flex';
        capturePostModalSnapshot();
        maybeRestoreDraft();
    }
    // 글쓰기 버튼 이벤트 리스너 연결 (함수 선언 이후에 위치)
    if (window.boardConfig.notices.addBtn) {
        window.boardConfig.notices.addBtn.addEventListener('click', showAddNoticeModal);
    }
    // 공지사항 작성/수정 폼 submit 이벤트 연결 (Quill Editor 이후에 위치)
    // 중복 연결 방지: 반드시 최초 1회만 실행
    // 이 부분을 제거 - 이미 위에서 통합된 이벤트 리스너가 있음
    // if (modalForm && !modalForm._noticeSubmitBound) {
    //     modalForm.addEventListener('submit', handleNoticeFormSubmit);
    //     modalForm._noticeSubmitBound = true;
    // }
    async function showEditNoticeModal(item) {
        // 모달 초기화
        modalForm.reset();
        document.getElementById('modal-post-id').value = String(item.id);
        document.getElementById('modal-post-type').value = 'notices';
        modalTitle.textContent = '"' + item.title + '" 수정 중';
        modal.querySelector('.modal-content').classList.add('editing-mode');
        modalImageGroup.style.display = 'none';
        modalNoticeGroup.style.display = 'block';
        document.getElementById('modal-title-input').value = item.title || '';
        document.getElementById('modal-is-notice-checkbox').checked = !!item.isnotice;
        
        // Quill 에디터 초기화 및 내용 설정
        initializeQuillEditor();
        // <br>을 \n으로 바꾸면 HTML에서 줄바꿈이 사라지므로 그대로 사용 (예전 형식만 <p>로 변환)
        const content = prepareHtmlForEditor(item.content || '');
        document.getElementById('modal-content-input').value = content;
        if (quill) {
            quill.root.innerHTML = content;
        }

        // 모달 표시
        initPostPreviewTabs(true);
        modal.style.display = 'flex';
        capturePostModalSnapshot();
        maybeRestoreDraft();
    }
    // 공지사항 저장 시 Quill Editor 내용 동기화
    async function handleNoticeFormSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('modal-post-id').value;
        const title = document.getElementById('modal-title-input').value.trim();
        const content = quill ? quill.root.innerHTML : document.getElementById('modal-content-input').value;
        const isnotice = document.getElementById('modal-is-notice-checkbox')?.checked || false;

        // 본문 빈 값 검사
        const contentText = quill ? quill.getText().trim() : content.replace(/<[^>]*>/g, '').trim();
        if (!contentText) {
            showToast('본문 내용을 입력해주세요.', 'warning');
            return;
        }

        const submitBtn = modalForm ? modalForm.querySelector('[type="submit"]') : null;
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '저장 중...'; }

        // 로딩 오버레이 표시
        const loadingOverlay = document.getElementById('notice-loading-overlay');
        const loadingText = document.getElementById('notice-loading-text');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = '공지사항을 저장하는 중입니다...';
        }
        
        try {
            let oldFileUrls = [];
            if (id) {
                // 수정 시: 기존 본문 파일 목록 기억 (저장 성공 후 빠진 파일만 삭제)
                const { data: existingNotice, error: fetchError } = await window.supabaseClient
                    .from('notices')
                    .select('content')
                    .eq('id', id)
                    .single();
                if (fetchError) console.error('기존 공지사항 조회 실패:', fetchError);
                else if (existingNotice) oldFileUrls = extractStorageUrlsFromHtml(existingNotice.content);

                // 공지사항 업데이트
                const { error: updateError } = await window.supabaseClient
                    .from('notices')
                    .update({ title, content, isnotice })
                    .eq('id', id);
                if (updateError) throw updateError;
            } else {
                // 새 공지사항 등록
                const { error: insertError } = await window.supabaseClient
                    .from('notices')
                    .insert([{ title, content, isnotice }]);
                if (insertError) throw insertError;
            }
            // 저장 성공 후 본문에서 빠진 기존 이미지/첨부파일 정리 (실패해도 무시)
            if (oldFileUrls.length) removeStorageUrls(diffRemovedUrls(oldFileUrls, extractStorageUrlsFromHtml(content)));
            showToast(id ? '공지사항이 수정되었습니다.' : '공지사항이 등록되었습니다.', 'success');

            closeModal(true);
            renderNoticeList();
            // 공지사항 탭 활성화 유지
            const tabs = document.querySelectorAll('.tab-link');
            const tabContents = document.querySelectorAll('.tab-content');
            tabs.forEach(t => t.classList.remove('active'));
            const noticeTab = document.querySelector('[data-tab="tab-notice"]');
            if (noticeTab) {
                noticeTab.classList.add('active');
            }
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === 'tab-notice');
            });
        } catch (error) {
            console.error('공지사항 저장 실패:', error);
            // 저장 실패: 모달과 작성 내용은 그대로 유지
            showToast(failMsg(SAVE_FAIL_MSG, error), 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '저장하기'; }
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }
    async function deleteNoticeItem(item) {
        showConfirm('"' + (item.title || '') + '" 공지사항을 삭제하시겠습니까?', async function() { return _deleteNoticeItemImpl(item); });
    }
    async function _deleteNoticeItemImpl(item) {
        try {
            // 1. 게시글 row 삭제 (성공해야 파일 정리)
            const { error } = await window.supabaseClient.from('notices').delete().eq('id', item.id);
            if (error) throw error;
            // 2. 본문 이미지/첨부파일 정리 (URL에서 버킷/경로 파싱)
            await removeStorageUrls(extractStorageUrlsFromHtml(item.content));
            await renderNoticeList();
            showToast('공지사항이 삭제되었습니다.', 'success');
        } catch (error) {
            console.error('공지사항 삭제 중 오류:', error);
            showToast(failMsg('삭제에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', error), 'error');
        }
    }

    // --- FAQ Management ---
    const faqForm = document.getElementById('faq-form');
    const faqList = document.getElementById('faq-list');
    const cancelFaqEditBtn = document.getElementById('cancel-faq-edit');
    let _allFaqItems = [];

    // FAQ 작성/수정 모달
    const faqModal = document.getElementById('faq-modal');
    const addFaqBtn = document.getElementById('add-faq-btn');
    const faqModalCloseBtn = document.getElementById('faq-modal-close');
    let faqModalDirty = false;

    function openFaqModal() {
        if (faqModal) faqModal.style.display = 'flex';
    }
    function closeFaqModal(force) {
        if (!force && faqModalDirty && !confirm('작성 중인 내용이 있습니다. 닫으시겠습니까?')) return;
        if (faqModal) faqModal.style.display = 'none';
        faqModalDirty = false;
    }
    if (addFaqBtn) {
        addFaqBtn.addEventListener('click', () => {
            cancelFaqEditBtn.click();
            openFaqModal();
        });
    }
    if (faqModalCloseBtn) {
        faqModalCloseBtn.addEventListener('click', () => closeFaqModal(false));
    }
    const faqModalCancelBtn = document.getElementById('faq-modal-cancel');
    if (faqModalCancelBtn) {
        faqModalCancelBtn.addEventListener('click', () => closeFaqModal(false));
    }
    if (faqModal) {
        faqModal.addEventListener('click', (e) => {
            if (e.target === faqModal) closeFaqModal(false);
        });
    }
    if (faqForm) {
        faqForm.addEventListener('input', () => { faqModalDirty = true; });
        faqForm.addEventListener('change', () => { faqModalDirty = true; });
    }

    // FAQ 목록 불러오기
    async function loadFAQList() {
        try {
            const { data, error } = await window.supabaseClient
                .from('qa')
                .select('*')
                .order('order', { ascending: true });

            if (error) {
                console.error('FAQ 목록 로드 실패:', error);
                return;
            }

            _allFaqItems = data;
            const searchInput = document.getElementById('faq-search-input');
            if (searchInput) searchInput.value = '';
            renderFAQList(_allFaqItems);
        } catch (error) {
            console.error('FAQ 목록 로드 중 오류:', error);
        }
    }

    // FAQ 목록 렌더링
    function renderFAQList(faqs) {
        if (!faqList) return;

        faqList.innerHTML = '';

        if (faqs.length === 0) {
            faqList.innerHTML = '<div class="empty-state"><i class="fas fa-question-circle"></i><p>등록된 FAQ가 없습니다.</p></div>';
            return;
        }

        faqs.forEach((faq) => {
            const trueIdx = _allFaqItems.findIndex(f => f.id === faq.id);
            const faqItem = document.createElement('div');
            faqItem.className = 'faq-admin-item';
            faqItem.innerHTML = `
                <span class="faq-order-badge">#${trueIdx + 1}</span>
                <div class="faq-question">${escapeHtml(faq.question)}</div>
                <div class="faq-answer">${escapeHtml(faq.answer)}</div>
                <div class="faq-meta">작성일: ${formatKoreaDate(faq.created_at)}</div>
                <div class="faq-actions">
                    <button class="button-secondary" onclick="editFAQ(${faq.id})">수정</button>
                    <button class="move-up button-secondary" title="위로" onclick="moveFAQ(${faq.id}, -1)" ${trueIdx <= 0 ? 'disabled' : ''}>▲</button>
                    <button class="move-down button-secondary" title="아래로" onclick="moveFAQ(${faq.id}, 1)" ${trueIdx === -1 || trueIdx === _allFaqItems.length - 1 ? 'disabled' : ''}>▼</button>
                    <button class="button-danger btn-delete" onclick="deleteFAQ(${faq.id})">삭제</button>
                </div>
            `;
            faqList.appendChild(faqItem);
        });
    }

    // FAQ 순서 변경 (▲▼)
    window.moveFAQ = async function(id, direction) {
        const idx = _allFaqItems.findIndex(f => f.id === id);
        if (idx === -1) return;
        const swapIdx = idx + direction;
        if (swapIdx < 0 || swapIdx >= _allFaqItems.length) return;
        const curr = _allFaqItems[idx];
        const target = _allFaqItems[swapIdx];
        try {
            await swapOrder('qa', curr, target);
            await loadFAQList();
        } catch (error) {
            showToast(failMsg('순서 변경에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', error), 'error');
            loadFAQList();
            console.error('FAQ 순서 변경 오류:', error);
        }
    };

    // FAQ 추가/수정 폼 제출
    faqForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('faq-id').value;
        const question = document.getElementById('faq-question').value.trim();
        const answer = document.getElementById('faq-answer').value.trim();

        if (!question) { showToast('질문을 입력해주세요.', 'warning'); return; }
        if (!answer) { showToast('답변을 입력해주세요.', 'warning'); return; }

        const submitBtn = faqForm.querySelector('button[type="submit"]');
        const loadingText = document.getElementById('faq-loading-text');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '저장 중...'; }
        if (loadingText) loadingText.style.display = 'inline';

        try {
            if (id) {
                const { error: updateError } = await window.supabaseClient
                    .from('qa')
                    .update({ question, answer })
                    .eq('id', id);
                if (updateError) throw updateError;
            } else {
                const { data: maxOrderData } = await window.supabaseClient
                    .from('qa')
                    .select('order')
                    .order('order', { ascending: false })
                    .limit(1)
                    .single();
                const nextOrder = maxOrderData ? (maxOrderData.order + 1) : 1;
                const { error: insertError } = await window.supabaseClient
                    .from('qa')
                    .insert([{ question, answer, order: nextOrder }]);
                if (insertError) throw insertError;
            }

            await loadFAQList();
            faqForm.reset();
            document.getElementById('faq-id').value = '';
            cancelFaqEditBtn.click();
            showToast('FAQ가 저장되었습니다.', 'success');
        } catch (error) {
            // 저장 실패: 모달과 입력 내용은 그대로 유지
            showToast(failMsg(SAVE_FAIL_MSG, error), 'error');
            console.error('FAQ 저장 오류:', error);
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'FAQ 저장'; }
            if (loadingText) loadingText.style.display = 'none';
        }
    });

    // FAQ 수정 모드
    window.editFAQ = async function(id) {
        try {
            const { data: faq, error } = await window.supabaseClient
                .from('qa')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !faq) {
                showToast('FAQ 정보를 찾을 수 없습니다.', 'error');
                return;
            }

            document.getElementById('faq-id').value = faq.id;
            document.getElementById('faq-question').value = faq.question;
            document.getElementById('faq-answer').value = faq.answer;

            cancelFaqEditBtn.style.display = 'inline-block';

            const formCard = document.getElementById('faq-form-card');
            if (formCard) formCard.classList.add('editing-mode');
            const formTitle = document.getElementById('faq-form-title');
            if (formTitle) formTitle.textContent = '"' + faq.question.substring(0, 20) + (faq.question.length > 20 ? '...' : '') + '" 수정 중';

            faqModalDirty = false;
            openFaqModal();

        } catch (error) {
            console.error('FAQ 수정 모드 전환 실패:', error);
            showToast('FAQ 수정 모드 전환 중 오류가 발생했습니다.', 'error');
        }
    };

    // FAQ 삭제
    window.deleteFAQ = function(id) {
        showConfirm('정말로 이 FAQ를 삭제하시겠습니까?', async function() {
            try {
                const { error } = await window.supabaseClient
                    .from('qa')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                showToast('FAQ가 삭제되었습니다.', 'success');
                loadFAQList();

            } catch (error) {
                console.error('FAQ 삭제 실패:', error);
                showToast(failMsg('삭제에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.', error), 'error');
            }
        });
    };

    // FAQ 수정 취소
    cancelFaqEditBtn.addEventListener('click', () => {
        faqForm.reset();
        document.getElementById('faq-id').value = '';
        cancelFaqEditBtn.style.display = 'none';
        const formCard = document.getElementById('faq-form-card');
        if (formCard) formCard.classList.remove('editing-mode');
        const formTitle = document.getElementById('faq-form-title');
        if (formTitle) formTitle.textContent = '신규 FAQ 추가';
        closeFaqModal(true);
    });

    // FAQ 검색
    (function() {
        const searchInput = document.getElementById('faq-search-input');
        const searchBtn = document.getElementById('faq-search-btn');
        const clearBtn = document.getElementById('faq-search-clear-btn');

        function doFilter() {
            const q = (searchInput ? searchInput.value.trim().toLowerCase() : '');
            if (!q) {
                renderFAQList(_allFaqItems);
            } else {
                renderFAQList(_allFaqItems.filter(f =>
                    f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
                ));
            }
        }

        if (searchBtn) searchBtn.addEventListener('click', doFilter);
        if (searchInput) searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doFilter(); });
        if (clearBtn) clearBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            doFilter();
        });
    })();

    // --- End FAQ Management ---

    // Initial call
    checkLogin();

    // Quill 에디터 본문 이미지 클릭 시 원본 파일명으로 다운로드 기능 추가
    document.body.addEventListener('click', function(e) {
        // 에디터(작성 중 본문/미리보기) 안의 이미지는 클릭해도 다운로드하지 않음 (선택/편집용)
        if (e.target && e.target.closest && e.target.closest('.ql-editor')) return;
        if (e.target && e.target.tagName === 'IMG' && e.target.hasAttribute('data-original-name')) {
            const img = e.target;
            const url = img.src;
            const originalName = img.getAttribute('data-original-name') || 'image.png';
            fetch(url)
                .then(res => res.blob())
                .then(blob => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = originalName;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(a.href);
                    }, 100);
                });
            e.preventDefault();
        }
    }, false);
});

// 한국 시간 기준으로 created_at을 변환해서 표시하는 함수
// 브라우저의 시간대와 관계없이 항상 Asia/Seoul 기준으로 표시
const _koreaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
function formatKoreaDate(utcDateStr) {
  if (!utcDateStr) return '';
  let s = String(utcDateStr);
  // 시간대 표기가 없는 날짜+시간 문자열은 UTC로 간주 (브라우저 로컬 시간으로 해석되는 것 방지)
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) s = s.replace(' ', 'T') + 'Z';
  const date = new Date(s);
  if (isNaN(date.getTime())) return '';
  const parts = {};
  _koreaDateFormatter.formatToParts(date).forEach(function(p) { parts[p.type] = p.value; });
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

// 파일명 안전하게 변환 (영문, 숫자, 일부 특수문자만 허용)
function sanitizeFileName(name) {
  const ext = name.split('.').pop();
  return `${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${ext}`;
}

// ====== 로딩 오버레이 유틸리티 ======
function showLoadingOverlay(message = '로딩 중입니다...') {
    let overlay = document.getElementById('global-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-loading-overlay';
        overlay.style.position = 'fixed';
        overlay.style.left = 0;
        overlay.style.top = 0;
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(255,255,255,0.7)';
        overlay.style.zIndex = 3000;
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.fontSize = '1.3rem';
        overlay.innerHTML = `<div><div class="spinner" style="margin-bottom:12px;"></div><div>${message}</div></div>`;
        // 간단한 스피너
        const spinner = overlay.querySelector('.spinner');
        spinner.style.border = '4px solid #f3f3f3';
        spinner.style.borderTop = '4px solid #3498db';
        spinner.style.borderRadius = '50%';
        spinner.style.width = '36px';
        spinner.style.height = '36px';
        spinner.style.animation = 'spin 1s linear infinite';
        spinner.style.margin = '0 auto 12px auto';
        // 스피너 애니메이션 추가
        if (!document.getElementById('global-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'global-spinner-style';
            style.innerHTML = `@keyframes spin {0% { transform: rotate(0deg);}100% { transform: rotate(360deg);}}`;
            document.head.appendChild(style);
        }
        document.body.appendChild(overlay);
    } else {
        overlay.style.display = 'flex';
        overlay.querySelector('div > div:last-child').textContent = message;
    }
}
function hideLoadingOverlay() {
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ... existing code ...
// 갤러리 로딩 오버레이 유틸리티 (공지/FAQ와 동일 스타일)
function showGalleryLoadingOverlay(message = '화면을 준비중입니다.') {
    let overlay = document.getElementById('gallery-prep-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gallery-prep-loading-overlay';
        overlay.style.position = 'fixed';
        overlay.style.left = 0;
        overlay.style.top = 0;
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(255,255,255,0.7)';
        overlay.style.zIndex = 3000;
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.fontSize = '1.3rem';
        overlay.innerHTML = `<div><div class="spinner" style="margin-bottom:12px;"></div><div>${message}</div></div>`;
        // 간단한 스피너
        const spinner = overlay.querySelector('.spinner');
        spinner.style.border = '4px solid #f3f3f3';
        spinner.style.borderTop = '4px solid #3498db';
        spinner.style.borderRadius = '50%';
        spinner.style.width = '36px';
        spinner.style.height = '36px';
        spinner.style.animation = 'spin 1s linear infinite';
        spinner.style.margin = '0 auto 12px auto';
        // 스피너 애니메이션 추가
        if (!document.getElementById('global-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'global-spinner-style';
            style.innerHTML = `@keyframes spin {0% { transform: rotate(0deg);}100% { transform: rotate(360deg);}}`;
            document.head.appendChild(style);
        }
        document.body.appendChild(overlay);
    } else {
        overlay.style.display = 'flex';
        overlay.querySelector('div > div:last-child').textContent = message;
    }
}
function hideGalleryLoadingOverlay() {
    const overlay = document.getElementById('gallery-prep-loading-overlay');
    if (overlay) overlay.style.display = 'none';
}
// ... existing code ...

// Quill 에디터 초기화 함수 (첨부파일 버튼 포함, jobs 전용)
function initializeQuillEditorWithAttachment() {
    console.log('admin.js: initializeQuillEditorWithAttachment 함수 호출');
    // 기존 인스턴스 null 처리
    if (quill) {
        quill = null;
    }
    // quill-editor 및 툴바 DOM 완전 교체
    const oldEditor = document.getElementById('quill-editor');
    if (oldEditor) {
        let prev = oldEditor.previousSibling;
        while (prev) {
            if (prev.classList && prev.classList.contains('ql-toolbar')) {
                prev.parentNode.removeChild(prev);
                break;
            }
            prev = prev.previousSibling;
        }
        const parent = oldEditor.parentNode;
        parent.removeChild(oldEditor);
        const newEditor = document.createElement('div');
        newEditor.id = 'quill-editor';
        newEditor.style.height = '400px';
        parent.appendChild(newEditor);
    }
    // 새 인스턴스 생성 (첨부파일 버튼 포함)
    quill = new Quill('#quill-editor', {
        theme: 'snow',
        modules: {
            toolbar: {
                container: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'align': [] }],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'image', 'attach'], // attach: 커스텀 버튼
                    ['clean']
                ],
                handlers: {
                    image: async function() {
                        const quillInstance = this.quill;
                        const input = document.createElement('input');
                        input.setAttribute('type', 'file');
                        input.setAttribute('accept', 'image/*');
                        input.click();
                        input.onchange = async () => {
                            const file = await prepareImageForUpload(input.files[0], MAX_EDITOR_IMAGE_BYTES);
                            if (!file) return;
                            const loadingOverlay = document.getElementById('jobs-loading-overlay');
                            const loadingText = document.getElementById('jobs-loading-text');
                            if (loadingOverlay) {
                                loadingOverlay.style.display = 'flex';
                                if (loadingText) loadingText.textContent = '이미지를 업로드하는 중입니다...';
                            }
                            try {
                                const originalFileName = file.name; // 원본 파일명 보존
                                const fileExt = file.name.split('.').pop();
                                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                                const { data, error } = await window.supabaseClient
                                    .storage
                                    .from('job-images')
                                    .upload(fileName, file, { upsert: true });
                                if (error) {
                                    alert('이미지 업로드 실패: ' + error.message);
                                    return;
                                }
                                const { data: urlData } = window.supabaseClient
                                    .storage
                                    .from('job-images')
                                    .getPublicUrl(fileName);
                                if (urlData && urlData.publicUrl) {
                                    const range = quillInstance.getSelection();
                                    quillInstance.insertEmbed(range ? range.index : 0, 'image', urlData.publicUrl, 'user');
                                    setTimeout(() => {
                                        const imgs = document.querySelectorAll('img[src="' + urlData.publicUrl + '"]');
                                        imgs.forEach(img => {
                                            img.setAttribute('data-original-name', originalFileName);
                                            img.style.cursor = 'pointer';
                                            img.title = '클릭하여 다운로드: ' + originalFileName;
                                        });
                                    }, 100);
                                } else {
                                    alert('이미지 URL 생성 실패');
                                }
                            } catch (e) {
                                alert('이미지 업로드 중 오류 발생');
                                console.error('이미지 업로드 오류:', e);
                            } finally {
                                if (loadingOverlay) {
                                    loadingOverlay.style.display = 'none';
                                    if (loadingText) loadingText.textContent = '구인 게시물 저장 중입니다...';
                                }
                            }
                        };
                    },
                    attach: async function() {
                        const quillInstance = this.quill;
                        const input = document.createElement('input');
                        input.setAttribute('type', 'file');
                        input.click();
                        input.onchange = async () => {
                            const file = input.files[0];
                            if (!file) return;
                            // 로딩 오버레이 표시
                            const loadingOverlay = document.getElementById('jobs-loading-overlay');
                            const loadingText = document.getElementById('jobs-loading-text');
                            if (loadingOverlay) {
                                loadingOverlay.style.display = 'flex';
                                if (loadingText) loadingText.textContent = '첨부파일을 업로드하는 중입니다...';
                            }
                            try {
                                const originalFileName = file.name; // 원본 파일명 보존
                                const fileExt = file.name.split('.').pop();
                                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                                const { data, error } = await window.supabaseClient
                                    .storage
                                    .from('job-attachments')
                                    .upload(fileName, file, { upsert: true });
                                if (error) {
                                    alert('첨부파일 업로드 실패: ' + error.message);
                                    return;
                                }
                                const { data: urlData } = window.supabaseClient
                                    .storage
                                    .from('job-attachments')
                                    .getPublicUrl(fileName);
                                if (urlData && urlData.publicUrl) {
                                    const range = quillInstance.getSelection();
                                    quillInstance.insertText(range ? range.index : 0, `[첨부파일: ${originalFileName}]`, { link: urlData.publicUrl });
                                    setTimeout(() => {
                                        const links = document.querySelectorAll('a[href="' + urlData.publicUrl + '"]');
                                        links.forEach(link => {
                                            if (link.textContent === `[첨부파일: ${originalFileName}]`) {
                                                link.setAttribute('download', originalFileName);
                                                link.setAttribute('data-original-filename', originalFileName);
                                            }
                                        });
                                    }, 100);
                                } else {
                                    alert('첨부파일 URL 생성 실패');
                                }
                            } catch (e) {
                                alert('첨부파일 업로드 중 오류 발생');
                                console.error('첨부파일 업로드 오류:', e);
                            } finally {
                                if (loadingOverlay) {
                                    loadingOverlay.style.display = 'none';
                                    if (loadingText) loadingText.textContent = '구인 게시물 저장 중입니다...';
                                }
                            }
                        };
                    }
                }
            }
        }
    });
    // attach 버튼에 클립 SVG 아이콘 삽입 (색상: #334a6c)
    setTimeout(() => {
        const attachBtn = document.querySelector('.ql-attach');
        if (attachBtn) {
            attachBtn.innerHTML = '<svg viewBox="0 0 18 18" width="18" height="18"><path d="M6.5 9.5l5-5a3 3 0 114.24 4.24l-7.5 7.5a5 5 0 01-7.07-7.07l7.5-7.5" stroke="#334a6c" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        }
    }, 0);
    applyQuillToolbarKorean(quill);
    return quill;
}

// 전역으로 함수 노출
window.initializeQuillEditorWithAttachment = initializeQuillEditorWithAttachment;




// ... 기존 코드 ...

// 본문 이미지/첨부파일 업로드 공통 처리 (공지/구인/갤러리 에디터 공용)
async function uploadEditorFile(quillInstance, file, kind) {
    const isImage = kind === 'image';
    if (isImage) {
        // 큰 사진은 자동으로 줄이고, 줄인 뒤 크기를 확인 (그동안 저장 막기)
        window._editorUploading = true;
        try {
            file = await prepareImageForUpload(file, MAX_EDITOR_IMAGE_BYTES);
        } finally {
            window._editorUploading = false;
        }
        if (!file) return;
    } else if (!validateAttachmentFile(file)) return;

    const postTypeEl = document.getElementById('modal-post-type');
    const postType = postTypeEl ? postTypeEl.value : 'notices';
    // 갤러리 본문 이미지는 gallery-images 버킷, 그 외는 기존과 같이 notice-* 버킷 사용
    // (삭제 시에는 URL에서 버킷/경로를 직접 파싱하므로 어느 버킷의 파일이든 정리됨)
    const bucket = isImage ? (postType === 'gallery' ? 'gallery-images' : 'notice-images') : 'notice-attachments';
    const failBase = isImage
        ? '이미지 업로드에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.'
        : '첨부파일 업로드에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';

    // 진행 표시 (body 바로 아래로 옮겨진 오버레이라 어떤 탭에서도 보임) + 업로드 중 저장 버튼 비활성화
    const loadingOverlay = document.getElementById('notice-loading-overlay');
    const loadingText = document.getElementById('notice-loading-text');
    const submitBtn = document.querySelector('#modal-form [type="submit"]');
    const prevBtnText = submitBtn ? submitBtn.textContent : '';
    window._editorUploading = true;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '업로드 중...'; }
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        if (loadingText) loadingText.textContent = isImage ? '이미지를 업로드하는 중입니다...' : '첨부파일을 업로드하는 중입니다...';
    }
    try {
        const originalFileName = file.name; // 원본 파일명 보존
        const rawExt = file.name.indexOf('.') !== -1 ? file.name.split('.').pop() : '';
        const fileExt = (rawExt || 'bin').replace(/[^a-zA-Z0-9]/g, '') || 'bin';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        if (bucket === 'gallery-images') {
            // 갤러리 버킷 사진은 썸네일(thumbs/<이름>.jpg)도 함께 저장
            await uploadGalleryImageWithThumb(fileName, file);
        } else {
            const { error } = await window.supabaseClient
                .storage
                .from(bucket)
                .upload(fileName, file, isImage ? { upsert: true, cacheControl: STORAGE_CACHE_CONTROL } : { upsert: true });
            if (error) {
                console.error('에디터 파일 업로드 오류:', error);
                notifyError(failMsg(failBase, error));
                return;
            }
        }
        const { data: urlData } = window.supabaseClient
            .storage
            .from(bucket)
            .getPublicUrl(fileName);
        if (!urlData || !urlData.publicUrl) {
            notifyError(failBase);
            return;
        }
        const range = quillInstance.getSelection();
        if (isImage) {
            quillInstance.insertEmbed(range ? range.index : 0, 'image', urlData.publicUrl, 'user');
            setTimeout(() => {
                const imgs = document.querySelectorAll('img[src="' + urlData.publicUrl + '"]');
                imgs.forEach(img => {
                    img.setAttribute('data-original-name', originalFileName);
                    img.style.cursor = 'pointer';
                    img.title = '클릭하여 다운로드: ' + originalFileName;
                });
            }, 100);
        } else {
            quillInstance.insertText(range ? range.index : 0, `[첨부파일: ${originalFileName}]`, { link: urlData.publicUrl }, 'user');
            setTimeout(() => {
                const links = document.querySelectorAll('a[href="' + urlData.publicUrl + '"]');
                links.forEach(link => {
                    if (link.textContent === `[첨부파일: ${originalFileName}]`) {
                        link.setAttribute('download', originalFileName);
                        link.setAttribute('data-original-filename', originalFileName);
                    }
                });
            }, 100);
        }
    } catch (e) {
        console.error('에디터 파일 업로드 오류:', e);
        notifyError(failMsg(failBase, e));
    } finally {
        window._editorUploading = false;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = prevBtnText || '저장하기'; }
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
            if (loadingText) loadingText.textContent = '공지사항 저장 중입니다...';
        }
    }
}

// 공지사항/구인/갤러리 공용 Quill 에디터 초기화 함수 (첨부파일 버튼 포함)
function initializeQuillEditorWithNoticeAttachment() {
    if (quill) {
        quill = null;
    }
    const oldEditor = document.getElementById('quill-editor');
    if (oldEditor) {
        let prev = oldEditor.previousSibling;
        while (prev) {
            if (prev.classList && prev.classList.contains('ql-toolbar')) {
                prev.parentNode.removeChild(prev);
                break;
            }
            prev = prev.previousSibling;
        }
        const parent = oldEditor.parentNode;
        parent.removeChild(oldEditor);
        const newEditor = document.createElement('div');
        newEditor.id = 'quill-editor';
        newEditor.style.height = '400px';
        parent.appendChild(newEditor);
    }
    quill = new Quill('#quill-editor', {
        theme: 'snow',
        modules: {
            toolbar: {
                container: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'align': [] }],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'image', 'attach'],
                    ['clean']
                ],
                handlers: {
                    image: function() {
                        const quillInstance = this.quill;
                        const input = document.createElement('input');
                        input.setAttribute('type', 'file');
                        input.setAttribute('accept', 'image/*');
                        input.onchange = () => {
                            const file = input.files[0];
                            if (file) uploadEditorFile(quillInstance, file, 'image');
                        };
                        input.click();
                    },
                    attach: function() {
                        const quillInstance = this.quill;
                        const input = document.createElement('input');
                        input.setAttribute('type', 'file');
                        input.onchange = () => {
                            const file = input.files[0];
                            if (file) uploadEditorFile(quillInstance, file, 'attachment');
                        };
                        input.click();
                    }
                }
            }
        }
    });
    // attach 버튼에 아이콘을 여러 번 반복적으로 삽입 시도
    function setAttachIcon() {
        const attachBtn = document.querySelector('.ql-attach');
        if (attachBtn && !attachBtn.innerHTML.includes('svg')) {
            attachBtn.innerHTML = '<svg viewBox="0 0 18 18" width="18" height="18"><path d="M6.5 9.5l5-5a3 3 0 114.24 4.24l-7.5 7.5a5 5 0 01-7.07-7.07l7.5-7.5" stroke="#334a6c" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        }
    }
    for (let i = 0; i < 10; i++) {
        setTimeout(setAttachIcon, 100 * i);
    }
    applyQuillToolbarKorean(quill);
    return quill;
}

window.initializeQuillEditorWithNoticeAttachment = initializeQuillEditorWithNoticeAttachment;



// ... 기존 코드 ...






// 전역 첨부파일 다운로드 이벤트 리스너 (공지/구인 모두 적용)
document.addEventListener('click', function(e) {
    if (e.target && e.target.tagName === 'A' && e.target.textContent.startsWith('[첨부파일:')) {
        const url = e.target.getAttribute('href');
        const originalName = e.target.getAttribute('data-original-filename') || e.target.textContent.replace('[첨부파일: ', '').replace(']', '') || 'file';
        if (url) {
            e.preventDefault();
            fetch(url)
                .then(res => res.blob())
                .then(blob => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = originalName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(a.href);
                })
                .catch(error => {
                    console.error('첨부파일 다운로드 실패:', error);
                    alert('첨부파일 다운로드 중 오류가 발생했습니다.');
                });
        }
    }
}, true);

window.addEventListener('DOMContentLoaded', function() {
  // Quill이 window에 로드된 이후에만 실행
  if (window.Quill) {
    if (!window._customLinkRegistered) {
      const Link = Quill.import('formats/link');
      class CustomLink extends Link {
        static create(value) {
          let node = super.create(value);
          if (typeof value === 'object' && value.href) {
            node.setAttribute('href', value.href);
            if (value.download) node.setAttribute('download', value.download);
            if (value['data-original-filename']) node.setAttribute('data-original-filename', value['data-original-filename']);
          } else if (typeof value === 'string') {
            node.setAttribute('href', value);
          }
          node.setAttribute('rel', 'noopener noreferrer');
          node.setAttribute('target', '_blank');
          return node;
        }
        static formats(domNode) {
          // super.formats(domNode)가 읽기 전용일 수 있으므로, 복사본을 만듭니다.
          let formats = { ...(super.formats(domNode) || {}) };
          if (domNode.hasAttribute('download')) formats.download = domNode.getAttribute('download');
          if (domNode.hasAttribute('data-original-filename')) formats['data-original-filename'] = domNode.getAttribute('data-original-filename');
          return formats;
        }
      }
      Quill.register(CustomLink, true);
      window._customLinkRegistered = true;
    }
  }
});