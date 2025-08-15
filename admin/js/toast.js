// Toast Notification System
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    }

    show(type, title, message, duration = 5000) {
        const toast = this.createToast(type, title, message, duration);
        this.container.appendChild(toast);
        this.toasts.push(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Auto remove
        if (duration > 0) {
            this.startProgress(toast, duration);
            setTimeout(() => {
                this.remove(toast);
            }, duration);
        }

        return toast;
    }

    createToast(type, title, message, duration) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="toastManager.remove(this.parentElement)">×</button>
            ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
        `;

        return toast;
    }

    getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-times-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }

    startProgress(toast, duration) {
        const progressBar = toast.querySelector('.toast-progress');
        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.style.transition = `width ${duration}ms linear`;
            setTimeout(() => {
                progressBar.style.width = '0%';
            }, 10);
        }
    }

    remove(toast) {
        if (toast && toast.parentElement) {
            toast.classList.remove('show');
            toast.classList.add('hide');
            
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
                this.toasts = this.toasts.filter(t => t !== toast);
            }, 300);
        }
    }

    success(title, message, duration = 5000) {
        return this.show('success', title, message, duration);
    }

    error(title, message, duration = 7000) {
        return this.show('error', title, message, duration);
    }

    warning(title, message, duration = 6000) {
        return this.show('warning', title, message, duration);
    }

    info(title, message, duration = 5000) {
        return this.show('info', title, message, duration);
    }

    // Clear all toasts
    clear() {
        this.toasts.forEach(toast => this.remove(toast));
    }
}

// Initialize toast manager
const toastManager = new ToastManager();

// Enhanced Utils with toast notifications
const Toast = {
    success: (message, title = 'Thành công') => {
        toastManager.success(title, message);
    },
    
    error: (message, title = 'Lỗi') => {
        toastManager.error(title, message);
    },
    
    warning: (message, title = 'Cảnh báo') => {
        toastManager.warning(title, message);
    },
    
    info: (message, title = 'Thông tin') => {
        toastManager.info(title, message);
    },

    // API response handlers
    handleSuccess: (message, title = 'Thành công') => {
        toastManager.success(title, message);
    },

    handleError: (error, title = 'Lỗi') => {
        let message = 'Đã xảy ra lỗi không xác định';
        
        if (typeof error === 'string') {
            message = error;
        } else if (error && error.message) {
            message = error.message;
        } else if (error && error.error) {
            message = error.error;
        }
        
        toastManager.error(title, message);
    },

    // Loading toast (persistent until manually closed)
    loading: (message, title = 'Đang xử lý...') => {
        return toastManager.info(title, message, 0); // 0 = no auto-close
    },

    // Update existing toast
    update: (toast, type, title, message) => {
        if (toast && toast.querySelector) {
            const titleEl = toast.querySelector('.toast-title');
            const messageEl = toast.querySelector('.toast-message');
            const iconEl = toast.querySelector('.toast-icon');
            
            if (titleEl) titleEl.textContent = title;
            if (messageEl) messageEl.textContent = message;
            if (iconEl) iconEl.innerHTML = toastManager.getIcon(type);
            
            // Update toast class
            toast.className = `toast ${type} show`;
        }
    }
};

// Export for global use
window.Toast = Toast;
window.toastManager = toastManager;
