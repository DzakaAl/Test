-- Database: kost_patemon
-- Fresh Database Structure for Kost Patemon Management System
-- Created: July 20, 2025

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `kost_patemon` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `kost_patemon`;

-- ============================================
-- Table: kamar
-- ============================================
DROP TABLE IF EXISTS `kamar`;
CREATE TABLE `kamar` (
  `No_Kamar` INT(10) NOT NULL AUTO_INCREMENT,
  `Nama_Kamar` VARCHAR(50) NOT NULL,
  `Letak` VARCHAR(50) NOT NULL,
  `Ketersediaan` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`No_Kamar`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `kamar` (`Nama_Kamar`, `Letak`, `Ketersediaan`) VALUES
('Kamar Mawar', 'Lantai 2', 1),
('Kamar Melati', 'Lantai 2', 1),
('Kamar Kenanga', 'Lantai 2', 1),
('Kamar Anggrek', 'Lantai 3', 1),
('Kamar Kaktus', 'Lantai 3', 1);

-- ============================================
-- Table: user
-- ============================================
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `Nama` VARCHAR(70) NOT NULL,
  `No_telp` VARCHAR(20) NOT NULL,
  `Alamat` VARCHAR(200) NOT NULL,
  `Email` VARCHAR(100) NOT NULL,
  `Password` VARCHAR(255) NOT NULL,
  `Foto` VARCHAR(255) DEFAULT NULL,
  `Role` ENUM('admin','penyewa') NOT NULL DEFAULT 'penyewa',
  PRIMARY KEY (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Default Admin
INSERT INTO `user` (`Nama`, `No_telp`, `Alamat`, `Email`, `Password`, `Role`) VALUES
('Admin Kost Patemon', '088216003562', 'Jl. Serayu IV No. 13 03/01 Desa Patemon, Kecamatan Gombong, Kabupaten Kebumen', 'admin@kost.com', '$2a$10$EyQsPQjIHhbFcxUR0ZSy2OQ.t2hFieZk9iWjb8TrO0UaofXpW3Crq', 'admin');

-- ============================================
-- Table: reservasi
-- ============================================
DROP TABLE IF EXISTS `reservasi`;
CREATE TABLE `reservasi` (
  `ID_Reservasi` INT(11) NOT NULL AUTO_INCREMENT,
  `No_Kamar` INT(10) NOT NULL,
  `Email` VARCHAR(100) NOT NULL,
  `Tanggal_Reservasi` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Status` ENUM('Telat/Belum Bayar','Aktif/Lunas','Keluar') NOT NULL DEFAULT 'Telat/Belum Bayar',
  PRIMARY KEY (`ID_Reservasi`),
  KEY `idx_no_kamar` (`No_Kamar`),
  KEY `idx_email` (`Email`),
  KEY `idx_status` (`Status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- Table: pembayaran
-- ============================================
DROP TABLE IF EXISTS `pembayaran`;
CREATE TABLE `pembayaran` (
  `ID_Pembayaran` INT(11) NOT NULL AUTO_INCREMENT,
  `ID_Reservasi` INT(11) NOT NULL,
  `Tanggal_Bayar` DATETIME DEFAULT NULL,
  `Jumlah` DECIMAL(12,2) NOT NULL DEFAULT 1200000.00,
  `Bukti_Pembayaran` VARCHAR(255) DEFAULT NULL,
  `Status` ENUM('Belum Bayar','Menunggu','Diterima') NOT NULL DEFAULT 'Belum Bayar',
  `Created_At` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `Updated_At` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Pembayaran`),
  KEY `idx_reservasi` (`ID_Reservasi`),
  KEY `idx_status` (`Status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- Table: tmp
-- ============================================
DROP TABLE IF EXISTS `tmp`;
CREATE TABLE `tmp` (
  `ID_Tmp` INT(11) NOT NULL AUTO_INCREMENT,
  `Nama` VARCHAR(70) NOT NULL,
  `No_telp` VARCHAR(20) NOT NULL,
  `Alamat` VARCHAR(200) NOT NULL,
  `Email` VARCHAR(100) NOT NULL,
  `Password` VARCHAR(255) NOT NULL,
  `Foto` VARCHAR(255) DEFAULT NULL,
  `Role` ENUM('admin','penyewa') NOT NULL DEFAULT 'penyewa',
  `No_Kamar` INT(10) NOT NULL,
  `Bukti_Pembayaran` VARCHAR(255) DEFAULT NULL,
  `Created_At` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `Updated_At` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Tmp`),
  UNIQUE KEY `unique_email_tmp` (`Email`),
  KEY `idx_no_kamar` (`No_Kamar`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- Table: ulasan
-- ============================================
DROP TABLE IF EXISTS `ulasan`;
CREATE TABLE `ulasan` (
  `No_Kamar` INT(10) NOT NULL,
  `Email` VARCHAR(100) NOT NULL,
  `Tanggal` DATE NOT NULL DEFAULT CURRENT_DATE,
  `Rating` INT(1) NOT NULL CHECK (`Rating` BETWEEN 1 AND 5),
  `Ulasan` VARCHAR(1000) NOT NULL,
  PRIMARY KEY (`No_Kamar`,`Email`),
  KEY `idx_email` (`Email`),
  KEY `idx_rating` (`Rating`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- Table: user_tokens
-- ============================================
DROP TABLE IF EXISTS `user_tokens`;
CREATE TABLE `user_tokens` (
  `ID_Token` INT(11) NOT NULL AUTO_INCREMENT,
  `Email` VARCHAR(100) NOT NULL,
  `Token` VARCHAR(255) NOT NULL,
  `Expires_At` DATETIME NOT NULL,
  `Used` TINYINT(1) NOT NULL DEFAULT 0,
  `Created_At` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Token`),
  UNIQUE KEY `unique_token` (`Token`),
  KEY `idx_email` (`Email`),
  KEY `idx_token_expires` (`Token`,`Expires_At`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- Foreign Keys
-- ============================================
SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE `reservasi`
  ADD CONSTRAINT `fk_reservasi_kamar` FOREIGN KEY (`No_Kamar`) REFERENCES `kamar` (`No_Kamar`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reservasi_user` FOREIGN KEY (`Email`) REFERENCES `user` (`Email`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `pembayaran`
  ADD CONSTRAINT `fk_pembayaran_reservasi` FOREIGN KEY (`ID_Reservasi`) REFERENCES `reservasi` (`ID_Reservasi`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tmp`
  ADD CONSTRAINT `fk_tmp_kamar` FOREIGN KEY (`No_Kamar`) REFERENCES `kamar` (`No_Kamar`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ulasan`
  ADD CONSTRAINT `fk_ulasan_kamar` FOREIGN KEY (`No_Kamar`) REFERENCES `kamar` (`No_Kamar`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ulasan_user` FOREIGN KEY (`Email`) REFERENCES `user` (`Email`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user_tokens`
  ADD CONSTRAINT `fk_user_tokens_user` FOREIGN KEY (`Email`) REFERENCES `user` (`Email`) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
