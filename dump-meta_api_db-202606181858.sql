-- MySQL dump 10.13  Distrib 8.4.9, for Linux (x86_64)
--
-- Host: localhost    Database: meta_api_db
-- ------------------------------------------------------
-- Server version	8.4.9-0ubuntu0.26.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `google_ads_snapshots`
--

DROP TABLE IF EXISTS `google_ads_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `google_ads_snapshots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` varchar(100) NOT NULL,
  `date_preset` varchar(50) NOT NULL,
  `spend` decimal(15,2) DEFAULT '0.00',
  `impressions` int DEFAULT '0',
  `clicks` int DEFAULT '0',
  `conversions` decimal(15,2) DEFAULT '0.00',
  `graph_data` json DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customer_preset` (`customer_id`,`date_preset`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `google_ads_snapshots`
--

LOCK TABLES `google_ads_snapshots` WRITE;
/*!40000 ALTER TABLE `google_ads_snapshots` DISABLE KEYS */;
/*!40000 ALTER TABLE `google_ads_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_accounts`
--

DROP TABLE IF EXISTS `linkedin_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_accounts` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(50) DEFAULT 'ACTIVE',
  `currency` varchar(10) DEFAULT 'INR',
  `total_spent` decimal(15,2) DEFAULT '0.00',
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_accounts`
--

LOCK TABLES `linkedin_accounts` WRITE;
/*!40000 ALTER TABLE `linkedin_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_ad_accounts`
--

DROP TABLE IF EXISTS `linkedin_ad_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_ad_accounts` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(50) DEFAULT 'ACTIVE',
  `currency` varchar(10) DEFAULT 'INR',
  `total_spent` decimal(15,2) DEFAULT '0.00',
  `last_synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_ad_accounts`
--

LOCK TABLES `linkedin_ad_accounts` WRITE;
/*!40000 ALTER TABLE `linkedin_ad_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_ad_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_ad_analytics_daily`
--

DROP TABLE IF EXISTS `linkedin_ad_analytics_daily`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_ad_analytics_daily` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ad_id` varchar(100) NOT NULL,
  `account_id` varchar(100) NOT NULL,
  `date_start` date NOT NULL,
  `spend` decimal(15,2) DEFAULT '0.00',
  `impressions` int DEFAULT '0',
  `clicks` int DEFAULT '0',
  `conversions` int DEFAULT '0',
  `ctr` decimal(5,2) DEFAULT '0.00',
  `cpc` decimal(15,4) DEFAULT '0.0000',
  `cpm` decimal(15,4) DEFAULT '0.0000',
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_li_ad_date` (`ad_id`,`date_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_ad_analytics_daily`
--

LOCK TABLES `linkedin_ad_analytics_daily` WRITE;
/*!40000 ALTER TABLE `linkedin_ad_analytics_daily` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_ad_analytics_daily` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_ad_drafts`
--

DROP TABLE IF EXISTS `linkedin_ad_drafts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_ad_drafts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_id` varchar(100) NOT NULL,
  `campaign_id` varchar(100) NOT NULL,
  `creative_id` varchar(100) NOT NULL,
  `ad_name` varchar(255) NOT NULL,
  `ad_format` varchar(50) NOT NULL,
  `draft_payload` json NOT NULL,
  `preview_payload` json DEFAULT NULL,
  `status` varchar(20) DEFAULT 'DRAFT',
  `creation_source` varchar(20) DEFAULT 'LOCAL_DRAFT',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lad_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_ad_drafts`
--

LOCK TABLES `linkedin_ad_drafts` WRITE;
/*!40000 ALTER TABLE `linkedin_ad_drafts` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_ad_drafts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_ads`
--

DROP TABLE IF EXISTS `linkedin_ads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_ads` (
  `id` varchar(100) NOT NULL,
  `campaign_id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_ads`
--

LOCK TABLES `linkedin_ads` WRITE;
/*!40000 ALTER TABLE `linkedin_ads` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_ads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_api_tokens`
--

DROP TABLE IF EXISTS `linkedin_api_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_api_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `access_token` text NOT NULL,
  `refresh_token` text,
  `expires_in` int DEFAULT NULL,
  `refresh_token_expires_in` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_api_tokens`
--

LOCK TABLES `linkedin_api_tokens` WRITE;
/*!40000 ALTER TABLE `linkedin_api_tokens` DISABLE KEYS */;
INSERT INTO `linkedin_api_tokens` VALUES (1,'AQXZOSIj5Xy2guESTSXeAkLE_VYsLQQe41gNy-lNNBVyHudgHWAJzQNjY_biMWVTB8duxAD8urXOAQSv8Ku18M6pHoX55SiWBLpEmATBdyxmWJczmuD4Y1SZeWtk53u2IdC_4UQ6Ir_M9WxC6UAQTD6ou0nVvmL4IvDMgRnDc1G4bby8XWSz8x-WR6o-JeFBWdg90gCV18RES1EyJcNL4qTtftGHjXl_y_NFcbCCrVoRedQ2qcrmzDLXQCf3t-SUbNEjjaspgoY8lkHWGLnjjIQq0Z2iN3C7k5wJHNIWUj_jiKKkkPiW2_GRwZGI6SoAGFUNa95ljTO2VzkoJntfPM1j43FVjA','AQWAL3rh-kQ7YQlkcdRbSyx4pRgQmjJEfXsUfiC8-ZXEHk6TnqSwshXGGKKtC2mM3UiHLrcp_y208BtDbP1nNpheJLC8LWf4g49rHNLU1FknTvQxVG5bjVSt9SBkl-ZXWY02K6pOglacxGfG5CtKJZVHCfKYRfafYyRTs8mAINoL6LlAYmQvRvkBe_OUcsDWZfLYMnMjPViLBQs47gXmL0_Ec481tj2ErVRdTQNN2g9aqkBmoTazpBDyz3Ya3S2Hhz7Uoc_7uh9gc48bGTRY4usr_y-Mv5M-RdBTgqaQliCUnbPIhoTQoeyiklUCoxxsWA4WFAVVqFwWmDScyB-jXhotr0ZE7Q',5184000,31536000,'2026-06-16 11:01:49','2026-06-16 11:01:49');
/*!40000 ALTER TABLE `linkedin_api_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_assets`
--

DROP TABLE IF EXISTS `linkedin_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_assets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_urn` varchar(255) NOT NULL,
  `account_id` varchar(100) DEFAULT NULL,
  `campaign_id` varchar(100) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `media_type` varchar(50) DEFAULT NULL,
  `upload_status` varchar(50) DEFAULT 'PENDING',
  `upload_url` text,
  `linkedin_asset_type` varchar(100) DEFAULT NULL,
  `linkedin_asset_status` varchar(100) DEFAULT NULL,
  `linkedin_asset_url` text,
  `thumbnail_url` text,
  `linkedin_media_library_id` varchar(255) DEFAULT NULL,
  `linkedin_raw_response` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_urn` (`asset_urn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_assets`
--

LOCK TABLES `linkedin_assets` WRITE;
/*!40000 ALTER TABLE `linkedin_assets` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_assets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_audience_insights`
--

DROP TABLE IF EXISTS `linkedin_audience_insights`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_audience_insights` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_id` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `key_name` varchar(255) NOT NULL,
  `percentage` decimal(5,2) DEFAULT '0.00',
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_li_audience_key` (`account_id`,`category`,`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_audience_insights`
--

LOCK TABLES `linkedin_audience_insights` WRITE;
/*!40000 ALTER TABLE `linkedin_audience_insights` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_audience_insights` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_campaign_groups`
--

DROP TABLE IF EXISTS `linkedin_campaign_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_campaign_groups` (
  `id` varchar(100) NOT NULL,
  `account_id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `creation_source` varchar(50) DEFAULT 'SYNCED',
  `linkedin_raw_response` json DEFAULT NULL,
  `run_schedule_start` timestamp NULL DEFAULT NULL,
  `run_schedule_end` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lcg_account_id` (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_campaign_groups`
--

LOCK TABLES `linkedin_campaign_groups` WRITE;
/*!40000 ALTER TABLE `linkedin_campaign_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_campaign_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_campaigns`
--

DROP TABLE IF EXISTS `linkedin_campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_campaigns` (
  `id` varchar(100) NOT NULL,
  `account_id` varchar(100) NOT NULL,
  `campaign_group_id` varchar(100) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `total_spent` decimal(15,2) DEFAULT '0.00',
  `last_synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `daily_budget` decimal(15,2) DEFAULT NULL,
  `lifetime_budget` decimal(15,2) DEFAULT NULL,
  `start_time` timestamp NULL DEFAULT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `unit_cost` decimal(15,2) DEFAULT NULL,
  `cost_type` varchar(50) DEFAULT NULL,
  `targeting_criteria` json DEFAULT NULL,
  `creation_status` varchar(50) DEFAULT 'SYNCED',
  `linkedin_raw_response` json DEFAULT NULL,
  `objective` varchar(100) DEFAULT NULL,
  `language` varchar(50) DEFAULT NULL,
  `bid_strategy` varchar(100) DEFAULT NULL,
  `optimization_goal` varchar(100) DEFAULT NULL,
  `timezone` varchar(100) DEFAULT NULL,
  `draft_data` json DEFAULT NULL,
  `creation_source` varchar(50) DEFAULT 'SYNCED',
  `linkedin_campaign_urn` varchar(255) DEFAULT NULL,
  `last_publish_status` varchar(50) DEFAULT NULL,
  `last_publish_error` text,
  PRIMARY KEY (`id`),
  KEY `idx_lc_group_id` (`campaign_group_id`),
  KEY `idx_lc_acc_grp_name` (`account_id`,`campaign_group_id`,`name`),
  KEY `idx_lc_creation_source` (`creation_source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_campaigns`
--

LOCK TABLES `linkedin_campaigns` WRITE;
/*!40000 ALTER TABLE `linkedin_campaigns` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_campaigns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_creatives`
--

DROP TABLE IF EXISTS `linkedin_creatives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_creatives` (
  `id` int NOT NULL AUTO_INCREMENT,
  `creative_urn` varchar(255) DEFAULT NULL,
  `account_id` varchar(100) NOT NULL,
  `campaign_group_id` varchar(100) NOT NULL,
  `campaign_id` varchar(100) NOT NULL,
  `media_library_id` int DEFAULT NULL,
  `headline` varchar(255) DEFAULT NULL,
  `description` text,
  `destination_url` text,
  `call_to_action` varchar(50) DEFAULT NULL,
  `creative_type` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT 'ACTIVE',
  `linkedin_raw_response` json DEFAULT NULL,
  `creative_payload` json DEFAULT NULL,
  `preview_payload` json DEFAULT NULL,
  `last_publish_error` text,
  `creation_source` varchar(50) DEFAULT 'LOCAL_DRAFT',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `creative_urn` (`creative_urn`),
  KEY `media_library_id` (`media_library_id`),
  KEY `idx_lc_camp_id` (`campaign_id`),
  CONSTRAINT `linkedin_creatives_ibfk_1` FOREIGN KEY (`media_library_id`) REFERENCES `media_library` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_creatives`
--

LOCK TABLES `linkedin_creatives` WRITE;
/*!40000 ALTER TABLE `linkedin_creatives` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_creatives` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_insights_trend`
--

DROP TABLE IF EXISTS `linkedin_insights_trend`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_insights_trend` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_id` varchar(100) NOT NULL,
  `date_start` date NOT NULL,
  `spend` decimal(15,2) DEFAULT '0.00',
  `impressions` int DEFAULT '0',
  `clicks` int DEFAULT '0',
  `conversions` int DEFAULT '0',
  `ctr` decimal(5,2) DEFAULT '0.00',
  `cpc` decimal(15,4) DEFAULT '0.0000',
  `cpm` decimal(15,4) DEFAULT '0.0000',
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_li_account_date` (`account_id`,`date_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_insights_trend`
--

LOCK TABLES `linkedin_insights_trend` WRITE;
/*!40000 ALTER TABLE `linkedin_insights_trend` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_insights_trend` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_leads`
--

DROP TABLE IF EXISTS `linkedin_leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_leads` (
  `id` varchar(100) NOT NULL,
  `form_id` varchar(100) NOT NULL,
  `form_name` varchar(255) DEFAULT NULL,
  `ad_id` varchar(100) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `field_data` json DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_leads`
--

LOCK TABLES `linkedin_leads` WRITE;
/*!40000 ALTER TABLE `linkedin_leads` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_sync_logs`
--

DROP TABLE IF EXISTS `linkedin_sync_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_sync_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_id` varchar(100) NOT NULL,
  `sync_type` varchar(50) DEFAULT 'MANUAL',
  `status` varchar(50) DEFAULT 'RUNNING',
  `records_synced` int DEFAULT '0',
  `error_message` text,
  `started_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_sync_logs`
--

LOCK TABLES `linkedin_sync_logs` WRITE;
/*!40000 ALTER TABLE `linkedin_sync_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_sync_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linkedin_write_logs`
--

DROP TABLE IF EXISTS `linkedin_write_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linkedin_write_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_id` varchar(100) DEFAULT NULL,
  `action_type` varchar(100) NOT NULL,
  `request_payload` json DEFAULT NULL,
  `response_payload` json DEFAULT NULL,
  `status` varchar(50) NOT NULL,
  `error_message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `campaign_group_id` varchar(100) DEFAULT NULL,
  `campaign_id` varchar(100) DEFAULT NULL,
  `execution_time` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_lwl_account_id` (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linkedin_write_logs`
--

LOCK TABLES `linkedin_write_logs` WRITE;
/*!40000 ALTER TABLE `linkedin_write_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `linkedin_write_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `media_library`
--

DROP TABLE IF EXISTS `media_library`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `media_library` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `asset_name` varchar(255) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `platform` varchar(50) NOT NULL,
  `asset_type` varchar(50) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `extension` varchar(10) NOT NULL,
  `file_size` int NOT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `duration` int DEFAULT NULL,
  `storage_provider` varchar(50) NOT NULL DEFAULT 'LOCAL',
  `local_path` varchar(255) NOT NULL,
  `cdn_url` varchar(255) DEFAULT NULL,
  `thumbnail_url` varchar(255) DEFAULT NULL,
  `preview_url` varchar(255) DEFAULT NULL,
  `hash` varchar(64) NOT NULL,
  `linkedin_asset_urn` varchar(255) DEFAULT NULL,
  `meta_asset_id` varchar(255) DEFAULT NULL,
  `google_asset_id` varchar(255) DEFAULT NULL,
  `processing_status` varchar(50) NOT NULL DEFAULT 'UPLOADING',
  `owner_account` varchar(100) DEFAULT NULL,
  `used_count` int DEFAULT '0',
  `last_used` timestamp NULL DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `uploaded_by` int DEFAULT NULL,
  `access_scope` varchar(50) DEFAULT 'ORGANIZATION',
  `checksum_algorithm` varchar(50) DEFAULT 'SHA256',
  `linked_platforms` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `error_message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `hash` (`hash`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `idx_ml_hash` (`hash`),
  KEY `idx_ml_uuid` (`uuid`),
  CONSTRAINT `media_library_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `media_library`
--

LOCK TABLES `media_library` WRITE;
/*!40000 ALTER TABLE `media_library` DISABLE KEYS */;
/*!40000 ALTER TABLE `media_library` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_account_insights`
--

DROP TABLE IF EXISTS `meta_account_insights`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meta_account_insights` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_id` varchar(100) NOT NULL,
  `date_preset` varchar(50) NOT NULL,
  `spend` decimal(15,2) DEFAULT '0.00',
  `impressions` int DEFAULT '0',
  `clicks` int DEFAULT '0',
  `ctr` decimal(5,2) DEFAULT '0.00',
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_account_preset` (`account_id`,`date_preset`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_account_insights`
--

LOCK TABLES `meta_account_insights` WRITE;
/*!40000 ALTER TABLE `meta_account_insights` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_account_insights` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_ad_accounts`
--

DROP TABLE IF EXISTS `meta_ad_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meta_ad_accounts` (
  `id` varchar(100) NOT NULL,
  `config_id` int NOT NULL DEFAULT '0',
  `name` varchar(255) NOT NULL,
  `account_status` int DEFAULT '1',
  `currency` varchar(10) DEFAULT 'INR',
  `timezone_name` varchar(100) DEFAULT NULL,
  `amount_spent` bigint DEFAULT '0',
  `balance` bigint DEFAULT '0',
  `created_time` timestamp NULL DEFAULT NULL,
  `last_synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_ad_accounts`
--

LOCK TABLES `meta_ad_accounts` WRITE;
/*!40000 ALTER TABLE `meta_ad_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_ad_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_ad_insights_trend`
--

DROP TABLE IF EXISTS `meta_ad_insights_trend`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meta_ad_insights_trend` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ad_id` varchar(100) NOT NULL,
  `date_start` date NOT NULL,
  `spend` decimal(15,2) DEFAULT '0.00',
  `impressions` int DEFAULT '0',
  `clicks` int DEFAULT '0',
  `ctr` decimal(5,2) DEFAULT '0.00',
  `cpc` decimal(15,4) DEFAULT '0.0000',
  `reach` int DEFAULT '0',
  `actions` json DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ad_date` (`ad_id`,`date_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_ad_insights_trend`
--

LOCK TABLES `meta_ad_insights_trend` WRITE;
/*!40000 ALTER TABLE `meta_ad_insights_trend` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_ad_insights_trend` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_ads`
--

DROP TABLE IF EXISTS `meta_ads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meta_ads` (
  `id` varchar(100) NOT NULL,
  `account_id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `campaign_id` varchar(100) DEFAULT NULL,
  `campaign_name` varchar(255) DEFAULT NULL,
  `adset_id` varchar(100) DEFAULT NULL,
  `adset_name` varchar(255) DEFAULT NULL,
  `creative_id` varchar(100) DEFAULT NULL,
  `ad_active_time` int DEFAULT '0',
  `insights_impressions` int DEFAULT '0',
  `insights_spend` decimal(15,2) DEFAULT '0.00',
  `raw_data` json DEFAULT NULL,
  `owner_name` varchar(255) DEFAULT NULL,
  `launch_date` date DEFAULT NULL,
  `owner_updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_ads`
--

LOCK TABLES `meta_ads` WRITE;
/*!40000 ALTER TABLE `meta_ads` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_ads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_configs`
--

DROP TABLE IF EXISTS `meta_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meta_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `access_token` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_configs`
--

LOCK TABLES `meta_configs` WRITE;
/*!40000 ALTER TABLE `meta_configs` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_creatives`
--

DROP TABLE IF EXISTS `meta_creatives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meta_creatives` (
  `id` varchar(100) NOT NULL,
  `raw_data` json DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_creatives`
--

LOCK TABLES `meta_creatives` WRITE;
/*!40000 ALTER TABLE `meta_creatives` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_creatives` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_insights_trend`
--

DROP TABLE IF EXISTS `meta_insights_trend`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meta_insights_trend` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_id` varchar(100) NOT NULL,
  `date_preset` varchar(50) NOT NULL,
  `date_start` date NOT NULL,
  `spend` decimal(15,2) DEFAULT '0.00',
  `impressions` int DEFAULT '0',
  `clicks` int DEFAULT '0',
  `ctr` decimal(5,2) DEFAULT '0.00',
  `cpc` decimal(15,4) DEFAULT '0.0000',
  `cpm` decimal(15,4) DEFAULT '0.0000',
  `cost_per_action_type` json DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_account_preset_date` (`account_id`,`date_preset`,`date_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_insights_trend`
--

LOCK TABLES `meta_insights_trend` WRITE;
/*!40000 ALTER TABLE `meta_insights_trend` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_insights_trend` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_lead_forms`
--

DROP TABLE IF EXISTS `meta_lead_forms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meta_lead_forms` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `leads_count` int DEFAULT '0',
  `locale` varchar(20) DEFAULT NULL,
  `created_time` timestamp NULL DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_lead_forms`
--

LOCK TABLES `meta_lead_forms` WRITE;
/*!40000 ALTER TABLE `meta_lead_forms` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_lead_forms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_leads`
--

DROP TABLE IF EXISTS `meta_leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meta_leads` (
  `lead_id` varchar(100) NOT NULL,
  `form_id` varchar(100) NOT NULL,
  `ad_id` varchar(100) DEFAULT NULL,
  `ad_name` varchar(255) DEFAULT NULL,
  `adset_id` varchar(100) DEFAULT NULL,
  `adset_name` varchar(255) DEFAULT NULL,
  `platform` varchar(50) DEFAULT NULL,
  `created_time` timestamp NULL DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `street_address` varchar(255) DEFAULT NULL,
  `job_title` varchar(255) DEFAULT NULL,
  `field_data` json DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`lead_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_leads`
--

LOCK TABLES `meta_leads` WRITE;
/*!40000 ALTER TABLE `meta_leads` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `assigned_to` int NOT NULL,
  `assigned_by` int NOT NULL,
  `ad_platform` varchar(50) DEFAULT 'general',
  `ad_id` varchar(255) DEFAULT NULL,
  `ad_name` varchar(255) DEFAULT NULL,
  `status` enum('pending','in_progress','completed','cancelled','on_hold') DEFAULT 'pending',
  `remarks` json DEFAULT NULL,
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `due_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_assigned_to` (`assigned_to`),
  KEY `idx_tasks_assigned_by` (`assigned_by`),
  KEY `idx_tasks_status` (`status`),
  KEY `idx_tasks_ad_id` (`ad_id`),
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'user',
  `status` enum('active','hold','rejected') DEFAULT 'active',
  `meta_access` tinyint(1) DEFAULT '0',
  `google_access` tinyint(1) DEFAULT '0',
  `whatsapp_access` tinyint(1) DEFAULT '0',
  `linkedin_access` tinyint(1) DEFAULT '0',
  `manager_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expiry` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_user_manager` (`manager_id`),
  CONSTRAINT `fk_user_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_campaign_analytics`
--

DROP TABLE IF EXISTS `whatsapp_campaign_analytics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_campaign_analytics` (
  `campaign_id` int NOT NULL,
  `sent_count` int DEFAULT '0',
  `delivered_count` int DEFAULT '0',
  `read_count` int DEFAULT '0',
  `failed_count` int DEFAULT '0',
  `last_calculated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`campaign_id`),
  CONSTRAINT `whatsapp_campaign_analytics_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `whatsapp_campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_campaign_analytics`
--

LOCK TABLES `whatsapp_campaign_analytics` WRITE;
/*!40000 ALTER TABLE `whatsapp_campaign_analytics` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_campaign_analytics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_campaign_recipients`
--

DROP TABLE IF EXISTS `whatsapp_campaign_recipients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_campaign_recipients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaign_id` int NOT NULL,
  `phone` varchar(50) NOT NULL,
  `parameters` json DEFAULT NULL,
  `status` varchar(50) DEFAULT 'queued',
  `message_id` varchar(255) DEFAULT NULL,
  `error_message` text,
  `sent_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wcr_message_id` (`message_id`),
  KEY `idx_wcr_campaign_status` (`campaign_id`,`status`),
  CONSTRAINT `whatsapp_campaign_recipients_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `whatsapp_campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_campaign_recipients`
--

LOCK TABLES `whatsapp_campaign_recipients` WRITE;
/*!40000 ALTER TABLE `whatsapp_campaign_recipients` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_campaign_recipients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_campaign_stats`
--

DROP TABLE IF EXISTS `whatsapp_campaign_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_campaign_stats` (
  `campaign_id` int NOT NULL,
  `total_count` int DEFAULT '0',
  `sent_count` int DEFAULT '0',
  `delivered_count` int DEFAULT '0',
  `read_count` int DEFAULT '0',
  `failed_count` int DEFAULT '0',
  `delivery_rate` decimal(5,2) DEFAULT '0.00',
  `read_rate` decimal(5,2) DEFAULT '0.00',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`campaign_id`),
  CONSTRAINT `whatsapp_campaign_stats_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `whatsapp_campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_campaign_stats`
--

LOCK TABLES `whatsapp_campaign_stats` WRITE;
/*!40000 ALTER TABLE `whatsapp_campaign_stats` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_campaign_stats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_campaigns`
--

DROP TABLE IF EXISTS `whatsapp_campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_campaigns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_id` int DEFAULT '0',
  `name` varchar(255) NOT NULL,
  `template_id` varchar(100) NOT NULL,
  `contact_list_id` int NOT NULL,
  `campaign_type` enum('broadcast','scheduled','recurring') DEFAULT 'broadcast',
  `status` enum('draft','queued','running','completed','failed','paused') DEFAULT 'draft',
  `scheduled_time` timestamp NULL DEFAULT NULL,
  `timezone` varchar(50) DEFAULT 'UTC',
  `cron_expression` varchar(100) DEFAULT NULL,
  `parent_campaign_id` int DEFAULT NULL,
  `job_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `contact_list_id` (`contact_list_id`),
  KEY `fk_parent_campaign` (`parent_campaign_id`),
  KEY `idx_wc_type_status_created` (`campaign_type`,`status`,`created_at`),
  CONSTRAINT `fk_parent_campaign` FOREIGN KEY (`parent_campaign_id`) REFERENCES `whatsapp_campaigns` (`id`) ON DELETE SET NULL,
  CONSTRAINT `whatsapp_campaigns_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `whatsapp_templates` (`id`),
  CONSTRAINT `whatsapp_campaigns_ibfk_2` FOREIGN KEY (`contact_list_id`) REFERENCES `whatsapp_contact_lists` (`id`),
  CONSTRAINT `whatsapp_campaigns_ibfk_3` FOREIGN KEY (`parent_campaign_id`) REFERENCES `whatsapp_campaigns` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_campaigns`
--

LOCK TABLES `whatsapp_campaigns` WRITE;
/*!40000 ALTER TABLE `whatsapp_campaigns` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_campaigns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_channel_member_updates`
--

DROP TABLE IF EXISTS `whatsapp_channel_member_updates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_channel_member_updates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `channel_id` int NOT NULL,
  `member_count` int NOT NULL,
  `update_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_channel_date` (`channel_id`,`update_date`),
  CONSTRAINT `whatsapp_channel_member_updates_ibfk_1` FOREIGN KEY (`channel_id`) REFERENCES `whatsapp_channels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_channel_member_updates`
--

LOCK TABLES `whatsapp_channel_member_updates` WRITE;
/*!40000 ALTER TABLE `whatsapp_channel_member_updates` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_channel_member_updates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_channels`
--

DROP TABLE IF EXISTS `whatsapp_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_channels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `channel_name` varchar(255) NOT NULL,
  `manager_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_channels`
--

LOCK TABLES `whatsapp_channels` WRITE;
/*!40000 ALTER TABLE `whatsapp_channels` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_channels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_configs`
--

DROP TABLE IF EXISTS `whatsapp_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone_number_id` varchar(100) NOT NULL,
  `waba_id` varchar(100) NOT NULL,
  `access_token` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_configs`
--

LOCK TABLES `whatsapp_configs` WRITE;
/*!40000 ALTER TABLE `whatsapp_configs` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_contact_activity`
--

DROP TABLE IF EXISTS `whatsapp_contact_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_contact_activity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contact_id` int NOT NULL,
  `campaign_id` int DEFAULT NULL,
  `message_id` varchar(255) DEFAULT NULL,
  `event_type` enum('sent','delivered','read','failed','replied','unsubscribed') NOT NULL,
  `metadata` json DEFAULT NULL,
  `event_timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wca_contact_event` (`contact_id`,`event_timestamp`),
  KEY `idx_wca_campaign_id` (`campaign_id`),
  KEY `idx_wca_message_id` (`message_id`),
  CONSTRAINT `whatsapp_contact_activity_ibfk_1` FOREIGN KEY (`contact_id`) REFERENCES `whatsapp_contacts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `whatsapp_contact_activity_ibfk_2` FOREIGN KEY (`campaign_id`) REFERENCES `whatsapp_campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_contact_activity`
--

LOCK TABLES `whatsapp_contact_activity` WRITE;
/*!40000 ALTER TABLE `whatsapp_contact_activity` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_contact_activity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_contact_list_members`
--

DROP TABLE IF EXISTS `whatsapp_contact_list_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_contact_list_members` (
  `list_id` int NOT NULL,
  `contact_id` int NOT NULL,
  PRIMARY KEY (`list_id`,`contact_id`),
  KEY `contact_id` (`contact_id`),
  CONSTRAINT `whatsapp_contact_list_members_ibfk_1` FOREIGN KEY (`list_id`) REFERENCES `whatsapp_contact_lists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `whatsapp_contact_list_members_ibfk_2` FOREIGN KEY (`contact_id`) REFERENCES `whatsapp_contacts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_contact_list_members`
--

LOCK TABLES `whatsapp_contact_list_members` WRITE;
/*!40000 ALTER TABLE `whatsapp_contact_list_members` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_contact_list_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_contact_lists`
--

DROP TABLE IF EXISTS `whatsapp_contact_lists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_contact_lists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_contact_lists`
--

LOCK TABLES `whatsapp_contact_lists` WRITE;
/*!40000 ALTER TABLE `whatsapp_contact_lists` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_contact_lists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_contact_tags`
--

DROP TABLE IF EXISTS `whatsapp_contact_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_contact_tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contact_id` int NOT NULL,
  `tag_name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_contact_tag` (`contact_id`,`tag_name`),
  CONSTRAINT `whatsapp_contact_tags_ibfk_1` FOREIGN KEY (`contact_id`) REFERENCES `whatsapp_contacts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_contact_tags`
--

LOCK TABLES `whatsapp_contact_tags` WRITE;
/*!40000 ALTER TABLE `whatsapp_contact_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_contact_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_contacts`
--

DROP TABLE IF EXISTS `whatsapp_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone` varchar(50) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `opt_in_status` tinyint(1) DEFAULT '1',
  `opt_in_date` datetime DEFAULT NULL,
  `last_message_at` datetime DEFAULT NULL,
  `attributes` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `engagement_score` decimal(5,2) DEFAULT '0.00',
  `total_sent` int DEFAULT '0',
  `total_delivered` int DEFAULT '0',
  `total_read` int DEFAULT '0',
  `last_engaged_at` datetime DEFAULT NULL,
  `status` enum('active','unsubscribed','archived') DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_wc_engagement_score` (`engagement_score`),
  KEY `idx_wc_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_contacts`
--

LOCK TABLES `whatsapp_contacts` WRITE;
/*!40000 ALTER TABLE `whatsapp_contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_message_logs`
--

DROP TABLE IF EXISTS `whatsapp_message_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_message_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone_number_id` varchar(100) NOT NULL,
  `recipient_number` varchar(50) NOT NULL,
  `template_name` varchar(255) NOT NULL,
  `status` varchar(50) DEFAULT 'sent',
  `message_id` varchar(255) DEFAULT NULL,
  `sent_by` int DEFAULT NULL,
  `error_message` text,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wml_message_id` (`message_id`),
  KEY `idx_wml_status` (`status`),
  KEY `idx_wml_sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_message_logs`
--

LOCK TABLES `whatsapp_message_logs` WRITE;
/*!40000 ALTER TABLE `whatsapp_message_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_message_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_phone_details`
--

DROP TABLE IF EXISTS `whatsapp_phone_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_phone_details` (
  `phone_number_id` varchar(100) NOT NULL,
  `config_id` int NOT NULL DEFAULT '0',
  `waba_id` varchar(100) NOT NULL,
  `display_phone_number` varchar(50) DEFAULT NULL,
  `verified_name` varchar(255) DEFAULT NULL,
  `quality_rating` varchar(50) DEFAULT NULL,
  `name_status` varchar(100) DEFAULT 'NONE',
  `raw_data` json DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`phone_number_id`,`config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_phone_details`
--

LOCK TABLES `whatsapp_phone_details` WRITE;
/*!40000 ALTER TABLE `whatsapp_phone_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_phone_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_template_mappings`
--

DROP TABLE IF EXISTS `whatsapp_template_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_template_mappings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` varchar(100) NOT NULL,
  `mapping_name` varchar(255) NOT NULL,
  `mappings` json NOT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `last_used_at` datetime DEFAULT NULL,
  `usage_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_template_mapping_name` (`template_id`,`mapping_name`),
  CONSTRAINT `whatsapp_template_mappings_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `whatsapp_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_template_mappings`
--

LOCK TABLES `whatsapp_template_mappings` WRITE;
/*!40000 ALTER TABLE `whatsapp_template_mappings` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_template_mappings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_template_variables`
--

DROP TABLE IF EXISTS `whatsapp_template_variables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_template_variables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` varchar(100) NOT NULL,
  `variable_name` varchar(255) NOT NULL,
  `component_type` enum('header','body','button') NOT NULL,
  `variable_position` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  CONSTRAINT `whatsapp_template_variables_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `whatsapp_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_template_variables`
--

LOCK TABLES `whatsapp_template_variables` WRITE;
/*!40000 ALTER TABLE `whatsapp_template_variables` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_template_variables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_templates`
--

DROP TABLE IF EXISTS `whatsapp_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_templates` (
  `id` varchar(100) NOT NULL,
  `waba_id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `language` varchar(20) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `components` json DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `variables` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_templates`
--

LOCK TABLES `whatsapp_templates` WRITE;
/*!40000 ALTER TABLE `whatsapp_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_waba_pricing_analytics`
--

DROP TABLE IF EXISTS `whatsapp_waba_pricing_analytics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_waba_pricing_analytics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_id` int DEFAULT '0',
  `waba_id` varchar(100) NOT NULL,
  `start_time` int NOT NULL,
  `end_time` int NOT NULL,
  `country` varchar(10) NOT NULL,
  `pricing_category` varchar(50) NOT NULL,
  `volume` int DEFAULT '0',
  `cost` decimal(15,4) DEFAULT '0.0000',
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_waba_pricing_point` (`config_id`,`start_time`,`country`,`pricing_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_waba_pricing_analytics`
--

LOCK TABLES `whatsapp_waba_pricing_analytics` WRITE;
/*!40000 ALTER TABLE `whatsapp_waba_pricing_analytics` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_waba_pricing_analytics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `youtube_ad_history`
--

DROP TABLE IF EXISTS `youtube_ad_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `youtube_ad_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `youtube_ad_id` int NOT NULL,
  `date` date NOT NULL,
  `impressions` bigint DEFAULT '0',
  `views` bigint DEFAULT '0',
  `clicks` bigint DEFAULT '0',
  `cost` decimal(15,2) DEFAULT '0.00',
  `likes` int DEFAULT '0',
  `comments` int DEFAULT '0',
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_ad_date` (`youtube_ad_id`,`date`),
  CONSTRAINT `youtube_ad_history_ibfk_1` FOREIGN KEY (`youtube_ad_id`) REFERENCES `youtube_ads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `youtube_ad_history`
--

LOCK TABLES `youtube_ad_history` WRITE;
/*!40000 ALTER TABLE `youtube_ad_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `youtube_ad_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `youtube_ads`
--

DROP TABLE IF EXISTS `youtube_ads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `youtube_ads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` varchar(50) NOT NULL,
  `campaign_id` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `video_url` varchar(255) DEFAULT NULL,
  `budget` decimal(15,2) DEFAULT '0.00',
  `status` varchar(50) DEFAULT 'PAUSED',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `campaign_name` varchar(255) DEFAULT NULL,
  `campaign_status` varchar(50) DEFAULT NULL,
  `ad_id` varchar(100) DEFAULT NULL,
  `ad_name` varchar(255) DEFAULT NULL,
  `video_id` varchar(100) DEFAULT NULL,
  `video_title` varchar(255) DEFAULT NULL,
  `video_description` text,
  `thumbnail` varchar(255) DEFAULT NULL,
  `channel_name` varchar(255) DEFAULT NULL,
  `channel_id` varchar(100) DEFAULT NULL,
  `impressions` bigint DEFAULT '0',
  `clicks` bigint DEFAULT '0',
  `views` bigint DEFAULT '0',
  `ctr` decimal(10,4) DEFAULT '0.0000',
  `cpv` decimal(15,4) DEFAULT '0.0000',
  `spend` decimal(15,2) DEFAULT '0.00',
  `engagements` bigint DEFAULT '0',
  `likes` bigint DEFAULT '0',
  `comments` bigint DEFAULT '0',
  `watch_time` decimal(15,2) DEFAULT '0.00',
  `avg_view_duration` decimal(15,2) DEFAULT '0.00',
  `audience_retention` decimal(5,2) DEFAULT '0.00',
  `subscribers_gained` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_campaign` (`customer_id`,`campaign_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `youtube_ads`
--

LOCK TABLES `youtube_ads` WRITE;
/*!40000 ALTER TABLE `youtube_ads` DISABLE KEYS */;
/*!40000 ALTER TABLE `youtube_ads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'meta_api_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-18 18:58:17
