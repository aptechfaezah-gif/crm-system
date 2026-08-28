/*
  IFRA Consulting Real Leads Management System
  Microsoft SQL Server 2019 / SSMS 18

  Database: [real leads system]

  1. Open SQL Server Management Studio 18
  2. Connect to your SQL Server 2019 instance
  3. Open this file and execute (F5)

  Re-running this script is safe: it creates missing objects and
  inserts seed data only when tables are empty.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

IF DB_ID(N'real leads system') IS NULL
BEGIN
    CREATE DATABASE [real leads system];
END
GO

USE [real leads system];
GO

/* -------------------------------------------------------------------------- */
/* Tables                                                                      */
/* -------------------------------------------------------------------------- */

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
        Name            NVARCHAR(120) NOT NULL,
        Username        NVARCHAR(80)  NOT NULL,
        Email           NVARCHAR(150) NOT NULL,
        PasswordHash    NVARCHAR(255) NOT NULL,
        Phone           NVARCHAR(20)  NULL,
        Role            NVARCHAR(30)  NOT NULL,
        ProfileImage    NVARCHAR(255) NULL,
        Status          NVARCHAR(20)  NOT NULL CONSTRAINT DF_Users_Status DEFAULT (N'Active'),
        LastLogin       DATETIME2(0)  NULL,
        CreatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_Users_Username UNIQUE (Username),
        CONSTRAINT UQ_Users_Email UNIQUE (Email),
        CONSTRAINT CK_Users_Role CHECK (Role IN (N'ADMIN', N'SALES_MANAGER', N'SALES_EMPLOYEE')),
        CONSTRAINT CK_Users_Status CHECK (Status IN (N'Active', N'Inactive'))
    );
END
GO

