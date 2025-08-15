// Settings management functionality
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadQuickSettings();
});

let currentSettings = [];

async function loadSettings() {
    const tbody = document.getElementById('settings-table');
    Utils.showLoading('settings-table');
    
    try {
        const response = await API.get(API_CONFIG.ENDPOINTS.SETTINGS);
        
        if (response.data && response.data.length > 0) {
            currentSettings = response.data;
            tbody.innerHTML = currentSettings.map(setting => `
                <tr>
                    <td>${setting.id}</td>
                    <td>${setting.name}</td>
                    <td title="${setting.value || ''}">${(setting.value || '').substring(0, 100)}${(setting.value || '').length > 100 ? '...' : ''}</td>
                    <td>${Utils.formatDate(setting.created_at)}</td>
                    <td>${Utils.formatDate(setting.updated_at)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-warning btn-sm" onclick="editSetting(${setting.id})">
                                <i class="fas fa-edit"></i> Sửa
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="deleteSetting(${setting.id})">
                                <i class="fas fa-trash"></i> Xóa
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Không có cài đặt nào</td></tr>';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        Utils.showError('settings-table', error.message);
    }
}

async function loadQuickSettings() {
    const quickSettings = ['name_app', 'logo_app', 'bg_login', 'bg_reg', 'cancel_bank'];

    for (const settingName of quickSettings) {
        try {
            const response = await API.get(API_CONFIG.ENDPOINTS.SETTING_BY_NAME.replace(':name', settingName));
            if (response.data) {
                const element = document.getElementById(`quick-${settingName}`);
                if (element) {
                    element.value = response.data.value || (settingName === 'cancel_bank' ? 'true' : '');
                }
            }
        } catch (error) {
            console.log(`Setting ${settingName} not found, will be created when updated`);
            // Set default value for cancel_bank if not found
            if (settingName === 'cancel_bank') {
                const element = document.getElementById(`quick-${settingName}`);
                if (element) {
                    element.value = 'true';
                }
            }
        }
    }
}

async function updateQuickSetting(settingName) {
    const value = document.getElementById(`quick-${settingName}`).value;
    
    if (!value.trim()) {
        Utils.showErrorMessage('Vui lòng nhập giá trị');
        return;
    }
    
    try {
        // Try to update existing setting
        try {
            await API.put(API_CONFIG.ENDPOINTS.SETTING_BY_NAME.replace(':name', settingName), {
                value: value
            });
        } catch (error) {
            // If setting doesn't exist, create it
            if (error.message.includes('not found') || error.message.includes('404')) {
                await API.post(API_CONFIG.ENDPOINTS.SETTINGS, {
                    name: settingName,
                    value: value
                });
            } else {
                throw error;
            }
        }
        
        Utils.showSuccess('Cập nhật cài đặt thành công');
        await loadSettings();
    } catch (error) {
        console.error('Error updating quick setting:', error);
        Utils.showErrorMessage(error.message);
    }
}

function showAddSettingModal() {
    document.getElementById('modalTitle').textContent = 'Thêm Cài đặt';
    document.getElementById('settingId').value = '';
    document.getElementById('settingForm').reset();
    document.getElementById('settingModal').style.display = 'flex';
}

function editSetting(settingId) {
    const setting = currentSettings.find(s => s.id === settingId);
    if (!setting) return;
    
    document.getElementById('modalTitle').textContent = 'Sửa Cài đặt';
    document.getElementById('settingId').value = setting.id;
    document.getElementById('settingName').value = setting.name;
    document.getElementById('settingValue').value = setting.value || '';
    
    document.getElementById('settingModal').style.display = 'flex';
}

function closeSettingModal() {
    document.getElementById('settingModal').style.display = 'none';
}

async function deleteSetting(settingId) {
    const setting = currentSettings.find(s => s.id === settingId);
    if (!setting) return;

    const confirmed = await Utils.confirmDelete(`cài đặt "${setting.name}"`);
    if (!confirmed) {
        return;
    }

    try {
        await API.delete(API_CONFIG.ENDPOINTS.SETTING_BY_NAME.replace(':name', setting.name));
        Utils.showSuccess('Xóa cài đặt thành công');
        await loadSettings();
        await loadQuickSettings();
    } catch (error) {
        console.error('Error deleting setting:', error);
        Utils.showErrorMessage(error.message);
    }
}

// Handle form submission
document.getElementById('settingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const settingId = document.getElementById('settingId').value;
    const settingData = {
        name: document.getElementById('settingName').value,
        value: document.getElementById('settingValue').value || null
    };
    
    try {
        if (settingId) {
            // Update existing setting
            const setting = currentSettings.find(s => s.id === parseInt(settingId));
            if (setting) {
                await API.put(API_CONFIG.ENDPOINTS.SETTING_BY_NAME.replace(':name', setting.name), {
                    value: settingData.value
                });
                Utils.showSuccess('Cập nhật cài đặt thành công');
            }
        } else {
            // Create new setting
            await API.post(API_CONFIG.ENDPOINTS.SETTINGS, settingData);
            Utils.showSuccess('Thêm cài đặt thành công');
        }
        
        closeSettingModal();
        await loadSettings();
        await loadQuickSettings();
    } catch (error) {
        console.error('Error saving setting:', error);
        Utils.showErrorMessage(error.message);
    }
});

// Close modal when clicking outside
document.getElementById('settingModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('settingModal')) {
        closeSettingModal();
    }
});
