import { v4 as uuidv4 } from 'uuid';
import seedrandom from 'seedrandom';
import { Workspace, Project, Graph, Node, Edge, NodeStatus } from '../types';

interface GeneratorContext {
    rng: seedrandom.PRNG;
    graphs: Record<string, Graph>;
}

const WIDTH = 200;
const HEIGHT = 80;
const PADDING_X = 50;


function createGraph(ctx: GeneratorContext, projectId: string, title: string): Graph {
    const id = uuidv4();
    const graph: Graph = {
        id,
        projectId,
        title,
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
    };
    ctx.graphs[id] = graph;
    return graph;
}

function createNode(
    graph: Graph,
    type: 'action' | 'container',
    title: string,
    x: number,
    y: number,
    status: NodeStatus = 'todo'
): Node {
    const node: Node = {
        id: uuidv4(),
        graphId: graph.id,
        type,
        title,
        x,
        y,
        width: WIDTH,
        height: HEIGHT,
        status: type === 'action' ? status : undefined,
    };
    graph.nodes.push(node);
    return node;
}

function connect(graph: Graph, from: Node, to: Node) {
    const edge: Edge = {
        id: uuidv4(),
        graphId: graph.id,
        source: from.id,
        target: to.id
    };
    graph.edges.push(edge);
}

// Layout helper (simple horizontal flow)
function layoutNodes(nodes: Node[], startX: number = 0, startY: number = 0) {
    nodes.forEach((node, i) => {
        node.x = startX + i * (WIDTH + PADDING_X);
        node.y = startY + (i % 2 === 0 ? 0 : 50); // slight stagger
    });
}

function generateMorningFlow(ctx: GeneratorContext, projectId: string): string {
    const root = createGraph(ctx, projectId, "Morning Flow Root");

    // Root Nodes
    const wake = createNode(root, 'action', 'Wake Up', 0, 0, 'done');
    const hydrate = createNode(root, 'action', 'Hydrate', 0, 0, 'done');

    const workout = createNode(root, 'container', 'Workout', 0, 0);
    const breakfast = createNode(root, 'container', 'Breakfast', 0, 0);
    const planDay = createNode(root, 'container', 'Plan Day', 0, 0);

    layoutNodes([wake, hydrate, workout, breakfast, planDay]);

    connect(root, wake, hydrate);
    connect(root, hydrate, workout);
    connect(root, workout, breakfast);
    connect(root, breakfast, planDay);

    // Workout Subgraph
    const workoutGraph = createGraph(ctx, projectId, "Workout Routine");
    workout.childGraphId = workoutGraph.id;

    const warmup = createNode(workoutGraph, 'action', 'Warmup', 0, 0, 'done');
    const mainSet = createNode(workoutGraph, 'action', 'Main Set', 0, 0, 'in_progress');
    const cooldown = createNode(workoutGraph, 'action', 'Cooldown', 0, 0, 'todo');
    const mobility = createNode(workoutGraph, 'action', 'Mobility', 0, 0, 'todo');

    layoutNodes([warmup, mainSet, cooldown]);
    mobility.x = mainSet.x;
    mobility.y = mainSet.y + 150; // Parallel branch

    connect(workoutGraph, warmup, mainSet);
    connect(workoutGraph, mainSet, cooldown);
    connect(workoutGraph, warmup, mobility); // branch

    // Breakfast Subgraph
    const breakfastGraph = createGraph(ctx, projectId, "Breakfast Prep");
    breakfast.childGraphId = breakfastGraph.id;

    const prep = createNode(breakfastGraph, 'action', 'Prep Ingredients', 0, 0, 'todo');
    const cook = createNode(breakfastGraph, 'action', 'Cook', 0, 0, 'todo');
    const eat = createNode(breakfastGraph, 'action', 'Eat', 0, 0, 'todo');
    const clean = createNode(breakfastGraph, 'action', 'Clean Up', 0, 0, 'todo');

    layoutNodes([prep, cook, eat, clean]);
    connect(breakfastGraph, prep, cook);
    connect(breakfastGraph, cook, eat);
    connect(breakfastGraph, eat, clean);

    // Plan Day Subgraph (Empty for now/Optional)
    const planGraph = createGraph(ctx, projectId, "Daily Planning");
    planDay.childGraphId = planGraph.id;
    const review = createNode(planGraph, 'action', 'Review Calendar', 0, 0, 'todo');
    const prioritize = createNode(planGraph, 'action', 'Prioritize Tasks', 0, 0, 'todo');
    layoutNodes([review, prioritize]);
    connect(planGraph, review, prioritize);

    return root.id;
}