IF OBJECT_ID(N'dbo.Services', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Services (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Services PRIMARY KEY,
        Name            NVARCHAR(120) NOT NULL,
        Description     NVARCHAR(400) NULL,
        Status          NVARCHAR(20)  NOT NULL CONSTRAINT DF_Services_Status DEFAULT (N'Active'),
        CreatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_Services_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_Services_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_Services_Name UNIQUE (Name),
        CONSTRAINT CK_Services_Status CHECK (Status IN (N'Active', N'Inactive'))
    );
END
GO

IF OBJECT_ID(N'dbo.LeadSources', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LeadSources (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LeadSources PRIMARY KEY,
        Name            NVARCHAR(80)  NOT NULL,
        Status          NVARCHAR(20)  NOT NULL CONSTRAINT DF_LeadSources_Status DEFAULT (N'Active'),
        CreatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_LeadSources_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_LeadSources_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_LeadSources_Name UNIQUE (Name),
        CONSTRAINT CK_LeadSources_Status CHECK (Status IN (N'Active', N'Inactive'))
    );
END
GO

IF OBJECT_ID(N'dbo.LeadStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LeadStatuses (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LeadStatuses PRIMARY KEY,
        Name            NVARCHAR(50)  NOT NULL,
        Description     NVARCHAR(250) NULL,
        SortOrder       INT           NOT NULL CONSTRAINT DF_LeadStatuses_Sort DEFAULT (0),
        Status          NVARCHAR(20)  NOT NULL CONSTRAINT DF_LeadStatuses_Status DEFAULT (N'Active'),
        CreatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_LeadStatuses_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_LeadStatuses_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_LeadStatuses_Name UNIQUE (Name),
        CONSTRAINT CK_LeadStatuses_Status CHECK (Status IN (N'Active', N'Inactive'))
    );
END
GO

IF OBJECT_ID(N'dbo.Settings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Settings (
        Id              INT           NOT NULL CONSTRAINT PK_Settings PRIMARY KEY,
        CompanyName     NVARCHAR(150) NOT NULL,
        CompanyLogo     NVARCHAR(250) NULL,
        CompanyEmail    NVARCHAR(150) NULL,
        CompanyPhone    NVARCHAR(30)  NULL,
        CompanyWebsite  NVARCHAR(200) NULL,
        DefaultCurrency NVARCHAR(10)  NOT NULL CONSTRAINT DF_Settings_Currency DEFAULT (N'PKR'),
        Timezone        NVARCHAR(60)  NOT NULL CONSTRAINT DF_Settings_TZ DEFAULT (N'Asia/Karachi'),
        LeadCodePrefix  NVARCHAR(20)  NOT NULL CONSTRAINT DF_Settings_LeadPrefix DEFAULT (N'IFRA-'),
        ProposalPrefix  NVARCHAR(20)  NOT NULL CONSTRAINT DF_Settings_PropPrefix DEFAULT (N'IFRA-P-'),
        UpdatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_Settings_UpdatedAt DEFAULT (GETDATE())
    );
END
GO

IF OBJECT_ID(N'dbo.NumberSequences', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NumberSequences (
        Name            NVARCHAR(20) NOT NULL CONSTRAINT PK_NumberSequences PRIMARY KEY,
        Prefix          NVARCHAR(20) NOT NULL,
        NextValue       INT          NOT NULL,
        CONSTRAINT CK_NumberSequences_Next CHECK (NextValue >= 1)
    );
END
GO

IF OBJECT_ID(N'dbo.Leads', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Leads (
        Id                  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Leads PRIMARY KEY,
        LeadCode            NVARCHAR(30)  NOT NULL,
        FirstName           NVARCHAR(80)  NOT NULL,
        LastName            NVARCHAR(80)  NULL,
        CompanyName         NVARCHAR(150) NULL,
        Email               NVARCHAR(150) NOT NULL,
        Phone               NVARCHAR(20)  NOT NULL,
        WhatsApp            NVARCHAR(20)  NULL,
        AlternatePhone      NVARCHAR(20)  NULL,
        Website             NVARCHAR(200) NULL,
        Country             NVARCHAR(80)  NULL,
        City                NVARCHAR(80)  NULL,
        Address             NVARCHAR(250) NULL,
        ServiceId           INT           NOT NULL,
        SourceId            INT           NOT NULL,
        StatusId            INT           NOT NULL,
        Priority            NVARCHAR(20)  NOT NULL CONSTRAINT DF_Leads_Priority DEFAULT (N'Medium'),
        LeadTemperature     NVARCHAR(10)  NULL,
        EstimatedBudget     DECIMAL(18,2) NULL,
        Currency            NVARCHAR(10)  NULL CONSTRAINT DF_Leads_Currency DEFAULT (N'PKR'),
        AssignedTo          INT           NULL,
        Description         NVARCHAR(MAX) NULL,
        Requirements        NVARCHAR(MAX) NULL,
        Notes               NVARCHAR(MAX) NULL,
        LostReason          NVARCHAR(80)  NULL,
        NextFollowUpDate    DATE          NULL,
        NextFollowUpTime    TIME(0)       NULL,
        CreatedBy           INT           NOT NULL,
        CreatedAt           DATETIME2(0)  NOT NULL CONSTRAINT DF_Leads_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt           DATETIME2(0)  NOT NULL CONSTRAINT DF_Leads_UpdatedAt DEFAULT (GETDATE()),
        IsDeleted           BIT           NOT NULL CONSTRAINT DF_Leads_IsDeleted DEFAULT (0),
        ConversionDate      DATETIME2(0)  NULL,
        ConvertedBy         INT           NULL,
        FinalAmount         DECIMAL(18,2) NULL,
        LeadScore           INT           NULL,
        CONSTRAINT UQ_Leads_LeadCode UNIQUE (LeadCode),
        CONSTRAINT CK_Leads_Priority CHECK (Priority IN (N'Low', N'Medium', N'High', N'Urgent')),
        CONSTRAINT CK_Leads_Temperature CHECK (LeadTemperature IS NULL OR LeadTemperature IN (N'Hot', N'Warm', N'Cold')),
        CONSTRAINT CK_Leads_LostReason CHECK (
            LostReason IS NULL OR LostReason IN (
                N'Budget too high', N'Chose competitor', N'No response',
                N'Project cancelled', N'Not interested', N'Wrong lead',
                N'Timing issue', N'Other'
            )
        ),
        CONSTRAINT CK_Leads_Score CHECK (LeadScore IS NULL OR (LeadScore >= 0 AND LeadScore <= 100))
    );
END
GO

IF OBJECT_ID(N'dbo.FollowUps', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.FollowUps (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_FollowUps PRIMARY KEY,
        LeadId          INT           NOT NULL,
        UserId          INT           NOT NULL,
        FollowUpDate    DATE          NOT NULL,
        FollowUpTime    TIME(0)       NULL,
        FollowUpType    NVARCHAR(20)  NOT NULL,
        Subject         NVARCHAR(150) NOT NULL,
        Notes           NVARCHAR(MAX) NULL,
        Status          NVARCHAR(20)  NOT NULL CONSTRAINT DF_FollowUps_Status DEFAULT (N'Pending'),
        CreatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_FollowUps_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_FollowUps_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT CK_FollowUps_Type CHECK (FollowUpType IN (N'Call', N'WhatsApp', N'Email', N'Meeting', N'Video Call', N'Other')),
        CONSTRAINT CK_FollowUps_Status CHECK (Status IN (N'Pending', N'Completed', N'Cancelled', N'Rescheduled'))
    );
END
GO

IF OBJECT_ID(N'dbo.LeadActivities', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LeadActivities (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LeadActivities PRIMARY KEY,
        LeadId          INT           NOT NULL,
        UserId          INT           NOT NULL,
        ActivityType    NVARCHAR(40)  NOT NULL,
        Title           NVARCHAR(150) NOT NULL,
        Description     NVARCHAR(MAX) NULL,
        ActivityDate    DATETIME2(0)  NOT NULL CONSTRAINT DF_LeadActivities_Date DEFAULT (GETDATE()),
        CreatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_LeadActivities_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT CK_LeadActivities_Type CHECK (ActivityType IN (
            N'Lead Created', N'Call', N'WhatsApp', N'Email', N'Meeting', N'Note',
            N'Status Changed', N'Proposal Sent', N'Follow-up', N'Assigned',
            N'Task Created', N'Other'
        ))
    );
END
GO

IF OBJECT_ID(N'dbo.Tasks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Tasks (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Tasks PRIMARY KEY,
        LeadId          INT           NOT NULL,
        AssignedTo      INT           NOT NULL,
        Title           NVARCHAR(150) NOT NULL,
        Description     NVARCHAR(MAX) NULL,
        DueDate         DATE          NOT NULL,
        DueTime         TIME(0)       NULL,
        Priority        NVARCHAR(20)  NOT NULL CONSTRAINT DF_Tasks_Priority DEFAULT (N'Medium'),
        Status          NVARCHAR(20)  NOT NULL CONSTRAINT DF_Tasks_Status DEFAULT (N'Pending'),
        CreatedBy       INT           NOT NULL,
        CreatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_Tasks_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_Tasks_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT CK_Tasks_Priority CHECK (Priority IN (N'Low', N'Medium', N'High', N'Urgent')),
        CONSTRAINT CK_Tasks_Status CHECK (Status IN (N'Pending', N'In Progress', N'Completed', N'Cancelled'))
    );
END
GO

IF OBJECT_ID(N'dbo.Proposals', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Proposals (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Proposals PRIMARY KEY,
        LeadId          INT           NOT NULL,
        ProposalNumber  NVARCHAR(30)  NOT NULL,
        Title           NVARCHAR(200) NOT NULL,
        Amount          DECIMAL(18,2) NOT NULL,
        Currency        NVARCHAR(10)  NOT NULL CONSTRAINT DF_Proposals_Currency DEFAULT (N'PKR'),
        SentDate        DATE          NULL,
        ValidUntil      DATE          NULL,
        Status          NVARCHAR(20)  NOT NULL CONSTRAINT DF_Proposals_Status DEFAULT (N'Draft'),
        Notes           NVARCHAR(MAX) NULL,
        CreatedBy       INT           NOT NULL,
        CreatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_Proposals_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_Proposals_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_Proposals_Number UNIQUE (ProposalNumber),
        CONSTRAINT CK_Proposals_Status CHECK (Status IN (N'Draft', N'Sent', N'Viewed', N'Accepted', N'Rejected', N'Expired')),
        CONSTRAINT CK_Proposals_Amount CHECK (Amount >= 0)
    );
END
GO

IF OBJECT_ID(N'dbo.Notifications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Notifications PRIMARY KEY,
        UserId          INT           NOT NULL,
        Title           NVARCHAR(150) NOT NULL,
        Message         NVARCHAR(500) NOT NULL,
        Type            NVARCHAR(50)  NOT NULL,
        ReferenceId     INT           NULL,
        IsRead          BIT           NOT NULL CONSTRAINT DF_Notifications_IsRead DEFAULT (0),
        CreatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT (GETDATE())
    );
END
GO

IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,
        UserId          INT           NULL,
        Action          NVARCHAR(80)  NOT NULL,
        Module          NVARCHAR(80)  NOT NULL,
        RecordId        INT           NULL,
        Description     NVARCHAR(500) NOT NULL,
        IPAddress       NVARCHAR(50)  NULL,
        CreatedAt       DATETIME2(0)  NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT (GETDATE())
    );
END
GO

/* -------------------------------------------------------------------------- */
/* Foreign keys — NO ACTION / SET NULL only. Never cascade CRM history.        */
/* -------------------------------------------------------------------------- */

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Leads_Service')
    ALTER TABLE dbo.Leads ADD CONSTRAINT FK_Leads_Service
        FOREIGN KEY (ServiceId) REFERENCES dbo.Services (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Leads_Source')
    ALTER TABLE dbo.Leads ADD CONSTRAINT FK_Leads_Source
        FOREIGN KEY (SourceId) REFERENCES dbo.LeadSources (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Leads_Status')
    ALTER TABLE dbo.Leads ADD CONSTRAINT FK_Leads_Status
        FOREIGN KEY (StatusId) REFERENCES dbo.LeadStatuses (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Leads_AssignedTo')
    ALTER TABLE dbo.Leads ADD CONSTRAINT FK_Leads_AssignedTo
        FOREIGN KEY (AssignedTo) REFERENCES dbo.Users (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Leads_CreatedBy')
    ALTER TABLE dbo.Leads ADD CONSTRAINT FK_Leads_CreatedBy
        FOREIGN KEY (CreatedBy) REFERENCES dbo.Users (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Leads_ConvertedBy')
    ALTER TABLE dbo.Leads ADD CONSTRAINT FK_Leads_ConvertedBy
        FOREIGN KEY (ConvertedBy) REFERENCES dbo.Users (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_FollowUps_Lead')
    ALTER TABLE dbo.FollowUps ADD CONSTRAINT FK_FollowUps_Lead
        FOREIGN KEY (LeadId) REFERENCES dbo.Leads (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_FollowUps_User')
    ALTER TABLE dbo.FollowUps ADD CONSTRAINT FK_FollowUps_User
        FOREIGN KEY (UserId) REFERENCES dbo.Users (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_LeadActivities_Lead')
    ALTER TABLE dbo.LeadActivities ADD CONSTRAINT FK_LeadActivities_Lead
        FOREIGN KEY (LeadId) REFERENCES dbo.Leads (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_LeadActivities_User')
    ALTER TABLE dbo.LeadActivities ADD CONSTRAINT FK_LeadActivities_User
        FOREIGN KEY (UserId) REFERENCES dbo.Users (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Tasks_Lead')
    ALTER TABLE dbo.Tasks ADD CONSTRAINT FK_Tasks_Lead
        FOREIGN KEY (LeadId) REFERENCES dbo.Leads (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Tasks_AssignedTo')
    ALTER TABLE dbo.Tasks ADD CONSTRAINT FK_Tasks_AssignedTo
        FOREIGN KEY (AssignedTo) REFERENCES dbo.Users (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Tasks_CreatedBy')
    ALTER TABLE dbo.Tasks ADD CONSTRAINT FK_Tasks_CreatedBy
        FOREIGN KEY (CreatedBy) REFERENCES dbo.Users (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Proposals_Lead')
    ALTER TABLE dbo.Proposals ADD CONSTRAINT FK_Proposals_Lead
        FOREIGN KEY (LeadId) REFERENCES dbo.Leads (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Proposals_CreatedBy')
    ALTER TABLE dbo.Proposals ADD CONSTRAINT FK_Proposals_CreatedBy
        FOREIGN KEY (CreatedBy) REFERENCES dbo.Users (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Notifications_User')
    ALTER TABLE dbo.Notifications ADD CONSTRAINT FK_Notifications_User
        FOREIGN KEY (UserId) REFERENCES dbo.Users (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AuditLogs_User')
    ALTER TABLE dbo.AuditLogs ADD CONSTRAINT FK_AuditLogs_User
        FOREIGN KEY (UserId) REFERENCES dbo.Users (Id);
GO

/* -------------------------------------------------------------------------- */
/* Indexes                                                                     */
/* -------------------------------------------------------------------------- */

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Leads_Email' AND object_id = OBJECT_ID(N'dbo.Leads'))
    CREATE INDEX IX_Leads_Email ON dbo.Leads (Email);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Leads_Phone' AND object_id = OBJECT_ID(N'dbo.Leads'))
    CREATE INDEX IX_Leads_Phone ON dbo.Leads (Phone);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Leads_WhatsApp' AND object_id = OBJECT_ID(N'dbo.Leads'))
    CREATE INDEX IX_Leads_WhatsApp ON dbo.Leads (WhatsApp);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Leads_StatusId' AND object_id = OBJECT_ID(N'dbo.Leads'))
    CREATE INDEX IX_Leads_StatusId ON dbo.Leads (StatusId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Leads_SourceId' AND object_id = OBJECT_ID(N'dbo.Leads'))
    CREATE INDEX IX_Leads_SourceId ON dbo.Leads (SourceId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Leads_ServiceId' AND object_id = OBJECT_ID(N'dbo.Leads'))
    CREATE INDEX IX_Leads_ServiceId ON dbo.Leads (ServiceId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Leads_AssignedTo' AND object_id = OBJECT_ID(N'dbo.Leads'))
    CREATE INDEX IX_Leads_AssignedTo ON dbo.Leads (AssignedTo);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Leads_CreatedAt' AND object_id = OBJECT_ID(N'dbo.Leads'))
    CREATE INDEX IX_Leads_CreatedAt ON dbo.Leads (CreatedAt);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Leads_NextFollowUpDate' AND object_id = OBJECT_ID(N'dbo.Leads'))
    CREATE INDEX IX_Leads_NextFollowUpDate ON dbo.Leads (NextFollowUpDate);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Leads_IsDeleted' AND object_id = OBJECT_ID(N'dbo.Leads'))
    CREATE INDEX IX_Leads_IsDeleted ON dbo.Leads (IsDeleted);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FollowUps_LeadId' AND object_id = OBJECT_ID(N'dbo.FollowUps'))
    CREATE INDEX IX_FollowUps_LeadId ON dbo.FollowUps (LeadId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FollowUps_UserId' AND object_id = OBJECT_ID(N'dbo.FollowUps'))
    CREATE INDEX IX_FollowUps_UserId ON dbo.FollowUps (UserId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FollowUps_DateStatus' AND object_id = OBJECT_ID(N'dbo.FollowUps'))
    CREATE INDEX IX_FollowUps_DateStatus ON dbo.FollowUps (FollowUpDate, Status);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_LeadActivities_LeadId' AND object_id = OBJECT_ID(N'dbo.LeadActivities'))
    CREATE INDEX IX_LeadActivities_LeadId ON dbo.LeadActivities (LeadId, ActivityDate DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Tasks_AssignedTo' AND object_id = OBJECT_ID(N'dbo.Tasks'))
    CREATE INDEX IX_Tasks_AssignedTo ON dbo.Tasks (AssignedTo, Status);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Tasks_LeadId' AND object_id = OBJECT_ID(N'dbo.Tasks'))
    CREATE INDEX IX_Tasks_LeadId ON dbo.Tasks (LeadId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Proposals_LeadId' AND object_id = OBJECT_ID(N'dbo.Proposals'))
    CREATE INDEX IX_Proposals_LeadId ON dbo.Proposals (LeadId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Notifications_UserId' AND object_id = OBJECT_ID(N'dbo.Notifications'))
    CREATE INDEX IX_Notifications_UserId ON dbo.Notifications (UserId, IsRead, CreatedAt DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AuditLogs_CreatedAt' AND object_id = OBJECT_ID(N'dbo.AuditLogs'))
    CREATE INDEX IX_AuditLogs_CreatedAt ON dbo.AuditLogs (CreatedAt DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AuditLogs_UserId' AND object_id = OBJECT_ID(N'dbo.AuditLogs'))
    CREATE INDEX IX_AuditLogs_UserId ON dbo.AuditLogs (UserId);
GO

/* -------------------------------------------------------------------------- */
/* Seed lookup data                                                            */
/* -------------------------------------------------------------------------- */

IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE Id = 1)
BEGIN
    INSERT INTO dbo.Settings (
        Id, CompanyName, CompanyLogo, CompanyEmail, CompanyPhone, CompanyWebsite,
        DefaultCurrency, Timezone, LeadCodePrefix, ProposalPrefix
    )
    VALUES (
        1,
        N'IFRA Consulting (Pvt) Ltd.',
        N'/images/logo.png',
        N'info@ifraconsulting.com',
        N'+92 300 0000000',
        N'https://ifraconsulting.com',
        N'PKR',
        N'Asia/Karachi',
        N'IFRA-',
        N'IFRA-P-'
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.NumberSequences)
BEGIN
    INSERT INTO dbo.NumberSequences (Name, Prefix, NextValue)
    VALUES (N'LEAD', N'IFRA-', 1), (N'PROPOSAL', N'IFRA-P-', 1);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Services)
BEGIN
    INSERT INTO dbo.Services (Name, Description, Status) VALUES
    (N'Web Development', N'Corporate websites, portals and web applications', N'Active'),
    (N'Custom Software Development', N'Bespoke business software for operations and growth', N'Active'),
    (N'Mobile App Development', N'iOS and Android applications', N'Active'),
    (N'E-Commerce Development', N'Online stores and marketplace integrations', N'Active'),
    (N'WordPress Development', N'WordPress sites, themes and plugins', N'Active'),
    (N'Shopify Development', N'Shopify store setup and customisation', N'Active'),
    (N'UI/UX Design', N'Product design, wireframes and design systems', N'Active'),
    (N'SEO', N'Search engine optimisation and content strategy', N'Active'),
    (N'Digital Marketing', N'Paid media, social and campaign management', N'Active'),
    (N'AI Development', N'AI assistants, automation and model integration', N'Active'),
    (N'API Development', N'Restful APIs, integrations and middleware', N'Active'),
    (N'Cloud Services', N'Cloud architecture, migration and managed hosting', N'Active'),
    (N'ERP Development', N'Enterprise resource planning solutions', N'Active'),
    (N'CRM Development', N'Customer relationship management systems', N'Active'),
    (N'Software Consulting', N'IT advisory, architecture and delivery consulting', N'Active'),
    (N'Maintenance & Support', N'Ongoing support, SLAs and product maintenance', N'Active');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.LeadSources)
BEGIN
    INSERT INTO dbo.LeadSources (Name, Status) VALUES
    (N'Website', N'Active'),
    (N'Google', N'Active'),
    (N'Facebook', N'Active'),
    (N'Instagram', N'Active'),
    (N'LinkedIn', N'Active'),
    (N'WhatsApp', N'Active'),
    (N'Referral', N'Active'),
    (N'Upwork', N'Active'),
    (N'Fiverr', N'Active'),
    (N'Email', N'Active'),
    (N'Cold Call', N'Active'),
    (N'Existing Client', N'Active'),
    (N'Advertisement', N'Active'),
    (N'Other', N'Active');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.LeadStatuses)
BEGIN
    INSERT INTO dbo.LeadStatuses (Name, Description, SortOrder, Status) VALUES
    (N'New', N'Fresh enquiry awaiting first contact', 1, N'Active'),
    (N'Contacted', N'Initial contact has been made', 2, N'Active'),
    (N'Qualified', N'Requirements and budget confirmed', 3, N'Active'),
    (N'Follow-up', N'Active follow-up cycle', 4, N'Active'),
    (N'Proposal Sent', N'Commercial proposal issued', 5, N'Active'),
    (N'Negotiation', N'Commercial discussion in progress', 6, N'Active'),
    (N'Won', N'Converted client', 7, N'Active'),
    (N'Lost', N'Closed without conversion', 8, N'Active'),
    (N'On Hold', N'Paused by client or internal decision', 9, N'Active');
END
GO

/*
  Seed users. Password hashes are bcrypt.
  Default administrator username is: ifra consulting
  Hashes are also refreshed by: npm run seed:passwords
*/
IF NOT EXISTS (SELECT 1 FROM dbo.Users)
BEGIN
    INSERT INTO dbo.Users (Name, Username, Email, PasswordHash, Phone, Role, Status)
    VALUES
    (
        N'IFRA Consulting Admin',
        N'ifra consulting',
        N'admin@ifraconsulting.com',
        N'$2a$10$cMSXKyt9CfV8a6QTe4J4COMl9NmEi9blp0TaKmPd7.PBe1sB5oi1O',
        N'+92 300 1111111',
        N'ADMIN',
        N'Active'
    ),
    (
        N'Sarah Malik',
        N'sarah.manager',
        N'sarah.manager@ifraconsulting.com',
        N'$2a$10$e.4fzmjVWN1faDMz4hvwj.ZF6ypz0F721s5ysw3RzJwcBgErdwzVi',
        N'+92 300 2222222',
        N'SALES_MANAGER',
        N'Active'
    ),
    (
        N'Ali Raza',
        N'ali.sales',
        N'ali.sales@ifraconsulting.com',
        N'$2a$10$Z.vWpXErw0ooNJ5Yf8KXB.h0X0lugFSSH2n6M5SU3yX0Gvnwur8Fa',
        N'+92 300 3333333',
        N'SALES_EMPLOYEE',
        N'Active'
    ),
    (
        N'Hina Ahmed',
        N'hina.sales',
        N'hina.sales@ifraconsulting.com',
        N'$2a$10$Z.vWpXErw0ooNJ5Yf8KXB.h0X0lugFSSH2n6M5SU3yX0Gvnwur8Fa',
        N'+92 300 4444444',
        N'SALES_EMPLOYEE',
        N'Active'
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = N'user')
BEGIN
    INSERT INTO dbo.Users (Name, Username, Email, PasswordHash, Phone, Role, Status)
    VALUES (
        N'CRM User',
        N'user',
        N'user@ifraconsulting.com',
        N'$2a$10$e.4fzmjVWN1faDMz4hvwj.ZF6ypz0F721s5ysw3RzJwcBgErdwzVi',
        N'+92 300 5555555',
        N'SALES_EMPLOYEE',
        N'Active'
    );
END
GO

/* -------------------------------------------------------------------------- */
/* Sample CRM data (fictional software-house clients)                          */
/* -------------------------------------------------------------------------- */

IF NOT EXISTS (SELECT 1 FROM dbo.Leads)
BEGIN
    DECLARE @Admin INT = (SELECT Id FROM dbo.Users WHERE Username = N'ifra consulting');
    DECLARE @Manager INT = (SELECT Id FROM dbo.Users WHERE Username = N'sarah.manager');
    DECLARE @Ali INT = (SELECT Id FROM dbo.Users WHERE Username = N'ali.sales');
    DECLARE @Hina INT = (SELECT Id FROM dbo.Users WHERE Username = N'hina.sales');

    DECLARE @Web INT = (SELECT Id FROM dbo.Services WHERE Name = N'Web Development');
    DECLARE @Custom INT = (SELECT Id FROM dbo.Services WHERE Name = N'Custom Software Development');
    DECLARE @Mobile INT = (SELECT Id FROM dbo.Services WHERE Name = N'Mobile App Development');
    DECLARE @Ecom INT = (SELECT Id FROM dbo.Services WHERE Name = N'E-Commerce Development');
    DECLARE @Wp INT = (SELECT Id FROM dbo.Services WHERE Name = N'WordPress Development');
    DECLARE @Shopify INT = (SELECT Id FROM dbo.Services WHERE Name = N'Shopify Development');
    DECLARE @Uiux INT = (SELECT Id FROM dbo.Services WHERE Name = N'UI/UX Design');
    DECLARE @Seo INT = (SELECT Id FROM dbo.Services WHERE Name = N'SEO');
    DECLARE @Dmarketing INT = (SELECT Id FROM dbo.Services WHERE Name = N'Digital Marketing');
    DECLARE @Ai INT = (SELECT Id FROM dbo.Services WHERE Name = N'AI Development');
    DECLARE @Api INT = (SELECT Id FROM dbo.Services WHERE Name = N'API Development');
    DECLARE @Cloud INT = (SELECT Id FROM dbo.Services WHERE Name = N'Cloud Services');
    DECLARE @Erp INT = (SELECT Id FROM dbo.Services WHERE Name = N'ERP Development');
    DECLARE @Crm INT = (SELECT Id FROM dbo.Services WHERE Name = N'CRM Development');
    DECLARE @Maint INT = (SELECT Id FROM dbo.Services WHERE Name = N'Maintenance & Support');

    DECLARE @Website INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Website');
    DECLARE @Google INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Google');
    DECLARE @Facebook INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Facebook');
    DECLARE @Instagram INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Instagram');
    DECLARE @LinkedIn INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'LinkedIn');
    DECLARE @WhatsApp INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'WhatsApp');
    DECLARE @Referral INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Referral');
    DECLARE @Upwork INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Upwork');
    DECLARE @Fiverr INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Fiverr');
    DECLARE @EmailSrc INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Email');
    DECLARE @Cold INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Cold Call');
    DECLARE @Existing INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Existing Client');
    DECLARE @Ads INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Advertisement');

    DECLARE @New INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'New');
    DECLARE @Contacted INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'Contacted');
    DECLARE @Qualified INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'Qualified');
    DECLARE @Follow INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'Follow-up');
    DECLARE @Proposal INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'Proposal Sent');
    DECLARE @Negotiation INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'Negotiation');
    DECLARE @Won INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'Won');
    DECLARE @Lost INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'Lost');
    DECLARE @Hold INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'On Hold');

    INSERT INTO dbo.Leads (
        LeadCode, FirstName, LastName, CompanyName, Email, Phone, WhatsApp, Website,
        Country, City, Address, ServiceId, SourceId, StatusId, Priority, LeadTemperature,
        EstimatedBudget, Currency, AssignedTo, Description, Requirements, Notes, LostReason,
        NextFollowUpDate, NextFollowUpTime, CreatedBy, CreatedAt, LeadScore, ConversionDate,
        ConvertedBy, FinalAmount
    )
    VALUES
    (N'IFRA-000001', N'Ahmed', N'Hassan', N'Nexus Digital Solutions', N'ahmed.hassan@nexusdigital.example', N'03001234567', N'03001234567', N'https://nexusdigital.example', N'Pakistan', N'Lahore', N'Gulberg III', @Web, @Website, @New, N'High', N'Hot', 850000, N'PKR', @Ali, N'Corporate website with service pages and enquiry workflow.', N'Multilingual pages, CMS, lead capture forms.', N'Inbound from website form.', NULL, CAST(GETDATE() AS DATE), CAST(N'11:00' AS TIME(0)), @Admin, DATEADD(DAY, -2, GETDATE()), 82, NULL, NULL, NULL),
    (N'IFRA-000002', N'Fatima', N'Noor', N'BrightPath Education', N'fatima.noor@brightpath.example', N'03219876543', N'03219876543', N'https://brightpath.example', N'Pakistan', N'Karachi', N'Clifton Block 5', @Custom, @Referral, @Contacted, N'Medium', N'Warm', 1500000, N'PKR', @Ali, N'Student portal and admissions software.', N'Role-based access, fee module, parent notifications.', N'Referred by an existing school client.', NULL, CAST(GETDATE() AS DATE), CAST(N'15:30' AS TIME(0)), @Manager, DATEADD(DAY, -6, GETDATE()), 71, NULL, NULL, NULL),
    (N'IFRA-000003', N'Omar', N'Siddiqui', N'Apex Retail Group', N'omar.siddiqui@apexretail.example', N'03337654321', N'03337654321', NULL, N'Pakistan', N'Islamabad', N'F-7 Markaz', @Ecom, @LinkedIn, @Qualified, N'High', N'Hot', 2200000, N'PKR', @Hina, N'Multi-brand e-commerce storefront.', N'Inventory sync, COD, discounted campaigns.', NULL, NULL, DATEADD(DAY, 1, CAST(GETDATE() AS DATE)), CAST(N'10:00' AS TIME(0)), @Manager, DATEADD(DAY, -10, GETDATE()), 88, NULL, NULL, NULL),
    (N'IFRA-000004', N'Ayesha', N'Khan', N'GreenField Logistics', N'ayesha.khan@greenfield.example', N'03115551234', N'03115551234', N'https://greenfield.example', N'Pakistan', N'Lahore', N'Johar Town', @Erp, @Google, @Follow, N'Urgent', N'Hot', 4500000, N'PKR', @Ali, N'Fleet and warehouse ERP.', N'Dispatch, invoicing, GPS integration.', N'Decision maker available this week.', NULL, CAST(GETDATE() AS DATE), CAST(N'16:00' AS TIME(0)), @Admin, DATEADD(DAY, -12, GETDATE()), 91, NULL, NULL, NULL),
    (N'IFRA-000005', N'Bilal', N'Sheikh', N'Orion Health Systems', N'bilal.sheikh@orionhealth.example', N'03451230000', N'03451230000', NULL, N'Pakistan', N'Rawalpindi', N'Saddar', @Mobile, @Upwork, @Proposal, N'High', N'Warm', 1800000, N'PKR', @Hina, N'Patient appointment mobile app.', N'Android first, doctor calendar, reminders.', NULL, NULL, DATEADD(DAY, 2, CAST(GETDATE() AS DATE)), CAST(N'12:00' AS TIME(0)), @Manager, DATEADD(DAY, -15, GETDATE()), 76, NULL, NULL, NULL),
    (N'IFRA-000006', N'Sana', N'Qureshi', N'Lakeview Hospitality', N'sana.qureshi@lakeview.example', N'03024567890', N'03024567890', N'https://lakeview.example', N'Pakistan', N'Murree', N'Mall Road', @Uiux, @Instagram, @Negotiation, N'Medium', N'Warm', 420000, N'PKR', @Manager, N'Redesign of booking experience.', N'Wireframes plus design system.', NULL, NULL, DATEADD(DAY, 3, CAST(GETDATE() AS DATE)), CAST(N'14:00' AS TIME(0)), @Admin, DATEADD(DAY, -20, GETDATE()), 68, NULL, NULL, NULL),
    (N'IFRA-000007', N'Danish', N'Iqbal', N'Vertex Accounting', N'danish.iqbal@vertex.example', N'03225550011', N'03225550011', NULL, N'Pakistan', N'Lahore', N'DHA Phase 5', @Crm, @Existing, @Won, N'High', N'Hot', 1250000, N'PKR', @Ali, N'Internal CRM for tax advisory clients.', N'Pipeline, reminders, document vault.', N'Existing client expansion.', NULL, NULL, NULL, @Manager, DATEADD(DAY, -40, GETDATE()), 94, DATEADD(DAY, -5, GETDATE()), @Ali, 1180000),
    (N'IFRA-000008', N'Hira', N'Malik', N'Skyline Properties', N'hira.malik@skyline.example', N'03330004444', N'03330004444', NULL, N'Pakistan', N'Karachi', N'PECHS', @Seo, @Facebook, @Lost, N'Low', N'Cold', 180000, N'PKR', @Hina, N'SEO for property listings.', N'On-page SEO and Google Business.', N'No reply after two weeks.', N'No response', NULL, NULL, @Ali, DATEADD(DAY, -25, GETDATE()), 38, NULL, NULL, NULL),
    (N'IFRA-000009', N'Usman', N'Tariq', N'CloudNine Travel', N'usman.tariq@cloudnine.example', N'03007654321', N'03007654321', N'https://cloudnine.example', N'Pakistan', N'Islamabad', N'Blue Area', @Cloud, @WhatsApp, @Contacted, N'Medium', N'Warm', 950000, N'PKR', @Ali, N'Cloud migration of booking tools.', N'Azure landing zone and backups.', NULL, NULL, DATEADD(DAY, -1, CAST(GETDATE() AS DATE)), CAST(N'09:30' AS TIME(0)), @Manager, DATEADD(DAY, -4, GETDATE()), 64, NULL, NULL, NULL),
    (N'IFRA-000010', N'Nadia', N'Javed', N'PakCraft Exports', N'nadia.javed@pakcraft.example', N'03128889999', N'03128889999', N'https://pakcraft.example', N'Pakistan', N'Sialkot', N'Sambrial Road', @Shopify, @Fiverr, @Qualified, N'Medium', N'Warm', 650000, N'PKR', @Hina, N'Shopify store for export catalogue.', N'Multi-currency, shipping rules.', NULL, NULL, DATEADD(DAY, 4, CAST(GETDATE() AS DATE)), CAST(N'11:30' AS TIME(0)), @Admin, DATEADD(DAY, -8, GETDATE()), 70, NULL, NULL, NULL),
    (N'IFRA-000011', N'Hamza', N'Ali', N'Metro Foods', N'hamza.ali@metrofoods.example', N'03440001122', N'03440001122', NULL, N'Pakistan', N'Faisalabad', N'Susan Road', @Dmarketing, @Ads, @Follow, N'High', N'Hot', 300000, N'PKR', @Ali, N'Paid social campaigns for new SKU launch.', N'Facebook + Instagram, 90-day plan.', NULL, NULL, CAST(GETDATE() AS DATE), CAST(N'17:00' AS TIME(0)), @Hina, DATEADD(DAY, -3, GETDATE()), 73, NULL, NULL, NULL),
    (N'IFRA-000012', N'Zara', N'Hussain', N'EduSmart PK', N'zara.hussain@edusmart.example', N'03021112233', N'03021112233', NULL, N'Pakistan', N'Lahore', N'Model Town', @Ai, @Website, @New, N'Medium', N'Warm', 2100000, N'PKR', @Manager, N'AI tutor assistant for K-12 content.', N'Chat assistant, teacher dashboard.', NULL, NULL, DATEADD(DAY, 5, CAST(GETDATE() AS DATE)), CAST(N'13:00' AS TIME(0)), @Admin, DATEADD(DAY, -1, GETDATE()), 77, NULL, NULL, NULL),
    (N'IFRA-000013', N'Imran', N'Shah', N'FastPay Solutions', N'imran.shah@fastpay.example', N'03216667788', N'03216667788', N'https://fastpay.example', N'Pakistan', N'Karachi', N'I.I. Chundrigar', @Api, @LinkedIn, @Proposal, N'Urgent', N'Hot', 1750000, N'PKR', @Manager, N'Payment orchestration APIs.', N'Reconcile, webhooks, sandbox.', NULL, NULL, DATEADD(DAY, 1, CAST(GETDATE() AS DATE)), CAST(N'18:00' AS TIME(0)), @Admin, DATEADD(DAY, -18, GETDATE()), 86, NULL, NULL, NULL),
    (N'IFRA-000014', N'Maha', N'Rehman', N'CityCare Clinics', N'maha.rehman@citycare.example', N'03335556677', N'03335556677', NULL, N'Pakistan', N'Multan', N'Abdali Road', @Maint, @EmailSrc, @Hold, N'Low', N'Cold', 240000, N'PKR', @Hina, N'Support for existing clinic software.', N'Monthly SLA, after-hours option.', N'Waiting for internal budget approval.', NULL, DATEADD(DAY, 10, CAST(GETDATE() AS DATE)), CAST(N'10:30' AS TIME(0)), @Manager, DATEADD(DAY, -22, GETDATE()), 41, NULL, NULL, NULL),
    (N'IFRA-000015', N'Shahid', N'Mehmood', N'BuildRight Construction', N'shahid.mehmood@buildright.example', N'03009998877', N'03009998877', NULL, N'Pakistan', N'Peshawar', N'University Road', @Custom, @Cold, @New, N'Medium', N'Cold', 980000, N'PKR', @Ali, N'Project costing software for sites.', N'BOQ, vendor bills, site photos.', NULL, NULL, DATEADD(DAY, 2, CAST(GETDATE() AS DATE)), CAST(N'09:00' AS TIME(0)), @Hina, GETDATE(), 52, NULL, NULL, NULL),
    (N'IFRA-000016', N'Rabia', N'Aziz', N'Luxe Apparel', N'rabia.aziz@luxeapparel.example', N'03160007788', N'03160007788', N'https://luxeapparel.example', N'Pakistan', N'Karachi', N'Korangi', @Wp, @Instagram, @Contacted, N'Low', N'Warm', 275000, N'PKR', @Hina, N'WordPress catalogue for fashion line.', N'Lookbook, size guides, enquiry form.', NULL, NULL, DATEADD(DAY, 6, CAST(GETDATE() AS DATE)), CAST(N'15:00' AS TIME(0)), @Ali, DATEADD(DAY, -7, GETDATE()), 58, NULL, NULL, NULL),
    (N'IFRA-000017', N'Tariq', N'Anwar', N'National Freight Co', N'tariq.anwar@nfc.example', N'03428880011', N'03428880011', NULL, N'Pakistan', N'Lahore', N'Shahdara', @Erp, @Referral, @Won, N'High', N'Hot', 5200000, N'PKR', @Manager, N'Transport ERP covering lanes and billing.', N'POD capture, invoicing, partner portal.', NULL, NULL, NULL, NULL, @Admin, DATEADD(DAY, -55, GETDATE()), 96, DATEADD(DAY, -12, GETDATE()), @Manager, 4950000),
    (N'IFRA-000018', N'Kiran', N'Shahzad', N'Bloom Beauty', N'kiran.shahzad@bloom.example', N'03014445566', N'03014445566', NULL, N'Pakistan', N'Islamabad', N'Bahria Town', @Ecom, @Facebook, @Lost, N'Medium', N'Cold', 510000, N'PKR', @Ali, N'E-commerce for cosmetics brand.', N'Shopify alternative, loyalty points.', N'Chose another vendor on price.', N'Chose competitor', NULL, NULL, @Manager, DATEADD(DAY, -30, GETDATE()), 44, NULL, NULL, NULL);

    UPDATE dbo.NumberSequences SET NextValue = 19 WHERE Name = N'LEAD';

    DECLARE @L1 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000001');
    DECLARE @L2 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000002');
    DECLARE @L3 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000003');
    DECLARE @L4 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000004');
    DECLARE @L5 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000005');
    DECLARE @L7 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000007');
    DECLARE @L9 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000009');
    DECLARE @L11 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000011');
    DECLARE @L13 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000013');
    DECLARE @L17 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000017');

    INSERT INTO dbo.LeadActivities (LeadId, UserId, ActivityType, Title, Description, ActivityDate)
    VALUES
    (@L1, @Admin, N'Lead Created', N'Lead created', N'Website enquiry captured for Nexus Digital Solutions.', DATEADD(DAY, -2, GETDATE())),
    (@L1, @Ali, N'Assigned', N'Assigned to Ali Raza', N'Lead assigned for first contact.', DATEADD(DAY, -2, GETDATE())),
    (@L2, @Manager, N'Lead Created', N'Lead created', N'Referral from existing education client.', DATEADD(DAY, -6, GETDATE())),
    (@L2, @Ali, N'Call', N'Introductory call completed', N'Spoke with Fatima. Interested in admissions module.', DATEADD(DAY, -5, GETDATE())),
    (@L2, @Ali, N'Status Changed', N'Status changed to Contacted', N'First contact completed.', DATEADD(DAY, -5, GETDATE())),
    (@L3, @Hina, N'WhatsApp', N'WhatsApp contact', N'Shared capability deck on WhatsApp.', DATEADD(DAY, -9, GETDATE())),
    (@L3, @Hina, N'Status Changed', N'Status changed to Qualified', N'Budget range confirmed.', DATEADD(DAY, -8, GETDATE())),
    (@L4, @Ali, N'Meeting', N'Discovery meeting', N'Operations head walked through dispatch pain points.', DATEADD(DAY, -7, GETDATE())),
    (@L5, @Hina, N'Proposal Sent', N'Proposal issued', N'Mobile app proposal sent for review.', DATEADD(DAY, -3, GETDATE())),
    (@L7, @Ali, N'Status Changed', N'Status changed to Won', N'CRM project awarded to IFRA Consulting.', DATEADD(DAY, -5, GETDATE())),
    (@L9, @Ali, N'Call', N'Follow-up call', N'Client asked for Azure cost estimate.', DATEADD(DAY, -1, GETDATE())),
    (@L13, @Manager, N'Proposal Sent', N'API proposal sent', N'Commercial proposal shared with FastPay.', DATEADD(DAY, -4, GETDATE())),
    (@L17, @Manager, N'Status Changed', N'Status changed to Won', N'ERP contract signed.', DATEADD(DAY, -12, GETDATE()));

    INSERT INTO dbo.FollowUps (LeadId, UserId, FollowUpDate, FollowUpTime, FollowUpType, Subject, Notes, Status)
    VALUES
    (@L1, @Ali, CAST(GETDATE() AS DATE), CAST(N'11:00' AS TIME(0)), N'Call', N'First qualification call', N'Confirm website scope and timeline.', N'Pending'),
    (@L2, @Ali, CAST(GETDATE() AS DATE), CAST(N'15:30' AS TIME(0)), N'Video Call', N'Demo student portal', N'Share similar education case study.', N'Pending'),
    (@L4, @Ali, CAST(GETDATE() AS DATE), CAST(N'16:00' AS TIME(0)), N'Meeting', N'ERP workshop', N'Include warehouse supervisor.', N'Pending'),
    (@L9, @Ali, DATEADD(DAY, -1, CAST(GETDATE() AS DATE)), CAST(N'09:30' AS TIME(0)), N'Call', N'Cloud cost follow-up', N'Overdue — send estimate today.', N'Pending'),
    (@L3, @Hina, DATEADD(DAY, 1, CAST(GETDATE() AS DATE)), CAST(N'10:00' AS TIME(0)), N'Email', N'Share architecture outline', NULL, N'Pending'),
    (@L11, @Ali, CAST(GETDATE() AS DATE), CAST(N'17:00' AS TIME(0)), N'WhatsApp', N'Campaign brief reminder', NULL, N'Pending'),
    (@L5, @Hina, DATEADD(DAY, -8, CAST(GETDATE() AS DATE)), CAST(N'12:00' AS TIME(0)), N'Email', N'Sent proposal', N'Proposal emailed.', N'Completed');

    INSERT INTO dbo.Tasks (LeadId, AssignedTo, Title, Description, DueDate, DueTime, Priority, Status, CreatedBy)
    VALUES
    (@L1, @Ali, N'Prepare website sitemap', N'Draft sitemap before first call.', CAST(GETDATE() AS DATE), CAST(N'10:30' AS TIME(0)), N'High', N'In Progress', @Manager),
    (@L4, @Ali, N'Collect GPS vendor options', N'Three vendor options for fleet tracking.', DATEADD(DAY, 1, CAST(GETDATE() AS DATE)), CAST(N'17:00' AS TIME(0)), N'Urgent', N'Pending', @Admin),
    (@L5, @Hina, N'Follow proposal opening', N'Confirm whether the proposal was reviewed.', DATEADD(DAY, 2, CAST(GETDATE() AS DATE)), CAST(N'12:00' AS TIME(0)), N'Medium', N'Pending', @Manager),
    (@L13, @Manager, N'Send technical addendum', N'Webhook retry policy details.', CAST(GETDATE() AS DATE), CAST(N'18:30' AS TIME(0)), N'High', N'Pending', @Admin);

    INSERT INTO dbo.Proposals (LeadId, ProposalNumber, Title, Amount, Currency, SentDate, ValidUntil, Status, Notes, CreatedBy)
    VALUES
    (@L5, N'IFRA-P-000001', N'Orion Health patient app', 1750000, N'PKR', CAST(DATEADD(DAY, -3, GETDATE()) AS DATE), CAST(DATEADD(DAY, 18, GETDATE()) AS DATE), N'Sent', N'Android first, iOS phase 2.', @Hina),
    (@L13, N'IFRA-P-000002', N'FastPay orchestration APIs', 1680000, N'PKR', CAST(DATEADD(DAY, -4, GETDATE()) AS DATE), CAST(DATEADD(DAY, 11, GETDATE()) AS DATE), N'Viewed', N'Includes sandbox and SLA.', @Manager),
    (@L7, N'IFRA-P-000003', N'Vertex Accounting CRM', 1180000, N'PKR', CAST(DATEADD(DAY, -12, GETDATE()) AS DATE), CAST(DATEADD(DAY, -2, GETDATE()) AS DATE), N'Accepted', N'Signed after negotiation.', @Ali),
    (@L17, N'IFRA-P-000004', N'National Freight ERP', 4950000, N'PKR', CAST(DATEADD(DAY, -20, GETDATE()) AS DATE), CAST(DATEADD(DAY, -8, GETDATE()) AS DATE), N'Accepted', N'Phased delivery.', @Manager),
    (@L3, N'IFRA-P-000005', N'Apex Retail e-commerce', 2100000, N'PKR', NULL, CAST(DATEADD(DAY, 21, GETDATE()) AS DATE), N'Draft', N'Waiting for product catalogue.', @Hina);

    UPDATE dbo.NumberSequences SET NextValue = 6 WHERE Name = N'PROPOSAL';

    INSERT INTO dbo.Notifications (UserId, Title, Message, Type, ReferenceId, IsRead)
    VALUES
    (@Ali, N'New lead assigned', N'Nexus Digital Solutions (IFRA-000001) was assigned to you.', N'Lead Assigned', @L1, 0),
    (@Ali, N'Follow-up due', N'Follow-up with Ahmed Hassan is due today.', N'Follow-up Due', @L1, 0),
    (@Ali, N'Follow-up overdue', N'CloudNine Travel follow-up is overdue.', N'Follow-up Overdue', @L9, 0),
    (@Hina, N'New lead assigned', N'Apex Retail Group (IFRA-000003) was assigned to you.', N'Lead Assigned', @L3, 1),
    (@Manager, N'Proposal accepted', N'Vertex Accounting accepted proposal IFRA-P-000003.', N'Proposal Accepted', @L7, 0),
    (@Ali, N'Task due', N'Prepare website sitemap is due today.', N'Task Due', @L1, 0);

    INSERT INTO dbo.AuditLogs (UserId, Action, Module, RecordId, Description, IPAddress)
    VALUES
    (@Admin, N'Lead Created', N'Leads', @L1, N'IFRA Consulting Admin created Lead IFRA-000001', N'127.0.0.1'),
    (@Ali, N'Lead Assigned', N'Leads', @L1, N'Lead IFRA-000001 assigned to Ali Raza', N'127.0.0.1'),
    (@Hina, N'Status Changed', N'Leads', @L3, N'Hina Ahmed changed status of IFRA-000003 to Qualified', N'127.0.0.1'),
    (@Ali, N'Status Changed', N'Leads', @L7, N'Ali Raza changed status of IFRA-000007 to Won', N'127.0.0.1'),
    (@Manager, N'Proposal Created', N'Proposals', @L13, N'Sarah Malik created proposal IFRA-P-000002', N'127.0.0.1');
END
GO

PRINT N'IFRA Consulting Real Leads Management database is ready.';
PRINT N'Database: [real leads system]';
GO
