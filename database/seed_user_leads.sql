USE [real leads system];
GO

SET NOCOUNT ON;

IF EXISTS (SELECT 1 FROM dbo.Users WHERE Username = N'user')
AND NOT EXISTS (SELECT 1 FROM dbo.Leads WHERE LeadCode = N'IFRA-000019')
BEGIN
    DECLARE @User INT = (SELECT Id FROM dbo.Users WHERE Username = N'user');

    DECLARE @Web INT = (SELECT Id FROM dbo.Services WHERE Name = N'Web Development');
    DECLARE @Custom INT = (SELECT Id FROM dbo.Services WHERE Name = N'Custom Software Development');
    DECLARE @Mobile INT = (SELECT Id FROM dbo.Services WHERE Name = N'Mobile App Development');
    DECLARE @Ecom INT = (SELECT Id FROM dbo.Services WHERE Name = N'E-Commerce Development');
    DECLARE @Crm INT = (SELECT Id FROM dbo.Services WHERE Name = N'CRM Development');
    DECLARE @Seo INT = (SELECT Id FROM dbo.Services WHERE Name = N'SEO');
    DECLARE @Wp INT = (SELECT Id FROM dbo.Services WHERE Name = N'WordPress Development');
    DECLARE @Uiux INT = (SELECT Id FROM dbo.Services WHERE Name = N'UI/UX Design');

    DECLARE @Website INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Website');
    DECLARE @Google INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Google');
    DECLARE @Facebook INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Facebook');
    DECLARE @WhatsApp INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'WhatsApp');
    DECLARE @Referral INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'Referral');
    DECLARE @LinkedIn INT = (SELECT Id FROM dbo.LeadSources WHERE Name = N'LinkedIn');

    DECLARE @New INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'New');
    DECLARE @Contacted INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'Contacted');
    DECLARE @Qualified INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'Qualified');
    DECLARE @Follow INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'Follow-up');
    DECLARE @Proposal INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'Proposal Sent');
    DECLARE @Won INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'Won');
    DECLARE @Lost INT = (SELECT Id FROM dbo.LeadStatuses WHERE Name = N'Lost');

    INSERT INTO dbo.Leads (
        LeadCode, FirstName, LastName, CompanyName, Email, Phone, WhatsApp, Website,
        Country, City, Address, ServiceId, SourceId, StatusId, Priority, LeadTemperature,
        EstimatedBudget, Currency, AssignedTo, Description, Requirements, Notes, LostReason,
        NextFollowUpDate, NextFollowUpTime, CreatedBy, CreatedAt, LeadScore, ConversionDate,
        ConvertedBy, FinalAmount
    )
    VALUES
    (N'IFRA-000019', N'Saad', N'Malik', N'Horizon Traders', N'saad.malik@horizontraders.example', N'03021110001', N'03021110001', N'https://horizontraders.example', N'Pakistan', N'Lahore', N'Model Town', @Web, @Website, @New, N'High', N'Hot', 720000, N'PKR', @User, N'Company website with product catalogue.', N'CMS, enquiry form, Urdu/English pages.', N'Inbound website enquiry.', NULL, CAST(GETDATE() AS DATE), CAST(N'11:00' AS TIME(0)), @User, DATEADD(DAY, -1, GETDATE()), 74, NULL, NULL, NULL),
    (N'IFRA-000020', N'Mehwish', N'Raza', N'Saffron Boutique', N'mehwish.raza@saffron.example', N'03215550002', N'03215550002', NULL, N'Pakistan', N'Karachi', N'Gulshan-e-Iqbal', @Ecom, @Facebook, @Contacted, N'Medium', N'Warm', 480000, N'PKR', @User, N'Online store for boutique clothing.', N'COD, size guide, Instagram shop.', N'First call completed.', NULL, DATEADD(DAY, 1, CAST(GETDATE() AS DATE)), CAST(N'15:00' AS TIME(0)), @User, DATEADD(DAY, -4, GETDATE()), 66, NULL, NULL, NULL),
    (N'IFRA-000021', N'Faisal', N'Ahmed', N'NorthStar Clinics', N'faisal.ahmed@northstar.example', N'03336660003', N'03336660003', N'https://northstar.example', N'Pakistan', N'Islamabad', N'F-10', @Mobile, @Google, @Qualified, N'High', N'Hot', 1650000, N'PKR', @User, N'Clinic appointment mobile app.', N'Doctor calendar, SMS reminders, reports.', N'Budget confirmed.', NULL, DATEADD(DAY, 2, CAST(GETDATE() AS DATE)), CAST(N'10:30' AS TIME(0)), @User, DATEADD(DAY, -8, GETDATE()), 82, NULL, NULL, NULL),
    (N'IFRA-000022', N'Iqra', N'Sheikh', N'Canvas Studio', N'iqra.sheikh@canvas.example', N'03117770004', N'03117770004', NULL, N'Pakistan', N'Lahore', N'DHA Phase 6', @Uiux, @WhatsApp, @Follow, N'Medium', N'Warm', 310000, N'PKR', @User, N'Brand website redesign.', N'Wireframes, design system, handoff.', NULL, NULL, CAST(GETDATE() AS DATE), CAST(N'16:30' AS TIME(0)), @User, DATEADD(DAY, -3, GETDATE()), 61, NULL, NULL, NULL),
    (N'IFRA-000023', N'Kamran', N'Baig', N'Prime Auto Parts', N'kamran.baig@primeauto.example', N'03448880005', N'03448880005', NULL, N'Pakistan', N'Faisalabad', N'Susan Road', @Custom, @Referral, @Proposal, N'Urgent', N'Hot', 2100000, N'PKR', @User, N'Inventory and billing software.', N'Stock, invoices, dealer portal.', N'Proposal in review.', NULL, DATEADD(DAY, 3, CAST(GETDATE() AS DATE)), CAST(N'12:00' AS TIME(0)), @User, DATEADD(DAY, -12, GETDATE()), 85, NULL, NULL, NULL),
    (N'IFRA-000024', N'Nimra', N'Khalid', N'LearnHive Academy', N'nimra.khalid@learnhive.example', N'03029990006', N'03029990006', N'https://learnhive.example', N'Pakistan', N'Rawalpindi', N'Saddar', @Crm, @LinkedIn, @Won, N'High', N'Hot', 980000, N'PKR', @User, N'Admissions CRM for academy.', N'Leads, fees, parent WhatsApp alerts.', N'Closed this month.', NULL, NULL, NULL, @User, DATEADD(DAY, -28, GETDATE()), 92, DATEADD(DAY, -6, GETDATE()), @User, 940000),
    (N'IFRA-000025', N'Asad', N'Qazi', N'BluePeak Logistics', N'asad.qazi@bluepeak.example', N'03331110007', N'03331110007', NULL, N'Pakistan', N'Multan', N'Abdali Road', @Seo, @Google, @Lost, N'Low', N'Cold', 190000, N'PKR', @User, N'SEO for freight website.', N'On-page SEO and GMB.', N'Chose another vendor.', N'Chose competitor', NULL, NULL, @User, DATEADD(DAY, -18, GETDATE()), 36, NULL, NULL, NULL),
    (N'IFRA-000026', N'Hafsa', N'Nawaz', N'Rose Petal Events', N'hafsa.nawaz@rosepetal.example', N'03112220008', N'03112220008', NULL, N'Pakistan', N'Lahore', N'Johar Town', @Wp, @Facebook, @Contacted, N'Medium', N'Warm', 255000, N'PKR', @User, N'WordPress site for event bookings.', N'Gallery, enquiry form, package pages.', NULL, NULL, DATEADD(DAY, 4, CAST(GETDATE() AS DATE)), CAST(N'14:00' AS TIME(0)), @User, DATEADD(DAY, -2, GETDATE()), 57, NULL, NULL, NULL);

    UPDATE dbo.NumberSequences
    SET NextValue = CASE WHEN NextValue < 27 THEN 27 ELSE NextValue END
    WHERE Name = N'LEAD';

    DECLARE @U19 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000019');
    DECLARE @U20 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000020');
    DECLARE @U21 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000021');
    DECLARE @U22 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000022');
    DECLARE @U23 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000023');
    DECLARE @U24 INT = (SELECT Id FROM dbo.Leads WHERE LeadCode = N'IFRA-000024');

    INSERT INTO dbo.LeadActivities (LeadId, UserId, ActivityType, Title, Description, ActivityDate)
    VALUES
    (@U19, @User, N'Lead Created', N'Lead created', N'Horizon Traders enquiry captured.', DATEADD(DAY, -1, GETDATE())),
    (@U20, @User, N'Call', N'Introductory call', N'Spoke with Mehwish about the boutique store.', DATEADD(DAY, -3, GETDATE())),
    (@U20, @User, N'Status Changed', N'Status changed to Contacted', N'First contact completed.', DATEADD(DAY, -3, GETDATE())),
    (@U21, @User, N'WhatsApp', N'Shared capability deck', N'Sent clinic app examples on WhatsApp.', DATEADD(DAY, -6, GETDATE())),
    (@U21, @User, N'Status Changed', N'Status changed to Qualified', N'Budget and timeline confirmed.', DATEADD(DAY, -5, GETDATE())),
    (@U22, @User, N'Follow-up', N'Design follow-up', N'Waiting on brand colours.', DATEADD(DAY, -1, GETDATE())),
    (@U23, @User, N'Proposal Sent', N'Proposal issued', N'Inventory software proposal sent.', DATEADD(DAY, -4, GETDATE())),
    (@U24, @User, N'Status Changed', N'Status changed to Won', N'Admissions CRM awarded.', DATEADD(DAY, -6, GETDATE()));

    INSERT INTO dbo.FollowUps (LeadId, UserId, FollowUpDate, FollowUpTime, FollowUpType, Subject, Notes, Status)
    VALUES
    (@U19, @User, CAST(GETDATE() AS DATE), CAST(N'11:00' AS TIME(0)), N'Call', N'First qualification call', N'Confirm catalogue pages and timeline.', N'Pending'),
    (@U20, @User, DATEADD(DAY, 1, CAST(GETDATE() AS DATE)), CAST(N'15:00' AS TIME(0)), N'WhatsApp', N'Share store examples', N'Send two similar boutique sites.', N'Pending'),
    (@U21, @User, DATEADD(DAY, 2, CAST(GETDATE() AS DATE)), CAST(N'10:30' AS TIME(0)), N'Meeting', N'App discovery meeting', N'Include clinic reception lead.', N'Pending'),
    (@U22, @User, CAST(GETDATE() AS DATE), CAST(N'16:30' AS TIME(0)), N'Email', N'Brand colour follow-up', N'Overdue if colours not received.', N'Pending');

    INSERT INTO dbo.Tasks (LeadId, AssignedTo, Title, Description, DueDate, DueTime, Priority, Status, CreatedBy)
    VALUES
    (@U19, @User, N'Prepare website sitemap', N'Draft sitemap before the first call.', CAST(GETDATE() AS DATE), CAST(N'10:00' AS TIME(0)), N'High', N'In Progress', @User),
    (@U21, @User, N'Collect clinic workflow notes', N'Reception, doctor slots, reminders.', DATEADD(DAY, 1, CAST(GETDATE() AS DATE)), CAST(N'17:00' AS TIME(0)), N'Urgent', N'Pending', @User),
    (@U23, @User, N'Follow proposal opening', N'Confirm whether Prime Auto reviewed the proposal.', DATEADD(DAY, 2, CAST(GETDATE() AS DATE)), CAST(N'12:00' AS TIME(0)), N'Medium', N'Pending', @User);

    INSERT INTO dbo.Proposals (LeadId, ProposalNumber, Title, Amount, Currency, SentDate, ValidUntil, Status, Notes, CreatedBy)
    VALUES
    (@U23, N'IFRA-P-000006', N'Prime Auto inventory software', 2050000, N'PKR', CAST(DATEADD(DAY, -4, GETDATE()) AS DATE), CAST(DATEADD(DAY, 16, GETDATE()) AS DATE), N'Sent', N'Includes dealer portal phase 1.', @User),
    (@U24, N'IFRA-P-000007', N'LearnHive admissions CRM', 940000, N'PKR', CAST(DATEADD(DAY, -14, GETDATE()) AS DATE), CAST(DATEADD(DAY, -1, GETDATE()) AS DATE), N'Accepted', N'Signed after a short negotiation.', @User);

    UPDATE dbo.NumberSequences
    SET NextValue = CASE WHEN NextValue < 8 THEN 8 ELSE NextValue END
    WHERE Name = N'PROPOSAL';

    INSERT INTO dbo.Notifications (UserId, Title, Message, Type, ReferenceId, IsRead)
    VALUES
    (@User, N'Follow-up due', N'Follow-up with Saad Malik (Horizon Traders) is due today.', N'Follow-up Due', @U19, 0),
    (@User, N'Proposal sent', N'Proposal IFRA-P-000006 was sent to Prime Auto Parts.', N'Proposal Sent', @U23, 0);

    PRINT N'User sample leads, follow-ups, tasks and proposals added.';
END
ELSE
BEGIN
    PRINT N'Skipped: user account missing or sample leads already exist.';
END
GO

