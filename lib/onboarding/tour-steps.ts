import type { TourStep } from '@/types/onboarding'

// ─── Home Tour Steps ────────────────────────────────────────────────

export const homeTourSteps: TourStep[] = [
  {
    id: 'home-welcome',
    title: 'Welcome to NexusAI',
    body: 'A real-time, AI-assisted workspace for turning ideas into system diagrams and specs. Let us show you around.',
    placement: 'center',
  },
  {
    id: 'home-new-project',
    target: 'new-project-cta',
    title: 'Create Your First Project',
    body: 'Start here. Every project is its own collaborative room you can share with teammates.',
    placement: 'bottom',
  },
]

// ─── Project Tour Steps ─────────────────────────────────────────────

export const projectTourSteps: TourStep[] = [
  // --- Sidebar section ---
  {
    id: 'project-sidebar',
    target: 'project-sidebar-panel',
    title: 'Your Project Sidebar',
    body: 'This is your Project Sidebar — every project you own or have been invited to lives here.',
    placement: 'right',
    onEnterActionId: 'open-project-sidebar',
  },
  {
    id: 'project-active-card',
    target: 'active-project-card',
    title: 'Your Project',
    body: "There it is — the project you just created. You can always come back to it from here.",
    placement: 'right',
    onEnterActionId: 'open-project-sidebar',
  },
  {
    id: 'project-search-tabs',
    target: 'project-search',
    title: 'Search & Navigate',
    body: "Press ⌘K (or Ctrl+K) to jump to search. Use the 'Mine' and 'Shared' tabs to switch between projects you own and projects teammates invited you to.",
    placement: 'right',
    onEnterActionId: 'open-project-sidebar',
  },
  {
    id: 'project-sidebar-new',
    target: 'sidebar-new-project',
    title: 'Quick Create',
    body: 'You can also start a new project from right here, anytime.',
    placement: 'right',
    onEnterActionId: 'open-project-sidebar',
    onExitActionId: 'close-project-sidebar',
  },

  // --- Toolbar section ---
  {
    id: 'project-save',
    target: 'save-button',
    title: 'Save Your Work',
    body: 'Your canvas autosaves continuously. This button shows the current save status — idle, saving, saved, or error — and lets you trigger a manual save anytime.',
    placement: 'bottom',
    onEnterActionId: 'close-project-sidebar',
  },
  {
    id: 'project-templates',
    target: 'templates-button',
    title: 'Starter Templates',
    body: 'Jump-start your architecture with prebuilt patterns — monolith, microservices, event-driven, or serverless. Importing a template replaces the current canvas.',
    placement: 'bottom',
  },
  {
    id: 'project-share',
    target: 'share-button',
    title: 'Share & Collaborate',
    body: 'Invite teammates by email, copy the project link, and manage collaborator roles — all from here.',
    placement: 'bottom',
  },
  {
    id: 'project-ai-toggle',
    target: 'ai-panel-toggle',
    title: 'AI Sidebar',
    body: 'Open the AI panel to access AI architecture generation, team chat, and spec generation.',
    placement: 'bottom',
    onEnterActionId: 'close-ai-sidebar',
    onExitActionId: 'open-ai-sidebar',
  },

  // --- AI Sidebar section ---
  {
    id: 'project-ai-tabs',
    target: 'ai-tabs-list',
    title: 'AI Workspace Tabs',
    body: "AI — Describe a system in plain English and Nexus AI sketches the architecture on your canvas. Team — Chat live with collaborators. Specs — Turn your canvas into a downloadable Markdown technical spec.",
    placement: 'left',
    onEnterActionId: 'open-ai-sidebar',
    onExitActionId: 'close-ai-sidebar',
  },

  // --- Canvas section ---
  {
    id: 'project-shapes',
    target: 'shape-panel',
    title: 'Shape Toolkit',
    body: 'Drag any shape onto the canvas to add a node — rectangle, diamond, circle, pill, cylinder, or hexagon. Click a node to reveal its color toolbar; double-click to rename it inline.',
    placement: 'top',
    onEnterActionId: 'close-ai-sidebar',
  },
  {
    id: 'project-controls',
    target: 'canvas-controls',
    title: 'Canvas Controls',
    body: 'Zoom in/out (+/-), fit view (Home), undo/redo (⌘Z / ⌘⇧Z), and delete selected nodes (Delete/Backspace). All from keyboard or these controls.',
    placement: 'top',
  },
  {
    id: 'project-presence',
    target: 'presence-avatars',
    title: 'Live Collaboration',
    body: "See who's online with live avatars and cursors. When collaborators are working, you'll see their cursors move in real time and a thinking indicator when AI is active.",
    placement: 'bottom',
  },

  // --- Finish ---
  {
    id: 'project-finish',
    title: "You're All Set!",
    body: "You now know the essentials. Explore, design, and build something amazing. You can replay this guide anytime from the help button in the toolbar.",
    placement: 'center',
  },
]
