// Banks management functionality
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await API.waitForConfig();
        await loadUsers();
        await loadBanks();
    } catch (error) {
        console.error('Failed to initialize banks page:', error);
        if (window.Toast) {
            Toast.error('Không thể khởi tạo trang quản lý ngân hàng', 'Lỗi hệ thống');
        }
    }
});

let currentBanks = [];
let allUsers = [];

async function loadBanks() {
    const tbody = document.getElementById('banks-table');
    Utils.showLoading('banks-table');
    
    try {
        const response = await API.get(API_CONFIG.ENDPOINTS.BANKS);
        
        if (response.data && response.data.length > 0) {
            currentBanks = response.data;
            tbody.innerHTML = currentBanks.map(bank => {
                const user = allUsers.find(u => u.id === bank.user_id);
                return `
                    <tr>
                        <td>${bank.id}</td>
                        <td>${user ? user.username : 'N/A'}</td>
                        <td>${bank.tentaikhoan}</td>
                        <td>${bank.sotaikhoan}</td>
                        <td>${bank.tennganhang}</td>
                        <td>${Utils.formatDate(bank.created_at)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-warning btn-sm" onclick="editBank(${bank.id})">
                                    <i class="fas fa-edit"></i> Sửa
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="deleteBank(${bank.id})">
                                    <i class="fas fa-trash"></i> Xóa
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Không có tài khoản ngân hàng nào</td></tr>';
        }
    } catch (error) {
        console.error('Error loading banks:', error);
        Utils.showError('banks-table', error.message);
    }
}

async function loadUsers() {
    try {
        const response = await API.get(API_CONFIG.ENDPOINTS.USERS);
        if (response.data) {
            allUsers = response.data;
            
            // Populate user select dropdown
            const userSelect = document.getElementById('userId');
            userSelect.innerHTML = '<option value="">Chọn user...</option>' +
                allUsers.map(user => `<option value="${user.id}">${user.username} (${user.display_name || 'N/A'})</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function showAddBankModal() {
    document.getElementById('modalTitle').textContent = 'Thêm Tài khoản Ngân hàng';
    document.getElementById('bankId').value = '';
    document.getElementById('bankForm').reset();
    document.getElementById('bankModal').style.display = 'flex';
}

function editBank(bankId) {
    const bank = currentBanks.find(b => b.id === bankId);
    if (!bank) return;
    
    document.getElementById('modalTitle').textContent = 'Sửa Tài khoản Ngân hàng';
    document.getElementById('bankId').value = bank.id;
    document.getElementById('userId').value = bank.user_id;
    document.getElementById('tentaikhoan').value = bank.tentaikhoan;
    document.getElementById('sotaikhoan').value = bank.sotaikhoan;
    document.getElementById('tennganhang').value = bank.tennganhang;
    
    document.getElementById('bankModal').style.display = 'flex';
}

function closeBankModal() {
    document.getElementById('bankModal').style.display = 'none';
}

async function deleteBank(bankId) {
    const bank = currentBanks.find(b => b.id === bankId);
    if (!bank) return;

    const confirmed = await Utils.confirmDelete(`tài khoản "${bank.tentaikhoan}"`);
    if (!confirmed) {
        return;
    }

    try {
        await API.delete(API_CONFIG.ENDPOINTS.BANK_BY_ID.replace(':id', bankId));
        Utils.showSuccess('Xóa tài khoản ngân hàng thành công');
        await loadBanks();
    } catch (error) {
        console.error('Error deleting bank:', error);
        Utils.showErrorMessage(error.message);
    }
}

// Handle form submission
document.getElementById('bankForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bankId = document.getElementById('bankId').value;
    const bankData = {
        user_id: parseInt(document.getElementById('userId').value),
        tentaikhoan: document.getElementById('tentaikhoan').value,
        sotaikhoan: parseInt(document.getElementById('sotaikhoan').value),
        tennganhang: document.getElementById('tennganhang').value
    };
    
    try {
        if (bankId) {
            // Update existing bank
            await API.put(API_CONFIG.ENDPOINTS.BANK_BY_ID.replace(':id', bankId), bankData);
            Utils.showSuccess('Cập nhật tài khoản ngân hàng thành công');
        } else {
            // Create new bank
            await API.post(API_CONFIG.ENDPOINTS.BANK_CREATE, bankData);
            Utils.showSuccess('Thêm tài khoản ngân hàng thành công');
        }
        
        closeBankModal();
        await loadBanks();
    } catch (error) {
        console.error('Error saving bank:', error);
        Utils.showErrorMessage(error.message);
    }
});

// Close modal when clicking outside
document.getElementById('bankModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('bankModal')) {
        closeBankModal();
    }
});
