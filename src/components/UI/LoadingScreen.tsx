import React from 'react';
import { FolderGit2 } from 'lucide-react';

export const LoadingScreen: React.FC<{ message?: string }> = ({
    message = 'Loading...',
}) => {
    return (
        <div className="flex items-center justify-center w-screen h-screen bg-black">
            <div className="flex flex-col items-center gap-4">
                <FolderGit2 className="w-10 h-10 text-purple-400 animate-pulse" />
                <p className="text-sm text-gray-400">{message}</p>
            </div>
        </div>
    );
};
