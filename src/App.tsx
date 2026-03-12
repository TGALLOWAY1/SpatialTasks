import { useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { TopBar } from './components/Layout/TopBar';
import { CanvasArea } from './components/Canvas/CanvasArea';
import { ListView } from './components/ListView/ListView';
import { ToastContainer } from './components/UI/Toast';
import { LoadingScreen } from './components/UI/LoadingScreen';
import { useWorkspaceStore } from './store/workspaceStore';
import { useWorkspaceSync } from './hooks/useWorkspaceSync';

function App() {
    useWorkspaceSync();

    const supabaseLoaded = useWorkspaceStore(state => state._supabaseLoaded);
    const activeProjectId = useWorkspaceStore(state => state.activeProjectId);
    const projects = useWorkspaceStore(state => state.projects);
    const loadProject = useWorkspaceStore(state => state.loadProject);
    const viewMode = useWorkspaceStore(state => state.viewMode);

    useEffect(() => {
        if (!activeProjectId && projects.length > 0) {
            loadProject(projects[0].id);
        }
    }, [activeProjectId, projects, loadProject]);

    if (!supabaseLoaded) {
        return <LoadingScreen message="Loading your workspace..." />;
    }

    return (
        <div className="flex w-screen h-screen overflow-hidden bg-black text-white font-sans selection:bg-purple-500/30">
            <Sidebar />
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <TopBar />
                {viewMode === 'list' ? <ListView /> : <CanvasArea />}
            </div>
            <ToastContainer />
        </div>
    );
}

export default App;
