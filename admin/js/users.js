// Users management functionality
document.addEventListener('DOMContentLoaded', async () => {
    await loadUsers();
});

let currentUsers = [];

async function loadUsers() {
    const tbody = document.getElementById('users-table');
    Utils.showLoading('users-table');
    
    try {
        const response = await API.get(API_CONFIG.ENDPOINTS.USERS);
        
        if (response.data && response.data.length > 0) {
            currentUsers = response.data;
            tbody.innerHTML = currentUsers.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.display_name || 'N/A'}</td>
                    <td>${Utils.formatCurrency(user.balance || 0)}</td>
                    <td>${user.vip || 0}</td>
                    <td>${user.trust || 100}</td>
                    <td>${user.is_verified ? '<i class="fas fa-check-circle" style="color: green;"></i>' : '<i class="fas fa-times-circle" style="color: red;"></i>'}</td>
                    <td>${Utils.formatDate(user.created_at)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-warning btn-sm" onclick="editUser(${user.id})">
                                <i class="fas fa-edit"></i> Sửa
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">
                                <i class="fas fa-trash"></i> Xóa
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">Không có user nào</td></tr>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        Utils.showError('users-table', error.message);
    }
}

function showAddUserModal() {
    document.getElementById('modalTitle').textContent = 'Thêm User';
    document.getElementById('userId').value = '';
    document.getElementById('userForm').reset();
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('password').required = true;
    document.getElementById('userModal').style.display = 'flex';
}

function editUser(userId) {
    const user = currentUsers.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('modalTitle').textContent = 'Sửa User';
    document.getElementById('userId').value = user.id;
    document.getElementById('username').value = user.username;
    document.getElementById('displayName').value = user.display_name || '';
    document.getElementById('balance').value = user.balance || 0;
    document.getElementById('vip').value = user.vip || 0;
    document.getElementById('trust').value = user.trust || 100;
    document.getElementById('isVerified').checked = user.is_verified;
    
    // Hide password field for editing
    document.getElementById('passwordGroup').style.display = 'none';
    document.getElementById('password').required = false;
    
    document.getElementById('userModal').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

async function deleteUser(userId) {
    const user = currentUsers.find(u => u.id === userId);
    if (!user) return;
    
    if (!confirm(`Bạn có chắc chắn muốn xóa user "${user.username}"?`)) {
        return;
    }
    
    try {
        await API.delete(API_CONFIG.ENDPOINTS.USER_BY_ID.replace(':id', userId));
        Utils.showSuccess('Xóa user thành công');
        await loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        Utils.showErrorMessage(error.message);
    }
}

// Handle form submission
document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const userData = {
        username: document.getElementById('username').value,
        display_name: document.getElementById('displayName').value || null,
        balance: parseFloat(document.getElementById('balance').value) || 0,
        vip: parseInt(document.getElementById('vip').value) || 0,
        trust: parseInt(document.getElementById('trust').value) || 100,
        is_verified: document.getElementById('isVerified').checked
    };
    
    // Add password for new users
    if (!userId) {
        const password = document.getElementById('password').value;
        if (!password) {
            Utils.showErrorMessage('Vui lòng nhập mật khẩu');
            return;
        }
        userData.password = password;
    }
    
    try {
        if (userId) {
            // Update existing user
            await API.put(API_CONFIG.ENDPOINTS.USER_BY_ID.replace(':id', userId), userData);
            Utils.showSuccess('Cập nhật user thành công');
        } else {
            // Create new user
            await API.post(API_CONFIG.ENDPOINTS.USERS, userData);
            Utils.showSuccess('Thêm user thành công');
        }
        
        closeUserModal();
        await loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        Utils.showErrorMessage(error.message);
    }
});

// Close modal when clicking outside
document.getElementById('userModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('userModal')) {
        closeUserModal();
    }
});
