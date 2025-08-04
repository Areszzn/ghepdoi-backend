// Authentication functions
const Auth = {
    // Check if user is authenticated
    isAuthenticated: () => {
        const token = API.getToken();
        return token !== null;
    },
    
    // Login function
    login: async (username, password) => {
        try {
            const response = await API.post(API_CONFIG.ENDPOINTS.LOGIN, {
                username,
                password
            });

            if (response.token) {
                API.setToken(response.token);
                return { success: true };
            }

            return { success: false, error: 'Login failed' };
        } catch (error) {
            console.error('Login error:', error);

            // Handle specific error messages
            if (error.message && error.message.includes('Access denied')) {
                return { success: false, error: 'Bạn không có quyền truy cập.' };
            } else if (error.message && error.message.includes('Invalid credentials')) {
                return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng.' };
            }

            return { success: false, error: 'Đăng nhập thất bại. Vui lòng thử lại.' };
        }
    },
    
    // Logout function
    logout: () => {
        API.removeToken();
        window.location.href = 'login.html';
    },
    
    // Check authentication on page load
    checkAuth: () => {
        if (!Auth.isAuthenticated()) {
            // Redirect to login page if not authenticated
            window.location.href = 'login.html';
        }
    }
};

// Global logout function
function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        Auth.logout();
    }
}

// Check authentication when page loads (except for login page)
document.addEventListener('DOMContentLoaded', () => {
    // Don't check auth on login page
    if (!window.location.pathname.includes('login.html')) {
        Auth.checkAuth();
    }
});
