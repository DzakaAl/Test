ALTER TABLE `pembayaran`
  ADD COLUMN `Periode_Tahun` INT(4) NOT NULL AFTER `ID_Reservasi`,
  ADD COLUMN `Periode_Bulan` INT(2) NOT NULL AFTER `Periode_Tahun`,
  ADD COLUMN `Tanggal_Jatuh_Tempo` DATE DEFAULT NULL AFTER `Tanggal_Bayar`,
  ADD COLUMN `Metode_Pembayaran` VARCHAR(50) DEFAULT NULL AFTER `Jumlah`,
  ADD COLUMN `Nomor_Referensi` VARCHAR(100) DEFAULT NULL AFTER `Metode_Pembayaran`;
