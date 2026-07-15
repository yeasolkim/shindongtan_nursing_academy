const ADMIN_CREDENTIALS = { username: "admin", password: "1234" };

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

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');

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
        try {
            const url = new URL(imageUrl);
            const path = decodeURIComponent(url.pathname.split('/object/public/')[1]);
            const { error } = await window.supabaseClient.storage.from('instructor-images').remove([path]);
            if (error) {
                console.error('이미지 삭제 실패:', error);
            }
        } catch (e) {
            console.error('이미지 삭제 경로 파싱 오류:', e);
        }
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
    function escapeHtml(s) {
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }
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
                    <img src="${instructor.image || 'shindongtan/resource/profile.png'}" alt="${instructor.name}" class="instructor-detail-img">
                    <h4 class="instructor-detail-name">${instructor.name}</h4>
                    <p class="instructor-detail-role">${instructor.title}</p>
                    ${(instructor.details && instructor.details.length) ? `
                    <div class="instructor-detail-career">
                        <p class="instructor-detail-career-label">상세 경력</p>
                        <ul>${instructor.details.map(line => `<li>${line}</li>`).join('')}</ul>
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
                        <img src="${inst.image || 'shindongtan/resource/logo.png'}" alt="${inst.name}">
                        <div class="instructor-info">
                            <h4>${inst.name}</h4>
                            <p>${inst.title}</p>
                        </div>
                    </div>
                    <div class="instructor-actions">
                        <button class="button-secondary" data-id="${inst.id}">수정</button>
                        <button class="button-danger" data-id="${inst.id}">삭제</button>
                        <button class="button-primary" data-id="${inst.id}">상세보기</button>
                        <button class="move-up button-secondary" data-id="${inst.id}" ${idx === 0 ? 'disabled' : ''}>▲</button>
                        <button class="move-down button-secondary" data-id="${inst.id}" ${idx === instructors.length - 1 ? 'disabled' : ''}>▼</button>
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
            await window.supabaseClient
                .from('instructors')
                .update({ order: target.order })
                .eq('id', curr.id);
            await window.supabaseClient
                .from('instructors')
                .update({ order: curr.order })
                .eq('id', target.id);
            await loadInstructors();
        } catch (error) {
            showToast('순서 변경 중 오류가 발생했습니다.', 'error');
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
        const imageFile = document.getElementById('instructor-image').files[0];

        if (imageFile && imageFile.size > 5 * 1024 * 1024) {
            showToast('이미지 파일이 너무 큽니다. 5MB 이하로 선택해주세요.', 'error');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            return;
        }

        let imageUrl = null;
        if (imageFile) {
                if (loadingText) loadingText.textContent = '이미지 업로드 중...';
                imageUrl = await uploadInstructorImage(imageFile);
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
                await window.supabaseClient
                    .from('instructors')
                    .update(instructorData)
                    .eq('id', id);
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
                await window.supabaseClient
                    .from('instructors')
                    .insert([instructorData]);
            }
            await loadInstructors();
            instructorForm.reset();
            cancelInstructorEditBtn.click();
            showToast(id ? '강사 정보가 수정되었습니다.' : '강사가 등록되었습니다.', 'success');
        } catch (error) {
            showToast('강사 정보 저장 중 오류가 발생했습니다.', 'error');
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
                if (fetchError) { showToast('강사 정보 조회 중 오류가 발생했습니다.', 'error'); return; }
                await deleteInstructorImage(instructor.image);
                await window.supabaseClient.from('instructors').delete().eq('id', id);
                await loadInstructors();
                showToast('강사 정보가 삭제되었습니다.', 'success');
            } catch (error) {
                showToast('강사 삭제 중 오류가 발생했습니다.', 'error');
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
                facilityList.innerHTML = '<div class="error-message">시설 이미지를 불러오는 데 실패했습니다: ' + error.message + '</div>';
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
            const altDisplay = item.alt ? item.alt : '<span style="color:var(--t3)">설명 없음</span>';
            div.innerHTML = `
                <span class="facility-order-badge">#${idx + 1}</span>
                <img src="${item.image_url}" alt="${item.alt || ''}">
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
                        altText.innerHTML = newAlt || '<span style="color:var(--t3)">설명 없음</span>';
                        altText.style.display = '';
                        editBtn.style.display = '';
                        replaceBtn.style.display = '';
                        input.remove();
                        actions.remove();
                        showToast('사진 설명이 수정되었습니다.', 'success');
                    } catch (err) {
                        showToast('수정 중 오류가 발생했습니다.', 'error');
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
            facilityList.innerHTML = '<div class="error-message">시설 이미지를 불러오는 데 실패했습니다: ' + error.message + '</div>';
        }
    }

    // 이미지 업로드 및 row 추가
    async function addFacilityImage(file, alt) {
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
            showToast('이미지 업로드 중 오류가 발생했습니다.', 'error');
            return false;
        }
    }

    // 삭제
    async function deleteFacility(item) {
        showConfirm('이 시설 사진을 삭제하시겠습니까?', async function() { return _deleteFacilityImpl(item); });
    }
    async function _deleteFacilityImpl(item) {
        
        try {
        // 1. Storage에서 이미지 삭제
            if (item.image_url) {
        const url = new URL(item.image_url);
        const path = decodeURIComponent(url.pathname.split('/object/public/')[1]);
                if (path) {
        await window.supabaseClient.storage.from('facility-images').remove([path]);
                }
            }
            
        // 2. DB row 삭제
            const { error } = await window.supabaseClient.from('facilities').delete().eq('id', item.id);
            if (error) throw error;
            
            // 3. 목록 새로고침
        await loadFacilities();
        showToast('시설 사진이 삭제되었습니다.', 'success');
        } catch (error) {
            console.error('시설 삭제 실패:', error);
            showToast('삭제 중 오류가 발생했습니다.', 'error');
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
        await window.supabaseClient.from('facilities').update({ order: target.order }).eq('id', curr.id);
        await window.supabaseClient.from('facilities').update({ order: curr.order }).eq('id', target.id);
            
            // 목록 새로고침
        await loadFacilities();
        } catch (error) {
            console.error('시설 순서 변경 실패:', error);
            showToast('순서 변경 중 오류가 발생했습니다.', 'error');
        }
    }

    // 폼 이벤트 연결
    if (facilityForm) {
        facilityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = document.getElementById('facility-image').files[0];
            const alt = document.getElementById('facility-alt').value;

            if (!file) {
                showToast('사진을 선택해주세요.', 'warning');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast('이미지 파일이 너무 큽니다. 5MB 이하로 선택해주세요.', 'error');
                return;
            }

            const loadingOverlay = document.getElementById('facility-loading-overlay');
            const loadingText = document.getElementById('facility-loading-text');
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = '이미지 업로드 중...';

            try {
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
            if (file.size > 5 * 1024 * 1024) {
                showToast('이미지 파일이 너무 큽니다. 5MB 이하로 선택해주세요.', 'error');
                return;
            }
            const loadingOverlay = document.getElementById('facility-loading-overlay');
            const loadingText = document.getElementById('facility-loading-text');
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = '새 사진 업로드 중...';
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = Date.now() + '.' + fileExt;
                const { error: uploadError } = await window.supabaseClient.storage.from('facility-images').upload(fileName, file, { upsert: true });
                if (uploadError) throw uploadError;
                if (loadingText) loadingText.textContent = '정보 업데이트 중...';
                const publicUrl = window.supabaseClient.storage.from('facility-images').getPublicUrl(fileName).data.publicUrl;
                if (item.image_url) {
                    try {
                        const url = new URL(item.image_url);
                        const path = decodeURIComponent(url.pathname.split('/object/public/')[1]);
                        if (path) await window.supabaseClient.storage.from('facility-images').remove([path]);
                    } catch(e) {}
                }
                const { error: updateError } = await window.supabaseClient.from('facilities').update({ image_url: publicUrl }).eq('id', item.id);
                if (updateError) throw updateError;
                await loadFacilities();
                showToast('사진이 교체되었습니다.', 'success');
            } catch (err) {
                console.error('사진 교체 오류:', err);
                showToast('사진 교체 중 오류가 발생했습니다.', 'error');
            } finally {
                if (loadingOverlay) loadingOverlay.style.display = 'none';
            }
        });
    })();

    // 페이지 로드시 시설 이미지 목록 불러오기
    if (facilityList) loadFacilities();

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
                ${thumbSrc ? `<img class="post-card-thumb" src="${thumbSrc}" alt="썸네일">` : ''}
                <div class="post-card-main">
                    <div class="post-card-title">${item.title}</div>
                    <div class="post-card-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${formatKoreaDate(item.created_at)}</span>
                        <span><i class="fas fa-eye"></i> ${item.views || 0}</span>
                    </div>
                </div>
                <div class="post-card-actions">
                    <button class="button-secondary">수정</button>
                    <button class="button-danger">삭제</button>
                </div>`;
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
        galleryModalDirty = false;

        // 모달 표시
        modal.style.display = 'flex';
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
        document.getElementById('modal-content-input').value = (item.description || '').replace(/<br\s*\/?>/gi, '\n');
        
        // Quill 에디터 초기화 및 내용 설정
        initializeQuillEditor();
        if (quill) {
            quill.root.innerHTML = (item.description || '').replace(/<br\s*\/?>/gi, '\n');
        }
        
        // 기존 이미지들 미리보기로 보여주기
        let images = [];
        if (Array.isArray(item.image)) {
            images = item.image;
        } else if (typeof item.image === 'string') {
            try {
                images = JSON.parse(item.image);
                if (!Array.isArray(images)) images = [images];
            } catch {
                images = [item.image];
            }
        }
        galleryImageFiles = images.map(url => ({ url }));
        renderGalleryImagePreviews();
        galleryModalDirty = false;

        // 모달 표시
        modal.style.display = 'flex';
    }
    // 갤러리 이미지 파일 관리
    let galleryImageFiles = [];
    let galleryModalDirty = false;

    function isGalleryModal() {
        const pt = document.getElementById('modal-post-type');
        return pt && pt.value === 'gallery';
    }

    // 공통 파일 처리 함수 (파일 선택 + 드래그앤드롭 공용)
    function processImageFiles(files) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                showToast('"' + file.name + '"은(는) 이미지 파일이 아닙니다.', 'error');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast('"' + file.name + '"은(는) 5MB를 초과합니다.', 'error');
                return;
            }
            if (!galleryImageFiles.some(f => f.name === file.name && f.size === file.size)) {
                galleryImageFiles.push(file);
            }
        });
        galleryModalDirty = true;
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
    // 모달 폼 입력 변경 시 dirty 표시
    if (modalForm) {
        modalForm.addEventListener('input', function() {
            if (isGalleryModal()) galleryModalDirty = true;
        });
    }

    function renderGalleryImagePreviews() {
        if (!imagePreviewList) return;
        imagePreviewList.innerHTML = '';

        const counter = document.getElementById('gallery-img-counter');
        const countText = document.getElementById('gallery-img-count-text');
        if (counter) counter.style.display = galleryImageFiles.length > 0 ? 'flex' : 'none';
        if (countText) countText.textContent = galleryImageFiles.length + '장 추가됨';

        galleryImageFiles.forEach((file, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === galleryImageFiles.length - 1;
            if (file instanceof File) {
                const reader = new FileReader();
                reader.onload = function(ev) { addPreview(ev.target.result, file, idx, isFirst, isLast); };
                reader.readAsDataURL(file);
            } else if (file.url) {
                addPreview(file.url, file, idx, isFirst, isLast);
            }
        });

        function addPreview(src, fileObj, idx, isFirst, isLast) {
            const div = document.createElement('div');
            div.className = 'gallery-preview-wrap';
            div.innerHTML = `
                <img src="${src}" class="gallery-preview-thumb" alt="미리보기">
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
        // 신규 작성 시 이미지 필수 검증 (로딩 오버레이 전)
        if (!id && galleryImageFiles.length === 0) {
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
        try {
        const title = document.getElementById('modal-title-input').value;
            // Quill Editor에서 HTML 가져와 textarea에 동기화
            const description = (typeof quill !== 'undefined' && quill) ? quill.root.innerHTML : document.getElementById('modal-content-input').value.replace(/\n/g, '<br>');
            let imageUrls = [];
            
            if (id) {
                // 수정 시: 기존 본문 이미지와 새 본문 이미지 비교하여 삭제된 이미지 처리
                const { data: existingGallery, error: fetchError } = await window.supabaseClient
                    .from('gallery')
                    .select('description')
                    .eq('id', id)
                    .single();
                
                if (fetchError) {
                    console.error('기존 갤러리 조회 실패:', fetchError);
                } else if (existingGallery && existingGallery.description) {
                    // 기존 본문에서 이미지 URL 추출
                    const existingDoc = new DOMParser().parseFromString(existingGallery.description, 'text/html');
                    const existingImgSrcs = Array.from(existingDoc.querySelectorAll('img')).map(img => img.src);
                    
                    // 새 본문에서 이미지 URL 추출
                    const newDoc = new DOMParser().parseFromString(description, 'text/html');
                    const newImgSrcs = Array.from(newDoc.querySelectorAll('img')).map(img => img.src);
                    
                    // 삭제된 이미지 찾기 (기존에 있던 이미지 중 새 내용에 없는 것)
                    const deletedImgSrcs = existingImgSrcs.filter(src => !newImgSrcs.includes(src));
                    
                    // 삭제된 이미지들을 Storage에서 제거
                    for (const url of deletedImgSrcs) {
                        try {
                            const match = url.match(/gallery-images\/([^?]+)/);
                            if (match && match[1]) {
                                await window.supabaseClient.storage.from('gallery-images').remove([decodeURIComponent(match[1])]);
                                console.log('삭제된 본문 이미지 제거:', match[1]);
                            }
                        } catch (e) {
                            console.warn('본문 이미지 삭제 실패:', url, e);
                        }
                    }
                }
            }
            
            // 여러 파일 업로드
            if (galleryImageFiles.length > 0) {
                for (let file of galleryImageFiles) {
                    if (file.url) {
                        // 이미 업로드된 public URL
                        if (!imageUrls.includes(file.url)) imageUrls.push(file.url);
                    } else if (file instanceof File) {
                        const fileName = sanitizeFileName(file.name); // sanitizeFileName 대신 file.name 사용, 함수 내부에서만 선언
            const { data: uploadData, error: uploadError } = await window.supabaseClient
                .storage
                .from('gallery-images')
                .upload(fileName, file, { upsert: true });
            if (uploadError) {
                showToast('이미지 업로드에 실패했습니다.', 'error');
                return;
            }
            const { data: urlData } = window.supabaseClient
                .storage
                .from('gallery-images')
                .getPublicUrl(fileName);
                        if (urlData && urlData.publicUrl && !imageUrls.includes(urlData.publicUrl)) {
                            imageUrls.push(urlData.publicUrl);
                        }
                    }
                }
        } else {
                // 기존 이미지 유지 (수정 시)
                const existing = document.getElementById('modal-image-input').getAttribute('data-existing-url');
                if (existing) {
                    try {
                        const parsed = JSON.parse(existing);
                        imageUrls = Array.isArray(parsed) ? parsed : [parsed];
                    } catch {
                        imageUrls = [existing];
                    }
                }
            }
            // 항상 배열만 저장 (jsonb)
            if (!Array.isArray(imageUrls)) imageUrls = [imageUrls];
            // 저장 직전 콘솔 출력
            console.log('갤러리 저장 데이터:', { title, description, imageUrls, imageType: typeof imageUrls, isArray: Array.isArray(imageUrls) });
            // 이미지 첨부 예외 처리
            if (!imageUrls || imageUrls.length === 0 || !imageUrls[0]) {
                showToast('최소 1개의 이미지를 첨부해야 합니다.', 'warning');
                return;
        }
            if (loadingText) loadingText.textContent = '게시물 저장 중...';
        if (id) {
            await window.supabaseClient
                .from('gallery')
                    .update({ title, description, image: imageUrls })
                .eq('id', id);
                showToast('갤러리가 수정되었습니다.', 'success');
        } else {
                // id 필드를 절대 포함하지 않음
            await window.supabaseClient
                .from('gallery')
                    .insert([{ title, description, image: imageUrls }]);
                showToast('갤러리가 등록되었습니다.', 'success');
        }
        document.getElementById('post-modal').style.display = 'none';
        renderGalleryList();
            resetGalleryImageFiles();
        // 갤러리 탭 활성화 유지
        const tabs = document.querySelectorAll('.tab-link');
        const tabContents = document.querySelectorAll('.tab-content');
        tabs.forEach(t => t.classList.remove('active'));
            const galleryTab = document.querySelector('[data-tab="tab-gallery"]');
        if (galleryTab) {
            galleryTab.classList.add('active');
        }
        tabContents.forEach(content => {
                content.classList.toggle('active', content.id === 'tab-gallery');
            });
        } catch (error) {
            console.error('갤러리 저장 실패:', error);
            showToast('갤러리 저장 중 오류가 발생했습니다.', 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '저장하기'; }
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }
    async function deleteGalleryItem(item) {
        showConfirm('이 갤러리 게시물을 삭제하시겠습니까?', async function() { return _deleteGalleryItemImpl(item); });
    }
    async function _deleteGalleryItemImpl(item) {
        console.log('삭제 함수 진입:', item);

        // 1. 첨부 이미지 삭제 (image 필드)
        let images = [];
        if (Array.isArray(item.image)) {
            images = item.image;
        } else if (typeof item.image === 'string') {
            try {
                // json string일 수도 있음
                const parsed = JSON.parse(item.image);
                images = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
                images = [item.image];
            }
        } else if (item.image) {
            images = [item.image];
        }

        for (const img of images) {
            if (typeof img === 'string' && img.startsWith('http')) {
                try {
                    const url = new URL(img);
            const path = decodeURIComponent(url.pathname.split('/object/public/')[1]);
            await window.supabaseClient.storage.from('gallery-images').remove([path]);
                    console.log('첨부 이미지 삭제:', path);
                } catch (e) {
                    console.warn('첨부 이미지 삭제 실패:', img, e);
                }
            }
        }

        // 2. 본문 이미지 삭제 (description 필드)
        if (item.description) {
            const doc = new DOMParser().parseFromString(item.description, 'text/html');
            const imgSrcs = Array.from(doc.querySelectorAll('img')).map(img => img.src);
            
            for (const url of imgSrcs) {
                try {
                    const match = url.match(/gallery-images\/([^?]+)/);
                    if (match && match[1]) {
                        await window.supabaseClient.storage.from('gallery-images').remove([decodeURIComponent(match[1])]);
                        console.log('본문 이미지 삭제:', match[1]);
                    }
                } catch (e) {
                    console.warn('본문 이미지 삭제 실패:', url, e);
                }
            }
        }

        // 3. 게시글 row 삭제
        await window.supabaseClient.from('gallery').delete().eq('id', item.id);
        await renderGalleryList();
        showToast('갤러리 게시물이 삭제되었습니다.', 'success');
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
    function closeModal() {
        // 갤러리 모달에 변경사항이 있으면 확인 요청
        if (isGalleryModal && isGalleryModal() && galleryModalDirty) {
            if (!confirm('작성 중인 내용이 있습니다. 닫으시겠습니까?')) return;
        }
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
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    // 전역 함수로 노출 (모달이 다시 열릴 때마다 재등록 가능하도록)
    window.closeModal = closeModal;
    // 모달 바깥 클릭 시 닫기
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    // 모달 폼 제출 이벤트 연결 (깔끔하게 정리)
    if (modalForm) {
    modalForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const postType = document.getElementById('modal-post-type').value;
            console.log('모달 폼 제출:', postType);
            
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
                alert('저장 중 오류가 발생했습니다.');
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

    // 팝업 목록 렌더링
    function renderPopupList(list) {
        const el = document.getElementById('popup-list');
        if (!list.length) {
            el.innerHTML = '<div class="empty-state"><i class="fas fa-window-restore"></i><p>등록된 팝업이 없습니다.</p></div>';
            return;
        }
        el.innerHTML = list.map(item => `
            <div class="popup-list-item">
                <img src="${item.image_url}" alt="팝업 이미지">
                <div class="popup-list-info">
                    <div class="popup-list-title">${item.title || '(제목 없음)'}</div>
                    <div class="popup-list-date">📅 ${item.start_date||'-'} ~ ${item.end_date||'-'}</div>
                    <label class="popup-active-toggle" title="클릭하여 활성/비활성 전환">
                        <input type="checkbox" ${item.is_active ? 'checked' : ''} onchange="togglePopupActive(${item.id}, this.checked)">
                        <span class="${item.is_active ? 'popup-list-status-on' : 'popup-list-status-off'}">${item.is_active ? '● 활성화' : '○ 비활성화'}</span>
                    </label>
                </div>
                <div class="popup-list-actions">
                    <button class="button-secondary" onclick="editPopup(${item.id})">수정</button>
                    <button class="button-danger" onclick="deletePopup(${item.id}, '${item.image_url}')">삭제</button>
                </div>
            </div>
        `).join('');
    }

    // 팝업 활성/비활성 토글
    window.togglePopupActive = async function(id, isActive) {
        try {
            await window.supabaseClient.from(popupTable).update({ is_active: isActive }).eq('id', id);
            showToast(isActive ? '팝업이 활성화되었습니다.' : '팝업이 비활성화되었습니다.', 'success');
            const label = event.target.closest('label');
            if (label) {
                const span = label.querySelector('span');
                if (span) {
                    span.className = isActive ? 'popup-list-status-on' : 'popup-list-status-off';
                    span.textContent = isActive ? '● 활성화' : '○ 비활성화';
                }
            }
        } catch(e) {
            showToast('상태 변경 중 오류가 발생했습니다.', 'error');
        }
    };

    // 팝업 추가/수정 폼 제출
    const popupForm = document.getElementById('popup-form');
    popupForm && popupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('popup-id').value;
        // 이미지 필수 검증 (로딩 오버레이 전)
        {
            const _fileInput = document.getElementById('popup-image');
            const _currentImage = document.getElementById('popup-current-image');
            const _hasImage = (_fileInput && _fileInput.files && _fileInput.files[0]) ||
                (id && _currentImage && _currentImage.src && !_currentImage.src.endsWith('undefined') && !_currentImage.src.endsWith('/'));
            if (!id && !_hasImage) {
                showToast('팝업 이미지를 추가해주세요.', 'warning');
                return;
            }
        }
        const loadingOverlay = document.getElementById('popup-loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        try {
        const title = document.getElementById('popup-title').value;
        const link = document.getElementById('popup-link').value;
        const start_date = document.getElementById('popup-start-date').value || null;
        const end_date = document.getElementById('popup-end-date').value || null;
        const is_active = document.getElementById('popup-active').checked;
        const position_x = parseInt(document.getElementById('popup-pos-x').value) || 50;
        const position_y = parseInt(document.getElementById('popup-pos-y').value) || 50;
        const width = parseInt(document.getElementById('popup-width').value) || null;
        let image_url = null;

        // 이미지 업로드
        const fileInput = document.getElementById('popup-image');
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
                const fileName = sanitizeFileName(file.name);
            const { data, error } = await window.supabaseClient.storage.from(popupBucket).upload(fileName, file, { upsert: true });
            if (error) {
                showToast('이미지 업로드 실패: ' + error.message, 'error');
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
                await window.supabaseClient
                    .from('popups')
                    .update(popupData)
                    .eq('id', id);
        } else {
                await window.supabaseClient
                    .from('popups')
                    .insert([popupData]);
            }

            await loadPopupList();
            if (window.closePopupModalFn) window.closePopupModalFn(true);
            showToast('팝업이 저장되었습니다.', 'success');
        } catch (error) {
            showToast('팝업 저장 중 오류가 발생했습니다.', 'error');
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
    window.deletePopup = function(id, imageUrl) {
        showConfirm('정말 삭제하시겠습니까?', async function() {
            if (imageUrl) {
                const path = imageUrl.split('/popup-images/')[1];
                if (path) {
                    await window.supabaseClient.storage.from(popupBucket).remove([path]);
                }
            }
            const { error } = await window.supabaseClient.from(popupTable).delete().eq('id', id);
            if (error) return showToast('삭제 실패: ' + error.message, 'error');
            showToast('팝업이 삭제되었습니다.', 'success');
            loadPopupList();
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
                    <div class="post-card-title">${item.title}</div>
                    <div class="post-card-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${formatKoreaDate(item.created_at)}</span>
                        <span><i class="fas fa-eye"></i> ${item.views || 0}</span>
                    </div>
                </div>
                <div class="post-card-actions">
                    <button class="button-secondary">수정</button>
                    <button class="button-danger">삭제</button>
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
        if (id) {
            await window.supabaseClient
                .from('jobs')
                    .update({ title, description, isnotice })
                .eq('id', id);
                showToast('구인 게시물이 수정되었습니다.', 'success');
        } else {
            await window.supabaseClient
                .from('jobs')
                    .insert([{ title, description, isnotice }]);
                showToast('구인 게시물이 등록되었습니다.', 'success');
        }
        document.getElementById('post-modal').style.display = 'none';
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
            showToast('구인 게시물 저장 중 오류가 발생했습니다.', 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '저장하기'; }
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }
    async function deleteJobItem(item) {
        showConfirm('이 구인 게시물을 삭제하시겠습니까?', async function() { return _deleteJobItemImpl(item); });
    }
    async function _deleteJobItemImpl(item) {

        // 1. 본문에서 첨부파일 링크 추출
        const fileUrls = [];
        const imgUrls = [];
        if (item.description) {
            const doc = new DOMParser().parseFromString(item.description, 'text/html');
            // 첨부파일 링크
            doc.querySelectorAll('a[download], a[href*="job-attachments"]').forEach(a => {
                if (a.href) fileUrls.push(a.href);
            });
            // 본문 이미지
            doc.querySelectorAll('img[src*="job-images"]').forEach(img => {
                if (img.src) imgUrls.push(img.src);
            });
        }

        // 2. Storage에서 첨부파일/이미지 삭제
        for (const url of fileUrls) {
            try {
                const match = url.match(/job-attachments\/([^?]+)/);
                if (match && match[1]) {
                    await window.supabaseClient.storage.from('job-attachments').remove([decodeURIComponent(match[1])]);
                }
            } catch (e) {
                console.warn('첨부파일 삭제 실패:', url, e);
            }
        }
        for (const url of imgUrls) {
            try {
                const match = url.match(/job-images\/([^?]+)/);
                if (match && match[1]) {
                    await window.supabaseClient.storage.from('job-images').remove([decodeURIComponent(match[1])]);
                }
            } catch (e) {
                console.warn('본문 이미지 삭제 실패:', url, e);
            }
        }

        // 3. 게시글 row 삭제
        await window.supabaseClient.from('jobs').delete().eq('id', item.id);
        await renderJobList();
        showToast('구인 게시물이 삭제되었습니다.', 'success');
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
        modal.style.display = 'flex';
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
        const content = (item.description || item.content || '').replace(/<br\s*\/?\>/gi, '\n');
        document.getElementById('modal-content-input').value = content;
        if (quill) {
            quill.root.innerHTML = content;
        }
        
        // 모달 표시
        modal.style.display = 'flex';
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
                    <div class="post-card-title">${item.title}</div>
                    <div class="post-card-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${formatKoreaDate(item.date || item.created_at)}</span>
                        <span><i class="fas fa-eye"></i> ${item.views || 0}</span>
                    </div>
                </div>
                <div class="post-card-actions">
                    <button class="button-secondary">수정</button>
                    <button class="button-danger">삭제</button>
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
    // 페이지 로드시 UI 세팅
    setupNoticeSearchSortUI();
    renderNoticeList();
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
            quill.on('text-change', function() {
                if (isGalleryModal && isGalleryModal()) galleryModalDirty = true;
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
        modal.style.display = 'flex';
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
        const content = (item.content || '').replace(/<br\s*\/?\>/gi, '\n');
        document.getElementById('modal-content-input').value = content;
        if (quill) {
            quill.root.innerHTML = content;
        }
        
        // 모달 표시
        modal.style.display = 'flex';
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
        if (id) {
                // 수정 시: 기존 이미지와 새 이미지 비교하여 삭제된 이미지 처리
                const { data: existingNotice, error: fetchError } = await window.supabaseClient
                    .from('notices')
                    .select('content')
                    .eq('id', id)
                    .single();
                
                if (fetchError) {
                    console.error('기존 공지사항 조회 실패:', fetchError);
                } else if (existingNotice && existingNotice.content) {
                    // 기존 내용에서 이미지 URL 추출
                    const existingDoc = new DOMParser().parseFromString(existingNotice.content, 'text/html');
                    const existingImgSrcs = Array.from(existingDoc.querySelectorAll('img')).map(img => img.src);
                    
                    // 새 내용에서 이미지 URL 추출
                    const newDoc = new DOMParser().parseFromString(content, 'text/html');
                    const newImgSrcs = Array.from(newDoc.querySelectorAll('img')).map(img => img.src);
                    
                    // 삭제된 이미지 찾기 (기존에 있던 이미지 중 새 내용에 없는 것)
                    const deletedImgSrcs = existingImgSrcs.filter(src => !newImgSrcs.includes(src));
                    
                    // 삭제된 이미지들을 Storage에서 제거
                    for (const url of deletedImgSrcs) {
                        try {
                            const match = url.match(/notice-images\/([^?]+)/);
                            if (match && match[1]) {
                                await window.supabaseClient.storage.from('notice-images').remove([decodeURIComponent(match[1])]);
                                console.log('삭제된 이미지 제거:', match[1]);
                            }
                        } catch (e) {
                            console.warn('이미지 삭제 실패:', url, e);
                        }
                    }
                }
                
                // 공지사항 업데이트
            await window.supabaseClient
                .from('notices')
                .update({ title, content, isnotice })
                .eq('id', id);
                showToast('공지사항이 수정되었습니다.', 'success');
        } else {
                // 새 공지사항 등록
            await window.supabaseClient
                .from('notices')
                .insert([{ title, content, isnotice }]);
                showToast('공지사항이 등록되었습니다.', 'success');
        }
            
        document.getElementById('post-modal').style.display = 'none';
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
            showToast('공지사항 저장 중 오류가 발생했습니다.', 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '저장하기'; }
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }
    async function deleteNoticeItem(item) {
        showConfirm('이 공지사항을 삭제하시겠습니까?', async function() { return _deleteNoticeItemImpl(item); });
    }
    async function _deleteNoticeItemImpl(item) {
        try {
            // 1. 본문에서 이미지/첨부파일 추출
            const imgSrcs = [];
            const attachmentUrls = [];
            if (item.content) {
                const doc = new DOMParser().parseFromString(item.content, 'text/html');
                // 이미지
                doc.querySelectorAll('img[src*="notice-images"]').forEach(img => {
                    if (img.src) imgSrcs.push(img.src);
                });
                // 첨부파일
                doc.querySelectorAll('a[href*="notice-attachments"]').forEach(link => {
                    if (link.href) attachmentUrls.push(link.href);
                });
            }
            // 2. Storage에서 이미지 삭제
            for (const url of imgSrcs) {
                try {
                    const match = url.match(/notice-images\/([^?]+)/);
                    if (match && match[1]) {
                        await window.supabaseClient.storage.from('notice-images').remove([decodeURIComponent(match[1])]);
                    }
                } catch (e) {
                    console.warn('이미지 삭제 실패:', url, e);
                }
            }
            // 3. Storage에서 첨부파일 삭제
            for (const url of attachmentUrls) {
                try {
                    const match = url.match(/notice-attachments\/([^?]+)/);
                    if (match && match[1]) {
                        await window.supabaseClient.storage.from('notice-attachments').remove([decodeURIComponent(match[1])]);
                    }
                } catch (e) {
                    console.warn('첨부파일 삭제 실패:', url, e);
                }
            }
            // 4. 게시글 row 삭제
        await window.supabaseClient.from('notices').delete().eq('id', item.id);
        await renderNoticeList();
        showToast('공지사항이 삭제되었습니다.', 'success');
        } catch (error) {
            console.error('공지사항 삭제 중 오류:', error);
            showToast('공지사항 삭제 중 오류가 발생했습니다.', 'error');
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
                <div class="faq-question">${faq.question}</div>
                <div class="faq-answer">${faq.answer}</div>
                <div class="faq-meta">작성일: ${formatKoreaDate(faq.created_at)}</div>
                <div class="faq-actions">
                    <button class="button-secondary" onclick="editFAQ(${faq.id})">수정</button>
                    <button class="button-danger" onclick="deleteFAQ(${faq.id})">삭제</button>
                    <button class="move-up button-secondary" onclick="moveFAQ(${faq.id}, -1)" ${trueIdx <= 0 ? 'disabled' : ''}>▲</button>
                    <button class="move-down button-secondary" onclick="moveFAQ(${faq.id}, 1)" ${trueIdx === -1 || trueIdx === _allFaqItems.length - 1 ? 'disabled' : ''}>▼</button>
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
            await window.supabaseClient.from('qa').update({ order: target.order }).eq('id', curr.id);
            await window.supabaseClient.from('qa').update({ order: curr.order }).eq('id', target.id);
            await loadFAQList();
        } catch (error) {
            showToast('순서 변경 중 오류가 발생했습니다.', 'error');
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
                await window.supabaseClient
                    .from('qa')
                    .update({ question, answer })
                    .eq('id', id);
            } else {
                const { data: maxOrderData } = await window.supabaseClient
                    .from('qa')
                    .select('order')
                    .order('order', { ascending: false })
                    .limit(1)
                    .single();
                const nextOrder = maxOrderData ? (maxOrderData.order + 1) : 1;
                await window.supabaseClient
                    .from('qa')
                    .insert([{ question, answer, order: nextOrder }]);
            }

            await loadFAQList();
            faqForm.reset();
            document.getElementById('faq-id').value = '';
            cancelFaqEditBtn.click();
            showToast('FAQ가 저장되었습니다.', 'success');
        } catch (error) {
            showToast('FAQ 저장 중 오류가 발생했습니다.', 'error');
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
                showToast('FAQ 삭제 중 오류가 발생했습니다.', 'error');
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
function formatKoreaDate(utcDateStr) {
  if (!utcDateStr) return '';
  const utcDate = new Date(utcDateStr);
  // UTC -> KST 변환 (UTC+9)
  const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kstDate.getFullYear();
  const mm = String(kstDate.getMonth() + 1).padStart(2, '0');
  const dd = String(kstDate.getDate()).padStart(2, '0');
  const hh = String(kstDate.getHours()).padStart(2, '0');
  const min = String(kstDate.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
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
                            const file = input.files[0];
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
    return quill;
}

// 전역으로 함수 노출
window.initializeQuillEditorWithAttachment = initializeQuillEditorWithAttachment;




// ... 기존 코드 ...

// 공지사항용 Quill 에디터 초기화 함수 (첨부파일 버튼 포함)
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
                    image: async function() {
                        const quillInstance = this.quill;
                        const input = document.createElement('input');
                        input.setAttribute('type', 'file');
                        input.setAttribute('accept', 'image/*');
                        input.click();
                        input.onchange = async () => {
                            const file = input.files[0];
                            if (!file) return;
                            const loadingOverlay = document.getElementById('notice-loading-overlay');
                            const loadingText = document.getElementById('notice-loading-text');
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
                                    .from('notice-images')
                                    .upload(fileName, file, { upsert: true });
                                if (error) {
                                    alert('이미지 업로드 실패: ' + error.message);
                                    return;
                                }
                                const { data: urlData } = window.supabaseClient
                                    .storage
                                    .from('notice-images')
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
                                    if (loadingText) loadingText.textContent = '공지사항 저장 중입니다...';
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
                            const loadingOverlay = document.getElementById('notice-loading-overlay');
                            const loadingText = document.getElementById('notice-loading-text');
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
                                    .from('notice-attachments')
                                    .upload(fileName, file, { upsert: true });
                                if (error) {
                                    alert('첨부파일 업로드 실패: ' + error.message);
                                    return;
                                }
                                const { data: urlData } = window.supabaseClient
                                    .storage
                                    .from('notice-attachments')
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
                                    if (loadingText) loadingText.textContent = '공지사항 저장 중입니다...';
                                }
                            }
                        };
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