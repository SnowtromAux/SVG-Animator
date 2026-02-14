-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 14, 2026 at 01:14 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `svg_project_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `animation`
--

CREATE TABLE `animation` (
  `id` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `user_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL DEFAULT '',
  `starting_svg` mediumtext DEFAULT NULL,
  `animation_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`animation_settings`)),
  `duration` double UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `animation_segment`
--

CREATE TABLE `animation_segment` (
  `id` int(10) UNSIGNED NOT NULL,
  `animation_id` int(10) UNSIGNED NOT NULL,
  `step` int(10) UNSIGNED NOT NULL,
  `animation_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`animation_data`)),
  `easing` varchar(100) NOT NULL DEFAULT '',
  `duration` double UNSIGNED NOT NULL DEFAULT 0,
  `start_at` double UNSIGNED NOT NULL DEFAULT 0,
  `end_at` double UNSIGNED NOT NULL DEFAULT 0,
  `element_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `post`
--

CREATE TABLE `post` (
  `id` int(10) UNSIGNED NOT NULL,
  `animation_id` int(10) UNSIGNED NOT NULL,
  `description` text DEFAULT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `likes_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `dislikes_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reaction`
--

CREATE TABLE `reaction` (
  `id` int(10) UNSIGNED NOT NULL,
  `post_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `type` enum('like','dislike') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Triggers `reaction`
--
DELIMITER $$
CREATE TRIGGER `reaction_after_delete` AFTER DELETE ON `reaction` FOR EACH ROW BEGIN
    IF OLD.type = 'like' THEN
        UPDATE post
        SET likes_count = likes_count - 1
        WHERE id = OLD.post_id;
    ELSEIF OLD.type = 'dislike' THEN
        UPDATE post
        SET dislikes_count = dislikes_count - 1
        WHERE id = OLD.post_id;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `reaction_after_insert` AFTER INSERT ON `reaction` FOR EACH ROW BEGIN
    IF NEW.type = 'like' THEN
        UPDATE post
        SET likes_count = likes_count + 1
        WHERE id = NEW.post_id;
    ELSEIF NEW.type = 'dislike' THEN
        UPDATE post
        SET dislikes_count = dislikes_count + 1
        WHERE id = NEW.post_id;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `reaction_after_update` AFTER UPDATE ON `reaction` FOR EACH ROW BEGIN
    -- махаме старата реакция
    IF OLD.type = 'like' THEN
        UPDATE post
        SET likes_count = likes_count - 1
        WHERE id = OLD.post_id;
    ELSEIF OLD.type = 'dislike' THEN
        UPDATE post
        SET dislikes_count = dislikes_count - 1
        WHERE id = OLD.post_id;
    END IF;

    -- добавяме новата реакция
    IF NEW.type = 'like' THEN
        UPDATE post
        SET likes_count = likes_count + 1
        WHERE id = NEW.post_id;
    ELSEIF NEW.type = 'dislike' THEN
        UPDATE post
        SET dislikes_count = dislikes_count + 1
        WHERE id = NEW.post_id;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(10) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `animation`
--
ALTER TABLE `animation`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_animation_user` (`user_id`);

--
-- Indexes for table `animation_segment`
--
ALTER TABLE `animation_segment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_animation_segment_animation` (`animation_id`);

--
-- Indexes for table `post`
--
ALTER TABLE `post`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_animation_id` (`animation_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `reaction`
--
ALTER TABLE `reaction`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_user_post` (`post_id`,`user_id`),
  ADD KEY `idx_post_id` (`post_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `animation`
--
ALTER TABLE `animation`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `animation_segment`
--
ALTER TABLE `animation_segment`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `post`
--
ALTER TABLE `post`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- AUTO_INCREMENT for table `reaction`
--
ALTER TABLE `reaction`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `animation`
--
ALTER TABLE `animation`
  ADD CONSTRAINT `fk_animation_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `animation_segment`
--
ALTER TABLE `animation_segment`
  ADD CONSTRAINT `fk_animation_segment_animation` FOREIGN KEY (`animation_id`) REFERENCES `animation` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `post`
--
ALTER TABLE `post`
  ADD CONSTRAINT `fk_post_animation` FOREIGN KEY (`animation_id`) REFERENCES `animation` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reaction`
--
ALTER TABLE `reaction`
  ADD CONSTRAINT `fk_reaction_post` FOREIGN KEY (`post_id`) REFERENCES `post` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