function generateLandingPage(ctx: GeneratorContext, projectId: string): string {
    const root = createGraph(ctx, projectId, "Landing Page Launch");

    const defineOffer = createNode(root, 'container', 'Define Offer', 0, 0);
    const writeCopy = createNode(root, 'container', 'Write Copy', 0, 0);
    const design = createNode(root, 'action', 'Design Mockups', 0, 0, 'todo');
    const build = createNode(root, 'action', 'Build Frontend', 0, 0, 'todo');
    const analytics = createNode(root, 'action', 'Setup Analytics', 0, 0, 'todo');
    const deploy = createNode(root, 'action', 'Deploy', 0, 0, 'todo');

    layoutNodes([defineOffer, writeCopy, design, build, analytics, deploy]);

    connect(root, defineOffer, writeCopy);
    connect(root, writeCopy, design);
    connect(root, design, build);
    connect(root, build, deploy);
    connect(root, analytics, deploy); // Multiple deps for deploy

    // Define Offer Subgraph
    const offerGraph = createGraph(ctx, projectId, "Offer Value Prop");
    defineOffer.childGraphId = offerGraph.id;

    const audience = createNode(offerGraph, 'action', 'Target Audience', 0, 0, 'done');
    const valueProp = createNode(offerGraph, 'action', 'Value Proposition', 0, 0, 'done');
    const pricing = createNode(offerGraph, 'action', 'Pricing Model', 0, 0, 'done');
    const proof = createNode(offerGraph, 'action', 'Social Proof', 0, 0, 'in_progress');

    layoutNodes([audience, valueProp, pricing, proof]);
    connect(offerGraph, audience, valueProp);
    connect(offerGraph, valueProp, pricing);
    connect(offerGraph, pricing, proof);

    // Copy Subgraph
    const copyGraph = createGraph(ctx, projectId, "Sales Copy");
    writeCopy.childGraphId = copyGraph.id;

    const headline = createNode(copyGraph, 'action', 'Headline', 0, 0, 'done');
    const sections = createNode(copyGraph, 'action', 'Body Sections', 0, 0, 'in_progress');
    const cta = createNode(copyGraph, 'action', 'CTA', 0, 0, 'todo');
    const review = createNode(copyGraph, 'action', 'Peer Review', 0, 0, 'todo');

    layoutNodes([headline, sections, cta, review]);
    connect(copyGraph, headline, sections);
    connect(copyGraph, sections, cta);
    connect(copyGraph, cta, review);

    return root.id;
}

function generateMixdown(ctx: GeneratorContext, projectId: string): string {
    const root = createGraph(ctx, projectId, "Mixdown Pipeline");

    const gain = createNode(root, 'action', 'Gain Staging', 0, 0, 'done');
    const drums = createNode(root, 'container', 'Drums Bus', 0, 0);
    const bass = createNode(root, 'container', 'Bass Bus', 0, 0);
    const ref = createNode(root, 'action', 'Ref Check', 0, 0, 'todo');
    const bounce = createNode(root, 'action', 'Bounce', 0, 0, 'todo');

    layoutNodes([gain, drums, bass, ref, bounce]);

    connect(root, gain, drums);
    connect(root, gain, bass);
    connect(root, drums, ref);
    connect(root, bass, ref);
    connect(root, ref, bounce);

    // Drums Subgraph
    const drumsGraph = createGraph(ctx, projectId, "Drums Processing");
    drums.childGraphId = drumsGraph.id;

    const trans = createNode(drumsGraph, 'action', 'Transients', 0, 0, 'done');
    const eq = createNode(drumsGraph, 'action', 'EQ', 0, 0, 'done');
    const comp = createNode(drumsGraph, 'action', 'Compression', 0, 0, 'in_progress');

    // Nested Container!
    const altPath = createNode(drumsGraph, 'container', 'Alt Path / Fixes', 0, 0);
    const sat = createNode(drumsGraph, 'action', 'Saturation', 0, 0, 'todo');

    layoutNodes([trans, eq, comp, sat]);
    altPath.x = comp.x;
    altPath.y = comp.y + 150;

    connect(drumsGraph, trans, eq);
    connect(drumsGraph, eq, comp);
    connect(drumsGraph, comp, sat);
    connect(drumsGraph, eq, altPath); // Alternat branch

    // Nested Subgraph for Alt Path
    const altGraph = createGraph(ctx, projectId, "Parallel Processing");
    altPath.childGraphId = altGraph.id;
    const crush = createNode(altGraph, 'action', 'Bitcrush', 0, 0, 'todo');
    const mix = createNode(altGraph, 'action', 'Blend', 0, 0, 'todo');
    layoutNodes([crush, mix]);
    connect(altGraph, crush, mix);

    // Bass Subgraph
    const bassGraph = createGraph(ctx, projectId, "Bass Processing");
    bass.childGraphId = bassGraph.id;
    const mono = createNode(bassGraph, 'action', 'Mono Check', 0, 0, 'done');
    const dyn = createNode(bassGraph, 'action', 'Dynamics', 0, 0, 'done');
    layoutNodes([mono, dyn]);
    connect(bassGraph, mono, dyn);

    return root.id;
}


export function generateWorkspace(seed: string = '42'): Workspace {
    // Initialize RNG with seed
    const rng = seedrandom(seed);

    const ctx: GeneratorContext = {
        rng,
        graphs: {},
    };

    const projects: Project[] = [];

    // 1. Morning Flow
    const p1Id = uuidv4();
    const p1Root = generateMorningFlow(ctx, p1Id);
    projects.push({
        id: p1Id,
        title: "Morning Flow System",
        rootGraphId: p1Root,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    // 2. Landing Page
    const p2Id = uuidv4();
    const p2Root = generateLandingPage(ctx, p2Id);
    projects.push({
        id: p2Id,
        title: "Ship a Landing Page",
        rootGraphId: p2Root,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    // 3. Mixdown
    const p3Id = uuidv4();
    const p3Root = generateMixdown(ctx, p3Id);
    projects.push({
        id: p3Id,
        title: "Mixdown Pipeline",
        rootGraphId: p3Root,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    // Default active State
    const activeProjectId = p1Id;
    const activeGraphId = p1Root;

    return {
        version: 1,
        projects,
        graphs: ctx.graphs,
        activeProjectId,
        activeGraphId,
        navStack: [{ graphId: activeGraphId, label: 'Morning Flow Root' }],
        settings: { theme: 'dark' }
    };
}
