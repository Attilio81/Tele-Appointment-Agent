-- ============================================
-- Script di creazione Database Agenda Appuntamenti
-- Per SQL Server
-- ============================================

-- Crea il database
CREATE DATABASE TeleAppointmentDB;
GO

-- Usa il database appena creato
USE TeleAppointmentDB;
GO

-- ============================================
-- Tabella: AvailableSlots
-- Gestisce gli slot temporali disponibili
-- ============================================
CREATE TABLE AvailableSlots (
    SlotID INT PRIMARY KEY IDENTITY(1,1),
    Date DATE NOT NULL,
    StartTime TIME(0) NOT NULL,
    EndTime TIME(0) NOT NULL,
    IsBooked BIT NOT NULL DEFAULT 0,
    MaxCapacity INT NOT NULL DEFAULT 1, -- Numero massimo di prenotazioni per slot
    CurrentBookings INT NOT NULL DEFAULT 0, -- Prenotazioni correnti
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CHK_TimeRange CHECK (EndTime > StartTime),
    CONSTRAINT CHK_Capacity CHECK (CurrentBookings <= MaxCapacity)
);
GO

-- ============================================
-- Tabella: Appointments
-- Gestisce le prenotazioni degli appuntamenti
-- ============================================
CREATE TABLE Appointments (
    AppointmentID INT PRIMARY KEY IDENTITY(1,1),
    SlotID INT NOT NULL,
    CustomerName NVARCHAR(200) NOT NULL,
    CustomerPhone NVARCHAR(50),
    CustomerEmail NVARCHAR(200),
    AppointmentType NVARCHAR(100), -- Es: "Consulenza", "Visita", ecc.
    Notes NVARCHAR(MAX),
    Status NVARCHAR(50) NOT NULL DEFAULT 'Confermato', -- Confermato, Cancellato, Completato
    BookedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CancelledAt DATETIME2 NULL,
    CONSTRAINT FK_Appointments_Slots FOREIGN KEY (SlotID) REFERENCES AvailableSlots(SlotID)
);
GO

-- ============================================
-- Tabella: WorkingHours
-- Definisce gli orari di lavoro settimanali
-- ============================================
CREATE TABLE WorkingHours (
    WorkingHourID INT PRIMARY KEY IDENTITY(1,1),
    DayOfWeek INT NOT NULL, -- 1=Lunedì, 7=Domenica
    StartTime TIME(0) NOT NULL,
    EndTime TIME(0) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    SlotDurationMinutes INT NOT NULL DEFAULT 30,
    CONSTRAINT CHK_DayOfWeek CHECK (DayOfWeek BETWEEN 1 AND 7),
    CONSTRAINT CHK_WorkingTimeRange CHECK (EndTime > StartTime)
);
GO

