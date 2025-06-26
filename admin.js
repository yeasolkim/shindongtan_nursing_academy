const ADMIN_CREDENTIALS = { username: "admin", password: "1234" };

document.addEventListener('DOMContentLoaded', () => {
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
        loadInstructors();
        loadFacilities();
        loadBoardData('jobs');
        loadBoardData('gallery');
        loadBoardData('notices');
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

    // 상세 정보 모달 관련 변수 및 함수 추가
    const instructorDetailModal = document.getElementById('instructor-detail-modal');
    const instructorDetailBody = document.getElementById('instructor-detail-body');
    const closeInstructorDetailBtn = document.getElementById('close-instructor-detail');

    // 강사 상세 정보 모달 열기
    async function showInstructorDetail(id) {
        try {
            const { data: instructor, error } = await window.supabaseClient
                .from('instructors')
                .select('*')
                .eq('id', id)
                .single();
            if (error || !instructor) {
                alert('강사 정보를 찾을 수 없습니다.');
                return;
            }
            instructorDetailBody.innerHTML = `
                <div style="text-align:center;">
                    <img src="${instructor.image || 'shindongtan/resource/profile.png'}" alt="${instructor.name}" style="width:120px;height:120px;object-fit:cover;border-radius:50%;margin-bottom:1rem;">
                    <h4 style="margin:0 0 0.5rem 0;">${instructor.name}</h4>
                    <p style="color:#334a6c;font-weight:500;margin:0 0 1rem 0;">${instructor.title}</p>
                    <div style="text-align:left;">
                      <strong>상세 경력</strong>
                      <ul style="margin:0.5rem 0 0 1rem;padding:0;">
                        ${(instructor.details || []).map(line => `<li>${line}</li>`).join('')}
                      </ul>
                    </div>
                </div>
            `;
            instructorDetailModal.style.display = 'block';
        } catch (e) {
            alert('강사 상세 정보 로드 중 오류가 발생했습니다.');
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
            instructors.forEach((inst, idx) => {
                const item = document.createElement('div');
                item.className = 'instructor-admin-item';
                item.innerHTML = `
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
            alert('순서 변경 중 오류가 발생했습니다.');
            console.error('순서 변경 오류:', error);
        }
    }

    // 강사 추가/수정
    instructorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('instructor-id').value;
        const imageFile = document.getElementById('instructor-image').files[0];
        let imageUrl = null;
        let oldImageUrl = null;
        const imageStatus = document.getElementById('instructor-image-status');
        imageStatus.textContent = '';
        if (id) {
            // 기존 강사 정보에서 이미지 URL 조회
            const { data: instructor, error } = await window.supabaseClient
                .from('instructors')
                .select('image')
                .eq('id', id)
                .single();
            if (instructor) {
                oldImageUrl = instructor.image;
            }
        }
        if (imageFile) {
            // 새 이미지 업로드 전, 기존 이미지 삭제 (기본 이미지가 아니면)
            if (oldImageUrl && !oldImageUrl.includes('profile.png')) {
                await deleteInstructorImage(oldImageUrl);
            }
            try {
                imageStatus.textContent = '이미지 업로드 중...';
                imageUrl = await uploadInstructorImage(imageFile);
                imageStatus.textContent = '업로드 완료';
                setTimeout(() => { imageStatus.textContent = ''; }, 1500);
            } catch (uploadError) {
                imageStatus.textContent = '이미지 업로드 실패: ' + (uploadError.message || uploadError);
                imageStatus.style.color = '#d92121';
                setTimeout(() => { imageStatus.textContent = ''; imageStatus.style.color = '#1e293b'; }, 3500);
                return; // 업로드 실패 시 저장 중단
            }
        } else {
            // 첨부파일이 없으면 기존 이미지 유지(수정 시) 또는 기본 프로필 이미지(신규)
            if (id && oldImageUrl) {
                imageUrl = oldImageUrl;
            } else {
                imageUrl = "https://wihirzfnqrvytzdnmdcc.supabase.co/storage/v1/object/public/instructor-images/profile.png";
            }
        }
        // 여기서 imageUrl 값을 콘솔에 출력!
        console.log('imageUrl:', imageUrl);
        const instructorData = {
            name: document.getElementById('instructor-name').value,
            title: document.getElementById('instructor-title').value,
            details: document.getElementById('instructor-details').value.split('\n'),
            image: imageUrl
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
        } catch (error) {
            alert('강사 정보 저장 중 오류가 발생했습니다.');
            console.error('강사 저장 오류:', error);
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
                alert('강사 정보를 찾을 수 없습니다.');
                return;
            }
            document.getElementById('instructor-id').value = instructor.id;
            document.getElementById('instructor-name').value = instructor.name;
            document.getElementById('instructor-title').value = instructor.title;
            document.getElementById('instructor-details').value = (instructor.details || []).join('\n');
            cancelInstructorEditBtn.style.display = 'inline-block';
            instructorForm.querySelector('button[type="submit"]').textContent = '수정하기';
            window.scrollTo(0, 0);
        } catch (error) {
            alert('강사 정보 로드 중 오류가 발생했습니다.');
            console.error('강사 정보 로드 오류:', error);
        }
    }

    cancelInstructorEditBtn.addEventListener('click', () => {
        instructorForm.reset();
        document.getElementById('instructor-id').value = '';
        cancelInstructorEditBtn.style.display = 'none';
        instructorForm.querySelector('button[type="submit"]').textContent = '저장하기';
    });

    // 강사 삭제
    async function deleteInstructor(id) {
        if (!confirm('정말로 이 강사를 삭제하시겠습니까?')) return;
        try {
            // 1. 해당 강사 정보 조회 (이미지 URL 필요)
            const { data: instructor, error: fetchError } = await window.supabaseClient
                .from('instructors')
                .select('image')
                .eq('id', id)
                .single();
            if (fetchError) {
                alert('강사 정보 조회 중 오류가 발생했습니다.');
                console.error('강사 정보 조회 오류:', fetchError);
                return;
            }
            // 2. 이미지 삭제 (기본 이미지가 아니면)
            await deleteInstructorImage(instructor.image);
            // 3. DB에서 row 삭제
            await window.supabaseClient
                .from('instructors')
                .delete()
                .eq('id', id);
            await loadInstructors();
            alert('강사 정보가 삭제되었습니다.');
        } catch (error) {
            alert('강사 정보 삭제 중 오류가 발생했습니다.');
            console.error('강사 삭제 오류:', error);
        }
    }


    // --- Facility Management (Supabase 연동) ---
    const facilityForm = document.getElementById('facility-form');
    const facilityList = document.getElementById('facility-list');

    // 시설 이미지 목록 불러오기
    async function loadFacilities() {
        const { data: facilities, error } = await window.supabaseClient
            .from('facilities')
            .select('*')
            .order('order', { ascending: true });
        if (error) {
            facilityList.innerHTML = '<div class="error-message">시설 이미지를 불러오는 데 실패했습니다.</div>';
            return;
        }
        facilityList.innerHTML = '';
        facilities.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${item.image_url}" alt="${item.alt || ''}">
                <p>${item.alt || ''}</p>
                <button class="move-up" ${idx === 0 ? 'disabled' : ''}>▲</button>
                <button class="move-down" ${idx === facilities.length - 1 ? 'disabled' : ''}>▼</button>
                <button class="delete-btn">&times;</button>
            `;
            div.querySelector('.move-up').onclick = () => moveFacility(item.id, -1, facilities);
            div.querySelector('.move-down').onclick = () => moveFacility(item.id, 1, facilities);
            div.querySelector('.delete-btn').onclick = () => deleteFacility(item);
            facilityList.appendChild(div);
        });
    }

    // 이미지 업로드 및 row 추가
    async function addFacilityImage(file, alt) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await window.supabaseClient
            .storage.from('facility-images')
            .upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;
        const publicUrl = window.supabaseClient.storage.from('facility-images').getPublicUrl(fileName).data.publicUrl;
        // order 값: 가장 큰 값 + 1
        const { data: maxOrderData } = await window.supabaseClient
            .from('facilities')
            .select('order')
            .order('order', { ascending: false })
            .limit(1)
            .single();
        const nextOrder = maxOrderData ? (maxOrderData.order + 1) : 1;
        await window.supabaseClient
            .from('facilities')
            .insert([{ image_url: publicUrl, alt, order: nextOrder }]);
        await loadFacilities();
    }

    // 삭제
    async function deleteFacility(item) {
        if (!confirm('정말로 이 사진을 삭제하시겠습니까?')) return;
        // 1. Storage에서 이미지 삭제
        const url = new URL(item.image_url);
        const path = decodeURIComponent(url.pathname.split('/object/public/')[1]);
        await window.supabaseClient.storage.from('facility-images').remove([path]);
        // 2. DB row 삭제
        await window.supabaseClient.from('facilities').delete().eq('id', item.id);
        await loadFacilities();
    }

    // 순서 변경
    async function moveFacility(id, direction, facilities) {
        const idx = facilities.findIndex(f => f.id === id);
        if (idx === -1) return;
        const swapIdx = idx + direction;
        if (swapIdx < 0 || swapIdx >= facilities.length) return;
        const curr = facilities[idx];
        const target = facilities[swapIdx];
        await window.supabaseClient.from('facilities').update({ order: target.order }).eq('id', curr.id);
        await window.supabaseClient.from('facilities').update({ order: curr.order }).eq('id', target.id);
        await loadFacilities();
    }

    // 폼 이벤트 연결
    if (facilityForm) {
        facilityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = document.getElementById('facility-image').files[0];
            const alt = document.getElementById('facility-alt').value;
            if (!file) return;
            try {
                await addFacilityImage(file, alt);
                facilityForm.reset();
            } catch (err) {
                alert('시설 이미지 업로드 실패: ' + (err.message || err));
            }
        });
    }
    // 페이지 로드시 시설 이미지 목록 불러오기
    if (facilityList) loadFacilities();

    // --- Board (Jobs, Gallery, Notice) Management ---
    const modal = document.getElementById('post-modal');
    const modalForm = document.getElementById('modal-form');
    const modalTitle = document.getElementById('modal-title');
    const modalImageGroup = document.getElementById('modal-image-group');
    const modalNoticeGroup = document.getElementById('modal-notice-group');
    const closeModalBtn = modal.querySelector('.close-button');

    console.log('Modal elements found:', {
        modal: !!modal,
        modalForm: !!modalForm,
        modalTitle: !!modalTitle,
        modalImageGroup: !!modalImageGroup,
        modalNoticeGroup: !!modalNoticeGroup,
        closeModalBtn: !!closeModalBtn
    });

    const boardConfig = {
        jobs: {
            storageKey: 'shindongtan_jobs',
            listEl: document.getElementById('job-list'),
            addBtn: document.getElementById('add-job-btn'),
            title: '구인',
            fields: ['title', 'content'],
        },
        gallery: {
            storageKey: 'shindongtan_gallery',
            listEl: document.getElementById('gallery-list'),
            addBtn: document.getElementById('add-gallery-btn'),
            title: '갤러리',
            fields: ['title', 'image', 'content'],
        },
        notices: {
            storageKey: 'shindongtan_notices',
            listEl: document.getElementById('notice-list'),
            addBtn: document.getElementById('add-notice-btn'),
            title: '공지사항',
            fields: ['title', 'content', 'isNotice'],
        },
    };

    console.log('Board config elements found:', {
        jobs: {
            listEl: !!boardConfig.jobs.listEl,
            addBtn: !!boardConfig.jobs.addBtn
        },
        gallery: {
            listEl: !!boardConfig.gallery.listEl,
            addBtn: !!boardConfig.gallery.addBtn
        },
        notices: {
            listEl: !!boardConfig.notices.listEl,
            addBtn: !!boardConfig.notices.addBtn
        }
    });

    async function loadBoardData(type) {
        const config = boardConfig[type];
        const items = await getMergedData(config.storageKey, type);
        const listEl = config.listEl;
        listEl.innerHTML = '';

        items.forEach(item => {
            const tr = document.createElement('tr');
            let columns = `
                <td>${item.id}</td>
                ${type === 'gallery' ? `<td><img src="${item.image || ''}" width="50" height="40" style="object-fit: cover;"></td>` : ''}
                <td>${item.title}</td>
                ${type === 'notices' ? `<td>${item.isNotice ? '<strong>중요</strong>' : '일반'}</td>` : ''}
                <td>${item.date}</td>
                <td>${item.views || 0}</td>
                <td class="actions">
                    <button class="button-secondary" data-id="${item.id}">수정</button>
                    <button class="button-danger" data-id="${item.id}">삭제</button>
                </td>`;
            if (type === 'jobs') {
                 columns = `
                    <td>${item.id}</td>
                    <td>${item.title}</td>
                    <td>${item.date}</td>
                    <td>${item.views || 0}</td>
                    <td class="actions">
                       <button class="button-secondary" data-id="${item.id}">수정</button>
                       <button class="button-danger" data-id="${item.id}">삭제</button>
                    </td>`;
            }

            tr.innerHTML = columns;
            tr.querySelector('.button-secondary').addEventListener('click', () => showEditModal(type, item.id));
            tr.querySelector('.button-danger').addEventListener('click', () => deleteBoardItem(type, item.id));
            listEl.appendChild(tr);
        });
    }

    function showAddModal(type) {
        const config = boardConfig[type];
        modalForm.reset();
        document.getElementById('modal-post-id').value = '';
        document.getElementById('modal-post-type').value = type;
        modalTitle.textContent = `새 ${config.title} 작성`;
        
        modalImageGroup.style.display = type === 'gallery' ? 'block' : 'none';
        modalNoticeGroup.style.display = type === 'notices' ? 'block' : 'none';
        
        // 기존 이미지 미리보기 제거
        const existingPreview = document.querySelector('.current-image-preview');
        if (existingPreview) {
            existingPreview.remove();
        }
        
        modal.style.display = 'block';
    }

    async function showEditModal(type, id) {
        const config = boardConfig[type];
        const items = await getMergedData(config.storageKey, type);
        const item = items.find(i => String(i.id) === String(id));
        
        console.log('showEditModal - ID:', id, 'Type:', typeof id);
        console.log('showEditModal - Found item:', item);
        
        if (!item) {
            console.error('수정할 항목을 찾을 수 없습니다:', id);
            alert('수정할 항목을 찾을 수 없습니다.');
            return;
        }
        
        showAddModal(type); // Reset and show
        modalTitle.textContent = `${config.title} 수정`;
        document.getElementById('modal-post-id').value = String(item.id);
        document.getElementById('modal-title-input').value = item.title;
        document.getElementById('modal-content-input').value = item.content;
        
        if (type === 'gallery') {
            // 갤러리 수정 시 기존 이미지 표시
            const imageInput = document.getElementById('modal-image-input');
            const imagePreview = document.createElement('div');
            imagePreview.className = 'current-image-preview';
            imagePreview.innerHTML = `
                <p><strong>현재 이미지:</strong></p>
                <img src="${item.image || ''}" alt="현재 이미지" style="max-width: 200px; max-height: 150px; object-fit: cover; border: 1px solid #ddd; margin: 10px 0;">
                <p><small>새 이미지를 선택하지 않으면 현재 이미지가 유지됩니다.</small></p>
            `;
            
            // 기존 미리보기 제거 후 새로 추가
            const existingPreview = imageInput.parentNode.querySelector('.current-image-preview');
            if (existingPreview) {
                existingPreview.remove();
            }
            imageInput.parentNode.appendChild(imagePreview);
        }
        
        if (type === 'notices') {
            document.getElementById('modal-is-notice-checkbox').checked = item.isNotice || false;
        }
    }

    modalForm.addEventListener('submit', async (e) => {
        console.log('Modal form submit event triggered!');
        e.preventDefault();
        
        try {
            const id = document.getElementById('modal-post-id').value;
            const type = document.getElementById('modal-post-type').value;
            const config = boardConfig[type];
            
            console.log('Form submit - ID:', id, 'Type:', typeof id);
            console.log('Form submit - Type:', type);
            console.log('Form submit - Config:', config);
            
            if (!config) {
                console.error('Invalid board type:', type);
                alert('잘못된 게시판 유형입니다.');
                return;
            }
            
            let items = getFromStorage(config.storageKey);
            const allItems = await getMergedData(config.storageKey, type);
            const dbItems = allItems.filter(i => !items.find(l => l.id === i.id));

            console.log('Current localStorage items:', items);
            console.log('All items (merged):', allItems);

            const data = {
                title: document.getElementById('modal-title-input').value.trim(),
                content: document.getElementById('modal-content-input').value.trim(),
            };

            console.log('Form data:', data);

            // 필수 필드 검증
            if (!data.title || !data.content) {
                alert('제목과 내용을 모두 입력해주세요.');
                return;
            }

            if (type === 'gallery') {
                const imageFile = document.getElementById('modal-image-input').files[0];
                console.log('Image file:', imageFile);
                
                if (imageFile) {
                    console.log('Converting image to base64...');
                    try {
                        data.image = await fileToBase64(imageFile);
                        console.log('Image converted successfully, length:', data.image.length);
                    } catch (error) {
                        console.error('Image conversion failed:', error);
                        alert('이미지 변환 중 오류가 발생했습니다.');
                        return;
                    }
                } else if (id) {
                    // 수정 시 새 이미지가 선택되지 않았으면 기존 이미지 유지
                    const existingItem = allItems.find(i => String(i.id) === String(id));
                    if (existingItem && existingItem.image) {
                        data.image = existingItem.image;
                        console.log('Using existing image');
                    } else {
                        console.log('No existing image found');
                    }
                }
            }
            
            if (type === 'notices') {
                data.isNotice = document.getElementById('modal-is-notice-checkbox').checked;
            }

            if (id) { // Edit
                console.log('Editing item with ID:', id);
                
                // 먼저 localStorage에서 찾기
                let existing = items.find(i => String(i.id) === String(id));
                
                // localStorage에 없으면 db에서 찾아서 localStorage로 복사
                if (!existing) {
                    const dbItem = allItems.find(i => String(i.id) === String(id));
                    if (dbItem) {
                        console.log('Item found in db, copying to localStorage:', dbItem);
                        existing = { ...dbItem }; // 복사본 생성
                        items.push(existing);
                    }
                }
                
                console.log('Found existing item:', existing);
                if (existing) {
                    Object.assign(existing, data);
                    console.log('Updated item:', existing);
                } else {
                    console.error('수정할 항목을 찾을 수 없습니다:', id);
                    alert('수정할 항목을 찾을 수 없습니다. 페이지를 새로고침하고 다시 시도해주세요.');
                    return;
                }
            } else { // Add
                console.log('Adding new item');
                data.id = getNextId(items, dbItems);
                data.date = new Date().toISOString().split('T')[0];
                data.author = '관리자';
                data.views = 0;
                items.push(data);
                console.log('New item added:', data);
            }

            console.log('Saving to storage...');
            saveToStorage(config.storageKey, items);
            console.log('Reloading board data...');
            await loadBoardData(type);
            console.log('Closing modal...');
            modal.style.display = 'none';
            
            // 성공 메시지
            if (id) {
                alert('수정이 완료되었습니다.');
            } else {
                alert('새 게시물이 등록되었습니다.');
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            alert('저장 중 오류가 발생했습니다: ' + error.message);
        }
    });

    console.log('Modal form event listener attached successfully');

    // 백업용 버튼 클릭 이벤트 리스너 추가
    const modalSubmitBtn = modalForm.querySelector('button[type="submit"]');
    if (modalSubmitBtn) {
        modalSubmitBtn.addEventListener('click', (e) => {
            console.log('Modal submit button clicked!');
            console.log('Button element:', modalSubmitBtn);
            console.log('Form element:', modalForm);
            
            // 폼 제출 이벤트가 트리거되지 않을 경우를 대비한 백업
            setTimeout(() => {
                if (modal.style.display !== 'none') {
                    console.log('Form submit event did not trigger, manually triggering...');
                    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                    modalForm.dispatchEvent(submitEvent);
                }
            }, 100);
        });
        console.log('Modal submit button event listener attached');
    } else {
        console.error('Modal submit button not found!');
    }

    // 추가 백업: 폼 내부의 모든 버튼에 클릭 이벤트 추가
    modalForm.addEventListener('click', (e) => {
        if (e.target.type === 'submit') {
            console.log('Submit button clicked via form click event');
        }
    });

    async function deleteBoardItem(type, id) {
        const config = boardConfig[type];
        if (!confirm(`정말로 이 ${config.title} 게시물을 삭제하시겠습니까?`)) return;
        let items = getFromStorage(config.storageKey);
        
        const initialCount = items.length;
        items = items.filter(i => String(i.id) !== String(id));

        if (items.length < initialCount) {
            saveToStorage(config.storageKey, items);
            await loadBoardData(type);
            alert('게시물이 삭제되었습니다.');
        } else {
            // 원본 데이터 삭제 처리
            const deletedIds = getDeletedIds();
            if (!deletedIds[type]) deletedIds[type] = [];
            deletedIds[type].push(parseInt(id));
            saveDeletedIds(deletedIds);
            
            await loadBoardData(type);
            alert('게시물이 삭제되었습니다.');
        }
    }
    
    // Attach event listeners for add buttons
    Object.keys(boardConfig).forEach(type => {
        boardConfig[type].addBtn.addEventListener('click', () => showAddModal(type));
    });

    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        // 모달 닫을 때 이미지 미리보기 정리
        const existingPreview = document.querySelector('.current-image-preview');
        if (existingPreview) {
            existingPreview.remove();
        }
    });
    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            modal.style.display = 'none';
            // 모달 닫을 때 이미지 미리보기 정리
            const existingPreview = document.querySelector('.current-image-preview');
            if (existingPreview) {
                existingPreview.remove();
            }
        }
    });

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

    // 탭 활성화 시 팝업 목록 불러오기
    function initPopupTab() {
        loadPopupList();
        document.getElementById('popup-form').reset();
        document.getElementById('popup-id').value = '';
        document.getElementById('popup-image-preview').innerHTML = '';
        document.getElementById('popup-cancel').style.display = 'none';
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
            el.innerHTML = '<div style="color:#888">등록된 팝업이 없습니다.</div>';
            return;
        }
        el.innerHTML = list.map(item => `
            <div class="image-preview-item" style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
                <img src="${item.image_url}" alt="팝업 이미지" style="width:80px;height:80px;object-fit:contain;border-radius:8px;">
                <div style="flex:1;">
                    <div><b>${item.title || ''}</b></div>
                    <div style="font-size:0.9em;color:#666;">위치: (${item.position_x}%, ${item.position_y}%) / 크기: ${item.width||'원본'} x ${item.height||'원본'}</div>
                    <div style="font-size:0.9em;color:#666;">기간: ${item.start_date||'-'} ~ ${item.end_date||'-'}</div>
                    <div style="font-size:0.9em;color:#666;">활성화: ${item.is_active ? 'O' : 'X'}</div>
                </div>
                <button class="button-secondary" onclick="editPopup(${item.id})">수정</button>
                <button class="button-danger" onclick="deletePopup(${item.id}, '${item.image_url}')">삭제</button>
            </div>
        `).join('');
    }

    // 팝업 추가/수정 폼 제출
    const popupForm = document.getElementById('popup-form');
    popupForm && popupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('popup-id').value;
        const title = document.getElementById('popup-title').value;
        const link = document.getElementById('popup-link').value;
        const position_x = parseInt(document.getElementById('popup-pos-x').value) || 50;
        const position_y = parseInt(document.getElementById('popup-pos-y').value) || 50;
        const width = parseInt(document.getElementById('popup-width').value) || null;
        const height = parseInt(document.getElementById('popup-height').value) || null;
        const start_date = document.getElementById('popup-start-date').value || null;
        const end_date = document.getElementById('popup-end-date').value || null;
        const is_active = document.getElementById('popup-active').checked;
        let image_url = null;

        // 이미지 업로드
        const fileInput = document.getElementById('popup-image');
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const fileName = `popup_${Date.now()}_${file.name}`;
            const { data, error } = await window.supabaseClient.storage.from(popupBucket).upload(fileName, file, { upsert: true });
            if (error) {
                alert('이미지 업로드 실패: ' + error.message);
                return;
            }
            image_url = `${window.supabaseClient.storage.from(popupBucket).getPublicUrl(fileName).data.publicUrl}`;
        } else if (id) {
            // 수정 시 이미지 변경 없으면 기존 이미지 유지
            const { data } = await window.supabaseClient.from(popupTable).select('image_url').eq('id', id).single();
            image_url = data?.image_url;
        } else {
            alert('이미지를 선택해 주세요.');
            return;
        }

        const payload = { title, link, position_x, position_y, width, height, start_date, end_date, is_active, image_url };

        if (id) {
            // 수정
            const { error } = await window.supabaseClient.from(popupTable).update(payload).eq('id', id);
            if (error) return alert('수정 실패: ' + error.message);
            alert('팝업이 수정되었습니다.');
        } else {
            // 추가
            const { error } = await window.supabaseClient.from(popupTable).insert([payload]);
            if (error) return alert('등록 실패: ' + error.message);
            alert('팝업이 등록되었습니다.');
        }
        popupForm.reset();
        document.getElementById('popup-id').value = '';
        document.getElementById('popup-image-preview').innerHTML = '';
        document.getElementById('popup-cancel').style.display = 'none';
        loadPopupList();
    });

    // 팝업 수정 버튼
    window.editPopup = async function(id) {
        const { data, error } = await window.supabaseClient.from(popupTable).select('*').eq('id', id).single();
        if (error || !data) return alert('팝업 정보를 불러올 수 없습니다.');
        document.getElementById('popup-id').value = data.id;
        document.getElementById('popup-title').value = data.title || '';
        document.getElementById('popup-link').value = data.link || '';
        document.getElementById('popup-pos-x').value = data.position_x || 50;
        document.getElementById('popup-pos-y').value = data.position_y || 50;
        document.getElementById('popup-width').value = data.width || '';
        document.getElementById('popup-height').value = data.height || '';
        document.getElementById('popup-start-date').value = data.start_date || '';
        document.getElementById('popup-end-date').value = data.end_date || '';
        document.getElementById('popup-active').checked = !!data.is_active;
        document.getElementById('popup-image-preview').innerHTML = `<img src="${data.image_url}" alt="미리보기" style="max-width:120px;max-height:120px;">`;
        document.getElementById('popup-cancel').style.display = '';
        if (window.setPopupPreviewFromForm) window.setPopupPreviewFromForm(data.image_url);
    };

    // 팝업 삭제 버튼
    window.deletePopup = async function(id, imageUrl) {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        // 이미지 삭제
        if (imageUrl) {
            const path = imageUrl.split('/popup-images/')[1];
            if (path) {
                await window.supabaseClient.storage.from(popupBucket).remove([path]);
            }
        }
        const { error } = await window.supabaseClient.from(popupTable).delete().eq('id', id);
        if (error) return alert('삭제 실패: ' + error.message);
        alert('팝업이 삭제되었습니다.');
        loadPopupList();
    };

    // 팝업 취소 버튼
    const popupCancelBtn = document.getElementById('popup-cancel');
    popupCancelBtn && popupCancelBtn.addEventListener('click', function() {
        popupForm.reset();
        document.getElementById('popup-id').value = '';
        document.getElementById('popup-image-preview').innerHTML = '';
        popupCancelBtn.style.display = 'none';
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

    // 이미지 미리보기
    const popupImageInput = document.getElementById('popup-image');
    popupImageInput && popupImageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                document.getElementById('popup-image-preview').innerHTML = `<img src="${ev.target.result}" alt="미리보기" style="max-width:120px;max-height:120px;">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // Initial call
    checkLogin();
});
