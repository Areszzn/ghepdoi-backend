const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'deposit_withdrawal_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection and create database if it doesn't exist
const testConnection = async () => {
  try {
    // First try to connect to the specific database
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (error) {
    if (error.code === 'ER_BAD_DB_ERROR') {
      // Database doesn't exist, create it
      console.log('Database does not exist, creating it...');
      try {
        const tempConfig = { ...dbConfig };
        delete tempConfig.database; // Connect without specifying database
        const tempPool = mysql.createPool(tempConfig);
        const tempConnection = await tempPool.getConnection();

        await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        console.log(`Database '${dbConfig.database}' created successfully`);

        tempConnection.release();
        tempPool.end();

        // Now try connecting to the created database
        const connection = await pool.getConnection();
        console.log('Database connected successfully');
        connection.release();
      } catch (createError) {
        console.error('Failed to create database:', createError.message);
        process.exit(1);
      }
    } else {
      console.error('Database connection failed:', error.message);
      process.exit(1);
    }
  }
};

// Initialize database tables
const initializeDatabase = async () => {
  try {
    const connection = await pool.getConnection();

    // Drop existing tables in correct order (child tables first)
    await connection.execute('DROP TABLE IF EXISTS transactions');
    await connection.execute('DROP TABLE IF EXISTS bank_accounts');
    await connection.execute('DROP TABLE IF EXISTS users');

    // Create users table with new schema
    await connection.execute(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create bank_accounts table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        routing_number VARCHAR(20),
        account_type ENUM('checking', 'savings') DEFAULT 'checking',
        is_primary BOOLEAN DEFAULT FALSE,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_account (user_id, account_number, bank_name)
      )
    `);

    // Create transactions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        bank_account_id INT,
        type ENUM('deposit', 'withdrawal') NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        status ENUM('pending', 'processing', 'completed', 'cancelled', 'failed') DEFAULT 'pending',
        description TEXT,
        reference_number VARCHAR(100) UNIQUE,
        external_transaction_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
      )
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    cover_image_url TEXT,
    location VARCHAR(255),
    city VARCHAR(100),
    province VARCHAR(100),
    age INTEGER,
    gender VARCHAR(20),
    interests JSON,
    is_public BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
    `);
await connection.execute(`
-- Create indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_profiles_province ON profiles(province);
CREATE INDEX idx_profiles_is_public ON profiles(is_public);

-- Insert sample data
INSERT INTO profiles (user_id, display_name, bio, avatar_url, location, city, province, age, gender, interests, is_public, is_verified, follower_count, following_count, post_count) VALUES
(1, 'Nguyễn Văn An', 'Yêu thích du lịch và nhiếp ảnh', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face', 'Quận 1, TP.HCM', 'Hồ Chí Minh', 'Hồ Chí Minh', 28, 'Nam', '["Du lịch", "Nhiếp ảnh", "Âm nhạc"]', true, true, 1250, 890, 45),
(2, 'Trần Thị Bình', 'Đam mê nấu ăn và làm bánh', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face', 'Quận Ba Đình, Hà Nội', 'Hà Nội', 'Hà Nội', 25, 'Nữ', '["Du lịch", "Nhiếp ảnh", "Âm nhạc"]', true, true, 2100, 1200, 67),
(3, 'Lê Văn Cường', 'Lập trình viên và game thủ', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face', 'Quận Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Đà Nẵng', 30, 'Nam', '["Du lịch", "Nhiếp ảnh", "Âm nhạc"]', true, false, 890, 650, 23),
(4, 'Phạm Thị Dung', 'Giáo viên và yêu thích đọc sách', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face', 'Quận Ninh Kiều, Cần Thơ', 'Cần Thơ', 'Cần Thơ', 32, 'Nữ', '["Du lịch", "Nhiếp ảnh", "Âm nhạc"]', true, true, 1580, 920, 89),
(5, 'Hoàng Văn Em', 'Kinh doanh online và marketing', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face', 'Quận Hồng Bàng, Hải Phòng', 'Hải Phòng', 'Hải Phòng', 27, 'Nam', '["Du lịch", "Nhiếp ảnh", "Âm nhạc"]', true, true, 3200, 1500, 112),
(6, 'Vũ Thị Phương', 'Bác sĩ và yêu thích yoga', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face', 'TP. Nha Trang, Khánh Hòa', 'Nha Trang', 'Khánh Hòa', 29, 'Nữ', '["Du lịch", "Nhiếp ảnh", "Âm nhạc"]', true, true, 2800, 1100, 78),
(7, 'Đỗ Văn Giang', 'Nhiếp ảnh gia và travel blogger', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face', 'TP. Huế, Thừa Thiên Huế', 'Huế', 'Thừa Thiên Huế', 31, 'Nam', '["Du lịch", "Nhiếp ảnh", "Âm nhạc"]', true, true, 4500, 2200, 156),
(8, 'Bùi Thị Hoa', 'Designer và yêu thích nghệ thuật', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=face', 'TP. Vũng Tàu, Bà Rịa - Vũng Tàu', 'Vũng Tàu', 'Bà Rịa - Vũng Tàu', 26, 'Nữ', '["Du lịch", "Nhiếp ảnh", "Âm nhạc"]', true, false, 1900, 850, 92),
(9, 'Nguyễn Thị Lan', 'Chuyên gia tài chính và đầu tư', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face', 'Quận 3, TP.HCM', 'Hồ Chí Minh', 'Hồ Chí Minh', 33, 'Nữ', '["Du lịch", "Nhiếp ảnh", "Âm nhạc"]', true, true, 5200, 1800, 134),
(10, 'Trần Văn Minh', 'Kỹ sư xây dựng và kiến trúc sư', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face', 'Quận Cầu Giấy, Hà Nội', 'Hà Nội', 'Hà Nội', 35, 'Nam', '["Du lịch", "Nhiếp ảnh", "Âm nhạc"]', true, true, 2700, 1300, 67),
(11, 'Lê Thị Nga', 'Luật sư và nhà hoạt động xã hội', 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face', 'Quận Thanh Khê, Đà Nẵng', 'Đà Nẵng', 'Đà Nẵng', 29, 'Nữ', '["Du lịch", "Nhiếp ảnh", "Âm nhạc"]', true, true, 3800, 1600, 89),
(12, 'Phạm Văn Ơn', 'Nông dân và chuyên gia nông nghiệp', 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=400&fit=crop&crop=face', 'Huyện Cờ Đỏ, Cần Thơ', 'Cần Thơ', 'Cần Thơ', 45, 'Nam', '["Du lịch", "Nhiếp ảnh", "Âm nhạc"]', true, false, 1200, 600, 34);
`);
    console.log('Database tables initialized successfully');
    connection.release();
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
};

module.exports = {
  pool,
  testConnection,
  initializeDatabase
};