-- ============================================
-- Tabella: Holidays
-- Gestisce i giorni festivi/chiusure
-- ============================================
CREATE TABLE Holidays (
    HolidayID INT PRIMARY KEY IDENTITY(1,1),
    Date DATE NOT NULL UNIQUE,
    Description NVARCHAR(200),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================
-- Indici per ottimizzare le query
-- ============================================
CREATE INDEX IX_AvailableSlots_Date ON AvailableSlots(Date, IsBooked);
CREATE INDEX IX_AvailableSlots_DateTime ON AvailableSlots(Date, StartTime);
CREATE INDEX IX_Appointments_Status ON Appointments(Status);
CREATE INDEX IX_Appointments_SlotID ON Appointments(SlotID);
CREATE INDEX IX_Appointments_CustomerPhone ON Appointments(CustomerPhone);
GO

-- ============================================
-- Trigger: Aggiorna timestamp UpdatedAt
-- ============================================
CREATE TRIGGER TR_AvailableSlots_UpdateTimestamp
ON AvailableSlots
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE AvailableSlots
    SET UpdatedAt = GETDATE()
    FROM AvailableSlots s
    INNER JOIN inserted i ON s.SlotID = i.SlotID;
END;
GO

-- ============================================
-- Trigger: Aggiorna contatore prenotazioni
-- ============================================
CREATE TRIGGER TR_Appointments_UpdateSlotBookings
ON Appointments
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Ricalcola il conteggio per gli slot coinvolti
    UPDATE s
    SET CurrentBookings = (
        SELECT COUNT(*)
        FROM Appointments a
        WHERE a.SlotID = s.SlotID 
        AND a.Status = 'Confermato'
    ),
    IsBooked = CASE 
        WHEN (SELECT COUNT(*) FROM Appointments a WHERE a.SlotID = s.SlotID AND a.Status = 'Confermato') >= s.MaxCapacity 
        THEN 1 
        ELSE 0 
    END
    FROM AvailableSlots s
    WHERE s.SlotID IN (
        SELECT SlotID FROM inserted
        UNION
        SELECT SlotID FROM deleted
    );
END;
GO

-- ============================================
-- Stored Procedure: Genera slot automaticamente
-- ============================================
CREATE PROCEDURE sp_GenerateSlots
    @StartDate DATE,
    @EndDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CurrentDate DATE = @StartDate;
    DECLARE @DayOfWeek INT;
    
    WHILE @CurrentDate <= @EndDate
    BEGIN
        SET @DayOfWeek = DATEPART(WEEKDAY, @CurrentDate);
        
        -- Salta i giorni festivi
        IF NOT EXISTS (SELECT 1 FROM Holidays WHERE Date = @CurrentDate)
        BEGIN
            -- Inserisci gli slot basati sugli orari di lavoro
            INSERT INTO AvailableSlots (Date, StartTime, EndTime)
            SELECT 
                @CurrentDate,
                StartTime,
                DATEADD(MINUTE, SlotDurationMinutes, StartTime)
            FROM WorkingHours
            WHERE DayOfWeek = @DayOfWeek 
            AND IsActive = 1
            AND NOT EXISTS (
                SELECT 1 FROM AvailableSlots 
                WHERE Date = @CurrentDate 
                AND StartTime = WorkingHours.StartTime
            );
        END
        
        SET @CurrentDate = DATEADD(DAY, 1, @CurrentDate);
    END
END;
GO

-- ============================================
-- View: Slot disponibili per l'agente
-- ============================================
CREATE VIEW vw_AvailableSlots AS
SELECT 
    s.SlotID,
    s.Date,
    s.StartTime,
    s.EndTime,
    s.IsBooked,
    s.MaxCapacity,
    s.CurrentBookings,
    (s.MaxCapacity - s.CurrentBookings) AS SlotsRemaining,
    CONVERT(VARCHAR(10), s.Date, 103) AS FormattedDate,
    CONVERT(VARCHAR(5), s.StartTime, 108) AS FormattedStartTime,
    CONVERT(VARCHAR(5), s.EndTime, 108) AS FormattedEndTime
FROM AvailableSlots s
WHERE s.Date >= CAST(GETDATE() AS DATE)
AND s.CurrentBookings < s.MaxCapacity;
GO

-- ============================================
-- Dati di esempio: Orari di lavoro (Lun-Ven, 9:00-18:00)
-- ============================================
INSERT INTO WorkingHours (DayOfWeek, StartTime, EndTime, SlotDurationMinutes) VALUES
(1, '09:00', '18:00', 30), -- Lunedì
(2, '09:00', '18:00', 30), -- Martedì
(3, '09:00', '18:00', 30), -- Mercoledì
(4, '09:00', '18:00', 30), -- Giovedì
(5, '09:00', '18:00', 30); -- Venerdì
GO

-- ============================================
-- Query utili per l'agente AI
-- ============================================

-- Query 1: Trova prossimi slot disponibili
-- SELECT TOP 10 * FROM vw_AvailableSlots ORDER BY Date, StartTime;

-- Query 2: Prenota un appuntamento
-- INSERT INTO Appointments (SlotID, CustomerName, CustomerPhone, AppointmentType)
-- VALUES (1, 'Mario Rossi', '+39 123 456 7890', 'Consulenza');

-- Query 3: Cancella appuntamento
-- UPDATE Appointments SET Status = 'Cancellato', CancelledAt = GETDATE() WHERE AppointmentID = 1;

-- Query 4: Genera slot per il prossimo mese
-- EXEC sp_GenerateSlots @StartDate = '2025-12-01', @EndDate = '2025-12-31';

PRINT 'Database TeleAppointmentDB creato con successo!';
GO
