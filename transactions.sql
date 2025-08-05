/*
 Navicat Premium Dump SQL

 Source Server         : NSO VIETNIX
 Source Server Type    : MariaDB
 Source Server Version : 101113 (10.11.13-MariaDB-0ubuntu0.24.04.1-log)
 Source Host           : 14.225.213.140:3306
 Source Schema         : ghepdoi

 Target Server Type    : MariaDB
 Target Server Version : 101113 (10.11.13-MariaDB-0ubuntu0.24.04.1-log)
 File Encoding         : 65001

 Date: 04/08/2025 14:24:43
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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
  UNIQUE INDEX `reference_number`(`reference_number` ASC) USING BTREE,
  INDEX `user_id`(`user_id` ASC) USING BTREE,
  INDEX `transactions_ibfk_2`(`bank_account_id` ASC) USING BTREE,
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`bank_account_id`) REFERENCES `bank` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

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
INSERT INTO `transactions` VALUES (12, 1, 1, 'withdrawal', 10017776.00, 'failed', 'abc xyz', 'TXN1754291797440UQW55O', NULL, '2025-08-04 14:16:38', '2025-08-04 14:18:23', '2025-08-04 14:18:07');

SET FOREIGN_KEY_CHECKS = 1;
