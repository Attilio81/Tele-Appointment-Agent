-- ============================================
-- TROVA LA PORTA ATTUALE DI SQL SERVER EXPRESS
-- ============================================
-- Connettiti in SSMS a: localhost\SQLEXPRESS
-- Poi esegui questo script

-- Trova la porta attuale
EXEC xp_readerrorlog 0, 1, N'Server is listening on';
GO

-- Se non vedi nulla, SQL Server potrebbe usare Named Pipes invece di TCP/IP
-- In quel caso, devi abilitare TCP/IP tramite Configuration Manager

PRINT '=====================================';
PRINT 'Se vedi "Server is listening on [ any ] <porta>"';
PRINT 'Usa quella porta nel file .env come DB_PORT';
PRINT '=====================================';
GO
