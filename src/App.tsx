import { useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { TopBar } from './components/Layout/TopBar';
import { CanvasArea } from './components/Canvas/CanvasArea';
import { useWorkspaceStore } from './store/workspaceStore';

function App() {
    // Hydration check could go here, but zustand/persist handles basic hydration.
    // We force a loadProject if none is active on mount, or rely on store init.
    const activeProjectId = useWorkspaceStore(state => state.activeProjectId);
    const projects = useWorkspaceStore(state => state.projects);
    const loadProject = useWorkspaceStore(state => state.loadProject);

    useEffect(() => {
        if (!activeProjectId && projects.length > 0) {
            loadProject(projects[0].id);
        }
    }, [activeProjectId, projects, loadProject]);

    return (
        <div className="flex w-screen h-screen overflow-hidden bg-black text-white font-sans selection:bg-purple-500/30">
            <Sidebar />
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <TopBar />
                <CanvasArea />
            </div>
            {/* Right panel (Inspector) could go here */}
        </div>
    );
}

export default App;
