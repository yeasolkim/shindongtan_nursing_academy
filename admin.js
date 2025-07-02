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
        const loadingOverlay = document.getElementById('instructor-loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        try {
        const id = document.getElementById('instructor-id').value;
            const name = document.getElementById('instructor-name').value;
            const title = document.getElementById('instructor-title').value;
            const details = document.getElementById('instructor-details').value.split('\n').filter(line => line.trim());
        const imageFile = document.getElementById('instructor-image').files[0];

        let imageUrl = null;
        if (imageFile) {
                imageUrl = await uploadInstructorImage(imageFile);
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
        } catch (error) {
            alert('강사 정보 저장 중 오류가 발생했습니다.');
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
                facilityList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 2rem;">등록된 시설 사진이 없습니다.</p>';
                return;
            }
            
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
            
        } catch (error) {
            console.error('시설 이미지 업로드 실패:', error);
            alert('이미지 업로드 중 오류가 발생했습니다: ' + error.message);
        }
    }

    // 삭제
    async function deleteFacility(item) {
        if (!confirm('정말로 이 사진을 삭제하시겠습니까?')) return;
        
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
            
        } catch (error) {
            console.error('시설 삭제 실패:', error);
            alert('삭제 중 오류가 발생했습니다.');
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
            alert('순서 변경 중 오류가 발생했습니다.');
        }
    }

    // 폼 이벤트 연결
    if (facilityForm) {
        facilityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const loadingOverlay = document.getElementById('facility-loading-overlay');
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            
            try {
            const file = document.getElementById('facility-image').files[0];
            const alt = document.getElementById('facility-alt').value;
                
                if (!file) {
                    alert('사진을 선택해주세요.');
                    return;
                }
                
                console.log('시설 폼 제출:', { fileName: file.name, alt: alt });
                await addFacilityImage(file, alt);
                facilityForm.reset();
                
            } catch (error) {
                console.error('시설 폼 제출 오류:', error);
                alert('시설 사진 업로드 중 오류가 발생했습니다: ' + error.message);
            } finally {
                if (loadingOverlay) loadingOverlay.style.display = 'none';
            }
        });
    }
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
        const items = await loadGalleryList();
        const listEl = window.boardConfig.gallery.listEl;
        listEl.innerHTML = '';
        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.id}</td>
                <td><img src="${getGalleryImageUrl(item.image)}" width="50" height="40" style="object-fit: cover;"></td>
                <td>${item.title}</td>
                <td>${formatKoreaDate(item.created_at)}</td>
                <td>${item.views || 0}</td>
                <td class="actions">
                    <button class="button-secondary" data-id="${item.id}">수정</button>
                    <button class="button-danger" data-id="${item.id}">삭제</button>
                </td>`;
            tr.querySelector('.button-secondary').addEventListener('click', () => showEditGalleryModal(item));
            tr.querySelector('.button-danger').addEventListener('click', () => deleteGalleryItem(item));
            listEl.appendChild(tr);
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
        modalImageGroup.style.display = 'block';
        modalNoticeGroup.style.display = 'none';
        
        // Quill 에디터 초기화
        initializeQuillEditor();
        
        // 갤러리 이미지 초기화
        resetGalleryImageFiles();
        
        // 모달 표시
        modal.style.display = 'flex';
    }
    async function showEditGalleryModal(item) {
        // 모달 초기화
        modalForm.reset();
        document.getElementById('modal-post-id').value = String(item.id);
        document.getElementById('modal-post-type').value = 'gallery';
        modalTitle.textContent = '갤러리 수정';
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
        
        // 모달 표시
        modal.style.display = 'flex';
    }
    // 갤러리 이미지 파일 관리
    let galleryImageFiles = [];

    // 이미지 추가 버튼 클릭 시 파일 선택창 열기
    const addImageBtn = document.getElementById('add-image-btn');
    const modalImageInput = document.getElementById('modal-image-input');
    const imagePreviewList = document.getElementById('image-preview-list');
    if (addImageBtn && modalImageInput) {
        addImageBtn.onclick = () => modalImageInput.click();
        modalImageInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                if (!galleryImageFiles.some(f => f.name === file.name && f.size === file.size)) {
                    galleryImageFiles.push(file);
                }
            });
            renderGalleryImagePreviews();
            e.target.value = '';
        });
    }
    function renderGalleryImagePreviews() {
        if (!imagePreviewList) return;
        imagePreviewList.innerHTML = '';
        galleryImageFiles.forEach((file) => {
            let imgSrc = '';
            if (file instanceof File) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    addPreview(ev.target.result, file);
                };
                reader.readAsDataURL(file);
            } else if (file.url) {
                imgSrc = file.url;
                addPreview(imgSrc, file);
            }
            function addPreview(src, fileObj) {
                const div = document.createElement('div');
                div.style.position = 'relative';
                div.style.display = 'inline-block';
                div.innerHTML = `
                    <img src="${src}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1.5px solid #ccc;">
                    <button type="button" class="delete-image-btn" style="position:absolute;top:2px;right:2px;background:#dc3545;color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:14px;">&times;</button>
                `;
                imagePreviewList.appendChild(div);
                div.querySelector('.delete-image-btn').onclick = function() {
                    // url이 있으면 url로 삭제, 아니면 name+size로 삭제
                    if (fileObj.url) {
                        galleryImageFiles = galleryImageFiles.filter(f => f.url !== fileObj.url);
                    } else if (fileObj.name && fileObj.size) {
                        galleryImageFiles = galleryImageFiles.filter(f => !(f.name === fileObj.name && f.size === fileObj.size));
                    }
                    renderGalleryImagePreviews();
                };
            }
        });
    }
    // 갤러리 글쓰기/수정 진입 시 기존 파일 초기화
    function resetGalleryImageFiles() {
        galleryImageFiles = [];
        renderGalleryImagePreviews();
    }
    // handleGalleryFormSubmit에서 galleryImageFiles만 업로드
    async function handleGalleryFormSubmit(e) {
        e.preventDefault();
        const loadingOverlay = document.getElementById('gallery-loading-overlay');
        const loadingText = document.getElementById('gallery-loading-text');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = '갤러리를 저장하는 중입니다...';
        }
        try {
        const id = document.getElementById('modal-post-id').value;
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
                alert('이미지 업로드 실패: ' + uploadError.message);
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
                alert('최소 1개의 이미지를 첨부해야 합니다.');
                return;
        }
        if (id) {
            await window.supabaseClient
                .from('gallery')
                    .update({ title, description, image: imageUrls })
                .eq('id', id);
                alert('갤러리가 수정되었습니다.');
        } else {
                // id 필드를 절대 포함하지 않음
            await window.supabaseClient
                .from('gallery')
                    .insert([{ title, description, image: imageUrls }]);
                alert('갤러리가 등록되었습니다.');
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
            alert('갤러리 저장 중 오류가 발생했습니다.');
        } finally {
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }
    }
    async function deleteGalleryItem(item) {
        console.log('삭제 함수 진입:', item);
        if (!confirm('정말로 이 갤러리 게시물을 삭제하시겠습니까?')) return;

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
        console.log('삭제 후 renderGalleryList 호출');
        await renderGalleryList();
        console.log('renderGalleryList 완료');
    }
    // 글쓰기 버튼 연결
    window.boardConfig.gallery.addBtn.addEventListener('click', showAddGalleryModal);
    
    // 구인 게시판 글쓰기 버튼 연결
    window.boardConfig.jobs.addBtn.addEventListener('click', showAddJobModal);
    
    // 모달 닫기(x) 버튼 이벤트 연결 - 전역 함수로 정의
    function closeModal() {
        if (modalForm) {
            modalForm.reset();
        }
        // 갤러리 작성/수정 모달 닫을 때 이미지 미리보기도 초기화
        if (typeof resetGalleryImageFiles === 'function') {
            resetGalleryImageFiles();
        }
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
            modal.style.display = 'none';
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
        const loadingOverlay = document.getElementById('popup-loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        try {
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
                const fileName = sanitizeFileName(file.name);
            const { data, error } = await window.supabaseClient.storage.from(popupBucket).upload(fileName, file, { upsert: true });
            if (error) {
                alert('이미지 업로드 실패: ' + error.message);
                return;
            }
            image_url = `${window.supabaseClient.storage.from(popupBucket).getPublicUrl(fileName).data.publicUrl}`;
            }

            const popupData = {
                title,
                link,
                position_x,
                position_y,
                width,
                height,
                start_date,
                end_date,
                is_active,
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
        popupForm.reset();
            document.getElementById('popup-cancel').click();
            
            // 팝업 미리보기 초기화
            const popupImagePreview = document.getElementById('popup-image-preview');
            if (popupImagePreview) {
                popupImagePreview.innerHTML = '';
            }
            
            // 미리보기 영역 초기화
            if (window.setPopupPreviewFromForm) {
                window.setPopupPreviewFromForm();
            }
        } catch (error) {
            alert('팝업 저장 중 오류가 발생했습니다.');
            console.error('팝업 저장 오류:', error);
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
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
        // 활성화 체크박스 상태를 명확하게 boolean으로 변환하여 반영
        const isActive = (data.is_active === true || data.is_active === 1 || data.is_active === 'true' || data.is_active === 'Y');
        document.getElementById('popup-active').checked = isActive;
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
        // 팝업 미리보기 영역도 초기화
        if (window.setPopupPreviewFromForm) window.setPopupPreviewFromForm('');
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

    // --- Jobs Management (Supabase 연동) ---
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
        const items = await loadJobList();
        // 중요공지 먼저, 그 안에서 최신순 정렬
        items.sort((a, b) => {
            if ((b.isnotice ? 1 : 0) !== (a.isnotice ? 1 : 0)) {
                return (b.isnotice ? 1 : 0) - (a.isnotice ? 1 : 0);
            }
            return (b.created_at || '').localeCompare(a.created_at || '');
        });
        const listEl = window.boardConfig.jobs.listEl;
        listEl.innerHTML = '';
        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.id}</td>
                <td>${item.isnotice ? '<span title="중요공지" style="color:#d92121;font-weight:600;">📢</span>' : ''}</td>
                <td>${item.isnotice ? '📢 <span style="color:#d92121;font-weight:600;">중요</span> ' : ''}${item.title}</td>
                <td>${formatKoreaDate(item.created_at)}</td>
                <td>${item.views || 0}</td>
                <td class="actions">
                    <button class="button-secondary" data-id="${item.id}">수정</button>
                    <button class="button-danger" data-id="${item.id}">삭제</button>
                </td>`;
            tr.querySelector('.button-secondary').addEventListener('click', () => showEditJobModal(item));
            tr.querySelector('.button-danger').addEventListener('click', () => deleteJobItem(item));
            listEl.appendChild(tr);
        });
    }
    async function handleJobFormSubmit(e) {
        console.log('handleJobFormSubmit 함수 호출됨');
        e.preventDefault();
        const id = document.getElementById('modal-post-id').value;
        const title = document.getElementById('modal-title-input').value;
        console.log('구인 게시글 데이터:', { id, title });
        const description = typeof quill !== 'undefined' && quill ? quill.root.innerHTML : document.getElementById('modal-content-input').value;
        const isnotice = document.getElementById('modal-is-notice-checkbox')?.checked || false;
        
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
                alert('구인 게시물이 수정되었습니다.');
        } else {
            await window.supabaseClient
                .from('jobs')
                    .insert([{ title, description, isnotice }]);
                alert('구인 게시물이 등록되었습니다.');
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
            alert('구인 게시물 저장 중 오류가 발생했습니다.');
        } finally {
            // 로딩 오버레이 숨김
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }
    }
    async function deleteJobItem(item) {
        if (!confirm('정말로 이 구인 게시물을 삭제하시겠습니까?')) return;

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
    }
    
    // showAddJobModal: 구인 게시판 추가 모달 표시 (공지사항과 동일한 구조로 단순화)
    function showAddJobModal() {
        // 모달 초기화
        modalForm.reset();
        document.getElementById('modal-post-id').value = '';
        document.getElementById('modal-post-type').value = 'jobs';
        modalTitle.textContent = '새 구인 게시물 작성';
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
        modalTitle.textContent = '구인 게시물 수정';
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
        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.id}</td>
                <td>${item.isnotice ? '📢 <span style="color:#d92121;font-weight:600;">중요</span> ' : ''}${item.title}</td>
                <td>${formatKoreaDate(item.date || item.created_at)}</td>
                <td>${item.views || 0}</td>
                <td class="actions">
                    <button class="button-secondary" data-id="${item.id}">수정</button>
                    <button class="button-danger" data-id="${item.id}">삭제</button>
                </td>`;
            tr.querySelector('.button-secondary').addEventListener('click', () => showEditNoticeModal(item));
            tr.querySelector('.button-danger').addEventListener('click', () => deleteNoticeItem(item));
            listEl.appendChild(tr);
        });
    }
    function setupNoticeSearchSortUI() {
        // 테이블 thead에 필터 행 추가 코드 제거
        // 대신 notice-filter-bar의 각 요소에 이벤트 연결
        const searchBtn = document.getElementById('notice-search-btn');
        const searchInput = document.getElementById('notice-search-input');
        const searchTypeSelect = document.getElementById('notice-search-type');
        const sortOrderSelect = document.getElementById('notice-sort-order');
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
        }
        
        return quill;
    }
    function showAddNoticeModal() {
        // 모달 초기화
        modalForm.reset();
        document.getElementById('modal-post-id').value = '';
        document.getElementById('modal-post-type').value = 'notices';
        modalTitle.textContent = '새 공지사항 작성';
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
        modalTitle.textContent = '공지사항 수정';
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
        const title = document.getElementById('modal-title-input').value;
        // Quill Editor에서 HTML 가져와 textarea에 동기화
        const content = quill ? quill.root.innerHTML : document.getElementById('modal-content-input').value;
        const isnotice = document.getElementById('modal-is-notice-checkbox')?.checked || false;
        
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
                alert('공지사항이 수정되었습니다.');
        } else {
                // 새 공지사항 등록
            await window.supabaseClient
                .from('notices')
                .insert([{ title, content, isnotice }]);
                alert('공지사항이 등록되었습니다.');
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
            alert('공지사항 저장 중 오류가 발생했습니다.');
        } finally {
            // 로딩 오버레이 숨김
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }
    }
    async function deleteNoticeItem(item) {
        if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) return;
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
        } catch (error) {
            console.error('공지사항 삭제 중 오류:', error);
            alert('공지사항 삭제 중 오류가 발생했습니다.');
        }
    }

    // --- FAQ Management ---
    const faqForm = document.getElementById('faq-form');
    const faqList = document.getElementById('faq-list');
    const cancelFaqEditBtn = document.getElementById('cancel-faq-edit');

    // FAQ 목록 불러오기
    async function loadFAQList() {
        try {
            const { data, error } = await window.supabaseClient
                .from('qa')
                .select('*')
                .order('created_at', { ascending: true });
            
            if (error) {
                console.error('FAQ 목록 로드 실패:', error);
                return;
            }
            
            renderFAQList(data);
        } catch (error) {
            console.error('FAQ 목록 로드 중 오류:', error);
        }
    }

    // FAQ 목록 렌더링
    function renderFAQList(faqs) {
        if (!faqList) return;
        
        faqList.innerHTML = '';
        
        if (faqs.length === 0) {
            faqList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 2rem;">등록된 FAQ가 없습니다.</p>';
            return;
        }
        
        faqs.forEach(faq => {
            const faqItem = document.createElement('div');
            faqItem.className = 'faq-admin-item';
            faqItem.innerHTML = `
                <div class="faq-question">${faq.question}</div>
                <div class="faq-answer">${faq.answer}</div>
                <div style="font-size: 0.85rem; color: #6c757d; margin-bottom: 0.5rem;">작성일: ${formatKoreaDate(faq.created_at)}</div>
                <div class="faq-actions">
                    <button class="button-secondary" onclick="editFAQ(${faq.id})">수정</button>
                    <button class="button-danger" onclick="deleteFAQ(${faq.id})">삭제</button>
                </div>
                <button class="delete-btn" onclick="deleteFAQ(${faq.id})" title="삭제">×</button>
            `;
            faqList.appendChild(faqItem);
        });
    }

    // FAQ 추가/수정 폼 제출
    faqForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loadingOverlay = document.getElementById('faq-loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        try {
            const id = document.getElementById('faq-id').value;
            const question = document.getElementById('faq-question').value;
            const answer = document.getElementById('faq-answer').value;
            
            if (id) {
                await window.supabaseClient
                    .from('qa')
                    .update({ question, answer })
                    .eq('id', id);
            } else {
                await window.supabaseClient
                    .from('qa')
                    .insert([{ question, answer }]);
            }
            
            await loadFAQList();
            faqForm.reset();
            cancelFaqEditBtn.click();
        } catch (error) {
            alert('FAQ 저장 중 오류가 발생했습니다.');
            console.error('FAQ 저장 오류:', error);
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
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
                alert('FAQ 정보를 찾을 수 없습니다.');
                return;
            }
            
            document.getElementById('faq-id').value = faq.id;
            document.getElementById('faq-question').value = faq.question;
            document.getElementById('faq-answer').value = faq.answer;
            
            cancelFaqEditBtn.style.display = 'inline-block';
            
            // 폼으로 스크롤
            document.getElementById('faq-form').scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('FAQ 수정 모드 전환 실패:', error);
            alert('FAQ 수정 모드 전환 중 오류가 발생했습니다.');
        }
    };

    // FAQ 삭제
    window.deleteFAQ = async function(id) {
        if (!confirm('정말로 이 FAQ를 삭제하시겠습니까?')) {
            return;
        }
        
        try {
            const { error } = await window.supabaseClient
                .from('qa')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            alert('FAQ가 삭제되었습니다.');
            loadFAQList();
            
        } catch (error) {
            console.error('FAQ 삭제 실패:', error);
            alert('FAQ 삭제 중 오류가 발생했습니다.');
        }
    };

    // FAQ 수정 취소
    cancelFaqEditBtn.addEventListener('click', () => {
        faqForm.reset();
        document.getElementById('faq-id').value = '';
        cancelFaqEditBtn.style.display = 'none';
    });

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