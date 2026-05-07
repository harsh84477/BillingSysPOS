import React from 'react';
import UsersTab from '@/components/super-admin/UsersTab';

const SuperAdminUsers = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Platform Users</h1>
                <p className="text-muted-foreground mt-1">Manage all users, roles, and business associations across the platform.</p>
            </div>
            <UsersTab />
        </div>
    );
};

export default SuperAdminUsers;
