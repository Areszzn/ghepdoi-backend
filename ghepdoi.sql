/*
 Navicat Premium Dump SQL

 Source Server         : 127.0.0.1
 Source Server Type    : MariaDB
 Source Server Version : 100432 (10.4.32-MariaDB)
 Source Host           : localhost:3306
 Source Schema         : ghepdoi

 Target Server Type    : MariaDB
 Target Server Version : 100432 (10.4.32-MariaDB)
 File Encoding         : 65001

 Date: 04/08/2025 13:25:45
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for bank
-- ----------------------------
DROP TABLE IF EXISTS `bank`;
CREATE TABLE `bank`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `tentaikhoan` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `sotaikhoan` int(100) NOT NULL,
  `tennganhang` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of bank
-- ----------------------------
INSERT INTO `bank` VALUES (1, 1, 'zxczxcz', 34324324, 'dfdfsf', '2025-08-04 01:53:06', '2025-08-04 01:53:06');

-- ----------------------------
-- Table structure for setting
-- ----------------------------
DROP TABLE IF EXISTS `setting`;
CREATE TABLE `setting`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `name`(`name`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of setting
-- ----------------------------
INSERT INTO `setting` VALUES (1, 'name_app', 'GHÉP ĐÔI THẦN TỐC', '2025-08-04 02:59:29', '2025-08-04 03:41:10');
INSERT INTO `setting` VALUES (2, 'logo_app', 'https://cdn.anh.moe/f/qixygr08.png-webp', '2025-08-04 02:59:50', '2025-08-04 04:01:34');
INSERT INTO `setting` VALUES (3, 'bg_login', 'https://cdn.anh.moe/f/upM2NKjm.png-webp', '2025-08-04 03:01:00', '2025-08-04 03:45:35');
INSERT INTO `setting` VALUES (4, 'bg_reg', 'https://cdn.anh.moe/f/124ZRa.png-webp', '2025-08-04 03:01:09', '2025-08-04 04:05:13');

-- ----------------------------
-- Table structure for transactions
-- ----------------------------
DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `bank_account_id` int(11) NULL DEFAULT NULL,
  `type` enum('deposit','withdrawal') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `amount` decimal(15, 2) NOT NULL,
  `status` enum('pending','processing','completed','cancelled','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'pending',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `reference_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `external_transaction_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `reference_number`(`reference_number`) USING BTREE,
  INDEX `user_id`(`user_id`) USING BTREE,
  INDEX `transactions_ibfk_2`(`bank_account_id`) USING BTREE,
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`bank_account_id`) REFERENCES `bank` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of transactions
-- ----------------------------
INSERT INTO `transactions` VALUES (3, 1, 1, 'withdrawal', 100000.00, 'completed', 'Thẻ <p> không chiếm đủ chiều ngang vì không có độ rộng (w-full) hoặc cha của nó không đủ rộng để hiển thị canh phải rõ ràng.', 'TXN1754248004659QCAFW3', NULL, '2025-08-04 02:06:44', '2025-08-04 04:33:22', '2025-08-04 04:33:22');
INSERT INTO `transactions` VALUES (5, 1, 1, 'withdrawal', 10000000.00, 'cancelled', 'Thẻ <p> k', 'TXN17542480004659QCAFW3', NULL, '2025-08-04 02:06:44', '2025-08-04 04:51:05', '2025-08-04 02:09:44');
INSERT INTO `transactions` VALUES (6, 1, 1, 'withdrawal', 10000000.00, 'cancelled', 'Thẻ <p>', 'TXN1754248004659QCAFW30', NULL, '2025-08-04 02:06:44', '2025-08-04 02:55:25', '2025-08-04 02:09:44');
INSERT INTO `transactions` VALUES (7, 1, 1, 'withdrawal', 10000000.00, 'failed', 'Thẻ <p> không chiếm đủ chiều ngang vì không có độ rộng (w-full) hoặc cha của nó không đủ rộng để hiển thị canh phải rõ ràng.', 'TXN17542480004659QCAFW30', NULL, '2025-08-04 02:06:44', '2025-08-04 02:52:54', '2025-08-04 02:09:44');
INSERT INTO `transactions` VALUES (8, 1, 1, 'withdrawal', 8888.00, 'cancelled', NULL, 'TXN1754257212099S37D6D', NULL, '2025-08-04 04:40:12', '2025-08-04 04:51:01', NULL);
INSERT INTO `transactions` VALUES (9, 1, 1, 'withdrawal', 8888.00, 'cancelled', NULL, 'TXN17542576276191KT4WX', NULL, '2025-08-04 04:47:07', '2025-08-04 04:47:18', NULL);
INSERT INTO `transactions` VALUES (10, 1, 1, 'withdrawal', 6666.00, 'cancelled', NULL, 'TXN17542576569552JA53T', NULL, '2025-08-04 04:47:36', '2025-08-04 04:50:57', NULL);
INSERT INTO `transactions` VALUES (11, 1, 1, 'withdrawal', 2222.00, 'cancelled', NULL, 'TXN1754257833070S8C264', NULL, '2025-08-04 04:50:33', '2025-08-04 04:50:56', NULL);

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `display_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `is_verified` tinyint(1) NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE CURRENT_TIMESTAMP,
  `balance` decimal(15, 0) NULL DEFAULT 0,
  `vip` int(11) NULL DEFAULT 0,
  `trust` int(11) NULL DEFAULT 100,
  `role` int(11) NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `username`(`username`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (1, 'admin', '$2b$12$MoThFjJsR28kQLEDmGv86eFF2P8MQSExaGQE2zJZq3nWYhGyyWORu', 'admin', 0, '2025-08-04 00:03:37', '2025-08-04 13:07:01', 10017776, 1, 50, 1);
INSERT INTO `users` VALUES (2, 'titatitu', '$2b$12$CCbWXuu4.AVZGC1eRP7y.eGTHShsJ3Kb4HIy7z8AgVOKRjPXgx.4C', 'titatitu', 0, '2025-08-04 13:05:28', '2025-08-04 13:05:28', 0, 0, 100, 0);

SET FOREIGN_KEY_CHECKS = 1;
