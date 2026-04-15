import { useEffect, useState, lazy, Suspense } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { TopBar } from './components/Layout/TopBar';
import { CanvasArea } from './components/Canvas/CanvasArea';
import { ListView } from './components/ListView/ListView';
import { FocusView } from './components/FocusView/FocusView';
import { ToastContainer } from './components/UI/Toast';
import { LoadingScreen } from './components/UI/LoadingScreen';
import { useWorkspaceStore } from './store/workspaceStore';
import { useWorkspaceSync } from './hooks/useWorkspaceSync';

const FlowGenerator = lazy(() =>
    import('./components/FlowGenerator/FlowGenerator').then(m => ({ default: m.FlowGenerator }))
);
const MarkdownImporter = lazy(() =>
    import('./components/FlowGenerator/MarkdownImporter').then(m => ({ default: m.MarkdownImporter }))
);

function App() {
    useWorkspaceSync();

    const supabaseLoaded = useWorkspaceStore(state => state._supabaseLoaded);
    const activeProjectId = useWorkspaceStore(state => state.activeProjectId);
    const projects = useWorkspaceStore(state => state.projects);
    const loadProject = useWorkspaceStore(state => state.loadProject);
    const viewMode = useWorkspaceStore(state => state.viewMode);
    const [showFlowGenerator, setShowFlowGenerator] = useState(false);
    const [showMarkdownImporter, setShowMarkdownImporter] = useState(false);

    useEffect(() => {
        if (!activeProjectId && projects.length > 0) {
            loadProject(projects[0].id);
        }
    }, [activeProjectId, projects, loadProject]);

    if (!supabaseLoaded) {
        return <LoadingScreen message="Loading your workspace..." />;
    }

    return (
        <div className="flex w-screen h-screen overflow-hidden bg-black text-white font-sans selection:bg-purple-500/30" style={{ paddingTop: 'var(--sat, 0px)' }}>
            <Sidebar onGenerateFlow={() => setShowFlowGenerator(true)} onImportPlan={() => setShowMarkdownImporter(true)} />
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <TopBar />
                {viewMode === 'list'
                    ? <ListView />
                    : viewMode === 'focus'
                        ? <FocusView />
                        : <CanvasArea onGenerateFlow={() => setShowFlowGenerator(true)} />}
            </div>
            <ToastContainer />
            <Suspense fallback={null}>
                {showFlowGenerator && <FlowGenerator open={showFlowGenerator} onClose={() => setShowFlowGenerator(false)} />}
                {showMarkdownImporter && <MarkdownImporter open={showMarkdownImporter} onClose={() => setShowMarkdownImporter(false)} />}
            </Suspense>
        </div>
    );
}

export default App;
