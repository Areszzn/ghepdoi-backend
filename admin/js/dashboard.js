// Dashboard functionality
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for config to load before accessing API
        await API.waitForConfig();

        // Show API URL in header
        updateApiStatus();

        await loadDashboardData();
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        if (window.Toast) {
            Toast.error('Không thể khởi tạo dashboard', 'Lỗi hệ thống');
        }
    }
});

async function loadDashboardData() {
    try {
        // Load statistics
        await loadStats();
        
        // Load recent transactions
        await loadRecentTransactions();
        
        // Load recent users
        await loadRecentUsers();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadStats() {
    try {
        // Load users count
        const usersResponse = await API.get(API_CONFIG.ENDPOINTS.USERS);
        const totalUsers = usersResponse.data ? usersResponse.data.length : 0;
        document.getElementById('total-users').textContent = totalUsers;
        
        // Calculate total balance
        let totalBalance = 0;
        if (usersResponse.data) {
            totalBalance = usersResponse.data.reduce((sum, user) => sum + (parseFloat(user.balance) || 0), 0);
        }
        document.getElementById('total-balance').textContent = Utils.formatCurrency(totalBalance);
        
        // Load bank accounts count
        const banksResponse = await API.get(API_CONFIG.ENDPOINTS.BANKS);
        const totalBanks = banksResponse.data ? banksResponse.data.length : 0;
        document.getElementById('total-banks').textContent = totalBanks;
        
        // Load transactions count
        const transactionsResponse = await API.get(API_CONFIG.ENDPOINTS.TRANSACTIONS);
        const totalTransactions = transactionsResponse.transactions ? transactionsResponse.transactions.length : 0;
        document.getElementById('total-transactions').textContent = totalTransactions;
        
    } catch (error) {
        console.error('Error loading stats:', error);
        // Set default values on error
        document.getElementById('total-users').textContent = '0';
        document.getElementById('total-banks').textContent = '0';
        document.getElementById('total-transactions').textContent = '0';
        document.getElementById('total-balance').textContent = Utils.formatCurrency(0);
    }
}

async function loadRecentTransactions() {
    const tbody = document.getElementById('recent-transactions');
    Utils.showLoading('recent-transactions');
    
    try {
        const response = await API.get(API_CONFIG.ENDPOINTS.TRANSACTIONS);

        if (response.transactions && response.transactions.length > 0) {
            // Sort by created_at desc and take first 5
            const recentTransactions = response.transactions
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5);
            
            tbody.innerHTML = recentTransactions.map(transaction => `
                <tr>
                    <td>${transaction.id}</td>
                    <td>${transaction.username || 'N/A'}</td>
                    <td>${Utils.getTransactionType(transaction.type)}</td>
                    <td>${Utils.formatCurrency(transaction.amount)}</td>
                    <td>${Utils.getStatusBadge(transaction.status)}</td>
                    <td>${Utils.formatDate(transaction.created_at)}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Không có giao dịch nào</td></tr>';
        }
    } catch (error) {
        console.error('Error loading recent transactions:', error);
        Utils.showError('recent-transactions', error.message);
    }
}

async function loadRecentUsers() {
    const tbody = document.getElementById('recent-users');
    Utils.showLoading('recent-users');
    
    try {
        const response = await API.get(API_CONFIG.ENDPOINTS.USERS);
        
        if (response.data && response.data.length > 0) {
            // Sort by created_at desc and take first 5
            const recentUsers = response.data
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5);
            
            tbody.innerHTML = recentUsers.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.display_name || 'N/A'}</td>
                    <td>${Utils.formatCurrency(user.balance || 0)}</td>
                    <td>${user.vip || 0}</td>
                    <td>${Utils.formatDate(user.created_at)}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Không có user nào</td></tr>';
        }
    } catch (error) {
        console.error('Error loading recent users:', error);
        Utils.showError('recent-users', error.message);
    }
}

// Update API status in header
function updateApiStatus() {
    const apiUrlElement = document.getElementById('apiUrl');
    if (apiUrlElement) {
        apiUrlElement.textContent = API.getApiUrl();
    }
}
