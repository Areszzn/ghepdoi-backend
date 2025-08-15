// Transactions management functionality
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await API.waitForConfig();
        await loadUsers();
        await loadBankAccounts();
        await loadTransactions();
    } catch (error) {
        console.error('Failed to initialize transactions page:', error);
        if (window.Toast) {
            Toast.error('Không thể khởi tạo trang quản lý giao dịch', 'Lỗi hệ thống');
        }
    }
});

let currentTransactions = [];
let allUsers = [];
let allBankAccounts = [];

async function loadTransactions() {
    const tbody = document.getElementById('transactions-table');
    Utils.showLoading('transactions-table');

    try {
        const response = await API.get(API_CONFIG.ENDPOINTS.TRANSACTIONS);

        if (response && response.transactions && response.transactions.length > 0) {
            currentTransactions = response.transactions;
            displayTransactions(currentTransactions);
        } else {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">Không có giao dịch nào</td></tr>';
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        Utils.showError('transactions-table', error.message);
    }
}

function displayTransactions(transactions) {
    const tbody = document.getElementById('transactions-table');
    tbody.innerHTML = transactions.map(transaction => {
        const user = allUsers.find(u => u.id === transaction.user_id);
        return `
            <tr>
                <td>${transaction.id}</td>
                <td>${user ? user.username : 'N/A'}</td>
                <td>${Utils.getTransactionType(transaction.type)}</td>
                <td>${Utils.formatCurrency(transaction.amount)}</td>
                <td>${Utils.getStatusBadge(transaction.status)}</td>
                <td title="${transaction.description || ''}">${(transaction.description || '').substring(0, 50)}${(transaction.description || '').length > 50 ? '...' : ''}</td>
                <td>${transaction.reference_number || 'N/A'}</td>
                <td>${Utils.formatDate(transaction.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-warning btn-sm" onclick="editTransaction(${transaction.id})">
                            <i class="fas fa-edit"></i> Sửa
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteTransaction(${transaction.id})">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadUsers() {
    try {
        const response = await API.get(API_CONFIG.ENDPOINTS.USERS);
        if (response.data) {
            allUsers = response.data;

            // Populate user select dropdowns
            const userSelects = ['userId', 'filterUser'];
            userSelects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    const defaultOption = selectId === 'filterUser' ? '<option value="">Tất cả</option>' : '<option value="">Chọn user...</option>';
                    select.innerHTML = defaultOption +
                        allUsers.map(user => `<option value="${user.id}">${user.username} (${user.display_name || 'N/A'})</option>`).join('');
                }
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadBankAccounts() {
    try {
        const response = await API.get(API_CONFIG.ENDPOINTS.BANKS);
        if (response.data) {
            allBankAccounts = response.data;
            
            // Populate bank account select dropdown
            const bankSelect = document.getElementById('bankAccountId');
            bankSelect.innerHTML = '<option value="">Chọn tài khoản...</option>' +
                allBankAccounts.map(bank => {
                    const user = allUsers.find(u => u.id === bank.user_id);
                    return `<option value="${bank.id}">${bank.tentaikhoan} - ${bank.tennganhang} (${user ? user.username : 'N/A'})</option>`;
                }).join('');
        }
    } catch (error) {
        console.error('Error loading bank accounts:', error);
    }
}

function filterTransactions() {
    const statusFilter = document.getElementById('filterStatus').value;
    const typeFilter = document.getElementById('filterType').value;
    const userFilter = document.getElementById('filterUser').value;
    
    let filteredTransactions = currentTransactions;
    
    if (statusFilter) {
        filteredTransactions = filteredTransactions.filter(t => t.status === statusFilter);
    }
    
    if (typeFilter) {
        filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
    }
    
    if (userFilter) {
        filteredTransactions = filteredTransactions.filter(t => t.user_id === parseInt(userFilter));
    }
    
    displayTransactions(filteredTransactions);
}

function showAddTransactionModal() {
    document.getElementById('modalTitle').textContent = 'Thêm Giao dịch';
    document.getElementById('transactionId').value = '';
    document.getElementById('transactionForm').reset();
    document.getElementById('transactionModal').style.display = 'flex';
}

function editTransaction(transactionId) {
    const transaction = currentTransactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    document.getElementById('modalTitle').textContent = 'Sửa Giao dịch';
    document.getElementById('transactionId').value = transaction.id;
    document.getElementById('userId').value = transaction.user_id;
    document.getElementById('bankAccountId').value = transaction.bank_account_id || '';
    document.getElementById('type').value = transaction.type;
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('status').value = transaction.status;
    document.getElementById('description').value = transaction.description || '';
    document.getElementById('referenceNumber').value = transaction.reference_number || '';
    
    document.getElementById('transactionModal').style.display = 'flex';
}

function closeTransactionModal() {
    document.getElementById('transactionModal').style.display = 'none';
}

async function deleteTransaction(transactionId) {
    const transaction = currentTransactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    if (!confirm(`Bạn có chắc chắn muốn xóa giao dịch #${transaction.id}?`)) {
        return;
    }
    
    try {
        await API.delete(API_CONFIG.ENDPOINTS.TRANSACTION_BY_ID.replace(':id', transactionId));
        Utils.showSuccess('Xóa giao dịch thành công');
        await loadTransactions();
    } catch (error) {
        console.error('Error deleting transaction:', error);
        Utils.showErrorMessage(error.message);
    }
}

// Handle form submission
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const transactionId = document.getElementById('transactionId').value;
    const transactionData = {
        user_id: parseInt(document.getElementById('userId').value),
        bank_account_id: document.getElementById('bankAccountId').value ? parseInt(document.getElementById('bankAccountId').value) : null,
        type: document.getElementById('type').value,
        amount: parseFloat(document.getElementById('amount').value),
        status: document.getElementById('status').value,
        description: document.getElementById('description').value || null,
        reference_number: document.getElementById('referenceNumber').value || null
    };
    
    try {
        if (transactionId) {
            // Update existing transaction
            await API.put(API_CONFIG.ENDPOINTS.TRANSACTION_BY_ID.replace(':id', transactionId), transactionData);
            Utils.showSuccess('Cập nhật giao dịch thành công');
        } else {
            // Create new transaction
            await API.post(API_CONFIG.ENDPOINTS.TRANSACTION_CREATE, transactionData);
            Utils.showSuccess('Thêm giao dịch thành công');
        }
        
        closeTransactionModal();
        await loadTransactions();
    } catch (error) {
        console.error('Error saving transaction:', error);
        Utils.showErrorMessage(error.message);
    }
});

// Close modal when clicking outside
document.getElementById('transactionModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('transactionModal')) {
        closeTransactionModal();
    }
});
