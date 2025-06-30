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

    // --- Gallery Management (Supabase 연동) ---
    async function loadGalleryList() {
        const { data, error } = await window.supabaseClient
            .from('gallery')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            boardConfig.gallery.listEl.innerHTML = '<tr><td colspan="6">갤러리 목록을 불러오지 못했습니다.</td></tr>';
            return [];
        }
        return data;
    }
    async function renderGalleryList() {
        const items = await loadGalleryList();
        const listEl = boardConfig.gallery.listEl;
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
        if (!imageField) return '';
        let images = [];
        try {
            images = JSON.parse(imageField);
        } catch {
            images = [imageField];
        }
        const firstImage = images[0];
        if (!firstImage) return '';
        if (firstImage.startsWith('http')) return firstImage;
        const { data } = window.supabaseClient.storage.from('gallery-images').getPublicUrl(firstImage);
        return data.publicUrl;
    }
    async function showAddGalleryModal() {
        modalForm.reset();
        document.getElementById('modal-post-id').value = '';
        document.getElementById('modal-post-type').value = 'gallery';
        modalTitle.textContent = '새 갤러리 작성';
        modalImageGroup.style.display = 'block';
        modalNoticeGroup.style.display = 'none';
        const existingPreview = document.querySelector('.current-image-preview');
        if (existingPreview) existingPreview.remove();
        modal.style.display = 'block';
    }
    async function showEditGalleryModal(item) {
        showAddGalleryModal();
        modalTitle.textContent = '갤러리 수정';
        document.getElementById('modal-post-id').value = String(item.id);
        document.getElementById('modal-title-input').value = item.title;
        document.getElementById('modal-content-input').value = (item.description || '').replace(/<br\s*\/?>/gi, '\n');
        // 기존 이미지들 모두 미리보기로 보여주기
        let images = [];
        try {
            images = JSON.parse(item.image);
        } catch {
            images = [item.image];
        }
        // 기존 이미지 URL을 galleryImageFiles에 넣고, 미리보기 렌더링
        galleryImageFiles = images.map(url => ({ url }));
        renderGalleryImagePreviews();
        // 기존 이미지 표시(구버전 호환)
            const imageInput = document.getElementById('modal-image-input');
        imageInput.setAttribute('data-existing-url', item.image || '');
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
        galleryImageFiles.forEach((file, idx) => {
            let imgSrc = '';
            if (file instanceof File) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    addPreview(ev.target.result, idx);
                };
                reader.readAsDataURL(file);
            } else if (file.url) {
                imgSrc = file.url;
                addPreview(imgSrc, idx);
            }
            function addPreview(src, idx) {
                const div = document.createElement('div');
                div.style.position = 'relative';
                div.style.display = 'inline-block';
                div.innerHTML = `
                    <img src="${src}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1.5px solid #ccc;">
                    <button type="button" class="delete-image-btn" data-idx="${idx}" style="position:absolute;top:2px;right:2px;background:#dc3545;color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:14px;">&times;</button>
                `;
                imagePreviewList.appendChild(div);
                div.querySelector('.delete-image-btn').onclick = function() {
                    galleryImageFiles.splice(idx, 1);
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
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        try {
            const id = document.getElementById('modal-post-id').value;
            const title = document.getElementById('modal-title-input').value;
            const description = document.getElementById('modal-content-input').value.replace(/\n/g, '<br>');
            let imageUrls = [];
            // 여러 파일 업로드
            if (galleryImageFiles.length > 0) {
                for (let file of galleryImageFiles) {
                    const fileName = sanitizeFileName(file.name);
                    const { data: uploadData, error: uploadError } = await window.supabaseClient
                        .storage
                        .from('gallery-images')
                        .upload(fileName, file, { upsert: true });
                    if (uploadError) {
                        alert('이미지 업로드 실패: ' + uploadError.message);
                        if (loadingOverlay) loadingOverlay.style.display = 'none';
                        return;
                    }
                    const { data: urlData } = window.supabaseClient
                        .storage
                        .from('gallery-images')
                        .getPublicUrl(fileName);
                    imageUrls.push(urlData.publicUrl);
                }
            } else {
                // 기존 이미지 유지 (수정 시)
                const existing = document.getElementById('modal-image-input').getAttribute('data-existing-url');
                if (existing) {
                    try {
                        imageUrls = JSON.parse(existing);
                    } catch {
                        imageUrls = [existing];
                    }
                }
            }
            const imageField = JSON.stringify(imageUrls);
            if (id) {
                await window.supabaseClient
                    .from('gallery')
                    .update({ title, description, image: imageField })
                    .eq('id', id);
            } else {
                await window.supabaseClient
                    .from('gallery')
                    .insert([{ title, description, image: imageField }]);
            }
            document.getElementById('post-modal').style.display = 'none';
            renderGalleryList();
            resetGalleryImageFiles();
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }
    async function deleteGalleryItem(item) {
        console.log('삭제 함수 진입:', item);
        if (!confirm('정말로 이 갤러리 게시물을 삭제하시겠습니까?')) return;
        // Storage 이미지 삭제
        if (item.image && item.image.startsWith('http')) {
            const url = new URL(item.image);
            const path = decodeURIComponent(url.pathname.split('/object/public/')[1]);
            await window.supabaseClient.storage.from('gallery-images').remove([path]);
        }
        await window.supabaseClient.from('gallery').delete().eq('id', item.id);
        console.log('삭제 후 renderGalleryList 호출');
        await renderGalleryList();
        console.log('renderGalleryList 완료');
    }
    // 글쓰기 버튼 연결
    boardConfig.gallery.addBtn.addEventListener('click', showAddGalleryModal);
    
    // 구인 게시판 글쓰기 버튼 연결
    boardConfig.jobs.addBtn.addEventListener('click', showAddJobModal);
    
    // 모달 닫기(x) 버튼 이벤트 연결
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    // 모달 바깥 클릭 시 닫기
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    // 모달 폼 제출 이벤트 연결 (공지사항/구인/갤러리 구분)
    modalForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const postType = document.getElementById('modal-post-type').value;
        let loadingOverlay = null;
        
        // 게시물 타입에 따라 적절한 로딩 오버레이 선택
        if (postType === 'jobs') {
            loadingOverlay = document.getElementById('jobs-loading-overlay');
        } else if (postType === 'notices') {
            loadingOverlay = document.getElementById('notice-loading-overlay');
        } else if (postType === 'gallery') {
            loadingOverlay = document.getElementById('gallery-loading-overlay');
        }
        
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        try {
            const id = document.getElementById('modal-post-id').value;
            const title = document.getElementById('modal-title-input').value;
            const content = document.getElementById('modal-content-input').value;
            
            if (postType === 'jobs') {
                if (id) {
                    await window.supabaseClient
                        .from('jobs')
                        .update({ title, content })
                        .eq('id', id);
                } else {
                    await window.supabaseClient
                        .from('jobs')
                        .insert([{ title, content }]);
                }
                await renderJobList();
            } else if (postType === 'notices') {
                const isNotice = document.getElementById('modal-is-notice-checkbox').checked;
                if (id) {
                    await window.supabaseClient
                        .from('notices')
                        .update({ title, content, is_notice: isNotice })
                        .eq('id', id);
                } else {
                    await window.supabaseClient
                        .from('notices')
                        .insert([{ title, content, is_notice: isNotice }]);
                }
                await renderNoticeList();
            } else if (postType === 'gallery') {
                await handleGalleryFormSubmit(e);
                return; // handleGalleryFormSubmit에서 이미 로딩 오버레이를 처리하므로 여기서는 return
            }
            
            modal.style.display = 'none';
            modalForm.reset();
        } catch (error) {
            alert('게시물 저장 중 오류가 발생했습니다.');
            console.error('게시물 저장 오류:', error);
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
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

    // --- Jobs Management (Supabase 연동) ---
    async function loadJobList() {
        const { data, error } = await window.supabaseClient
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            boardConfig.jobs.listEl.innerHTML = '<tr><td colspan="8">구인 목록을 불러오지 못했습니다.</td></tr>';
            return [];
        }
        return data;
    }
    async function renderJobList() {
        const items = await loadJobList();
        const listEl = boardConfig.jobs.listEl;
        listEl.innerHTML = '';
        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.id}</td>
                <td>${item.title}</td>
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
        e.preventDefault();
        const id = document.getElementById('modal-post-id').value;
        const title = document.getElementById('modal-title-input').value;
        // 줄바꿈을 <br>로 변환
        const description = document.getElementById('modal-content-input').value.replace(/\n/g, '<br>');
            if (id) {
            await window.supabaseClient
                .from('jobs')
                .update({ title, description })
                .eq('id', id);
            } else {
            await window.supabaseClient
                .from('jobs')
                .insert([{ title, description }]);
        }
        document.getElementById('post-modal').style.display = 'none';
        renderJobList();
        
        // 구인 탭 활성화 유지
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
    }
    async function deleteJobItem(item) {
        if (!confirm('정말로 이 구인 게시물을 삭제하시겠습니까?')) return;
        await window.supabaseClient.from('jobs').delete().eq('id', item.id);
        await renderJobList();
    }
    
    // showAddJobModal: 구인 게시판 추가 모달 표시
    async function showAddJobModal() {
        modalForm.reset();
        document.getElementById('modal-post-id').value = '';
        document.getElementById('modal-post-type').value = 'jobs';
        modalTitle.textContent = '새 구인 게시물 작성';
        modalImageGroup.style.display = 'none';
        modalNoticeGroup.style.display = 'none';
        modal.style.display = 'block';
    }
    
    // showEditJobModal: 구인 게시판 수정 모달 표시
    async function showEditJobModal(item) {
        modalForm.reset();
        document.getElementById('modal-post-id').value = String(item.id);
        document.getElementById('modal-post-type').value = 'jobs';
        modalTitle.textContent = '구인 게시물 수정';
        modalImageGroup.style.display = 'none';
        modalNoticeGroup.style.display = 'none';
        document.getElementById('modal-title-input').value = item.title || '';
        // <br>을 줄바꿈으로 변환
        document.getElementById('modal-content-input').value = (item.description || item.content || '').replace(/<br\s*\/?\>/gi, '\n');
        modal.style.display = 'block';
    }
    // --- Notices Management (Supabase 연동) ---
    async function loadNoticeList() {
        const { data, error } = await window.supabaseClient
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            boardConfig.notices.listEl.innerHTML = '<tr><td colspan="7">공지사항 목록을 불러오지 못했습니다.</td></tr>';
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
        const listEl = boardConfig.notices.listEl;
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
    // handleNoticeFormSubmit에서 author 관련 코드 제거
    async function handleNoticeFormSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('modal-post-id').value;
        const title = document.getElementById('modal-title-input').value;
        // 줄바꿈을 <br>로 변환
        const content = document.getElementById('modal-content-input').value.replace(/\n/g, '<br>');
        const isnotice = document.getElementById('modal-is-notice-checkbox')?.checked || false;
        
        try {
            if (id) {
                await window.supabaseClient
                    .from('notices')
                    .update({ title, content, isnotice })
                    .eq('id', id);
                alert('공지사항이 수정되었습니다.');
    } else {
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
        }
    }
    async function deleteNoticeItem(item) {
        if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) return;
        await window.supabaseClient.from('notices').delete().eq('id', item.id);
        await renderNoticeList();
    }
    // showEditNoticeModal에서 author 관련 코드 제거
    async function showEditNoticeModal(item) {
        modalForm.reset();
        document.getElementById('modal-post-id').value = String(item.id);
        document.getElementById('modal-post-type').value = 'notices';
        modalTitle.textContent = '공지사항 수정';
        modalImageGroup.style.display = 'none';
        modalNoticeGroup.style.display = 'block';
        document.getElementById('modal-title-input').value = item.title || '';
        // <br>을 줄바꿈으로 변환
        document.getElementById('modal-content-input').value = (item.content || '').replace(/<br\s*\/?\>/gi, '\n');
        if(document.getElementById('modal-is-notice-checkbox')) document.getElementById('modal-is-notice-checkbox').checked = !!item.isNotice;
        modal.style.display = 'block';
    }
    // showAddNoticeModal에서 author 관련 코드 제거
    function showAddNoticeModal() {
        document.getElementById('modal-title').textContent = '새 공지사항 작성';
        document.getElementById('modal-post-type').value = 'notices';
        document.getElementById('modal-post-id').value = '';
        document.getElementById('modal-title-input').value = '';
        document.getElementById('modal-content-input').value = '';
        document.getElementById('modal-notice-group').style.display = 'block';
        document.getElementById('modal-is-notice-checkbox').checked = false;
        document.getElementById('post-modal').style.display = 'block';
    }
    if (boardConfig.notices.addBtn) {
        boardConfig.notices.addBtn.addEventListener('click', showAddNoticeModal);
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