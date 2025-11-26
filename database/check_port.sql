-- Esegui questa query in SQL Server Management Studio per trovare la porta
-- Connettiti a: localhost\SQLEXPRESS

USE master;
GO

-- Metodo 1: Verifica impostazioni di rete
EXEC xp_readerrorlog 0, 1, N'Server is listening on';
GO

-- Metodo 2: Verifica registry
EXEC xp_instance_regread 
    N'HKEY_LOCAL_MACHINE', 
    N'SOFTWARE\Microsoft\Microsoft SQL Server\MSSQLServer\SuperSocketNetLib\Tcp\IPAll', 
    N'TcpPort';
GO

EXEC xp_instance_regread 
    N'HKEY_LOCAL_MACHINE', 
    N'SOFTWARE\Microsoft\Microsoft SQL Server\MSSQLServer\SuperSocketNetLib\Tcp\IPAll', 
    N'TcpDynamicPorts';
GO
