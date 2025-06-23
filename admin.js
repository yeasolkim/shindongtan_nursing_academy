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
            const response = await fetch('db.json');
            if (response.ok) {
                const db = await response.json();
                
                // Filter out deleted items from db data
                const dbData = (db[dbKey] || []).filter(d => !deletedIdsForType.has(d.id));
                
                // Return a merged and sorted list, ensuring local changes override db data
                const localDataIds = new Set(localData.map(d => d.id));
                const uniqueDbData = dbData.filter(d => !localDataIds.has(d.id));
                
                return [...localData, ...uniqueDbData].sort((a, b) => b.id - a.id);
            }
        } catch (error) {
            console.error(`Failed to load ${dbKey} from db.json`, error);
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

    // --- Instructor Management ---
    const instructorForm = document.getElementById('instructor-form');
    const instructorList = document.getElementById('instructor-list');
    const cancelInstructorEditBtn = document.getElementById('cancel-instructor-edit');

    async function loadInstructors() {
        const instructors = await getMergedData('shindongtan_instructors', 'instructors');
        instructorList.innerHTML = '';
        instructors.forEach(inst => {
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
                </div>`;
            
            item.querySelector('.button-secondary').addEventListener('click', () => editInstructor(inst.id));
            item.querySelector('.button-danger').addEventListener('click', () => deleteInstructor(inst.id));
            instructorList.appendChild(item);
        });
    }

    instructorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('instructor-id').value;
        let instructors = getFromStorage('shindongtan_instructors');
        const allInstructors = await getMergedData('shindongtan_instructors', 'instructors');
        const dbInstructors = allInstructors.filter(i => !instructors.find(l => l.id === i.id));
        
        const imageFile = document.getElementById('instructor-image').files[0];
        let image = null;

        if (imageFile) {
            image = await fileToBase64(imageFile);
        }

        const instructorData = {
            name: document.getElementById('instructor-name').value,
            title: document.getElementById('instructor-title').value,
            details: document.getElementById('instructor-details').value.split('\n'),
        };

        if (id) { // Edit
            let existing = instructors.find(i => String(i.id) === String(id));
            if (!existing) {
                const dbItem = allInstructors.find(i => String(i.id) === String(id));
                if (dbItem) {
                    existing = { ...dbItem };
                    instructors.push(existing);
                }
            }

            if (existing) {
                if (image) existing.image = image;
                else {
                    const originalItem = allInstructors.find(i => String(i.id) === String(id));
                    if (originalItem) instructorData.image = originalItem.image;
                }
                Object.assign(existing, instructorData);
            } else {
                alert('수정할 강사를 찾을 수 없습니다.');
                return;
            }
        } else { // Add
            instructorData.id = getNextId(instructors, dbInstructors);
            if (image) instructorData.image = image;
            instructors.push(instructorData);
        }

        saveToStorage('shindongtan_instructors', instructors);
        loadInstructors();
        instructorForm.reset();
        cancelInstructorEditBtn.click();
    });

    async function editInstructor(id) {
        const allInstructors = await getMergedData('shindongtan_instructors', 'instructors');
        const instructor = allInstructors.find(i => String(i.id) === String(id));
        if (!instructor) {
            alert('강사 정보를 찾을 수 없습니다.');
            return;
        }

        document.getElementById('instructor-id').value = instructor.id;
        document.getElementById('instructor-name').value = instructor.name;
        document.getElementById('instructor-title').value = instructor.title;
        document.getElementById('instructor-details').value = instructor.details.join('\n');
        
        cancelInstructorEditBtn.style.display = 'inline-block';
        instructorForm.querySelector('button[type="submit"]').textContent = '수정하기';
        window.scrollTo(0, 0);
    }
    
    cancelInstructorEditBtn.addEventListener('click', () => {
        instructorForm.reset();
        document.getElementById('instructor-id').value = '';
        cancelInstructorEditBtn.style.display = 'none';
        instructorForm.querySelector('button[type="submit"]').textContent = '저장하기';
    });
    
    async function deleteInstructor(id) {
        if (!confirm('정말로 이 강사를 삭제하시겠습니까?')) return;
        let instructors = getFromStorage('shindongtan_instructors');
        const initialCount = instructors.length;
        
        instructors = instructors.filter(i => String(i.id) !== String(id));

        if (instructors.length < initialCount) {
            saveToStorage('shindongtan_instructors', instructors);
            await loadInstructors();
            alert('강사 정보가 삭제되었습니다.');
        } else {
            // 원본 데이터 삭제 처리
            const deletedIds = getDeletedIds();
            if (!deletedIds.instructors) deletedIds.instructors = [];
            deletedIds.instructors.push(parseInt(id));
            saveDeletedIds(deletedIds);
            
            await loadInstructors();
            alert('강사 정보가 삭제되었습니다.');
        }
    }


    // --- Facility Management ---
    const facilityForm = document.getElementById('facility-form');
    const facilityList = document.getElementById('facility-list');

    async function loadFacilities() {
        const facilities = await getMergedData('shindongtan_facilities', 'facilities');
        facilityList.innerHTML = '';
        facilities.forEach(item => {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `<img src="${item.src}" alt="${item.alt}"><p>${item.alt}</p><button class="delete-btn" data-id="${item.id}">&times;</button>`;
            div.querySelector('.delete-btn').addEventListener('click', () => deleteFacility(item.id));
            facilityList.appendChild(div);
        });
    }

    facilityForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const files = document.getElementById('facility-images').files;
        if (!files.length) return;

        let facilities = getFromStorage('shindongtan_facilities');
        const dbFacilities = (await getMergedData('shindongtan_facilities', 'facilities')).filter(f => !facilities.find(l => l.id === f.id));

        for (const file of files) {
            const src = await fileToBase64(file);
            facilities.push({
                id: getNextId(facilities, dbFacilities),
                src,
                alt: file.name,
            });
        }
        saveToStorage('shindongtan_facilities', facilities);
        loadFacilities();
        facilityForm.reset();
    });

    async function deleteFacility(id) {
        if (!confirm('정말로 이 사진을 삭제하시겠습니까?')) return;
        let facilities = getFromStorage('shindongtan_facilities');
        const initialCount = facilities.length;
        facilities = facilities.filter(f => f.id !== id);

        if (facilities.length < initialCount) {
            saveToStorage('shindongtan_facilities', facilities);
            await loadFacilities();
            alert('사진이 삭제되었습니다.');
        } else {
            // 원본 데이터 삭제 처리
            const deletedIds = getDeletedIds();
            if (!deletedIds.facilities) deletedIds.facilities = [];
            deletedIds.facilities.push(id);
            saveDeletedIds(deletedIds);
            
            await loadFacilities();
            alert('사진이 삭제되었습니다.');
        }
    }
    
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

    // Initial call
    checkLogin();
});
