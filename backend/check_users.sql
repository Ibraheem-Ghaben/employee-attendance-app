SELECT 
    role,
    COUNT(*) as total_users
FROM [dbo].[Users]
GROUP BY role
ORDER BY role;

SELECT TOP 10
    username,
    employee_code,
    full_name,
    role,
    is_active
FROM [dbo].[Users]
WHERE role = 'employee'
ORDER BY username;
